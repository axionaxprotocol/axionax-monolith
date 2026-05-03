# Axionax Documentation Changelog

> **History of documentation changes** — Last Updated: May 3, 2026

---

## 2026-05-03 — Documentation Reorganization v2.0

### Added
- **New structure**: `docs/` reorganized with `playbook/`, `architecture/`, `api/` subdirectories
- **README.md**: Central documentation index at `docs/README.md`
- **GLOSSARY.md**: Technical terms and definitions reference
- **CHANGELOG.md**: This file — tracking documentation changes
- **TOKENOMICS_TESTNET.md**: Complete testnet tokenomics guide

### Changed
- **ROADMAP.md**: Updated to v1.9.0-testnet, Phase 2 marked complete, Phase 3 in progress
- **JSON_RPC.md**: Updated to v1.9.0, added live testnet endpoints (AU, ES validators)
- **apps/web/docs/README.md**: Fixed broken links, removed reference to deleted `apps/docs/`

### Removed
- **apps/web/apps/docs/**: Deleted entire Jekyll site (50+ files including HTML artifacts, _config.yml, assets)
- Legacy duplicate documentation files

### Migration
- `docs/compossor-and-cascade-playbook.md` → `docs/playbook/`
- `docs/monorepo-audit.md` → `docs/playbook/`
- `apps/web/apps/docs/ARCHITECTURE.md` → `docs/architecture/AXIONAX_PROTOCOL.md`
- `apps/web/apps/docs/ROADMAP.md` → `docs/architecture/ROADMAP.md`
- `apps/web/apps/docs/API_REFERENCE.md` → `docs/api/JSON_RPC.md`

---

## 2026-04-24 — Genesis Public Testnet Launch

### Added
- **Testnet Configuration**: Chain ID 86137, Symbol AXXt
- **Validator Infrastructure**: 2 validators (AU: 46.250.244.4, ES: 217.216.109.5)
- **Faucet Service**: Port 3002 for testnet token distribution
- **P2P Network**: Bootstrap nodes operational on port 30303

### Documents Updated
- `services/core/core/docs/MAINNET_GENESIS_CHECKLIST.md`: Q2 2026 preparation
- `apps/web/apps/docs/TESTNET_STATUS.md`: Three-VPS topology documented
- `apps/web/apps/docs/JOIN_TESTNET.md`: Block time 2s + faucet instructions

---

## 2026-04-01 — Core v1.9.0 Development

### Added
- **PoPC Consensus**: Full implementation with s=1000, confidence=0.99
- **ASR Configuration**: K=64, max_quota=12.5%
- **VRF Delay**: k≥2 blocks implementation
- **P2P Handshake Tests**: Passing cross-node tests (including mDNS)

### Changed
- `services/core/core/network/`: Completed P2P manager with Identify protocol
- `services/core/core/consensus/`: PoPC validation finalized
- `services/core/core/docs/ARCHITECTURE_OVERVIEW.md`: Updated to v1.9.0

---

## 2026-03-15 — Monorepo Structure v1.0

### Added
- **Domain Separation**: Web ↔ Core boundary via `.windsurfrules`
- **Workspace Setup**: pnpm workspace for `apps/*` and `packages/*`
- **Cargo Workspace**: `services/core/core/` as Rust workspace root
- **Slash Commands**: `.windsurf/workflows/` for `/deploy-testnet`, `/run-tests`, `/setup-dev`

### Structure
```
axionax-monolith/
├── apps/
│   ├── web/              # Next.js dApp + marketplace
│   └── os-dashboard/     # Node OS UI
├── services/
│   └── core/             # Rust + Python blockchain core
├── packages/             # Shared TypeScript SDK
├── docs/                 # Cross-cutting docs
└── scripts/              # Ops scripts
```

---

## 2026-02-01 — Documentation Consolidation

### Added
- **Whitepaper v2.1**: Complete protocol specification
- **MASTER_SUMMARY.md**: Project-wide vision and roadmap
- **SECURITY_AUDIT_REPORT.md**: Comprehensive security findings
- **ops/deploy/**: Docker compose for full dev stack

### Changed
- `apps/web/apps/docs/`: Major expansion to 50+ files
- `services/core/docs/`: Core-specific documentation organized

---

## 2026-01-10 — Initial Testnet v1.8.0

### Added
- **Protocol v1.8.0 Compliance**: Full architecture documentation
- **RPC Infrastructure**: Mock + Real node setup
- **Block Explorer**: axionax-web deployment
- **Monitoring**: Grafana + Prometheus dashboards

### Documents
- `API_REFERENCE.md`: Initial JSON-RPC documentation
- `DEPLOYMENT_CHECKLIST.md`: 9-service deployment guide
- `TESTING_GUIDE.md`: Testing strategies and tools

---

## 2025-12-05 — Pre-Testnet Documentation

### Added
- **Phase 1 Complete**: v1.6 Multi-Lang Core documented
- **Rust Core**: Consensus, Blockchain, Crypto modules
- **Python DeAI Layer**: ASR, Fraud Detection
- **TypeScript SDK**: Developer toolkit

### Metrics
- 3x performance improvement over Go
- 2,300+ lines of documentation
- Zero-downtime migration path

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🆕 **Added** | New documentation or sections |
| 🔄 **Changed** | Updates to existing docs |
| 🗑️ **Removed** | Deleted documentation |
| 📦 **Migration** | File moved/renamed |
| ✅ **Complete** | Milestone achieved |
| 🔄 **In Progress** | Ongoing work |

---

## Future Work

- [ ] Complete SDK documentation (Go, Rust, JS)
- [ ] Mainnet launch documentation (Q4 2026 - Q2 2027)
- [ ] Video tutorials and walkthroughs
- [ ] Interactive API explorer
- [ ] Multi-language translations

---

_Last updated: May 3, 2026_
