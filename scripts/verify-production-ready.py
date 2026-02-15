#!/usr/bin/env python3
"""
Production readiness check: RPC, config, wallet, and next steps.
Usage: python scripts/verify-production-ready.py [--config path]
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser(description="Verify production readiness (config, RPC, wallet)")
    ap.add_argument("--config", default="configs/monolith_worker.toml", help="Worker config (e.g. configs/monolith_worker.toml or configs/monolith_scout_single.toml)")
    args = ap.parse_args()
    os.chdir(REPO_ROOT)

    config_path = REPO_ROOT / args.config
    if not config_path.exists():
        print(f"FAIL: Config not found: {config_path}")
        return 1

    print("=" * 60)
    print("Production readiness check")
    print("=" * 60)

    # 1. Health check
    r = subprocess.run([sys.executable, "scripts/health-check.py", "--config", args.config], cwd=REPO_ROOT)
    if r.returncode != 0:
        print("\nFix the issues above, then run this script again.")
        return r.returncode

    # 2. Optional .env in core/deai
    env_path = REPO_ROOT / "core" / "deai" / ".env"
    if not env_path.exists():
        print("\nNote: core/deai/.env not found. Optional; use it for AXIONAX_* or WORKER_KEY_PASSWORD overrides (copy from .env.example).")
    else:
        print("\nOK: core/deai/.env present")

    # 3. Checklist
    print("\n" + "=" * 60)
    print("Before going live:")
    print("  [ ] Backup worker_key.json and wallet password")
    print("  [ ] Do NOT commit .env or worker_key.json")
    print("  [ ] For Scout: see PRODUCTION_READINESS.md (systemd, limits)")
    print("=" * 60)
    print("\nRun worker:")
    print(f"  python core/deai/worker_node.py --config {args.config}")
    print("\nOr HYDRA (Sentinel + Worker):")
    print("  python hydra_manager.py")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
