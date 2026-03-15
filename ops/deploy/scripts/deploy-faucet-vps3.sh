#!/bin/bash
# Deploy Testnet Faucet on VPS3 (217.216.109.5).
# Run ON VPS3 (or copy compose + .env and run there).
# Prerequisite: FAUCET_PRIVATE_KEY in .env (see docs).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.vps3-faucet.yml"
ENV_FILE="${DEPLOY_DIR}/.env.vps3-faucet"

echo "=============================================="
echo "  Deploy Testnet Faucet on VPS3"
echo "=============================================="
echo "  Compose: $COMPOSE_FILE"
echo "  RPC:     http://217.76.61.116:8545"
echo "  Chain:   86137"
echo "=============================================="

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Error: $COMPOSE_FILE not found."
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
  echo "Loaded env from $ENV_FILE"
fi

if [ -z "$FAUCET_PRIVATE_KEY" ]; then
  echo ""
  echo "FAUCET_PRIVATE_KEY is not set. Create $ENV_FILE with:"
  echo "  FAUCET_PRIVATE_KEY=<hex key for genesis faucet address>"
  echo ""
  echo "If you used create_genesis.py default, the key is deterministic:"
  echo "  python3 -c \"import hashlib; print(hashlib.sha256(b'axionax_faucet_mainnet_q2_2026').hexdigest())\""
  echo ""
  exit 1
fi

echo ""
echo "Starting faucet (building if needed)..."
if [ -f "$ENV_FILE" ]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
else
  docker compose -f "$COMPOSE_FILE" up -d --build
fi

echo ""
sleep 5
if curl -sf http://127.0.0.1:3002/health > /dev/null; then
  echo "Faucet is up. Check: curl http://127.0.0.1:3002/health"
else
  echo "Faucet may still be starting. Check: docker logs axionax-testnet-faucet --tail 20"
fi
echo "=============================================="
