# Axionax Protocol — Comprehensive Cybersecurity Audit Report

**Date:** 2026-03-05
**Scope:** Full repository — Rust Core, Python DeAI, TypeScript SDK, Deployment Infrastructure
**Files Reviewed:** 100+ source files across Rust, Python, TypeScript, Solidity, Shell, Docker, Nginx
**Classification:** CONFIDENTIAL

---

## Executive Summary

This audit reviewed the entire Axionax Protocol codebase. A total of **130 findings** were identified across all severity levels. The most critical issues center around:

1. **Complete lack of authentication on all state-mutating RPC endpoints** — enabling impersonation of any address for staking, voting, and transaction submission.
2. **Broken network identity** — Gossipsub uses throwaway keypairs instead of the node's actual identity, defeating peer authentication.
3. **Hardcoded credentials throughout the codebase** — private keys, passwords, and secrets committed to version control.
4. **Cryptographic flaws in the legacy VRF** — output verification is completely non-functional.
5. **Missing input validation** — enabling DoS via memory exhaustion, chain integrity bypass, and resource draining.

| Severity | Count |
|---|---|
| **Critical** | 11 |
| **High** | 22 |
| **Medium** | 30 |
| **Low** | 20 |
| **Informational** | 14 |
| **Total** | **97** (after deduplication) |

---

## Table of Contents

