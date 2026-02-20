#!/usr/bin/env python3
"""
สร้างชุด "Node Package" สำหรับให้คนดาวน์โหลดแล้วรันได้ทันที
รวมเฉพาะไฟล์ที่จำเป็นสำหรับการรัน Worker / Scout / HYDRA และสคริปต์ตรวจความเหมาะสม

Usage: python scripts/make-node-package.py [--output axionax-node-package.zip]
"""

import argparse
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# โฟลเดอร์/ไฟล์ที่จะรวมใน package (relative to ROOT)
INCLUDE = [
    "core/deai/*.py",
    "core/deai/requirements.txt",
    "core/deai/.env.example",
    "core/deai/worker_config.toml",
    "configs/monolith_worker.toml",
    "configs/monolith_sentinel.toml",
    "configs/monolith_scout_single.toml",
    "scripts/join-axionax.py",
    "scripts/update-node.py",
    "scripts/update-node.sh",
    "scripts/health-check.py",
    "scripts/join-network.py",
    "scripts/verify-production-ready.py",
    "hydra_manager.py",
    "NODE_PACKAGE_README.md",
]


def collect_paths():
    paths = []
    for pattern in INCLUDE:
        if "*" in pattern:
            for p in ROOT.glob(pattern):
                if p.is_file():
                    paths.append(p.relative_to(ROOT))
        else:
            p = ROOT / pattern
            if p.exists() and p.is_file():
                paths.append(p.relative_to(ROOT))
    return sorted(set(paths))


def main():
    ap = argparse.ArgumentParser(description="Build axionax node package zip")
    ap.add_argument("--output", default="axionax-node-package.zip", help="Output zip path")
    args = ap.parse_args()

    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = ROOT / out_path

    paths = collect_paths()
    if not paths:
        print("No files to include (paths may be wrong)")
        return 1

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in paths:
            zf.write(ROOT / rel, rel)
            print(f"  + {rel}")

    print(f"\nCreated: {out_path}")
    print("  Extract and run: python scripts/join-axionax.py")
    return 0


if __name__ == "__main__":
    exit(main())
