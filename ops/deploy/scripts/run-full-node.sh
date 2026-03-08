#!/bin/bash
# Run axionax full node (for VPS).
# Usage:
#   ./run-full-node.sh                    # RPC on 0.0.0.0:8545, state in ./data
#   AXIONAX_BOOTSTRAP_NODES=/ip4/1.2.3.4/tcp/30303/p2p/12D3KooW... ./run-full-node.sh
#
# Require: run from repo root or set AXIONAX_REPO_ROOT to core/ directory parent.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="${AXIONAX_REPO_ROOT:-$(cd "$DEPLOY_DIR/../.." && pwd)}"
CORE="$REPO_ROOT/core"
BIN="$CORE/target/release/axionax-node"
STATE="${AXIONAX_STATE_PATH:-$REPO_ROOT/data}"

if [ ! -x "$BIN" ]; then
  echo "Binary not found: $BIN (run: cd $CORE && cargo build --release -p node)"
  exit 1
fi

mkdir -p "$STATE"
echo "Starting axionax-node (rpc=0.0.0.0:8545, state=$STATE)"
exec "$BIN" \
  --role full \
  --chain-id 86137 \
  --rpc 0.0.0.0:8545 \
  --state-path "$STATE"