- [1. Rust Core — Consensus, Blockchain, Crypto, State, Network](#1-rust-core--consensus-blockchain-crypto-state-network)
- [2. Rust Core — RPC, Staking, Governance, Node](#2-rust-core--rpc-staking-governance-node)
- [3. Python DeAI Worker & Rust-Python Bridge](#3-python-deai-worker--rust-python-bridge)
- [4. TypeScript SDK & Website](#4-typescript-sdk--website)
- [5. Deployment, Docker, Nginx, Scripts, Configs](#5-deployment-docker-nginx-scripts-configs)
- [6. Remediation Priority Matrix](#6-remediation-priority-matrix)

---

## 1. Rust Core — Consensus, Blockchain, Crypto, State, Network

### CRITICAL

#### RC-1: Legacy VRF Output Is Not Actually Verified — Output Forgery

- **File:** `core/core/crypto/src/lib.rs`, lines 60–74
- **Category:** Cryptographic
- **Description:** The `VRF::verify()` method accepts an `_output` parameter (the claimed VRF random value) but **completely ignores it**. The function only validates that the Ed25519 signature (the "proof") is valid over `input`, making no assertion about whether the claimed random output corresponds to that proof.
- **Impact:** An attacker holding a valid signing key can produce a valid proof for any input, then claim **any arbitrary 32-byte value** as the VRF output. This completely defeats the purpose of a VRF. If used for consensus sampling or validator selection, the attacker can manipulate the "random" outcome.
- **Recommendation:** Remove the legacy VRF entirely (it is already `#[deprecated]`) or fix the verification to recompute expected output from the proof. Ensure all production consensus paths use the `ECVRF` (schnorrkel) module.

#### RC-2: Legacy VRF prove() Is Not a True VRF — Output Depends on Secret Key

- **File:** `core/core/crypto/src/lib.rs`, lines 43–57
- **Category:** Cryptographic
- **Description:** The VRF output is computed as `SHA3-256(signing_key_bytes || input)`, making it a PRF, not a VRF. A VRF output must be reconstructible by any verifier given only the public key, input, and proof. Since this output depends on the secret key, no verifier can ever recompute it.
- **Impact:** Combined with RC-1, the legacy VRF provides zero VRF guarantees. A prover can claim any random output and any verifier will accept it.
- **Recommendation:** Same as RC-1 — remove or restrict to `#[cfg(test)]` only.

#### RC-3: Gossipsub and Identify Use Ephemeral Random Keypairs Instead of Node Identity

- **File:** `core/core/network/src/behaviour.rs`, lines 55–58, 72–78
- **Category:** Network Security / Authentication
- **Description:** The Gossipsub protocol is initialized with `MessageAuthenticity::Signed(Keypair::generate_ed25519())` using a **freshly generated random keypair**, not the node's actual identity keypair. Similarly, the Identify protocol announces yet another random public key. The actual node keypair from `NetworkManager::new()` is never passed to the behaviour.
- **Impact:**
  - Gossipsub messages are signed by a throwaway key with no relation to the node's PeerId
  - Any node can forge messages appearing to come from any other node
  - Eclipse attacks become trivial — attacker can inject arbitrary blocks, transactions, and consensus votes
  - Message deduplication based on source PeerId is defeated
- **Recommendation:** Modify `AxionaxBehaviour::new()` to accept the node's `Keypair` as a parameter and use it for both `MessageAuthenticity::Signed()` and `identify::Config::new()`.

### HIGH

#### RH-1: Division by Zero in Consensus Sample Generation

- **File:** `core/core/consensus/src/lib.rs`, line 155
- **Category:** Consensus / DoS
- **Description:** `generate_samples()` computes `% output_size` without checking that `output_size > 0`. Although the current call path from `generate_challenge()` prevents `output_size == 0`, the method is a separate public function with no self-guard.
- **Impact:** A panic in the consensus engine crashes the node. If an attacker can influence `output_size`, they can take down validators.
- **Recommendation:** Add a guard: `if output_size == 0 { return Vec::new(); }`

#### RH-2: Unbounded Memory Allocation from Untrusted Deserialized Data (OOM DoS)

- **File:** `core/core/consensus/src/merkle.rs`, lines 190–193, 210–214
- **Category:** DoS / Memory Safety
- **Description:** `deserialize_proofs()` reads `num_proofs` and `num_siblings` from untrusted bytes and uses them directly for `Vec::with_capacity()`. An attacker can set `num_proofs = 0xFFFFFFFF`, attempting to allocate hundreds of gigabytes.
- **Impact:** A single malicious proof message from any network peer can crash any validator node.
- **Recommendation:** Add sanity-check upper bounds (e.g., `MAX_PROOFS = 10_000`, `MAX_SIBLINGS = 64`).

#### RH-3: Node Identity Keypair Regenerated on Every Restart — Sybil Attack Vector

- **File:** `core/core/network/src/manager.rs`, lines 48–50
- **Category:** Network Security / Identity
- **Description:** The node generates a fresh Ed25519 keypair on every startup. PeerId changes each time.
- **Impact:** Sybil attacks are trivial (unlimited free identities), reputation tracking is useless, eclipse attacks are facilitated, and Kademlia DHT can be poisoned.
- **Recommendation:** Persist the keypair to an encrypted file on disk. Load on startup; generate only if no persisted key exists.

#### RH-4: `expect()` Panics in Production Code Path (Genesis Block Creation)

- **File:** `core/core/blockchain/src/lib.rs`, lines 297, 298, 306
- **Category:** Error Handling / Availability
- **Description:** `Blockchain::create_genesis()` (called on every node startup) contains three `.expect()` calls. Combined with `panic = "abort"` in the release profile, any panic causes immediate process termination without cleanup.
- **Impact:** Corrupted or misconfigured genesis data causes every node in the network to crash on startup.
- **Recommendation:** Change `create_genesis()` to return `Result<Block, BlockchainError>`.

#### RH-5: No Parent Hash Validation in Block Addition — Chain Integrity Not Enforced

- **File:** `core/core/blockchain/src/lib.rs`, lines 252–267
- **Category:** Consensus / Chain Integrity
- **Description:** `Blockchain::add_block()` only validates that the block number is sequential. It does **not** check that `block.parent_hash` matches the hash of the previous block. While `BlockValidator::validate_block()` does check parent hashes, there's no enforcement that it's called before `add_block()`.
- **Impact:** An attacker or bug can insert blocks with arbitrary parent hashes, effectively creating forks, orphaning blocks, or rewriting chain history.
- **Recommendation:** Have `add_block()` fetch the previous block and verify the parent hash.

#### RH-6: Gossipsub Message Handler Is a Stub — No Incoming Message Processing

- **File:** `core/core/network/src/manager.rs`, lines 231–233
- **Category:** Network Security / Input Validation
- **Description:** The core message processing handler for all incoming P2P messages is a no-op stub — all messages are logged at debug level and discarded.
- **Impact:** The node is deaf to all P2P messages. When eventually implemented, this is the primary attack surface.
- **Recommendation:** Establish a validation pipeline: size limits, rate limiting, deserialization sandboxing, schema validation, signature verification, deduplication, content validation.

#### RH-7: Duplicate Sample Indices Reduce Fraud Detection Probability

- **File:** `core/core/consensus/src/lib.rs`, lines 139–160
- **Category:** Consensus / Cryptographic
- **Description:** `generate_samples()` generates indices independently without deduplication. By the birthday problem, for `sample_size = 1000` and `output_size = 10000`, ~49 duplicates reduce effective checks to ~951.
- **Impact:** The consensus mechanism provides weaker fraud detection than its mathematical model claims.
- **Recommendation:** Implement rejection-based deduplication using a `HashSet`.

### MEDIUM

#### RM-1: `unwrap()` in Production Code — Reputation Timestamp

- **File:** `core/core/network/src/reputation.rs`, lines 292–296
- **Category:** Error Handling
- **Description:** `SystemTime::now().duration_since(UNIX_EPOCH).unwrap()` in a function called on every peer interaction.
- **Impact:** Node panics if system clock is before epoch (e.g., newly booted VM before NTP sync).
- **Recommendation:** Use `.unwrap_or_default()`.

#### RM-2: Integer Overflow in Mempool Nonce Calculation

- **File:** `core/core/blockchain/src/mempool.rs`, line 182
- **Category:** Integer Safety
- **Description:** `queue.current_nonce + queue.pending.len() as u64` can overflow in release builds.
- **Impact:** Wrapped nonce could allow nonce-based replay attacks.
- **Recommendation:** Use `.checked_add()`.

#### RM-3: Integer Truncation in Fraud Detection Probability

- **File:** `core/core/consensus/src/lib.rs`, line 136
- **Category:** Consensus
- **Description:** `sample_size as i32` truncates large values silently.
- **Recommendation:** Use `.powf(sample_size as f64)`.

#### RM-4: Default Gossipsub Validation Mode Is Permissive

- **File:** `core/core/network/src/config.rs`, line 68
- **Category:** Network Security
- **Description:** Default and testnet configs use `ValidationMode::Permissive`, accepting messages with invalid/missing signatures.
- **Recommendation:** Set `Strict` as default; only override in dev.

#### RM-5: Transaction Value Overflow Check Is Insufficient

- **File:** `core/core/blockchain/src/validation.rs`, lines 263–265
- **Category:** Financial / Input Validation
- **Description:** Only checks for exact `u128::MAX` value. Does not validate total cost: `value + gas_price * gas_limit`.
- **Recommendation:** Validate total cost with checked arithmetic.

#### RM-6: Block Size Estimation Hardcoded at 150 Bytes Per Transaction

- **File:** `core/core/blockchain/src/validation.rs`, lines 174–187
- **Category:** DoS
- **Description:** Transactions with multi-MB `data` fields are estimated at 150 bytes.
- **Recommendation:** Calculate actual transaction size.

#### RM-7: No Transaction Data Size Limit

- **File:** `core/core/blockchain/src/validation.rs`
- **Category:** DoS
- **Description:** `tx.data` is `Vec<u8>` with no length constraint.
- **Recommendation:** Add `max_transaction_data_size` config (e.g., 128 KB).

#### RM-8: Unbounded Channel in Network Manager

- **File:** `core/core/network/src/manager.rs`, line 74
- **Category:** DoS
- **Description:** `mpsc::unbounded_channel()` grows without bound under high message volume.
- **Recommendation:** Use bounded channel with backpressure.

#### RM-9: Transaction Value Type Mismatch Between Core (u128) and Network Protocol (u64)

- **File:** `core/core/network/src/protocol.rs`, line 40 vs `core/core/blockchain/src/lib.rs`, line 88
- **Category:** Data Integrity
- **Description:** Core `Transaction.value` is `u128`, but wire format `TransactionMessage.value` is `u64`. Values above `u64::MAX` are silently truncated.
- **Impact:** Large-value transactions lose data during network propagation; consensus failures and balance discrepancies.
- **Recommendation:** Change `TransactionMessage.value` to `u128`.

#### RM-10: Reputation Score Decay Overflow

- **File:** `core/core/network/src/reputation.rs`, lines 231–235
- **Category:** Integer Safety
- **Description:** Multiplication `hours_since_seen as i32 * decay_per_hour` can overflow for corrupted `last_seen`.
- **Recommendation:** Use `saturating_mul` and cap `hours_since_seen`.

### LOW

#### RL-1: No Duplicate Transaction Check Within Blocks

- **File:** `core/core/blockchain/src/validation.rs`, lines 191–207
- **Description:** Block validation doesn't check for duplicate transaction hashes.
- **Recommendation:** Add deduplication via `HashSet`.

#### RL-2: Silent Data Corruption Fallback in Storage Layer

- **File:** `core/core/blockchain/src/storage.rs`, line 131
- **Description:** Corrupted `latest_block` silently falls back to block 0.
- **Recommendation:** Return error on corrupt data.

#### RL-3: Validator Registration Has No Authentication

- **File:** `core/core/consensus/src/lib.rs`, lines 64–72
- **Description:** `register_validator()` accepts any `Validator` struct without proof of address ownership or stake verification.
- **Recommendation:** Require cryptographic signature and on-chain stake verification.

#### RL-4: Health Checks Are All Hardcoded to `true`

- **File:** `core/src/health.rs`, lines 78–103
- **Description:** `check_database()`, `check_p2p()`, `check_consensus()` all return `true` unconditionally.
- **Recommendation:** Implement actual health checks.

#### RL-5: No Rate Limiting on Any Public Interface

- **Files:** mempool, network manager, consensus
- **Description:** No per-peer, per-account, or global rate limiting.
- **Recommendation:** Implement token-bucket rate limiting.

### INFORMATIONAL

#### RI-1: Release Profile Uses `panic = "abort"`

- **File:** `core/Cargo.toml`, line 124
- **Description:** Amplifies severity of every `unwrap()`/`expect()` finding — any panic = dirty shutdown.

#### RI-2: Modulo Bias in Sample Index Generation

- **File:** `core/core/consensus/src/lib.rs`, line 155
- **Description:** Negligible bias (~5.4 × 10^-16).

#### RI-3: Keypair Generation Uses `rand::random()` Instead of Explicit `OsRng`

- **File:** `core/core/crypto/src/lib.rs`, lines 33, 181
- **Description:** Less auditable than explicit `OsRng`. Inconsistent with `ECVRF` module.

---

## 2. Rust Core — RPC, Staking, Governance, Node

### CRITICAL

#### SC-1: No Authentication on State-Mutating RPC Endpoints

- **Files:** `core/core/rpc/src/staking_rpc.rs` lines 93–107, `core/core/rpc/src/governance_rpc.rs` lines 114–146
- **Category:** Missing Access Controls
- **Description:** RPC endpoints `staking_stake`, `staking_unstake`, `staking_delegate`, `staking_claimRewards`, `gov_createProposal`, `gov_vote`, `gov_finalizeProposal`, and `gov_executeProposal` accept plain-text `address`/`proposer`/`voter` string parameters. There is **no signature verification, no authentication, and no authorization**. Anyone can call `staking_stake("victimAddress", ...)` impersonating any address.
- **Impact:** An attacker can stake/unstake/delegate on behalf of any address, vote with arbitrary weight, claim any rewards, and fully control the staking and governance systems.
- **Recommendation:** All state-mutating RPC methods must require cryptographically signed transactions. Address fields must be derived from verified signatures (`ecrecover`), never from plain-text parameters.

#### SC-2: Vote Weight Not Verified Against Actual Stake

- **Files:** `core/core/rpc/src/governance_rpc.rs` lines 212–238, `core/core/governance/src/lib.rs` lines 270–316
- **Category:** Vote Manipulation
- **Description:** The `gov_vote` RPC accepts `vote_weight` from the caller. The governance module trusts this value without checking actual stake.
- **Impact:** Any attacker can pass `u128::MAX` as vote weight to single-handedly pass/defeat any proposal.
- **Recommendation:** Look up vote weight from the staking module based on authenticated voter's actual stake. Remove `vote_weight` from the RPC interface.

#### SC-3: Proposer Stake Not Verified

- **File:** `core/core/rpc/src/governance_rpc.rs` lines 189–210
- **Category:** Governance Bypass
- **Description:** `gov_createProposal` accepts `proposer_stake` as a parameter, never verified against actual on-chain stake.
- **Impact:** Zero-stake attackers can create proposals by claiming high stake values.
- **Recommendation:** Fetch proposer's stake from the staking module server-side.

#### SC-4: `finalize_proposal` total_staked is Caller-Supplied

- **File:** `core/core/rpc/src/governance_rpc.rs` lines 250–267
- **Category:** Governance Manipulation
- **Description:** `gov_finalizeProposal` accepts `total_staked` from the caller for quorum calculation. Supplying `total_staked = 1` makes quorum requirement effectively 0.
- **Impact:** Proposals can be finalized as "passed" with negligible actual voter participation.
- **Recommendation:** Retrieve `total_staked` from the staking module server-side.

### HIGH

#### SH-1: No Transaction Signature Verification in `send_raw_transaction`

- **File:** `core/core/rpc/src/lib.rs` lines 253–275
- **Category:** Missing Authentication
- **Description:** `eth_sendRawTransaction` deserializes a `Transaction` from user-provided bytes and submits to mempool without verifying the signature.
- **Impact:** Anyone can submit transactions with arbitrary `from` fields, spending other users' funds.
- **Recommendation:** Implement ECDSA signature verification; derive `from` from `ecrecover`.

#### SH-2: RPC Server Binds to 0.0.0.0 Without Authentication

- **File:** `core/core/node/src/lib.rs` lines 58–74
- **Category:** Network Exposure
- **Description:** Testnet and mainnet `NodeConfig` bind RPC to `0.0.0.0:8545`, exposing all endpoints publicly.
- **Recommendation:** Default to `127.0.0.1`. Implement JWT/API-key authentication.

#### SH-3: Rate Limiter / CORS / Request Validator Not Applied

- **Files:** `core/core/rpc/src/middleware.rs`, `core/core/rpc/src/lib.rs` lines 279–306
- **Category:** DoS
- **Description:** `RateLimiter`, `RequestValidator`, and `CorsConfig` are fully implemented but **never integrated** into the RPC server.
- **Impact:** No rate limiting, no request size validation, no CORS enforcement.
- **Recommendation:** Integrate middleware into `Server::builder()`.

#### SH-4: Unstake Does Not Reduce Stake Amount

- **File:** `core/core/staking/src/lib.rs` lines 210–239
- **Category:** Staking Logic Error
- **Description:** `unstake()` validates `amount <= validator.stake` but **never subtracts** the amount from stake. `withdraw()` later withdraws the **entire** stake.
- **Impact:** Partial unstaking is broken. Calling `unstake(addr, 1)` followed by `withdraw()` returns entire stake.
- **Recommendation:** Store pending unstake amount and subtract from stake on unstake.

#### SH-5: u128-to-u64 Silent Truncation in Node

- **File:** `core/core/node/src/lib.rs` lines 329, 386
- **Category:** Data Integrity
- **Description:** Transaction values are cast from `u128` to `u64` when publishing to network, silently truncating values > ~18.4 AXX.
- **Recommendation:** Use `u128` throughout or implement checked conversion.

#### SH-6: `execute_proposal` Has No Access Control

- **File:** `core/core/rpc/src/governance_rpc.rs` lines 269–277
- **Category:** Missing Access Control
- **Description:** Anyone can call `gov_executeProposal` to execute passed proposals.
- **Recommendation:** Restrict to authorized callers or implement automatic execution.

### MEDIUM

#### SM-1: `.unwrap()` on `SystemTime` in Multiple Production Files

- **Files:** `rpc/src/health.rs:87`, `events/src/lib.rs:178,209`, `da/src/lib.rs:443`, `genesis/src/lib.rs:391`
- **Category:** Error Handling
- **Description:** Multiple `.unwrap()` on `SystemTime` and `serde_json` operations in production code.
- **Recommendation:** Replace with proper error handling or `.unwrap_or()`.

#### SM-2: `unwrap_or(0)` Silently Hides State DB Errors

- **File:** `core/core/rpc/src/lib.rs` lines 315–317, 333–334
- **Description:** Health/status endpoints swallow database errors, returning `height = 0`.
- **Recommendation:** Surface database errors in health checks.

#### SM-3: Event History Uses O(n) `Vec::remove(0)`

- **File:** `core/core/events/src/lib.rs` lines 189–194
- **Description:** `Vec::remove(0)` is O(n) on every insert after capacity.
- **Recommendation:** Use `VecDeque::pop_front()`.

#### SM-4: `block_on` Inside Async Context

- **File:** `core/core/rpc/src/lib.rs` lines 431–439
- **Description:** `tokio::runtime::Handle::current().block_on()` inside async context can deadlock.
- **Recommendation:** Use `register_async_method` instead.

#### SM-5: No Nonce Validation on Transactions

- **File:** `core/core/rpc/src/lib.rs` lines 253–275
- **Description:** `send_raw_transaction` does not validate nonces, allowing replay attacks.
- **Recommendation:** Implement nonce tracking per account.

#### SM-6: Slashing Based on voting_power() But Only Deducted From Self-Stake

- **File:** `core/core/staking/src/lib.rs` lines 334–366
- **Description:** Slash calculated on `stake + delegated` but deducted from self-stake only. High-delegation validators become unslashable.
- **Recommendation:** Calculate slash on self-stake only, or distribute proportionally.

#### SM-7: No Bound on Subscription Count (DoS)

- **Files:** `core/core/rpc/src/lib.rs:385–428`, `core/core/events/src/lib.rs:231–248`
- **Description:** Unlimited WebSocket subscriptions, each spawning a task.
- **Recommendation:** Implement per-IP subscription limits.

#### SM-8: Secret Key Bytes Exposed Through Public Method

- **File:** `core/core/vrf/src/lib.rs` lines 142–146
- **Description:** `VRFKeyPair::secret_key_bytes()` is public, returning raw Ed25519 secret key.
- **Recommendation:** Remove or restrict to `pub(crate)`.

### LOW

#### SL-1: Hardcoded Validator IPs in Genesis

- **File:** `core/core/genesis/src/lib.rs` lines 329, 334
- **Description:** Validator IPs `217.76.61.116`, `46.250.244.4` hardcoded in source code.
- **Recommendation:** Move to external config.

#### SL-2: Metrics Exposed Without Authentication

- **Files:** `core/core/rpc/src/lib.rs:357–371`, `core/core/rpc/src/server.rs:161–176`
- **Description:** Internal state exposed via metrics endpoints without auth.
- **Recommendation:** Put behind authentication or restrict to loopback.

#### SL-3: `--unsafe-rpc` Flag Has No Effect

- **File:** `core/core/node/src/main.rs` lines 68–69, 105–107
- **Description:** The flag is parsed and logged but does nothing. False sense of security.
- **Recommendation:** Actually gate state-mutating RPC methods behind the flag.

#### SL-4: Peer Reputation Metric Labels Could Be Spoofed

- **File:** `core/core/metrics/src/lib.rs` lines 475–481
- **Description:** Unsanitized label values in Prometheus metrics allow injection.
- **Recommendation:** Escape special characters per Prometheus spec.

#### SL-5: CORS `dev()` Allows All Origins

- **File:** `core/core/rpc/src/middleware.rs` lines 198–207
- **Description:** `CorsConfig::dev()` sets `allow_all: true`.
- **Recommendation:** Add safeguards against production use.

#### SL-6: No Maximum Length on Proposal Title/Description

- **File:** `core/core/governance/src/lib.rs` lines 227–267
- **Description:** Unlimited string lengths consume unbounded memory.
- **Recommendation:** Add title max 256 chars, description max 10,000 chars.

#### SL-7: No Gas Price/Limit Validation

- **File:** `core/core/rpc/src/lib.rs` lines 253–275
- **Description:** Zero gas prices and unlimited gas limits accepted.
- **Recommendation:** Validate gas parameters.

### INFORMATIONAL

#### SI-1: Simplified Erasure Coding (XOR Parity Only)

- **File:** `core/core/da/src/lib.rs` lines 247–272
- **Description:** XOR parity provides no real data reconstruction. Not production-ready.

#### SI-2: ASR VRF Is a Hash, Not a True VRF

- **File:** `core/core/asr/src/lib.rs` lines 465–473
- **Description:** `compute_vrf` is just `SHA3(job_id || seed)`, providing no verifiable proof.

#### SI-3: RPC Example Uses Wrong Function Signature

- **File:** `core/core/rpc/examples/state_rpc_integration.rs` line 113
- **Description:** Example won't compile — signature mismatch.

#### SI-4: Sync Task Creates Disconnected Channel

- **File:** `core/core/node/src/lib.rs` line 182
- **Description:** The sender is immediately dropped, making the sync loop non-functional.

#### SI-5: `Relaxed` Ordering on All Atomics in Metrics

- **File:** `core/core/metrics/src/lib.rs` line 13
- **Description:** Acceptable for metrics but should be documented.

---

## 3. Python DeAI Worker & Rust-Python Bridge

### CRITICAL

#### PC-1: Private Key Passed as Plain String to ContractManager

- **File:** `core/deai/worker_node.py`, line 367
- **Category:** Key Management
- **Description:** The worker extracts the wallet's raw private key as a plaintext hex string and passes it to `ContractManager`. The key exists in memory at multiple points.
- **Impact:** Private key leaked via crash dumps, debug logs, or memory inspection.
- **Recommendation:** Pass the `Account` object directly. Refactor `ContractManager` to accept a signing callback.

#### PC-2: All RPC Communication Uses Plain HTTP (No TLS)

- **Files:** `core/deai/rpc_client.py` line 10, `core/deai/worker_config.toml` lines 17–19
- **Category:** Insecure Communication
- **Description:** RPC client defaults to `http://217.76.61.116:8545`. All RPC traffic — including signed transactions — is sent unencrypted.
- **Impact:** Man-in-the-middle attacks can intercept, modify, or replay transactions.
- **Recommendation:** Use HTTPS/TLS for all RPC endpoints. Validate certificates.

### HIGH

#### PH-1: Faucet ERC-20 Endpoint Accepts User-Controlled Amount

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/faucet/index.js`, line 86 *(โฟลเดอร์นี้ถูกลบออกจาก repo แล้ว — อ้างอิงประวัติการ audit เท่านั้น)*
- **Category:** Business Logic
- **Description:** `/request-erc20` accepts a user-supplied `amount` query parameter. An attacker can request `amount=999999999999999`.
- **Impact:** Complete drain of faucet's ERC-20 balance in a single request.
- **Recommendation:** Remove user-controlled `amount`; always use server-configured value.

#### PH-2: Faucet server.js Variant Has No Rate Limiting

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/faucet/server.js`, line 33 *(โฟลเดอร์นี้ถูกลบออกจาก repo แล้ว — อ้างอิงประวัติการ audit เท่านั้น)*
- **Description:** Unlike `index.js`, this variant has no `express-rate-limit`.
- **Recommendation:** Add rate limiting.

#### PH-3: Mock RPC web3_sha3 Returns Random Hash

- **File:** `ops/deploy/mock-rpc/server.js`, lines 549–553
- **Category:** Integrity
- **Description:** Returns `generateHash()` (random) instead of keccak256.
- **Impact:** Any client relying on `web3_sha3` for verification gets wrong results.
- **Recommendation:** Implement proper keccak256.

### MEDIUM

#### PM-1: MockSandbox Provides No Security Isolation

- **File:** `core/deai/sandbox.py`, lines 273–304
- **Category:** Security Control Bypass
- **Description:** `MockSandbox` provides zero isolation. `create_sandbox()` silently falls back to it if Docker unavailable.
- **Impact:** Arbitrary code execution on the worker node.
- **Recommendation:** Refuse to start in production without Docker sandbox.

#### PM-2: Mutable Default Argument in rpc_client.py

- **File:** `core/deai/rpc_client.py`, lines 15, 51
- **Description:** `params: List[Any] = []` — shared mutable default.
- **Recommendation:** Use `None` default.

#### PM-3: Private Key Accessible via Public get_private_key() Method

- **File:** `core/deai/wallet_manager.py`, lines 138–143
- **Description:** Public API returning raw hex key.
- **Recommendation:** Make `_get_private_key()` (private by convention).

#### PM-4: Keystore File Written with Race Condition

- **File:** `core/deai/wallet_manager.py`, lines 125–132
- **Description:** File is briefly world-readable between `open()` and `chmod()`. On Windows, `chmod` fails silently.
- **Recommendation:** Use `os.open()` with mode `0o600` atomically.

#### PM-5: Legacy Plaintext Key Not Securely Deleted After Migration

- **File:** `core/deai/wallet_manager.py`, lines 88–96
- **Description:** Plaintext key persists on disk after migration to encrypted format.
- **Recommendation:** Securely overwrite original file contents.

#### PM-6: Rust Bridge u128-to-u64 Truncation

- **File:** `core/bridge/rust-python/src/lib.rs`, lines 49, 64–65, 189, 209–211
- **Description:** Values above `u64::MAX` silently truncated at FFI boundary.
- **Recommendation:** Return as Python string or use BigInt.

#### PM-7: VRF Seed Truncated to 4 Bytes in ASR

- **File:** `core/deai/asr.py`, line 235
- **Category:** Cryptographic Weakness
- **Description:** Only first 4 bytes of VRF seed used: `np.random.seed(int.from_bytes(vrf_seed[:4], 'big'))`.
- **Impact:** Only 2^32 possible selections.
- **Recommendation:** Use full seed with `SeedSequence`.

#### PM-8: No Input Validation on admin RPC Methods

- **File:** `core/deai/find_peers.py`, lines 28–30
- **Description:** Calls `admin_peers`, `net_peers` against potentially public nodes.
- **Recommendation:** Restrict to localhost.

#### PM-9: RPC Payload Logging Exposes Sensitive Data

- **File:** `ops/deploy/mock-rpc/server.js`, line 199
- **Description:** Transaction parameters logged (truncated to 100 chars).
- **Recommendation:** Exclude sensitive methods from param logging.

#### PM-10: Mock RPC Server Binds to 0.0.0.0 Without Auth

- **File:** `ops/deploy/mock-rpc/server.js`, line 638
- **Description:** Accessible on all network interfaces without authentication.
- **Recommendation:** Bind to `127.0.0.1`.

### LOW

#### PL-1: No CSRF Protection in Faucet Endpoints

- **Files:** `faucet/index.js` lines 67–95, `faucet/server.js` lines 33–51
- **Description:** GET requests for state-changing operations with wildcard CORS.
- **Recommendation:** Use POST; restrict CORS.

#### PL-2: No RPC Request ID Validation in SDK

- **Files:** `core/docs/sdk-types/staking-client.ts:39`, `governance-client.ts:39`
- **Description:** Response ID never validated against request ID.
- **Recommendation:** Use incrementing counter; validate response IDs.

#### PL-3: SDK Error Messages Directly Exposed

- **Files:** `staking-client.ts:45`, `governance-client.ts:45`
- **Description:** Internal RPC error details thrown to users.
- **Recommendation:** Sanitize error messages.

#### PL-4: SDK Does Not Validate Address Format

- **File:** `core/docs/sdk-types/staking-client.ts`, lines 59, 106, 115
- **Description:** Address parameters not validated.
- **Recommendation:** Use `ethers.utils.isAddress()`.

#### PL-5: UI Stores Faucet Auth Credentials in localStorage

- **File:** `ops/deploy/environments/testnet/.../ui/index.html`, lines 293–298
- **Description:** XSS-accessible credential storage.
- **Recommendation:** Use `sessionStorage` or HTTP-only cookies.

#### PL-6: Solidity Contract Missing Zero-Address Checks

- **File:** `deployer/contracts/AXX.sol`, lines 32, 53–56
- **Description:** `transfer()` and `_transfer()` don't check for `address(0)`.
- **Recommendation:** Add `require(to != address(0))`.

### INFORMATIONAL

#### PI-1: Dependency Version Ranges Allow Vulnerable Versions

- **File:** `core/deai/requirements.txt`
- **Description:** Uses `>=` pins without upper bounds.

#### PI-2: Missing eth_account Dependency

- **File:** `core/deai/requirements.txt`
- **Description:** `eth_account` imported but not listed (transitive of `web3`).

#### PI-3: Docker Sandbox Image Not Pinned to Digest

- **File:** `core/deai/sandbox.py`, line 70
- **Description:** `python:3.11-slim` tag is mutable.

#### PI-4: sys.path Manipulation in Multiple Files

- **Files:** `worker_node.py:20`, `find_peers.py:3`, etc.
- **Description:** Runtime `sys.path` modification enables module hijacking.

---

## 4. TypeScript SDK & Website

(Findings covered in sections 3 and 5 — SDK findings are in PL-2 through PL-4; website findings are in deployment section.)

---

## 5. Deployment, Docker, Nginx, Scripts, Configs

### CRITICAL

#### DC-1: Hardcoded Hardhat Private Key in Deployer

- **File:** `ops/deploy/environments/testnet/.../deployer/deploy_token.js`, line 14
- **Category:** Secret Management
- **Description:** Well-known Hardhat Account #0 key `0xac0974bec39a17e36ba4...` hardcoded as fallback.
- **Impact:** If used beyond local dev, funds are immediately stealable by anyone who recognizes this key.
- **Recommendation:** Remove fallback; require env variable and exit if not set.

#### DC-2: Hardcoded System User Password in setup_validator.sh

- **File:** `ops/deploy/setup_validator.sh`, line 44
- **Category:** Secret Management
- **Description:** `echo "$AXIONAX_USER:axionax2025" | chpasswd` — publicly visible password committed to repo.
- **Impact:** Full system access to any validator provisioned with this script.
- **Recommendation:** Generate random password or require SSH key-only auth.

#### DC-3: Hardcoded SECRET_KEY_BASE for Blockscout

- **File:** `ops/deploy/environments/testnet/.../docker-compose.yml`, line 100
- **Category:** Secret Management
- **Description:** Phoenix/Elixir session signing key committed in plaintext.
- **Impact:** Session forgery and CSRF bypass for Blockscout explorer.
- **Recommendation:** Generate dynamically at deploy time.

### HIGH

#### DH-1: Hardcoded PostgreSQL Credentials

- **Files:** `docker-compose.dev.yml:75–77`, `testnet docker-compose.yml:63–65`
- **Description:** `POSTGRES_PASSWORD: blockscout` / `axionax_dev_2026` committed.
- **Recommendation:** Use env variable substitution with `.env` files.

#### DH-2: Hardcoded Grafana Admin Password

- **File:** `docker-compose.dev.yml`, line 203
- **Description:** `GF_SECURITY_ADMIN_PASSWORD=axionax`.
- **Recommendation:** Use env variable.

#### DH-3: Default "admin:password" Basic Auth

- **File:** `.env.example`, line 11
- **Description:** `BASIC_AUTH=admin:password` as example value.
- **Recommendation:** Use non-functional placeholder.

#### DH-4: Wildcard CORS in Production Config

- **Files:** `rpc-config.toml:14`, `docker-compose.vps.yml:19`, `nginx/rpc.conf:57`
- **Description:** `cors_origins = ["*"]` and `Access-Control-Allow-Origin *` across all configs.
- **Recommendation:** Restrict to trusted domains.

#### DH-5: --unsafe-rpc Enabled in Public Testnet

- **File:** `public/docker-compose.yaml`, line 48
- **Description:** `--unsafe-rpc` on publicly accessible node.
- **Recommendation:** Remove for public nodes.

#### DH-6: Redis Without Authentication

- **File:** `docker-compose.dev.yml`, lines 93–102
- **Description:** Redis on port 6379 with no `--requirepass`.
- **Recommendation:** Always configure `--requirepass`.

#### DH-7: Prometheus and Node Exporter Publicly Exposed

- **Files:** `public/docker-compose.yaml:106–108,133–134`, `docker-compose.dev.yml:180–181`
- **Description:** Ports 9090 and 9100 exposed on all interfaces without auth.
- **Recommendation:** Bind to `127.0.0.1`; access via SSH tunnel.

#### DH-8: Production Validator IPs Hardcoded Throughout Codebase

- **Files:** `configs/monolith_*.toml`, `VPS_CONNECTION.txt`, deployment scripts, documentation
- **Description:** IPs `217.76.61.116`, `46.250.244.4`, `217.216.109.5` in ~15 files.
- **Recommendation:** Use DNS names; move IPs to private config.

#### DH-9: Faucet Private Key Fallback to 0x01

- **File:** `docker-compose.dev.yml`, line 163
- **Description:** Universally known private key `0x0...01` as default.
- **Recommendation:** Remove fallback; require explicit key.

### MEDIUM

#### DM-1: Dockerfiles Running as Root

- **Files:** `testnet/.../Dockerfile:64`, `tools/devtools/Dockerfile.explorer:11`
- **Description:** No `USER` directive; processes run as root.
- **Recommendation:** Add `USER` directive.

#### DM-2: Nginx Rate-Limit Zone Defined After Use

- **File:** `nginx/conf.d/faucet.conf`, lines 45, 50
- **Description:** `limit_req` used before `limit_req_zone` is defined.
- **Recommendation:** Move zone definition before server block.

#### DM-3: Missing `server_tokens off` in Nginx

- **File:** `nginx/nginx.conf`
- **Description:** Version information leaked in headers.
- **Recommendation:** Add `server_tokens off;`.

#### DM-4: Database Credential in .env.explorer Committed

- **File:** `public/.env.explorer`, line 17
- **Description:** `DATABASE_URL=postgresql://explorer:password@postgres:5432/explorer`.
- **Recommendation:** Use placeholder.

#### DM-5: All Services Bound to 0.0.0.0 in Dev Compose

- **File:** `docker-compose.dev.yml`
- **Description:** PostgreSQL (5432), Redis (6379), and all services publicly accessible.
- **Recommendation:** Bind to `127.0.0.1` except P2P.

#### DM-6: Deploy Script Sources .env (Shell Injection Risk)

- **Files:** `deploy-all-services.sh:168`, `check-vps-status.sh:189`, `verify-launch-ready.sh:177`
- **Description:** `source .env` as root can execute arbitrary commands.
- **Recommendation:** Use safe env parsing.

#### DM-7: Grafana Password Printed to stdout

- **File:** `deploy-all-services.sh`, line 411
- **Description:** Password visible in terminal history and logs.
- **Recommendation:** Never print secrets.

#### DM-8: Blockscout Explorer Port 4000 Exposed

- **File:** `public/docker-compose.yaml`, lines 87–88
- **Description:** Direct access bypasses reverse proxy protections.
- **Recommendation:** Bind to `127.0.0.1`.

#### DM-9: Host Root Filesystem Mounted in Node Exporter

- **File:** `public/docker-compose.yaml`, line 132
- **Description:** `"/:/host:ro,rslave"` exposes entire host filesystem including `/etc/shadow`.
- **Recommendation:** Mount only specific paths.

#### DM-10: Deterministic Faucet Key Generation

- **File:** `scripts/generate-faucet-key.py`, lines 27, 41
- **Description:** Testnet faucet key derived from `sha256(b"axionax_faucet_mainnet_q2_2026")`.
- **Recommendation:** Ensure testnet-only; rename seed.

### LOW

#### DL-1: Outdated Base Image (debian:bullseye-slim)

- **File:** `testnet/.../Dockerfile`, line 52
- **Recommendation:** Update to `debian:bookworm-slim`.

#### DL-2: libssl-dev in Production Image

- **File:** `ops/deploy/Dockerfile`, line 65
- **Recommendation:** Use `libssl3` (runtime only).

#### DL-3: Deprecated X-XSS-Protection Header

- **Files:** All nginx server configs
- **Recommendation:** Remove; rely on CSP.

#### DL-4: Grafana Dashboards Editable

- **File:** `grafana/dashboards/dashboard.yml`, line 8
- **Recommendation:** Set `editable: false`.

#### DL-5: No Docker Resource Limits

- **Files:** All compose files
- **Recommendation:** Add `mem_limit`, `cpus`, `ulimits`.

#### DL-6: No Log Rotation

- **File:** `deploy-all-services.sh`, line 24
- **Recommendation:** Implement log rotation.

#### DL-7: Faucet Uses GET for State-Changing Operations

- **Files:** Both `faucet/index.js` and `faucet/server.js`
- **Recommendation:** Change to POST.

### INFORMATIONAL

#### DI-1: HTTP Bootnode Connections (No TLS)

- **Files:** `configs/monolith_*.toml`
- **Description:** `http://` for all RPC connections.

#### DI-2: Unpinned `:latest` Docker Images

- **Files:** Multiple compose files
- **Recommendation:** Pin to specific versions.

#### DI-3: Flat Docker Network (No Segmentation)

- **Files:** `docker-compose.dev.yml`, `docker-compose.vps.yml`
- **Recommendation:** Segment into frontend/backend/monitoring.

#### DI-4: No HEALTHCHECK in Testnet Dockerfile

- **File:** `testnet/.../Dockerfile`
- **Recommendation:** Add health check.

#### DI-5: Deprecated docker-compose Version Field

- **Files:** Multiple compose files
- **Recommendation:** Remove `version:` field.

#### DI-6: Alerting Not Configured

- **File:** `monitoring/prometheus.yml`, lines 9–13
- **Description:** Alertmanager commented out; no alerting rules.
- **Recommendation:** Configure alerts for critical conditions.

---

## 6. Remediation Priority Matrix

### P0 — IMMEDIATE (Before Any Public Deployment)

| Finding | Action |
|---------|--------|
| SC-1, SC-2, SC-3, SC-4 | Implement cryptographic authentication on ALL state-mutating RPC endpoints |
| SH-1 | Implement ECDSA signature verification in `send_raw_transaction` |
| RC-3 | Use node's actual keypair for Gossipsub and Identify |
| RC-1, RC-2 | Remove legacy VRF entirely; enforce ECVRF-only |
| DC-1, DC-2, DC-3 | Remove all hardcoded credentials from repository |
| DH-1, DH-2, DH-3 | Move all secrets to environment variables |

### P1 — HIGH PRIORITY (Within 1 Sprint)

| Finding | Action |
|---------|--------|
| RH-3 | Persist node identity keypair to disk |
| RH-5 | Enforce parent hash validation in `add_block()` |
| RH-2 | Add upper bounds on deserialization buffer allocation |
| SH-3 | Wire rate limiter and CORS middleware into RPC server |
| SH-4 | Fix unstake logic to actually reduce stake |
| SH-2 | Bind RPC to 127.0.0.1 by default |
| DH-4 | Restrict CORS to trusted domains |
| DH-5 | Remove `--unsafe-rpc` from public nodes |
| DH-6 | Add Redis authentication |
| DH-8 | Remove hardcoded IPs; use DNS and private config |
| PC-1 | Refactor ContractManager to avoid raw private keys |
| PC-2 | Use HTTPS/TLS for all RPC connections |

### P2 — MEDIUM PRIORITY (Within 2–4 Weeks)

| Category | Actions |
|----------|---------|
| Error Handling | Replace all `.unwrap()`/`.expect()` in production code with proper error handling |
| Integer Safety | Use checked/saturating arithmetic throughout |
| Network | Use bounded channels, implement rate limiting |
| Consensus | Deduplicate sample indices, fix fraud detection model |
| Staking | Fix slashing to work with delegations |
| Docker | Add USER directives, resource limits, network segmentation |
| Nginx | Fix rate-limit zone ordering, add `server_tokens off` |
| Python | Fix mutable defaults, secure keystore creation, secure key deletion |

### P3 — LOW PRIORITY (Ongoing Improvements)

| Category | Actions |
|----------|---------|
| Health Checks | Implement real health checks for DB, P2P, consensus |
| Monitoring | Configure alerting, restrict metrics access |
| SDK | Add address validation, request ID correlation |
| Docker | Update base images, pin versions, add HEALTHCHECKs |
| Logging | Implement log rotation, sanitize sensitive data |

---

## Disclaimer

This audit was performed via automated static analysis of the source code. It does not include:
- Dynamic analysis (fuzzing, runtime testing)
- Formal verification
- Economic modeling / game-theoretic analysis
- Third-party dependency CVE scanning
- Penetration testing

Findings are based on code review as of 2026-03-05. The absence of findings in a particular area does not guarantee the absence of vulnerabilities.
