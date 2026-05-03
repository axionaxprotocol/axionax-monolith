# Deploy to Server

Three main options: **CI → VPS** (auto on push), **GitHub Pages** (static), and **VPS manual** (SSH upload)

---

## 0. CI/CD → VPS (recommended with GitHub Actions)

- **Workflow:** `.github/workflows/ci-cd.yml`
- **Trigger:** Push to `develop` = deploy staging; push to `main` = deploy production
- **Steps:** Build web app as standalone → rsync to VPS via SSH → (if configured) run restart command on server
- **Setup:** Repo → Settings → Secrets and variables → Actions → select environment **staging** / **production** and add secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `REMOTE_PATH`, and optionally `DEPLOY_RESTART_CMD` (e.g. `pm2 restart axionax-web`)
- Server and SSH setup details: [apps/web/docs/DEPLOYMENT.md](../apps/web/docs/DEPLOYMENT.md) section "CI/CD Deploy (GitHub Actions)"

---

## 1. GitHub Pages (auto on push to main)

- **Workflow:** `.github/workflows/deploy-pages.yml`
- **Trigger:** Push to branch `main` (when changes in `apps/web/**` or `packages/**`)
- **Steps:** Build `@axionax/web` → upload `apps/web/out` → Deploy to GitHub Pages

**Repo setup:**

1. Open **Settings → Pages**
2. **Source:** Select **GitHub Actions**
3. After push to `main` workflow runs and deploys
4. URL at **Environments → github-pages** or `https://<org>.github.io/<repo>/`

**Custom domain (e.g. axionax.org):** Add in Settings → Pages → Custom domain and configure CNAME per [docs/DNS_SETUP.md](../apps/web/docs/DNS_SETUP.md)

---

## 2. VPS (SSH to server manually)

Use when you have a VPS (Linux/Windows) and want to deploy there.

### Option: Pull + Build on server (easy for fresh start)

No file upload from your machine — on VPS just clone repo and build there:

1. SSH into VPS, clone repo, install dependencies, and build:

   ```bash
   export APP_DIR=/opt/axionax-web-universe
   git clone https://github.com/axionaxprotocol/axionax-web-universe.git $APP_DIR
   cd $APP_DIR
   pnpm install --frozen-lockfile
   pnpm --filter @axionax/blockchain-utils build
   pnpm --filter @axionax/sdk build
   pnpm --filter @axionax/web build
   ```

2. For updates: SSH into VPS and run [scripts/vps-update-and-restart.sh](../scripts/vps-update-and-restart.sh) (or `git pull && pnpm install && pnpm --filter @axionax/web build` then restart process)

3. Nginx must proxy to `http://127.0.0.1:3000` (see [apps/web/nginx/conf.d/axionax-standalone.conf.example](../apps/web/nginx/conf.d/axionax-standalone.conf.example))

Default script values: app folder `/opt/axionax-web-universe`, port 3000

#### VPS standalone: branch, lockfile, and Windows

- **Tracked branch:** `vps-update-and-restart.sh` uses `DEPLOY_BRANCH` (default `main`). It `git fetch` / checks out that branch / `git pull origin "$DEPLOY_BRANCH"`, then runs `pnpm install --frozen-lockfile`. Deploy a different branch, for example:

  ```bash
  ssh user@VPS 'DEPLOY_BRANCH=cursor/my-feature bash -s' < scripts/vps-update-and-restart.sh
  ```

- **Stale Next.js output:** The script removes `apps/web/.next` before rebuilding and refreshes standalone `static` and `public` copies so old chunks and assets are not left behind.

- **Windows:** Piping a `.sh` file with CRLF line endings into `ssh … bash -s` breaks on Linux. From PowerShell use [scripts/vps-update-from-windows.ps1](../scripts/vps-update-from-windows.ps1) (writes an LF-only temp file and uses `ssh` stdin redirection). Example: `.\scripts\vps-update-from-windows.ps1 -HostName root@YOUR_IP`

