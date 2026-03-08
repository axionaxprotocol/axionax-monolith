"""
Axionax DeAI Worker Node (v1.9.0 Optimized)

Connects to the blockchain, listens for compute jobs, and executes them
in a secure Docker sandbox with model caching and preloading capabilities.
"""

import time
import sys
import os
import json
import logging
import hashlib
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Any, List

# Add current directory to path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import tomllib
except ImportError:
    import tomli as tomllib

from rpc_client import AxionaxRpcClient
from wallet_manager import WalletManager
from contract_manager import ContractManager
from network_manager import NetworkManager
from sandbox import DockerSandbox, ResourceLimits, ExecutionStatus, create_sandbox, SandboxError
from compute_backend import ComputeBackend

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not found. Running in CPU/Mock mode.")


class JobExecutionError(Exception):
    """Exception raised when job execution fails"""
    pass


# =============================================================================
# Model Cache - LRU Cache for Zero-Latency Inference
# =============================================================================

@dataclass
class CachedModel:
    """Represents a cached model with metadata"""
    name: str
    model: Any
    size_mb: float
    last_used: float
    load_time_ms: float


class ModelCache:
    """
    LRU (Least Recently Used) cache for AI models.
    
    Keeps frequently used models in memory to achieve near zero-latency
    inference by avoiding repeated model loading from disk.
    """
    
    def __init__(
        self,
        max_models: int = 5,
        max_size_gb: float = 20.0,
        cache_dir: str = ".cache/models",
        eviction_policy: str = "lru"
    ):
        """
        Initialize the model cache.
        
        Args:
            max_models: Maximum number of models to keep in memory
            max_size_gb: Maximum total size of cached models in GB
            cache_dir: Directory for disk cache
            eviction_policy: Cache eviction policy ('lru' or 'fifo')
        """
        self.max_models = max_models
        self.max_size_bytes = max_size_gb * 1024 * 1024 * 1024
        self.cache_dir = Path(cache_dir)
        self.eviction_policy = eviction_policy
        
        # In-memory cache (OrderedDict for LRU)
        self._memory_cache: OrderedDict[str, CachedModel] = OrderedDict()
        self._total_size_bytes = 0
        
        # Create cache directory
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"ModelCache initialized: max_models={max_models}, max_size_gb={max_size_gb}")
    
    def get(self, model_name: str) -> Optional[Any]:
        """
        Get a model from cache.
        
        Args:
            model_name: Name/identifier of the model
            
        Returns:
            The cached model or None if not found
        """
        if model_name in self._memory_cache:
            # Update access time and move to end (most recently used)
            cached = self._memory_cache[model_name]
            cached.last_used = time.time()
            self._memory_cache.move_to_end(model_name)
            logger.debug(f"Cache HIT: {model_name}")
            return cached.model
        
        logger.debug(f"Cache MISS: {model_name}")
        return None
    
    def put(self, model_name: str, model: Any, size_mb: float = 0.0, load_time_ms: float = 0.0):
        """
        Add a model to the cache.
        
        Args:
            model_name: Name/identifier of the model
            model: The model object
            size_mb: Size of the model in MB
            load_time_ms: Time taken to load the model in milliseconds
        """
        # Check if we need to evict
        while len(self._memory_cache) >= self.max_models:
            self._evict_one()
        
        # Add to cache
        cached = CachedModel(
            name=model_name,
            model=model,
            size_mb=size_mb,
            last_used=time.time(),
            load_time_ms=load_time_ms
        )
        self._memory_cache[model_name] = cached
        self._total_size_bytes += size_mb * 1024 * 1024
        
        logger.info(f"Cached model: {model_name} ({size_mb:.1f}MB, loaded in {load_time_ms:.1f}ms)")
    
    def _evict_one(self):
        """Evict the least recently used model"""
        if not self._memory_cache:
            return
        
        # LRU: Remove the first item (oldest)
        oldest_name, oldest = self._memory_cache.popitem(last=False)
        self._total_size_bytes -= oldest.size_mb * 1024 * 1024
        
        # Clean up model memory
        del oldest.model
        if TORCH_AVAILABLE and torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        logger.info(f"Evicted model from cache: {oldest_name}")
    
    def clear(self):
        """Clear all cached models"""
        for name, cached in list(self._memory_cache.items()):
            del cached.model
        self._memory_cache.clear()
        self._total_size_bytes = 0
        
        if TORCH_AVAILABLE and torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        logger.info("Model cache cleared")
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "models_cached": len(self._memory_cache),
            "max_models": self.max_models,
            "total_size_mb": self._total_size_bytes / (1024 * 1024),
            "max_size_gb": self.max_size_bytes / (1024 * 1024 * 1024),
            "models": list(self._memory_cache.keys()),
        }


