import requests
import json
import time
from typing import Any, Dict, List, Optional

class AxionaxRpcClient:
    """
    Simple JSON-RPC client for Axionax Chain
    """
    def __init__(self, rpc_url: str = "http://217.76.61.116:8545"):
        self.rpc_url = rpc_url
        self.headers = {'content-type': 'application/json'}
        self.id_counter = 0

    def _call(self, method: str, params: List[Any] = []) -> Any:
        self.id_counter += 1
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": self.id_counter
        }
        
        try:
            response = requests.post(
                self.rpc_url, 
                data=json.dumps(payload), 
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            result = response.json()
            
            if "error" in result:
                raise Exception(f"RPC Error: {result['error']}")
                
            return result["result"]
            
        except requests.exceptions.RequestException as e:
            print(f"Connection Error: {e}")
            return None

    def get_block_number(self) -> int:
        result = self._call("eth_blockNumber")
        return int(result, 16) if result else 0

    def get_balance(self, address: str) -> int:
        result = self._call("eth_getBalance", [address, "latest"])
        return int(result, 16) if result else 0

    def get_logs(self, from_block: str, address: Optional[str] = None, topics: List[str] = []) -> List[Dict]:
        params = [{
            "fromBlock": from_block,
            "toBlock": "latest",
            "topics": topics
        }]
        if address:
            params[0]["address"] = address
            
        return self._call("eth_getLogs", params) or []
