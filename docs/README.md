# Axionax Protocol Documentation

> **Monolithic Documentation Hub** — One repo · Two universes · Civilization OS

[![Chain ID](https://img.shields.io/badge/Testnet-86137-orange?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-AGPLv3%2FMIT-blue?style=flat-square)](#)

---

## Quick Navigation

| Section | Description | Path |
|---------|-------------|------|
| **Playbook** | Internal guides for AI assistants & developers | [`./playbook/`](./playbook/) |
| **Architecture** | Protocol design, roadmap, tokenomics | [`./architecture/`](./architecture/) |
| **API Reference** | JSON-RPC, WebSocket endpoints | [`./api/`](./api/) |

---

## Domain-Specific Docs

### Web Universe (`apps/`)
- **Public dApp + Marketplace**: [`apps/web/docs/`](../apps/web/docs/)
- **OS Dashboard**: [`apps/os-dashboard/`](../apps/os-dashboard/)

### Core Universe (`services/`)
- **Blockchain Core**: [`services/core/docs/`](../services/core/docs/)
- **DeAI Worker**: [`services/core/core/deai/`](../services/core/core/deai/)

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
├── playbook/              # AI assistant guides (moved from root docs/)
│   ├── compossor-and-cascade-playbook.md
│   └── monorepo-audit.md
├── architecture/          # Protocol-level architecture
│   ├── AXIONAX_PROTOCOL.md
│   └── ROADMAP.md
└── api/                   # API specifications
    ├── JSON_RPC.md
    └── WEBSOCKET.md
```

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for commit format and style guidelines.

| Type | Scope | Example |
|------|-------|---------|
| `docs` | `web`, `core`, `protocol` | `docs(protocol): update PoPC consensus spec` |

---

_Last updated: May 3, 2026_
