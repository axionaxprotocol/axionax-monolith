# Changelog — Axionax Core Universe

Notable changes to the monorepo (core, ops, tools, configs, docs).  
Core protocol history: [core/CHANGELOG.md](core/CHANGELOG.md).

---

## [2.1.0] - 2026-02

### Added

- **Master Summary** ([MASTER_SUMMARY.md](MASTER_SUMMARY.md)) — Project overview, vision, architecture, hardware (Monolith MK-I Vanguard/Scout), DeAI & 7 Sentinels, tokenomics, roadmap, fundraising (Series Seed).
- **Run for real** ([RUN.md](RUN.md)) — Production run guide: config, env overrides, single worker, Project HYDRA, scripts, troubleshooting.
- **Environment overrides** — `core/deai/.env.example`; `AXIONAX_RPC_URL` / `AXIONAX_BOOTNODES` override config bootnodes ([network_manager.py](core/deai/network_manager.py)).
- **Run scripts** — `scripts/run-worker.sh`, `scripts/run-worker.ps1` to run worker from repo root.
- **CI** — GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)): Rust (fmt, build, clippy, test), Python (pytest).
- **Health check** — `scripts/health-check.py`: RPC connectivity, config file, optional wallet check.
- **7 Sentinels doc** — [core/docs/SENTINELS.md](core/docs/SENTINELS.md): AION-VX, SERAPH-VX, ORION-VX, DIAOCHAN-VX, VULCAN-VX, THEMIS-VX, NOESIS-VX.
- **CONTRIBUTING.md** — Setup, testing, code style, PR guidelines.
- **Core docs index** — [core/docs/README.md](core/docs/README.md) for all architecture and API docs.

### Changed

- **Worker node** — Config path validation (fail fast with clear message); resolve absolute path before load.
- **Worker TODOs implemented:**
  - Preload: comment clarified; model loading extensible by `model_name`.
  - `scan_for_jobs`: uses `eth_getLogs` and parses NewJob-style logs into job list.
  - `submit_result`: calls `ContractManager.submit_result(job_id, result_str)` (mock until contract deployed).
- **Docs** — Architecture, network, marketplace, Monolith roadmap, and config comments refactored to English.
- **Tests** — Pytest fixes (no return in tests, skip on missing bridge/RPC); Rust unused-import/variable fixes (blockchain, staking, governance).
- **README** — Links to RUN.md, Master Summary, Testing & Verification section, Core docs index.

### Fixed

- Worker `submit_result` and `scan_for_jobs` wired to contract/RPC; job_id type handling in `submit_result`.

---

## [2.0.0] - 2026-01

### Added

- **Project HYDRA** — Dual-core (Split-Brain) for Monolith MK-I: `hydra_manager.py`, `configs/monolith_sentinel.toml`, `configs/monolith_worker.toml`.
- **HAL NPU** — `ComputeBackend` supports `TYPE_NPU` (Hailo); `_init_hailo()`, `is_npu()`; worker config `npu_device_id`.
- **Docs** — ARCHITECTURE_OVERVIEW, NETWORK_NODES, MARKETPLACE_WORKER_NODES, MONOLITH_ROADMAP.

---

*For older core protocol versions see [core/CHANGELOG.md](core/CHANGELOG.md).*
