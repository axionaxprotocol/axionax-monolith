# Axionax Protocol — Master Summary

|             |                                                     |
| ----------- | --------------------------------------------------- |
| **Status**  | Series Seed Preparation                             |
| **Version** | 2.1                                                 |
| **Updated** | April 2026                                        |
| **Source**  | Compiled from source code and project documentation |

---

## 1. Introduction & Vision

**Axionax Protocol** is a **DePIN (Decentralized Physical Infrastructure Network)** focused on building **"Civilization OS"** — the operating system for the next civilization.

### The Problem

| Problem                 | Details                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| **AI Compute Crisis**   | Chip shortage and resource monopolization by Big Tech (Centralized AI) |
| **Data Privacy**        | Risk of sending personal data to foreign clouds for processing         |
| **Energy Inefficiency** | Traditional data centers consume massive energy                        |

### The Solution

- Build **Universal Grid** that turns Edge devices (Raspberry Pi, PC, Mac) into AI compute nodes
- Use **Geo-Hierarchy** architecture to scale toward **11 million nodes**
- Verify correctness with **PoPC** (Proof of Probabilistic Checking)

---

## 2. Technical Architecture

### 2.1 The Core Protocol (Layer 1)

| Item                    | Details                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Repository**          | [axionax-core-universe](https://github.com/axionaxprotocol/axionax-core-universe)      |
| **Languages**           | Rust (80% — Core Logic) + Python (20% — DeAI Layer)                                    |
| **Consensus**           | PoPC (Proof of Probabilistic Checking)                                                 |
| **Verification**        | Statistical probabilistic checking instead of full re-execution — \(O(s)\) vs \(O(n)\) |
| **Finality**            | Sub-second (~0.5s)                                                                     |
| **Validator Committee** | VRF (Verifiable Random Function) for selection                                         |
| **Interoperability**    | Rust ↔ Python via **PyO3 Bridge** — Smart contracts call AI models directly            |

### 2.2 Network Topology: The Hive (Geo-Hierarchy)

Network organized in 5 geographic tiers to reduce data density:

| Tier       | Name              | Role                                                |
| ---------- | ----------------- | --------------------------------------------------- |
| **Tier 5** | Edge Workers      | 10M+ nodes (Monolith Scout/Vanguard) — AI inference |
| **Tier 4** | Metro Aggregators | Aggregate proofs from Tier 5, metro-level batching  |
| **Tier 3** | National Gateways | Traffic and data sovereignty at country level       |
| **Tier 2** | Regional Titans   | Super nodes for LLM training                        |
| **Tier 1** | Global Root       | Space/Foundation nodes — global state root          |

---

## 3. Hardware Ecosystem

### 3.1 Monolith MK-I "Vanguard" (Pro Edition)

- **Concept:** "The Bicameral Mind" (Split-Brain Architecture)
- **Base:** Raspberry Pi 5 (8GB)
- **AI Engine:** Dual Hailo-10H (via PCIe Switch HAT)
- **Left Brain (Sentinel):** Security/Validator workloads 24/7
- **Right Brain (Worker):** Mining and heavy Marketplace jobs
- **Target:** Power User / Tier 4 Candidate

### 3.2 Monolith MK-I "Scout+" (Starter GenAI Edition)

- **Concept:** "Personal AI Companion"
- **Base:** Raspberry Pi 5
- **AI Engine:** Raspberry Pi AI HAT+ 2 (Hailo-10H + 8GB on-board RAM)
- **Capabilities:** Run LLM (Llama-3-8B), VLM, Chatbot on-device without taxing host RAM
- **Target:** Mass Adoption / Tier 5

### 3.3 The Universal Grid (BYOD)

External hardware support:

| Name                   | Hardware                      | Role              |
| ---------------------- | ----------------------------- | ----------------- |
| **The Chimera**        | Orange Pi 5 Plus (3 AI Chips) | Tier 4 Aggregator |
| **The Silicon Archon** | Mac Mini/Studio               | Elite Worker      |
| **The Leviathan**      | Enterprise Server             | Tier 2/3          |

---

## 4. DeAI & Sentinels

### 4.1 The 7 Sentinels (Network Immune System)

Dedicated AI models on Sentinel nodes for security verification:

| Sentinel        | Primary Role                                    |
| --------------- | ----------------------------------------------- |
| **AION-VX**     | Temporal integrity                              |
| **SERAPH-VX**   | Network defense                                 |
| **ORION-VX**    | Fraud detection                                 |
| **DIAOCHAN-VX** | Reputation scoring                              |
| **VULCAN-VX**   | Hardware verification                           |
| **THEMIS-VX**   | Dispute resolution                              |
| **NOESIS-VX**   | (GenAI Core) High-level analysis and governance |

### 4.2 Project HYDRA (Resource Manager)

- **Software:** `hydra_manager.py`
- **Function:** Resource allocation on hardware (e.g. left Hailo for Sentinel, right for Worker) and thermal management

---

## 5. Web & Application Universe

| Item           | Details                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Repository** | [axionax-web-universe](https://github.com/axionaxprotocol/axionax-web-universe) (Monorepo) |
| **Stack**      | Next.js, Tailwind CSS, TypeScript, pnpm                                                    |

### Key Components

- **Web Portal:** Dashboard, Explorer, Faucet
- **Marketplace:** Compute power trading (Escrow supported)
- **Sales Page:** Monolith hardware sales (Infrastructure Page)
- **API Service:** Blockchain indexer and backend API

---

## 6. Tokenomics & Roadmap

### 6.1 Revenue Model

- **Hardware Sales:** Monolith unit sales
- **Network Fees:** Share of transaction gas
- **Compute Commission:** Marketplace fees (5–10%)

### 6.2 Roadmap (Project Ascension)

| Phase       | Name            | Timeline | Key Goals                                                           |
| ----------- | --------------- | -------- | ------------------------------------------------------------------- |
| **Phase 1** | The Incarnation | Q1 2026  | Public Testnet, Monolith Scout/Vanguard sales, Geo-Hierarchy launch |
| **Phase 2** | Genesis         | Q3 2026  | Mainnet launch, AXX listing, live Marketplace                       |
| **Phase 3** | Evolution       | 2027     | Photonic chip, Enterprise API                                       |
| **Phase 4** | Ascension       | 2028+    | Space nodes, Global Neural Grid                                     |

---

## 7. Fundraising Data

| Item                  | Value                                     |
| --------------------- | ----------------------------------------- |
| **Seed Round Target** | $2,000,000 (for 10% Equity/Tokens)        |
| **Use of Funds**      | 40% R&D, 30% Manufacturing, 30% Ecosystem |

### Competitive Advantage

- 10–30× cheaper than competitors (Solana/Render)
- **Hardware-Native Security** (Split-Brain)
- **Privacy-focused** local inference

---

_This document is compiled from Axionax Protocol source code and internal documentation._
