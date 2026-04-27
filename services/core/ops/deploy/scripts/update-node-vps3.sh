#!/bin/bash
# Update axionax-node on VPS3 (46.250.244.4)
# This script pulls latest changes, rebuilds, and restarts the node

set -e

VPS_HOST="root@46.250.244.4"
REPO_DIR="/root/axionax-core-universe"
SERVICE_NAME="axionax-node"

echo "🔄 Deploying updated axionax-node to VPS3..."

# SSH into VPS and execute update
ssh "$VPS_HOST" << 'ENDSSH'
set -e

echo "📁 Changing to repo directory..."
cd /root/axionax-core-universe

echo "🧹 Stashing local changes..."
git stash push -m "Auto-stash before update $(date)" || true

echo "🗑️  Removing untracked files that would be overwritten..."
git clean -fd || true

echo "📥 Pulling latest changes..."
git pull origin main

echo "🔨 Building release binary..."
cd core
cargo build --release -p node

echo "⏹️  Stopping axionax-node service..."
systemctl stop axionax-node

echo "📋 Copying new binary to correct location..."
cp target/release/axionax-node /opt/axionax-core-universe/core/target/release/axionax-node
chmod +x /opt/axionax-core-universe/core/target/release/axionax-node

echo "🚀 Starting axionax-node service..."
systemctl start axionax-node

echo "⏳ Waiting for service to start..."
sleep 5

echo "📊 Checking service status..."
systemctl status axionax-node --no-pager

echo "📝 Checking recent logs..."
journalctl -u axionax-node -n 20 --no-pager

echo ""
echo "✅ Update complete!"
ENDSSH

echo ""
echo "✅ VPS3 deployment finished!"
echo ""
echo "Test the new RPC methods:"
echo "  eth_getTransactionReceipt: curl -X POST http://46.250.244.4:8545 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionReceipt\",\"params\":[\"0x...\"],\"id\":1}'"
echo "  eth_gasPrice: curl -X POST http://46.250.244.4:8545 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_gasPrice\",\"params\":[],\"id\":1}'"
echo "  net_peerCount: curl -X POST http://46.250.244.4:8545 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"net_peerCount\",\"params\":[],\"id\":1}'"
echo "  staking_getStats: curl -X POST http://46.250.244.4:8545 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"staking_getStats\",\"params\":[],\"id\":1}'"
