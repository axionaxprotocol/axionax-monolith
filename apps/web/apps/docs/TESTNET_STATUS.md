# axionax Testnet Status

> **Last Updated**: April 24, 2026  
> **Core reference**: `axionax-core-universe@28f42cf` (docs: GENESIS_PUBLIC_TESTNET_PLAN + ulimits, 2026-03-15)  
> **Version**: v1.9.0-testnet  
> **Phase**: Pre-Testnet → Genesis Public Testnet (Phase 1 — *The Incarnation*)

---

## 🌐 Testnet Information

### Network Details

- **Chain ID**: 86137 (0x15079)
- **Native Token**: AXX (18 decimals)
- **Consensus**: Proof of Probabilistic Checking (PoPC)
- **Block Time**: 2 seconds (from genesis)
- **Genesis file**: `core/tools/genesis.json`
- **Genesis SHA-256**: `0xed1bdac7c278e5b4f58a1eceb7594a4238e39bb63e1018e38ec18a555c762b55`

### Public Endpoints

- **RPC Endpoint**: https://rpc.axionax.org (Nginx reverse-proxy on VPS 3 → VPS 1 / VPS 2)
- **WebSocket**: wss://rpc.axionax.org
- **Explorer**: https://explorer.axionax.org (optional on VPS 3)
- **Faucet**: https://faucet.axionax.org (VPS 3)
- **Website**: https://axionax.org
- **Monitoring**: https://monitor.axionax.org

### Three-VPS Architecture (Genesis Public Testnet)

| VPS       | IP              | Role                                  | Services                                     |
| --------- | --------------- | ------------------------------------- | -------------------------------------------- |
| **VPS 1** | 217.216.109.5   | Validator #1 + RPC (EU)               | `axionax-node` (validator, RPC 8545, P2P 30303) |
| **VPS 2** | 46.250.244.4    | Validator #2 + RPC (AU)               | `axionax-node` (validator, RPC 8545, P2P 30303) |
| **VPS 3** | 217.216.109.5   | Infra hub (no chain node)             | Nginx reverse-proxy, Faucet, Postgres, Redis, *optional* Explorer |

> VPS 3 runs `ops/deploy/docker-compose.vps3-faucet.yml` from core with `FAUCET_PRIVATE_KEY` and `RPC_URL` pointing at VPS 1.

### Direct RPC Access

```bash
# Chain ID (expect "0x15079" = 86137)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://217.216.109.5:8545

# Validator EU (primary)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://217.216.109.5:8545

# Validator AU (secondary)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://46.250.244.4:8545
```

---

## 📊 Service Status

| Service           | Status     | Endpoint             | Description                                                              |
| ----------------- | ---------- | -------------------- | ------------------------------------------------------------------------ |
| **Validator EU**  | ❌ Offline | 217.216.109.5:8545   | Genesis validator node (VPS 1) - currently offline                       |
| **Validator AU**  | ✅ Running | 46.250.244.4:8545    | Genesis validator node (VPS 2) - only active validator                   |
| **RPC Gateway**   | ✅ Running | rpc.axionax.org      | Nginx reverse-proxy on VPS 3 → VPS 2 (AU only)                          |
| **Website**       | ✅ Running | axionax.org          | Main website (`apps/web`)                                                |
| **Faucet**        | ✅ Running | faucet.axionax.org   | VPS 3 Faucet (`docker-compose.vps3-faucet.yml`)                          |
| **Explorer**      | 🟡 Optional | explorer.axionax.org | Runs on VPS 3 *if RAM allows* — deferred until post-launch if constrained |
| **Grafana**       | ✅ Running | monitor.axionax.org  | Monitoring dashboard                                                     |
| **Prometheus**    | ✅ Running | Internal             | Metrics collection                                                       |

---

## ✅ Genesis Public Testnet — Readiness

