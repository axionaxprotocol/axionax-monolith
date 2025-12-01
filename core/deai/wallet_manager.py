import os
import json
from typing import Optional, Tuple
from eth_account import Account
import secrets

class WalletManager:
    """
    Manages Worker Wallet (Generation, Loading, Signing)
    """
    def __init__(self, key_file: str = "worker_key.json"):
        self.key_file = key_file
        self.account = self._load_or_create_account()

    def _load_or_create_account(self):
        if os.path.exists(self.key_file):
            print(f"🔑 Loading existing wallet from {self.key_file}...")
            try:
                with open(self.key_file, "r") as f:
                    data = json.load(f)
                    private_key = data.get("private_key")
                    if private_key:
                        return Account.from_key(private_key)
            except Exception as e:
                print(f"❌ Error loading wallet: {e}")
        
        print("🆕 Creating NEW worker wallet...")
        return self._create_new_account()

    def _create_new_account(self):
        # Generate a secure private key
        private_key = "0x" + secrets.token_hex(32)
        account = Account.from_key(private_key)
        
        # Save to file
        with open(self.key_file, "w") as f:
            json.dump({
                "address": account.address,
                "private_key": private_key
            }, f, indent=2)
            
        print(f"💾 Wallet saved to {self.key_file}")
        return account

    def get_address(self) -> str:
        return self.account.address

    def sign_message(self, message: str):
        from eth_account.messages import encode_defunct
        msg = encode_defunct(text=message)
        signed = self.account.sign_message(msg)
        return signed.signature.hex()

if __name__ == "__main__":
    # Test
    wm = WalletManager()
    print(f"Address: {wm.get_address()}")
    sig = wm.sign_message("Hello Axionax")
    print(f"Signature: {sig}")
