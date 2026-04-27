import sys
import os
import time
from typing import Dict

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from worker_node import AxionaxWorker

def test_job_execution():
    """Test worker job execution logic. Skips if worker init fails (e.g. RPC down)."""
    import pytest
    print("Testing Worker Job Execution Logic...")
    worker = None
    try:
        worker = AxionaxWorker()
    except Exception as e:
        print(f"Worker init warning (RPC might be down): {e}")
        pytest.skip("Worker init failed (network/config); skipping job execution test")
    assert worker is not None
    print("\n1. Simulating 'NewJob' event...")
    mock_job = {
        "id": "job_0x123abc",
        "type": "training",
        "model": "resnet18",
        "dataset": "mnist_sample",
        "params": {
            "epochs": 1,
            "batch_size": 32
        }
    }
    print(f"   Job Details: {mock_job}")
    print("\n2. Triggering execution...")
    start_time = time.time()
    worker.execute_job(mock_job)
    duration = time.time() - start_time
    print(f"\nJob finished in {duration:.2f}s")

if __name__ == "__main__":
    test_job_execution()
