# Genesis Public Testnet Plan — Within This Month

Use three VPS (spec: 4 vCPU, 8 GB RAM, 75 GB NVMe / 150 GB SSD, 200 Mbit/s) to complete the loop: Validators + RPC + Faucet + (optional Explorer) + Frontend all pointing at the same chain.

---

## เริ่มเลย — สิ่งที่รันได้ทันที

| # | ขั้นตอน | คำสั่ง / ไฟล์ |
|---|--------|----------------|
| 1 | **Genesis พร้อมแล้ว** | `core/tools/genesis.json` (SHA-256: `0xed1bdac7...`), Chain ID 86137 |
| 2 | **ส่ง genesis ไปทั้งสอง VPS** | จาก repo root: `.\ops\deploy\scripts\distribute-genesis.ps1` (หรือดู [GENESIS_LAUNCH_DAY_CHECKLIST.md](GENESIS_LAUNCH_DAY_CHECKLIST.md) §2) |
| 3 | **อัปเดต/เริ่ม node บน VPS1 & VPS2** | `.\ops\deploy\scripts\run-update-both-vps.ps1` (ต้องมี SSH ไป root@217.76.61.116, root@46.250.244.4) |
| 4 | **ตรวจ RPC** | `curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://217.76.61.116:8545` → คาดหวัง `"result":"0x15079"` |
| 5 | **หลัง chain รัน** | ตั้ง VPS3 (Nginx, Faucet), DNS, Frontend ตาม Week 2–4 ด้านล่าง |

**ก่อนรัน:** เปิด firewall VPS1 & VPS2 (22, 8545, 30303); แต่ละ VPS ต้องมี validator key ตรงกับ genesis และ (ถ้าใช้ Docker) มี repo หรือ config ที่อ้างใน [VPS_VALIDATOR_UPDATE.md](../ops/deploy/VPS_VALIDATOR_UPDATE.md)

---

## 1. Allocation of Three VPS

| VPS | IP | Role | Services | Notes |
|-----|-----|--------|----------|-------|
| **VPS 1 (EU)** | **217.76.61.116** | Validator #1 + RPC | axionax-node (validator + RPC 8545, P2P 30303) | Genesis validator; open 8545, 30303 |
| **VPS 2 (AU)** | **46.250.244.4** | Validator #2 + RPC | axionax-node (validator + RPC 8545, P2P 30303) | Genesis validator; sync P2P with VPS1 |
| **VPS 3 (Infra)** | **217.216.109.5** | RPC proxy + Faucet + (optional Explorer) | Nginx, Faucet, Postgres, Redis; optional Explorer | Does not run node — RPC points to VPS1/VPS2 |

### Rationale

- **At least two validators** are required for consensus (repo already uses 217.76 / 46.250 in genesis); 4c/8GB/75GB matches NODE_SPECS minimum for testnet validators.
- **RPC on validators** — Reduces complexity; no extra sync node on VPS3; users and the web call `http://217.76.61.116:8545` or `http://46.250.244.4:8545` directly.
- **VPS3 as traffic hub** — Nginx reverse proxy (e.g. rpc.axionax.org → VPS1 or round-robin), run Faucet (RPC_URL pointing to VPS1), optionally Explorer if RAM allows; no chain node so RAM/CPU are saved.

### Approximate resources per VPS

| VPS | CPU | RAM | Storage | Notes |
|-----|-----|-----|---------|-------|
| VPS1 | 4 vCPU fully used (node + RPC) | ~6–8 GB (node 3–4 GB + RPC + OS) | 75 GB sufficient for testnet (100 GB recommended long-term) | At NODE_SPECS minimum; monitor disk |
| VPS2 | Same as VPS1 | Same as VPS1 | Same as VPS1 | Same as VPS1 |
| VPS3 | Nginx + Faucet + DB (+ Explorer if enabled) | Nginx ~100 MB, Faucet ~512 MB, Postgres 2–4 GB, Redis ~100 MB, Explorer 2–4 GB if enabled → ~6–8 GB total | 75 GB (mostly Postgres if running Explorer) | If 8 GB is tight, run only Nginx + Faucet first, then add Explorer |

---

## 2. Prerequisites Before Genesis

- [ ] **Genesis file** — chain_id 86137, two validators (addresses + enode for VPS1, VPS2)
- [ ] **Validator keys** — Each VPS has a key for block production (and identity key for P2P if applicable)
- [ ] **Faucet key** — Included in genesis allocation; set `FAUCET_PRIVATE_KEY` on VPS3
- [ ] **Firewall** — VPS1 & VPS2: open 22, 8545, 30303 (and 8546 if using WS); VPS3: 22, 80, 443, 3002 (if exposing Faucet directly before Nginx)

