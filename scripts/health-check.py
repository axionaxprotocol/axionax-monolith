#!/usr/bin/env python3
"""
Health / readiness check for Axionax DeAI worker setup.
Checks: RPC connectivity, config file, optional wallet.
Usage: python scripts/health-check.py [--config path] [--skip-wallet]
"""

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def check_rpc(url: str) -> bool:
    try:
        import requests
        r = requests.post(
            url,
            json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        if r.status_code != 200:
            print(f"  RPC {url}: HTTP {r.status_code}")
            return False
        data = r.json()
        if "result" in data:
            block = int(data["result"], 16)
            print(f"  RPC {url}: OK (block {block})")
            return True
        print(f"  RPC {url}: no result")
        return False
    except Exception as e:
        print(f"  RPC {url}: {e}")
        return False


def main():
    ap = argparse.ArgumentParser(description="Health check for worker setup")
    ap.add_argument("--config", default="core/deai/worker_config.toml", help="Worker config path")
    ap.add_argument("--skip-wallet", action="store_true", help="Do not require worker_key.json")
    args = ap.parse_args()

    config_path = REPO_ROOT / args.config
    os.chdir(REPO_ROOT)
    ok = True

    # Config
    if not config_path.exists():
        print(f"FAIL: Config not found: {config_path}")
        return 1
    print(f"OK: Config found: {config_path}")

    # RPC from env or config
    rpc_url = os.environ.get("AXIONAX_RPC_URL", "").strip()
    if not rpc_url:
        try:
            import toml
            data = toml.load(config_path)
            bootnodes = data.get("network", {}).get("bootnodes", [])
            if bootnodes:
                rpc_url = bootnodes[0]
        except Exception:
            pass
    if rpc_url:
        if not check_rpc(rpc_url):
            ok = False
    else:
        print("  No RPC URL (set AXIONAX_RPC_URL or [network] bootnodes in config)")
        ok = False

    # Wallet (optional): AXIONAX_WALLET_PATH or default next to config
    if not args.skip_wallet:
        wallet_path = os.environ.get("AXIONAX_WALLET_PATH", "").strip()
        if wallet_path:
            wallet_path = Path(wallet_path)
            if not wallet_path.is_absolute():
                wallet_path = REPO_ROOT / wallet_path
        else:
            wallet_path = config_path.parent / "worker_key.json"
        if not wallet_path.exists():
            print("WARN: Wallet not found (will be created on first run):", wallet_path)
        else:
            print("OK: Wallet found:", wallet_path)

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
