#!/bin/bash
# Update Infrastructure Node (217.216.109.5) to v1.9.0
# Run this ON the infrastructure server
set -e

echo "🚀 Updating Axionax Infrastructure to v1.9.0"
echo "=============================================="
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Variables
APP_DIR="/var/www/axionax-web-universe"
BACKUP_DIR="/var/backups/axionax"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Navigate to app directory
cd $APP_DIR || { echo "Directory $APP_DIR not found!"; exit 1; }

# 1. Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" --exclude='node_modules' --exclude='.git' . 2>/dev/null || true
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"

# 2. Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git fetch origin
git checkout main
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"

# 3. Install dependencies
echo -e "${YELLOW}📚 Installing dependencies...${NC}"
pnpm install --frozen-lockfile
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 4. Build applications
echo -e "${YELLOW}🔨 Building applications...${NC}"
pnpm build
echo -e "${GREEN}✓ Build complete${NC}"

# 5. Restart services
echo -e "${YELLOW}🔄 Restarting services...${NC}"
docker-compose down --timeout 30
docker-compose up -d
echo -e "${GREEN}✓ Services restarted${NC}"

# 6. Reload Nginx
echo -e "${YELLOW}🌐 Reloading Nginx...${NC}"
nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"

# 7. Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 30

# 8. Health check
echo -e "${YELLOW}🧪 Running health checks...${NC}"

# Check web
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --connect-timeout 5 || echo "000")
if [ "$WEB_STATUS" = "200" ]; then
    echo -e "   Web App: ${GREEN}✓ OK${NC}"
else
    echo -e "   Web App: ${RED}✗ FAILED (HTTP $WEB_STATUS)${NC}"
fi

# Check homepage
HOMEPAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://axionax.org --connect-timeout 5 || echo "000")
if [ "$HOMEPAGE_STATUS" = "200" ]; then
    echo -e "   Homepage: ${GREEN}✓ OK${NC}"
else
    echo -e "   Homepage: ${RED}✗ FAILED (HTTP $HOMEPAGE_STATUS)${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Update to v1.9.0 complete!${NC}"
echo ""
echo "📌 Post-update tasks:"
echo "   1. Check https://axionax.org"
echo "   2. Verify version shows v1.9.0 in Validators page"
echo "   3. Check /api/rpc/eu and /api/rpc/au endpoints"
echo ""
