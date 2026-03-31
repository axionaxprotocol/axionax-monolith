# AXIONAX PROTOCOL — GLOBAL DEVELOPMENT RULES

> **Master Rules Document** — AI Agents and all contributors must read this before working on any part of the Axionax Protocol.  
> For tech-specific deep-dives, refer to `.cursor/rules/` after reading this file.

---

## 1. Project Architecture & Monorepo Overview

Axionax Protocol is split into two main repositories:

| Repository | Stack | Purpose |
|---|---|---|
| `axionax-core-universe` (this repo) | Rust + Python | Blockchain Core, PoPC Consensus, DeAI Engine, Node, RPC, Ops |
| `axionax-web-universe` | TypeScript / Next.js | DApp Portal, Marketplace, SDK, Mobile API |

### Core Universe Structure

```
axionax-core-universe/
├── core/                  ← Rust Cargo workspace (core/Cargo.toml is the root)
│   ├── core/consensus/    ← PoPC consensus engine + Merkle proofs
│   ├── core/blockchain/   ← Block/tx management, mempool, sled storage
│   ├── core/node/         ← Full node orchestration (AxionaxNode)
│   ├── core/network/      ← libp2p P2P + reputation system
│   ├── core/rpc/          ← JSON-RPC 2.0 (eth_* EVM-compatible)
│   ├── core/state/        ← RocksDB state DB
│   ├── core/staking/      ← Native staking/delegation/slashing/rewards
│   ├── core/governance/   ← On-chain proposals and voting
│   ├── core/crypto/       ← Ed25519, Blake3, SHA3, VRF primitives
│   ├── core/genesis/      ← Genesis block and balance seeding
│   ├── core/events/       ← Event bus (WebSocket subscriptions)
│   ├── core/da/           ← Data Availability (erasure coding)
│   ├── core/asr/          ← Auto-Selection Router (worker selection via VRF)
│   ├── core/ppc/          ← Predictive Pricing Controller
│   ├── core/vrf/          ← Verifiable Random Function
│   ├── core/metrics/      ← Prometheus metrics
│   ├── core/cli/          ← CLI binary
│   ├── core/config/       ← Unified config (YAML/TOML)
│   ├── bridge/rust-python/ ← PyO3 Rust↔Python bridge
│   ├── tools/faucet/      ← Testnet faucet
│   └── deai/              ← Python DeAI worker layer
├── configs/               ← Monolith/Scout TOML configs
├── ops/deploy/            ← Docker Compose, environments, monitoring
├── scripts/               ← Node operation helper scripts
└── tools/                 ← Development utilities
```

**Rule of Thumb:** Before writing any code, identify which crate/module is affected. Run commands from `core/` using `core/Cargo.toml` as workspace root. Never restructure the workspace without explicit direction.

---

## 2. Core Principles

### 2.1 Security-First (Non-Negotiable)

- Every line that touches **blockchain state**, **wallet keys**, or **consensus logic** must have **explicit error handling** — no panics allowed in production paths.
- **Zero-Trust:** All P2P messages and Worker RPC calls must be authenticated (Ed25519 signature or API key).
- **Deterministic Consensus:** PoPC challenges must be reproducible given the same VRF seed. Never introduce randomness outside of the VRF module.
- **Self-Sufficient at Runtime:** The node must operate without calling external APIs (PyPI, npm, crates.io, telemetry) at runtime. See `docs/SELF_SUFFICIENCY.md`.

### 2.2 No Shortcuts on Correctness

- State root must be computed from actual account/storage Merkle tree — never a hash of block metadata alone.
- Gas accounting must reflect real transaction cost — `gas_used = 0` is only acceptable as a documented testnet placeholder.
- Validator selection must be deterministic (VRF-based round-robin over sorted active validators), not peer_id hashes in production.

### 2.3 Preserve Backward Compatibility

