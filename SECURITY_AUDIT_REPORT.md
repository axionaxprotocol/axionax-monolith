# Axionax Protocol -- Security Audit Report

**Scope:** 13 crates, 39 Rust source files in `core/core/`  
**Date:** 2026-03-05

---

## CRITICAL Findings

### C-1: No Authentication / Authorization on State-Mutating RPC Endpoints

- **Files:** `core/core/rpc/src/staking_rpc.rs:93-107`, `core/core/rpc/src/governance_rpc.rs:114-146`
- **Severity:** Critical
- **Category:** Missing Access Controls

**Description:** The RPC endpoints `staking_stake`, `staking_unstake`, `staking_delegate`, `staking_claimRewards`, `gov_createProposal`, `gov_vote`, `gov_finalizeProposal`, and `gov_executeProposal` accept a plain-text `address`/`proposer`/`voter` string parameter supplied by the caller. There is no signature verification, no authentication, and no authorization. Anyone can call these endpoints impersonating any address.

**Impact:** An attacker can stake/unstake/delegate on behalf of any address, vote on governance proposals as any voter with arbitrary weight, claim rewards belonging to any validator, and create/finalize/execute governance proposals without holding any stake. This completely compromises the staking and governance systems.

**Recommendation:** All state-mutating RPC methods must require a cryptographically signed transaction. The `address`/`voter`/`proposer` fields must be derived from a verified signature (e.g., ECDSA `ecrecover`), never accepted as a plain-text parameter from the caller.

---

### C-2: Vote Weight Not Verified Against Actual Stake

- **Files:** `core/core/rpc/src/governance_rpc.rs:212-238`, `core/core/governance/src/lib.rs:270-316`
- **Severity:** Critical
- **Category:** Vote Manipulation

**Description:** The `gov_vote` RPC method accepts a `vote_weight` parameter directly from the caller. The governance module's `vote()` function trusts this value and applies it without checking whether the voter actually holds that amount of stake.

**Impact:** Any attacker can pass a vote weight of `u128::MAX` to single-handedly pass or defeat any proposal, completely subverting the governance system.

**Recommendation:** The vote weight must be looked up from the staking module based on the authenticated voter's actual staked amount at the proposal's snapshot block. Remove the `vote_weight` parameter from the RPC interface.

---

### C-3: Proposer Stake Not Verified Against Actual Stake

- **Files:** `core/core/rpc/src/governance_rpc.rs:189-210`
- **Severity:** Critical
- **Category:** Governance Bypass

**Description:** The `gov_createProposal` method accepts `proposer_stake` as an RPC parameter from the caller. This value is used to check against `min_proposal_stake`, but it is never verified against the proposer's actual stake in the staking module.

**Impact:** An attacker with zero stake can create proposals by claiming a high `proposer_stake` value. Combined with C-2, an attacker can create and pass any proposal including treasury spend proposals.

**Recommendation:** The proposer's stake must be fetched from the staking module server-side.

---

### C-4: `finalize_proposal` total_staked Parameter is Caller-Supplied

- **Files:** `core/core/rpc/src/governance_rpc.rs:250-267`
- **Severity:** Critical
- **Category:** Governance Manipulation

**Description:** The `gov_finalizeProposal` RPC endpoint accepts `total_staked` as a parameter from the caller. This value is used in the quorum calculation. An attacker can supply an artificially small `total_staked` to make any small number of votes meet the quorum threshold.

**Impact:** Proposals can be finalized as "passed" even with negligible actual voter participation.

**Recommendation:** `total_staked` must be retrieved from the staking module server-side.

---

## HIGH Findings

### H-1: No Transaction Signature Verification in `send_raw_transaction`

- **File:** `core/core/rpc/src/lib.rs:253-275`
- **Severity:** High
- **Category:** Missing Input Validation / Authentication

