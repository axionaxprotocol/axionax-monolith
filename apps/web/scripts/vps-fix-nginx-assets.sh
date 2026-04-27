#!/bin/bash
# ==========================================================
#  VPS FIX: Nginx, SSL, Assets, and Domain
#  Usage: ssh root@217.216.109.5 'bash -s' < scripts/vps-fix-nginx-assets.sh
# ==========================================================

set -e

# --- ตั้งค่า Domain ที่นี่ ---
DOMAIN="axionax.org"
WWW_DOMAIN="www.axionax.org"
EMAIL="admin@axionax.org" # สำหรับ Certbot

APP_DIR="/opt/axionax-web-universe"
WEB_DIR="$APP_DIR/apps/web"
STANDALONE_DIR="$WEB_DIR/.next/standalone"

echo "================================================"
echo "  Axionax VPS Fixer: Nginx, SSL, Assets"
echo "================================================"

# 1. Copy Public Assets (Logo, Icons) ให้มั่นใจว่ามี
echo ""
echo "=== 1. Fixing Assets (Logo/Images) ==="
echo "Copying public folder to standalone..."
mkdir -p "$STANDALONE_DIR/apps/web/public"
cp -r "$WEB_DIR/public/"* "$STANDALONE_DIR/apps/web/public/" 2>/dev/null || true
# บางครั้ง Next.js standalone หา public ที่ root ด้วย
cp -r "$WEB_DIR/public" "$STANDALONE_DIR/" 2>/dev/null || true
echo "✓ Assets copied."

# 2. ตั้งค่า Nginx ใหม่ (Overhaul Config)
echo ""
echo "=== 2. Configuring Nginx for Proxy ==="

NGINX_CONF="/etc/nginx/sites-available/axionax"

# สร้าง Config ใหม่ที่ถูกต้อง 100% สำหรับ Next.js Server
cat > nginx_conf_tmp <<EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN 217.216.109.5;

    # Proxy ทุกอย่างไปที่ Next.js (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # เพิ่มขนาด Upload สำหรับ API
    client_max_body_size 10M;
}
EOF

# ย้ายไฟล์ไปที่ /etc/nginx
mv nginx_conf_tmp "$NGINX_CONF"

# ลบ default config ถ้ามี
rm -f /etc/nginx/sites-enabled/default

# Link file
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/axionax

# Test & Reload
echo "Testing Nginx config..."
nginx -t
systemctl reload nginx
echo "✓ Nginx configured (HTTP only for now)."

# 3. ติดตั้ง Certbot และขอ SSL (ถ้ายังไม่มี)
echo ""
echo "=== 3. Setting up SSL (HTTPS) ==="
if ! command -v certbot &>/dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# ตรวจสอบว่า Domain ชี้มาที่ IP นี้จริงไหม (ถ้าไม่จริง Certbot จะพัง)
echo "Attempting to obtain SSL certificate..."
# ใช้ --non-interactive --agree-tos --email เพื่อให้รันอัตโนมัติ
# ใช้ --redirect เพื่อบังคับ HTTPS
certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect || echo "⚠️ SSL Setup Warning: Certbot failed. Ensure DNS A Record for $DOMAIN points to 217.216.109.5"

echo ""
echo "=== 4. Restarting Application ==="
pm2 restart axionax-web || echo "PM2 restart failed (app might not be running)"

echo ""
echo "================================================"
echo "  ✅ FIX COMPLETE"
echo "  Check: https://$DOMAIN"
echo "  Check: http://217.216.109.5"
echo "================================================"
