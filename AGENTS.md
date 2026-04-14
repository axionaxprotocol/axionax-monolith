# AGENTS.md

## 🤖 AI Agent Directives (CRITICAL)
- **Boundary Restriction:** This repo (`axionax-core-universe`) is STRICTLY Backend, Blockchain Core, and Ops. **DO NOT** attempt to generate, import, or suggest Frontend (React/Next.js/UI) code here. Frontend lives in `axionax-web-universe`.
- **Workflow Loop:** When asked to write or refactor Rust code, always follow this loop: `Code` -> `cargo fmt` -> `cargo clippy` -> `cargo test`. Do not commit or finalize if clippy or tests fail.
- **Language Stack:** Rust (Primary Core), Python (DeAI Worker/Sandbox), Bash/PowerShell (Ops/Deployment).

## 📁 Repository Structure Map
To help you navigate faster, here is the core layout:
- `core/core/`: The main Rust blockchain logic (consensus, network, state, rpc, mempool).
- `core/deai/`: Python-based Decentralized AI workers and sandbox environment.
- `core/bridge/`: FFI/Bridge logic connecting Rust and Python.
- `ops/deploy/`: Deployment scripts, Docker files, configs, and Mock RPC.

## 🛠️ Services Overview

| Service | How to Run | Port | Notes |
|---------|-----------|------|-------|
| **Rust Core (build/test)** | `cd core && cargo build --workspace` / `cargo test --workspace` | — | Primary dev workflow; ALL tests must pass. |
| **Mock RPC** | `cd ops/deploy/mock-rpc && npm start` | 8545 (HTTP), 8546 (WS) | Lightweight mock JSON-RPC; no Rust compile needed. Supports 40+ ETH + Axionax-specific methods. Simulates block production every 5s. |
| **Python DeAI tests** | `cd core/deai && python3 -m pytest . -v --tb=short --ignore=tests` | — | Python test suite (skips bridge/Docker sandbox if not configured). |

## ⚠️ Non-obvious Caveats (Troubleshooting)

- **Rust MSRV (Version Issue):** The `Cargo.toml` declares `rust-version = "1.83"`, but transitive dependencies (e.g., `getrandom`) require Rust **1.85+** due to `edition2024`. 
  - *Fix:* If you see build errors related to edition 2024, immediately run `rustup update stable && rustup default stable`.
- **System Dependencies:** If C/C++ compilation fails during `cargo build` (e.g., RocksDB, libp2p, PyO3), ensure `libssl-dev`, `libclang-dev`, and `python3-dev` are installed on the host.
- **Formatting & Linting:** - Run `cargo clippy --workspace --all-targets -- -D warnings` (must pass cleanly).
  - Run `cargo fmt --all -- --check` (must pass cleanly).
- **Python `docker` Package:** Required for the DeAI sandbox tests (`from sandbox import DockerSandbox`). If `test_job_execution` collection fails, run `pip3 install docker`.
- **SDK Stub:** `core/package.json` has no actual test files; running `npx jest --passWithNoTests` exits cleanly. The real SDK is in the separate web-universe repo.

## ⌨️ Standard Commands Reference
Always use these commands for verification. See `core/Makefile` for the canonical list:
- `cd core && make build` 
- `cd core && make test` 
- `cd core && make fmt` 
- `cd core && make clippy` 
- `cd core && make check`