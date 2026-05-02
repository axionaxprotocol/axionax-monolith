---
layout: default
title: axionax protocol Documentation
---

# Axionax Protocol — Documentation

**Decentralized Compute Network with Proof-of-Probabilistic-Checking**

Welcome to the official documentation for Axionax Protocol — a next-generation decentralized compute infrastructure powered by novel consensus mechanisms.

## 🏗️ Genesis Public Testnet — Status (April 24, 2026)

**Phase 1 — *The Incarnation* (Pre-Testnet → Genesis launch)**  
**Synced core ref**: `axionax-core-universe@28f42cf`

| Layer              | Host                         | Status       | Details                                              |
| ------------------ | ---------------------------- | ------------ | ---------------------------------------------------- |
| **Validator EU**   | 217.216.109.5 (VPS 1)        | 🟢 Running   | `axionax-node` validator, RPC 8545, P2P 30303         |
| **Validator AU**   | 46.250.244.4 (VPS 2)         | 🟢 Running   | `axionax-node` validator, RPC 8545, P2P 30303         |
| **Infra hub**      | 217.216.109.5 (VPS 3)        | 🟢 Running   | Nginx + Faucet (+ optional Explorer), no chain node  |
| **Public RPC**     | rpc.axionax.org              | 🟡 DNS pending | Reverse-proxy on VPS 3 → VPS 1/2                    |
| **Faucet**         | faucet.axionax.org           | 🟡 DNS pending | `docker-compose.vps3-faucet.yml` on VPS 3            |

**Chain ID**: `86137` (`0x15079`) • **Native token**: AXX (18 dec) • **Block time**: 2 s • **Genesis SHA-256**: `0xed1bdac7…c762b55`

📊 **[Testnet Status](TESTNET_STATUS.md)** | **[Infrastructure Status](INFRASTRUCTURE_STATUS.md)** | **[Chain ID Configuration](CHAIN_ID_CONFIGURATION.md)**

---

## 🚀 Quick Start

### Prerequisites Installation

We provide automated dependency installers for all major platforms:

#### 🐧 Linux (Ubuntu/Debian/CentOS/RHEL/Arch/Alpine)

```bash
curl -sSL https://raw.githubusercontent.com/axionaxprotocol/axionax-core/main/scripts/install_dependencies_linux.sh | bash
```

#### 🪟 Windows (PowerShell as Administrator)

```powershell
irm https://raw.githubusercontent.com/axionaxprotocol/axionax-core/main/scripts/install_dependencies_windows.ps1 | iex
```

#### 🍎 macOS (10.15+)

```bash
curl -sSL https://raw.githubusercontent.com/axionaxprotocol/axionax-core/main/scripts/install_dependencies_macos.sh | bash
```

**These scripts install:** Rust, Node.js, Python, Docker, PostgreSQL, Nginx, Redis, and all development tools.

### Build & Run

```bash
# Clone repository
git clone https://github.com/axionaxprotocol/axionax-core.git
cd axionax-core

# Build all components
cargo build --release --workspace

# Run tests
python3 tests/integration_simple.py
```

📖 **[Full Getting Started Guide →](../GETTING_STARTED.md)**

- [Getting Started](../GETTING_STARTED.md)
- [Quick Start Guide](../QUICKSTART.md)
- [Build Instructions](./BUILD.md)

## 📚 Core Documentation

### Architecture & Design

- [Architecture Overview](../ARCHITECTURE.md)
- [Architecture Compliance v1.8.0](./ARCHITECTURE_COMPLIANCE_v1.8.0.md)
- [New Architecture](../NEW_ARCHITECTURE.md)
- [Project Structure](../PROJECT_STRUCTURE.md)

### Core Modules (v1.9.0)

- **PoPC** - Proof-of-Probabilistic-Checking Consensus (sample_size=1000, confidence=0.99)
- **ASR** - Auto-Selection Router (K=64, max_quota=12.5%)
- **PPC** - Posted Price Controller (utilization-based pricing)
- **DA** - Data Availability Subsystem (erasure coding with replication)

### Development

- [API Reference](./API_REFERENCE.md)
- [Testing Guide](../TESTING_GUIDE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

## 🔐 Security & Governance

- [Security Implementation](../SECURITY.md)
- [Governance Model](../GOVERNANCE.md)
- [Tokenomics](../TOKENOMICS.md)

## 🌐 Testnet

- [Testnet Integration](./TESTNET_INTEGRATION.md)
- [Testnet in a Box](../axionax_v1.5_Testnet_in_a_Box/)

## 📈 Project Status

- [Current Status](../STATUS.md)
- [Roadmap](../ROADMAP.md)
- [Project Completion](../PROJECT_COMPLETION.md)

## 🔗 Resources

- [GitHub Repository](https://github.com/axionaxprotocol/axionax-core)
- [Open Issues](https://github.com/axionaxprotocol/axionax-core/issues)
- [v1.9.0 Testnet Milestone](https://github.com/axionaxprotocol/axionax-core/milestone/1)

## 📜 License

axionax protocol is open source software. See [LICENSE](../LICENSE) and [LICENSE NOTICE](../LICENSE_NOTICE.md) for details.

---

_Documentation for Axionax Protocol v1.9.0 — Genesis Public Testnet · Last Updated: April 24, 2026 · Synced `axionax-core-universe@28f42cf`_
