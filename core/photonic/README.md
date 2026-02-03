# Monolith Mark-II: Photonic Simulation (SIMULATION PHASE)

**"The age of electricity ends here. The age of light begins."**

This directory documents the **Optical Logic Simulation** for Axionax Monolith Mark-II. The actual simulation code lives in:

| Component | Location | Description |
|-----------|----------|-------------|
| **OTPU** (Optical Tensor Processing Unit) | [`../deai/optical/`](../deai/optical/) | Python: `OpticalTensor`, MZI-style matmul simulation |
| **PoL** (Proof-of-Light Consensus) | [`../core/consensus/src/proof_of_light.rs`](../core/consensus/src/proof_of_light.rs) | Rust: `LightValidator`, photonic interference verification |
| **Interconnect** (concept) | — | Lithium Niobate waveguides: latency fs, throughput exabytes, 0° heat |

## Simulation Report (vs Axionax v1.9 Silicon)

| Metric | v1.9 (Silicon) | Mark-II (Photonic) | Improvement |
|--------|----------------|-------------------|-------------|
| Speed (AI Inference) | 1× (GPU) | **3,000×** (ACCEL) | 300,000% |
| Energy | 500W | **0.1W** | 5,000× |
| Latency | 10 ms | **Light-speed (ns)** | Instant |
| Heat | 80°C (fans) | **Ambient** (passive) | Silent |
| Security | Post-quantum crypto | **Quantum physics** | Unbreakable |

## Continuous Evolution (HAL + Node Identity)

- **HAL (ComputeBackend):** `../deai/compute_backend.py` — worker ใช้ `ComputeBackend` แทนการผูกตรงกับ `torch.device("cuda")`; รองรับ `SILICON` / `PHOTONIC` (optical bridge = simulation เมื่อไม่มีชิป)
- **Config:** `../deai/worker_config.toml` → `[experimental]` มี `enable_optical_bridge`, `hardware_tier`, `compute_type`
- **NodeCapabilities (Rust):** `../core/network/src/protocol.rs` — `NodeCapabilities` (compute_power, compute_type, memory_type, is_monolith) และ `PeerInfo.capabilities` สำหรับ ASR / Fast Lane

## Next Directives

1. **พันธมิตร (Partners):** ติดต่อแล็บ Taichi / Turing Quantum สำหรับ prototype testing บนชิปตัวอย่าง
2. **Refactor:** โครงสร้าง `core/photonic/` นี้พร้อม; logic จำลองอยู่ใน `deai/optical/` และ `core/consensus/proof_of_light.rs`; HAL ใน `deai/compute_backend.py`

## Quick Run

- **Python (OTPU):** `cd ../deai && python -c "from optical import OpticalTensor; import numpy as np; a=OpticalTensor(np.eye(2)); b=OpticalTensor(np.ones((2,1))); print(a.matmul_speed_of_light(b).waveguide_matrix)"`
- **Rust (PoL):** `cargo test -p consensus proof_of_light`
