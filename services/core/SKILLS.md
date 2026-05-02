# AXIONAX PROTOCOL — AI AGENT SKILLS & DOMAIN KNOWLEDGE

> This document defines the domain expertise an AI Agent must possess (or acquire from context) before contributing to the Axionax Protocol.  
> Read `RULES.md` first, then use this file to calibrate the agent's reasoning scope.

---

## 1. Blockchain & Consensus Engineering

### 1.1 PoPC — Proof of Probabilistic Checking (Core Consensus)

Axionax uses **PoPC** (not PoW, PoS, or BFT alone). The agent must understand:

- **Statistical sampling over full re-execution:** PoPC samples `s` chunks out of `n` output chunks (`O(s)` vs `O(n)`). Given fraud rate `f`, detection probability = `1 - (1-f)^s`.
- **Challenge generation:** Deterministic via VRF seed → SHA3 hash chain → sample indices (deduplicated since v1.9.0).
- **Merkle proof verification:** Each sampled chunk must produce a valid `MerkleProof` against the expected root. See `core/core/consensus/src/merkle.rs`.
- **False-pass penalty:** `false_pass_penalty_bps = 500` (5%) slashed from validator stake on fraud.
- **Key parameters (testnet):** `sample_size=1000`, `min_confidence=0.99`, `fraud_window=3600s`, `min_validator_stake=10,000 AXX`.
- **FinalityTracker (v1.9.0):** Block is finalized when ≥ 2/3 active validators send `BlockConfirmation`. Tracked in `core/core/node/src/lib.rs`.

### 1.2 Cryptographic Primitives

| Primitive | Library | Usage |
|---|---|---|
| Ed25519 key pairs | `ed25519-dalek` | Transaction signing, node identity |
| SHA3-256 | `sha3` | Block hash, state root heuristic, PoPC sampling |
| Blake2s-256 / Blake2b-512 | `blake2` | Transaction hash, data integrity |
| VRF (ECVRF) | `core/core/vrf/` | Validator selection, PoPC seed generation |
| Merkle Trees | `core/core/consensus/src/merkle.rs` | Proof of output integrity |
| KDF (Argon2-like) | `core/core/crypto/src/kdf.rs` | Wallet key derivation |

**Transaction signing flow:**
1. Build `signing_payload()` (from + to + value + gas_price + gas_limit + nonce + data)
2. Sign with Ed25519 `SigningKey`
3. Derive address from `VerifyingKey` (Blake2s hash → hex prefix "0x")
4. Attach `signature` (64 bytes) + `signer_public_key` (32 bytes) to `Transaction`

### 1.3 P2P Networking (libp2p)

- **Transport:** TCP + Noise encryption + Yamux multiplexing
- **Discovery:** mDNS (local) + Kademlia bootstrap (remote)
- **Messaging:** GossipSub topics: `axionax/blocks`, `axionax/transactions`, `axionax/confirmations`
- **Reputation:** Each peer has a score; failures decrease score; ban threshold enforced. See `core/core/network/src/reputation.rs`.
- **Identity:** Ed25519 keypair persisted to file (loaded on restart). Ephemeral if no `--identity-key` provided.
- **Message types:** `Block`, `Transaction`, `BlockConfirmation` (v1.9.0+)

### 1.4 State & Storage

- **StateDB:** RocksDB (`core/core/state/`) — stores blocks by number and hash, transactions, account balances/nonces, chain height.
- **SledBlockStore:** Sled embedded DB (`core/core/blockchain/src/storage.rs`) — alternate block store.
- **Genesis:** Seeded via `GenesisGenerator::mainnet()` on first run if chain is empty. Balances from `genesis.json`.
- **Account model:** EVM-compatible addresses (0x-prefixed 40 hex chars), balance in wei, nonce per account.

---

## 2. Decentralized AI (DeAI) & Compute

### 2.1 Worker Node Architecture

The Python worker (`core/deai/worker_node.py`) connects to the blockchain and processes compute jobs:

```
RPC Client → poll for jobs → DockerSandbox → execute → submit result + PoPC proof
```

Key components:
- **`ModelCache`** — LRU cache for AI models (avoids reload latency). Max `N` models in memory, evicts LRU.
- **`DockerSandbox`** — Isolated execution environment for untrusted compute jobs. Resource limits: CPU, RAM, timeout.
- **`WalletManager`** — Ed25519 key management. Loads from file or `WORKER_PRIVATE_KEY` env.
- **`ContractManager`** — Smart contract interaction (mock until deployment).
- **`NetworkManager`** — Peer discovery and connection management.
- **`FraudDetector`** — Scikit-learn `IsolationForest` for anomaly detection on PoPC proofs.

