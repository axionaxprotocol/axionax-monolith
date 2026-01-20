"""
Axionax DeAI - Secure Wallet Manager
Manages Worker Wallet with encrypted keystore support
"""

import os
import json
import getpass
from typing import Optional
from eth_account import Account
import secrets


class WalletManager:
    """
    Manages Worker Wallet (Generation, Loading, Signing)
    
    Security Features:
    - Encrypted keystore (AES-128-CTR + scrypt)
    - Environment variable support for key injection
    - Password-protected decryption
    
    Usage:
        # Option 1: Environment variable (recommended for production)
        export WORKER_PRIVATE_KEY=0x...
        wm = WalletManager()
        
        # Option 2: Encrypted keystore with password
        export WORKER_KEY_PASSWORD=your_password
        wm = WalletManager()
        
        # Option 3: Interactive password prompt
        wm = WalletManager()  # Will prompt for password
    """
    
    def __init__(self, key_file: str = "worker_key.json"):
        self.key_file = key_file
        self.account = self._load_or_create_account()
    
    def _load_or_create_account(self):
        # Priority 1: Load from environment variable (no file needed)
        env_key = os.environ.get("WORKER_PRIVATE_KEY")
        if env_key:
            print("🔐 Loading wallet from environment variable...")
            try:
                return Account.from_key(env_key)
            except Exception as e:
                print(f"❌ Invalid WORKER_PRIVATE_KEY: {e}")
                raise
        
        # Priority 2: Load from encrypted keystore file
        if os.path.exists(self.key_file):
            print(f"🔑 Loading wallet from encrypted keystore: {self.key_file}...")
            return self._load_from_keystore()
        
        # Priority 3: Create new wallet
        print("🆕 Creating NEW worker wallet...")
        return self._create_new_account()
    
    def _get_password(self, confirm: bool = False) -> str:
        """Get password from env or prompt user"""
        password = os.environ.get("WORKER_KEY_PASSWORD")
        if password:
            return password
        
        password = getpass.getpass("🔒 Enter wallet password: ")
        if confirm:
            confirm_password = getpass.getpass("🔒 Confirm password: ")
            if password != confirm_password:
                raise ValueError("Passwords do not match!")
        
        return password
    
    def _load_from_keystore(self):
        """Load account from encrypted keystore file"""
        try:
            with open(self.key_file, "r") as f:
                keystore = json.load(f)
            
            # Check if it's an encrypted keystore (has 'crypto' field)
            if "crypto" in keystore or "Crypto" in keystore:
                password = self._get_password()
                private_key = Account.decrypt(keystore, password)
                print("✅ Wallet decrypted successfully!")
                return Account.from_key(private_key)
            
            # Legacy: plaintext key (migrate to encrypted)
            elif "private_key" in keystore:
                print("⚠️  WARNING: Found plaintext key! Migrating to encrypted format...")
                private_key = keystore["private_key"]
                account = Account.from_key(private_key)
                
                # Encrypt and save
                self._save_encrypted_keystore(private_key)
                print("✅ Migrated to encrypted keystore!")
                return account
            
            else:
                raise ValueError("Invalid keystore format")
                
        except Exception as e:
            print(f"❌ Error loading keystore: {e}")
            raise
    
    def _create_new_account(self):
        """Create a new wallet with encrypted keystore"""
        # Generate a secure private key
        private_key = "0x" + secrets.token_hex(32)
        account = Account.from_key(private_key)
        
        # Save as encrypted keystore
        self._save_encrypted_keystore(private_key)
        
        print(f"💾 Encrypted keystore saved to {self.key_file}")
        print(f"📍 Address: {account.address}")
        return account
    
    def _save_encrypted_keystore(self, private_key: str):
        """Save private key as encrypted keystore"""
        password = self._get_password(confirm=True)
        
        # Encrypt using eth_account (produces Web3 Secret Storage compatible format)
        encrypted = Account.encrypt(private_key, password)
        
        with open(self.key_file, "w") as f:
            json.dump(encrypted, f, indent=2)
        
        # Secure file permissions (Unix only)
        try:
            os.chmod(self.key_file, 0o600)
        except (OSError, AttributeError):
            pass  # Windows doesn't support chmod the same way
    
    def get_address(self) -> str:
        """Get the wallet address"""
        return self.account.address
    
    def get_private_key(self) -> str:
        """
        Get private key (use with caution!)
        Only use this for signing operations, never log or transmit.
        """
        return self.account.key.hex()
    
    def sign_message(self, message: str) -> str:
        """Sign a message with the wallet private key"""
        from eth_account.messages import encode_defunct
        msg = encode_defunct(text=message)
        signed = self.account.sign_message(msg)
        return signed.signature.hex()
    
    def sign_transaction(self, tx: dict) -> bytes:
        """Sign a transaction"""
        signed = self.account.sign_transaction(tx)
        return signed.rawTransaction


if __name__ == "__main__":
    # Test
    print("=" * 60)
    print("🔐 Axionax Secure Wallet Manager Test")
    print("=" * 60)
    
    wm = WalletManager()
    print(f"\n📍 Address: {wm.get_address()}")
    
    sig = wm.sign_message("Hello Axionax")
    print(f"✍️  Signature: {sig[:20]}...")
    
    print("\n✅ Wallet manager test complete!")
