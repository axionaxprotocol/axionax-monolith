#!/usr/bin/env python3
"""
Generate Faucet keypair for Mainnet Genesis.

For MAINNET: Run this once, add address to genesis (--faucet-address),
and store FAUCET_PRIVATE_KEY securely in .env.

For TESTNET: Uses deterministic key from seed (same as create_genesis default).

Usage:
    python scripts/generate-faucet-key.py              # Random key (mainnet)
    python scripts/generate-faucet-key.py --testnet   # Deterministic (testnet)
"""

import argparse
import hashlib
import os
import secrets

try:
    from eth_account import Account
    HAS_ETH_ACCOUNT = True
except ImportError:
    HAS_ETH_ACCOUNT = False


FAUCET_SEED = b"axionax_faucet_mainnet_q2_2026"


def main():
    ap = argparse.ArgumentParser(description="Generate Faucet keypair for genesis")
    ap.add_argument("--testnet", action="store_true", help="Use deterministic key (testnet)")
    ap.add_argument("--env", action="store_true", help="Output as .env snippet")
    args = ap.parse_args()

    if not HAS_ETH_ACCOUNT:
        print("Install eth-account: pip install eth-account")
        return 1

    if args.testnet:
        pk_bytes = hashlib.sha256(FAUCET_SEED).digest()
        pk_hex = "0x" + pk_bytes.hex()
        acc = Account.from_key(pk_bytes)
        print("TESTNET (deterministic) Faucet keypair:")
    else:
        pk_hex = "0x" + secrets.token_hex(32)
        acc = Account.from_key(pk_hex)
        print("MAINNET (random) Faucet keypair:")

    print()
    print(f"  Address:      {acc.address}")
    print(f"  Private Key: {pk_hex[:20]}...{pk_hex[-10:]}")
    print()
    print("  Add to genesis:")
    print(f"    python core/tools/create_genesis.py --faucet-address {acc.address}")
    print()
    print("  Add to .env (NEVER commit):")
    print(f"    FAUCET_PRIVATE_KEY={pk_hex}")

    if args.env:
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env.faucet.example")
        with open(env_path, "w") as f:
            f.write(f"# Faucet key — DO NOT COMMIT\n")
            f.write(f"FAUCET_PRIVATE_KEY={pk_hex}\n")
            f.write(f"# Faucet address (for reference)\n")
            f.write(f"# FAUCET_ADDRESS={acc.address}\n")
        print(f"\n  Wrote: {env_path}")

    return 0


if __name__ == "__main__":
    exit(main())
