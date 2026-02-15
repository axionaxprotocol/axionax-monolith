# Full Architecture — Axionax Core Universe

End-to-end architecture of Axionax Protocol: blockchain, network, DeAI, and hardware layers.

---

## 1. High-Level Overview

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                  AXIONAX ECOSYSTEM                       │
                    └─────────────────────────────────────────────────────────┘
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│   Web / dApps     │  │   Marketplace     │  │   Explorer        │  │   Faucet           │
│   (axionax-web)   │  │   (Compute Jobs)  │  │   (Blockscout)    │  │   (Testnet AXX)    │
└─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘
          │                       │                       │                       │
          └───────────────────────┼───────────────────────┼───────────────────────┘
                                  ▼                       ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │              RPC LAYER (JSON-RPC 8545/8546)              │
                    └─────────────────────────────────────────────────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          ▼                               ▼                               ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────────────────────────┐
│  Blockchain P2P   │  │  DeAI Workers      │  │  Infrastructure (Validator, Bootnode,     │
│  (Validators,     │  │  (Marketplace     │  │  RPC Node, Explorer Backend, Faucet)       │
│   Full, Light,    │  │   Worker Nodes)   │  │  → All node types: NETWORK_NODES.md        │
│   Bootnode)       │  │                   │  │                                             │
└───────────────────┘  └───────────────────┘  └───────────────────────────────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  CORE (Rust): blockchain, consensus (PoPC), network, state, rpc, staking, governance,   │
│               ppc, da, asr, vrf, events, cli, metrics, genesis                            │
│  DeAI (Python): worker_node, compute_backend (HAL), optical simulation, JobMarketplace   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  HARDWARE LAYER (HAL): SILICON (CPU/GPU) | NPU (Hailo, Monolith MK-I) | PHOTONIC (MK-II)│
│  → MONOLITH_ROADMAP.md (MK-I → MK-IV)                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure (axionax-core-universe)

| Layer | Folder / Component | Role |
|-------|-------------------|------|
| **Core (Rust)** | `core/` | Blockchain protocol and node services |
| **DeAI (Python)** | `core/deai/` | Worker node, HAL (ComputeBackend), optical simulation |
| **Ops** | `ops/deploy/` | Deploy scripts, environments, monitoring, nginx |
| **Tools** | `tools/` | Faucet (Rust), devtools (Python), scripts |
| **Config** | `configs/` | Monolith HYDRA (sentinel / worker TOML) |
| **Root** | `hydra_manager.py` | Project HYDRA — Dual-Core (Split-Brain) MK-I controller |

---

## 3. Core Protocol (Rust) — 19 Modules

| Module | Role |
|--------|------|
| **blockchain** | Block and chain management |
| **consensus** | PoPC (Proof of Probabilistic Checking), Proof-of-Light (simulation) |
| **crypto** | Ed25519, Blake3, cryptographic primitives |
| **network** | P2P (libp2p), Gossipsub, NodeCapabilities (ASR / Monolith) |
| **state** | RocksDB state management |
| **rpc** | JSON-RPC API, WebSocket, health endpoints |
| **config** | Load config (YAML/TOML) |
| **node** | Node runner — network, state, RPC |
| **staking** | Native staking (stake, delegate, slash) |
| **governance** | On-chain governance (proposals, voting) |
| **ppc** | Posted Price Controller — dynamic compute pricing |
| **da** | Data Availability — erasure coding |
| **asr** | Auto-Selection Router — VRF-based worker selection |
| **vrf** | Verifiable Random Function (commit-reveal) |
| **events** | Pub/Sub events (blocks, transactions, staking) |
| **cli** | Command-line interface |
| **metrics** | Prometheus metrics |
| **genesis** | Genesis block generator |
| **bridge (rust-python)** | PyO3 bindings for Python |

---

## 4. Network Layer (All Node Types)