**Description:** The `eth_sendRawTransaction` endpoint deserializes a `Transaction` from user-provided hex bytes and submits it to the mempool. There is no verification of the transaction signature. The `signature` and `signer_public_key` fields are never validated.

**Impact:** Anyone can submit transactions with arbitrary `from` fields, spending other users' funds.

**Recommendation:** Implement ECDSA signature verification. Derive `from` from `ecrecover(signature, hash)`.

---

### H-2: RPC Server Binds to 0.0.0.0 in Testnet/Mainnet Without Authentication

- **File:** `core/core/node/src/lib.rs:60-74`
- **Severity:** High
- **Category:** Network Exposure / Missing Authentication

**Description:** Testnet and mainnet `NodeConfig` presets bind the RPC server to `0.0.0.0:8545`, exposing all RPC endpoints (including state-mutating ones) to the public internet. The `--unsafe-rpc` flag has no actual effect.

**Impact:** All staking, governance, and transaction submission endpoints are publicly accessible without any authentication.

**Recommendation:** Default to `127.0.0.1`. Implement JWT or API-key authentication. Make `--unsafe-rpc` actually gate dangerous methods.

---

### H-3: Rate Limiter / CORS / Request Validator Not Applied to Server

- **File:** `core/core/rpc/src/middleware.rs` (entire), `core/core/rpc/src/lib.rs:279-306`
- **Severity:** High
- **Category:** DoS / Missing Security Controls

**Description:** `RateLimiter`, `RequestValidator`, and `CorsConfig` are fully implemented but never integrated into the actual RPC server.

**Impact:** The RPC server is unprotected against DoS, oversized payloads, and cross-origin attacks.

**Recommendation:** Integrate the existing middleware into `Server::builder()`.

---

### H-4: Unstake Does Not Actually Reduce Stake Amount

- **File:** `core/core/staking/src/lib.rs:210-239`
- **Severity:** High
- **Category:** Staking Logic Error

**Description:** The `unstake` function validates `amount <= validator.stake` but never subtracts the amount. It only sets the `unlock_block`. The `withdraw` function later withdraws the entire stake regardless of the requested amount.

**Impact:** A validator requesting to unstake 1 token can later withdraw their entire stake. Breaks partial unstaking semantics.

**Recommendation:** Store the unstake amount separately and subtract from total stake. `withdraw` should return only the pending amount.

---

### H-5: Truncation of Transaction Value (u128 to u64) in Node

- **File:** `core/core/node/src/lib.rs:386`
- **Severity:** High
- **Category:** Integer Overflow / Data Loss

**Description:** When publishing a transaction to the network, `tx.value as u64` silently truncates a `u128` value to `u64`.

**Impact:** Transactions with value > `u64::MAX` will have their value silently truncated, leading to loss of funds or incorrect propagation.

**Recommendation:** Use `u128` throughout the network protocol or implement checked conversion with error handling.

---

### H-6: `execute_proposal` Has No Access Control

- **Files:** `core/core/rpc/src/governance_rpc.rs:269-277`, `core/core/governance/src/lib.rs:347-388`
- **Severity:** High
- **Category:** Missing Access Control

**Description:** The `gov_executeProposal` endpoint can be called by anyone. It marks the proposal as `Executed`, preventing legitimate execution.

**Impact:** An attacker could front-run the intended execution flow or grief the system.

**Recommendation:** Restrict to authorized callers or implement automatic execution.

---

## MEDIUM Findings

### M-1: `.unwrap()` on `SystemTime` in Production Code

- **Files:** `core/core/rpc/src/health.rs:87`, `core/core/events/src/lib.rs:178,209`, `core/core/da/src/lib.rs:443-445`, `core/core/genesis/src/lib.rs:391`
- **Severity:** Medium
- **Category:** Improper Error Handling

**Description:** Multiple `.unwrap()` calls on `SystemTime::now().duration_since(UNIX_EPOCH)` and serialization, violating the project's own rule to never use `.unwrap()` in production code.

