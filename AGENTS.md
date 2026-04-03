# AGENTS.md

## Cursor Cloud specific instructions

This repo is **axionax-core-universe** — the blockchain core only (Rust + Python DeAI + ops tools). Frontend/SDK/marketplace live in a separate `axionax-web-universe` repo and are NOT present here.

### Services Overview

| Service | How to Run | Port | Notes |
|---------|-----------|------|-------|
| **Rust Core (build/test)** | `cd core && cargo build --workspace` / `cargo test --workspace` | — | Primary dev workflow; 273 tests, all pass |
| **Mock RPC** | `cd ops/deploy/mock-rpc && node server.js` | 8545 (HTTP), 8546 (WS) | Lightweight mock JSON-RPC; no Rust compile needed |
| **Python DeAI tests** | `cd core/deai && python3 -m pytest . -v --tb=short --ignore=tests` | — | 30 pass, 2 skip (bridge + Docker sandbox) |

### Non-obvious caveats

- **Rust MSRV:** The `Cargo.toml` declares `rust-version = "1.83"`, but transitive dependencies (e.g. `getrandom`) require Rust **1.85+** due to `edition2024`. Run `rustup update stable && rustup default stable` if builds fail — the VM may ship with an older pinned default.
- **System deps:** `libssl-dev`, `libclang-dev`, and `python3-dev` must be installed for the Rust build (RocksDB, libp2p, PyO3 bindings).
- **Clippy:** `cargo clippy --workspace --all-targets -- -D warnings` passes clean.
- **Formatting:** `cargo fmt --all -- --check` passes clean.
- **Python `docker` package:** Required for the DeAI sandbox tests (`from sandbox import DockerSandbox`). Install with `pip3 install docker` if `test_job_execution` collection fails.
- **SDK (`core/package.json`):** Has no actual test files; `npx jest --passWithNoTests` exits cleanly. The SDK is a stub — real SDK is in the separate web-universe repo.
- **Mock RPC is the fastest way to test RPC integration** without compiling Rust. It supports 40+ ETH + Axionax-specific JSON-RPC methods and simulates block production every 5s.

### Standard commands reference

See `README.md` (Development section) and `core/Makefile` for the canonical command list:
- `cd core && make build` / `make test` / `make fmt` / `make clippy` / `make check`
- `cd core/deai && python3 -m pytest . -v --tb=short --ignore=tests`
- `cd ops/deploy/mock-rpc && npm start`