- **Blockchain (P2P):** Validator, RPC Node, Full Node, Light Node, Bootnode  
- **Infrastructure:** RPC service, Block Explorer, Faucet, Prometheus/Grafana  
- **DeAI / Marketplace:** Worker Node (PC, Cloud GPU, Monolith MK-I Sentinel/Worker)

→ Full details: [NETWORK_NODES.md](./NETWORK_NODES.md)

---

## 5. DeAI & Compute (Python + HAL)

- **Worker Node** (`worker_node.py`): Registers with JobMarketplace, runs Inference / Training / DataProcessing jobs.  
- **ComputeBackend (HAL)** (`compute_backend.py`): Switches backend by config.  
  - **SILICON** — CPU / GPU (PyTorch)  
  - **NPU** — Hailo (Monolith MK-I, Project HYDRA)  
  - **PHOTONIC** — Optical simulation (MK-II)  
  - **HYBRID** — Multiple backends  
- **JobMarketplace:** Smart contract (registerWorker, createJob, submitResult).  
- **ASR (Rust):** Selects workers by capability and VRF.  

→ Worker types: [MARKETPLACE_WORKER_NODES.md](./MARKETPLACE_WORKER_NODES.md)

---

## 6. Hardware & Monolith (Vision + Status)

| Generation | Codename | Technology | Status in Repo |
|------------|----------|------------|----------------|
| **MK-I** | Vanguard / Origin | Silicon + NPU (Hailo, RPi 5) | ✅ HAL + HYDRA configs |
| **MK-II** | Prism | Custom ASIC/FPGA → Photonic | 🔶 Simulation (optical, PoL) |
| **MK-III** | Ethereal | Photonic (Speed of Light) | 📐 Roadmap |
| **MK-IV** | Gaia | Bio-Synthetic / Quantum | 🌐 Vision |

→ Details: [MONOLITH_ROADMAP.md](./MONOLITH_ROADMAP.md)

---

## 7. System Vision (Project Ascension)

- **Trusted World Computer:** Math-based trust.  
- **9 Pillars of Interaction:** Monolith, Neural Link Watch, Omni-Vision Glasses, Gaia Hub, Aero-Sentinel, Infinity Slate, Aether Pillar, Photon Key, Haptic Veil.  
- **4 Engines:** Mirror World, Bio-Foundry, Kronos Finance, Generative Reality.  
- **3 Phases:** Silicon Phase (current) → Transition (HAL ready) → Photonic Phase (Monolith MK-II).

→ Details: [PROJECT_ASCENSION.md](./PROJECT_ASCENSION.md)

---

## 8. Single Diagram Summary

```
[ Users / dApps / Web / Marketplace ]
              │
              ▼
[ RPC: eth_*, net_*, custom ]
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
[ Chain ] [ Workers ] [ Explorer / Faucet ]
    │         │
    ▼         ▼
[ Rust Core + DeAI Python ]
    │         │
    ▼         ▼
[ HAL: SILICON | NPU | PHOTONIC ]
    │
    ▼
[ Monolith MK-I → MK-IV (Hardware Roadmap) ]
```

---

## See also

| Document | Description |
|----------|-------------|
| [PROJECT_ASCENSION.md](./PROJECT_ASCENSION.md) | Vision, 9 Pillars, 4 Engines |
| [MONOLITH_ROADMAP.md](./MONOLITH_ROADMAP.md) | MK-I to MK-IV hardware specs |
| [NETWORK_NODES.md](./NETWORK_NODES.md) | All node types on the network |
| [MARKETPLACE_WORKER_NODES.md](./MARKETPLACE_WORKER_NODES.md) | Worker types on Compute Marketplace |
| [SENTINELS.md](./SENTINELS.md) | The 7 Sentinels (network immune system) |
| [API_REFERENCE.md](./API_REFERENCE.md) | RPC and API reference |
| [RPC_API.md](./RPC_API.md) | JSON-RPC methods |

---

*Full architecture overview for Axionax Core Universe. See `core/docs/` for all references.*

**Version:** 2026-02
