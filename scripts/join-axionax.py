#!/usr/bin/env python3
"""
Axionax Node — ตรวจสอบความเหมาะสม และเลือกประเภทโหนด แล้วรันได้ทันที

ไม่ว่าใครก็ตามที่ต้องการเข้าร่วมเป็นโหนด: ดาวน์โหลด packaging ของโปรเจค แล้วรันสคริปต์นี้
เพื่อตรวจสอบความเหมาะสมของเครื่อง และเลือกประเภทโหนด (Worker PC, Scout, HYDRA) ได้โดยง่าย

Usage:
  python scripts/join-axionax.py              # โหมด interactive
  python scripts/join-axionax.py --check-only # ตรวจความเหมาะสมอย่างเดียว
  python scripts/join-axionax.py --type worker  # เลือกประเภทแล้วรัน (worker | scout | hydra)
"""

import os
import subprocess
import sys
from pathlib import Path

# Windows: พยายามใช้ UTF-8 สำหรับข้อความภาษาไทย
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Root = โฟลเดอร์ที่มี core/, configs/, scripts/
ROOT = Path(__file__).resolve().parent.parent

NODE_TYPES = {
    "1": ("Worker (PC/Server)", "core/deai/worker_config.toml", "python core/deai/worker_node.py"),
    "2": ("Worker Monolith Scout (Hailo ตัวเดียว)", "configs/monolith_scout_single.toml", "python core/deai/worker_node.py --config configs/monolith_scout_single.toml"),
    "3": ("HYDRA (Sentinel + Worker)", "configs/monolith_worker.toml", "python hydra_manager.py"),
}


def check_python():
    """ต้อง Python 3.10+"""
    v = sys.version_info
    if v.major < 3 or (v.major == 3 and v.minor < 10):
        print(f"  ❌ Python 3.10+ ต้องการ — ตอนนี้: {v.major}.{v.minor}")
        return False
    print(f"  ✅ Python {v.major}.{v.minor}.{v.micro}")
    return True


def check_deps():
    """ตรวจว่าใช้ requests, toml ได้ (จาก core/deai/requirements.txt)"""
    try:
        import requests  # noqa: F401
        import toml  # noqa: F401
        print("  ✅ Dependencies (requests, toml) พร้อม")
        return True
    except ImportError as e:
        print(f"  ⚠️ ขาด: {e}")
        req = ROOT / "core" / "deai" / "requirements.txt"
        if req.exists():
            print(f"  รัน: pip install -r {req}")
        return False


def check_network():
    """ตรวจ RPC จาก config หลักหรือ env"""
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
        print("  ⚠️ ไม่พบ RPC URL (ตั้ง AXIONAX_RPC_URL หรือ [network] bootnodes ใน config)")
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
            print(f"  ✅ เครือข่ายเชื่อมได้ — RPC: block {block}")
            return True
    except Exception as e:
        print(f"  ❌ เครือข่าย: {e}")
    return False


def check_config(config_path: str) -> bool:
    """ตรวจว่า config มีอยู่"""
    p = ROOT / config_path
    if p.exists():
        print(f"  ✅ Config: {config_path}")
        return True
    print(f"  ❌ Config ไม่พบ: {config_path}")
    return False


def run_health_check(config_path: str, skip_wallet: bool = True) -> bool:
    """รัน health-check.py"""
    cmd = [sys.executable, "scripts/health-check.py", "--config", config_path]
    if skip_wallet:
        cmd.append("--skip-wallet")
    r = subprocess.run(cmd, cwd=ROOT)
    return r.returncode == 0


def run_node(command: str) -> None:
    """รันคำสั่ง start node (แบ่งเป็น executable + args)"""
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
    ap = argparse.ArgumentParser(description="Axionax Node — ตรวจความเหมาะสม และเลือกประเภทโหนด")
    ap.add_argument("--check-only", action="store_true", help="ตรวจความเหมาะสมอย่างเดียว ไม่เลือกประเภท")
    ap.add_argument("--type", choices=["worker", "scout", "hydra"], help="เลือกประเภทโหนดเลย (ไม่ถาม)")
    ap.add_argument("--no-start", action="store_true", help="ไม่รันโหนดหลัง verify — แค่แสดงคำสั่ง")
    args = ap.parse_args()

    os.chdir(ROOT)

    print("=" * 60)
    print("  Axionax Node — ตรวจสอบความเหมาะสม และเลือกประเภทโหนด")
    print("=" * 60)

    # 1) ตรวจความเหมาะสม
    print("\n[1] ตรวจความเหมาะสมของระบบ")
    ok = True
    if not check_python():
        ok = False
    if not check_deps():
        ok = False
    if not check_network():
        ok = False

    if not ok:
        print("\nแก้ไขด้านบนแล้วรันสคริปต์นี้อีกครั้ง")
        return 1

    if args.check_only:
        print("\n✅ ระบบเหมาะสมสำหรับการรันโหนด (--check-only)")
        return 0

    # 2) เลือกประเภทโหนด
    if args.type:
        type_map = {"worker": "1", "scout": "2", "hydra": "3"}
        choice = type_map.get(args.type, "1")
    else:
        print("\n[2] เลือกประเภทโหนดที่ต้องการรัน")
        for k, (label, _, _) in NODE_TYPES.items():
            print(f"   {k}. {label}")
        print("   q. ออก (ไม่รัน)")
        choice = input("\nเลือก (1/2/3/q): ").strip().lower()
        if choice == "q":
            print("ออก")
            return 0
        if choice not in NODE_TYPES:
            choice = "1"

    name, config_path, run_cmd = NODE_TYPES[choice]
    print(f"\nเลือก: {name}")

    if not check_config(config_path):
        return 1

    # 3) Verify (health-check)
    print("\n[3] ตรวจสอบ config และเครือข่าย")
    if not run_health_check(config_path):
        print("\nแก้ไขตามที่แสดงด้านบน แล้วรันสคริปต์นี้อีกครั้ง")
        return 1

    # 4) แสดงคำสั่งและถามว่าจะรันเลยหรือไม่
    print("\n" + "=" * 60)
    print("คำสั่งรันโหนด:")
    print(f"  {run_cmd}")
    print("=" * 60)
    print("\nความปลอดภัย: อย่า commit .env หรือ worker_key.json — backup wallet หลังรันครั้งแรก")
    print("  ดูเพิ่ม: JOIN.md, PRODUCTION_READINESS.md")

    if args.no_start:
        print("\n(ไม่รันโหนด — ใช้ --no-start)")
        return 0

    if not args.type:
        start = input("\nรันโหนดตอนนี้เลยหรือไม่? (y/n): ").strip().lower()
        if start != "y":
            print("ออก — รันด้วยคำสั่งด้านบนเมื่อพร้อม")
            return 0

    print("\nกำลังเริ่มโหนด... (หยุดด้วย Ctrl+C)\n")
    run_node(run_cmd)
    return 0


if __name__ == "__main__":
    sys.exit(main())
