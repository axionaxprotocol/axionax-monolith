# รายงานความเข้ากันได้ของโปรเจกต์ (Compatibility Report)

**วันที่ตรวจ:** มีนาคม 2025  
**ขอบเขต:** axionax-core-universe (Rust Core + Python DeAI + ops + configs + scripts)

---

## สรุปผลการตรวจสอบ

| หมวด | สถานะ | หมายเหตุ |
|------|--------|----------|
| Rust workspace build | ✅ ผ่าน | `cargo build --workspace` / `cargo check --workspace` สำเร็จ |
| Cargo path dependencies | ✅ สอดคล้อง | ทุก crate ชี้ path ถูกต้อง (core/*, bridge/rust-python) |
| Python DeAI imports | ✅ ผ่าน | rpc_client, wallet_manager, contract_manager, network_manager, sandbox, compute_backend ใช้ได้ |
| Chain ID / RPC port | ✅ สอดคล้อง | 86137, 8545 ใช้ทั่วทั้ง configs, scripts, .env.example |
| Config paths (README/scripts) | ✅ สอดคล้อง | core/deai/worker_config.toml, configs/*.toml ตรงกับโครงสร้างจริง |
| Genesis script wrapper | ✅ ถูกต้อง | ops/deploy/scripts/generate-genesis.py ชี้ไป core/tools/create_genesis.py |
| Scripts requirements | ✅ แยกชัด | scripts/requirements.txt (เบา), core/deai/requirements.txt (AI/ML) |
| pyo3 version | ⚠️ แยกกันโดยตั้งใจ | workspace ใช้ 0.22; bridge/rust-python ใช้ 0.24 (แก้ RUSTSEC) — ไม่ต้องเปลี่ยน |
| metrics.toml chain_id | ℹ️ string | chain_id = "86137" (string) — ใช้ได้กับ Prometheus labels |
| **ops/deploy validator scripts** | ✅ แก้แล้ว | ใช้ axionax-core-universe และ path core/deai แล้ว |

---

## 1. Rust Workspace

- **Root:** `Cargo.toml` → `members = ["core"]`
- **Core workspace:** `core/Cargo.toml` → members ครบ (consensus, blockchain, network, rpc, bridge/rust-python, …)
- **Bridge:** `core/bridge/rust-python/Cargo.toml` ใช้ path `../../core/consensus`, `../../core/blockchain`, `../../core/crypto` — ถูกต้อง
- **pyo3:** workspace.dependencies กำหนด pyo3 = "0.22"; crate `axionax-python` ใช้ 0.24 เพื่อ RUSTSEC-2025-0020 — เป็นการ override โดยตั้งใจ

---

## 2. Python / DeAI

- **Config:** `core/deai/worker_config.toml`, `configs/monolith_*.toml` ใช้ chain_id = 86137, bootnodes ตรงกับ README
- **Imports:** worker_node.py ใช้ rpc_client, wallet_manager, contract_manager, network_manager, sandbox, compute_backend — ไฟล์มีครบใน core/deai
- **Scripts:** update-node.py ใช้ ROOT จาก `Path(__file__).resolve().parent.parent` และตรวจ core/deai, scripts/ — ต้องรันจาก repo root
- **RPC:** rpc_client ใช้ eth_blockNumber, eth_getBalance ฯลฯ — สอดคล้องกับ EVM-compatible RPC (port 8545)

---

## 3. Chain ID และ RPC

- **Chain ID:** 86137 ใช้สม่ำเสมอใน worker_config.toml, configs, ops/deploy/configs/rpc-config.toml, .env.example, create_genesis.py, deploy_token.js, mock-rpc, load_test, deploy-contracts.py
- **Port:** 8545 ใช้เป็น RPC port ใน rpc-config.toml, faucet, deployer, mock-rpc, .env.example

---

## 4. Config และ path ในเอกสาร

- README, RUN.md, JOIN.md, scripts (run-worker.sh, health-check.py, verify-production-ready.py) ใช้ path แบบ `core/deai/worker_config.toml`, `configs/monolith_worker.toml` — ตรงกับโครงสร้าง repo

---

## 5. จุดที่แก้แล้ว (ความไม่ตรงกันของ repo)

สคริปต์ใน **ops/deploy/** อัปเดตให้ใช้ repo **axionax-core-universe** และ path ตรงกับโครงสร้างแล้ว:

| ไฟล์ | การแก้ไข |
|------|----------|
| `ops/deploy/setup_validator.sh` | REPO_URL → axionax-core-universe.git, REPO_DIR, build จาก core/, DeAI ที่ core/deai, PYTHONPATH และ path ในขั้นตอนถัดไป |
| `ops/deploy/setup_systemd.sh` | WorkingDirectory → axionax-core-universe, PYTHONPATH → .../core/deai |
| `ops/deploy/setup_rpc_node.sh` | AXIONAX_HOME → axionax-core-universe, clone repo นี้, build จาก core/, binary axionax-core, ExecStart → /usr/local/bin/axionax-core |
| `core/tools/GENESIS_LAUNCH_README.md` | ชี้ setup_systemd.sh ไปที่ ~/axionax-core-universe/ops/deploy/scripts/setup_systemd.sh |

หมายเหตุ: ชื่อ binary **axionax-core** ใช้ใน ExecStart และการติดตั้ง — สอดคล้องกับ crate name ใน core/

---

## 6. สรุปการดำเนินการที่แนะนำ

1. **ใช้ได้ตามเดิม:** รันจาก repo root เช่น  
   `python3 scripts/update-node.py`,  
   `python3 core/deai/worker_node.py --config configs/monolith_scout_single.toml`
2. **ถ้าใช้ ops/deploy บน VPS:** แก้ setup_validator.sh, setup_systemd.sh, setup_rpc_node.sh ให้ใช้ repo **axionax-core-universe** และ path **core/deai**, **scripts/** ตามโครงสร้างนี้
3. **อัปเดตรายงาน:** รันตรวจอีกครั้งหลังแก้ path ใน ops/deploy แล้ว

---

*สร้างโดยการตรวจความเข้ากันได้ของโปรเจกต์ (Rust, Python, configs, scripts, docs).*
