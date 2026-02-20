<div align="center">

# axionax Core Universe

### Blockchain Core, Operations & Development Tools Monorepo

[![License](https://img.shields.io/badge/License-AGPLv3%2FMIT-orange?style=flat-square)](#license)
[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://www.python.org/)

**High-Performance Blockchain Protocol** · **PoPC Consensus** · **45,000+ TPS** · **<0.5s Finality**

[Website](https://axionax.org) · [Documentation](https://axionaxprotocol.github.io/axionax-docs/) · [Web Universe](https://github.com/axionaxprotocol/axionax-web-universe)

</div>

---

## Quick Start — Join the Network

> **End users** interact via the Website → [axionax.org](https://axionax.org)
>
> The section below is for **Node Operators** who want to run their own node.

### 1. Clone & Update

```bash
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe
python3 scripts/update-node.py
```

The script will:
- Create a `.venv` automatically (handles Ubuntu 24.04 PEP 668)
- Install required dependencies
- Run a system suitability check (Python, deps, RPC)

### 2. Choose Node Type & Run

```bash
python3 scripts/join-axionax.py
```

Interactive menu:

| Option | Type | Config |
|--------|------|--------|
| 1 | Worker (PC/Server) | `core/deai/worker_config.toml` |
| 2 | Monolith Scout (single Hailo) | `configs/monolith_scout_single.toml` |
| 3 | HYDRA (Sentinel + Worker) | `configs/monolith_worker.toml` |

Or run directly:

```bash
# Worker
python3 core/deai/worker_node.py

# Worker with specific config
python3 core/deai/worker_node.py --config configs/monolith_scout_single.toml

# HYDRA (Sentinel + Worker dual-core)
python3 hydra_manager.py
```

### 3. Update Node (all machines)

Run on any machine that runs a node — no IP required:

```bash
cd ~/axionax-core-universe
git pull
python3 scripts/update-node.py
```

For Worker AI nodes that need torch/numpy:

```bash
python3 scripts/update-node.py --full-deps
```

---

## Current Network (Testnet)

| Validator | IP | RPC | Region |
|-----------|-----|-----|--------|
| #1 | 217.76.61.116 | `http://217.76.61.116:8545` | EU |
| #2 | 46.250.244.4 | `http://46.250.244.4:8545` | AU |

- **Chain ID:** `86137`
- **Phase:** Pre-Testnet (Phase 2)
- All configs already point to these bootnodes

**Verify RPC:**

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://217.76.61.116:8545
```

---

## Configuration

### Config Files

| File | Used for |
|------|----------|
| `core/deai/worker_config.toml` | General Worker PC/Server |
| `configs/monolith_scout_single.toml` | Monolith Scout (single Hailo) |
| `configs/monolith_sentinel.toml` | HYDRA — Sentinel (Hailo #0) |
| `configs/monolith_worker.toml` | HYDRA — Worker (Hailo #1) |

### Environment Variables (optional)

Copy and edit the example file:

```bash
cp core/deai/.env.example core/deai/.env
```

| Variable | Description |
|----------|-------------|
| `AXIONAX_RPC_URL` | RPC URL (overrides bootnodes in config) |
| `AXIONAX_BOOTNODES` | Comma-separated RPC URLs |
| `AXIONAX_CHAIN_ID` | Chain ID |
| `AXIONAX_WALLET_PATH` | Path to wallet file |
| `WORKER_KEY_PASSWORD` | Wallet password (avoids prompt on each run) |
| `WORKER_PRIVATE_KEY` | Private key directly (instead of file) |

---

## Security

- **Never commit** `.env`, `worker_key.json`, or any private keys (already in `.gitignore`)
- **Backup wallet** after first run: copy `worker_key.json` + password to a safe location
- **Firewall:** only open necessary ports (Workers don't need 8545 exposed)
- **Production:** use `WORKER_PRIVATE_KEY` from environment instead of file

---

## Monolith MK-I Scout — Production

### Hardware

| Item | Notes |
|------|-------|
| Raspberry Pi 5 (8GB) | Base unit |
| Raspberry Pi AI HAT+ 2 (Hailo-10H) | NPU for inference |
| Cooling | Heatsink/fan to keep Hailo within thermal limits |
| SD card / SSD | Sufficient capacity + fast class |
| Power supply | 5V 5A (USB-C PD) |

### Setup

```bash
sudo apt update && sudo apt upgrade -y
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe
python3 scripts/update-node.py --full-deps
```

### Run

```bash
# Single Core (one Hailo)
python3 core/deai/worker_node.py --config configs/monolith_scout_single.toml

# HYDRA (Sentinel + Worker — dual Hailo)
python3 hydra_manager.py
```

### Run as systemd Service

```bash
sudo cp scripts/axionax-hydra.service.example /etc/systemd/system/axionax-hydra.service
# Edit paths and user as needed
sudo systemctl daemon-reload
sudo systemctl enable --now axionax-hydra
```

### Known Limitations

| Item | Status |
|------|--------|
| Worker registration / result submission | Mock — until real smart contract is deployed |
| Validator RPC | Live (217.76.61.116, 46.250.244.4) |
| Wallet / Keys | Live — creation and encryption work |

---

## Repository Overview

```
axionax-core-universe/
├── core/                       # Blockchain Protocol Core
│   ├── blockchain/             # Block and chain management
│   ├── consensus/              # PoPC consensus mechanism
│   ├── crypto/                 # Cryptographic primitives (Ed25519, Blake3)
│   ├── network/                # P2P networking + reputation system
│   ├── state/                  # RocksDB state management
│   ├── rpc/                    # JSON-RPC API + health endpoints
│   ├── staking/                # Native staking (stake, delegate, slash)
│   ├── governance/             # On-chain governance (proposals, voting)
│   ├── ppc/                    # Posted Price Controller
│   ├── da/                     # Data Availability (erasure coding)
│   ├── asr/                    # Auto-Selection Router (VRF worker selection)
│   ├── vrf/                    # Verifiable Random Function
│   └── deai/                   # DeAI (Python integration)
│
├── configs/                    # Monolith / Scout TOML configs
├── scripts/                    # Helper scripts (join, update, health-check)
├── ops/deploy/                 # Deployment & Operations (Docker, monitoring)
└── tools/                      # Development utilities (faucet, devtools)
```

### Key Features

- **High Performance**: 45,000+ TPS with <0.5s finality
- **PoPC Consensus**: Proof of Probabilistic Checking
- **Smart Contracts**: WASM-based + EVM compatible
- **DeAI Integration**: Python-based decentralized AI workloads
- **Native Staking**: Stake, delegate, slash, rewards
- **On-chain Governance**: Create proposals, vote, execute
- **PPC / DA / ASR / VRF**: Dynamic pricing, data availability, worker selection

---

## Development

### Prerequisites

- Rust 1.70+ (cargo, rustc)
- Python 3.10+
- Docker & Docker Compose

### Build & Test (Rust)

```bash
cd core
cargo build --release
cargo test --workspace
cargo clippy --workspace
cargo fmt --all
cargo bench
```

### Run Local Node

```bash
cargo run --bin axionax-node
```

### Deploy with Docker

```bash
# Dev stack (local)
docker compose -f docker-compose.dev.yml up -d

# VPS
docker compose -f ops/deploy/docker-compose.vps.yml up -d
```

### Python DeAI Tests

```bash
cd core/deai
python3 -m pytest . -v --tb=short --ignore=tests
```

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `scripts/join-axionax.py` | System check + node type selection + run |
| `scripts/update-node.py` | Update node (git pull + deps + check) |
| `scripts/update-node.py --full-deps` | Update + install AI/ML deps (torch, numpy) |
| `scripts/health-check.py` | Check RPC + config + wallet |
| `scripts/join-network.py` | Check config + RPC only |
| `scripts/verify-production-ready.py` | Full production readiness check |
| `scripts/make-node-package.py` | Create ZIP package for distribution |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `pip` missing / PEP 668 | `update-node.py` creates `.venv` automatically |
| Config file not found | Run from repo root or use `--config` with full path |
| No bootnodes | Set `[network] bootnodes` in TOML or `AXIONAX_RPC_URL` in `.env` |
| Connection refused | Check RPC URL + firewall; verify chain is running |
| Wallet password | First run prompts for password; use a strong one and store safely |
| `python` not found | Use `python3` instead (Ubuntu 24.04+) |

---

## Documentation

- [**Master Summary**](MASTER_SUMMARY.md) — Vision, architecture, hardware, tokenomics, roadmap
- [Architecture Overview](core/docs/ARCHITECTURE_OVERVIEW.md)
- [API Reference](core/docs/API_REFERENCE.md)
- [Deployment Guide](core/DEPLOYMENT_GUIDE.md)
- [Security Audit](core/SECURITY_AUDIT.md)
- [Project Ascension](core/docs/PROJECT_ASCENSION.md) — Monolith & 9 Pillars
- [Monolith Roadmap](core/docs/MONOLITH_ROADMAP.md) — MK-I to MK-IV hardware
- [Network Nodes](core/docs/NETWORK_NODES.md) — All node types
- [Core docs index](core/docs/README.md) — All docs in `core/docs/`

---

## Contributing

1. **Fork** this repository
2. **Create** a feature branch (`git checkout -b feature/amazing`)
3. **Test** (`cargo test --workspace && cargo clippy`)
4. **Push** and open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License

| Component | License |
|-----------|---------|
| **core/** | AGPLv3 |
| **ops/** | MIT |
| **tools/** | MIT |

---

## Related Projects

- [**axionax Web Universe**](https://github.com/axionaxprotocol/axionax-web-universe) — Frontend, SDK, Docs & Marketplace

## Support

- [Website](https://axionax.org) · [Docs](https://axionaxprotocol.github.io/axionax-docs/) · [Issues](https://github.com/axionaxprotocol/axionax-core-universe/issues)

---

<div align="center">

**Built by the axionax Protocol Team**

*Part of the [axionax Universe](https://github.com/axionaxprotocol)*

</div>