### 2.2 Hardware Tiers

| Tier | Hardware | Role | Config |
|---|---|---|---|
| Tier 5 (Edge) | Raspberry Pi 5 + Hailo-10H NPU | Scout / inference worker | `monolith_scout_single.toml` |
| HYDRA | RPi5 + dual Hailo (Sentinel + Worker) | Split-brain dual-core | `hydra_manager.py` + `monolith_sentinel.toml` + `monolith_worker.toml` |
| PC / Server | CUDA GPU (AMD/NVIDIA) | General worker | `worker_config.toml` |
| Elite | Mac Mini / Studio | Silicon Archon | `worker_config.toml` |

**Compute types:** `SILICON` (default), `PHOTONIC` (future Monolith Mark-II), `HYBRID`

### 2.3 The 7 Sentinels (Immune Network)

AI models running on Sentinel nodes for autonomous security:

| Sentinel | Function |
|---|---|
| AION-VX | Temporal integrity — detects time manipulation |
| SERAPH-VX | Network defense — detects DDoS / eclipse attacks |
| ORION-VX | Fraud detection — PoPC proof anomaly scoring |
| DIAOCHAN-VX | Reputation scoring — worker reliability model |
| VULCAN-VX | Hardware verification — attestation of compute |
| THEMIS-VX | Dispute resolution — arbitrates contested results |
| NOESIS-VX | GenAI core — governance analysis and high-level reasoning |

### 2.4 Economic Flow (Compute Marketplace)

```
Job Requester → lock AXX (Escrow Smart Contract)
             → ASR selects Worker (VRF + reputation)
             → Worker executes in DockerSandbox
             → Worker submits result + Merkle root
             → PoPC consensus validates sample
             → Payment released / slashing if fraud
             → Marketplace takes 5–10% commission
```

---

## 3. Node Operation & Configuration

### 3.1 Node Roles

| Role | CLI Flag | Behavior |
|---|---|---|
| `full` | `--role full` (default) | Sync, serve RPC, no block production |
| `validator` | `--role validator` | Sync + produce blocks (round-robin) + earn rewards |
| `rpc` | `--role rpc` | RPC-only node (no P2P block production) |
| `bootnode` | `--role bootnode` | P2P relay only |

### 3.2 RPC API (EVM-Compatible)

Core methods: `eth_blockNumber`, `eth_getBlockByNumber`, `eth_getBlockByHash`, `eth_getTransactionByHash`, `eth_chainId`, `net_version`, `eth_getBalance`, `eth_getTransactionCount`, `eth_sendRawTransaction`

Extended methods: `system_status`, `system_health`, `system_version`, `metrics_json`, `metrics_prometheus`, `events_subscribe` (WebSocket), `staking_*`, `governance_*`

**Authentication:** `X-API-Key` header required when `AXIONAX_RPC_API_KEY` is set.

### 3.3 Config Files

| File | Purpose |
|---|---|
| `core/deai/worker_config.toml` | General worker (PC/Server) |
| `configs/monolith_scout_single.toml` | Monolith Scout (single Hailo) |
| `configs/monolith_sentinel.toml` | HYDRA Sentinel |
| `configs/monolith_worker.toml` | HYDRA Worker |
| `core/configs/protocol.testnet.yaml` | Canonical protocol parameters |
| `core/deai/.env` (from `.env.example`) | Environment overrides |

---

## 4. Web3 Frontend & DApp (`axionax-web-universe`)

### 4.1 Stack

| Layer | Technology |
|---|---|
| Main website | Next.js 14, App Router, TypeScript, Tailwind CSS |
| Marketplace | Vite + React |
| Shared SDK | `@axionax/sdk` — RPC calls, wallet, ABI, types |
| Shared UI | `packages/ui` — Design system components |
| Package manager | pnpm workspaces |
| Build system | TurboRepo |
| Web3 | viem / ethers.js |

### 4.2 Key Patterns

- **Server Components first** — fetch data on server, pass to client; add `"use client"` only for interactivity.
- **SDK-first business logic** — never put RPC calls or contract ABI in app components.
- **Cyberpunk/Futuristic dark theme** — Tailwind CSS, dark mode default, consistent with brand identity.
- **MetaMask integration** — Chain ID `86137`, RPC `http://217.216.109.5:8545`, token symbol `AXX`, decimals `18`.

