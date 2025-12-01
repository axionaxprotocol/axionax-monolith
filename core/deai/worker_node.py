import time
import sys
import os
from typing import Dict, Optional

# Add current directory to path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rpc_client import AxionaxRpcClient
from wallet_manager import WalletManager
from contract_manager import ContractManager
from network_manager import NetworkManager

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("⚠️ Warning: PyTorch not found. Running in CPU/Mock mode.")

class AxionaxWorker:
    def __init__(self, config_path: str = "worker_config.toml"):
        # Initialize Network Manager
        self.network = NetworkManager(config_path)
        self.client = self.network.get_client() # Auto-selects best node
        
        self.wallet = WalletManager()
        
        # Initialize Contract Manager using the active node
        self.contract = ContractManager(
            rpc_url=self.network.active_node_url, 
            private_key=self.wallet.account.key.hex()
        )
        
        self.is_running = False
        
        if TORCH_AVAILABLE and torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"
            
        print(f"Worker initialized on device: {self.device}")
        print(f"👛 Worker Wallet: {self.wallet.get_address()}")
        
        # Register on startup
        self.register()

    def register(self):
        specs = {
            "device": self.device,
            "version": "1.0.0"
        }
        self.contract.register_worker(specs)

    def start(self):
        print("Starting Axionax Worker Node...")
        self.is_running = True
        
        # 1. Check Connection
        block_num = self.client.get_block_number()
        if block_num == 0:
            print("Failed to connect to RPC. Retrying in 5s...")
            time.sleep(5)
            return

        print(f"Connected to Chain! Current Block: {block_num}")
        
        # 2. Main Loop
        last_processed_block = block_num
        
        try:
            while self.is_running:
                current_block = self.client.get_block_number()
                
                if current_block > last_processed_block:
                    print(f"Scanning blocks {last_processed_block+1} to {current_block}...")
                    self.scan_for_jobs(last_processed_block + 1, current_block)
                    last_processed_block = current_block
                
                time.sleep(2)
                
        except KeyboardInterrupt:
            print("\nStopping worker...")
            self.stop()

    def scan_for_jobs(self, start_block: int, end_block: int):
        # In a real scenario, we would filter for specific "NewJob" events from a contract
        # For now, we just simulate checking
        # logs = self.client.get_logs(hex(start_block))
        pass

    def execute_job(self, job_data: Dict):
        print(f"Executing job: {job_data.get('id')}")
        # Simulate training
        time.sleep(1)
        print("Job complete!")

    def stop(self):
        self.is_running = False

if __name__ == "__main__":
    worker = AxionaxWorker()
    worker.start()
