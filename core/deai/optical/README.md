# DeAI Optical Computing (SIMULATION) — Monolith Mark-II OTPU

Simulates **Optical Tensor Processing** (Taichi/ACCEL-style): digital → light (intensity/phase), matrix multiply via optical interference, light → digital (photodetector).

- **Entrypoint:** `tensor.py` — `OpticalTensor`, `matmul_speed_of_light()`, `train_step()` (refractive-index tuning sim).
- **Metrics:** `SIMULATION_METRICS` in `tensor.py` (speed_vs_gpu, energy_ratio, latency_ns, heat).

See repo root `photonic/README.md` for full simulation report and PoL (Rust) link.
