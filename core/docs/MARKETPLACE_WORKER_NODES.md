# Worker Nodes on the Marketplace — Expected Types

Summary of **worker node types** the system and repo docs expect on the **Compute Marketplace** (axionax-marketplace / JobMarketplace).

---

## 1. By Hardware / Platform (from Deploy Docs)

| Type | Hardware | Doc Ref | Role |
|------|----------|---------|------|
| **Local PC** | CPU / AMD GPU / NVIDIA GPU | `WORKER_LOCAL_WINDOWS_AMD.md` | General worker, testing |
| **Cloud GPU — RunPod** | NVIDIA A40 (48GB) | `WORKER_RUNPOD_A40_SETUP.md`, `RUNPOD_QUICK_START.md` | Heavy Training / Inference |
| **Cloud — GCP** | VM + GPU (per config) | `gcp-worker-setup.md` | Training workloads |
| **Cloud — Vertex AI** | Google Cloud AI (GPU/TPU) | `WORKER_VERTEX_AI_SETUP.md` | Training / Notebook |
| **Monolith MK-I Sentinel** | RPi 5 + Hailo (NPU #0) | `configs/monolith_sentinel.toml`, HYDRA | Security / Vision |
| **Monolith MK-I Worker** | RPi 5 + Hailo (NPU #1) | `configs/monolith_worker.toml`, HYDRA | General compute |

---

## 2. By Compute Type (HAL / Register Specs)

Workers register with `compute_type` and `hardware_tier` in specs:

| compute_type | Meaning | Example Hardware |
|--------------|---------|------------------|
| **SILICON** | Current CPU / GPU | PC, RunPod A40, Jetson, AMD/NVIDIA |
| **NPU** | Neural Processing Unit | Hailo-10H (Monolith MK-I) |
| **PHOTONIC** | Optical compute (simulation) | Monolith MK-II (future) |
| **HYBRID** | SILICON + other | When multiple backends available |

| hardware_tier | Meaning |
|---------------|---------|
| **1** | PC (Edge / general user) |
| **2** | Server (Cloud, data center) |
| **3** | Monolith (special tier) |

---

## 3. By Job Type (Smart Contract)

From `JobMarketplace.sol` — job types that can be created and accepted by workers:

| JobType | Meaning |
|---------|---------|
| **Inference** | Run inference model |
| **Training** | Train model |
| **DataProcessing** | Process data |
| **Custom** | Other jobs |

Workers on the marketplace are expected to accept Inference, Training, DataProcessing, and Custom jobs according to node capability.

---

## 4. Specs Sent on Register (Python → Contract)

From `worker_node.py` — fields in `specs` passed to `registerWorker(specs)`:

- `device` — Device in use (cuda, cpu, hailo0, hailo1, photonic)
- `gpu` — GPU name (or null for NPU/CPU)
- `version` — Worker version
- `sandbox_enabled` — Docker sandbox enabled or not
- `max_memory_mb`, `max_timeout_s` — Job limits
- `model_cache_enabled`, `tensor_cores_enabled` — Extra capabilities
- **`compute_type`** — SILICON | NPU | PHOTONIC | HYBRID
- **`hardware_tier`** — 1 | 2 | 3
- **`optical_bridge_available`** — Ready for optical (MK-II) or not

---

## 5. ASR (Rust) — Worker Capability for Matching

ASR uses `WorkerCapability` to select workers:

- **gpu_type** — e.g. `"a100"`, `"v100"`, `"none"` (or NPU in future)
- **gpu_memory_gb** — VRAM
- **cpu_cores**, **ram_gb** — Machine specs
- **frameworks** — Supported frameworks

Marketplace / job assignment can use this to filter or rank workers by job fit.

---

## Short Summary

On the **Marketplace**, worker nodes are expected to include:

1. **PC / Laptop** — SILICON, tier 1 (CPU or GPU), light Inference / Training
2. **Cloud GPU (RunPod A40, GCP, Vertex AI)** — SILICON, tier 2, heavy Training / Inference
3. **Monolith MK-I Sentinel** — NPU (Hailo #0), tier 3, Security/Vision focus
4. **Monolith MK-I Worker** — NPU (Hailo #1), tier 3, general compute
5. **Monolith MK-II (future)** — PHOTONIC, tier 3, optical_bridge_available

Jobs on the marketplace: **Inference**, **Training**, **DataProcessing**, **Custom** as defined by the contract and repo docs.
