#!/usr/bin/env bash
# ============================================================================
# Axionax — Rebuild & Redeploy Testnet
# ============================================================================
# Run this ON the VPS (or via SSH) to:
#   1. Pull latest code from the repo
#   2. Rebuild the Docker image from source
#   3. Reset chain state (fresh genesis)
#   4. Restart all services
#
# Usage (on VPS):
#   cd ~/axionax-core-universe && ./ops/deploy/environments/testnet/public/scripts/redeploy_testnet.sh
#
# Usage (from local machine via SSH):
#   ssh root@217.216.109.5 "cd ~/axionax-core-universe && ./ops/deploy/environments/testnet/public/scripts/redeploy_testnet.sh"
#   ssh root@46.250.244.4   "cd ~/axionax-core-universe && ./ops/deploy/environments/testnet/public/scripts/redeploy_testnet.sh"
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yaml"
CORE_DIR="${ROOT_DIR}/../../../../../core"

# ── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $*"; }
pass() { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        🔄 AXIONAX TESTNET REBUILD & REDEPLOY               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 0: Locate project ────────────────────────────────────────────────
if [[ ! -f "$COMPOSE_FILE" ]]; then
  # Try common VPS layout
  if [[ -f "$HOME/axionax-core-universe/ops/deploy/environments/testnet/public/docker-compose.yaml" ]]; then
    ROOT_DIR="$HOME/axionax-core-universe/ops/deploy/environments/testnet/public"
    CORE_DIR="$HOME/axionax-core-universe/core"
    COMPOSE_FILE="${ROOT_DIR}/docker-compose.yaml"
  else
    fail "Cannot find docker-compose.yaml. Run from project root or set paths."
  fi
fi

log "Compose file: ${COMPOSE_FILE}"
log "Core dir:     ${CORE_DIR}"

# ── Step 1: Pull latest code ──────────────────────────────────────────────
log "Step 1/5: Pulling latest code..."
if [[ -d "${CORE_DIR}/.git" ]] || [[ -d "${CORE_DIR}/../.git" ]]; then
  cd "${CORE_DIR}/.." 2>/dev/null || cd "${CORE_DIR}"
  git pull --ff-only || warn "git pull failed (may be OK if not using git)"
else
  warn "No git repo found — assuming code is already up to date"
fi

# ── Step 2: Stop existing services ────────────────────────────────────────
log "Step 2/5: Stopping existing services..."
cd "$ROOT_DIR"
docker compose -f "$COMPOSE_FILE" down --timeout 30 2>/dev/null || true
pass "Services stopped"

# ── Step 3: Reset state (fresh genesis) ───────────────────────────────────
log "Step 3/5: Resetting chain state (removing old volumes)..."
docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true

# Also clear any leftover data directories
for dir in data/validator data/rpc data/bootnode; do
  target="${ROOT_DIR}/${dir}"
  if [[ -d "$target" ]]; then
    rm -rf "$target"
    log "  Cleared ${dir}"
  fi
done
pass "Chain state reset — will start from genesis"

# ── Step 4: Rebuild Docker image ──────────────────────────────────────────
log "Step 4/5: Rebuilding Docker image (this takes 2-5 minutes)..."

# Build context is the core/ directory
if [[ ! -f "${CORE_DIR}/Cargo.toml" ]]; then
  fail "Cannot find ${CORE_DIR}/Cargo.toml — wrong path?"
fi

# Find the Dockerfile
DOCKERFILE=""
for candidate in \
  "${ROOT_DIR}/../../../Dockerfile" \
  "${CORE_DIR}/../ops/deploy/Dockerfile" \
  "$HOME/axionax-core-universe/ops/deploy/Dockerfile"; do
  if [[ -f "$candidate" ]]; then
    DOCKERFILE="$(realpath "$candidate")"
    break
  fi
done

if [[ -z "$DOCKERFILE" ]]; then
  fail "Cannot find Dockerfile"
fi

log "  Dockerfile: ${DOCKERFILE}"
log "  Context:    ${CORE_DIR}"

docker build \
  --progress=plain \
  --no-cache \
  -f "$DOCKERFILE" \
  -t axionax-node:latest \
  -t ghcr.io/axionaxprotocol/core:latest \
  "${CORE_DIR}"


pass "Docker image rebuilt: axionax-node:latest"

# ── Step 5: Start services ────────────────────────────────────────────────
log "Step 5/5: Starting services..."
cd "$ROOT_DIR"

# Recreate data directories
mkdir -p data/validator data/rpc data/bootnode

# Start only core services (validator + bootnode + rpc)
docker compose -f "$COMPOSE_FILE" up -d validator bootnode rpc 2>&1

sleep 5

echo ""
log "Service status:"
docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || docker ps --format 'table {{.Names}}\t{{.Status}}'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        ✅ REDEPLOY COMPLETE                                 ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  • Image rebuilt with block_time fix                         ║"
echo "║  • State reset — starting from genesis block #0              ║"
echo "║  • Core services started (validator, bootnode, rpc)          ║"
echo "║                                                              ║"
echo "║  Next: Wait 30s then verify with:                            ║"
echo "║    curl -s localhost:8545 -X POST                            ║"
echo "║      -H 'Content-Type: application/json'                     ║"
echo "║      -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",║"
echo "║           \"params\":[],\"id\":1}'                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
