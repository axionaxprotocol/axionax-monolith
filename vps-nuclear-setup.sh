#!/usr/bin/env bash
# Nuclear wipe + fresh setup for axionax.org on VPS
# Usage (run on VPS after uploading deploy.tar.gz to /tmp/):
#   bash vps-nuclear-setup.sh
set -e

echo "=== [1/7] Stop & remove all PM2 processes ==="
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 1

echo "=== [2/7] Wipe app directories ==="
rm -rf /var/www/axionax
rm -rf /root/axionax-docs
pkill -f "node server.js" 2>/dev/null || true
sleep 1

echo "=== [3/7] Backup & remove old nginx sites ==="
BACKUP_DIR="/var/nginx-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /etc/nginx/sites-available/* "$BACKUP_DIR/" 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/axionax
rm -f /etc/nginx/sites-enabled/docs.axionax.conf
rm -f /etc/nginx/sites-enabled/faucet.axionax.org
rm -f /etc/nginx/sites-enabled/rpc.axionax.org
rm -f /etc/nginx/sites-available/axionax
rm -f /etc/nginx/sites-available/docs.axionax.conf

echo "=== [4/7] Extract fresh app to /var/www/axionax ==="
mkdir -p /var/www/axionax
cd /var/www/axionax
tar -xzf /tmp/deploy.tar.gz
rm -f /tmp/deploy.tar.gz

# pnpm monorepo standalone: server.js lives at apps/web/server.js
if [ ! -f apps/web/server.js ]; then
  echo "ERROR: apps/web/server.js not found after extract"
  echo "-- layout dump (3 levels) --"
  find . -maxdepth 3 -type f -name '*.js' -o -name 'package.json' | head -30
  exit 1
fi
if [ ! -d apps/web/.next/static ]; then
  echo "WARN: apps/web/.next/static missing -- static assets will 404"
fi
echo "  - server.js: OK"
echo "  - static sample: $(ls apps/web/.next/static 2>/dev/null | head -3 | tr '\n' ' ')"

echo "=== [5/7] Create fresh nginx config for axionax.org ==="
cat > /etc/nginx/sites-available/axionax <<'NGINX'
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name axionax.org www.axionax.org;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS main site (Next.js proxy)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name axionax.org www.axionax.org;

    ssl_certificate /etc/letsencrypt/live/axionax.org-0002/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/axionax.org-0002/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/javascript application/xml+rss application/atom+xml image/svg+xml;

    # Next.js static assets (long cache)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Main Next.js proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/axionax /etc/nginx/sites-enabled/axionax

echo "=== [6/7] Test & reload nginx ==="
nginx -t
systemctl reload nginx

echo "=== [7/7] Start app with PM2 ==="
cd /var/www/axionax/apps/web
PORT=3000 HOSTNAME=127.0.0.1 NODE_ENV=production pm2 start server.js --name axionax-web --time --update-env
pm2 save --force
sleep 3
pm2 list

echo ""
echo "=== Verify ==="
curl -sI http://127.0.0.1:3000 | head -3 || echo "(local port 3000 not yet ready)"
echo ""
echo "FRESH_DEPLOY_OK. Backup of old nginx configs: $BACKUP_DIR"
