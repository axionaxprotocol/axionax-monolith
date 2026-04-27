#!/usr/bin/env python3
"""
Validator Coordination Test
Test that validators take turns producing blocks correctly
"""

import requests
import json
import time
from typing import Dict, List
import argparse

class ValidatorMonitor:
    def __init__(self, rpc_urls: List[str]):
        self.rpc_urls = rpc_urls
        
    def get_block_height(self, rpc_url: str) -> Dict:
        """Get current block height from a validator"""
        try:
            response = requests.post(rpc_url, json={
                "jsonrpc": "2.0",
                "method": "eth_blockNumber",
                "params": [],
                "id": 1
            }, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                if "result" in result:
                    height = int(result["result"], 16)
                    return {"height": height, "success": True}
            
            return {"height": 0, "success": False, "error": response.text}
        except Exception as e:
            return {"height": 0, "success": False, "error": str(e)}
    
    def get_latest_block(self, rpc_url: str) -> Dict:
        """Get latest block details"""
        try:
            response = requests.post(rpc_url, json={
                "jsonrpc": "2.0",
                "method": "eth_getBlockByNumber",
                "params": ["latest", false],
                "id": 1
            }, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                if "result" in result:
                    block = result["result"]
                    return {
                        "number": int(block["number"], 16),
                        "hash": block["hash"],
                        "proposer": block.get("miner", "unknown"),
                        "timestamp": int(block["timestamp"], 16),
                        "success": True
                    }
            
            return {"success": False, "error": response.text}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def monitor_validators(self, duration_minutes: int = 5):
        """Monitor validators for the specified duration"""
        print(f"🔍 Monitoring {len(self.rpc_urls)} validators for {duration_minutes} minutes...")
        print("=" * 60)
        
        # Track block production
        block_history = {}
        start_time = time.time()
        
        while time.time() - start_time < duration_minutes * 60:
            current_time = time.time()
            
            for i, rpc_url in enumerate(self.rpc_urls):
                # Get block height
                height_result = self.get_block_height(rpc_url)
                
                # Get latest block details
                block_result = self.get_latest_block(rpc_url)
                
                if height_result["success"] and block_result["success"]:
                    height = height_result["height"]
                    block_hash = block_result["hash"]
                    proposer = block_result["proposer"]
                    
                    # Track new blocks
                    if block_hash not in block_history:
                        block_history[block_hash] = {
                            "height": height,
                            "proposer": proposer,
                            "timestamp": block_result["timestamp"],
                            "first_seen_by": i,
                            "seen_by": [i]
                        }
                        print(f"🧱 New block #{height} by {proposer[:8]}... (hash: {block_hash[:8]}...)")
                    else:
                        # Update seen by list
                        if i not in block_history[block_hash]["seen_by"]:
                            block_history[block_hash]["seen_by"].append(i)
                
                # Display status
                status = "✅" if height_result["success"] else "❌"
                height = height_result["height"] if height_result["success"] else "ERR"
                
                print(f"\r{status} Validator {i+1}: Height {height}", end="", flush=True)
            
            print()  # New line
            time.sleep(5)  # Check every 5 seconds
        
        # Analysis
        print("\n" + "=" * 60)
        print("📊 ANALYSIS")
        print("=" * 60)
        
        if not block_history:
            print("❌ No blocks produced during monitoring period")
            return
        
        # Sort blocks by height
        sorted_blocks = sorted(block_history.values(), key=lambda x: x["height"])
        
        print(f"Total blocks produced: {len(sorted_blocks)}")
        print(f"Monitoring duration: {duration_minutes} minutes")
        print(f"Average block time: {duration_minutes * 60 / len(sorted_blocks):.1f} seconds")
        
        # Check for coordination
        proposers = [block["proposer"] for block in sorted_blocks]
        unique_proposers = set(proposers)
        
        print(f"Unique proposers: {len(unique_proposers)}")
        
        if len(unique_proposers) == 1:
            print("⚠️  WARNING: Only one validator producing blocks!")
            print("   This suggests validator selection is not working correctly.")
        elif len(unique_proposers) == len(self.rpc_urls):
            print("✅ GOOD: All validators taking turns")
        else:
            print(f"⚠️  Some validators not producing blocks: {len(self.rpc_urls) - len(unique_proposers)} inactive")
        
        # Show block sequence
        print("\n📋 Block Sequence:")
        for i, block in enumerate(sorted_blocks[-10:]):  # Show last 10 blocks
            proposer_short = block["proposer"][:8] if block["proposer"] != "unknown" else "????"
            print(f"  #{block['height']:4d}: {proposer_short}... (seen by {len(block['seen_by'])}/{len(self.rpc_urls)} validators)")
        
        # Check for forks
        heights = [block["height"] for block in sorted_blocks]
        if len(set(heights)) != len(heights):
            print("⚠️  FORK DETECTED: Multiple blocks with same height!")

def main():
    parser = argparse.ArgumentParser(description="Monitor validator coordination")
    parser.add_argument("--rpc", nargs="+", default=["http://127.0.0.1:8545"], help="RPC URLs of validators")
    parser.add_argument("--duration", type=int, default=5, help="Monitoring duration in minutes")
    args = parser.parse_args()
    
    monitor = ValidatorMonitor(args.rpc)
    monitor.monitor_validators(args.duration)

if __name__ == "__main__":
    main()
