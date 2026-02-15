#!/usr/bin/env python3
"""
One-step check before joining the Axionax DeAI network.
Runs health-check and prints security reminder + next command.
Usage: from repo root:  python scripts/join-network.py [--config path] [--skip-wallet]
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser(
        description="Verify setup and print next steps to join the Axionax DeAI network"
    )
    ap.add_argument(
        "--config",
        default="core/deai/worker_config.toml",
        help="Worker config path (relative to repo root)",
    )
    ap.add_argument(
        "--skip-wallet",
        action="store_true",
        help="Do not require wallet to exist (OK for first run)",
    )
    ap.add_argument(
        "--check-secrets",
        action="store_true",
        help="Warn if .env or worker_key.json might be tracked by git",
    )
    args = ap.parse_args()

    os.chdir(REPO_ROOT)

    # Optional: warn if secrets could be committed
    if args.check_secrets:
        for name in [".env", "worker_key.json", "core/deai/.env", "core/deai/worker_key.json"]:
            p = REPO_ROOT / name
            if p.exists():
                try:
                    r = subprocess.run(
                        ["git", "check-ignore", "-q", str(p)],
                        cwd=REPO_ROOT,
                        capture_output=True,
                    )
                    if r.returncode != 0:
                        print(f"WARN: {name} is not in .gitignore — do not commit it!")
                except FileNotFoundError:
                    pass

    # Run health-check
    cmd = [sys.executable, "scripts/health-check.py", "--config", args.config]
    if args.skip_wallet:
        cmd.append("--skip-wallet")
    r = subprocess.run(cmd, cwd=REPO_ROOT)
    if r.returncode != 0:
        print("\nFix the issues above, then run this script again.")
        return r.returncode

    # Next steps
    print("\n" + "=" * 60)
    print("Next: run your worker")
    print("=" * 60)
    print("  python core/deai/worker_node.py")
    if args.config != "core/deai/worker_config.toml":
        print(f"  # or with config: python core/deai/worker_node.py --config {args.config}")
    print("\nSecurity reminder:")
    print("  - Do NOT commit .env or worker_key.json")
    print("  - Backup worker_key.json and your wallet password after first run")
    print("  - See JOIN.md for full guide")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
