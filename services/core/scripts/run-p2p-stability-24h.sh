#!/usr/bin/env bash
# Start a full DoD P2P stability window from the monorepo root (Linux/macOS/WSL).
# Optional: export AXIONAX_P2P_WEBHOOK=<discord-url> for Discord alerts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
export PYTHONUNBUFFERED=1

ARGS=(
  services/core/scripts/p2p_stability_monitor.py
  --duration-hours 24
  --interval-seconds 30
  --output-root services/core/reports
)

if [[ -n "${AXIONAX_P2P_WEBHOOK:-}" ]]; then
  ARGS+=(--webhook "$AXIONAX_P2P_WEBHOOK")
fi

exec python3 "${ARGS[@]}"