# =============================================================================
# Worker Configuration Loader
# =============================================================================

@dataclass
class WorkerConfig:
    """Worker configuration loaded from TOML"""
    # Worker
    name: str = "axionax-worker-local"
    version: str = "1.9.0"
    environment: str = "development"
    
    # Hardware
    force_cpu: bool = False
    max_memory_gb: int = 60
    cuda_device_id: int = 0
    npu_device_id: int = 0  # Hailo device index (Project HYDRA)
    enable_tensor_cores: bool = True
    gpu_memory_fraction: float = 0.85
    
    # [EVOLUTION] Experimental - Monolith Mark-II / Photonic
    enable_optical_bridge: bool = False
    hardware_tier: int = 1  # 1=PC, 2=Server, 3=Monolith
    compute_type: str = "SILICON"  # SILICON, PHOTONIC, HYBRID
    
    # Performance
    worker_threads: int = 8
    default_batch_size: int = 32
    enable_mixed_precision: bool = True
    enable_cudnn_benchmark: bool = True
    
    # Cache
    enable_model_cache: bool = True
    cache_dir: str = ".cache/models"
    max_cache_size_gb: float = 20.0
    preload_on_startup: bool = True
    preload_models: List[str] = None
    max_models_in_memory: int = 5
    
    # Limits
    default_cpu_count: float = 4.0
    default_memory_mb: int = 4096
    default_timeout_seconds: int = 600
    max_memory_mb: int = 32768
    max_timeout_seconds: int = 1800
    max_pids: int = 200
    
    @classmethod
    def from_toml(cls, config_path: str) -> 'WorkerConfig':
        """Load configuration from TOML file"""
        config = cls()
        
        try:
            with open(config_path, 'rb') as f:
                data = tomllib.load(f)
            
            # Worker section
            if 'worker' in data:
                config.name = data['worker'].get('name', config.name)
                config.version = data['worker'].get('version', config.version)
                config.environment = data['worker'].get('environment', config.environment)
            
            # Hardware section
            if 'hardware' in data:
                hw = data['hardware']
                config.force_cpu = hw.get('force_cpu', config.force_cpu)
                config.max_memory_gb = hw.get('max_memory_gb', config.max_memory_gb)
                config.cuda_device_id = hw.get('cuda_device_id', config.cuda_device_id)
                config.npu_device_id = hw.get('npu_device_id', config.npu_device_id)
                config.enable_tensor_cores = hw.get('enable_tensor_cores', config.enable_tensor_cores)
                config.gpu_memory_fraction = hw.get('gpu_memory_fraction', config.gpu_memory_fraction)
            
            # Performance section
            if 'performance' in data:
                perf = data['performance']
                config.worker_threads = perf.get('worker_threads', config.worker_threads)
                config.default_batch_size = perf.get('default_batch_size', config.default_batch_size)
                config.enable_mixed_precision = perf.get('enable_mixed_precision', config.enable_mixed_precision)
                config.enable_cudnn_benchmark = perf.get('enable_cudnn_benchmark', config.enable_cudnn_benchmark)
            
            # Cache section
            if 'cache' in data:
                cache = data['cache']
                config.enable_model_cache = cache.get('enable_model_cache', config.enable_model_cache)
                config.cache_dir = cache.get('cache_dir', config.cache_dir)
                config.max_cache_size_gb = cache.get('max_cache_size_gb', config.max_cache_size_gb)
                config.preload_on_startup = cache.get('preload_on_startup', config.preload_on_startup)
                config.preload_models = cache.get('preload_models', [])
                config.max_models_in_memory = cache.get('max_models_in_memory', config.max_models_in_memory)
            
            # Limits section
            if 'limits' in data:
                limits = data['limits']
                config.default_cpu_count = limits.get('default_cpu_count', config.default_cpu_count)
                config.default_memory_mb = limits.get('default_memory_mb', config.default_memory_mb)
                config.default_timeout_seconds = limits.get('default_timeout_seconds', config.default_timeout_seconds)
                config.max_memory_mb = limits.get('max_memory_mb', config.max_memory_mb)
                config.max_timeout_seconds = limits.get('max_timeout_seconds', config.max_timeout_seconds)
                config.max_pids = limits.get('max_pids', config.max_pids)
            
            # [EVOLUTION] Experimental section
            if 'experimental' in data:
                exp = data['experimental']
                config.enable_optical_bridge = exp.get('enable_optical_bridge', config.enable_optical_bridge)
                config.hardware_tier = int(exp.get('hardware_tier', config.hardware_tier))
                config.compute_type = str(exp.get('compute_type', config.compute_type)).upper()
            
            logger.info(f"Loaded config from {config_path}")
            
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
        except Exception as e:
            logger.error(f"Error loading config: {e}, using defaults")
        
        return config


