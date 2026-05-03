# Website Hosting Guide

Guide for setting up axionax web hosting from scratch — two options:

| Option                           | Best for                 | Summary                                                           |
| -------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| **1. Build on server**           | Fresh start, empty VPS   | Clone repo on VPS → build → run with PM2 → configure Nginx        |
| **2. Build locally then upload** | Frequent updates from PC | Run `deploy-vps.ps1` from Windows → upload files to VPS → restart |

---

## Option 1: Build on Server (recommended for fresh setup)

### Step 1 — Prepare VPS

SSH into your VPS and run:

```bash
# Update system (Ubuntu/Debian)
apt update && apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# pnpm + git
npm install -g pnpm
apt-get install -y git
```

Verify: `node -v` (v20.x), `pnpm -v`, `git --version`

---

### Step 2 — Clone, Build, Prepare Standalone

```bash
# Clone (or use single script below)
export APP_DIR=/opt/axionax-web-universe
git clone --depth 1 -b main https://github.com/axionaxprotocol/axionax-web-universe.git $APP_DIR
cd $APP_DIR

# Install + Build (build packages first — web uses @axionax/sdk, @axionax/blockchain-utils)
pnpm install --frozen-lockfile
pnpm --filter @axionax/blockchain-utils build
pnpm --filter @axionax/sdk build
pnpm --filter @axionax/web build

# Prepare standalone
# ⚠️ Important: outputFileTracingRoot points to monorepo root
# server.js is at standalone/apps/web/server.js (not standalone/server.js)
# static + public must be copied to standalone/apps/web/.next/static
mkdir -p apps/web/.next/standalone/apps/web/.next
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/
cp -r apps/web/public apps/web/.next/standalone/apps/web/ 2>/dev/null || true
```

**Shortcut — run single script:** (from your machine, send to run on server)

Build and prepare manually as shown above, then proceed to PM2 setup below.

---

### Step 3 — Run app with PM2 (persists after restart)

On server:

```bash
# Install PM2
npm install -g pm2

# Run app
# ⚠️ Important: must use path apps/web/server.js (outputFileTracingRoot = monorepo root)
cd /opt/axionax-web-universe/apps/web/.next/standalone
PORT=3000 pm2 start apps/web/server.js --name axionax-web

# Save + auto-start after reboot
pm2 save
pm2 startup
# Run the command PM2 suggests (usually env PATH=... pm2 startup ...)
```

Verify: `pm2 list` and `ss -tlnp | grep 3000`

---

### Step 4 — Configure Nginx (proxy to port 3000)

Web is a Node app (Next.js) — **must proxy to 127.0.0.1:3000** not `root` to static folder

1. Create config (edit `server_name` and SSL path as needed):

```bash
sudo nano /etc/nginx/sites-available/axionax-web
```

2. Paste content below (HTTP first — add SSL later):

```nginx
# Upstream: app runs on port 3000
upstream web_frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name axionax.org www.axionax.org;   # Change to your domain or IP

    location /api/ {
        proxy_pass http://web_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://web_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/axionax-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 5 — SSL (Optional)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d axionax.org -d www.axionax.org
```

Certbot will auto-update Nginx for HTTPS.

---

## Option 2: Build locally then upload

From **Windows** (repo root):

```powershell
.\deploy-vps.ps1
```

- Build app as standalone → tar → upload to VPS → extract to `/var/www/axionax`
- Server must **run Node** (e.g. PM2) and **Nginx must proxy to 3000**

More details (defaults, restart, troubleshooting): [DEPLOY.md](DEPLOY.md)

---

## Post-setup checklist

- [ ] `ss -tlnp | grep 3000` — process running on port 3000
- [ ] `curl -s http://127.0.0.1:3000 | head -5` — returns HTML
- [ ] Open site via domain or IP (and HTTPS if SSL configured)
- [ ] `pm2 restart axionax-web` — restart works and site recovers

---

## VPS health check

Run manual checks below to verify the deployment.

### Manual checks

```bash
# PM2 status
pm2 list
pm2 logs axionax-web --lines 20

# Port 3000
ss -tlnp | grep 3000

# HTTP response
curl -I http://127.0.0.1:3000

# Nginx
nginx -t
systemctl status nginx

# Disk + Memory
df -h /
free -m
```

---

## Troubleshooting

| Symptom                        | Check                              | Fix                                                                                                        |
| ------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| PM2 stopped / crash loop       | `pm2 logs axionax-web --err`       | Fix error → `pm2 restart axionax-web`                                                                      |
| `Cannot find module server.js` | Wrong path (outputFileTracingRoot) | Must run `apps/web/server.js` not `server.js` — see Step 3                                                 |
| Site not loading               | Process on port 3000?              | `cd .../standalone && PORT=3000 pm2 start apps/web/server.js --name axionax-web`                           |
| Works via IP but not domain    | Nginx pointing to 127.0.0.1:3000?  | Verify `proxy_pass http://web_frontend;` and upstream                                                      |
| CSS/JS missing (blank page)    | Static not copied                  | `mkdir -p .../standalone/apps/web/.next && cp -r .../apps/web/.next/static .../standalone/apps/web/.next/` |
| Old content after deploy       | Old process still running          | `pm2 restart axionax-web` or kill and start fresh                                                          |

---

## Update site (after initial setup)

Run from your machine:

```bash
ssh root@YOUR_VPS_IP 'bash -s' < scripts/vps-update-and-restart.sh
```

Script: `git pull` → build packages → build web → copy static → restart PM2 → verify HTTP 200