Tracked against [axionax-core-universe `docs/GENESIS_PUBLIC_TESTNET_PLAN.md`](https://github.com/axionaxprotocol/axionax-core-universe/blob/main/docs/GENESIS_PUBLIC_TESTNET_PLAN.md) and [`docs/GENESIS_LAUNCH_DAY_CHECKLIST.md`](https://github.com/axionaxprotocol/axionax-core-universe/blob/main/docs/GENESIS_LAUNCH_DAY_CHECKLIST.md).

### Completed

- [x] Genesis file produced (`core/tools/genesis.json`, SHA-256 `0xed1bdac7…c762b55`, chain_id 86137)
- [x] Two validators in genesis allocation: EU (217.216.109.5), AU (46.250.244.4)
- [ ] EU validator currently offline - only AU validator active
- [x] Validator update scripts: `ops/deploy/scripts/update-validator-vps.sh`, `run-update-both-vps.ps1`
- [x] VPS 3 Faucet compose (`docker-compose.vps3-faucet.yml`) + nginx example
- [x] ulimit (`nofile=65536`) fixed in compose + `fix-validator-ulimit.sh` for existing containers
- [x] Launch Day Checklist documented (`GENESIS_LAUNCH_DAY_CHECKLIST.md`)
- [x] Web ↔ core constants aligned in `packages/blockchain-utils`

### In Progress

- [x] Genesis distributed to both validators
- [ ] EU validator offline - single-validator mode active
- [ ] P2P peer count = 0 (no peer connection with EU offline)
- [ ] DNS cutover: `rpc.axionax.org` → VPS 3, `faucet.axionax.org` → VPS 3
- [ ] SSL (Certbot) on VPS 3; `NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org` in `apps/web`
- [ ] Run `ops/deploy/scripts/verify-launch-ready.sh` from core once RPC/DNS are live
- [ ] Optional: Explorer on VPS 3 (deferred if RAM budget is tight)

---

## 🔧 MetaMask Configuration

Add axionax Testnet to MetaMask:

| Setting             | Value                        |
| ------------------- | ---------------------------- |
| **Network Name**    | Axionax Testnet              |
| **RPC URL**         | https://rpc.axionax.org      |
| **Chain ID**        | 86137                        |
| **Currency Symbol** | AXX                          |
| **Block Explorer**  | https://explorer.axionax.org |

---

## 📈 Network Statistics

Live values are displayed on the [Validator Network](https://axionax.org/validators) page (10 s polling via `/api/rpc/eu` and `/api/rpc/au`).

- **Validators**: 1 active validator (AU only) - EU offline
- **Target TPS**: 45,000+ (design goal)
- **Finality**: <0.5 seconds (design goal)
- **Block time**: 2 s (genesis)

---

## 🚀 Getting Started

### 1. Get Test Tokens

```bash
curl -X POST -H "Content-Type: application/json" \\
  -d '{"address":"0xYourWalletAddress"}' \\
  https://faucet.axionax.org/faucet
```

### 2. Check Balance

```bash
curl -X POST -H "Content-Type: application/json" \\
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xYourAddress","latest"],"id":1}' \\
  https://rpc.axionax.org
```

### 3. Run Your Own Node

See [VPS_VALIDATOR_SETUP.md](./VPS_VALIDATOR_SETUP.md) for detailed instructions, or clone [axionax-core-universe](https://github.com/axionaxprotocol/axionax-core-universe) and run `python3 scripts/join-axionax.py`.

---

## � Quick Links

### Documentation

- [Deployment Plan](./TESTNET_DEPLOYMENT_PLAN.md) — Web-side deployment roadmap
- [STATUS.md](./STATUS.md) — Overall project status
- [README.md](./README.md) — Project overview
- Core: [`GENESIS_PUBLIC_TESTNET_PLAN.md`](https://github.com/axionaxprotocol/axionax-core-universe/blob/main/docs/GENESIS_PUBLIC_TESTNET_PLAN.md) · [`GENESIS_LAUNCH_DAY_CHECKLIST.md`](https://github.com/axionaxprotocol/axionax-core-universe/blob/main/docs/GENESIS_LAUNCH_DAY_CHECKLIST.md) · [`ADD_NETWORK_AND_TOKEN.md`](https://github.com/axionaxprotocol/axionax-core-universe/blob/main/docs/ADD_NETWORK_AND_TOKEN.md)

### Live Services

- Website: https://axionax.org
- RPC: https://rpc.axionax.org (or direct `http://217.216.109.5:8545` / `http://46.250.244.4:8545`)
- Faucet: https://faucet.axionax.org
- Explorer: https://explorer.axionax.org (if enabled on VPS 3)

### Developer Tools

- Add network to MetaMask: Chain ID `86137`, Symbol `AXX`, RPC `https://rpc.axionax.org`
- Get testnet AXX: https://faucet.axionax.org

---

## 📞 Support & Contact

- **Discord**: Coming soon
- **GitHub**: https://github.com/axionaxprotocol
- **Email**: dev@axionax.org

---

**Last Status Check**: April 24, 2026  
**Synced core ref**: `axionax-core-universe@28f42cf`  
**Next sync**: on next core commit touching chain params, genesis, or ops

Made with 💜 by the Axionax Team