**Impact:** A panic would crash the node, causing denial of service.

**Recommendation:** Replace with `.unwrap_or(0)` / `.unwrap_or_default()` or proper error handling.

---

### M-2: `unwrap_or(0)` Silently Hides State DB Errors

- **File:** `core/core/rpc/src/lib.rs:316-317,333-334`
- **Severity:** Medium
- **Category:** Error Handling / Silent Failures

**Description:** `system_status` and `system_health` silently swallow database errors by using `.unwrap_or(0)`.

**Impact:** Operators will not be alerted to database failures.

**Recommendation:** Surface database errors through the health check response.

---

### M-3: Event History Uses O(n) `Vec::remove(0)`

- **File:** `core/core/events/src/lib.rs:189-194`
- **Severity:** Medium
- **Category:** DoS / Performance

**Description:** The event history uses `Vec::remove(0)` for eviction, which is O(n).

**Impact:** Performance bottleneck under high event throughput.

**Recommendation:** Use `VecDeque` for O(1) front removal.

---

### M-4: `block_on` Inside Async Context

- **File:** `core/core/rpc/src/lib.rs:433-435`
- **Severity:** Medium
- **Category:** Concurrency / Potential Deadlock

**Description:** `tokio::runtime::Handle::current().block_on()` is called inside an async context.

**Impact:** Can deadlock the RPC server if all tokio worker threads are blocked.

**Recommendation:** Use `register_async_method` or `tokio::task::block_in_place`.

---

### M-5: No Nonce Validation on Transactions

- **File:** `core/core/rpc/src/lib.rs:253-275`
- **Severity:** Medium
- **Category:** Transaction Replay

**Description:** `send_raw_transaction` does not validate transaction nonces.

**Impact:** Transactions could be replayed, causing double-spending.

**Recommendation:** Implement per-account nonce tracking and validation.

---

### M-6: Slashing Calculation Includes Delegations But Only Deducts From Self-Stake

- **File:** `core/core/staking/src/lib.rs:334-366`
- **Severity:** Medium
- **Category:** Staking Logic Error

**Description:** Slash amount is based on `voting_power()` (stake + delegated) but only deducted from self-stake. Validators with high delegation ratios may become unslashable.

**Impact:** Reduces economic security; delegators don't share slashing risk.

**Recommendation:** Calculate slash based on self-stake only, or distribute proportionally.

---

### M-7: No Bound on Subscription Count (DoS)

- **Files:** `core/core/rpc/src/lib.rs:385-428`, `core/core/events/src/lib.rs:231-248`
- **Severity:** Medium
- **Category:** DoS

**Description:** No limit on the number of active event subscriptions.

**Impact:** Memory exhaustion via subscription flooding.

**Recommendation:** Implement per-IP and global subscription limits.

---

### M-8: Secret Key Bytes Exposed Through Public Method

- **File:** `core/core/vrf/src/lib.rs:142-146`
- **Severity:** Medium
- **Category:** Key Material Exposure

**Description:** `VRFKeyPair::secret_key_bytes()` is public and returns raw secret key bytes.

**Impact:** Key material could be leaked if logged or transmitted.

**Recommendation:** Remove or restrict to `pub(crate)`.

---

## LOW Findings

### L-1: Hardcoded Validator IP Addresses in Genesis

- **File:** `core/core/genesis/src/lib.rs:329,334`
- **Severity:** Low
- **Category:** Information Leakage

**Description:** Validator IPs are hardcoded in source code.

**Impact:** Infrastructure IPs exposed to targeted DoS.

**Recommendation:** Move to external configuration files.

---

### L-2: Metrics Endpoints Expose Internal State Without Auth

- **Files:** `core/core/rpc/src/lib.rs:357-371`, `core/core/rpc/src/server.rs:161-176`
- **Severity:** Low
- **Category:** Information Leakage

