# Architecture Overview — Axionax Core Universe

Single entry point for **how the protocol is structured** in this repository: layers from users down to hardware, where code lives, and which docs to read next.

**Audience:** engineers onboarding to `axionax-core-universe`, reviewers, and operators who need a map before diving into RPC specs or runbooks.

---

## Contents

1. [Purpose & scope](#1-purpose--scope)  
2. [System stack](#2-system-stack)  
3. [Repository layout](#3-repository-layout)  
4. [Rust workspace (crates)](#4-rust-workspace-crates)  
5. [Network & node roles](#5-network--node-roles)  
6. [DeAI & compute](#6-deai--compute)  
7. [Hardware program (Monolith)](#7-hardware-program-monolith)  
8. [Product vision (pointer)](#8-product-vision-pointer)  
9. [Production code & deployment readiness](#9-production-code--deployment-readiness)  
10. [Related documentation](#10-related-documentation)

---

## 1. Purpose & scope

| In scope here | Out of scope (see linked docs) |
|-----------------|--------------------------------|
| Logical layers and data flow | Every JSON-RPC method → [RPC_API.md](./RPC_API.md) |
| Folder ↔ responsibility | VPS runbooks, genesis day → repo `docs/`, [RUNBOOK.md](./RUNBOOK.md) |
| List of Rust workspace crates | Full API signatures → [API_REFERENCE.md](./API_REFERENCE.md) |
| **Production readiness checklist** | [§9](#9-production-code--deployment-readiness) + linked runbooks / audit docs |

Canonical doc index for the whole repo: [AXIONAX_BIBLE.md](../../docs/AXIONAX_BIBLE.md).

---

## 2. System stack

Traffic flows **down** from clients; trust and execution anchor in **Rust core**, with **Python DeAI** for off-chain / worker compute and **HAL** for hardware backends.

### 2.1 Layer summary

| # | Layer | Responsibility |
|---|--------|----------------|
| L1 | **Clients** | Web, dApps, wallets, marketplace UIs |
| L2 | **Edge services** | Explorer (e.g. Blockscout), faucet, monitoring (Prometheus/Grafana) |
| L3 | **RPC** | JSON-RPC (HTTP/WebSocket); Ethereum-style and custom methods |
| L4 | **Chain & P2P** | Validators, bootnodes, full/light nodes; sync and block production |
| L5 | **Core (Rust)** | State, consensus, mempool, staking, governance, genesis, metrics |
| L6 | **DeAI (Python)** | Worker node, marketplace integration, optional optical / ML paths |
| L7 | **HAL** | SILICON (CPU/GPU), NPU (e.g. Hailo), PHOTONIC (simulation / roadmap) |

### 2.2 Ecosystem diagram

```
                         AXIONAX ECOSYSTEM (clients & services)
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Web / dApps│ │ Marketplace│ │ Explorer   │ │ Faucet     │
└─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
      └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ RPC (8545 / 8546)    │
                   └──────────┬───────────┘
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌───────────┐        ┌───────────┐        ┌─────────────────┐
   │ P2P chain │        │ DeAI      │        │ Infra services  │
   │ (val,     │        │ workers   │        │ (explorer,      │
   │  boot,    │        │           │        │  metrics, etc.) │
   │  full…)   │        │           │        └─────────────────┘
   └─────┬─────┘        └─────┬─────┘
         └────────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ Rust core + Python DeAI       │
              │ (state, consensus, rpc, …)    │
              └───────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │ HAL: SILICON │ NPU │ PHOTONIC │
              └───────────────────────────────┘
```

*Tip: use a **monospace** font in the editor so column alignment matches the diagram.*

### 2.3 Same diagram (Mermaid — renders on GitHub / many Markdown viewers)

```mermaid
flowchart TB
  subgraph L1["Clients & services"]
    W[Web / dApps]
    MP[Marketplace]
    EX[Explorer]
    FA[Faucet]
  end

  RPC["RPC (HTTP 8545 / WS 8546)"]

  subgraph L3["Behind RPC"]
    P2P["P2P chain\n(val, boot, full …)"]
    DEAI["DeAI workers"]
    INFRA["Infra services\n(explorer backend, metrics, …)"]
  end

  CORE["Rust core + Python DeAI\n(state, consensus, rpc, …)"]
  HAL["HAL: SILICON | NPU | PHOTONIC"]

  L1 --> RPC
  RPC --> P2P
  RPC --> DEAI
  RPC --> INFRA
  P2P --> CORE
  DEAI --> CORE
  INFRA --> CORE
  CORE --> HAL
```

---

## 3. Repository layout

Top-level map of **this monorepo** (paths relative to repo root).

| Path | Role |
|------|------|
| `core/` | **Cargo workspace root** — protocol crates under `core/core/`, `core/deai/`, `core/bridge/`, `core/tools/` |
| `core/deai/` | Python worker, HAL, RPC client helpers, tests |
| `core/photonic/` | Photonic / MK-II research notes (not a Cargo workspace member) |
| `ops/deploy/` | Dockerfiles, compose, nginx, monitoring, **public testnet:** `environments/testnet/public/` |
| `scripts/` | Readiness scripts, `load_test/`, optimize suite, security helpers |
| `docs/` | Launch, MetaMask, readiness, [AXIONAX_BIBLE.md](../../docs/AXIONAX_BIBLE.md) |
| `reports/` | Generated readiness / benchmark outputs (when committed or local) |
| `configs/` | Monolith / HYDRA sentinel & worker TOML examples |
| `tools/` | Root-level devtools (Python, analysis) |
| `hydra_manager.py` | HYDRA dual-core controller (MK-I tooling) |

**Build tip:** Node binary is built from workspace package `node` → `axionax-node`. Image build: `ops/deploy/Dockerfile` with context `core/`.

---

## 4. Rust workspace (crates)

Defined in `core/Cargo.toml`: **18 protocol crates** in `core/core/`, plus **`bridge/rust-python`** and **`tools/faucet`**.

### 4.1 Protocol & execution

| Crate | Role |
|-------|------|
| `blockchain` | Blocks, chain, mempool integration |
| `consensus` | PoPC; Proof-of-Light (simulation) |
| `crypto` | Primitives; **ECVRF** (schnorrkel) on production VRF paths |
| `network` | libp2p, gossip, capabilities (ASR / Monolith hints) |
| `state` | Persistent state (e.g. RocksDB) |
| `node` | Binary `axionax-node` — wires network, state, RPC, roles |
| `rpc` | JSON-RPC server, health, metrics hooks |
| `config` | Configuration loading |

### 4.2 Economics & coordination

| Crate | Role |
|-------|------|
| `staking` | Stake, delegate, slash |
| `governance` | Proposals, voting |
| `ppc` | Posted Price Controller (compute pricing) |
| `da` | Data availability (erasure coding) |
| `asr` | Auto-Selection Router (VRF-weighted worker selection) |
| `vrf` | VRF interfaces; prefer ECVRF stack in new code |

### 4.3 Observability, tooling & integration

| Crate | Role |
|-------|------|
| `events` | Internal event / pub-sub style hooks |
| `metrics` | Prometheus export |
| `cli` | CLI entrypoints |
| `genesis` | Genesis generation and chain parameters |
| `bridge/rust-python` | PyO3 bridge for Python ↔ Rust |
| `tools/faucet` | Rust faucet binary (deploy may use separate faucet image) |

---

## 5. Network & node roles

- **Chain participants:** validator, bootnode, full node, light node (as implemented).  
- **Off-chain / ops:** dedicated RPC service, explorer backend, faucet, monitoring.

Authoritative list and responsibilities: [NETWORK_NODES.md](./NETWORK_NODES.md).  
Sizing (CPU/RAM/disk): [NODE_SPECS.md](./NODE_SPECS.md).

---

## 6. DeAI & compute

| Component | Location / note |
|-----------|------------------|
| Worker process | `core/deai/worker_node.py` — jobs: inference, training, data processing |
| HAL | `core/deai/compute_backend.py` — **SILICON**, **NPU**, **PHOTONIC**, **HYBRID** |
| Marketplace | Contract-facing flows (register, jobs, results) — see DeAI docs |
| Worker selection | Rust **ASR** + **VRF** on-chain / protocol side |

Worker taxonomy: [MARKETPLACE_WORKER_NODES.md](./MARKETPLACE_WORKER_NODES.md).

---

## 7. Hardware program (Monolith)

| Gen | Codename | Focus | In repo (typical) |
|-----|----------|--------|-------------------|
| MK-I | Vanguard / Origin | Silicon + NPU (e.g. Hailo, RPi class) | HAL, HYDRA configs |
| MK-II | Prism | Path to photonic; simulation | Optical / PoL simulation code paths |
| MK-III | Ethereal | Photonic scale-out | Roadmap |
| MK-IV | Gaia | Long-term vision | Roadmap |

Detail: [MONOLITH_ROADMAP.md](./MONOLITH_ROADMAP.md).

---

## 8. Product vision (pointer)

High-level narrative (pillars, engines, phases): [PROJECT_ASCENSION.md](./PROJECT_ASCENSION.md).  
Security framing (Sentinels, self-sufficiency): [SENTINELS.md](./SENTINELS.md), [SELF_SUFFICIENCY.md](../../docs/SELF_SUFFICIENCY.md).

---

## 9. Production code & deployment readiness

This section maps **how “production-ready” is defined in this repo** and where to verify it. It is **not** a legal guarantee or mainnet go-live sign-off.

### 9.1 Definitions

| Term | Meaning here |
|------|----------------|
| **Production-grade testnet** | Chain + RPC + supporting services behave in a **stable, observable** way suitable for sustained testing (consensus alignment, RPC health, basic SLOs). Criteria: [TESTNET_PRODUCTION_READINESS.md](../../docs/TESTNET_PRODUCTION_READINESS.md). |
| **Mainnet production** | Separate genesis (chain ID **86150**), keys, infra, and **audit / governance** gates — see [MAINNET_PRODUCTION_PLAN.md](../../docs/MAINNET_PRODUCTION_PLAN.md). Not implied by testnet readiness alone. |

### 9.2 Build & quality gates (code)

| Area | What to run / expect |
|------|----------------------|
| **Rust release binary** | From `core/`: `cargo build --release -p node` → `axionax-node` (used in Docker and VPS scripts). |
| **CI** | Root [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml): fmt, clippy, tests, audit (paths under `core/`). |
| **Python (DeAI)** | From `core/deai/`: `pytest`; use env-based secrets, not committed keys ([`core/deai/README.md`](../deai/README.md) patterns). |
| **Docker image** | [`ops/deploy/Dockerfile`](../../ops/deploy/Dockerfile), build context **`core/`** — matches public testnet redeploy flow. |

### 9.3 Automated checks (operators & integrators)

| Script / artifact | Purpose |
|-------------------|---------|
| `scripts/check_testnet_production_readiness.py` | Validates chain ID, heights, optional multi-validator consensus, public RPC lag, faucet HTTP — writes `reports/TESTNET_PRODUCTION_READINESS_LAST.md`. |
| `scripts/load_test/tps_finality_test.py` | Block-time / TPS-style probes against JSON-RPC (`--mode block-time` needs no funded key). |
| `scripts/verify-production-ready.py` | Broader readiness sweep (see root [README.md](../../README.md) tooling table). |
| `scripts/optimize_suite/` | Performance / tuning experiments (not a single PASS/FAIL for launch). |

### 9.4 Deployment surface (runtime)

| Path | Role |
|------|------|
| `ops/deploy/environments/testnet/public/` | **Canonical** public testnet Compose, env templates, `scripts/redeploy_testnet.sh`. |
| `ops/deploy/monitoring/` | Prometheus / Grafana patterns for node and infra metrics. |
| `core/docs/RUNBOOK.md` | Operational procedures (restarts, incidents). |

Operational hardening (firewall, TLS, rate limits, backups) is **environment-specific** — see deploy docs under `ops/deploy/` and [NODE_SPECS.md](./NODE_SPECS.md).

### 9.5 Security & audit (honest posture)

| Resource | Note |
|----------|------|
| [SECURITY_AUDIT_REPORT.md](../../SECURITY_AUDIT_REPORT.md) | Historical / rolling findings; treat open items as **blockers for “fully audited mainnet”** until closed. |
| [SECURITY_REMEDIATION_PLAN.md](../../SECURITY_REMEDIATION_PLAN.md) | Tracking remediation where applicable. |
| [AUDIT_REPORT_PRELIMINARY.md](../../docs/AUDIT_REPORT_PRELIMINARY.md) | Supplementary audit notes. |

**Code hygiene:** prefer no `unwrap()` / `expect()` on hot protocol paths; follow workspace [rust-core](../../.cursor/rules/rust-core.mdc) conventions in new changes.

### 9.6 Summary status (high level)

| Layer | Typical readiness |
|-------|-------------------|
| **Node + RPC (testnet)** | Deployable via documented Compose + redeploy script; measurable with readiness + block-time scripts. |
| **DeAI worker** | Production paths expect correct env, optional Docker sandbox — see DeAI docs and `AXIONAX_ENV=production` behavior in worker code. |
| **Mainnet** | Planned; requires dedicated genesis, key ceremony, infra, and **closed audit / ops checklist** per mainnet plan. |

---

## 10. Related documentation

### Protocol & nodes

| Doc | Topic |
|-----|--------|
| [NETWORK_NODES.md](./NETWORK_NODES.md) | Node types |
| [NODE_SPECS.md](./NODE_SPECS.md) | Hardware sizing |
| [RPC_API.md](./RPC_API.md) | JSON-RPC catalog |
| [API_REFERENCE.md](./API_REFERENCE.md) | Deeper API reference |

### Security & operations

| Doc | Topic |
|-----|--------|
| [RUNBOOK.md](./RUNBOOK.md) | Incidents, restarts |
| [SENTINELS.md](./SENTINELS.md) | DeAI sentinel roles |
| [TESTNET_PRODUCTION_READINESS.md](../../docs/TESTNET_PRODUCTION_READINESS.md) | Production-grade **testnet** criteria |
| [MAINNET_PRODUCTION_PLAN.md](../../docs/MAINNET_PRODUCTION_PLAN.md) | Mainnet timeline & checklist |
| [SECURITY_AUDIT_REPORT.md](../../SECURITY_AUDIT_REPORT.md) | Audit findings |

### Vision & hardware

| Doc | Topic |
|-----|--------|
| [PROJECT_ASCENSION.md](./PROJECT_ASCENSION.md) | Vision |
| [MONOLITH_ROADMAP.md](./MONOLITH_ROADMAP.md) | MK-I–IV |

### Repo-wide index

| Doc | Topic |
|-----|--------|
| [AXIONAX_BIBLE.md](../../docs/AXIONAX_BIBLE.md) | All books / entry points |

---

**Document:** `core/docs/ARCHITECTURE_OVERVIEW.md`  
**Last updated:** 2026-03-22
