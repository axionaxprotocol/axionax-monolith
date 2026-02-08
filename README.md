<div align="center">

# 🌌 axionax Core Universe

### Blockchain Core, Operations & Development Tools Monorepo

[![License](https://img.shields.io/badge/License-AGPLv3%2FMIT-orange?style=flat-square)](#license)
[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://www.python.org/)
[![Tests](https://img.shields.io/badge/Tests-42%2F42-success?style=flat-square)](#testing)

**High-Performance Blockchain Protocol** • **PoPC Consensus** • **45,000+ TPS** • **<0.5s Finality**

[Website](https://axionax.org) • [Documentation](https://axionaxprotocol.github.io/axionax-docs/) • [Web Universe](https://github.com/axionaxprotocol/axionax-web-universe)

</div>

---

## 📖 Overview

**axionax Core Universe** เป็น monorepo ที่รวมทุกอย่างที่เกี่ยวข้องกับ backend, infrastructure และ development tools ของ axionax Protocol ไว้ในที่เดียว ทำให้การพัฒนา deployment และ maintenance ง่ายและมีประสิทธิภาพมากขึ้น

### 🎯 What's Inside?

```
axionax-core-universe/
├── 🦀 core/                    # Blockchain Protocol Core (19 modules)
│   ├── blockchain/             # Block and chain management
│   ├── consensus/              # PoPC consensus mechanism
│   ├── crypto/                 # Cryptographic primitives (Ed25519, Blake3)
│   ├── network/                # P2P networking + reputation system
│   ├── state/                  # RocksDB state management
│   ├── rpc/                    # JSON-RPC API + health endpoints
│   ├── config/                 # Protocol configuration
│   ├── node/                   # Node runner
│   │
│   ├── ⭐ staking/             # NEW: Native staking (stake, delegate, slash)
│   ├── ⭐ governance/          # NEW: On-chain governance (proposals, voting)
│   ├── ⭐ ppc/                 # NEW: Posted Price Controller
│   ├── ⭐ da/                  # NEW: Data Availability (erasure coding)
│   ├── ⭐ asr/                 # NEW: Auto-Selection Router (VRF worker selection)
│   ├── ⭐ vrf/                 # NEW: Verifiable Random Function
│   ├── ⭐ events/              # NEW: Pub/Sub event system
│   ├── ⭐ cli/                 # NEW: Command-line interface
│   ├── ⭐ metrics/             # NEW: Prometheus metrics
│   ├── ⭐ genesis/             # NEW: Genesis block generator
│   └── deai/                   # DeAI (Python integration)
│
├── 🌍 ops/deploy/              # Deployment & Operations
│   ├── environments/           # Testnet/Mainnet configs
│   ├── scripts/                # Setup & automation scripts
│   ├── monitoring/             # Prometheus & Grafana
│   └── nginx/                  # Reverse proxy configs
│
└── 🛠️ tools/                   # Development Utilities
    ├── faucet/                 # Testnet faucet
    └── devtools/               # Testing & benchmarks
```


---

## ✨ Key Features

### 🦀 Blockchain Core

- **High Performance**: 45,000+ TPS with <0.5s finality
- **PoPC Consensus**: Proof of Probabilistic Checking for efficient validation
- **Smart Contracts**: WASM-based execution environment
- **EVM Compatible**: Easy migration for Ethereum dApps
- **DeAI Integration**: Python-based decentralized AI workloads

### ⭐ Self-Reliance Features (NEW)

- **Native Staking**: Stake, delegate, slash, rewards distribution
- **On-chain Governance**: Create proposals, vote, execute
- **P2P Reputation**: Score-based peer management with banning
- **Event System**: Real-time pub/sub for blocks, transactions, staking

### 🔧 Architecture Components (NEW)

- **PPC**: Posted Price Controller for dynamic compute pricing
- **DA**: Data Availability layer with erasure coding
- **ASR**: Auto-Selection Router with VRF-based worker selection
- **VRF**: Verifiable Random Function with commit-reveal scheme

### 🌍 Operations & Deployment

- **Docker-first**: Complete containerization for easy deployment
- **Kubernetes Ready**: Liveness & readiness probes, Prometheus metrics
- **Monitoring**: Built-in Prometheus & Grafana dashboards
- **Multi-environment**: Support for dev, testnet, mainnet

### 🛠️ Development Tools

- **CLI**: Full-featured command-line interface (`axionax status`, `staking`, `gov`)
- **Comprehensive Testing**: 90+ integration & unit tests
- **Genesis Generator**: Create testnet/localnet genesis blocks
- **Rate Limiting**: Built-in spam protection for RPC


---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Rust 1.70+ (cargo, rustc)
- Python 3.10+
- Docker & Docker Compose

# Optional
- PostgreSQL 15+
- Redis 7+
```

### 1. Clone & Build

```bash
# Clone the repository
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe

# Build blockchain core
cd core
cargo build --release

# Run tests
cargo test --workspace
```

### 2. Run Local Node

```bash
# Development mode
cargo run --bin axionax-node

# Or using example
cargo run --example run_node
```

### 3. Deploy with Docker

```bash
cd ops/deploy

# Start validator node
./setup_validator.sh

# Or use docker-compose
docker-compose up -d
```

---

## 📦 Components

### 🦀 Core (`/core`)

**Blockchain Protocol Implementation**

| Module | Description | Language |
|--------|-------------|----------|
| `blockchain` | Block & chain management | Rust |
| `consensus` | PoPC consensus algorithm | Rust |
| `crypto` | Ed25519, SHA3, BLS signatures | Rust |
| `network` | P2P libp2p networking | Rust |
| `state` | Merkle Patricia Trie state | Rust |
| `rpc` | JSON-RPC server | Rust |
| `node` | Full node implementation | Rust |
| `deai` | DeAI Python integration | Python |

**Key Commands:**

```bash
cd core

# Build
cargo build --release

# Test
cargo test --workspace

# Lint
cargo clippy --workspace

# Format
cargo fmt --all

# Benchmarks
cargo bench
```

---

## Testing & Verification

Run all tests to verify the project:

```bash
# Rust (from repo root: run from core/ — requires libclang on Windows for full build)
cd core
cargo test --workspace

# Python DeAI (from repo root or core)
cd core/deai
python -m pytest . -v --tb=short --ignore=tests

# Optional: run job execution test (requires RPC / worker wallet)
python -m pytest test_job_execution.py -v -s
```

| Test suite | Location | Notes |
|------------|----------|--------|
| Rust unit/integration | `core/` | `cargo test --workspace`; Windows may need `LIBCLANG_PATH` for RocksDB/bindgen |
| DeAI Python | `core/deai/` | `pytest`; `test_job_execution` skips if worker init fails (no RPC) |
| Integration (Rust bindings) | `core/tests/` | `integration_simple.py`, `integration_test.py` |

**Lint & format:**

```bash
cd core
cargo fmt --all
cargo clippy --workspace -- -D warnings
```

---

### 🌍 Operations (`/ops/deploy`)

**Deployment & Infrastructure Automation**

| Component | Description | Status |
|-----------|-------------|--------|
| `docker-compose.yaml` | Full stack orchestration | ✅ Ready |
| `setup_validator.sh` | Validator node setup | ✅ Ready |
| `setup_rpc_node.sh` | RPC node setup | ✅ Ready |
| `setup_explorer.sh` | Block explorer setup | ✅ Ready |
| `setup_faucet.sh` | Testnet faucet setup | ✅ Ready |
| `monitoring/` | Prometheus & Grafana | ✅ Ready |
| `nginx/` | Reverse proxy configs | ✅ Ready |

**Quick Deploy:**

```bash
cd ops/deploy

# Setup validator
./setup_validator.sh

# Setup RPC node
./setup_rpc_node.sh

# Setup monitoring
docker-compose -f monitoring/docker-compose.yaml up -d

# View logs
docker-compose logs -f
```

---

### 🛠️ DevTools (`/tools/devtools`)

**Development Utilities & Testing Framework**

| Tool | Description | Tests |
|------|-------------|-------|
| Integration Tests | Full system testing | 42/42 ✅ |
| Load Testing | Performance validation | Ready |
| Security Audits | Vulnerability scanning | Active |
| Code Coverage | Test coverage reports | 85%+ |

**Run Tests:**

```bash
cd tools/devtools

# Run all tests
python -m pytest tests/ -v

# Run specific test
python -m pytest tests/integration_test.py

# Load test
python tests/load_test.py

# Coverage report
pytest --cov=. --cov-report=html
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Node Configuration
AXIONAX_CHAIN_ID=86137                    # Testnet chain ID
AXIONAX_RPC_PORT=8545                     # RPC server port
AXIONAX_P2P_PORT=30303                    # P2P network port
AXIONAX_VALIDATOR_KEY=/path/to/key.json   # Validator key

# Network
AXIONAX_BOOTNODES=node1.axionax.org:30303
AXIONAX_MAX_PEERS=50

# Database
DATABASE_URL=postgresql://user:pass@localhost/axionax
REDIS_URL=redis://localhost:6379

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
```

### Configuration Files

- `core/config/genesis.json` - Genesis block configuration
- `core/config/node.toml` - Node configuration
- `ops/deploy/configs/` - Deployment configs
- `prometheus.yml` - Monitoring configuration

---

## 📊 Performance

### Benchmarks

| Metric | Value | Target |
|--------|-------|--------|
| **TPS** | 45,000+ | 50,000 |
| **Finality** | <0.5s | <0.4s |
| **Block Time** | 2s | 2s |
| **Transaction Fee** | $0.0001 avg | Variable |
| **Memory Usage** | ~2GB | <3GB |
| **Sync Time** | ~5 min (testnet) | Optimize |

```bash
# Run benchmarks
cd core
cargo bench

# Load testing
cd tools/devtools
python tests/load_test.py --tps 50000 --duration 300
```

---

## 🧪 Testing

### Test Coverage

- ✅ **Unit Tests**: Core functionality (28 tests)
- ✅ **Integration Tests**: Full system (12 tests)
- ✅ **Security Tests**: Vulnerability checks (2 tests)
- ✅ **Performance Tests**: Load & stress testing

### Run All Tests

```bash
# Rust tests
cd core
cargo test --workspace --all-features

# Python tests
cd tools/devtools
pytest tests/ -v --cov

# Integration tests
python tests/integration_test.py
```

---

## 📚 Documentation

- [Architecture Overview](core/docs/ARCHITECTURE_OVERVIEW.md)
- [API Reference](core/docs/API_REFERENCE.md)
- [Deployment Guide](core/DEPLOYMENT_GUIDE.md)
- [Development Guide](core/DEVELOPMENT_SUMMARY.md)
- [Security Audit](core/SECURITY_AUDIT.md)
- [Project Ascension](core/docs/PROJECT_ASCENSION.md) — Monolith & 9 Pillars
- [Monolith Roadmap](core/docs/MONOLITH_ROADMAP.md) — MK-I to MK-IV hardware
- [Network Nodes](core/docs/NETWORK_NODES.md) — All node types on the network
- [Marketplace Worker Nodes](core/docs/MARKETPLACE_WORKER_NODES.md) — Workers on Compute Marketplace
- [Full Documentation](https://axionaxprotocol.github.io/axionax-docs/)

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** this repository
2. **Create** a feature branch (`git checkout -b feature/amazing`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing`)
5. **Open** a Pull Request

### Development Workflow

```bash
# Setup development environment
cd core
./install_dependencies_linux.sh  # or macos/windows

# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
cargo test --workspace
cargo clippy --workspace
cargo fmt --all

# Commit and push
git add .
git commit -m "Your feature description"
git push origin feature/your-feature
```

---

## 📜 License

This monorepo contains components with different licenses:

| Component | License | Reason |
|-----------|---------|--------|
| **core/** | AGPLv3 | Blockchain protocol must remain open-source |
| **ops/** | MIT | Deployment tools can be freely used |
| **tools/** | MIT | Development utilities are MIT licensed |

See individual `LICENSE` files in each directory for details.

---

## 🔗 Related Projects

- **[axionax Web Universe](https://github.com/axionaxprotocol/axionax-web-universe)** - Frontend, SDK, Docs & Marketplace
- **[axionax Protocol Profile](https://github.com/axionaxprotocol)** - Organization overview

---

## 📞 Support & Community

- 🌐 **Website**: [axionax.org](https://axionax.org)
- 📖 **Documentation**: [docs.axionax.org](https://axionaxprotocol.github.io/axionax-docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/axionaxprotocol/axionax-core-universe/issues)
- 💬 **Discord**: Coming Q1 2026
- 🐦 **Twitter**: Coming Q1 2026

---

## 🎯 Roadmap

### ✅ Completed
- [x] Core blockchain implementation
- [x] PoPC consensus mechanism
- [x] Smart contract support (WASM)
- [x] Docker deployment stack
- [x] Testing framework (42 tests)
- [x] Monitoring & observability

### 🔄 In Progress (70% Complete)
- [ ] Performance optimization (45K → 50K TPS)
- [ ] Security audits & penetration testing
- [ ] Enhanced monitoring dashboards
- [ ] Multi-region deployment support

### 🚀 Upcoming (Q1 2026)
- [ ] Public testnet launch
- [ ] Validator onboarding program
- [ ] Mainnet preparation
- [ ] Governance implementation

---

<div align="center">

**Built with ❤️ by the axionax Protocol Team**

*Part of the [axionax Universe](https://github.com/axionaxprotocol) • Last Updated: February 8, 2026*

[![GitHub Stars](https://img.shields.io/github/stars/axionaxprotocol/axionax-core-universe?style=social)](https://github.com/axionaxprotocol/axionax-core-universe)
[![GitHub Forks](https://img.shields.io/github/forks/axionaxprotocol/axionax-core-universe?style=social)](https://github.com/axionaxprotocol/axionax-core-universe/fork)

**🌌 Welcome to the Core Universe! 🦀**

</div>
