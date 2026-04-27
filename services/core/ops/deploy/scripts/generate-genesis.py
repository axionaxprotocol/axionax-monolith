#!/usr/bin/env python3
"""
Wrapper — delegates to the canonical genesis generator.
See: core/tools/create_genesis.py
"""

import subprocess
import sys
from pathlib import Path

CANONICAL = Path(__file__).resolve().parents[3] / "core" / "tools" / "create_genesis.py"

if not CANONICAL.is_file():
    print(f"Canonical genesis script not found: {CANONICAL}")
    sys.exit(1)

sys.exit(subprocess.run([sys.executable, str(CANONICAL)] + sys.argv[1:]).returncode)
