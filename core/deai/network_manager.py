import toml
import time
from typing import List, Optional
from rpc_client import AxionaxRpcClient

class NetworkManager:
    """
    Manages network connections, node discovery, and health checks.
    Selects the best node based on Block Height (Longest Chain Rule).
    """
    def __init__(self, config_path: str = "worker_config.toml"):
        self.config = self._load_config(config_path)
        self.bootnodes = self.config.get("network", {}).get("bootnodes", [])
        self.active_node_url = None
        self.active_client = None
        
        if not self.bootnodes:
            raise ValueError("No bootnodes found in configuration!")

        print(f"🌐 NetworkManager initialized with {len(self.bootnodes)} bootnodes.")

    def _load_config(self, path: str) -> dict:
        try:
            return toml.load(path)
        except Exception as e:
            print(f"❌ Error loading config: {e}")
            return {}

    def find_best_node(self) -> Optional[str]:
        """
        Scans all bootnodes and returns the URL of the one with the highest block height.
        """
        print("🔍 Scanning bootnodes for the best connection...")
        best_node = None
        max_height = -1
        
        for url in self.bootnodes:
            try:
                # Create a temporary client to check this node
                client = AxionaxRpcClient(rpc_url=url)
                block_height = client.get_block_number()
                
                if block_height is not None:
                    print(f"   ✅ {url} -> Height: {block_height}")
                    if block_height > max_height:
                        max_height = block_height
                        best_node = url
                else:
                    print(f"   ⚠️ {url} -> Unreachable (No block height)")
            except Exception as e:
                print(f"   ❌ {url} -> Error: {e}")

        if best_node:
            print(f"🏆 Selected Best Node: {best_node} (Height: {max_height})")
            self.active_node_url = best_node
            self.active_client = AxionaxRpcClient(rpc_url=best_node)
            return best_node
        else:
            print("🔥 CRITICAL: No healthy nodes found!")
            return None

    def get_client(self) -> AxionaxRpcClient:
        """
        Returns the active RPC client. If none exists, attempts to find one.
        """
        if not self.active_client:
            if not self.find_best_node():
                raise ConnectionError("Could not connect to any Axionax node.")
        return self.active_client

    def check_health(self):
        """
        Periodically checks if the current node is still healthy.
        If not, triggers a re-scan.
        """
        if not self.active_client:
            return
            
        try:
            current_height = self.active_client.get_block_number()
            if current_height is None:
                print("⚠️ Current node lost connection. Re-scanning...")
                self.find_best_node()
        except Exception:
            print("⚠️ Current node error. Re-scanning...")
            self.find_best_node()

if __name__ == "__main__":
    # Test Logic
    nm = NetworkManager()
    nm.find_best_node()
