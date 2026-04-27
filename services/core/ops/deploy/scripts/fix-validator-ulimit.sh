#!/bin/bash
# Fix "Too many open files" on validator/RPC container by recreating with higher ulimit.
# Usage: bash fix-validator-ulimit.sh [CONTAINER_NAME]
# Default container: axionax-validator-eu
# Run on the VPS where the container runs.

set -e

CONTAINER="${1:-axionax-validator-eu}"
ULIMIT="65536"

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "Error: Container '$CONTAINER' not found."
    exit 1
fi

echo "=============================================="
echo "  Fix ulimit for container: $CONTAINER"
echo "=============================================="

# Get docker run command using runlike (no pip install — use pre-built image)
echo "[1] Getting container config..."
RUN_CMD=$(docker run --rm -v /var/run/docker.sock:/var/run/docker.sock assaflavie/runlike "$CONTAINER" 2>/dev/null) || true

if [ -z "$RUN_CMD" ]; then
    echo "Error: Could not get run command. Install runlike: pip3 install runlike"
    echo "Then run: runlike $CONTAINER | sed 's/docker run/docker run --ulimit nofile=${ULIMIT}:${ULIMIT}/' | bash"
    exit 1
fi

# Insert --ulimit after "docker run"
RUN_CMD_FIXED=$(echo "$RUN_CMD" | sed "s/docker run /docker run --ulimit nofile=${ULIMIT}:${ULIMIT} /")

echo "[2] Stopping and removing container..."
docker stop "$CONTAINER"
docker rm "$CONTAINER"

echo "[3] Recreating with ulimit nofile=$ULIMIT..."
eval "$RUN_CMD_FIXED"

echo ""
echo "=============================================="
echo "  Done. Check logs: docker logs $CONTAINER --tail 20"
echo "=============================================="
