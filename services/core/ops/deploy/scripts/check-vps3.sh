#!/bin/bash
# Run on VPS3 (217.216.109.5) to check Nginx, Faucet, Docker, disk.
# Usage: ssh root@217.216.109.5 'bash -s' < ops/deploy/scripts/check-vps3.sh

set -e

echo "=============================================="
echo "  VPS3 (217.216.109.5) — Service Check"
echo "=============================================="

echo ""
echo "[1] Nginx"
if command -v nginx &>/dev/null; then
  nginx -t 2>&1 && echo "  OK: nginx config valid" || echo "  FAIL: nginx config"
else
  echo "  nginx not in PATH (may run in Docker)"
fi
systemctl is-active nginx 2>/dev/null && echo "  systemctl: nginx active" || true

echo ""
echo "[2] Docker"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "  Docker not running or not installed"

echo ""
echo "[3] Ports listening (80, 443, 3002)"
ss -tlnp | grep -E ':80\s|:443\s|:3002\s' || true

echo ""
echo "[4] Faucet (local)"
curl -sf -o /dev/null http://127.0.0.1:3002/health 2>/dev/null && echo "  Faucet :3002 OK" || echo "  Faucet :3002 not responding"

echo ""
echo "[5] RPC via VPS1 (from VPS3)"
curl -sf -o /dev/null -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://217.216.109.5:8545 2>/dev/null && echo "  RPC VPS1 reachable" || echo "  RPC VPS1 not reachable"

echo ""
echo "[6] Disk"
df -h / /var 2>/dev/null | tail -n +2

echo ""
echo "=============================================="