---

## 3. Timeline — Complete Within This Month

### Week 1: Prepare Validators + Genesis

| Day | Task | Notes |
|-----|------|-------|
| 1–2 | Create/update genesis (chain_id 86137, validators EU+AU), create validator keys | Use `core/tools/create_genesis.py`, add IPs 217.76.61.116, 46.250.244.4 |
| 2–3 | Deploy node on VPS1 and VPS2 (binary or Docker), same genesis on both | Use `ops/deploy/scripts/update-validator-vps.sh` or setup per VPS_VALIDATOR_UPDATE.md |
| 3–4 | Open ports 8545, 30303 (and 8546 if needed) on both VPS; verify RPC and P2P | `curl` eth_chainId, eth_blockNumber; confirm P2P peers (logs or metrics) |
| 4–5 | Confirm blocks are produced and synced between the two validators | Compare block height from both RPCs |

### Week 2: Infrastructure (VPS3) + Faucet

| Day | Task | Notes |
|-----|------|-------|
| 1–2 | On VPS3: install Nginx, clone/copy config from `ops/deploy/nginx` | Prepare reverse proxy for rpc.axionax.org → VPS1 (or load-balance to VPS1, VPS2) |
| 2–3 | Run Faucet (Docker or binary from core), set `RPC_URL=http://217.76.61.116:8545`, `FAUCET_PRIVATE_KEY`, `CHAIN_ID=86137` | Use image or build from `ops/deploy/Dockerfile.faucet` |
| 3–4 | Set DNS: rpc.axionax.org → VPS3 (or directly to VPS1 if no proxy), faucet.axionax.org → VPS3 | If Nginx on VPS3, have rpc.axionax.org proxy to VPS1 (or both) |
| 4–5 | Test Faucet: request AXX to a test address, verify balance via RPC | curl POST /request or Faucet web UI |

### Week 3: SSL + Frontend RPC

| Day | Task | Notes |
|-----|------|-------|
| 1–2 | Install SSL on VPS3 (Certbot), enable 443; update Nginx for HTTPS | Use `ops/deploy` certbot + nginx conf |
| 2–3 | Frontend (axionax-web-universe): set `NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org` (or http://217.76.61.116:8545 temporarily), then build/deploy | Host on Vercel/VPS as usual |
| 3–4 | Test Connect Wallet + Add Network (Axionax Testnet, 86137) + receive AXX from Faucet | See docs/ADD_NETWORK_AND_TOKEN.md |
| 4–5 | (Optional) Run Explorer on VPS3 if RAM allows; otherwise defer until after launch | Use image or stack from ops/deploy |

### Week 4: Go Live + Communication

| Day | Task | Notes |
|-----|------|-------|
| 1–2 | Final checks: RPC, Faucet, Frontend, MetaMask; run `ops/deploy/scripts/verify-launch-ready.sh` if paths match | Fix any script warnings |
| 2–3 | Announce Public Testnet: document RPC URL, Chain ID 86137, Faucet link, how to add network in MetaMask | Update README, docs, axionax.org |
| 3–7 | Monitor uptime, disk, RPC errors; refill Faucet if depleted | Use Grafana/Prometheus if installed on VPS3 |

---

## 4. Commands / Reference Files

- Genesis: `core/tools/create_genesis.py`, `core/core/genesis/src/lib.rs`
- Validator update: `ops/deploy/scripts/update-validator-vps.sh`, `ops/deploy/VPS_VALIDATOR_UPDATE.md`
- RPC check: `curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://217.76.61.116:8545`
- Faucet: `ops/deploy/Dockerfile.faucet`, `tools/devtools/tools/faucet/`
- Nginx: `ops/deploy/nginx/conf.d/` (rpc.conf, faucet.conf)
- Launch verify: `ops/deploy/scripts/verify-launch-ready.sh`
- Connectivity overview: `docs/CONNECTIVITY_OVERVIEW.md`
- Add network / receive AXX: `docs/ADD_NETWORK_AND_TOKEN.md`

---

## 5. Allocation Summary

- **VPS 1 (217.76.61.116):** Validator + RPC — core of the chain (EU)
- **VPS 2 (46.250.244.4):** Validator + RPC — consensus pair with VPS1 (AU)
- **VPS 3 (217.216.109.5):** Nginx + Faucet + (optional Explorer) — no node; RPC points to VPS1/VPS2; hub for domains and user-facing services

Following the timeline above and checking the referenced docs will allow the Genesis public testnet to be completed within this month per the given spec.

**See also:** [TESTNET_READINESS.md](../TESTNET_READINESS.md) · [GITHUB_READINESS.md](GITHUB_READINESS.md)