- Never change the genesis block hash, chain ID (`86137` testnet / `86150` mainnet), or the signing payload format of `Transaction` without a versioned migration plan.

---

## 3. Language-Specific Constraints

### 3.1 Rust (`core/`)

```
cargo clippy --workspace -- -D warnings   # must pass — zero warnings
cargo fmt --all                            # must pass before any PR
cargo test --workspace                     # must pass — currently 201/201
cargo audit                               # run before release (audit.toml configured)
```

| Rule | Detail |
|---|---|
| **No `unwrap()` / `expect()`** | Use `Result<T,E>` + `?` operator everywhere in production code |
| **No `unsafe`** | Only for PyO3 FFI bridge and hardware-level GPU code — must be documented |
| **No `clone()` without justification** | Use references (`&T`, `&[T]`) and lifetimes; document every `.clone()` in hot paths |
| **Tokio async** | All async code uses `tokio`. Avoid mixing `std::thread` with async unless necessary |
| **Deadlock prevention** | Prefer `mpsc` channels over shared `Mutex`; never hold a lock across an `.await` |
| **Error types** | Use `thiserror` for library crates, `anyhow` for binary/node orchestration |
| **Tests** | Unit tests in same file `#[cfg(test)]`; integration tests in `tests/`; benchmarks in `benches/` |
| **Saturating math** | Use `saturating_add` / `saturating_sub` for token amounts to prevent overflow |

### 3.2 Python (`core/deai/`)

| Rule | Detail |
|---|---|
| **Type hints mandatory** | ALL function signatures must have type annotations (`from typing import ...`) |
| **Async I/O** | RPC calls and network I/O must use `asyncio` / `aiohttp` — never blocking in async context |
| **No hardcoded secrets** | Always use `os.environ.get("KEY")` — never hardcode API keys or private keys |
| **Pydantic / dataclasses** | Use `@dataclass` or Pydantic for all data structures exchanged with the Rust core |
| **Retry with backoff** | External API calls (Gemini, Vertex AI) must use exponential backoff |
| **Docker sandbox** | All untrusted compute jobs run in `DockerSandbox` — never execute arbitrary code on the host |
| **Tests** | `pytest` from `core/deai/`; run with `python -m pytest . -v --tb=short` |

### 3.3 TypeScript (`axionax-web-universe/`)

| Rule | Detail |
|---|---|
| **No `any`** | TypeScript strict mode — never use `any` or `@ts-ignore` |
| **No relative cross-package imports** | Always use workspace aliases: `import { ... } from "@axionax/sdk"` |
| **Server Components by default** | In Next.js App Router: default to RSC, add `"use client"` only when using React hooks |
| **Business logic in SDK** | All blockchain logic, ABI parsing, RPC calls go into `packages/sdk`, not in app components |
| **No secrets in frontend** | Use `NEXT_PUBLIC_*` env vars for client-side only; never expose private keys |
| **pnpm only** | Never use `npm` or `yarn` in the web-universe root |

---

## 4. Git & Commit Workflow

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short description>

