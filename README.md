<div align="center">

# Axionax Monolith

### One repo · Two universes · Civilization OS

[![Chain ID](https://img.shields.io/badge/Testnet-86137-orange?style=flat-square)](#network)
[![Rust](https://img.shields.io/badge/Rust-1.81%2B-orange?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node-20%2B-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![PNPM](https://img.shields.io/badge/pnpm-10-yellow?style=flat-square&logo=pnpm)](https://pnpm.io/)

**PoPC Consensus** · **45,000 TPS target** · **<0.5s finality** · **DeAI at the edge**

</div>

---

## What's inside

This repository is the **monolithic working tree** for the Axionax Protocol. Sub-trees are scoped along a strict Web ↔ Core boundary defined in `.windsurfrules`:

```
axionax-monolith/
├── apps/
│   ├── web/              # Public dApp + marketplace (Next.js · TypeScript)
│   └── os-dashboard/     # Self-hosted node OS UI (Next.js · Tailwind)
├── services/
│   └── core/             # Blockchain core + DeAI worker (Rust · Python)
├── packages/             # Shared TypeScript packages (currently includes SDK)
├── docs/                 # Cross-cutting docs (playbook, audits, RFCs)
└── scripts/              # Cross-cutting ops scripts (e.g. check-node-sync.sh)
```

> **Domain separation matters.** Frontend changes go in `apps/`, blockchain/AI changes go in `services/core/`. They communicate **only** via the JSON-RPC contract on port 8545. See [`.windsurfrules`](./.windsurfrules) for the full rule set.

---

## Hardware requirements

| Role | Min CPU | RAM | Disk | Network |
|---|---|---|---|---|
| **Worker** (PC/Server) | 4 cores | 8 GB | 100 GB SSD | 50 Mbps · public IP recommended |
| **Validator** (full node) | 8 cores | 16 GB | 500 GB NVMe | 100 Mbps · static IP required |
| **Monolith Scout** (Hailo) | Pi 5 + Hailo-8 | 8 GB | 256 GB SSD | 50 Mbps |
| **HYDRA** (Sentinel + Worker) | 12 cores | 32 GB | 1 TB NVMe | 100 Mbps · public IP |

NPU acceleration (Hailo-8) is optional but recommended for AI-task workers.

---

## Quick start — Docker

```bash
# 1. Clone with submodules / from monolith
git clone https://github.com/axionaxprotocol/axionax-monolith.git
cd axionax-monolith

# 2. Bring up the full dev stack (node + validator + faucet + explorer + grafana)
cd services/core
cp .env.example .env            # set FAUCET_PRIVATE_KEY, POSTGRES_PASSWORD, etc.
docker compose -f docker-compose.dev.yml up -d --build

# 3. Verify the node is alive
curl -sX POST http://localhost:8545 \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Open the OS dashboard:

```bash
cd apps/os-dashboard
pnpm install
pnpm dev          # http://localhost:3030
```

---

## Quick start — bare metal (Linux)

```bash
# 1. Install toolchains + run system suitability check
cd services/core
python3 scripts/update-node.py

# 2. Pick a role
python3 scripts/join-axionax.py
#   1) Worker (PC/Server)
#   2) Monolith Scout (single Hailo)
#   3) HYDRA (Sentinel + Worker)
```

---

## Network

### Testnet (Chain ID `86137`)

| Validator | RPC | Region |
|---|---|---|
| #1 | `http://46.250.244.4:8545` | AU |
| #2 | `http://217.216.109.5:8545` | ES |

P2P bootnodes are advertised via `AXIONAX_BOOTSTRAP_NODES` — see `services/core/configs/`.

Current validated status (2026-05-01):
- AU (`46.250.244.4`) and ES (`217.216.109.5`) nodes are connected and report `peers: 1`.
- Cross-node handshake tests in `services/core/core/core/network/tests/handshake_test.rs` pass (including the ignored mDNS test when run explicitly).

### Key constants

| | Value |
|---|---|
| Mainnet Chain ID | `86150` |
| RPC port | `8545` (HTTP) · `8546` (WS) |
| P2P port | `30303` (TCP + QUIC) |
| Health port | `8080` |
| Metrics port | `9100` |
| Block reward | `1.0 AXX` |
| Min validator stake | `10,000 AXX` |
| Finality threshold | `≥ 2/3` active validators |

---

## P2P troubleshooting

If your node sees zero peers across the public internet:

1. **Check the listening multiaddr** — the node logs every 30s under target `p2p::health`. You should see:
   ```
   p2p::health: P2P health summary peers=0 listening=["/ip4/0.0.0.0/tcp/30303"] external=[]
   ```
2. **`external=[]` means no peer has confirmed reachability.** Verify:
   - TCP **and** UDP/30303 are open in your firewall (`sudo ufw allow 30303`).
   - Cloud security group / NAT rules forward 30303 to the node.
   - You haven't bound `listen_addr` to `127.0.0.1` instead of `0.0.0.0`.
3. **Watch Identify events** — when *any* peer connects, you'll see:
   ```
   p2p::identify: Identify received observed_addr=/ip4/<YOUR-PUBLIC-IP>/tcp/30303/...
   ```
   That `observed_addr` is what other peers see. If it's wrong, the node is mis-NATed.
4. **Use the bundled health script** for sync drift:
   ```bash
   ./scripts/check-node-sync.sh http://localhost:8545 http://46.250.244.4:8545 10
   ```
   Exit codes: `0` in-sync · `1` lagging · `2` ahead · `3` RPC error.

Full diagnostics live in [`docs/compossor-and-cascade-playbook.md`](./docs/compossor-and-cascade-playbook.md) under *§1 Debugging — P2P & Network*.

### Runbook: `identity.key` + `AXIONAX_BOOTSTRAP_NODES`

Use this when nodes show `peers: 0`, or logs include `Local peer ID` connection errors.

1. **Ensure each node has a unique identity key.** If two machines accidentally share `/var/lib/axionax-node/identity.key`, they will fail to peer.
2. **Set at least one valid bootstrap multiaddr** with peer id:
   ```bash
   export AXIONAX_BOOTSTRAP_NODES="/ip4/<BOOTSTRAP_IP>/tcp/30303/p2p/<BOOTSTRAP_PEER_ID>"
   ```
3. **Open network path end-to-end** on the bootstrap node (`30303/tcp`, and optionally `30303/udp` for QUIC).
4. **Restart node and verify peer count**:
   ```bash
   curl -sX POST http://localhost:8545 \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","method":"system_status","params":[],"id":1}'
   ```
   Expect `result.peers > 0`.

If identity collision is suspected, rotate one node key:

```bash
systemctl stop axionax-node
cp /var/lib/axionax-node/identity.key /var/lib/axionax-node/identity.key.bak.$(date +%s)
rm -f /var/lib/axionax-node/identity.key
systemctl start axionax-node
```

---

## Development

```bash
# Web universe (apps/)
pnpm install                                  # at repo root, hydrates all workspaces
pnpm --filter axionax-os-dashboard dev        # dashboard on :3030

# Core universe (services/core)
cd services/core/core
cargo test --workspace                        # 201/201 expected
cargo clippy --workspace -- -D warnings
cargo build --release -p node                 # produces axionax-node
```

Useful commands:

| Command | Purpose |
|---|---|
| `pnpm --filter axionax-os-dashboard icons:resize` | Rebuild optimized logo + favicon set via sharp |
| `./scripts/check-node-sync.sh` | Compare local vs. peer block height |
| `python3 services/core/scripts/health-check.py` | Worker config + RPC reachability check |
| `docker compose -f services/core/docker-compose.dev.yml logs -f axionax-node` | Tail node logs |

---

## Documentation map

| | |
|---|---|
| **[`.windsurfrules`](./.windsurfrules)** | Web ↔ Core boundary rules for Cascade / Windsurf |
| **[`docs/compossor-and-cascade-playbook.md`](./docs/compossor-and-cascade-playbook.md)** | Curated prompts for P2P, infra, scaling, docs |
| **[`docs/monorepo-audit.md`](./docs/monorepo-audit.md)** | Folder hierarchy review + migration plan |
| **[`services/core/README.md`](./services/core/README.md)** | Detailed Core Universe setup |
| **[`services/core/.windsurfrules`](./services/core/.windsurfrules)** | Rust/Python golden rules + key constants |
| **[`services/core/RULES.md`](./services/core/RULES.md)** | Engineer rules of conduct |
| **[`services/core/SECURITY_AUDIT_REPORT.md`](./services/core/SECURITY_AUDIT_REPORT.md)** | Security findings & remediation status |

---

## Contributing

1. Pick the right sub-tree (`apps/` for UI, `services/core/` for chain/AI).
2. Match the existing style — `cargo clippy` and `pnpm lint` must be clean.
3. Commit format:
   ```
   <type>(<scope>): <description>

   types:  feat | fix | chore | docs | refactor | test | perf | security
   scopes: core | consensus | rpc | staking | governance | node | network |
           deai | faucet | ops | web | sdk | dashboard
   ```
4. Open a PR; CI will run the workspace test suite.

---

## License

Dual-licensed under **AGPL-3.0** (default) or **MIT** for explicit downstream agreements. See `LICENSE` in each sub-tree.
