# Axionax Protocol Documentation

> **Monolithic Documentation Hub** — One repo · Two universes · Civilization OS

[![Chain ID](https://img.shields.io/badge/Testnet-86137-orange?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-AGPLv3%2FMIT-blue?style=flat-square)](#)

---

## Quick Navigation

| Section | Description | Path |
|---------|-------------|------|
| **Project Overview** | DePIN, Vision, Hardware, Roadmap | [`./MASTER_SUMMARY.md`](./MASTER_SUMMARY.md) |
| **Web Universe** | Frontend, dApp, Marketplace, Hosting | [`./web/`](./web/) |
| **Core Universe** | Blockchain, DeAI, Network, Nodes | [`./core/`](./core/) |
| **Cross-cutting** | Protocol-wide docs | |
| **Playbook** | Internal guides for AI assistants & developers | [`./playbook/`](./playbook/) |
| **Architecture** | Protocol design, roadmap, tokenomics | [`./architecture/`](./architecture/) |
| **API Reference** | JSON-RPC, WebSocket endpoints | [`./api/`](./api/) |
| **Guides** | Setup guides for validators and workers | [`./guides/`](./guides/) |

---

## Domain-Specific Docs

### Web Universe (`docs/web/`)
- **Hosting & Deployment**: [`web/HOSTING.md`](./web/HOSTING.md), [`web/DEPLOY.md`](./web/DEPLOY.md)
- **Development**: [`web/DEVELOPMENT.md`](./web/DEVELOPMENT.md), [`web/SYSTEM_ARCHITECTURE.md`](./web/SYSTEM_ARCHITECTURE.md)
- **Integration**: [`web/web-integration/`](./web/web-integration/)
- **Audits**: [`web/audits/`](./web/audits/)

### Core Universe (`docs/core/`)
- **Architecture**: [`core/ARCHITECTURE_OVERVIEW.md`](./core/ARCHITECTURE_OVERVIEW.md), [`core/AXIONAX_BIBLE.md`](./core/AXIONAX_BIBLE.md)
- **Network**: [`core/NETWORK_NODES.md`](./core/NETWORK_NODES.md), [`core/NODE_SPECS.md`](./core/NODE_SPECS.md)
- **Marketplace**: [`core/MARKETPLACE_WORKER_NODES.md`](./core/MARKETPLACE_WORKER_NODES.md)
- **Sentinels**: [`core/SENTINELS.md`](./core/SENTINELS.md)
- **API**: [`core/API_REFERENCE.md`](./core/API_REFERENCE.md), [`core/RPC_API.md`](./core/RPC_API.md)

---

## Documentation Boundaries

> **Critical Rule**: Follow the Web ↔ Core split defined in [`.windsurfrules`](../.windsurfrules)

| Domain | Location | Communication |
|--------|----------|---------------|
| **Web** | `apps/*` | Consumes RPC at port 8545 |
| **Core** | `services/core/*` | Provides RPC at port 8545 |

**Never** cross-import between domains. They communicate **only** via JSON-RPC.

---

## File Organization

```
docs/
├── README.md              # This file — central index
├── MASTER_SUMMARY.md      # Project overview (DePIN, Vision, Roadmap)
├── CONTRIBUTING.md        # Documentation contribution guidelines
├── CHANGELOG.md           # Documentation change history
├── glossary.md            # Technical terms and definitions
│
├── web/                   # Web Universe docs (from apps/web/)
│   ├── README.md
│   ├── HOSTING.md
│   ├── DEVELOPMENT.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   ├── SECURITY.md
│   ├── web-integration/   # Join testnet, quickstart, tutorials
│   └── audits/            # Audit reports
│
├── core/                  # Core Universe docs (from services/core/)
│   ├── README.md
│   ├── ARCHITECTURE_OVERVIEW.md
│   ├── NETWORK_NODES.md
│   ├── NODE_SPECS.md
│   ├── MARKETPLACE_WORKER_NODES.md
│   ├── SENTINELS.md
│   ├── API_REFERENCE.md
│   └── sdk-types/         # TypeScript types
│
├── playbook/              # AI assistant guides
│   ├── compossor-and-cascade-playbook.md
│   └── monorepo-audit.md
│
├── architecture/          # Cross-cutting protocol architecture
│   ├── AXIONAX_PROTOCOL.md
│   ├── ROADMAP.md
│   ├── TOKENOMICS.md
│   ├── TOKENOMICS_TESTNET.md
│   └── GOVERNANCE.md
│
├── api/                   # Cross-cutting API specifications
│   └── JSON_RPC.md        # JSON-RPC + WebSocket + Staking + Governance
│
└── guides/                # Setup and operational guides
    ├── VALIDATOR_SETUP.md
    └── WORKER_SETUP.md
```

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for commit format and style guidelines.

| Type | Scope | Example |
|------|-------|---------|
| `docs` | `web`, `core`, `protocol` | `docs(protocol): update PoPC consensus spec` |

---

_Last updated: May 3, 2026_
