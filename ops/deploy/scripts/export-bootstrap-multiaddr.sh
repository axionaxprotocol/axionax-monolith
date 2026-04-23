#!/usr/bin/env bash
set -euo pipefail

# Print local node bootstrap multiaddr:
#   /ip4/<PUBLIC_IP>/tcp/<P2P_PORT>/p2p/<PEER_ID>
#
# Usage examples:
#   ./export-bootstrap-multiaddr.sh --public-ip 217.76.61.116
#   ./export-bootstrap-multiaddr.sh --public-ip 46.250.244.4 --p2p-port 30303
#
# Optional env:
#   AXIONAX_RPC_URL (default: http://127.0.0.1:8545)
#   AXIONAX_P2P_PORT (default: 30303)

RPC_URL="${AXIONAX_RPC_URL:-http://127.0.0.1:8545}"
P2P_PORT="${AXIONAX_P2P_PORT:-30303}"
PUBLIC_IP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --public-ip) PUBLIC_IP="$2"; shift 2 ;;
    --p2p-port) P2P_PORT="$2"; shift 2 ;;
    --rpc-url) RPC_URL="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 --public-ip <IP> [--p2p-port 30303] [--rpc-url http://127.0.0.1:8545]"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$PUBLIC_IP" ]]; then
  echo "error: --public-ip is required" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

# Try admin_nodeInfo first (if implementation exposes it).
PEER_ID="$(
  curl -s -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"admin_nodeInfo","params":[],"id":1}' \
    "$RPC_URL" | jq -r '.result.id // empty'
)"

if [[ -z "$PEER_ID" || "$PEER_ID" == "null" ]]; then
  # Fallback: parse logs (systemd or docker) for "Local peer ID: ..."
  PEER_ID="$(
    (journalctl -u axionax-node --no-pager -n 300 2>/dev/null || true; \
     docker logs public-validator-1 --tail 300 2>/dev/null || true; \
     docker logs public-rpc-1 --tail 300 2>/dev/null || true) \
      | sed -n 's/.*Local peer ID: \([[:alnum:]]\+\).*/\1/p' | tail -n 1
  )"
fi

if [[ -z "$PEER_ID" ]]; then
  echo "error: could not determine Peer ID (admin_nodeInfo/log parsing failed)" >&2
  exit 1
fi

echo "/ip4/${PUBLIC_IP}/tcp/${P2P_PORT}/p2p/${PEER_ID}"
