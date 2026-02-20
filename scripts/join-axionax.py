#!/usr/bin/env python3
"""
Axionax Node — Check suitability, select node type, and run immediately

Anyone who wants to join as a node: download the project package and run this script
to check machine suitability and easily select a node type (Worker PC, Scout, HYDRA)

Usage:
  python scripts/join-axionax.py              # interactive mode
  python scripts/join-axionax.py --check-only # suitability check only
  python scripts/join-axionax.py --type worker  # select type and run (worker | scout | hydra)
"""

import os
import subprocess
import sys
from pathlib import Path

# Windows: try to use UTF-8 for non-ASCII text
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Root = directory containing core/, configs/, scripts/
ROOT = Path(__file__).resolve().parent.parent

NODE_TYPES = {
    "1": ("Worker (PC/Server)", "core/deai/worker_config.toml", "python core/deai/worker_node.py"),
    "2": ("Worker Monolith Scout (single Hailo)", "configs/monolith_scout_single.toml", "python core/deai/worker_node.py --config configs/monolith_scout_single.toml"),
    "3": ("HYDRA (Sentinel + Worker)", "configs/monolith_worker.toml", "python hydra_manager.py"),
}


def check_python():
    """Requires Python 3.10+"""
    v = sys.version_info
    if v.major < 3 or (v.major == 3 and v.minor < 10):
        print(f"  \u274c Python 3.10+ required \u2014 current: {v.major}.{v.minor}")
        return False
    print(f"  \u2705 Python {v.major}.{v.minor}.{v.micro}")
    return True


def check_deps():
    """Check that requests, toml are available (from core/deai/requirements.txt)"""
    try:
        import requests  # noqa: F401
        import toml  # noqa: F401
        print("  \u2705 Dependencies (requests, toml) ready")
        return True
    except ImportError as e:
        print(f"  \u26a0\ufe0f Missing: {e}")
        req = ROOT / "core" / "deai" / "requirements.txt"
        if req.exists():
            print(f"  Run: pip install -r {req}")
        return False


def check_network():
    """Check RPC from main config or env"""
    os.chdir(ROOT)
    rpc_url = os.environ.get("AXIONAX_RPC_URL", "").strip()
    if not rpc_url:
        try:
            cfg = ROOT / "core" / "deai" / "worker_config.toml"
            if cfg.exists():
                with open(cfg, encoding="utf-8") as f:
                    data = __import__("toml").load(f)
                bootnodes = data.get("network", {}).get("bootnodes", [])
                if bootnodes:
                    rpc_url = bootnodes[0]
        except Exception:
            pass
    if not rpc_url:
        print("  \u26a0\ufe0f RPC URL not found (set AXIONAX_RPC_URL or [network] bootnodes in config)")
        return False
    try:
        import requests
        r = requests.post(
            rpc_url,
            json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if r.status_code == 200 and "result" in r.json():
            block = int(r.json()["result"], 16)
            print(f"  \u2705 Network connected \u2014 RPC: block {block}")
            return True
    except Exception as e:
        print(f"  \u274c Network: {e}")
    return False


def check_config(config_path: str) -> bool:
    """Check that config exists"""
    p = ROOT / config_path
    if p.exists():
        print(f"  \u2705 Config: {config_path}")
        return True
    print(f"  \u274c Config not found: {config_path}")
    return False


def run_health_check(config_path: str, skip_wallet: bool = True) -> bool:
    """Run health-check.py"""
    cmd = [sys.executable, "scripts/health-check.py", "--config", config_path]
    if skip_wallet:
        cmd.append("--skip-wallet")
    r = subprocess.run(cmd, cwd=ROOT)
    return r.returncode == 0


def run_node(command: str) -> None:
    """Run start-node command (split into executable + args)"""
    parts = command.strip().split()
    if not parts:
        return
    exe = parts[0]
    args = parts[1:]
    if exe == "python":
        exe = sys.executable
    subprocess.run([exe] + args, cwd=ROOT)


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Axionax Node \u2014 Check suitability and select node type")
    ap.add_argument("--check-only", action="store_true", help="Suitability check only, no type selection")
    ap.add_argument("--type", choices=["worker", "scout", "hydra"], help="Select node type directly (no prompt)")
    ap.add_argument("--no-start", action="store_true", help="Don't start node after verify \u2014 just show the command")
    args = ap.parse_args()

    os.chdir(ROOT)

    print("=" * 60)
    print("  Axionax Node \u2014 Check suitability and select node type")
    print("=" * 60)

    # 1) Check suitability
    print("\n[1] System suitability check")
    ok = True
    if not check_python():
        ok = False
    if not check_deps():
        ok = False
    if not check_network():
        ok = False

    if not ok:
        print("\nFix the issues above, then run this script again")
        return 1

    if args.check_only:
        print("\n\u2705 System is suitable for running a node (--check-only)")
        return 0

    # 2) Select node type
    if args.type:
        type_map = {"worker": "1", "scout": "2", "hydra": "3"}
        choice = type_map.get(args.type, "1")
    else:
        print("\n[2] Select the node type to run")
        for k, (label, _, _) in NODE_TYPES.items():
            print(f"   {k}. {label}")
        print("   q. Quit (don't run)")
        choice = input("\nChoose (1/2/3/q): ").strip().lower()
        if choice == "q":
            print("Exiting")
            return 0
        if choice not in NODE_TYPES:
            choice = "1"

    name, config_path, run_cmd = NODE_TYPES[choice]
    print(f"\nSelected: {name}")

    if not check_config(config_path):
        return 1

    # 3) Verify (health-check)
    print("\n[3] Verifying config and network")
    if not run_health_check(config_path):
        print("\nFix the issues shown above, then run this script again")
        return 1

    # 4) Show command and ask whether to run
    print("\n" + "=" * 60)
    print("Node run command:")
    print(f"  {run_cmd}")
    print("=" * 60)
    print("\nSecurity: Do not commit .env or worker_key.json \u2014 backup wallet after first run")
    print("  See also: JOIN.md, PRODUCTION_READINESS.md")

    if args.no_start:
        print("\n(Not starting node \u2014 --no-start flag used)")
        return 0

    if not args.type:
        start = input("\nStart node now? (y/n): ").strip().lower()
        if start != "y":
            print("Exiting \u2014 run with the command above when ready")
            return 0

    print("\nStarting node... (stop with Ctrl+C)\n")
    run_node(run_cmd)
    return 0


if __name__ == "__main__":
    sys.exit(main())
