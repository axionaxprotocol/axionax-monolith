#!/usr/bin/env bash
set -e

echo "🔍 Axionax Validator Sync Diagnostic Tool"
echo "========================================="

# 1. Check Time Sync
echo "[1/4] Checking System Time Synchronization..."
if command -v timedatectl >/dev/null; then
    timedatectl | grep "System clock synchronized" || echo "⚠️ NTP Sync might be disabled or out of sync!"
else
    echo "⚠️ timedatectl not found. Please ensure NTP is running."
fi

# 2. Check Container Status
echo -e "\n[2/4] Checking Docker Containers..."
if command -v docker >/dev/null; then
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "validator|bootnode|rpc" || echo "⚠️ No validator/bootnode/rpc containers found running."
else
    echo "❌ Docker not found!"
    exit 1
fi

# 3. Check Peer Count via RPC
echo -e "\n[3/4] Checking P2P Connected Peers..."
RPC_URL="http://127.0.0.1:8545"
PEER_RESP=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' $RPC_URL || echo "")

if [[ -n "$PEER_RESP" && "$PEER_RESP" == *"result"* ]]; then
    # Parse hex result to decimal (using bash arithmetic or python/perl if available)
    PEER_HEX=$(echo "$PEER_RESP" | grep -oP '(?<="result":")[^"]*' || echo "")
    if [[ -n "$PEER_HEX" ]]; then
        PEER_COUNT=$((16#${PEER_HEX#0x}))
        echo "✅ Connected to $PEER_COUNT peers."
        if [ "$PEER_COUNT" -eq 0 ]; then
            echo "❌ WARNING: 0 peers connected. Check your bootnode config, enode URLs, and firewall (Port 30333 TCP/UDP)."
        fi
    else
        echo "⚠️ Could not parse peer count: $PEER_RESP"
    fi
else
    echo "❌ Failed to connect to local RPC at $RPC_URL (Is the validator running and exposing port 8545?)"
fi

# 4. Check Block Height
echo -e "\n[4/4] Checking Local Block Height..."
BLOCK_RESP=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $RPC_URL || echo "")

if [[ -n "$BLOCK_RESP" && "$BLOCK_RESP" == *"result"* ]]; then
    BLOCK_HEX=$(echo "$BLOCK_RESP" | grep -oP '(?<="result":")[^"]*' || echo "")
    if [[ -n "$BLOCK_HEX" ]]; then
        BLOCK_COUNT=$((16#${BLOCK_HEX#0x}))
        echo "✅ Local Validator Block Height: $BLOCK_COUNT"
        echo "ℹ️ Compare this height with the Axionax Public Explorer or your other validator node."
    else
        echo "⚠️ Could not parse block height: $BLOCK_RESP"
    fi
fi

echo -e "\n========================================="
echo "💡 To fix '0 peers' or 'Sync stuck' issues:"
echo "1. Verify bootnode enode URL in validator config (ensure IP is reachable)."
echo "2. Check VPS firewall: allow TCP/UDP 30333 for P2P."
echo "3. Restart the validator container if it's stuck in an error loop."
echo "4. Ensure that the clocks on all VPS nodes are synchronized via NTP."
