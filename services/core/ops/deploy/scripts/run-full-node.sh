#!/bin/bash
# Run axionax full node.
#
# If you already ran: axionax-node-bootstrap.sh setup …
#   ./run-full-node.sh --data-dir /var/lib/axionax-node
#   (delegates to axionax-node-bootstrap.sh run)
#
# Legacy (no setup / no genesis file on disk):
#   AXIONAX_STATE_PATH=./data AXIONAX_BOOTSTRAP_NODES=/ip4/… ./run-full-node.sh
#
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=node-runtime-common.sh
source "$SCRIPT_DIR/node-runtime-common.sh"
axionax_resolve_paths

DATA_DIR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    *) break ;;
  esac
done

if [[ -z "${DATA_DIR:-}" ]]; then
  DATA_DIR="${AXIONAX_STATE_PATH:-$AXIONAX_REPO_ROOT/data}"
fi

if [[ -x "$DATA_DIR/run.sh" ]]; then
  exec "$SCRIPT_DIR/axionax-node-bootstrap.sh" run --data-dir "$DATA_DIR"
fi

axionax_require_binary
mkdir -p "$DATA_DIR"
echo "Starting axionax-node (legacy: no genesis file; state=$DATA_DIR)"
echo "  For public testnet use: $SCRIPT_DIR/axionax-node-bootstrap.sh setup --role full …"
exec "$AXIONAX_NODE_BIN" \
  --role full \
  --chain-id 86137 \
  --rpc 0.0.0.0:8545 \
  --state-path "$DATA_DIR"
