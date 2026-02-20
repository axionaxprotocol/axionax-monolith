# Both VPS (Validator) — What to Update

Checklist for updating both **Validator VPS**: **217.76.61.116** (EU) and **46.250.244.4** (AU)

---

## Run the Update Script on Both VPS (Recommended)

From a machine with SSH access to both, run on **each VPS**:

```bash
# Send the script to the VPS and run it (from the repo root on your machine)
scp ops/deploy/scripts/update-validator-vps.sh root@217.76.61.116:/tmp/
scp ops/deploy/scripts/update-validator-vps.sh root@46.250.244.4:/tmp/

# Run on VPS 1 (EU)
ssh root@217.76.61.116 'bash /tmp/update-validator-vps.sh'

# Run on VPS 2 (AU)
ssh root@46.250.244.4 'bash /tmp/update-validator-vps.sh'
```

Or if the VPS already has a cloned repo (e.g. `/opt/axionax-core-universe` or `/opt/axionax-deploy`):

```bash
cd /opt/axionax-core-universe/ops/deploy   # or the path containing scripts/
sudo bash scripts/update-validator-vps.sh
```

**Script options:** `--skip-apt` (skip apt upgrade), `--skip-pull` (skip docker pull), `--dry-run` (show what would be done without actually running)

The script will: update the OS (unless --skip-apt is used), check/fix chain_id to 86137, pull the latest image, restart rpc-node, check RPC

**Windows (PowerShell):** Run the update on both VPS from a single machine:
```powershell
cd ops\deploy
.\scripts\run-update-both-vps.ps1
# or .\scripts\run-update-both-vps.ps1 -User root -SkipApt
```

---

## 1. Software / Image

| Action | Command/Notes |
|--------|---------------|
| **Pull latest image** | If running with Docker: `docker pull ghcr.io/axionaxprotocol/axionax-core:latest` then `docker compose -f docker-compose.vps.yml up -d rpc-node` (or restart rpc-node) |
| **Update OS** | `sudo apt update && sudo apt upgrade -y` (choose a time with low traffic) |

---

## 2. Config That Must Match the Network

| Item | Value Used in Repo (Worker / Client) | On VPS |
|------|--------------------------------------|--------|
| **Chain ID** | **86137** (testnet) | In the repo this is already set to 86137 — on the VPS, if still set to 888, run `scripts/update-validator-vps.sh` to fix it, or copy the new `configs/rpc-config.toml` and restart the node |
| **RPC Port** | 8545 (HTTP), 8546 (WS) | Open for client access |
| **P2P** | 30303 | Open between the 2 validators if syncing |

---

## 3. Env / Secrets (If Running the Full Stack)

If the VPS runs more than just RPC but also Explorer and Faucet (e.g. using `docker-compose.vps.yml`):

- **.env** on the VPS must contain: `DB_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_PASSWORD`, `FAUCET_PRIVATE_KEY` (and `VPS_IP` if used in scripts)
- Do not commit .env; copy from `.env.example` and fill in real values

---

## 4. Firewall

| Port | Service | Action |
|------|---------|--------|
| 8545 | RPC HTTP | Open from internet (for Worker / Web access) |
| 8546 | RPC WebSocket | Open if clients use WS |
| 30303 | P2P | Open between the 2 VPS (and later if more nodes are added) |
| 22 | SSH | Open only for maintenance IPs (recommended) |

---

## 5. Health Check After Update

On each VPS (or from another machine):

```bash
# RPC
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://217.76.61.116:8545
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://46.250.244.4:8545
```

If running Docker Compose on the VPS:

```bash
cd /path/to/ops/deploy
./scripts/manage-services.sh status all
./scripts/manage-services.sh restart rpc-node   # if image or config was updated
```

---

## 6. Explorer / Faucet (If Present on This VPS)

From [TESTNET_DEPLOYMENT_PLAN](../tools/devtools/docs/TESTNET_DEPLOYMENT_PLAN.md): if Explorer (3001) or Faucet (3002) is not running:

- **Explorer:** Check `docker logs axionax-explorer-backend`; if the image is missing/not working, use a stub or build from `tools/devtools/Dockerfile.explorer`
- **Faucet:** Set `FAUCET_PRIVATE_KEY` in .env; or build from `ops/deploy/Dockerfile.faucet` (context = core/)

---

## Quick Summary

| Step | Action |
|------|--------|
| 1 | Update OS and pull the latest Docker image (if applicable) |
| 2 | Verify chain_id in config is 86137 (must match Worker / docs) |
| 3 | Check .env and firewall (8545, 8546, 30303) |
| 4 | After updating: restart changed services and test RPC with curl |

**In the repo:** No need to change the 2 validator IPs — 217.76.61.116 and 46.250.244.4 are already used in all configs and docs
