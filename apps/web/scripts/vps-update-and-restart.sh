#!/bin/bash
# ==========================================================
#  อัปเดตเว็บบน VPS: pull → build packages → build web → restart PM2
#  Usage (Linux/macOS/Git Bash): ssh root@IP 'bash -s' < scripts/vps-update-and-restart.sh
#  Usage (Windows PowerShell):   .\scripts\vps-update-from-windows.ps1
#  (ใช้หลังตั้งครั้งแรกด้วย vps-setup-from-git.sh แล้ว)
# ==========================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/axionax-web-universe}"
WEB_DIR="$APP_DIR/apps/web"
STANDALONE_DIR="$WEB_DIR/.next/standalone"
PORT="${PORT:-3000}"
PM2_NAME="axionax-web"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

echo "=== 1. Pull latest code ==="
cd "$APP_DIR"
git fetch origin "$DEPLOY_BRANCH"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]]; then
  echo "  Current branch: $CURRENT_BRANCH → switching to $DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH" || git checkout -b "$DEPLOY_BRANCH" "origin/$DEPLOY_BRANCH"
fi

git pull origin "$DEPLOY_BRANCH"

echo ""
echo "=== 2. Install dependencies ==="
pnpm install --frozen-lockfile

echo ""
echo "=== 3. Clean previous web build artifacts ==="
rm -rf "$WEB_DIR/.next"

echo ""
echo "=== 4. Build packages (blockchain-utils → sdk → web) ==="
pnpm --filter @axionax/blockchain-utils build
pnpm --filter @axionax/sdk build
pnpm --filter @axionax/web build

echo ""
echo "=== 5. Prepare standalone ==="
# outputFileTracingRoot = monorepo root → static ต้องอยู่ที่ standalone/apps/web/.next/static
mkdir -p "$STANDALONE_DIR/apps/web/.next"
mkdir -p "$STANDALONE_DIR/apps/web/public"
rm -rf "$STANDALONE_DIR/apps/web/.next/static" "$STANDALONE_DIR/apps/web/public/"*
cp -r "$WEB_DIR/.next/static" "$STANDALONE_DIR/apps/web/.next/"
# Copy public assets (embed/pitch-deck.html, favicon, etc.) for static file serving
cp -r "$WEB_DIR/public/"* "$STANDALONE_DIR/apps/web/public/" 2>/dev/null || true
cp -r "$WEB_DIR/public" "$STANDALONE_DIR/" 2>/dev/null || true

echo ""
echo "=== 6. Restart PM2 ==="
if command -v pm2 &>/dev/null; then
  # ถ้า process มีอยู่แล้ว → restart; ถ้าไม่มี → start ใหม่
  if pm2 describe "$PM2_NAME" &>/dev/null; then
    pm2 restart "$PM2_NAME"
    echo "  Restarted $PM2_NAME"
  else
    cd "$STANDALONE_DIR"
    PORT=$PORT pm2 start apps/web/server.js --name "$PM2_NAME"
    echo "  Started $PM2_NAME"
  fi
  pm2 save
else
  echo "  PM2 not found — starting with nohup"
  pkill -f "node.*server.js" 2>/dev/null || true
  sleep 2
  cd "$STANDALONE_DIR"
  PORT=$PORT nohup node apps/web/server.js >> "$STANDALONE_DIR/server.log" 2>&1 &
fi

echo ""
echo "=== 7. Verify ==="
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:$PORT" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "  ✓ Web is running at http://127.0.0.1:$PORT (HTTP $HTTP_CODE)"
else
  echo "  ✗ HTTP $HTTP_CODE — check: pm2 logs $PM2_NAME --err --lines 20"
fi

echo ""
echo "Done! Updated and restarted on port $PORT"
echo "Branch: $DEPLOY_BRANCH"
