#!/usr/bin/env bash
# Run Axionax DeAI Worker from repo root.
# Usage: ./scripts/run-worker.sh [config_path]
# Example: ./scripts/run-worker.sh configs/monolith_worker.toml

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
CONFIG="${1:-core/deai/worker_config.toml}"
exec python core/deai/worker_node.py --config "$CONFIG"
