# Node Hardware Specifications — Axionax Network

Hardware requirements for all node and service types on the Axionax network.

---

## 1. Blockchain Nodes (P2P Layer)

### 1.1 Full Node

Full chain sync, full state storage. Base for RPC or Validator.

| Tier | CPU | RAM | Storage | Bandwidth | Use Case |
|------|-----|-----|---------|-----------|----------|
| **Minimum** | 2 cores | 4 GB | 50 GB SSD | 1 TB/mo | Dev, testing |
| **Recommended** | 4 cores | 8 GB | 100 GB NVMe | 2 TB/mo | Testnet |
| **Production** | 8 cores | 16 GB | 200 GB NVMe | 4 TB/mo | Mainnet |

**Notes:**
- RocksDB state + block storage grows with chain size
- NVMe recommended for I/O performance
- Static IP required for P2P

---

### 1.2 Validator

Same as Full Node + block production. Higher availability required.

| Tier | CPU | RAM | Storage | Bandwidth | Stake |
|------|-----|-----|---------|-----------|-------|
| **Minimum** | 4 cores | 8 GB | 100 GB NVMe | 2 TB/mo | min_validator_stake |
| **Recommended** | 8 cores | 16 GB | 200 GB NVMe | 4 TB/mo | — |
| **Production** | 8+ cores | 32 GB | 500 GB NVMe | 6 TB/mo | — |

**Notes:**
- Must meet `min_validator_stake` (genesis: 10,000 AXX)
- 99.9%+ uptime target
- DDoS protection recommended

---

### 1.3 RPC Node

Full Node + JSON-RPC API. Serves dApps, Explorer, Faucet, Workers.

| Tier | CPU | RAM | Storage | Bandwidth | Concurrent |
|------|-----|-----|---------|-----------|------------|
| **Minimum** | 2 cores | 4 GB | 50 GB SSD | 1 TB/mo | ~100 req/s |
| **Recommended** | 4 cores | 8 GB | 100 GB NVMe | 2 TB/mo | ~500 req/s |
| **Production** | 8 cores | 16 GB | 200 GB NVMe | 4 TB/mo | 1000+ req/s |

**RAM breakdown (Full Mode):**
- Node process: 2–3 GB
- RPC handlers: 1–2 GB
- OS + buffer: 2 GB

---

### 1.4 Light Node

Headers + proofs only. Resource-efficient.

| Tier | CPU | RAM | Storage | Bandwidth |
|------|-----|-----|---------|-----------|
| **Minimum** | 1 core | 512 MB | 5 GB | 100 GB/mo |
| **Recommended** | 2 cores | 1 GB | 10 GB | 200 GB/mo |

**Status:** Roadmap support (config defined, implementation pending)

---

### 1.5 Bootnode

P2P discovery only. Minimal resources.

| Tier | CPU | RAM | Storage | Bandwidth |
|------|-----|-----|---------|-----------|
| **Minimum** | 1 core | 512 MB | 5 GB | 500 GB/mo |
| **Recommended** | 2 cores | 1 GB | 10 GB | 1 TB/mo |

---

## 2. Infrastructure Services

### 2.1 Faucet

Rust service. Rate-limited token distribution.

| Tier | CPU | RAM | Storage | Bandwidth |
|------|-----|-----|---------|-----------|
| **Minimum** | 0.5 core | 256 MB | 1 GB | 10 GB/mo |
| **Recommended** | 1 core | 512 MB | 2 GB | 50 GB/mo |

---

### 2.2 Block Explorer (Blockscout)

PostgreSQL + indexer + UI.

| Tier | CPU | RAM | Storage | Bandwidth |
|------|-----|-----|---------|-----------|
| **Minimum** | 4 cores | 8 GB | 100 GB SSD | 1 TB/mo |
| **Recommended** | 8 cores | 16 GB | 200 GB NVMe | 2 TB/mo |

**Components:**
- PostgreSQL: 2–4 GB RAM
- Indexer: 2–4 GB RAM
- Web UI: 512 MB

