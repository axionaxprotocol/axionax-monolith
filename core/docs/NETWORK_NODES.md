# All Node Types on the Axionax Network

Summary of **every node and service type** expected on the network (from config, deploy, and protocol in this repo).

---

## Overview

| Group | Node Types | Primary Role |
|-------|------------|--------------|
| **Blockchain (P2P)** | Validator, RPC, Full, Light, Bootnode | Consensus, sync, discovery |
| **Infrastructure** | RPC Node (service), Explorer, Faucet | API, block explorer, token distribution |
| **DeAI / Marketplace** | Worker Node (multiple variants) | Inference / Training jobs |

---

## 1. Blockchain Nodes (Chain / P2P Layer)

Nodes running `axionax-node` (or equivalent), mode set via config or `--role`.

### 1.1 Validator

| Item | Details |
|------|---------|
| **Role** | Produce blocks, participate in consensus (PoPc / PoS) |
| **Config** | `node.mode: "validator"` or `--role validator` |
| **Ports** | P2P (30333), RPC (8545) |
| **Stake** | Must meet `min_validator_stake` in genesis |
| **Refs** | `config.example.yaml`, `docker-compose` (validator), `setup_validator.sh` |

**Current testnet validators (2 VPS):**

| IP | Region | RPC |
|----|--------|-----|
| 217.76.61.116 | EU | http://217.76.61.116:8545 |
| 46.250.244.4 | AU | http://46.250.244.4:8545 |

### 1.2 RPC Node

| Item | Details |
|------|---------|
| **Role** | Serve JSON-RPC (eth_*, net_*, etc.), no block production |
| **Config** | `node.mode: "full"` + API enabled or `--role rpc` |
| **Ports** | 8545 (HTTP), 8546 (WebSocket) |
| **Used by** | Web, Marketplace, Worker, Explorer, Faucet |
| **Refs** | `configs/rpc-config.toml`, `setup_rpc_node.sh`, `docker-compose.vps.yml` (rpc-node) |

### 1.3 Full Node

| Item | Details |
|------|---------|
| **Role** | Full chain sync, full state storage |
| **Config** | `node.mode: "full"`, `sync_mode: "full"` |
| **Use** | Base for running RPC or validator on same machine |

### 1.4 Light Node

| Item | Details |
|------|---------|
| **Role** | Light client sync (headers / proofs), resource-efficient |
| **Config** | `node.mode: "light"` |
| **Status** | Defined in config, roadmap support |

### 1.5 Bootnode

| Item | Details |
|------|---------|
| **Role** | Bootstrap for P2P discovery — new nodes connect to find peers |
| **Config** | `--role bootnode` |
| **Ports** | P2P (30333 or 30334) |
| **Refs** | `environments/testnet/public/docker-compose.yaml` (bootnode) |

---

## 2. Infrastructure Services

Not P2P nodes; services that connect to the chain via RPC.

### 2.1 RPC Node (Service)

| Item | Details |
|------|---------|
| **Role** | Public RPC (testnet/mainnet) |
| **Deploy** | Docker: `rpc-node` / `axionax-rpc` |
| **Ports** | 8545, 8546 |
| **Domain** | rpc.axionax.org, testnet RPC per env |

### 2.2 Block Explorer

| Item | Details |
|------|---------|
| **Role** | UI + API for blocks, transactions, addresses |
| **Stack** | Blockscout or axionax-explorer, PostgreSQL |
| **Deploy** | `explorer`, `explorer-backend`, `setup_explorer.sh` |
| **Ports** | 4000 (Blockscout) or 3001 (API) |
| **Domain** | explorer.axionax.org, testnet-explorer.axionax.org |

### 2.3 Faucet

| Item | Details |
|------|---------|
| **Role** | Distribute testnet tokens (AXX) with rate limit |
| **Deploy** | `axionax-faucet` (Rust) or Node image, `setup_faucet.sh` |
| **Ports** | 8080 or 3002 |
| **Domain** | faucet.axionax.org, testnet-faucet.axionax.org |

### 2.4 Monitoring (Prometheus / Grafana)

| Item | Details |
|------|---------|
| **Role** | Node metrics (validator, rpc, bootnode, explorer, faucet) and dashboards |
| **Deploy** | `prometheus`, `grafana` in docker-compose / testnet public |

---

## 3. DeAI / Marketplace — Worker Nodes

Nodes that register with JobMarketplace and run Inference / Training / DataProcessing jobs.

Full details in **[MARKETPLACE_WORKER_NODES.md](./MARKETPLACE_WORKER_NODES.md)**. Summary:

| Type | Compute | Tier | Example |
|------|---------|------|---------|
| PC / Laptop | SILICON | 1 | CPU / AMD / NVIDIA GPU |
| Cloud GPU | SILICON | 2 | RunPod A40, GCP, Vertex AI |
| Monolith MK-I Sentinel | NPU | 3 | Hailo #0 — Security/Vision |
| Monolith MK-I Worker | NPU | 3 | Hailo #1 — General compute |
| Monolith MK-II (future) | PHOTONIC | 3 | Optical |

Workers connect to RPC to receive jobs and submit results on-chain / off-chain per current design.

---

## 4. P2P Protocol — Node Capabilities (Rust)

Nodes can advertise capabilities for ASR / routing:

| Field | Meaning |
|-------|---------|
| **compute_power** | Approximate FLOPS |
| **compute_type** | "SILICON", "HYBRID", "PHOTONIC" |
| **memory_type** | "DDR5", "HBM", "LIQUID_CRYSTAL", etc. |
| **is_monolith** | true = Monolith (God Node) |

Source: `core/core/network/src/protocol.rs` → `NodeCapabilities`, `PeerInfo.capabilities`

---

## 5. Summary Table — All Nodes

| Node / Service | Group | Short Role |
|----------------|-------|------------|
| **Validator** | Chain | Produce blocks, consensus |
| **RPC** | Chain / Infra | Serve JSON-RPC |
| **Full** | Chain | Full sync |
| **Light** | Chain | Light sync |
| **Bootnode** | Chain | P2P bootstrap |
| **Explorer** | Infra | Block/transaction explorer |
| **Faucet** | Infra | Testnet token distribution |
| **Prometheus / Grafana** | Infra | Metrics and dashboards |
| **Worker (PC/Cloud/Monolith)** | DeAI | Run compute jobs on Marketplace |

---

*This document is the single source of truth for node types on the Axionax network in this repo.*
