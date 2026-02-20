#!/usr/bin/env python3
"""
อัปเดตโหนด — รันบนเครื่องที่เข้าร่วมเครือข่าย (ทุกเครื่อง ไม่ต้องบอก IP)

ใช้ได้กับ: Validator VPS, Worker PC, Monolith Scout — รันบนเครื่องที่รันโหนด
จะดึงโค้ดล่าสุด (git pull), อัปเดต dependencies, ตรวจความเหมาะสม
ไม่มีการเก็บหรือระบุ IP ของเครื่องใดๆ

Usage:
  python scripts/update-node.py              # อัปเดตเต็ม
  python scripts/update-node.py --no-pull   # ข้าม git pull (แค่ pip + ตรวจ)
  python scripts/update-node.py --check-only # แค่ตรวจความเหมาะสม
"""

import os
import subprocess
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent


def require_project_root() -> None:
    """ต้องรันจาก root ของโปรเจกต์ (มี core/deai และ scripts/)"""
    if (ROOT / "core" / "deai").is_dir() and (ROOT / "scripts" / "update-node.py").exists():
        return
    print("ไม่พบโฟลเดอร์โปรเจกต์ (ต้องมี core/, scripts/)")
    print("ถ้ายังไม่มี โคลน repo ก่อน:")
    print("  git clone https://github.com/axionaxprotocol/axionax-core-universe.git")
    print("  cd axionax-core-universe")
    print("  python3 scripts/update-node.py")
    print("")
    print("หรือดาวน์โหลด ZIP จาก GitHub แล้วแตกไฟล์ แล้วรันจากโฟลเดอร์นั้น:")
    print("  python3 scripts/update-node.py")
    sys.exit(1)


def run(cmd: list, cwd: Path = None, allow_fail: bool = False) -> bool:
    cwd = cwd or ROOT
    r = subprocess.run(cmd, cwd=cwd)
    if allow_fail:
        return True
    return r.returncode == 0


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Update node (run on this machine, no IP needed)")
    ap.add_argument("--no-pull", action="store_true", help="Skip git pull")
    ap.add_argument("--check-only", action="store_true", help="Only run suitability check")
    args = ap.parse_args()

    os.chdir(ROOT)
    require_project_root()

    print("=" * 60)
    print("  Axionax Node — Update (ทุกเครื่อง ไม่ต้องบอก IP)")
    print("=" * 60)
    print(f"  Root: {ROOT}\n")

    if not args.check_only and not args.no_pull:
        git_dir = ROOT / ".git"
        if git_dir.exists():
            print("[1] Git pull (ดึงโค้ดล่าสุด)...")
            run(["git", "pull"], allow_fail=True)
            if (ROOT / ".gitmodules").exists():
                run(["git", "submodule", "update", "--init", "--recursive"], allow_fail=True)
            print("  Done.\n")
        else:
            print("[1] Not a git repo — skip pull. (โคลน repo ใหม่หรือดาวน์โหลด package ล่าสุดเพื่ออัปเดต)\n")

    if not args.check_only:
        req = ROOT / "core" / "deai" / "requirements.txt"
        if req.exists():
            print("[2] Pip install -r requirements.txt...")
            run([sys.executable, "-m", "pip", "install", "-r", str(req), "-q", "--upgrade"], allow_fail=True)
            print("  Done.\n")
        else:
            print("[2] No requirements.txt — skip.\n")

    print("[3] ตรวจความเหมาะสม...")
    run([sys.executable, "scripts/join-axionax.py", "--check-only"])
    print("")

    print("=" * 60)
    print("  อัปเดตเสร็จ — รีสตาร์ทโหนดเมื่อพร้อม")
    print("  เช่น: python3 core/deai/worker_node.py หรือ python3 hydra_manager.py")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