- **Initial clone branch:** Default `main`. Set `DEPLOY_BRANCH` env when running `vps-update-and-restart.sh` to deploy a different branch.

### Run from root (recommended — build + upload static)

From repo root:

```powershell
# Windows PowerShell
.\deploy-vps.ps1
```

- **What it does:** `pnpm install` → build `@axionax/web` → upload `apps/web/out` to VPS via SCP
- **Defaults:** VPS_IP=`YOUR_VPS_IP`, VPS_USER=`root`, REMOTE_PATH=`/var/www/axionax`
- **Override:** Set env or pass params: `$env:VPS_IP="1.2.3.4"; .\deploy-vps.ps1` or `.\deploy-vps.ps1 -VPS_IP 1.2.3.4 -VPS_USER ubuntu -REMOTE_PATH /var/www/html`
- **Skip build:** `.\deploy-vps.ps1 -SkipBuild` (when already built)

**Requirements:** Must be able to SSH to VPS (e.g. `ssh root@YOUR_VPS_IP`) and server must **run Node** (`node server.js`) and **Nginx must proxy to port 3000** (not serve static files from folder)

**If site still shows old content after deploy:**

1. **Node process must be running** — after deploy restart to load new code
   - Without PM2: `ssh root@YOUR_VPS_IP "cd /var/www/axionax && pkill -f 'node server.js' 2>/dev/null; sleep 1; PORT=3000 nohup node server.js > server.log 2>&1 &"`
   - Or deploy with restart: `$env:RESTART_CMD="pkill -f 'node server.js' 2>/dev/null; sleep 1; PORT=3000 nohup node server.js > server.log 2>&1 &"; .\deploy-vps.ps1 -SkipBuild`

2. **Nginx must proxy to 127.0.0.1:3000** — if Nginx uses `root /var/www/axionax` and `index index.html` you get old static only
   - Use `proxy_pass http://127.0.0.1:3000` for location `/` and `/api/`
   - Example: [apps/web/nginx/conf.d/axionax-standalone.conf.example](../apps/web/nginx/conf.d/axionax-standalone.conf.example)

3. **Check server:** SSH into VPS and verify `pm2 list` shows the process running, and `curl -I http://127.0.0.1:3000` returns HTTP 200

### Other scripts (if using git + docker flow on server)

| Script                               | Run from          | Notes                                                                   |
| ------------------------------------ | ----------------- | ----------------------------------------------------------------------- |
| `deploy-vps.ps1` (root)              | Root folder       | **Recommended** — build locally + upload static to VPS                   |
| `apps/web/scripts/deploy-to-vps.ps1` | `apps/web` folder | Windows, build + push GitHub then server does git pull + docker-compose |

### VPS requirements

- **SSH:** Access via `ssh user@VPS_IP` (use SSH key for passwordless)
- **Server paths:** Some repo scripts assume clone/pull at `/opt/axionax-web` or `/var/www/axionax-marketplace` — ensure paths match your server
- **Docker:** If using Docker, server needs Docker + Docker Compose and `docker-compose.yml` for web/API

### Change IP / path in scripts

- **PowerShell (VPS):** Edit `apps/web/scripts/deploy-to-vps.ps1`
  - `$VPS_IP`
  - `$SSH_USER`
  - `$DEPLOY_PATH`
- **PowerShell (root):** Edit `deploy-vps.ps1`
  - `$VPS_IP`
  - `$VPS_USER`
  - `$REMOTE_PATH`

---

## Summary

- **Can deploy to server?**
  - **GitHub Pages:** Yes — push to `main` then enable Pages from **GitHub Actions** in Settings → Pages
  - **VPS:** Yes if you have server + SSH and update IP/path in scripts to match your server

Full VPS details (Docker, Nginx, DNS): [apps/web/docs/DEPLOYMENT.md](../apps/web/docs/DEPLOYMENT.md)