---

### 2.3 Monitoring (Prometheus + Grafana)

| Tier | CPU | RAM | Storage | Retention |
|------|-----|-----|---------|-----------|
| **Minimum** | 1 core | 1 GB | 20 GB | 7 days |
| **Recommended** | 2 cores | 2 GB | 50 GB | 30 days |

---

## 3. DeAI / Marketplace — Worker Nodes

### 3.1 Tier 1 — PC / Laptop (Edge)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16 GB |
| **GPU** | Optional (4 GB VRAM) | NVIDIA / AMD 8 GB+ |
| **Storage** | 50 GB | 100 GB SSD |
| **Network** | 10 Mbps | 50 Mbps |

**Use:** Light Inference, Testing, Development

---

### 3.2 Tier 2 — Cloud GPU (Server)

| Component | RunPod A40 | GCP T4 | Vertex AI |
|-----------|------------|--------|-----------|
| **GPU** | A40 48 GB | T4 16 GB | T4/V100 16 GB+ |
| **CPU** | 8 vCPU | 4 vCPU | 4 vCPU |
| **RAM** | 32 GB | 15 GB | 15 GB |
| **Storage** | 100 GB | 100 GB | 100 GB |

**Use:** Heavy Training, Inference, Production jobs

---

### 3.3 Tier 3 — Monolith MK-I

| Component | Sentinel | Worker |
|-----------|----------|--------|
| **Base** | RPi 5 8 GB | RPi 5 8 GB |
| **NPU** | Hailo #0 (Vision) | Hailo #1 (Compute) |
| **Storage** | 64 GB | 64 GB |
| **Power** | 15–25 W | 15–25 W |

**Use:** Edge AI, Security, General compute

---

## 4. Combined Deployments (VPS)

### Minimal (4–8 GB RAM)

| Service | RAM | Notes |
|---------|-----|-------|
| RPC Node | 2–3 GB | Single node |
| Faucet | 512 MB | — |
| Infra | 2 GB | Nginx, minimal |
| **Total** | **~5 GB** | Testnet only |

### Full (8 GB+ RAM)

| Service | RAM | Notes |
|---------|-----|-------|
| RPC Node | 3–4 GB | — |
| Explorer | 2–4 GB | PostgreSQL + indexer |
| Faucet | 512 MB | — |
| Prometheus | 1 GB | — |
| Grafana | 512 MB | — |
| **Total** | **6–8 GB** | **16 GB recommended** |

---

## 5. Cost Estimates (VPS)

| Tier | Specs | Monthly (approx) |
|------|-------|-------------------|
| **Testing** | 4 GB RAM, 2 CPU, 50 GB | $10–20 |
| **Pre-Testnet** | 8 GB RAM, 4 CPU, 100 GB | $20–40 |
| **Production** | 16 GB RAM, 8 CPU, 200 GB | $60–100 |

---

## 6. Summary Table

| Node Type | Min RAM | Rec RAM | Min Storage | Ports |
|-----------|---------|---------|-------------|-------|
| **Full Node** | 4 GB | 8 GB | 50 GB | 30333, 8545 |
| **Validator** | 8 GB | 16 GB | 100 GB | 30333, 8545 |
| **RPC Node** | 4 GB | 8 GB | 50 GB | 8545, 8546 |
| **Light Node** | 512 MB | 1 GB | 5 GB | 30333 |
| **Bootnode** | 512 MB | 1 GB | 5 GB | 30333 |
| **Faucet** | 256 MB | 512 MB | 1 GB | 3002 |
| **Explorer** | 8 GB | 16 GB | 100 GB | 4000 |
| **Worker (Tier 1)** | 8 GB | 16 GB | 50 GB | — |
| **Worker (Tier 2)** | 15 GB | 32 GB | 100 GB | — |
| **Monolith MK-I** | 8 GB | 8 GB | 64 GB | — |

---

*Hardware specs for Axionax network nodes. Adjust for chain growth and load.*

**Version:** 2026-02
