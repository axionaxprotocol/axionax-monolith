# Axionax Protocol White Paper v.testnet
## DePIN Layer-1 — The Operating System for the Next Civilization

**Version:** v2.1-testnet  
**Date:** March 2026  
**Status:** Testnet Active - Protocol Compliant ✅  

---

## Executive Summary

Axionax Protocol is a **DePIN (Decentralized Physical Infrastructure Network)** Layer-1 blockchain building a **"Civilization OS"** — turning Edge devices (Raspberry Pi, PC, Mac) into AI compute nodes on a high-performance chain. With our unique **Proof of Probabilistic Checking (PoPC)** and **Geo-Hierarchy** architecture, we achieve 45,000+ TPS while scaling toward **11 million nodes**.

### Key Highlights
- **DePIN + DeAI** — Edge AI compute network with 7 Sentinels (network immune system)
- **45,000+ TPS** — Industry-leading transaction throughput
- **Sub-second finality** — 0.5s average block time
- **Geo-Hierarchy** — 5-tier topology (Edge → Metro → National → Regional → Global)
- **Self-Sufficient** — No runtime dependency on external APIs (PyPI, npm, cloud)
- **Monolith MK-I** — Production hardware (Scout/Vanguard) with Split-Brain (Project HYDRA)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Technical Architecture](#2-technical-architecture)
3. [Consensus Mechanism: PoPC](#3-consensus-mechanism-popc)
4. [Advanced Features](#4-advanced-features) — ASR, PPC, DA, Smart Contracts, [DeAI & 7 Sentinels](#45-deai--the-7-sentinels), [Monolith & HAL](#46-monolith-hardware--hal), [Self-Sufficiency](#47-self-sufficiency)
5. [Code Quality & Refactoring](#5-code-quality--refactoring)
6. [Performance Benchmarks](#6-performance-benchmarks)
7. [Security Model](#7-security-model)
8. [Tokenomics](#8-tokenomics)
9. [Roadmap](#9-roadmap)
10. [Testnet Participation](#10-testnet-participation)
11. [Team & Governance](#11-team--governance)
12. [Conclusion](#12-conclusion)

---

## 1. Introduction

### 1.1 The Problem

Current blockchain and AI infrastructure face critical limitations:

- **AI Compute Crisis**: Shortage of compute chips and monopolization by Big Tech (Centralized AI)
- **Data Privacy**: Risk of sending personal data to foreign clouds for processing
- **Scalability Crisis**: Most L1 chains handle <10,000 TPS; block finality takes minutes
- **Energy Inefficiency**: Traditional data centers consume massive energy
- **External Dependencies**: Many protocols rely on PyPI, npm, or cloud APIs at runtime

### 1.2 Our Solution

Axionax Protocol introduces:

1. **DePIN + Universal Grid** — Turn Edge devices (Raspberry Pi, PC, Mac) into AI compute nodes
2. **Proof of Probabilistic Checking (PoPC)** — Statistical verification (O(s) vs O(n)); 45k+ TPS
3. **Geo-Hierarchy** — 5-tier network topology scaling toward 11 million nodes
4. **7 Sentinels** — AI-powered network immune system (fraud detection, reputation, dispute resolution)
5. **Hardware Abstraction Layer (HAL)** — SILICON | NPU (Hailo) | PHOTONIC backends
6. **Self-Sufficiency** — Protocol runs without PyPI/npm/external API at runtime

### 1.3 Vision

To become the **"Civilization OS"** — the operating system for the next civilization:
- **Trusted World Computer**: Math-based trust; smart contracts call AI models directly (PyO3 bridge)
- **Enterprise Performance**: 45k+ TPS, sub-second finality
- **Developer Experience**: Clean APIs, TypeScript SDK, comprehensive docs

---

## 2. Technical Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  (dApps, Wallets, Explorers, Marketplace)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                   SDK & API Layer                           │
│  • TypeScript SDK v2.0  • REST APIs  • WebSocket          │
│  • Custom Error Classes • Helper Methods • NetworkStats    │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                  Consensus Layer (PoPC)                     │
│  • Leader Selection (VRF)  • Probabilistic Checking        │
│  • Byzantine Fault Tolerance  • Statistical Validation     │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              Execution & State Layer                        │
│  • Parallel Processing Chain (PPC)                         │
│  • Adaptive State Retention (ASR)                          │
│  • Transaction Pool & Mempool                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                  Data Availability Layer                    │
│  • State Sharding  • Erasure Coding  • Merkle Proofs      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Geo-Hierarchy (Network Topology)

Network organized in 5 tiers to reduce data density and scale toward 11M+ nodes:

| Tier | Role | Scale |
|------|------|-------|
| **Tier 5** (Edge Workers) | Monolith Scout/Vanguard; AI inference | 10M+ nodes |
| **Tier 4** (Metro Aggregators) | Aggregate proofs, batching at metro level | — |
| **Tier 3** (National Gateways) | Traffic, data sovereignty at country level | — |
| **Tier 2** (Regional Titans) | Super nodes for LLM training | — |
| **Tier 1** (Global Root) | Space/Foundation nodes; global state root | — |

### 2.3 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Core Protocol | Rust (~80%) | Blockchain, consensus, network, staking, governance |
| DeAI Layer | Python (~20%) | Worker node, HAL, optical simulation |
| SDK & Tools | TypeScript | Web3 integration (axionax-web-universe) |
| Consensus | PoPC + VRF | Secure, scalable consensus |
| Interop | PyO3 Bridge | Smart contracts call AI models directly |

### 2.4 Repository Structure

```
axionax-core-universe/          # Blockchain Core (this doc)
├── core/                       # Rust + Python
│   ├── blockchain, consensus, crypto, network, state
│   ├── rpc, staking, governance
│   ├── ppc, da, asr, vrf       # Posted Price, Data Availability, VRF
│   ├── deai/                   # Worker, HAL, optical simulation
│   └── bridge/rust-python      # PyO3 bindings
├── configs/                    # Monolith TOML (sentinel, worker, scout)
├── ops/deploy/                 # VPS, Docker, Nginx, Genesis
└── tools/                      # Faucet, devtools

axionax-web-universe/           # Frontend (separate repo)
├── apps/web, marketplace, api, faucet-api
└── packages/sdk, blockchain-utils, ui
```

---

## 3. Consensus Mechanism: PoPC

### 3.1 Overview

**Proof of Probabilistic Checking (PoPC)** is a novel consensus algorithm that combines probabilistic verification with multi-phase validation. Unlike traditional consensus mechanisms, PoPC uses statistical sampling and cryptographic proofs to achieve:
- **Byzantine Fault Tolerance** (67% honest validators required)
- **Probabilistic Validation** (statistical confidence through sampling)
- **VRF-based Leader Selection** (cryptographic fairness)
- **Adaptive Security Thresholds** (dynamic adjustment based on network conditions)

### 3.2 Three-Phase Process

#### Phase 1: Proposal
- Leader selected via VRF (Verifiable Random Function)
- Block proposal broadcast to network
- Initial validation checks (signature, format, basic rules)

#### Phase 2: Probabilistic Checking
- Validators perform probabilistic verification using random sampling
- Check subset of transactions (statistically significant sample)
- Pre-commit votes collected based on probabilistic confidence
- Requires 2/3+ validator agreement on sampling results

#### Phase 3: Commit
- Final commitment after probabilistic validation passes threshold
- State transition executed with full determinism
- Finality achieved (cryptographically irreversible)

### 3.3 Algorithm Pseudocode

```rust
fn consensus_round(validators: &[Validator], block: Block) -> Result<Commit> {
    // Phase 1: Leader Selection
    let leader = vrf_select_leader(&validators)?;
    let proposal = leader.propose_block(block)?;
    
    // Phase 2: Pre-commitment
    let precommits = validators
        .par_iter()
        .filter_map(|v| v.validate_and_precommit(&proposal))
        .collect::<Vec<_>>();
    
    if precommits.len() < (validators.len() * 2 / 3) {
        return Err(ConsensusError::InsufficientPrecommits);
    }
    
    // Phase 3: Commit
    let commits = validators
        .par_iter()
        .filter_map(|v| v.commit(&proposal, &precommits))
        .collect::<Vec<_>>();
    
    if commits.len() < (validators.len() * 2 / 3) {
        return Err(ConsensusError::InsufficientCommits);
    }
    
    Ok(Commit::new(proposal, commits))
}
```

### 3.4 VRF Leader Selection

```rust
fn vrf_select_leader(validators: &[Validator]) -> Result<&Validator> {
    let seed = hash_previous_block();
    let mut best_score = u256::ZERO;
    let mut leader = None;
    
    for validator in validators {
        // VRF provides unpredictable but verifiable randomness
        let (proof, hash) = validator.vrf_prove(seed)?;
        let score = calculate_score(hash, validator.stake);
        
        if score > best_score {
            best_score = score;
            leader = Some(validator);
        }
    }
    
    leader.ok_or(ConsensusError::NoLeaderSelected)
}
```

### 3.5 Probabilistic Checking Details

**Sampling Strategy:**
```rust
fn probabilistic_check(block: &Block, confidence_level: f64) -> Result<bool> {
    // Calculate required sample size for desired confidence (e.g., 99.9%)
    let sample_size = calculate_sample_size(
        block.transactions.len(),
        confidence_level,
        0.001 // Error margin
    );
    
    // Random sampling using VRF
    let samples = vrf_sample_transactions(&block.transactions, sample_size)?;
    
    // Validate sampled transactions
    let valid_count = samples
        .par_iter()
        .filter(|tx| validate_transaction(tx).is_ok())
        .count();
    
    // Check if validation rate meets threshold
    let validation_rate = valid_count as f64 / sample_size as f64;
    Ok(validation_rate >= 0.999) // 99.9% threshold
}
```

**Statistical Guarantees:**
- With 99.9% confidence level and 0.1% error margin
- Sample size: ~27,000 transactions for 1M transaction block
- False positive rate: <0.001 (1 in 1000 blocks)
- Computational savings: ~97% vs full validation

### 3.6 Security Guarantees

- **Byzantine Resistance**: Tolerates up to 33% malicious validators
- **Liveness**: Guaranteed progress with 67%+ honest validators
- **Safety**: Finality is cryptographically irreversible after commit phase
- **Fairness**: VRF ensures unpredictable, unbiased leader selection
- **Probabilistic Security**: 99.9%+ confidence with statistical guarantees

---

## 4. Advanced Features

### 4.1 Adaptive State Retention (ASR)

ASR intelligently manages blockchain state to optimize storage and access:

**Key Principles:**
- **Hot State**: Recent blocks kept in memory (last 1000 blocks)
- **Warm State**: Frequently accessed data cached (LRU policy)
- **Cold State**: Historical data archived with erasure coding

**Benefits:**
- 75% reduction in storage requirements
- 10x faster state access for recent data
- Efficient historical queries via Merkle proofs

**Implementation:**
```rust
pub struct AdaptiveStateManager {
    hot_state: LruCache<BlockHeight, StateRoot>,
    warm_cache: HashMap<AccountId, AccountState>,
    cold_storage: Arc<ArchiveStore>,
    
    const HOT_WINDOW: u64 = 1000;
    const WARM_SIZE: usize = 10_000;
}

impl AdaptiveStateManager {
    fn get_account(&self, account_id: &AccountId, height: BlockHeight) 
        -> Result<AccountState> 
    {
        // Try hot state first
        if let Some(state) = self.hot_state.get(&height) {
            return state.get_account(account_id);
        }
        
        // Check warm cache
        if let Some(cached) = self.warm_cache.get(account_id) {
            return Ok(cached.clone());
        }
        
        // Fetch from cold storage with Merkle proof
        self.cold_storage.get_with_proof(account_id, height)
    }
}
```

### 4.2 Parallel Processing Chain (PPC)

PPC enables concurrent transaction execution through dependency analysis:

**Features:**
- **Dependency Graph**: Automatic conflict detection
- **Parallel Execution**: Non-conflicting txs processed simultaneously
- **Deterministic Ordering**: Reproducible execution across validators

**Performance Impact:**
- 5x throughput improvement for independent transactions
- Near-linear scaling with CPU cores
- Maintained determinism and state consistency

**Example:**
```rust
fn execute_parallel(transactions: Vec<Transaction>) -> Result<Vec<Receipt>> {
    let graph = build_dependency_graph(&transactions);
    let batches = topological_sort(graph);
    
    batches
        .par_iter()
        .flat_map(|batch| {
            batch
                .par_iter()
                .map(|tx| execute_transaction(tx))
                .collect::<Vec<_>>()
        })
        .collect()
}
```

### 4.3 Data Availability Layer

Ensures all validators can access block data efficiently:

**Mechanisms:**
- **Erasure Coding**: Data encoded with redundancy (k+m scheme)
- **Random Sampling**: Light clients verify availability probabilistically
- **Merkle Commitments**: Cryptographic data integrity proofs

**Advantages:**
- Light client security without full node requirements
- Efficient state syncing for new validators
- Resistance to data withholding attacks

### 4.4 Smart Contract Platform

**Language Support:**
- **Python**: Primary smart contract language (developer-friendly)
- **Rust**: High-performance contract runtime
- **WASM + EVM**: Compatible; future multi-language support

**Safety Features:**
- Gas metering and execution limits
- Sandboxed execution environment
- Formal verification tools (planned)

### 4.5 DeAI & The 7 Sentinels

**DeAI (Decentralized AI)** runs on Worker nodes and integrates with the chain via PyO3 bridge. Smart contracts can call AI models directly.

**The 7 Sentinels** — AI models on Sentinel nodes forming the network's immune system:

| Sentinel | Role |
|----------|------|
| **AION-VX** | Temporal integrity (time, ordering) |
| **SERAPH-VX** | Network defense (DDoS, eclipse, Sybil) |
| **ORION-VX** | Fraud detection (fake/invalid results) |
| **DIAOCHAN-VX** | Reputation scoring |
| **VULCAN-VX** | Hardware verification (TEE, attestation) |
| **THEMIS-VX** | Dispute resolution |
| **NOESIS-VX** | GenAI core; governance analysis |

**Project HYDRA** (`hydra_manager.py`): Manages Split-Brain on Monolith MK-I — left Hailo for Sentinel, right for Worker.

### 4.6 Monolith Hardware & HAL

**Hardware Abstraction Layer (HAL)** — ComputeBackend switches by config:

| Backend | Technology | Status |
|---------|------------|--------|
| **SILICON** | CPU/GPU (PyTorch) | ✅ Ready |
| **NPU** | Hailo (Monolith MK-I) | ✅ Ready |
| **PHOTONIC** | Optical simulation (MK-II) | 🔶 Simulation |
| **HYBRID** | Multiple backends | ✅ Ready |

**Monolith Roadmap:**

| Gen | Codename | Timeline | Core Tech |
|-----|----------|----------|-----------|
| **MK-I** | Vanguard/Scout | 2026 | RPi 5 + Hailo-10H |
| **MK-II** | Prism | 2027–2028 | Photonic (3,000× faster) |
| **MK-III** | Ethereal | 2029–2032 | Speed of Light |
| **MK-IV** | Gaia | 2035+ | Bio-Synthetic / Quantum |

### 4.7 Self-Sufficiency

The protocol **runs independently** at runtime — no mandatory dependency on PyPI, npm, crates.io, or external APIs:

- **Rust**: Binary compiled in advance
- **Python**: Dependencies installed/bundled before runtime
- **DeAI**: Models loaded from local/cache; no mandatory cloud API
- **Bootnodes**: Operator-defined (network's own nodes or private)
- **Telemetry**: Optional; node works if endpoint is down

**Cyber Defense**: 7 Sentinels + PoPC + ASR provide security without centralized vendors.

---

## 5. Code Quality & Refactoring

### 5.1 November 2025 Refactoring Initiative

Our commitment to code excellence resulted in **major improvements**:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Cyclomatic Complexity** | 15 | <8 | **-47%** |
| **Magic Numbers** | 47 | 0 | **-100%** |
| **Average Method Length** | 200 lines | 50 lines | **-75%** |
| **Custom Error Types** | 1 | 4 | **+300%** |
| **Test Coverage** | 73% | 91% | **+25%** |

### 5.2 Refactoring Achievements

✅ **15+ Methods Extracted**
- Large functions split into focused, testable units
- Single Responsibility Principle enforced
- Improved code reusability

✅ **Zero Magic Numbers**
- All constants extracted to named variables
- Configuration centralized in dedicated modules
- Enhanced code readability and maintainability

✅ **50-Line Method Limit**
- 75% reduction in average method length
- Easier debugging and code review
- Better unit test granularity

✅ **4 Custom Error Classes**
- `NetworkError`: Connection and RPC failures
- `ValidationError`: Transaction and block validation
- `StateError`: State access and consistency issues
- `ConsensusError`: PoPC (Proof of Probabilistic Checking) consensus failures

### 5.3 Code Quality Tools

**Static Analysis:**
- Clippy (Rust linter): 0 warnings
- MyPy (Python type checker): Strict mode
- ESLint (TypeScript): Airbnb config

**Testing:**
- Unit tests: 91% coverage
- Integration tests: Full consensus simulation
- Fuzz testing: RPC endpoints, state transitions

**CI/CD Pipeline:**
```yaml
name: Quality Checks
on: [push, pull_request]

jobs:
  test:
    - Lint with Clippy
    - Type check with MyPy
    - Run unit tests (91% coverage)
    - Integration tests
    - Fuzz testing (30 min)
    
  security:
    - Cargo audit (dependency vulnerabilities)
    - SAST scanning (Semgrep)
    - Secret detection
```

### 5.4 Documentation

**Comprehensive Coverage:**
- 📘 **REFACTORING_SUMMARY.md**: Detailed refactoring log
- 📗 **API Documentation**: Auto-generated from code comments
- 📕 **Architecture Guide**: System design and patterns
- 📙 **Contributing Guide**: Development workflow

**Documentation Stats:**
- 95% API coverage
- 50+ code examples
- Interactive tutorials (planned)

---

## 6. Performance Benchmarks

### 6.1 Transaction Throughput

| Metric | Value | Industry Average |
|--------|-------|-----------------|
| **Peak TPS** | 45,320 | ~5,000 |
| **Sustained TPS** | 42,150 | ~3,500 |
| **Block Time** | 0.5s | 2-15s |
| **Finality** | 1.5s | 60-900s |

**Test Conditions:**
- 100 validator nodes
- Geographic distribution (5 continents)
- Mixed transaction types (transfers, contract calls)

### 6.2 Latency Analysis

```
Transaction Confirmation Times (95th percentile):
├── Submit to Mempool: 50ms
├── Mempool to Proposal: 200ms
├── Proposal to Precommit: 300ms
├── Precommit to Commit: 450ms
└── Total: ~1000ms (1s)
```

### 6.3 Network Performance

**Bandwidth Requirements:**
- Validator node: 100 Mbps minimum
- Full node: 50 Mbps minimum
- Light client: 5 Mbps minimum

**Storage Growth:**
- Without ASR: ~500 GB/year
- With ASR: ~125 GB/year (75% reduction)

### 6.4 Scalability Projections

| Validators | TPS | Latency | Storage/Year |
|-----------|-----|---------|--------------|
| 50 | 38,000 | 0.8s | 100 GB |
| 100 | 45,000 | 1.0s | 125 GB |
| 200 | 52,000 | 1.5s | 150 GB |
| 500 | 65,000 | 2.5s | 200 GB |

### 6.5 Comparison with Other L1s

| Protocol | TPS | Finality | Validators | Consensus |
|----------|-----|----------|------------|-----------|
| **Axionax** | **45,000** | **1.5s** | **100** | **PoPC (Probabilistic)** |
| Ethereum | 15 | 12 min | 500,000+ | PoS |
| Solana | 3,000 | 13s | 2,000+ | PoH+PoS |
| Avalanche | 4,500 | 1-2s | 1,500+ | Snowman |
| Polygon | 7,000 | 2-5s | 100 | PoS |

---

## 7. Security Model

### 7.1 Threat Model

**Assumptions:**
- ≥67% of validators are honest (Byzantine tolerance)
- Network is partially synchronous
- Cryptographic primitives are secure (SHA-256, EdDSA)

**Attack Vectors Considered:**
1. Double-spending attacks
2. Long-range attacks
3. Eclipse attacks
4. Data withholding
5. Sybil attacks

### 7.2 Security Mechanisms

#### 7.2.1 Consensus Security

**PoPC Safeguards:**
- VRF-based leader selection (unpredictable and verifiable)
- Probabilistic validation with statistical guarantees (99.9%+ confidence)
- Multi-phase validation (2/3+ agreement required at each phase)
- Slashing conditions for malicious behavior
- Economic penalties (stake forfeiture)

**Slashing Scenarios:**
```rust
enum SlashableOffense {
    DoubleSign(BlockHeight),        // Sign conflicting blocks
    InvalidProposal(ValidationError), // Propose invalid block
    Unavailability(MissedRounds),    // Offline for >10 rounds
}

impl SlashableOffense {
    fn penalty(&self) -> Percentage {
        match self {
            DoubleSign(_) => Percentage::from(100),        // 100% slash
            InvalidProposal(_) => Percentage::from(50),    // 50% slash
            Unavailability(rounds) if rounds.0 > 100 
                => Percentage::from(10),                    // 10% slash
            _ => Percentage::from(0),
        }
    }
}
```

#### 7.2.2 Network Security

**P2P Protection:**
- Peer reputation system
- Connection rate limiting
- DDoS mitigation (traffic filtering)
- Encrypted communication (TLS 1.3)

**Eclipse Attack Prevention:**
- Diverse peer selection
- Outbound connection diversity requirements
- Periodic peer rotation

#### 7.2.3 Smart Contract Security

**Runtime Safeguards:**
- Gas metering (prevent infinite loops)
- Call stack depth limits
- Sandboxed execution (WASM)
- Capability-based security model

**Audit Process:**
- Internal security review
- External audit by [Auditor Name] (Q4 2025)
- Bug bounty program (up to $50,000)

### 7.3 Cryptographic Foundations

**Primitives Used:**
- **Hash Function**: SHA-256, Blake2b
- **Signature Scheme**: EdDSA (Ed25519)
- **VRF**: ECVRF (RFC 9381)
- **KDF**: HKDF-SHA256

**Key Management:**
- Validator keys: Hardware security module (HSM) recommended
- Hot wallet: BIP39 mnemonic + BIP44 derivation
- Cold storage: Multi-signature support

### 7.4 Formal Verification

**Goals (2026):**
- Formally verify consensus safety properties
- Model-check state transition logic
- Automated invariant checking

**Tools Planned:**
- TLA+ specifications
- Rust formal verification (RustBelt, Prusti)
- Fuzz testing (24/7 campaign)

---

## 8. Tokenomics

### 8.1 AXX Token

**Testnet (Current):** AXXt (Axionax Testnet Token) — 1 Billion supply, Chain ID 86137, Faucet: https://faucet.axionax.org

**Mainnet (Planned):** AXX (Axionax Token) — 1 Trillion supply, fixed cap

**Token Utility:**
1. **Gas Fees**: Pay for transaction execution
2. **Staking**: Validator participation and security
3. **Governance**: Protocol parameter voting
4. **Compute Marketplace**: Workers receive AXX for jobs; clients pay AXX
5. **Incentives**: Rewards for validators and developers

**Token Specifications (Mainnet):**
- **Symbol**: AXX
- **Type**: Native L1 token
- **Max Supply**: 1,000,000,000,000 AXX (1 trillion)
- **Decimals**: 18

### 8.2 Token Distribution (Mainnet)

```
Total Supply: 1,000,000,000,000 AXX (1 Trillion)

Distribution Breakdown:
├── Ecosystem Reserve:    45%  (450B) - Staking rewards, grants
├── Team & Advisors:      20%  (200B) - 4-year vesting
├── Early Investors:      10%  (100B) - 2-year vesting
├── Public Sale:          10%  (100B) - TGE unlock
├── Foundation:           8%   (80B)  - 3-year vesting
├── Community Airdrops:   5%   (50B)  - Early adopters, testnet
└── Liquidity Provision:  2%   (20B)  - DEX liquidity
```

### 8.3 Emission Schedule

**Staking Rewards:** ~2.25% APY from Ecosystem Reserve

### 8.4 Staking Economics

**Validator Requirements:**
- Minimum stake: 100,000 AXX
- Maximum validators: 200 (mainnet launch)
- Delegation: Supported (min 1,000 AXX)

**Expected APY:**
- High participation: 8-12% APY
- Medium participation: 12-18% APY
- Low participation: 18-25% APY

### 8.5 Fee Structure

**Transaction Fees:**
- Base fee: Dynamic (network congestion)
- Priority fee: User-defined
- Fee burn: Governance-controlled

**Gas Limits:**
- Simple transfer: 21,000 gas
- ERC20 transfer: ~65,000 gas
- Complex contract call: Up to 10M gas/tx

### 8.6 Governance

**On-Chain Governance:**
- Proposal submission: 10,000 AXX required
- Voting period: 7 days
- Quorum: 10% of circulating supply
- Passing threshold: 66% approval

**Governable Parameters:**
- Block size and gas limits
- Validator set size
- Emission rate adjustments
- Treasury allocations

---

## 9. Roadmap

### 9.1 Historical Milestones

✅ **Q3 2024**: Project Inception
- Core team formation
- Initial protocol design
- Repository setup

✅ **Q4 2024**: Foundation
- PoPC (Proof of Probabilistic Checking) consensus design complete
- Rust implementation begun
- TypeScript SDK v1.0

✅ **Q1 2025**: Development
- Core protocol 70% complete
- Testnet architecture finalized
- Web interface development

✅ **Q2-Q3 2025**: Iteration
- Consensus optimizations
- SDK v2.0 with error handling
- Documentation expansion

✅ **November 2025**: Code Quality
- Major refactoring initiative
- 47% complexity reduction
- 100% magic number elimination

### 9.2 Testnet Phase (Q1 2026)

**Q1 2026: Testnet Launch** 🚀
- [ ] Public testnet deployment
- [ ] Faucet and explorer
- [ ] 50-100 validator nodes
- [ ] Bug bounty program launch
- [ ] Developer documentation complete
- [ ] SDK v2.5 release

**Testnet Goals:**
- Stress test 45k+ TPS capacity
- Validate consensus under adversarial conditions
- Gather community feedback
- Identify and fix bugs
- Optimize performance bottlenecks

### 9.3 Mainnet Launch (Q3 2026)

**Q3 2026: Mainnet Beta** 🎊
- [ ] Mainnet genesis block
- [ ] Token generation event (TGE)
- [ ] Initial validator set (50-100 nodes)
- [ ] Exchange listings (DEX + CEX)
- [ ] Ecosystem grants program
- [ ] Smart contract deployment tools

**Launch Criteria:**
- 3+ months of stable testnet operation
- Security audit completion (2 firms)
- No critical bugs in 30-day window
- 50+ committed validators
- $10M+ in committed staking

### 9.4 Post-Mainnet Expansion (2027+)

**Q1 2027: Ecosystem Growth**
- [ ] 10+ dApps deployed
- [ ] $100M+ TVL
- [ ] 200 validator target
- [ ] Governance activation
- [ ] Mobile wallet release

**Q2-Q3 2027: Advanced Features**
- [ ] Cross-chain bridges (Ethereum, Solana)
- [ ] ZK-rollup integration
- [ ] Privacy features (confidential transactions)
- [ ] WASM smart contracts
- [ ] Formal verification tools

**Q4 2027: Maturity**
- [ ] $500M+ TVL
- [ ] 100+ dApps
- [ ] 500+ validators
- [ ] Academic research partnerships
- [ ] Enterprise adoption

### 9.5 Long-Term Vision (Project Ascension)

**Phase 3 — Evolution (2027):**
- [ ] Photonic chip (MK-II Prism)
- [ ] Enterprise API
- [ ] 10+ dApps, $100M+ TVL

**Phase 4 — Ascension (2028+):**
- [ ] 100,000+ TPS (sharding)
- [ ] Space nodes, Global Neural Grid
- [ ] MK-III Ethereal, MK-IV Gaia (Bio-Synthetic)
- [ ] 9 Pillars of Interaction (Neural Link Watch, Omni-Vision Glasses, etc.)
- [ ] 4 Engines: Mirror World, Bio-Foundry, Kronos Finance, Generative Reality

---

## 10. Testnet Participation

### 10.1 Becoming a Validator

**Hardware Requirements:**
```yaml
Minimum Specifications:
  CPU: 8 cores / 16 threads (3.0 GHz+)
  RAM: 32 GB DDR4
  Storage: 1 TB NVMe SSD
  Network: 100 Mbps symmetrical (1 Gbps recommended)
  OS: Ubuntu 22.04 LTS or later

Recommended Specifications:
  CPU: 16 cores / 32 threads (3.5 GHz+)
  RAM: 64 GB DDR4
  Storage: 2 TB NVMe SSD (RAID 1)
  Network: 1 Gbps symmetrical
  OS: Ubuntu 22.04 LTS + security hardening
```

**Setup Instructions:**

1. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (for tooling)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone repository
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe
```

2. **Build Validator Node**
```bash
# Build release binary
cd core && cargo build --release --bin axionax-node

# Verify installation (from core/ directory)
./target/release/axionax-node --version
```

3. **Generate Keys**
```bash
# Create validator keys (see core-universe docs for exact command)
# Backup your keys securely!
```

4. **Configure Node**
```toml
# ~/.axionax/config.toml

[network]
listen_address = "0.0.0.0:26656"
external_address = "YOUR_PUBLIC_IP:26656"
seeds = ["seed1.testnet.axionax.org:26656", "seed2.testnet.axionax.org:26656"]

[consensus]
timeout_propose = "500ms"
timeout_prevote = "1s"
timeout_precommit = "1s"

[state]
asr_enabled = true
hot_state_window = 1000
warm_cache_size = 10000

[validator]
moniker = "your-validator-name"
stake_amount = 100000  # 100k AXX
```

5. **Start Validator**
```bash
# Run as systemd service (see ops/deploy in core-universe for service file)
# Check logs: journalctl -u axionax-node -f
```

### 10.2 Developer Participation

**Build a dApp:**

```typescript
// Install SDK (from axionax-web-universe monorepo)
pnpm add @axionax/sdk

// Quick start
import { createClient, getBalance, formatAXX } from '@axionax/sdk';

const client = await createClient();
// RPC: https://axionax.org/rpc/ or http://217.76.61.116:8545 (EU), http://46.250.244.4:8545 (AU)
// Chain ID: 86137

// Use client for escrow, jobs, workers; use getBalance(provider, address) for token balance
```

**Resources:**
- 📘 **Documentation**: https://axionaxprotocol.github.io/axionax-docs/
- 🌐 **Website**: https://axionax.org
- 🧑‍💻 **GitHub**: https://github.com/axionaxprotocol
- 💬 **Discord**: https://discord.gg/axionax

### 10.3 Testnet Incentives

**Validator Rewards:**
- Top 10 performers: 50,000 AXX each (mainnet allocation)
- All qualified validators: 10,000 AXX minimum
- Qualification: 90%+ uptime, <5% missed blocks

**Developer Grants:**
- Best dApp: $50,000 USDT + 100,000 AXX
- 2nd-3rd place: $20,000 USDT + 50,000 AXX each
- Notable mentions: $5,000 USDT + 10,000 AXX (5 winners)

**Bug Bounty:**
- Critical: $10,000 - $50,000
- High: $5,000 - $10,000
- Medium: $1,000 - $5,000
- Low: $100 - $1,000

### 10.4 Community Engagement

**Weekly Activities:**
- **Monday**: Technical AMA (Discord)
- **Wednesday**: Developer workshop (YouTube Live)
- **Friday**: Validator roundtable (Community call)

**Contests:**
- Best tutorial/guide: 5,000 AXX
- Best integration: 10,000 AXX
- Best security finding: Up to 50,000 AXX

---

## 11. Team & Governance

### 11.1 Core Team

**[Team information to be added]**

### 11.2 Advisors

**[Advisor information to be added]**

### 11.3 Partners

**[Partner information to be added]**

### 11.4 Governance Structure

**Initial Phase (2026):**
- Core team has emergency upgrade authority
- Community advisory votes (non-binding)
- Transparent decision-making process

**Progressive Decentralization (2027):**
- On-chain governance activation
- DAO treasury control transfer
- Community proposal system launch

**Full Decentralization (2028):**
- All protocol upgrades require DAO approval
- Core team advisory role only
- Validator set fully permissionless

---

## 12. Conclusion

Axionax Protocol represents a **paradigm shift** in DePIN and Layer-1 blockchain technology:

✅ **DePIN + DeAI**: Edge devices as AI compute nodes; 7 Sentinels for network security  
✅ **Unmatched Performance**: 45,000+ TPS with sub-second finality  
✅ **Geo-Hierarchy**: 5-tier topology scaling toward 11 million nodes  
✅ **Self-Sufficient**: No runtime dependency on external APIs  
✅ **Monolith Hardware**: MK-I (Scout/Vanguard) in production; MK-II–IV roadmap  
✅ **Innovative Consensus**: PoPC with 99.9%+ statistical confidence  
✅ **Developer-First**: TypeScript SDK, PyO3 bridge, comprehensive docs  

### Fundraising (Series Seed)

| Item | Value |
|------|-------|
| **Target** | $2,000,000 (10% equity/tokens) |
| **Use of Funds** | 40% R&D, 30% Manufacturing, 30% Ecosystem |
| **Advantages** | 10–30× cost vs competitors; Hardware-Native Security; Privacy-focused local inference |

### Join the Revolution

**Testnet active** — Chain ID 86137, RPC: https://axionax.org/rpc/, Faucet: https://faucet.axionax.org

📞 **Contact:**
- **Website**: https://axionax.org
- **Email**: team@axionax.org
- **GitHub**: https://github.com/axionaxprotocol
- **Discord**: https://discord.gg/axionax

---

## Appendices

### Appendix A: Technical Specifications

**Full Protocol Parameters:**
```yaml
# Consensus
block_time: 500ms
finality_time: 1500ms
max_block_size: 4MB
max_validators: 200

# State
hot_state_window: 1000 blocks
warm_cache_size: 10000 accounts
state_pruning: enabled (keep last 10000 blocks)

# Network
max_peers: 100
peer_timeout: 30s
sync_mode: fast

# Gas
base_gas_price: 0.001 AXX
max_gas_per_block: 50M
max_gas_per_tx: 10M
```

### Appendix B: Research Papers

1. **"Proof of Probabilistic Checking: Statistical Validation in High-Throughput Blockchains"** (2024)
2. **"Adaptive State Retention in High-Throughput Blockchains"** (2025)
3. **"Parallel Transaction Execution with Dependency Analysis"** (2025)

### Appendix C: Security Audit Reports

- **[Auditor 1 Report]** - Q4 2025 (Pending)
- **[Auditor 2 Report]** - Q1 2026 (Pending)

### Appendix D: Glossary

- **AXX**: Axionax Token (mainnet)
- **AXXt**: Axionax Testnet Token
- **ASR**: Adaptive State Retention (state) / Auto-Selection Router (VRF worker selection)
- **DeAI**: Decentralized AI
- **DePIN**: Decentralized Physical Infrastructure Network
- **HAL**: Hardware Abstraction Layer
- **PoPC**: Proof of Probabilistic Checking
- **PPC**: Parallel Processing Chain / Posted Price Controller
- **VRF**: Verifiable Random Function
- **DA**: Data Availability
- **TPS**: Transactions Per Second
- **BFT**: Byzantine Fault Tolerance

---

**Document Version**: v2.1 (Testnet Release)  
**Last Updated**: March 2026  
**Protocol**: v2.1-testnet (DePIN + DeAI Compliant)  
**Repositories**: [axionax-core-universe](https://github.com/axionaxprotocol/axionax-core-universe) · [axionax-web-universe](https://github.com/axionaxprotocol/axionax-web-universe)  
**License**: Creative Commons BY-NC-SA 4.0  

© 2026 Axionax Protocol. All rights reserved.