Types: feat | fix | chore | docs | refactor | test | perf | security
Scopes: core | consensus | rpc | staking | governance | node | network | deai | faucet | ops | web | sdk | marketplace
```

**Examples:**
```
feat(node): add FinalityTracker with ≥2/3 majority confirmation
fix(rpc): correct nonce validation in send_raw_transaction
security(staking): enforce stake reduction on unstake
test(consensus): add Merkle proof edge cases for dedup sampling
docs(deai): update worker_config.toml field descriptions
```

### Hard Rules

- **NEVER** commit `.env`, `worker_key.json`, private keys, or any file in `.gitignore`
- **NEVER** force-push to `main` without team consensus
- All PRs must pass `cargo test --workspace` (Rust) and `pytest` (Python) before merge
- Security-related changes require review from at least one additional engineer

---

## 5. Environment & Secrets Management

| Variable | Used In | Notes |
|---|---|---|
| `AXIONAX_RPC_URL` | Python worker, scripts | Override bootnode RPC |
| `AXIONAX_BOOTNODES` | Worker config | Comma-separated RPC URLs |
| `AXIONAX_CHAIN_ID` | All | `86137` testnet, `86150` mainnet |
| `AXIONAX_WALLET_PATH` | Worker | Path to `worker_key.json` |
| `WORKER_KEY_PASSWORD` | Worker | Wallet decryption password |
| `WORKER_PRIVATE_KEY` | Worker | Direct key injection (production) |
| `AXIONAX_VALIDATOR_ADDRESS` | Node | Validator address for block proposals |
| `AXIONAX_BOOTSTRAP_NODES` | Node (Rust) | Comma-separated libp2p multiaddrs |
| `AXIONAX_RPC_CORS_ORIGINS` | RPC server | Comma-separated allowed origins |
| `AXIONAX_RPC_API_KEY` | RPC server | X-API-Key authentication |

---

## 6. Network & Chain Constants

| Constant | Value | Notes |
|---|---|---|
| Testnet Chain ID | `86137` | Pre-Testnet Phase 2 |
| Mainnet Chain ID | `86150` | Future |
| Block reward | `1_000_000_000_000_000_000` wei (1 AXX) | Credited to proposer |
| Min validator stake | `10_000 × 10^18` (10,000 AXX) | |
| Finality threshold | ≥ 2/3 active validators | FinalityTracker |
| PoPC sample size | `1000` (capped to output size) | Deduplication enforced |
| Fraud window | ~3600 blocks (~1 hour at 2s/block) | |
| RPC port | `8545` | JSON-RPC 2.0 |
| Health port | `8080` | HTTP health/metrics |
| P2P port | `30333` | libp2p |

---

## 7. Documentation Hierarchy

1. **This file (`RULES.md`)** — Global master rules (read first)
2. **`SKILLS.md`** — AI agent domain knowledge and capability map
3. **`.cursor/rules/`** — Tech-specific deep-dive rules:
   - `rust-core.mdc` — Rust blockchain code
   - `python-deai.mdc` — Python DeAI worker
   - `frontend.mdc` / `frontend-web-universe.mdc` — TypeScript/Next.js
   - `backend-core-universe.mdc` — Backend ops and scripts
   - `protocol-principles.mdc` — Protocol philosophy (Self-Sufficiency, Cyber Defense)
4. **`docs/`** — Architecture, API Reference, Deployment Guide
5. **`core/CHANGELOG.md`** — Version history and what changed

---

## 8. Known Limitations (Active TODOs)

| Area | Status | Priority |
|---|---|---|
| ~~`state_root` — SHA3 heuristic~~ | ✅ **Done** — real Blake2s-256 Merkle root (`state/src/merkle.rs`) | — |
| ~~`gas_used = 0` in locally produced blocks~~ | ✅ **Done** — sum of `tx.gas_limit` per block | — |
| ~~Worker registration / result submission~~ | ✅ **Done** — `ContractManager` live mode + `JobMarketplaceStandalone.sol` + deploy script | — |
| ~~`NetworkManager::shutdown()` — commented out~~ | ✅ **Done** — `shutdown()` implemented and wired into `AxionaxNode::shutdown()` | — |
| Smart contract deployment on testnet | Pending — run `ops/scripts/deploy_marketplace.py` after testnet is live | � Medium |
| Blockscout `SECRET_KEY_BASE` | Replace placeholder in `ops/deploy/.../explorer.env` before deploying | 🟡 Medium |
| Validator selection — fallback to `peer_id` hash | Should be VRF-based in production (currently round-robin over sorted validators) | � Medium |

> **When working on any of the above areas:** check with the team before changing the interface, as downstream code depends on the current behavior.

---

*Last updated: 2026-03-31 | Version: 2.1 | Aligned with Core v1.10.0*
