#!/usr/bin/env bash
# ============================================================================
# Axionax Chaos Engineering Test
# ============================================================================
# Simulates validator failure scenarios on the public testnet and verifies
# that the network remains operational (blocks continue to be produced).
#
# Usage:
#   ./chaos_test.sh                      # Run locally on a VPS that has the validator container
#   ./chaos_test.sh --remote root@IP     # SSH into a remote VPS and run there
#   ./chaos_test.sh --rpc http://OTHER_RPC:8545  # Monitor a different RPC while killing local
#
# Prerequisites:
#   - Docker running on the validator VPS
#   - curl available
#   - (optional) ssh access for remote mode
# ============================================================================
set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
CONTAINER_NAME="${CONTAINER_NAME:-axionax-validator}"  # docker container grep pattern
MONITOR_RPC="${MONITOR_RPC:-http://217.76.61.116:8545}" # RPC on the OTHER validator to monitor
LOCAL_RPC="http://127.0.0.1:8545"
KILL_DURATION=30        # seconds the validator stays down
RECOVERY_WAIT=45        # seconds to wait for recovery after restart
REMOTE_HOST=""          # if set, SSH into this host to run
MAX_BLOCK_STALL=3       # consecutive stall checks before declaring FAIL

# ── Parse args ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote)   REMOTE_HOST="$2"; shift 2 ;;
    --rpc)      MONITOR_RPC="$2"; shift 2 ;;
    --duration) KILL_DURATION="$2"; shift 2 ;;
    --container) CONTAINER_NAME="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--remote user@host] [--rpc http://other:8545] [--duration 30] [--container name]"
      exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Helpers ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $*"; }
pass() { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; }