# =============================================================================
# Axionax Worker (Optimized)
# =============================================================================

class AxionaxWorker:
    """
    Axionax DeAI Worker Node (v1.9.0 Optimized)
    
    Features:
    - Model caching for zero-latency inference
    - Configurable resource limits
    - GPU optimization with Tensor Cores
    - Preloading and warm-up capabilities
    """
    
    def __init__(self, config_path: str = "worker_config.toml", use_sandbox: bool = True):
        """
        Initialize the worker node.
        
        Args:
            config_path: Path to worker configuration file
            use_sandbox: Whether to use Docker sandbox (True) or mock (False)
        """
        # Load configuration
        self.config = WorkerConfig.from_toml(config_path)
        
        # Build resource limits from config
        self.DEFAULT_LIMITS = ResourceLimits(
            cpu_count=self.config.default_cpu_count,
            memory_mb=self.config.default_memory_mb,
            timeout_seconds=self.config.default_timeout_seconds,
            network_disabled=True,
            pids_limit=self.config.max_pids,
        )
        
        # Initialize Network Manager
        self.network = NetworkManager(config_path)
        self.client = self.network.get_client()
        
        # Wallet: AXIONAX_WALLET_PATH env, or worker_key.json next to config
        wallet_path = os.environ.get("AXIONAX_WALLET_PATH", "").strip()
        if not wallet_path:
            wallet_path = str(Path(config_path).resolve().parent / "worker_key.json")
        self.wallet = WalletManager(key_file=wallet_path)
        
        # Initialize Contract Manager
        contract_address = os.environ.get("AXIONAX_MARKETPLACE_ADDRESS", "").strip()
        if not contract_address:
            try:
                import toml as _toml
                _cfg = _toml.load(config_path)
                contract_address = _cfg.get("network", {}).get("contract_address", "")
            except Exception:
                pass
        self.contract = ContractManager(
            rpc_url=self.network.active_node_url,
            account=self.wallet.account,
            contract_address=contract_address,
        )
        
        self.is_running = False
        
        # Initialize sandbox
        self.use_sandbox = use_sandbox
        try:
            self.sandbox = create_sandbox(use_docker=use_sandbox)
            logger.info("Docker sandbox initialized")
        except SandboxError as e:
            logger.warning(f"Docker sandbox unavailable: {e}")
            self.sandbox = None
        
        # [EVOLUTION] Initialize compute backend (HAL: SILICON or PHOTONIC)
        self.compute_backend = self._create_compute_backend()
        self.device = self.compute_backend.get_device()
        self.gpu_name = self._get_gpu_name()
        self._init_silicon_optimizations()
        
        # Initialize model cache
        if self.config.enable_model_cache:
            self.model_cache = ModelCache(
                max_models=self.config.max_models_in_memory,
                max_size_gb=self.config.max_cache_size_gb,
                cache_dir=self.config.cache_dir,
            )
        else:
            self.model_cache = None
        
        logger.info(f"Worker initialized: {self.config.name} v{self.config.version}")
        logger.info(f"Compute: {self.compute_backend.type} | Device: {self.device} | GPU: {self.gpu_name or 'N/A'}")
        logger.info(f"👛 Worker Wallet: {self.wallet.get_address()}")
        
        # Preload models if configured
        if self.config.preload_on_startup:
            self.preload_models()
        
        # Warm up GPU
        self.warmup()
        
        # Register on startup
        self.register()
    
    def _create_compute_backend(self) -> ComputeBackend:
        """[EVOLUTION] Create HAL backend from config (SILICON, PHOTONIC, or NPU)."""
        backend_config = {
            "compute_type": self.config.compute_type,
            "enable_optical_bridge": self.config.enable_optical_bridge,
            "force_cpu": self.config.force_cpu,
            "cuda_device_id": self.config.cuda_device_id,
            "npu_device_id": self.config.npu_device_id,
        }
        return ComputeBackend(backend_config)
    
    def _get_gpu_name(self) -> Optional[str]:
        """GPU name for SILICON backend; None for PHOTONIC or CPU."""
        if self.compute_backend.is_silicon() and TORCH_AVAILABLE and torch.cuda.is_available():
            return torch.cuda.get_device_name(self.config.cuda_device_id)
        return None
    
    def _init_silicon_optimizations(self):
        """Apply CUDA/Tensor Core optimizations when using SILICON backend."""
        if not self.compute_backend.is_silicon() or not TORCH_AVAILABLE or not torch.cuda.is_available():
            return
        torch.cuda.set_device(self.config.cuda_device_id)
        if self.config.enable_cudnn_benchmark:
            torch.backends.cudnn.benchmark = True
            logger.info("cuDNN benchmark mode enabled")
        if self.config.enable_tensor_cores:
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            logger.info("Tensor Cores (TF32) enabled")
        if self.config.gpu_memory_fraction < 1.0:
            torch.cuda.set_per_process_memory_fraction(
                self.config.gpu_memory_fraction,
                self.config.cuda_device_id
            )
            logger.info(f"GPU memory fraction set to {self.config.gpu_memory_fraction:.0%}")
    
    def preload_models(self):
        """
        Preload models into cache at startup.
        
        This implements the "Eternal Cache" concept for near zero-latency inference
        by loading frequently used models into memory before they're needed.
        """
        if not self.model_cache:
            logger.warning("Model cache disabled, skipping preload")
            return
        
        models_to_load = self.config.preload_models or []
        if not models_to_load:
            logger.info("No models configured for preloading")
            return
        
        logger.info(f"Preloading {len(models_to_load)} models...")
        
        for model_name in models_to_load:
            try:
                start_time = time.time()
                
                # Model loading: extend with real backends (e.g. HuggingFace, torch.load) per model_name
                if model_name == "default":
                    model = {"name": model_name, "loaded": True}
                    size_mb = 0.1
                else:
                    logger.warning("Unknown model %s, skipping", model_name)
                    continue
                
                load_time_ms = (time.time() - start_time) * 1000
                self.model_cache.put(model_name, model, size_mb, load_time_ms)
                
            except Exception as e:
                logger.error(f"Failed to preload model {model_name}: {e}")
        
        logger.info(f"Preload complete. Cache stats: {self.model_cache.stats()}")
    
    def warmup(self):
        """
        Warm up compute backend: GPU (matmul) or PHOTONIC (simulation stub).
        Avoids cold-start latency on first real inference.
        """
        if self.compute_backend.is_photonic():
            logger.info("Compute backend: PHOTONIC (warm-up skipped for simulation)")
            return
        if not TORCH_AVAILABLE:
            return
        device = self.device
        if str(device).startswith("cuda"):
            logger.info("Warming up GPU...")
            try:
                for _ in range(3):
                    x = torch.randn(1000, 1000, device=device)
                    y = self.compute_backend.matrix_multiply(x, x)
                    del x, y
                torch.cuda.synchronize()
                torch.cuda.empty_cache()
                allocated = torch.cuda.memory_allocated() / (1024**3)
                reserved = torch.cuda.memory_reserved() / (1024**3)
                logger.info(f"GPU warm-up complete. Memory: {allocated:.2f}GB allocated, {reserved:.2f}GB reserved")
            except Exception as e:
                logger.warning(f"GPU warm-up failed: {e}")

    def register(self):
        """Register worker capabilities with the network (incl. [EVOLUTION] compute_type / hardware_tier)."""
        specs = {
            "device": str(self.device),
            "gpu": self.gpu_name,
            "version": self.config.version,
            "sandbox_enabled": self.sandbox is not None,
            "max_memory_mb": self.config.max_memory_mb,
            "max_timeout_s": self.config.max_timeout_seconds,
            "model_cache_enabled": self.model_cache is not None,
            "tensor_cores_enabled": self.config.enable_tensor_cores,
            # [EVOLUTION] ASR / Priority Validation
            "compute_type": self.compute_backend.type,
            "hardware_tier": self.config.hardware_tier,
            "optical_bridge_available": self.compute_backend.capabilities_dict().get("optical_bridge_available", False),
        }
        try:
            self.contract.register_worker(specs)
            logger.info("Worker registered successfully")
        except Exception as e:
            logger.error(f"Failed to register worker: {e}")

    def start(self):
        """Start the worker main loop"""
        logger.info("=" * 60)
        logger.info("Starting Axionax Worker Node (v1.9.0 Optimized)")
        logger.info("=" * 60)
        self.is_running = True
        
        # Check Connection
        block_num = self.client.get_block_number()
        if block_num == 0:
            logger.error("Failed to connect to RPC. Retrying in 5s...")
            time.sleep(5)
            return

        logger.info(f"✅ Connected to Chain! Current Block: {block_num}")
        
        # Log cache status
        if self.model_cache:
            logger.info(f"📦 Model Cache: {self.model_cache.stats()}")
        
        # Main Loop
        last_processed_block = block_num
        
        try:
            while self.is_running:
                current_block = self.client.get_block_number()
                
                if current_block > last_processed_block:
                    logger.info(f"Scanning blocks {last_processed_block+1} to {current_block}...")
                    jobs = self.scan_for_jobs(last_processed_block + 1, current_block)
                    
                    for job in jobs:
                        job_id = job.get("id")
                        try:
                            self.contract.assign_job(job_id)
                            result = self.execute_job(job)
                            self.submit_result(job, result)
                        except JobExecutionError as e:
                            logger.error(f"Job {job_id} failed: {e}")
                            self.report_failure(job, str(e))
                        except Exception as e:
                            logger.error(f"Job {job_id} error: {e}")
                    
                    last_processed_block = current_block
                
                time.sleep(2)
                
        except KeyboardInterrupt:
            logger.info("\nStopping worker...")
            self.stop()

    def scan_for_jobs(self, start_block: int, end_block: int) -> list:
        """
        Scan blockchain for new pending jobs via the contract.

        Two strategies:
        1. (Preferred) Call getPendingJobs() view function on the contract.
        2. (Fallback) Scan JobCreated events between block range.

        Returns:
            List of job dictionaries ready for execution.
        """
        try:
            # Strategy 1: direct contract query for pending jobs
            pending_ids = self.contract.get_pending_jobs()
            if pending_ids:
                jobs = []
                for job_id in pending_ids:
                    job = self.contract.get_job(job_id)
                    if job and job["status"] == 0:  # Pending
                        jobs.append({
                            "id": job["id"],
                            "type": ["inference", "training", "data_processing", "custom"][job["jobType"]],
                            "inputHash": job["inputHash"],
                            "reward": job["reward"],
                            "timeout": job["timeout"],
                        })
                return jobs

            # Strategy 2: scan events
            events = self.contract.scan_job_created_events(start_block, end_block)
            return [
                {
                    "id": evt["id"],
                    "type": ["inference", "training", "data_processing", "custom"][evt["jobType"]],
                    "inputHash": evt["inputHash"],
                    "reward": evt["reward"],
                }
                for evt in events
            ]
        except Exception as e:
            logger.debug("scan_for_jobs: %s", e)
            return []

    def execute_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a job in the secure sandbox.
        
        Args:
            job_data: Job specification including:
                - id: Job identifier
                - type: Job type (python, inference, training)
                - script: Code to execute
                - input_data: Optional input data
                - limits: Optional resource limit overrides
                
        Returns:
            Execution result dictionary
            
        Raises:
            JobExecutionError: If execution fails
        """
        job_id = job_data.get('id', 'unknown')
        job_type = job_data.get('type', 'python')
        script = job_data.get('script', '')
        
        logger.info(f"Executing job {job_id} (type: {job_type})")
        
        # Validate job data
        if not script:
            raise JobExecutionError("Job script is empty")
        
        if not self.sandbox:
            raise JobExecutionError("Sandbox not available - cannot execute untrusted code")
        
        # Get resource limits (use defaults or job-specified, capped by max)
        limits = self._get_job_limits(job_data.get('limits', {}))
        
        # Execute in sandbox
        try:
            if job_type == 'python':
                result = self.sandbox.execute_python_script(
                    script=script,
                    limits=limits,
                )
            else:
                # For other job types, use generic execution
                result = self.sandbox.execute(
                    command=["python", "-c", script],
                    limits=limits,
                )
            
            logger.info(f"Job {job_id} completed: {result.status.value}")
            
            if result.status == ExecutionStatus.SUCCESS:
                return {
                    "job_id": job_id,
                    "status": "success",
                    "output": result.output,
                    "execution_time_ms": result.execution_time_ms,
                }
            elif result.status == ExecutionStatus.TIMEOUT:
                raise JobExecutionError(f"Timeout after {limits.timeout_seconds}s")
            else:
                raise JobExecutionError(f"Execution failed: {result.error}")
                
        except SandboxError as e:
            raise JobExecutionError(f"Sandbox error: {e}")

    def _get_job_limits(self, custom_limits: Dict) -> ResourceLimits:
        """Build ResourceLimits from default + custom overrides, capped by max.
        [EVOLUTION] Future: check custom_limits.get('min_hardware_tier') vs self.config.hardware_tier
        for ASR / Priority Validation (Fast Lane for Monolith)."""
        return ResourceLimits(
            cpu_count=min(
                custom_limits.get('cpu', self.DEFAULT_LIMITS.cpu_count),
                self.config.max_memory_mb / 1024  # Rough estimate
            ),
            memory_mb=min(
                custom_limits.get('memory_mb', self.DEFAULT_LIMITS.memory_mb),
                self.config.max_memory_mb
            ),
            timeout_seconds=min(
                custom_limits.get('timeout', self.DEFAULT_LIMITS.timeout_seconds),
                self.config.max_timeout_seconds
            ),
            network_disabled=True,  # Always disabled for security
            pids_limit=self.config.max_pids,
        )

    def submit_result(self, job: Dict, result: Dict):
        """Submit job result to blockchain via ContractManager."""
        try:
            job_id = job.get("id")
            if job_id is None:
                logger.error("submit_result: job has no id")
                return
            job_id_int = int(job_id) if not isinstance(job_id, int) else job_id
            logger.info("Submitting result for job %s", job_id)
            self.contract.submit_result(job_id_int, result)
        except Exception as e:
            logger.error("Failed to submit result: %s", e)

    def report_failure(self, job: Dict, error: str):
        """Report job failure to blockchain"""
        try:
            logger.warning(f"Reporting failure for job {job.get('id')}: {error}")
            # self.contract.report_failure(job['id'], error)
        except Exception as e:
            logger.error(f"Failed to report failure: {e}")

    def stop(self):
        """Stop the worker"""
        self.is_running = False
        
        # Clear model cache
        if self.model_cache:
            self.model_cache.clear()
        
        logger.info("Worker stopped")


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Axionax DeAI Worker Node (v1.9.0)")
    parser.add_argument("--config", default="worker_config.toml", help="Config file path")
    parser.add_argument("--no-sandbox", action="store_true", help="Disable Docker sandbox (UNSAFE!)")
    args = parser.parse_args()

    config_path = args.config
    if not os.path.isabs(config_path):
        config_path = os.path.abspath(config_path)
    if not os.path.isfile(config_path):
        logger.error("Config file not found: %s", config_path)
        logger.info("Run from repo root: python core/deai/worker_node.py --config configs/monolith_worker.toml")
        logger.info("Or from core/deai: python worker_node.py --config worker_config.toml")
        sys.exit(1)

    if args.no_sandbox:
        logger.warning("Running WITHOUT sandbox - NOT RECOMMENDED for production!")

    worker = AxionaxWorker(
        config_path=config_path,
        use_sandbox=not args.no_sandbox,
    )
    worker.start()
