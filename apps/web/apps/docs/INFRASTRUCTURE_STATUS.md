# Axionax Protocol — Infrastructure Status Dashboard

Rolling status of all Axionax Protocol testnet services across the three-VPS topology used for the **Genesis Public Testnet**.

**Last Updated**: April 24, 2026  
**Synced core ref**: `axionax-core-universe@28f42cf`  
**Topology**: 2 validators + 1 infra hub (3 VPS)

---

## 🌐 Three-VPS Topology

| VPS       | IP              | Region     | Role                                  | Key services                                                    |
| --------- | --------------- | ---------- | ------------------------------------- | --------------------------------------------------------------- |
| **VPS 1** | 217.76.61.116   | Europe     | Validator #1 + RPC                    | `axionax-node` validator, RPC 8545, P2P 30303 - **OFFLINE**      |
| **VPS 2** | 46.250.244.4    | Australia  | Validator #2 + RPC                    | `axionax-node` validator, RPC 8545, P2P 30303 - **ACTIVE**       |
| **VPS 3** | 217.216.109.5   | Infra hub  | Reverse-proxy + Faucet (no chain node)| Nginx (SSL), Faucet (port 3002), Postgres, Redis, optional Explorer |

> Source: [core `docs/GENESIS_PUBLIC_TESTNET_PLAN.md`](https://github.com/axionaxprotocol/axionax-core-universe/blob/main/docs/GENESIS_PUBLIC_TESTNET_PLAN.md) (chain_id 86137, genesis SHA-256 `0xed1bdac7…c762b55`).

---

## 📊 Service Status Matrix

### Validator Layer (VPS 1 + VPS 2)

| Service                | Port      | Host            | Status         | Description                                             |
| ---------------------- | --------- | --------------- | -------------- | ------------------------------------------------------- |
| **Validator EU**       | 8545/30303| 217.76.61.116   | ❌ Offline     | `axionax-node` (RPC + P2P) - currently offline          |
| **Validator AU**       | 8545/30303| 46.250.244.4    | ✅ Running     | `axionax-node` (RPC + P2P) - only active validator      |

Health checks: `eth_chainId` must return `0x15079`; `eth_blockNumber` must advance on AU validator. P2P peer count = 0 (EU offline).

### Infrastructure Layer (VPS 3)

| Service        | Port      | Version      | Purpose                                                       |
| -------------- | --------- | ------------ | ------------------------------------------------------------- |
| **Nginx**      | 80/443    | alpine       | Reverse-proxy `rpc.axionax.org` → VPS 2 (AU only), `faucet.axionax.org` → Faucet |
| **Faucet**     | 3002      | v1.9.0       | `docker-compose.vps3-faucet.yml` with `FAUCET_PRIVATE_KEY`    |
| **PostgreSQL** | 5432      | 16-alpine    | Faucet / optional Explorer data                               |
| **Redis**      | 6379      | 7-alpine     | Rate-limit cache for Faucet and indexers                      |

### Monitoring Stack

| Service        | Port | Version | Notes                                         |
| -------------- | ---- | ------- | --------------------------------------------- |
| **Grafana**    | 3030 | 12.2.1  | Dashboards for validator, faucet, nginx       |
| **Prometheus** | 9090 | latest  | Scrapes validator RPC + nginx + faucet         |

### Frontend

| Service           | Host        | Framework  | Public access                                 |
| ----------------- | ----------- | ---------- | --------------------------------------------- |
| **Web Interface** | axionax.org | Next.js 14 | Hosted from this repo (`apps/web`)            |

---

## 📝 VPS spec (per [`GENESIS_PUBLIC_TESTNET_PLAN.md`](https://github.com/axionaxprotocol/axionax-core-universe/blob/main/docs/GENESIS_PUBLIC_TESTNET_PLAN.md))

Each VPS is provisioned with **4 vCPU, 8 GB RAM, 75–150 GB SSD, 200 Mbit/s**.

| VPS       | CPU            | RAM (target)                 | Storage           | Notes                                        |
| --------- | -------------- | ---------------------------- | ----------------- | -------------------------------------------- |
| VPS 1 / 2 | 4 vCPU (node)  | ≈6–8 GB (node 3–4 GB + OS)     | 75 GB testnet-OK  | At NODE_SPECS minimum; monitor disk growth   |
| VPS 3     | Nginx + Faucet | ≈6–8 GB (Faucet, Postgres, Redis) | 75 GB         | Skip Explorer if RAM is tight at launch      |

File-descriptor hardening (`nofile=65536`) is baked into `ops/deploy/docker-compose.vps.yml`; use `ops/deploy/scripts/fix-validator-ulimit.sh` to retrofit running containers (fixes `axum::serve: accept error: Too many open files`).

---

## 🔍 Detailed Service Information

### RPC — real `axionax-node`

The public RPC on `rpc.axionax.org` is a thin Nginx layer on VPS 3 that proxies to the live `axionax-node` validators on VPS 1 and VPS 2. There is **no mock RPC** in the Genesis plan.

**Chain parameters:**

- Chain ID: `86137` (`0x15079`)
- Native token: **AXX** (18 decimals)
- Block time: **2 s** (from `core/tools/genesis.json`)
- Genesis SHA-256: `0xed1bdac7c278e5b4f58a1eceb7594a4238e39bb63e1018e38ec18a555c762b55`

**Sample request:**

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://rpc.axionax.org
# -> {"jsonrpc":"2.0","id":1,"result":"0x15079"}
```

Core-side methods supported are defined in the Rust RPC crate (`core/rpc`); the web SDK in `packages/sdk` speaks the standard Ethereum JSON-RPC 2.0 surface (`eth_*`, `net_*`, `web3_*`).

### Faucet (VPS 3)

- Compose file: `ops/deploy/docker-compose.vps3-faucet.yml` (core)
- Env example: `ops/deploy/env.vps3-faucet.example` (core)
- Requires `FAUCET_PRIVATE_KEY` with an allocation set in `core/tools/genesis.json`
- Public URL: `https://faucet.axionax.org`

### Monitoring

- **Grafana** (port 3030) — v12.2.1, proxied via Nginx on VPS 3
- **Prometheus** (port 9090) — scrapes both validators + VPS 3 services (15 s interval)

---

## 🚨 Known Operational Playbooks

### `Too many open files (os error 24)` on a validator

Containers deployed before the ulimit patch can hit axum's `accept error` at steady load. Fix on the VPS hosting the validator:

```bash
# From your workstation
scp ops/deploy/scripts/fix-validator-ulimit.sh root@217.76.61.116:/tmp/
ssh root@217.76.61.116 'bash /tmp/fix-validator-ulimit.sh axionax-validator-eu'
```

The script recreates the container with `--ulimit nofile=65536:65536`. New deploys from compose already include this.

### VPS 3 Faucet doesn't start

- Check `FAUCET_PRIVATE_KEY` is set and matches an allocation in `core/tools/genesis.json`.
- Verify `RPC_URL` points at a live validator (`http://217.76.61.116:8545`).
- Use `ops/deploy/scripts/check-vps3.sh` (from core) to inspect container state:

```powershell
scp ops\deploy\scripts\check-vps3.sh root@217.216.109.5:/tmp/
ssh root@217.216.109.5 'sed -i "s/\r$//" /tmp/check-vps3.sh; bash /tmp/check-vps3.sh'
```

### Validators not syncing

- Confirm P2P port 30303 is open on both VPS 1 and VPS 2.
- Check `docker logs <container> --tail 50` on each VPS.
- Ensure both validators have the exact same `genesis.json` (`sha256sum` must match `0xed1bdac7…c762b55`).
- Coordinated start order: EU first, then AU (bootstrap against EU enode).

---

## 🛠️ Genesis Launch Runbook

### Completed ✅

- [x] Three-VPS allocation (EU / AU validators + VPS 3 infra hub)
- [x] Genesis produced and hashed (`0xed1bdac7…c762b55`, chain_id 86137)
- [x] VPS 3 Faucet compose + nginx example shipped from core
- [x] File-descriptor (`nofile=65536`) hardening in compose
- [x] Web-side constants aligned (`packages/blockchain-utils/src/constants.ts`)

### In Progress 🔄

- [ ] Distribute `genesis.json` to VPS 1 & VPS 2 (`distribute-genesis.ps1`)
- [ ] Coordinated validator start (EU → AU) + confirm P2P peer count
- [ ] DNS cutover for `rpc.axionax.org` / `faucet.axionax.org` → VPS 3
- [ ] SSL/TLS via Certbot on VPS 3
- [ ] Web frontend: set `NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org`

### Planned 📅

- [ ] Optional Explorer on VPS 3 (post-launch if RAM permits)
- [ ] Automated health-check alerts (Alertmanager + Discord/email)
- [ ] Public Genesis Testnet announcement
- [ ] Validator recruitment past the initial EU/AU pair

---

## 📞 Operational Contacts

**SSH targets** (solo maintainer):

- VPS 1 (EU validator): `ssh root@217.76.61.116`
- VPS 2 (AU validator): `ssh root@46.250.244.4`
- VPS 3 (infra hub):    `ssh root@217.216.109.5`

**Quick commands** (on any VPS):

```bash
# Check containers
docker ps -a --format '{{.Names}}\t{{.Status}}'

# Tail logs
docker logs <container> --tail 50 -f

# Restart a service
docker restart <container>
```

---

## 📚 Related Documentation

- **[HEALTH_CHECKS.md](https://github.com/axionaxprotocol/axionax-docs/blob/main/HEALTH_CHECKS.md)** - Health check guide
- **[MONITORING.md](https://github.com/axionaxprotocol/axionax-docs/blob/main/MONITORING.md)** - Monitoring setup
- **[QUICK_START.md](https://github.com/axionaxprotocol/axionax-docs/blob/main/QUICK_START.md)** - Documentation quick start
- **[axionax-deploy](https://github.com/axionaxprotocol/axionax-deploy)** - Deployment scripts

---

## 🎯 Next Milestones

### Short term (this week)

1. Finish genesis distribution and coordinated validator start
2. DNS cutover for `rpc.axionax.org` / `faucet.axionax.org`
3. Issue TLS certs on VPS 3 (Certbot) + switch web to `https://rpc.axionax.org`
4. Run `ops/deploy/scripts/verify-launch-ready.sh`

### Medium term

1. Optional Explorer on VPS 3 (post-launch)
2. Automated alerting (Alertmanager → Discord/email)
3. Load / stress test of RPC and Faucet

### Long term (toward Mainnet)

1. Security audit (smart contracts + infrastructure)
2. Multi-region RPC load balancing
3. Automated backup & disaster-recovery drill
4. Validator recruitment beyond EU/AU

---

<div align="center">

## 🚀 Testnet Launch Progress

**Genesis Public Testnet** — Pre-launch › **Distribute genesis** › **Coordinated start** › **DNS + TLS** › **Go live**

**Phase**: The Incarnation (Q1 2026)

</div>

---

**Last Status Check**: April 24, 2026  
**Synced core ref**: `axionax-core-universe@28f42cf`  
**Manual verification**: `curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://217.76.61.116:8545`
