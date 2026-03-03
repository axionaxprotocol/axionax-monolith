# Axionax Core Universe — รายงานสำรวจโปรเจกต์ (Project Survey)

**วันที่สำรวจ:** มีนาคม 2026 — อัปเดตล่าสุด

---

## 1. โครงสร้าง Repo โดยรวม

| โฟลเดอร์ | หน้าที่ |
|-----------|--------|
| **core/** | Rust workspace (v1.8.0) + Python DeAI (worker v1.9.0) |
| **configs/** | TOML สำหรับ Monolith/Scout (worker, sentinel, scout_single) |
| **scripts/** | join-axionax, update-node, health-check, security, load_test |
| **ops/deploy/** | Docker, environments (testnet public/v1.6), monitoring, faucet, mock-rpc |
| **tools/** | devtools (tests, analysis, fixing), มี tools/faucet ซ้ำกับ core/tools/faucet |
| **docs/** | SECURITY_AUDIT_SCOPE, ARCHITECTURE, AUDIT_REMEDIATION, ฯลฯ |

---

## 2. Rust Core (core/)

- **Workspace root:** `core/Cargo.toml` (members: consensus, blockchain, state, network, crypto, rpc, **node**, config, staking, governance, ppc, da, asr, vrf, cli, metrics, genesis, events, bridge/rust-python, tools/faucet).
- **Binary ที่รันได้:**
  - **node** → `axionax-node` (จาก `core/core/node/src/main.rs`, `[[bin]]`)
  - **cli** → `axionax` (จาก core/core/cli)
  - **tools/faucet** → `axionax-faucet`
- **Node flags ที่รองรับ:** `--role`, `--chain`, `--chain_id`, `--rpc`, `--p2p`, `--telemetry`, `--unsafe-rpc`, `--state_path`, `--demo_mode`
- **Dockerfile:** build ด้วย `cargo build --release -p node` → copy `target/release/axionax-node`

---

## 3. Dependency & CVE Status

| รายการ | สถานะ |
|--------|-------|
| libp2p | ✅ workspace 0.55, network crate ใช้ workspace (แก้ ring 0.16 CVE) |
| pyo3 (bridge) | ✅ อัปเกรดเป็น 0.24 (แก้ RUSTSEC-2025-0020) |
| prometheus → metrics | ✅ ลบ prometheus crate; metrics self-contained (แก้ RUSTSEC-2024-0437) |
| bincode | ✅ อัปเกรดจาก 1.3 เป็น 2.0 (แก้ unmaintained warning) |
| reqwest (cli, faucet) | ✅ อัปเกรดจาก 0.11 เป็น 0.12 (แก้ rustls-pemfile warning) |
| dotenv (faucet) | ✅ ย้ายไป dotenvy 0.15 |
| keccak | ✅ 0.1.6 แก้ unsoundness (cargo update) |
| Rust version | ✅ workspace 1.83, Dockerfile 1.83 |

---

## 4. Python DeAI (core/deai)

- **worker_node.py** v1.9.0 — RPC client, wallet, ContractManager (MOCK/LIVE), sandbox, model cache
- **contract_manager.py** — รองรับ LIVE ผ่าน `AXIONAX_MARKETPLACE_ADDRESS` / config `contract_address` และ `AXIONAX_ABI_PATH`
- เอกสาร: **CONTRACT_INTEGRATION.md**, **README.md**
- Config: **worker_config.toml**, configs/monolith_*.toml

---

## 5. Infrastructure & Deploy

- **docker-compose (testnet public):** validator, rpc, bootnode, explorer, faucet, prometheus, grafana, node-exporter
  - ใช้ flag ที่ตรงกับ binary: `--role`, `--chain`, `--rpc`, `--p2p`, `--telemetry`, `--unsafe-rpc`
  - Telemetry: optional (ลบ 2 บรรทัด `--telemetry` สำหรับ self-sufficient / air-gapped mode)
- **Dockerfile (ops/deploy):** multi-stage (Rust builder → Python bridge → Python app → production)
  - Default CMD: `--role full --rpc 0.0.0.0:8545 --state_path ... --chain_id 86137`
- **CI (.github/workflows/ci.yml):**
  - Rust: fmt, build, clippy, test + **cargo audit** (continue-on-error)
  - Python: pip install, pytest + **bandit** (continue-on-error)

---

## 6. เอกสารและ entry points

- **README.md** (ราก) — Quick start, testnet RPC, config, scripts, Pre-launch checklist
- **core/README.md** — โครงสร้าง core, build, test
- **core/deai/README.md** — DeAI, contract integration link
- **ops/deploy/environments/testnet/public/README_INFRA.md** — RPC multi-region, explorer, faucet, monitoring, telemetry toggle
- **docs/SECURITY_AUDIT_SCOPE.md**, **docs/AUDIT_REMEDIATION.md** — Audit scope + CVE remediation tracker
- **docs/SELF_SUFFICIENCY.md**, **docs/CYBER_DEFENSE.md** — Protocol principles
- **.cursor/rules/protocol-principles.mdc** — MDC rule for AI context

---

## 7. สรุปจุดที่แก้แล้ว

| # | รายการ | สถานะ |
|---|--------|-------|
| 1 | Node binary `axionax-node` + Dockerfile build | ✅ |
| 2 | Node CLI flags ตรงกับ compose (--role, --chain, --rpc, --p2p, --telemetry, --unsafe-rpc) | ✅ |
| 3 | libp2p 0.55 (แก้ ring 0.16 CVE) | ✅ |
| 4 | pyo3 0.24 (แก้ buffer overflow CVE) | ✅ |
| 5 | metrics self-contained / ลบ protobuf (แก้ CVE) | ✅ |
| 6 | dotenv → dotenvy (faucet) | ✅ |
| 7 | bincode 1.3 → 2.0 (unmaintained) | ✅ |
| 8 | reqwest 0.11 → 0.12 (rustls-pemfile fix) | ✅ |
| 9 | keccak 0.1.5 → 0.1.6 (unsoundness fix) | ✅ |
| 10 | Rust 1.70 → 1.83, Dockerfile 1.75 → 1.83 | ✅ |
| 11 | CI: cargo audit + bandit | ✅ |
| 12 | unwrap/expect ลดจาก 14 → 5 ที่ปลอดภัย (genesis expect เหลือ) | ✅ |
| 13 | Telemetry documentation (self-sufficient mode) | ✅ |
| 14 | RPC system_status + system_health → อ่านจาก metrics crate จริง | ✅ |
| 15 | metrics_prometheus + metrics_json → ใช้ metrics::export() | ✅ |
| 16 | HTTP /metrics endpoint → ใช้ metrics::export() (Prometheus format) | ✅ |
| 17 | Node event loop → อัปเดต BLOCK_HEIGHT, PEERS, UPTIME ทุก 10s | ✅ |
| 18 | Network README: libp2p 0.53 → 0.55, checklist อัปเดต | ✅ |
| 19 | Faucet: expect → proper error propagation (?/anyhow) | ✅ |

---

## 8. สถานะ Crate-by-Crate

| Crate | Files | Tests | สถานะ |
|-------|-------|-------|-------|
| consensus | 3 | 22 | solid |
| blockchain | 5 | 30 | solid |
| state | 1 | yes | solid (ใช้ RocksDB, ต้อง LLVM สำหรับ build) |
| network | 7 | yes | solid |
| crypto | 2 | yes | solid (VRF deprecated → ECVRF) |
| rpc | 8 | yes | **improved** — system_status/metrics ใช้ข้อมูลจริง |
| node | 2 | yes | **improved** — metrics loop ทุก 10s |
| config | 1 | yes | unused — ไม่มี crate อื่นอ้างอิง |
| staking | 1 | yes | solid |
| governance | 1 | yes | solid |
| ppc | 1 | yes | solid |
| da | 1 | yes | solid |
| asr | 1 | 5 | solid |
| vrf | 1 | yes | solid |
| cli | 1 | no | needs tests |
| metrics | 1 | 6 | solid |
| genesis | 1 | yes | solid |
| events | 1 | yes | solid |
| bridge/rust-python | 2 | no | solid (cdylib) |
| tools/faucet | 1 | no | improved (error handling) |

---

## 9. สิ่งที่ยังเหลือ

`cargo audit` ผ่านแล้ว: **0 vulnerabilities**, เหลือ 5 warnings (transitive deps):

| # | รายการ | หมายเหตุ |
|---|--------|----------|
| 1 | bincode 2.0 (unmaintained) | พิจารณาย้ายไป `bitcode` หรือ `postcard` |
| 2 | sled → redb migration | จะแก้ fxhash + instant warnings ด้วย |
| 3 | paste, lru (transitive via libp2p) | รอ libp2p 0.56+ |
| 4 | External security audit | ดู SECURITY_AUDIT_SCOPE.md |
| 5 | Build env: LLVM/Clang สำหรับ rocksdb (state crate) | CI ผ่าน, local Windows ต้อง install LLVM |
| 6 | config crate ไม่มีใครใช้ | พิจารณาลบหรือ wire เข้า node |
| 7 | signature verification (rpc, node, faucet) | Phase 2: ECDSA/SignedTransaction |
