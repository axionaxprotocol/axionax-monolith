import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rpc_client import AxionaxRpcClient

def test_connection():
    print("Testing RPC Connection...")
    client = AxionaxRpcClient()
    
    try:
        block = client.get_block_number()
        print(f"SUCCESS: Connected to RPC. Current Block: {block}")
        
        # Check if we can get balance (Optional - Validator might restrict this)
        try:
            balance = client.get_balance("0x0000000000000000000000000000000000000000")
            print(f"Balance check: {balance}")
        except Exception as e:
            print(f"ℹ️  Balance check skipped (API restricted): {e}")
            
    except Exception as e:
        print(f"FAILURE: Could not connect to RPC. Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_connection()
