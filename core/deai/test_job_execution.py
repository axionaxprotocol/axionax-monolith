import sys
import os
import time
from typing import Dict

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from worker_node import AxionaxWorker

def test_job_execution():
    print("🧪 Testing Worker Job Execution Logic...")
    
    # Initialize worker (offline mode for this test if possible, but our init connects to RPC)
    # We'll let it connect or fail, but we only care about execute_job here.
    try:
        worker = AxionaxWorker()
    except Exception as e:
        print(f"⚠️  Worker init warning (RPC might be down): {e}")
        # Continue anyway if we can, or mock the client
        
    print("\n1️⃣  Simulating 'NewJob' event...")
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
    
    print("\n2️⃣  Triggering execution...")
    start_time = time.time()
    
    # Manually trigger the execution method
    worker.execute_job(mock_job)
    
    duration = time.time() - start_time
    print(f"\n✅ Job finished in {duration:.2f}s")
    print("   (This confirms the worker can accept and process job data)")

if __name__ == "__main__":
    test_job_execution()
