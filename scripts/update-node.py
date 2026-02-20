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


def has_pip() -> bool:
    return subprocess.run(
        [sys.executable, "-m", "pip", "--version"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    ).returncode == 0


def ensure_pip() -> bool:
    """Install pip if missing. Returns True when pip is available."""
    if has_pip():
        return True

    print("  ⚠️ pip ไม่พบ — กำลังติดตั้งอัตโนมัติ...")

    # 1) ensurepip (works on most Python installs)
    if subprocess.run(
        [sys.executable, "-m", "ensurepip", "--upgrade"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    ).returncode == 0 and has_pip():
        print("  ✅ pip ติดตั้งสำเร็จ (ensurepip)")
        return True

    # 2) apt (Debian/Ubuntu — common on VPS)
    if sys.platform == "linux" and os.geteuid() == 0:
        print("  กำลังรัน: apt-get install -y python3-pip python3-venv ...")
        subprocess.run(
            ["apt-get", "update", "-qq"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        subprocess.run(["apt-get", "install", "-y", "python3-pip", "python3-venv"])
        if has_pip():
            print("  ✅ pip ติดตั้งสำเร็จ (apt)")
            return True

    # 3) get-pip.py as last resort
    try:
        import urllib.request
        get_pip = ROOT / "get-pip.py"
        print("  กำลังดาวน์โหลด get-pip.py ...")
        urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", str(get_pip))
        subprocess.run([sys.executable, str(get_pip)])
        get_pip.unlink(missing_ok=True)
        if has_pip():
            print("  ✅ pip ติดตั้งสำเร็จ (get-pip.py)")
            return True
    except Exception:
        pass

    print("  ❌ ไม่สามารถติดตั้ง pip ได้อัตโนมัติ")
    print("  กรุณาติดตั้งเอง:")
    print("    Ubuntu/Debian: sudo apt install python3-pip")
    print("    macOS:         python3 -m ensurepip --upgrade")
    return False


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
            print("[2] ติดตั้ง dependencies...")
            if ensure_pip():
                run([sys.executable, "-m", "pip", "install", "-r", str(req), "-q", "--upgrade"], allow_fail=True)
                print("  Done.\n")
            else:
                print("  ข้าม pip install — แก้ pip แล้วรันอีกครั้ง\n")
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
