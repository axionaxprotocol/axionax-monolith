#!/usr/bin/env bash
# check-node-sync.sh — Compare local Axionax node block height against a peer.
#
# Usage:
#   ./scripts/check-node-sync.sh [LOCAL_RPC] [PEER_RPC] [LAG_THRESHOLD]
#
# Defaults:
#   LOCAL_RPC      = http://localhost:8545
#   PEER_RPC       = http://217.76.61.116:8545        (testnet validator #1)
#   LAG_THRESHOLD  = 10                                (warn if behind by > this)
#
# Exit codes:
#   0  in-sync (within threshold)
#   1  lagging (>threshold blocks behind)
#   2  ahead   (local is ahead of peer — likely peer-side issue, still warn)
#   3  rpc error (couldn't query one or both endpoints)
#
# Designed for cron / systemd timers and Prometheus textfile collector.

set -euo pipefail

LOCAL_RPC="${1:-${LOCAL_RPC:-http://localhost:8545}}"
PEER_RPC="${2:-${PEER_RPC:-http://217.76.61.116:8545}}"
LAG_THRESHOLD="${3:-${LAG_THRESHOLD:-10}}"

# ---- helpers ---------------------------------------------------------------

ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

log_info()  { echo "[$(ts)] INFO  $*"; }
log_warn()  { echo "[$(ts)] WARN  $*" >&2; }
log_error() { echo "[$(ts)] ERROR $*" >&2; }

# Query eth_blockNumber. Echoes a decimal integer on success, returns non-zero
# on RPC failure or malformed response.
fetch_block_height() {
  local url="$1"
  local response hex_height

  response=$(
    curl -fsS -m 5 \
      -H 'Content-Type: application/json' \
      -X POST "$url" \
      -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
      2>/dev/null
  ) || {
    log_error "Failed to reach $url"
    return 1
  }

  # Extract "result":"0x..." without depending on jq.
  hex_height=$(printf '%s' "$response" | sed -nE 's/.*"result":"(0x[0-9a-fA-F]+)".*/\1/p')

  if [[ -z "$hex_height" ]]; then
    log_error "Malformed response from $url: $response"
    return 1
  fi

  printf '%d' "$hex_height"
}

# ---- main ------------------------------------------------------------------

log_info "Local RPC : $LOCAL_RPC"
log_info "Peer  RPC : $PEER_RPC"
log_info "Threshold : $LAG_THRESHOLD blocks"

local_height=$(fetch_block_height "$LOCAL_RPC")  || exit 3
peer_height=$(fetch_block_height "$PEER_RPC")    || exit 3

delta=$(( peer_height - local_height ))

log_info "Local height : $local_height"
log_info "Peer  height : $peer_height"
log_info "Delta        : $delta (peer - local)"

if (( delta > LAG_THRESHOLD )); then
  log_warn "Local node is LAGGING by $delta blocks (threshold $LAG_THRESHOLD)"
  exit 1
fi

if (( delta < -LAG_THRESHOLD )); then
  log_warn "Local node is AHEAD by $(( -delta )) blocks — peer may be stalled"
  exit 2
fi

log_info "Node is in sync (within ±$LAG_THRESHOLD blocks)"
exit 0
