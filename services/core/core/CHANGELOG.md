# Changelog

All notable changes to AxionAx Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0] - 2026-03-31

### Added

**Merkle State Root (replaces SHA3 heuristic):**
- `core/core/state/src/merkle.rs`: binary Merkle tree using `blake2s_256` — `account_leaf()` + `merkle_root()` + 8 unit tests
- `StateDB::get_all_accounts()`: iterates redb CHAIN_STATE for all `bal_0x*` entries, returns sorted `(address, balance, nonce)` list
- `StateDB::compute_state_root()`: computes real Merkle root over all account states — replaces SHA3(block_number||tx_hashes) heuristic
- Block producer in `node/lib.rs` now calls `state.compute_state_root()` (fallback to `[0u8;32]` + warn on error)
- 7 integration tests in `state/src/lib.rs` covering empty root, determinism, mutation-sensitivity, insertion-order independence

**Worker Registration — Contract Integration (replaces full mock):**
- `contracts/MockAXXToken.sol`: standalone ERC-20 testnet token (no external imports, includes `mint()`)
- `contracts/JobMarketplaceStandalone.sol`: production-grade JobMarketplace contract — matches `job_marketplace.json` ABI exactly; inline IERC20 interface, mutex reentrancy guard, full job lifecycle (register/assign/submit/claim/dispute/cancel/slash)
- `ops/scripts/deploy_marketplace.py`: one-command deployment script using `py-solc-x` + `web3.py`; deploys MockAXXToken then JobMarketplace; writes addresses to `ops/deploy/marketplace_addresses.json`
- `core/deai/test_contract_manager.py`: 26 unit tests for `ContractManager` (mock mode, ABI validation, hash helpers, constructor) — all passing
- `core/deai/requirements.txt`: added `py-solc-x>=0.3.0,<1.0`

### Fixed

- **`ContractManager.__init__`** parameter mismatch: changed `private_key: str` → `account: LocalAccount` to match how `worker_node.py` instantiates it (was raising `TypeError` in production)

### Changed

- `state_root` field in produced blocks is now a real cryptographic Merkle root of account state, not a placeholder hash

## [1.9.0] - 2026-03-29

### Added

**Mainnet readiness features:**
- Dynamic validator count sourced from `staking.get_active_validators()` — replaces hardcoded `3`
- Block finality gadget (`FinalityTracker`): ≥ 2/3 majority confirmation before finalization
- Block rewards: `BLOCK_REWARD = 1_000_000_000_000_000_000` (1 AXX) credited to proposer via `staking.record_block_produced()`
- `BlockConfirmation` network message type and broadcast in `start_block_producer` + sync task
- `validator_address` in `NodeConfig` with `--validator-address` CLI arg and `AXIONAX_VALIDATOR_ADDRESS` env var
- Docker testnet: `AXIONAX_VALIDATOR_ADDRESS` env in validator service

**RPC & health:**
- `/version` HTTP endpoint (`VersionResponse` with `version`, `chain_id`, `git_hash`, `build_time`, `uptime_secs`)
- `/metrics` advanced fields: `peers_connected`, `block_height`, `database_ok`, `sync_ok`
- `HttpHealthServer` wired into `node.start()` with 5-second background metrics sync
- Rate limiting (`RateLimitLayer`) and CORS middleware wired into JSON-RPC server
- Health endpoint default bind changed to `127.0.0.1:8080` (was `0.0.0.0`)

**Monitoring & operations:**
- `ops/scripts/dev_server.py` — Python mock JSON-RPC + health server (no Rust compile needed)
- `ops/scripts/rate_limit_dashboard.py` — real-time rate limiting monitor
- `ops/scripts/health_monitor.py` — automated health alerting with configurable thresholds
- `ops/scripts/rpc_benchmark.py` — concurrency + rate limiting benchmark suite
- `ops/scripts/validator_monitor.py` — validator set and performance monitoring

