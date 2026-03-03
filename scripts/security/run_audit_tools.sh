#!/usr/bin/env bash
# Security audit preparation — run cargo audit (Rust) and bandit (Python DeAI).
# Exit 1 if critical/high issues found.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

FAILED=0

echo "=== Security audit tools ==="

# 1. Cargo audit (Rust)
if command -v cargo-audit &>/dev/null || cargo audit --version &>/dev/null 2>&1; then
  echo "[1/3] Running cargo audit (core)..."
  if ( cd core && cargo audit ); then
    echo "  OK"
  else
    echo "  FAIL"
    FAILED=1
  fi
else
  echo "[1/3] cargo-audit not found (install: cargo install cargo-audit). Skipping."
fi

# 2. Bandit (Python DeAI)
if command -v bandit &>/dev/null; then
  echo "[2/3] Running bandit (core/deai)..."
  if bandit -r core/deai -ll --skip B101 2>/dev/null; then
    echo "  OK"
  else
    echo "  FAIL (or high severity findings)"
    FAILED=1
  fi
else
  echo "[2/3] bandit not found (pip install bandit). Skipping."
fi

# 3. Simple secrets check (no 64-char hex private keys in code)
echo "[3/3] Checking for obvious secrets in code..."
PATTERNS=$(grep -Rn --include="*.rs" --include="*.py" -E "0x[a-fA-F0-9]{64}" core/deai core/core 2>/dev/null || true)
if [ -n "$PATTERNS" ]; then
  # Exclude zero address and test/example/mock
  if echo "$PATTERNS" | grep -v "0x0\{40\}" | grep -v "example\|test\|mock\|dummy\|placeholder" | grep -q .; then
    echo "  Possible secret pattern found. Review:"
    echo "$PATTERNS" | grep -v "0x0\{40\}" | grep -v "example\|test\|mock\|dummy" || true
    FAILED=1
  fi
fi
[ $FAILED -eq 0 ] && echo "  OK"

if [ $FAILED -eq 1 ]; then
  echo "=== One or more checks failed ==="
  exit 1
fi
echo "=== All checks passed ==="
exit 0
