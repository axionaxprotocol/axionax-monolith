import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rpc_client import AxionaxRpcClient

def find_peers():
    print("🔍 Scanning Network for Peers (via 217.216.109.5)...")
    client = AxionaxRpcClient()
    
    # 1. Check Node Version
    version = client._call("web3_clientVersion", [])
    print(f"ℹ️  Node Version: {version}")
    
    # 2. Check Peer Count
    count_hex = client._call("net_peerCount", [])
    count = int(count_hex, 16) if count_hex else 0
    print(f"🔢 Peer Count: {count}")

    if count == 0:
        print("⚠️ No peers connected to this RPC node.")
        return

    # 3. Try to get Peer Details
    print("\nAttempting to fetch peer details...")
    
    methods_to_try = ["admin_peers", "net_peers", "parity_netPeers"]
    
    for method in methods_to_try:
        print(f"   Trying '{method}'...", end=" ")
        result = client._call(method, [])
        
        if result and isinstance(result, list):
            print(f"✅ Success! Found {len(result)} peers.")
            for peer in result:
                print(f"   - {peer}")
            return
        else:
            print(f"❌ Failed (Result: {str(result)[:50]}...)")

    print("\n⚠️ Could not retrieve peer details. The RPC node likely disables admin/debug methods.")

if __name__ == "__main__":
    find_peers()
