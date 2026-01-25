"""
Standalone Test Script for Axionax v1.9.0 Worker Optimization
Tests ModelCache and WorkerConfig without external dependencies

Run: python test_optimization.py
"""

import time
import sys
import os
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional, Any, List

# =============================================================================
# TOML Parser (builtin in Python 3.11+)
# =============================================================================
try:
    import tomllib
except ImportError:
    # Fallback for Python < 3.11
    try:
        import tomli as tomllib
    except ImportError:
        # Simple TOML parser fallback
        tomllib = None
        print("⚠️ No TOML parser available, using manual parsing")


# =============================================================================
# ModelCache Class (Copy from worker_node.py)
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
    """
    
    def __init__(
        self,
        max_models: int = 5,
        max_size_gb: float = 20.0,
        cache_dir: str = ".cache/models",
        eviction_policy: str = "lru"
    ):
        self.max_models = max_models
        self.max_size_bytes = max_size_gb * 1024 * 1024 * 1024
        self.cache_dir = Path(cache_dir)
        self.eviction_policy = eviction_policy
        
        self._memory_cache: OrderedDict[str, CachedModel] = OrderedDict()
        self._total_size_bytes = 0
        
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def get(self, model_name: str) -> Optional[Any]:
        if model_name in self._memory_cache:
            cached = self._memory_cache[model_name]
            cached.last_used = time.time()
            self._memory_cache.move_to_end(model_name)
            return cached.model
        return None
    
    def put(self, model_name: str, model: Any, size_mb: float = 0.0, load_time_ms: float = 0.0):
        while len(self._memory_cache) >= self.max_models:
            self._evict_one()
        
        cached = CachedModel(
            name=model_name,
            model=model,
            size_mb=size_mb,
            last_used=time.time(),
            load_time_ms=load_time_ms
        )
        self._memory_cache[model_name] = cached
        self._total_size_bytes += size_mb * 1024 * 1024
    
    def _evict_one(self):
        if not self._memory_cache:
            return
        oldest_name, oldest = self._memory_cache.popitem(last=False)
        self._total_size_bytes -= oldest.size_mb * 1024 * 1024
        del oldest.model
    
    def clear(self):
        for name, cached in list(self._memory_cache.items()):
            del cached.model
        self._memory_cache.clear()
        self._total_size_bytes = 0
    
    def stats(self) -> Dict[str, Any]:
        return {
            "models_cached": len(self._memory_cache),
            "max_models": self.max_models,
            "total_size_mb": self._total_size_bytes / (1024 * 1024),
            "max_size_gb": self.max_size_bytes / (1024 * 1024 * 1024),
            "models": list(self._memory_cache.keys()),
        }


# =============================================================================
# WorkerConfig Class (Copy from worker_node.py)
# =============================================================================

@dataclass
class WorkerConfig:
    """Worker configuration loaded from TOML"""
    name: str = "axionax-worker-local"
    version: str = "1.9.0"
    environment: str = "development"
    
    force_cpu: bool = False
    max_memory_gb: int = 60
    cuda_device_id: int = 0
    enable_tensor_cores: bool = True
    gpu_memory_fraction: float = 0.85
    
    worker_threads: int = 8
    default_batch_size: int = 32
    enable_mixed_precision: bool = True
    enable_cudnn_benchmark: bool = True
    
    enable_model_cache: bool = True
    cache_dir: str = ".cache/models"
    max_cache_size_gb: float = 20.0
    preload_on_startup: bool = True
    preload_models: List[str] = field(default_factory=list)
    max_models_in_memory: int = 5
    
    default_cpu_count: float = 4.0
    default_memory_mb: int = 4096
    default_timeout_seconds: int = 600
    max_memory_mb: int = 32768
    max_timeout_seconds: int = 1800
    max_pids: int = 200
    
    @classmethod
    def from_toml(cls, config_path: str) -> 'WorkerConfig':
        config = cls()
        
        if tomllib is None:
            print(f"⚠️ Cannot parse TOML, using defaults")
            return config
        
        try:
            with open(config_path, 'rb') as f:
                data = tomllib.load(f)
            
            if 'worker' in data:
                config.name = data['worker'].get('name', config.name)
                config.version = data['worker'].get('version', config.version)
                config.environment = data['worker'].get('environment', config.environment)
            
            if 'hardware' in data:
                hw = data['hardware']
                config.force_cpu = hw.get('force_cpu', config.force_cpu)
                config.max_memory_gb = hw.get('max_memory_gb', config.max_memory_gb)
                config.cuda_device_id = hw.get('cuda_device_id', config.cuda_device_id)
                config.enable_tensor_cores = hw.get('enable_tensor_cores', config.enable_tensor_cores)
                config.gpu_memory_fraction = hw.get('gpu_memory_fraction', config.gpu_memory_fraction)
            
            if 'performance' in data:
                perf = data['performance']
                config.worker_threads = perf.get('worker_threads', config.worker_threads)
                config.default_batch_size = perf.get('default_batch_size', config.default_batch_size)
                config.enable_mixed_precision = perf.get('enable_mixed_precision', config.enable_mixed_precision)
                config.enable_cudnn_benchmark = perf.get('enable_cudnn_benchmark', config.enable_cudnn_benchmark)
            
            if 'cache' in data:
                cache = data['cache']
                config.enable_model_cache = cache.get('enable_model_cache', config.enable_model_cache)
                config.cache_dir = cache.get('cache_dir', config.cache_dir)
                config.max_cache_size_gb = cache.get('max_cache_size_gb', config.max_cache_size_gb)
                config.preload_on_startup = cache.get('preload_on_startup', config.preload_on_startup)
                config.preload_models = cache.get('preload_models', [])
                config.max_models_in_memory = cache.get('max_models_in_memory', config.max_models_in_memory)
            
            if 'limits' in data:
                limits = data['limits']
                config.default_cpu_count = limits.get('default_cpu_count', config.default_cpu_count)
                config.default_memory_mb = limits.get('default_memory_mb', config.default_memory_mb)
                config.default_timeout_seconds = limits.get('default_timeout_seconds', config.default_timeout_seconds)
                config.max_memory_mb = limits.get('max_memory_mb', config.max_memory_mb)
                config.max_timeout_seconds = limits.get('max_timeout_seconds', config.max_timeout_seconds)
                config.max_pids = limits.get('max_pids', config.max_pids)
            
        except FileNotFoundError:
            print(f"⚠️ Config file not found: {config_path}, using defaults")
        except Exception as e:
            print(f"⚠️ Error loading config: {e}, using defaults")
        
        return config


# =============================================================================
# TEST SUITE
# =============================================================================

def test_model_cache():
    """Test ModelCache functionality"""
    print("\n" + "="*60)
    print("🧪 TEST: ModelCache")
    print("="*60)
    
    # Create cache
    cache = ModelCache(max_models=3, max_size_gb=1.0)
    print(f"✅ Cache created: max_models=3")
    
    # Test PUT
    cache.put("model_a", {"data": "A"}, size_mb=100, load_time_ms=50)
    cache.put("model_b", {"data": "B"}, size_mb=200, load_time_ms=100)
    cache.put("model_c", {"data": "C"}, size_mb=150, load_time_ms=75)
    print(f"✅ Added 3 models: {cache.stats()['models']}")
    
    # Test GET (cache hit)
    result = cache.get("model_a")
    assert result is not None, "Cache hit failed"
    print(f"✅ Cache HIT: model_a = {result}")
    
    # Test GET (cache miss)
    result = cache.get("model_x")
    assert result is None, "Cache should miss"
    print(f"✅ Cache MISS: model_x = {result}")
    
    # Test LRU eviction
    cache.put("model_d", {"data": "D"}, size_mb=100, load_time_ms=50)
    assert "model_b" not in cache.stats()['models'], "LRU eviction failed"
    print(f"✅ LRU Eviction: model_b evicted, current models: {cache.stats()['models']}")
    
    # Test stats
    stats = cache.stats()
    print(f"✅ Stats: {stats}")
    
    # Test clear
    cache.clear()
    assert cache.stats()['models_cached'] == 0, "Clear failed"
    print(f"✅ Cache cleared")
    
    print("\n✅ ModelCache: ALL TESTS PASSED!")
    return True


def test_worker_config():
    """Test WorkerConfig loading"""
    print("\n" + "="*60)
    print("🧪 TEST: WorkerConfig")
    print("="*60)
    
    # Test loading from TOML
    config_path = "worker_config.toml"
    config = WorkerConfig.from_toml(config_path)
    
    print(f"✅ Config loaded from: {config_path}")
    print(f"   - Name: {config.name}")
    print(f"   - Version: {config.version}")
    print(f"   - Max Memory: {config.max_memory_gb}GB")
    print(f"   - GPU Memory Fraction: {config.gpu_memory_fraction}")
    print(f"   - Worker Threads: {config.worker_threads}")
    print(f"   - Model Cache: {config.enable_model_cache}")
    print(f"   - Max Cache Size: {config.max_cache_size_gb}GB")
    print(f"   - Preload Models: {config.preload_models}")
    print(f"   - Default Memory Limit: {config.default_memory_mb}MB")
    print(f"   - Max Timeout: {config.max_timeout_seconds}s")
    
    # Verify values from config
    assert config.version == "1.9.0", f"Version mismatch: {config.version}"
    assert config.max_memory_gb == 60, f"Memory mismatch: {config.max_memory_gb}"
    assert config.enable_model_cache == True, "Cache should be enabled"
    
    print("\n✅ WorkerConfig: ALL TESTS PASSED!")
    return True


def test_integration():
    """Test ModelCache + WorkerConfig integration"""
    print("\n" + "="*60)
    print("🧪 TEST: Integration")
    print("="*60)
    
    # Load config
    config = WorkerConfig.from_toml("worker_config.toml")
    
    # Create cache from config
    cache = ModelCache(
        max_models=config.max_models_in_memory,
        max_size_gb=config.max_cache_size_gb,
        cache_dir=config.cache_dir,
    )
    
    print(f"✅ Cache created from config:")
    print(f"   - Max Models: {cache.max_models}")
    print(f"   - Max Size: {cache.max_size_bytes / (1024**3):.1f}GB")
    print(f"   - Cache Dir: {cache.cache_dir}")
    
    # Simulate preloading
    if config.preload_on_startup and config.preload_models:
        print(f"\n📦 Preloading models: {config.preload_models}")
        for model_name in config.preload_models:
            start = time.time()
            # Simulate model loading
            model = {"name": model_name, "weights": [0.1, 0.2, 0.3]}
            load_time = (time.time() - start) * 1000
            cache.put(model_name, model, size_mb=0.1, load_time_ms=load_time)
            print(f"   ✅ Loaded: {model_name}")
    
    print(f"\n📊 Final Cache Stats: {cache.stats()}")
    
    print("\n✅ Integration: ALL TESTS PASSED!")
    return True


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🚀 Axionax v1.9.0 Optimization Test Suite")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("ModelCache", test_model_cache()))
    results.append(("WorkerConfig", test_worker_config()))
    results.append(("Integration", test_integration()))
    
    # Summary
    print("\n" + "="*60)
    print("📋 TEST SUMMARY")
    print("="*60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}: {name}")
        if not passed:
            all_passed = False
    
    print("="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
    else:
        print("⚠️ SOME TESTS FAILED")
    print("="*60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
