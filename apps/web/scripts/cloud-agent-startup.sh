#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[cloud-agent] Installing pnpm workspace dependencies..."
pnpm install --frozen-lockfile

echo "[cloud-agent] Verifying TypeScript toolchain for blockchain-utils..."
pnpm --filter @axionax/blockchain-utils exec tsc --version
pnpm --filter @axionax/blockchain-utils type-check

echo "[cloud-agent] Startup checks completed."