---

## 5. DevOps, Infrastructure & Monitoring

### 5.1 Docker Compose Environments

| File | Use Case |
|---|---|
| `docker-compose.dev.yml` | Local development (single machine) |
| `ops/deploy/docker-compose.vps.yml` | VPS production deployment |
| `ops/deploy/environments/testnet/public/docker-compose.yaml` | Public testnet (3-node setup) |

Services: `validator`, `rpc-node`, `faucet`, `mock-rpc`, `prometheus`, `grafana`

### 5.2 Monitoring & Observability

| Script | Purpose |
|---|---|
| `ops/scripts/health_monitor.py` | Automated health alerting (configurable thresholds, email alerts) |
| `ops/scripts/validator_monitor.py` | Validator set and block production performance |
| `ops/scripts/rate_limit_dashboard.py` | Real-time rate limiting monitor |
| `ops/scripts/rpc_benchmark.py` | Concurrency + rate limiting benchmark suite |
| `ops/scripts/dev_server.py` | Mock JSON-RPC + health server (no Rust compile needed) |
| `scripts/health-check.py` | Basic RPC + config + wallet check |

**Prometheus metrics exposed:** `block_height`, `tx_total`, `tx_per_second`, `peers_connected`, `validators_active`, `mempool_size`, `uptime_seconds`

### 5.3 CI/CD (GitHub Actions)

Location: `core/.github/workflows/`

Pipeline: `cargo fmt --check` → `cargo clippy -- -D warnings` → `cargo test --workspace` → `cargo audit`

---

## 6. Security Posture

### 6.1 Resolved Audit Findings (v1.9.0 — All 97 resolved)

- P0 (Critical): RPC authentication, VRF legacy removal, gossipsub keypair persistence, nonce validation, u128 overflow protection
- P1 (High): `X-API-Key` header auth, CORS restriction via env, health checks use real data
- P2 (Medium): Self-slash prevention, `ValidationMode::Strict`, Docker USER directive, saturating arithmetic
- P3 (Low): Consensus sample dedup, EventBus subscription cap (100), duplicate tx detection

### 6.2 Security Invariants (Never Break)

1. Every transaction submitted via `eth_sendRawTransaction` **must** have a valid Ed25519 signature — `verify_signature()` is mandatory.
2. Nonce must exactly match the sender's current nonce — prevents replay attacks.
3. PoPC challenge samples **must** be deduplicated — ensures sampling coverage.
4. Docker sandbox **must** enforce resource limits (CPU, RAM, timeout) on every compute job.
5. Private keys and wallet files **must** never appear in logs, metrics, or network messages.

---

## 7. Workflow Prompt Templates

### Core Blockchain (Rust)
```
Context: Working in `core/core/[module]/src/lib.rs` (Axionax v1.9.0, Rust)
Task: [describe feature]
Constraints:
- No unwrap()/expect() in production code
- Use anyhow/thiserror for error handling
- Add #[cfg(test)] unit tests in the same file
- Run cargo clippy --workspace -- -D warnings mentally before suggesting
- Reference existing patterns from core/core/consensus/src/lib.rs
```

### DeAI Worker (Python)
```
Context: Working in `core/deai/` (Axionax DeAI v1.9.0, Python 3.10+)
Task: [describe feature]
Constraints:
- All functions must have type hints
- Use async/await for I/O operations
- No hardcoded secrets — use os.environ.get()
- Maintain compatibility with RpcClient and WalletManager interfaces
- Tests via pytest in core/deai/
```

### Web Frontend (TypeScript / Next.js)
```
Context: Working in `axionax-web-universe/apps/web/` (Next.js 14 App Router)
Task: [describe UI component or page]
Constraints:
- TypeScript strict mode, no `any`
- Use "@axionax/sdk" for all blockchain calls
- Server Component by default, "use client" only for interactivity
- Tailwind CSS, dark mode, cyberpunk aesthetic
- No relative cross-package imports
```

### Smart Contract / Integration
```
Context: Smart contract in `core/examples/contracts/` + SDK in `packages/sdk/`
Task: [describe contract feature]
Constraints:
- EVM-compatible (Chain ID 86137/86150)
- TypeScript wrapper in @axionax/sdk before connecting to frontend
- Mock implementation first, real contract second
```

---

*Last updated: 2026-03-30 | Aligned with Core v1.9.0 | Chain ID: 86137 (testnet)*
