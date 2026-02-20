#!/usr/bin/env python3
"""
อัปเดตโหนด — รันบนเครื่องที่เข้าร่วมเครือข่าย (ทุกเครื่อง ไม่ต้องบอก IP)

ใช้ได้กับ: Validator VPS, Worker PC, Monolith Scout — รันบนเครื่องที่รันโหนด
จะดึงโค้ดล่าสุด (git pull), อัปเดต dependencies, ตรวจความเหมาะสม
ไม่มีการเก็บหรือระบุ IP ของเครื่องใดๆ

Handles PEP 668 (Ubuntu 24.04+) by auto-creating a .venv if system pip is blocked.

Usage:
  python3 scripts/update-node.py              # อัปเดตเต็ม
  python3 scripts/update-node.py --no-pull   # ข้าม git pull (แค่ pip + ตรวจ)
  python3 scripts/update-node.py --check-only # แค่ตรวจความเหมาะสม
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
VENV_DIR = ROOT / ".venv"


def require_project_root() -> None:
    """ต้องรันจาก root ของโปรเจกต์ (มี core/deai และ scripts/)"""
    if (ROOT / "core" / "deai").is_dir() and (ROOT / "scripts" / "update-node.py").exists():
        return
    print("ไม่พบโฟลเดอร์โปรเจกต์ (ต้องมี core/, scripts/)")
    print("ถ้ายังไม่มี โคลน repo ก่อน:")
    print("  git clone https://github.com/axionaxprotocol/axionax-core-universe.git")
    print("  cd axionax-core-universe")
    print("  python3 scripts/update-node.py")
    sys.exit(1)


def run(cmd: list, cwd: Path = None, allow_fail: bool = False) -> bool:
    cwd = cwd or ROOT
    r = subprocess.run(cmd, cwd=cwd)
    if allow_fail:
        return True
    return r.returncode == 0


# ---------------------------------------------------------------------------
# Virtual‑environment helpers (PEP 668 / Ubuntu 24.04+)
# ---------------------------------------------------------------------------

def _venv_python() -> Path:
    if sys.platform == "win32":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python3"


def _in_venv() -> bool:
    return sys.prefix != sys.base_prefix


def _has_pip() -> bool:
    return subprocess.run(
        [sys.executable, "-m", "pip", "--version"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    ).returncode == 0


def _externally_managed() -> bool:
    """PEP 668: system Python blocks global pip install."""
    try:
        import sysconfig
        stdlib = Path(sysconfig.get_path("stdlib"))
        return (stdlib / "EXTERNALLY-MANAGED").exists()
    except Exception:
        return False


def _needs_venv() -> bool:
    if _in_venv():
        return False
    if not _has_pip():
        return True
    return _externally_managed()


def _create_venv() -> bool:
    """Create .venv, installing python3-venv via apt if needed."""
    vpy = _venv_python()
    if vpy.exists():
        return True

    print("  สร้าง virtual environment (.venv) ...")
    r = subprocess.run(
        [sys.executable, "-m", "venv", str(VENV_DIR)],
        capture_output=True,
    )
    if r.returncode == 0 and vpy.exists():
        return True

    # venv module not installed — try apt (Debian/Ubuntu)
    if sys.platform == "linux":
        pfx = [] if os.geteuid() == 0 else ["sudo"]
        print("  กำลังติดตั้ง python3-venv ผ่าน apt ...")
        subprocess.run(
            pfx + ["apt-get", "update", "-qq"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        subprocess.run(pfx + ["apt-get", "install", "-y", "--fix-missing", "python3-venv"])
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], capture_output=True)
        return vpy.exists()

    return False


def activate_venv_if_needed():
    """If system pip is broken/missing, create a venv and re‑exec inside it."""
    if not _needs_venv():
        return

    print("  pip ระบบใช้ไม่ได้ (PEP 668 / missing) — จะใช้ .venv แทน")

    if not _create_venv():
        print("  ไม่สามารถสร้าง venv — กรุณาติดตั้ง python3-venv แล้วรันใหม่")
        print("    Ubuntu/Debian: sudo apt install python3-venv")
        sys.exit(1)

    vpy = _venv_python()
    print(f"  venv พร้อม — กำลังรันใหม่ด้วย {vpy}\n")
    r = subprocess.run([str(vpy)] + sys.argv)
    sys.exit(r.returncode)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import argparse
    ap = argparse.ArgumentParser(description="Update node (run on this machine, no IP needed)")
    ap.add_argument("--no-pull", action="store_true", help="Skip git pull")
    ap.add_argument("--check-only", action="store_true", help="Only run suitability check")
    ap.add_argument("--full-deps", action="store_true", help="Also install AI/ML deps (torch, numpy, etc.)")
    args = ap.parse_args()

    os.chdir(ROOT)
    require_project_root()
    activate_venv_if_needed()

    print("=" * 60)
    print("  Axionax Node — Update (ทุกเครื่อง ไม่ต้องบอก IP)")
    print("=" * 60)
    venv_note = " (venv)" if _in_venv() else ""
    print(f"  Root: {ROOT}{venv_note}\n")

    # Step 1: git pull
    if not args.check_only and not args.no_pull:
        git_dir = ROOT / ".git"
        if git_dir.exists():
            print("[1] Git pull (ดึงโค้ดล่าสุด)...")
            run(["git", "pull"], allow_fail=True)
            if (ROOT / ".gitmodules").exists():
                run(["git", "submodule", "update", "--init", "--recursive"], allow_fail=True)
            print("  Done.\n")
        else:
            print("[1] Not a git repo — skip pull.\n")

    # Step 2: pip install
    if not args.check_only:
        # Upgrade pip itself first (old pip can't find wheels)
        run(
            [sys.executable, "-m", "pip", "install", "--upgrade", "pip", "-q"],
            allow_fail=True,
        )

        # Always install lightweight script deps (toml, requests, dotenv)
        script_req = ROOT / "scripts" / "requirements.txt"
        if script_req.exists():
            print("[2] ติดตั้ง dependencies (scripts)...")
            run(
                [sys.executable, "-m", "pip", "install", "-r", str(script_req), "-q", "--upgrade"],
                allow_fail=True,
            )
            print("  Done.\n")

        # Full AI/ML deps only if --full-deps flag is passed
        full_req = ROOT / "core" / "deai" / "requirements.txt"
        if args.full_deps and full_req.exists():
            print("[2b] ติดตั้ง AI/ML dependencies (torch, numpy, ...)...")
            run(
                [sys.executable, "-m", "pip", "install", "-r", str(full_req), "-q", "--upgrade"],
                allow_fail=True,
            )
            print("  Done.\n")

    # Step 3: suitability check
    print("[3] ตรวจความเหมาะสม...")
    run([sys.executable, "scripts/join-axionax.py", "--check-only"])
    print("")

    print("=" * 60)
    print("  อัปเดตเสร็จ — รีสตาร์ทโหนดเมื่อพร้อม")
    if _in_venv():
        vpy = _venv_python()
        print(f"  ใช้: {vpy} core/deai/worker_node.py")
    else:
        print("  เช่น: python3 core/deai/worker_node.py หรือ python3 hydra_manager.py")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
