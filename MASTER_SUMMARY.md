# Axionax Protocol — Master Summary (Complete Project Summary Document)

**Status:** Series Seed Preparation  
**Version:** 2.1 (February 2026)

---

## 1. Introduction & Vision (Introduction and Vision)

Axionax Protocol is a **Decentralized Physical Infrastructure Network (DePIN)** focused on building a **"Civilization OS"** — an operating system for the next civilization.

### The Problem

- **AI Compute Crisis:** Shortage of compute chips and monopolization of resources by Big Tech (Centralized AI).
- **Data Privacy:** Risk of sending personal data to foreign clouds for processing.
- **Energy Inefficiency:** Traditional data centers consume massive energy.

### The Solution

- Build a **Universal Grid** that turns Edge devices (Raspberry Pi, PC, Mac) into AI compute nodes.
- Use **Geo-Hierarchy** architecture to scale toward **11 million nodes**.
- Verify correctness with **PoPC (Proof of Probabilistic Checking)**.

---

## 2. Technical Architecture (Technical Architecture)

### 2.1 The Core Protocol (Layer 1)

| Item | Detail |
|------|--------|
| **Repository** | axionax-core-universe |
| **Languages** | Rust (~80% core logic) + Python (~20% DeAI layer) |
| **Consensus** | PoPC (Proof of Probabilistic Checking) |
| **Method** | Statistical probabilistic checking instead of full re-execution (\(O(s)\) vs \(O(n)\)). |
| **Finality** | Sub-second (~0.5 s). |
| **Validator selection** | VRF (Verifiable Random Function) for committee selection. |
| **Interop** | Rust ↔ Python via **PyO3 Bridge**; smart contracts can call AI models directly. |

### 2.2 Network Topology: The Hive

Geo-hierarchy in **5 tiers** to reduce data density:

| Tier | Role | Scale |
|------|------|--------|
| **Tier 5** (Edge Workers) | Monolith Scout/Vanguard; general AI inference | 10M+ nodes |
| **Tier 4** (Metro Aggregators) | Aggregate proofs from Tier 5, batching at metro level | — |
| **Tier 3** (National Gateways) | Traffic and data sovereignty at country level | — |
| **Tier 2** (Regional Titans) | Super nodes for large model training (LLM) | — |
| **Tier 1** (Global Root) | Space/Foundation nodes; global state root | — |

---

## 3. Hardware Ecosystem (Hardware Ecosystem)

### 3.1 Monolith MK-I "Vanguard" (Pro Edition)

- **Concept:** "The Bicameral Mind" (Split-Brain Architecture).
- **Base:** Raspberry Pi 5 (8GB).
- **AI:** Dual Hailo-10H (via PCIe Switch HAT).
- **Left Brain (Sentinel):** Security/validator workloads 24/7.
- **Right Brain (Worker):** Mining and heavy Marketplace jobs.
- **Target:** Power users / Tier 4 candidates.

### 3.2 Monolith MK-I "Scout+" (Starter GenAI Edition)

- **Concept:** "Personal AI Companion."
- **Base:** Raspberry Pi 5.
- **AI:** Raspberry Pi AI HAT+ 2 (Hailo-10H + 8GB on-board RAM).
- **Capabilities:** Run LLM (e.g. Llama-3-8B), VLM, chatbot on-device without taxing host RAM.
- **Target:** Mass adoption / Tier 5.

### 3.3 The Universal Grid (BYOD)

External hardware supported to extend the network:

| Name | Platform | Role |
|------|----------|------|
| **The Chimera** | Orange Pi 5 Plus (3 AI chips) | Tier 4 Aggregator |
| **The Silicon Archon** | Mac Mini/Studio | Elite Worker |
| **The Leviathan** | Enterprise server | Tier 2/3 |

---

## 4. DeAI & Sentinels (AI Systems)

### 4.1 The 7 Sentinels (Immune Network)

Dedicated AI models on Sentinel nodes for security and integrity:

| Sentinel | Role |
|----------|------|
| **AION-VX** | Temporal integrity (time verification) |
| **SERAPH-VX** | Network defense |
| **ORION-VX** | Fraud detection |
| **DIAOCHAN-VX** | Reputation scoring |
| **VULCAN-VX** | Hardware verification |
| **THEMIS-VX** | Dispute resolution |
| **NOESIS-VX** | GenAI core; high-level analysis and governance |

### 4.2 Project HYDRA (Resource Manager)

- **Software:** `hydra_manager.py`
- **Function:** Resource management on hardware (e.g. left Hailo for Sentinel, right for Worker), thermal management.

---

## 5. Web & Application Universe

| Item | Detail |
|------|--------|
| **Repository** | axionax-web-universe (monorepo) |
| **Stack** | Next.js, Tailwind CSS, TypeScript, pnpm |
| **Components** | Web Portal (Dashboard, Explorer, Faucet), Marketplace (compute power + escrow), Sales/Infrastructure page, API service (indexer, backend for mobile) |

---

## 6. Tokenomics & Roadmap (Economics and Business Plan)

### 6.1 Revenue Model

- **Hardware sales:** Monolith units.
- **Network fees:** Share of transaction gas.
- **Compute commission:** Marketplace fees (5–10%).

### 6.2 Roadmap (Project Ascension)

| Phase | Timeline | Focus |
|-------|----------|--------|
| **Phase 1 (The Incarnation)** | Q1 2026 | Public testnet, Monolith Scout/Vanguard sales, Geo-Hierarchy rollout |
| **Phase 2 (Genesis)** | Q3 2026 | Mainnet launch, AXX listing, live Marketplace |
| **Phase 3 (Evolution)** | 2027 | Photonic chip, Enterprise API |
| **Phase 4 (Ascension)** | 2028+ | Space nodes, Global Neural Grid |

---

## 7. Fundraising Data (Fundraising Information)

| Item | Value |
|------|--------|
| **Seed round target** | $2,000,000 (for 10% equity/tokens) |
| **Use of funds** | 40% R&D, 30% Manufacturing, 30% Ecosystem |
| **Advantages** | 10–30× cost vs competitors (e.g. Solana/Render); hardware-native security (Split-Brain); privacy-focused local inference |

---

*This document is the master summary of the Axionax Protocol project. Sourced from project code and internal documentation.*

**Document version:** 2.1 · February 2026
