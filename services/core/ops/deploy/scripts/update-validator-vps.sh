#!/bin/bash
# =============================================================================
# Update Validator VPS (217.216.109.5, 46.250.244.4)
# Run this script on each VPS: OS update, config (chain_id 86137), image, restart, RPC check
#
# Usage:
#   scp ops/deploy/scripts/update-validator-vps.sh root@217.216.109.5:/tmp/
#   ssh root@217.216.109.5 'bash /tmp/update-validator-vps.sh'
#
# Options: --skip-apt | --skip-pull | --dry-run
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SKIP_APT=
SKIP_PULL=
DRY_RUN=

for arg in "$@"; do
  case "$arg" in
    --skip-apt)  SKIP_APT=1 ;;
    --skip-pull) SKIP_PULL=1 ;;
    --dry-run)   DRY_RUN=1 ;;
  esac
done

run() {
  if [ -n "$DRY_RUN" ]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="${DEPLOY_DIR}/configs"
RPC_CONFIG="${CONFIG_DIR}/rpc-config.toml"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.vps.yml"

echo "=============================================="
echo "  Axionax Validator VPS — Update Script"
echo "=============================================="
echo "  DEPLOY_DIR = $DEPLOY_DIR"
echo ""

if [ -z "$SKIP_APT" ]; then
  echo "[1] Updating OS (apt)..."
  run apt-get update -qq && run apt-get upgrade -y -qq || true
  echo -e "${GREEN}  Done${NC}"
else
  echo "[1] Skipping apt (--skip-apt)"
fi

if [ -f "$RPC_CONFIG" ]; then
  echo "[2] Checking rpc-config.toml (chain_id 86137)..."
  if grep -q 'chain_id = 888' "$RPC_CONFIG" 2>/dev/null; then
    if [ -z "$DRY_RUN" ]; then
      sed -i.bak 's/chain_id = 888/chain_id = 86137/' "$RPC_CONFIG"
      echo -e "  ${GREEN}Updated chain_id to 86137 (backup: rpc-config.toml.bak)${NC}"
    else
      echo "  Would replace chain_id 888 -> 86137"
    fi
  elif grep -q 'chain_id = 86137' "$RPC_CONFIG" 2>/dev/null; then
    echo -e "  ${GREEN}Already chain_id 86137${NC}"
  else
    echo -e "  ${YELLOW}chain_id not 888/86137 — check manually${NC}"
  fi
else
  echo "[2] No rpc-config.toml at $RPC_CONFIG — skip"
fi

if [ -f "$COMPOSE_FILE" ]; then
  if [ -z "$SKIP_PULL" ]; then
    echo "[3] Pulling latest image and restarting rpc-node..."
    run docker compose -f "$COMPOSE_FILE" pull rpc-node 2>/dev/null || run docker-compose -f "$COMPOSE_FILE" pull rpc-node 2>/dev/null || true
  else
    echo "[3] Restarting rpc-node (--skip-pull)"
  fi
  run docker compose -f "$COMPOSE_FILE" up -d rpc-node 2>/dev/null || run docker-compose -f "$COMPOSE_FILE" up -d rpc-node 2>/dev/null || true
  echo -e "${GREEN}  rpc-node up${NC}"
else
  echo "[3] No docker-compose.vps.yml — skip"
fi

echo "[4] Health check (RPC)..."
sleep 3
RPC_URL="http://127.0.0.1:8545"
if curl -sf -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$RPC_URL" >/dev/null 2>&1; then
  BLOCK=$(curl -sf -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$RPC_URL" | sed -n 's/.*"result":"0x\([0-9a-f]*\).*/\1/p')
  echo -e "  ${GREEN}RPC OK (block: $((16#${BLOCK:-0})))${NC}"
else
  echo -e "  ${YELLOW}RPC not responding yet — check: docker compose -f $COMPOSE_FILE logs rpc-node${NC}"
fi

echo ""
echo "=============================================="
echo "  Done. Repeat on the other VPS if needed."
echo "=============================================="

