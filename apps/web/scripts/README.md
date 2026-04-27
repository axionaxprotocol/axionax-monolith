# Scripts

Monorepo-level scripts (deploy, VPS, validators, DB)

| Script                          | Use when                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------- |
| **deploy.sh**                   | Deploy full repo to VPS and run docker-compose (from root: `./scripts/deploy.sh`) |
| **vps-setup-from-git.sh**       | Run on VPS: clone/pull, build web, run Next.js standalone (initial setup)         |
| **vps-update-and-restart.sh**   | Run on VPS: pull **tracked branch** → `pnpm install --frozen-lockfile` → clean `.next` → rebuild blockchain-utils → sdk → web → copy standalone `static`/`public` → PM2 restart |
| **vps-update-from-windows.ps1** | From Windows: run the same update as above via SSH with **LF-only** script temp file (avoids CRLF breaking `bash -s`) — see [docs/DEPLOY.md](../docs/DEPLOY.md) |
| **cloud-agent-startup.sh**      | Automation/bootstrap: repo-root `pnpm install --frozen-lockfile` + `@axionax/blockchain-utils` `tsc` type-check   |
| **vps-standalone-check.sh**     | Verify process/port 3000 and Nginx on VPS are configured correctly                |
| **check-validators.sh**         | Check validator node status                                                       |
| **check-vps.bat**               | Check VPS (Windows)                                                               |
| **fix-nginx-rpc-endpoints.sh**  | Fix Nginx RPC endpoints                                                           |
| **fix-validators-on-server.sh** | Fix validators on server                                                          |
| **update-infra-v1.9.0.sh**      | Update infrastructure v1.9.0                                                      |
| **init-db.sql**                 | SQL for DB init                                                                   |
| **check_vps.py**                | Check VPS (Python)                                                                |
| **debug_build.py**              | Debug build                                                                       |
| **deploy.py**                   | Deploy (Python)                                                                   |
| **fix_firewall.py**             | Fix firewall                                                                      |
| **rebuild_vps.py**              | Rebuild VPS                                                                       |

**Deploy from Windows (recommended static upload):** From root run `.\deploy-vps.ps1` — see [docs/DEPLOY.md](../docs/DEPLOY.md)

**VPS “git on server” updates:** After initial [vps-setup-from-git.sh](vps-setup-from-git.sh), use [vps-update-and-restart.sh](vps-update-and-restart.sh). Environment (optional):

| Variable        | Default                 | Meaning                                      |
| --------------- | ----------------------- | -------------------------------------------- |
| `APP_DIR`       | `/opt/axionax-web-universe` | Repo root on the VPS                     |
| `DEPLOY_BRANCH` | `main`                  | Branch to `fetch` / `checkout` / `pull`      |
| `PORT`          | `3000`                  | Port for standalone `server.js`              |

Setup script [vps-setup-from-git.sh](vps-setup-from-git.sh) uses `BRANCH` (default `main`) for clone/pull and the same `APP_DIR` / `PORT` defaults.