get_block() {
  local rpc="$1"
  local resp
  resp=$(curl -sf -m 5 -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$rpc" 2>/dev/null || echo "")
  if [[ -n "$resp" && "$resp" == *"result"* ]]; then
    local hex
    hex=$(echo "$resp" | grep -oP '(?<="result":")[^"]*' || echo "0x0")
    echo $((16#${hex#0x}))
  else
    echo "-1"
  fi
}

get_peers() {
  local rpc="$1"
  local resp
  resp=$(curl -sf -m 5 -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' "$rpc" 2>/dev/null || echo "")
  if [[ -n "$resp" && "$resp" == *"result"* ]]; then
    local hex
    hex=$(echo "$resp" | grep -oP '(?<="result":")[^"]*' || echo "0x0")
    echo $((16#${hex#0x}))
  else
    echo "-1"
  fi
}

find_container() {
  docker ps --format '{{.Names}}' | grep -i "${CONTAINER_NAME}" | head -1 || echo ""
}

# ── Remote mode ─────────────────────────────────────────────────────────────
if [[ -n "$REMOTE_HOST" ]]; then
  log "Remote mode: uploading script to $REMOTE_HOST ..."
  scp -q "$0" "${REMOTE_HOST}:/tmp/chaos_test.sh"
  ssh -t "$REMOTE_HOST" "chmod +x /tmp/chaos_test.sh && MONITOR_RPC=${MONITOR_RPC} /tmp/chaos_test.sh --rpc ${MONITOR_RPC} --duration ${KILL_DURATION}"
  exit $?
fi

# ============================================================================
# MAIN TEST FLOW
# ============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🔥 AXIONAX CHAOS ENGINEERING TEST 🔥              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Test: Kill validator → verify network survives → restart    ║"
echo "║  Monitor RPC: ${MONITOR_RPC}                                 ║"
echo "║  Kill duration: ${KILL_DURATION}s                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

RESULTS=()
test_passed=true

# ── Phase 0: Pre-flight ────────────────────────────────────────────────────
log "Phase 0: Pre-flight checks"

CONTAINER=$(find_container)
if [[ -z "$CONTAINER" ]]; then
  fail "No container matching '${CONTAINER_NAME}' found. Available containers:"
  docker ps --format '  {{.Names}}  ({{.Status}})'
  exit 1
fi
pass "Found container: ${CONTAINER}"

LOCAL_BLOCK=$(get_block "$LOCAL_RPC")
MONITOR_BLOCK=$(get_block "$MONITOR_RPC")
LOCAL_PEERS=$(get_peers "$LOCAL_RPC")

log "  Local block height:   ${LOCAL_BLOCK}"
log "  Monitor block height: ${MONITOR_BLOCK}"
log "  Local peer count:     ${LOCAL_PEERS}"

if [[ "$LOCAL_BLOCK" -le 0 ]]; then
  warn "Local RPC not responding or at block 0 — will rely on monitor RPC only"
fi
if [[ "$MONITOR_BLOCK" -le 0 ]]; then
  fail "Cannot reach monitor RPC at ${MONITOR_RPC}. Aborting."
  exit 1
fi

RESULTS+=("Pre-flight: OK (local=${LOCAL_BLOCK}, monitor=${MONITOR_BLOCK}, peers=${LOCAL_PEERS})")

# ── Phase 1: Kill the validator ────────────────────────────────────────────
echo ""
log "Phase 1: 💀 Killing validator container '${CONTAINER}' ..."
docker stop "$CONTAINER" >/dev/null 2>&1 || docker kill "$CONTAINER" >/dev/null 2>&1 || true
sleep 2

# Verify it's actually down
if docker ps --format '{{.Names}}' | grep -qi "$CONTAINER"; then
  fail "Container still running after kill!"
  test_passed=false
else
  pass "Validator container stopped successfully"
fi

RESULTS+=("Kill: Container '${CONTAINER}' stopped")

# ── Phase 2: Monitor network during outage ─────────────────────────────────
echo ""
log "Phase 2: 📊 Monitoring network for ${KILL_DURATION}s while validator is down..."

PRE_KILL_BLOCK=$(get_block "$MONITOR_RPC")
stall_count=0
blocks_during_outage=0
check_interval=5
checks=$((KILL_DURATION / check_interval))
prev_block=$PRE_KILL_BLOCK

for i in $(seq 1 "$checks"); do
  sleep "$check_interval"
  current_block=$(get_block "$MONITOR_RPC")
  
  if [[ "$current_block" -le 0 ]]; then
    warn "  [${i}/${checks}] Monitor RPC unreachable"
    stall_count=$((stall_count + 1))
  elif [[ "$current_block" -gt "$prev_block" ]]; then
    delta=$((current_block - prev_block))
    blocks_during_outage=$((blocks_during_outage + delta))
    log "  [${i}/${checks}] Block ${current_block} (+${delta}) — network producing blocks ✓"
    stall_count=0
    prev_block=$current_block
  else
    warn "  [${i}/${checks}] Block ${current_block} (stalled)"
    stall_count=$((stall_count + 1))
  fi
  
  if [[ "$stall_count" -ge "$MAX_BLOCK_STALL" ]]; then
    fail "Network stalled for ${MAX_BLOCK_STALL} consecutive checks!"
    break
  fi
done

POST_KILL_BLOCK=$(get_block "$MONITOR_RPC")
total_blocks=$((POST_KILL_BLOCK - PRE_KILL_BLOCK))

echo ""
if [[ "$total_blocks" -gt 0 ]]; then
  pass "Network survived! ${total_blocks} blocks produced during ${KILL_DURATION}s outage"
  RESULTS+=("Outage: PASS — ${total_blocks} blocks produced in ${KILL_DURATION}s")
else
  fail "Network halted — 0 new blocks during outage!"
  RESULTS+=("Outage: FAIL — 0 blocks produced")
  test_passed=false
fi

# ── Phase 3: Restart validator ─────────────────────────────────────────────
echo ""
log "Phase 3: 🔄 Restarting validator container '${CONTAINER}' ..."
docker start "$CONTAINER" >/dev/null 2>&1

sleep 5
if docker ps --format '{{.Names}}' | grep -qi "$CONTAINER"; then
  pass "Validator container restarted"
else
  fail "Container failed to restart!"
  test_passed=false
fi

RESULTS+=("Restart: Container '${CONTAINER}' restarted")

# ── Phase 4: Wait for recovery & re-sync ───────────────────────────────────
echo ""
log "Phase 4: ⏳ Waiting ${RECOVERY_WAIT}s for recovery and re-sync..."

sleep "$RECOVERY_WAIT"

FINAL_LOCAL_BLOCK=$(get_block "$LOCAL_RPC")
FINAL_MONITOR_BLOCK=$(get_block "$MONITOR_RPC")
FINAL_PEERS=$(get_peers "$LOCAL_RPC")

echo ""
log "Post-recovery status:"
log "  Local block height:   ${FINAL_LOCAL_BLOCK}"
log "  Monitor block height: ${FINAL_MONITOR_BLOCK}"
log "  Local peer count:     ${FINAL_PEERS}"

# Check if local node caught up
if [[ "$FINAL_LOCAL_BLOCK" -gt 0 ]]; then
  height_diff=$((FINAL_MONITOR_BLOCK - FINAL_LOCAL_BLOCK))
  if [[ "$height_diff" -lt 5 ]]; then
    pass "Validator re-synced successfully (diff: ${height_diff} blocks)"
    RESULTS+=("Recovery: PASS — re-synced (diff=${height_diff})")
  else
    warn "Validator still syncing (diff: ${height_diff} blocks)"
    RESULTS+=("Recovery: SYNCING — diff=${height_diff} blocks")
  fi
else
  warn "Local RPC not responding yet — may still be starting up"
  RESULTS+=("Recovery: PENDING — local RPC not yet available")
fi

if [[ "$FINAL_PEERS" -gt 0 ]]; then
  pass "Peers reconnected: ${FINAL_PEERS}"
else
  warn "No peers yet — may need more time"
fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    📋 TEST SUMMARY                           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
for r in "${RESULTS[@]}"; do
  printf "║  %-58s ║\n" "$r"
done
echo "╠══════════════════════════════════════════════════════════════╣"
if $test_passed; then
  echo "║  ✅ OVERALL RESULT: PASS                                   ║"
else
  echo "║  ❌ OVERALL RESULT: FAIL                                   ║"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Exit with appropriate code
$test_passed && exit 0 || exit 1