**Test coverage:**
- `bridge/rust-python` — added `#[cfg(test)]` module: 12 tests covering `PyValidator`, `PyTransaction`, config helpers
- `staking` — added 6 new tests: `record_block_produced` (credits, accumulates, unknown address, claimable), `get_active_validators` (includes/excludes slashed)
- `node` — added 9 new tests: `FinalityTracker` (single/three/five validators, no-double-finalize, dedup votes, independent blocks), `NodeConfig.validator_address`
- `tools/faucet/src/lib.rs` — 18 unit tests (address validation, cooldown, amount formatting, RPC builders, nonce parsing)

### Changed
- `bincode` 2.0 (unmaintained) → **`postcard`** 1.x in `network` and `bridge` crates (resolves RUSTSEC advisory)
- Criterion benchmark crate names fixed: `axionax_consensus_benchmarks`, `axionax_crypto_benchmarks`, `axionax_network_benchmarks`
- `ARCHITECTURE_OVERVIEW.md` expanded: sections 6–11 added (consensus flow, economic layer, performance characteristics)

### Fixed
- All 97 security audit findings resolved (P0–P3 complete):
  - P0: staking/governance RPC auth, VRF legacy code removed, gossipsub keypair persistence, hardcoded credentials, rate limiter wired, unstake stake reduction, u128→u64 truncation, nonce validation, panic-abort removed
  - P1: RPC authentication (`X-API-Key`), health checks use real data, gossipsub handler functional, CORS restricted
  - P2: Slash on self-stake, ValidationMode::Strict, VRF key visibility, bounded channels, Docker USER directive, saturating math everywhere, Python security hardening
  - P3: Consensus sample dedup, EventBus subscription limit (100), duplicate tx detection, StorageError on corruption, Docker resource limits + log rotation, ASR VRF full entropy, mock server security

## [1.8.0] - 2025-11-15

### Added
- Cross-platform installation scripts (Linux, macOS, Windows)
- Comprehensive API documentation (`docs/API_REFERENCE.md`)
- Example files for transactions, node operation, and ASR
- Performance benchmarks using Criterion
- Build optimization profiles for Release builds
- Clippy configuration for enhanced code quality
- EditorConfig for consistent coding style
- Unified configuration module (`core/config`)
- Protocol configuration with YAML import/export
- Support for testnet (86137) and mainnet (86150) configurations

### Changed
- Updated consensus parameters to ARCHITECTURE v1.5 compliance
  - `sample_size`: 1000 (recommended 600-1500)
  - `min_confidence`: 0.99 (99%+ required)
  - `fraud_window_blocks`: 720 (~3600s)
  - `false_pass_penalty_bps`: 500 (5%)
- ASR parameters updated
  - `top_k`: 64
  - `max_quota`: 0.125 (12.5%)
  - `exploration_rate`: 0.05 (5%)
- Optimized release builds with LTO and single codegen unit
- Protocol version upgraded from 0.1.0 to 1.8.0

### Fixed
- Parameter alignment with ARCHITECTURE specification
- Version consistency across all package manifests

## [1.7.0] - 2025-11-10

### Added
- Initial PoPC consensus implementation
- Auto Selection Router (ASR) for worker assignment
- Predictive Pricing Controller (PPC)
- Data Availability (DA) layer
- VRF-based validator selection

### Changed
- Improved network stability
- Enhanced RPC performance

## [1.0.0] - 2025-10-01

### Added
- Initial release of AxionAx Core
- Basic blockchain functionality
- Transaction processing
- P2P networking with libp2p
- JSON-RPC server
- Crypto primitives (Ed25519, SHA3, Blake2)
- Python-Rust bridge for DeAI components

[1.9.0]: https://github.com/axionaxprotocol/axionax-core/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/axionaxprotocol/axionax-core/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/axionaxprotocol/axionax-core/compare/v1.0.0...v1.7.0
[1.0.0]: https://github.com/axionaxprotocol/axionax-core/releases/tag/v1.0.0
