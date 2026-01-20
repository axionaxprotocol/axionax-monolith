"""
Axionax DeAI Worker Node

Connects to the blockchain, listens for compute jobs, and executes them
in a secure Docker sandbox.
"""

import time
import sys
import os
import json
import logging
from typing import Dict, Optional, Any

# Add current directory to path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rpc_client import AxionaxRpcClient
from wallet_manager import WalletManager
from contract_manager import ContractManager
from network_manager import NetworkManager
from sandbox import DockerSandbox, ResourceLimits, ExecutionStatus, create_sandbox, SandboxError

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


class AxionaxWorker:
    """
    Axionax DeAI Worker Node
    
    Connects to the blockchain, monitors for compute jobs, and executes them
    in a secure Docker sandbox with resource limits.
    """
    
    # Default resource limits for jobs
    DEFAULT_LIMITS = ResourceLimits(
        cpu_count=2.0,
        memory_mb=1024,
        timeout_seconds=300,  # 5 minutes
        network_disabled=True,
        pids_limit=100,
    )
    
    def __init__(self, config_path: str = "worker_config.toml", use_sandbox: bool = True):
        """
        Initialize the worker node.
        
        Args:
            config_path: Path to worker configuration file
            use_sandbox: Whether to use Docker sandbox (True) or mock (False)
        """
        # Initialize Network Manager
        self.network = NetworkManager(config_path)
        self.client = self.network.get_client()
        
        self.wallet = WalletManager()
        
        # Initialize Contract Manager
        self.contract = ContractManager(
            rpc_url=self.network.active_node_url, 
            private_key=self.wallet.account.key.hex()
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
        
        # Detect device capabilities
        if TORCH_AVAILABLE and torch.cuda.is_available():
            self.device = "cuda"
            self.gpu_name = torch.cuda.get_device_name(0)
        else:
            self.device = "cpu"
            self.gpu_name = None
            
        logger.info(f"Worker initialized on device: {self.device}")
        logger.info(f"👛 Worker Wallet: {self.wallet.get_address()}")
        
        # Register on startup
        self.register()

    def register(self):
        """Register worker capabilities with the network"""
        specs = {
            "device": self.device,
            "gpu": self.gpu_name,
            "version": "2.0.0",
            "sandbox_enabled": self.sandbox is not None,
            "max_memory_mb": self.DEFAULT_LIMITS.memory_mb,
            "max_timeout_s": self.DEFAULT_LIMITS.timeout_seconds,
        }
        try:
            self.contract.register_worker(specs)
            logger.info("Worker registered successfully")
        except Exception as e:
            logger.error(f"Failed to register worker: {e}")

    def start(self):
        """Start the worker main loop"""
        logger.info("Starting Axionax Worker Node...")
        self.is_running = True
        
        # Check Connection
        block_num = self.client.get_block_number()
        if block_num == 0:
            logger.error("Failed to connect to RPC. Retrying in 5s...")
            time.sleep(5)
            return

        logger.info(f"Connected to Chain! Current Block: {block_num}")
        
        # Main Loop
        last_processed_block = block_num
        
        try:
            while self.is_running:
                current_block = self.client.get_block_number()
                
                if current_block > last_processed_block:
                    logger.info(f"Scanning blocks {last_processed_block+1} to {current_block}...")
                    jobs = self.scan_for_jobs(last_processed_block + 1, current_block)
                    
                    for job in jobs:
                        try:
                            result = self.execute_job(job)
                            self.submit_result(job, result)
                        except JobExecutionError as e:
                            logger.error(f"Job {job.get('id')} failed: {e}")
                            self.report_failure(job, str(e))
                    
                    last_processed_block = current_block
                
                time.sleep(2)
                
        except KeyboardInterrupt:
            logger.info("\nStopping worker...")
            self.stop()

    def scan_for_jobs(self, start_block: int, end_block: int) -> list:
        """
        Scan blockchain for new jobs assigned to this worker.
        
        Args:
            start_block: Starting block number
            end_block: Ending block number
            
        Returns:
            List of job dictionaries
        """
        # TODO: Implement actual event filtering from smart contract
        # For now, return empty list
        # logs = self.client.get_logs(start_block, end_block, topics=["NewJob"])
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
        
        # Get resource limits (use defaults or job-specified)
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
        """Build ResourceLimits from default + custom overrides"""
        return ResourceLimits(
            cpu_count=min(custom_limits.get('cpu', self.DEFAULT_LIMITS.cpu_count), 4.0),
            memory_mb=min(custom_limits.get('memory_mb', self.DEFAULT_LIMITS.memory_mb), 4096),
            timeout_seconds=min(custom_limits.get('timeout', self.DEFAULT_LIMITS.timeout_seconds), 600),
            network_disabled=True,  # Always disabled for security
            pids_limit=self.DEFAULT_LIMITS.pids_limit,
        )

    def submit_result(self, job: Dict, result: Dict):
        """Submit job result to blockchain"""
        try:
            # TODO: Call smart contract to submit result
            logger.info(f"Submitting result for job {job.get('id')}")
            # self.contract.submit_result(job['id'], result)
        except Exception as e:
            logger.error(f"Failed to submit result: {e}")

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
        logger.info("Worker stopped")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Axionax DeAI Worker Node")
    parser.add_argument("--config", default="worker_config.toml", help="Config file path")
    parser.add_argument("--no-sandbox", action="store_true", help="Disable Docker sandbox (UNSAFE!)")
    args = parser.parse_args()
    
    if args.no_sandbox:
        logger.warning("⚠️ Running WITHOUT sandbox - NOT RECOMMENDED for production!")
    
    worker = AxionaxWorker(
        config_path=args.config,
        use_sandbox=not args.no_sandbox,
    )
    worker.start()