**Description:** `metrics_prometheus` and `metrics_json` expose internal state without authentication.

**Impact:** Reconnaissance for front-running, activity pattern analysis.

**Recommendation:** Restrict metrics to internal networks or add authentication.

---

### L-3: `--unsafe-rpc` Flag Has No Effect

- **File:** `core/core/node/src/main.rs:68-69,105-107`
- **Severity:** Low
- **Category:** Dead Code / Misconfiguration

**Description:** The flag is parsed and logged but has no effect on behavior.

**Impact:** False sense of security for operators.

**Recommendation:** Implement actual method gating based on the flag.

---

### L-4: Peer Reputation Metric Labels Could Be Spoofed

- **File:** `core/core/metrics/src/lib.rs:287-288`
- **Severity:** Low
- **Category:** Metrics Injection

**Description:** Label values are not sanitized for Prometheus exposition format.

**Impact:** Crafted peer IDs could inject arbitrary metrics.

**Recommendation:** Sanitize label values per Prometheus spec.

---

### L-5: CORS `dev()` Config Allows All Origins

- **File:** `core/core/rpc/src/middleware.rs:198-207`
- **Severity:** Low
- **Category:** Insecure Default

**Description:** `CorsConfig::dev()` allows all origins; could be accidentally used in production.

**Impact:** Cross-origin attacks if used in production.

**Recommendation:** Add environment checks to prevent dev CORS in production.

---

### L-6: No Maximum Length on Proposal Title/Description

- **Files:** `core/core/rpc/src/governance_rpc.rs:189-210`, `core/core/governance/src/lib.rs:227-267`
- **Severity:** Low
- **Category:** Input Validation / DoS

**Description:** No max length on proposal strings.

**Impact:** Memory exhaustion via oversized proposals.

**Recommendation:** Add length limits (e.g., 256 chars title, 10K chars description).

---

### L-7: No Gas Price/Limit Validation on Submitted Transactions

- **File:** `core/core/rpc/src/lib.rs:253-275`
- **Severity:** Low
- **Category:** Input Validation

**Description:** No validation on gas_price, gas_limit, or value fields.

**Impact:** Malformed transactions could flood the mempool.

**Recommendation:** Validate gas_price >= minimum and gas_limit within bounds.

---

## INFORMATIONAL Findings

### I-1: Simplified Erasure Coding (XOR Only)

- **File:** `core/core/da/src/lib.rs:247-272`
- **Category:** Implementation Completeness
- **Note:** XOR parity provides no real redundancy. Implement Reed-Solomon before production.

### I-2: ASR VRF Is a Hash, Not a True VRF

- **File:** `core/core/asr/src/lib.rs:465-473`
- **Category:** Cryptographic Weakness
- **Note:** Use the actual VRF module from `core/core/vrf/`.

### I-3: RPC Example Uses Wrong Function Signature

- **File:** `core/core/rpc/examples/state_rpc_integration.rs:113`
- **Category:** API Inconsistency
- **Note:** Example won't compile; needs updating.

### I-4: Sync Task Creates Disconnected Channel

- **File:** `core/core/node/src/lib.rs:182`
- **Category:** Dead Code
- **Note:** Sync loop never receives messages. Integrate with `NetworkManager`.

### I-5: `Relaxed` Ordering for All Atomics in Metrics

- **File:** `core/core/metrics/src/lib.rs:13`
- **Category:** Correctness
- **Note:** Acceptable for metrics; document the design choice.

---

## Summary

| Severity       | Count |
|----------------|-------|
| Critical       | 4     |
| High           | 6     |
| Medium         | 8     |
| Low            | 7     |
| Informational  | 5     |
| **Total**      | **30** |

The most pressing issues are the **complete absence of authentication and authorization on all state-mutating RPC endpoints** (C-1 through C-4, H-1). These Critical findings must be addressed before any testnet or mainnet deployment.
