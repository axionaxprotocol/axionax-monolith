<div align="center">

# axionax Core Universe

### Blockchain Core, Operations & Development Tools Monorepo

[![License](https://img.shields.io/badge/License-AGPLv3%2FMIT-orange?style=flat-square)](#license)
[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://www.python.org/)

**High-Performance Blockchain Protocol** · **PoPC Consensus** · **45,000+ TPS** · **<0.5s Finality**

[Website](https://axionax.org) · [Documentation](https://axionaxprotocol.github.io/axionax-docs/) · [Web Universe](https://github.com/axionaxprotocol/axionax-web-universe)

</div>

---

## Quick Start — เข้าร่วมเครือข่าย

> **ผู้ใช้ทั่วไป** ใช้งานผ่าน Website → [axionax.org](https://axionax.org)
>
> ส่วนด้านล่างสำหรับ **Node Operator** ที่ต้องการรันโหนดเอง

### 1. Clone & Update

```bash
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe
python3 scripts/update-node.py
```

สคริปต์จะ:
- สร้าง `.venv` อัตโนมัติ (รองรับ Ubuntu 24.04 PEP 668)
- ติดตั้ง dependencies ที่จำเป็น
- ตรวจความเหมาะสมของระบบ (Python, deps, RPC)

### 2. เลือกประเภทโหนดและรัน

```bash
python3 scripts/join-axionax.py
```

สคริปต์จะให้เลือก:

| ตัวเลือก | ประเภท | Config |
|-----------|--------|--------|
| 1 | Worker (PC/Server) | `core/deai/worker_config.toml` |
| 2 | Monolith Scout (Hailo ตัวเดียว) | `configs/monolith_scout_single.toml` |
| 3 | HYDRA (Sentinel + Worker) | `configs/monolith_worker.toml` |

หรือรันตรง:

```bash
# Worker
python3 core/deai/worker_node.py

# Worker ด้วย config เฉพาะ
python3 core/deai/worker_node.py --config configs/monolith_scout_single.toml

# HYDRA (Sentinel + Worker คู่)
python3 hydra_manager.py
```

### 3. อัพเดทโหนด (ทุกเครื่อง)

รันบนเครื่องที่รันโหนด — ไม่ต้องระบุ IP:

```bash
cd ~/axionax-core-universe
git pull
python3 scripts/update-node.py
```

ถ้าเป็น Worker AI node ที่ต้องการ torch/numpy:

```bash
python3 scripts/update-node.py --full-deps
```

---

## เครือข่ายปัจจุบัน (Testnet)

| Validator | IP | RPC | ภูมิภาค |
|-----------|-----|-----|---------|
| #1 | 217.76.61.116 | `http://217.76.61.116:8545` | EU |
| #2 | 46.250.244.4 | `http://46.250.244.4:8545` | AU |

- **Chain ID:** `86137`
- **Phase:** Pre-Testnet (Phase 2)
- Config ต่างๆ ชี้ไป bootnodes 2 IP นี้แล้ว

**ตรวจสอบ RPC:**

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://217.76.61.116:8545
```

---

## Configuration

### ไฟล์ Config

| ไฟล์ | ใช้กับ |
|------|--------|
| `core/deai/worker_config.toml` | Worker PC/Server ทั่วไป |
| `configs/monolith_scout_single.toml` | Monolith Scout (Hailo เดียว) |
| `configs/monolith_sentinel.toml` | HYDRA — Sentinel (Hailo #0) |
| `configs/monolith_worker.toml` | HYDRA — Worker (Hailo #1) |

### Environment Variables (optional)

Copy `.env.example` แล้วแก้:

```bash
cp core/deai/.env.example core/deai/.env
```

| Variable | Description |
|----------|-------------|
| `AXIONAX_RPC_URL` | RPC URL (override bootnodes ใน config) |
| `AXIONAX_BOOTNODES` | Comma-separated RPC URLs |
| `AXIONAX_CHAIN_ID` | Chain ID |
| `AXIONAX_WALLET_PATH` | Path ไปยังไฟล์ wallet |
| `WORKER_KEY_PASSWORD` | รหัสผ่าน wallet (ไม่ต้องพิมพ์ทุกครั้ง) |
| `WORKER_PRIVATE_KEY` | Private key โดยตรง (แทนไฟล์) |

---

## Security

- **ห้าม commit** ไฟล์ `.env`, `worker_key.json`, หรือ private key ใดๆ (มีใน `.gitignore` แล้ว)
- **Backup wallet** หลังรันครั้งแรก: copy `worker_key.json` + รหัสผ่าน เก็บในที่ปลอดภัย
- **Firewall:** เปิดเฉพาะพอร์ตที่จำเป็น (Worker ไม่ต้องเปิด 8545 ออกนอก)
- **Production:** ใช้ `WORKER_PRIVATE_KEY` จาก environment แทนไฟล์

---

## Monolith MK-I Scout — Production

### ฮาร์ดแวร์

| รายการ | หมายเหตุ |
|--------|----------|
| Raspberry Pi 5 (8GB) | Base unit |
| Raspberry Pi AI HAT+ 2 (Hailo-10H) | NPU สำหรับ inference |
| การระบายความร้อน | ฝาครอบ/พัดลม ให้ Hailo ไม่ร้อนเกิน |
| SD card / SSD | ความจุเพียงพอ + คลาสเร็ว |
| ไฟเลี้ยง | 5V 5A (USB-C PD) |

### Setup บน Scout

```bash
sudo apt update && sudo apt upgrade -y
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe
python3 scripts/update-node.py --full-deps
```

### รัน

```bash
# Single Core (Hailo เดียว)
python3 core/deai/worker_node.py --config configs/monolith_scout_single.toml

# HYDRA (Sentinel + Worker — สอง Hailo)
python3 hydra_manager.py
```

### รันเป็น Service (systemd)

```bash
sudo cp scripts/axionax-hydra.service.example /etc/systemd/system/axionax-hydra.service
# แก้ path / user ให้ตรง
sudo systemctl daemon-reload
sudo systemctl enable --now axionax-hydra
```

### Known Limitations

| รายการ | สถานะ |
|--------|--------|
| Worker registration / submit result | Mock — จนกว่าจะมี smart contract จริง |
| Validator RPC | ✅ ใช้ได้จริง (217.76.61.116, 46.250.244.4) |
| Wallet / Keys | ✅ สร้างและเข้ารหัสได้จริง |

---

## Overview — สิ่งที่อยู่ใน Repo

```
axionax-core-universe/
├── core/                       # Blockchain Protocol Core
│   ├── blockchain/             # Block and chain management
│   ├── consensus/              # PoPC consensus mechanism
│   ├── crypto/                 # Cryptographic primitives (Ed25519, Blake3)
│   ├── network/                # P2P networking + reputation system
│   ├── state/                  # RocksDB state management
│   ├── rpc/                    # JSON-RPC API + health endpoints
│   ├── staking/                # Native staking (stake, delegate, slash)
│   ├── governance/             # On-chain governance (proposals, voting)
│   ├── ppc/                    # Posted Price Controller
│   ├── da/                     # Data Availability (erasure coding)
│   ├── asr/                    # Auto-Selection Router (VRF worker selection)
│   ├── vrf/                    # Verifiable Random Function
│   └── deai/                   # DeAI (Python integration)
│
├── configs/                    # Monolith / Scout TOML configs
├── scripts/                    # Helper scripts (join, update, health-check)
├── ops/deploy/                 # Deployment & Operations (Docker, monitoring)
└── tools/                      # Development utilities (faucet, devtools)
```

### Key Features

- **High Performance**: 45,000+ TPS with <0.5s finality
- **PoPC Consensus**: Proof of Probabilistic Checking
- **Smart Contracts**: WASM-based + EVM compatible
- **DeAI Integration**: Python-based decentralized AI workloads
- **Native Staking**: Stake, delegate, slash, rewards
- **On-chain Governance**: Create proposals, vote, execute
- **PPC / DA / ASR / VRF**: Dynamic pricing, data availability, worker selection

---

## Development

### Prerequisites

- Rust 1.70+ (cargo, rustc)
- Python 3.10+
- Docker & Docker Compose

### Build & Test (Rust)

```bash
cd core
cargo build --release
cargo test --workspace
cargo clippy --workspace
cargo fmt --all
cargo bench
```

### Run Local Node

```bash
cargo run --bin axionax-node
```

### Deploy with Docker

```bash
# Dev stack (local)
docker compose -f docker-compose.dev.yml up -d

# VPS
docker compose -f ops/deploy/docker-compose.vps.yml up -d
```

### Python DeAI Tests

```bash
cd core/deai
python3 -m pytest . -v --tb=short --ignore=tests
```

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `scripts/join-axionax.py` | ตรวจความเหมาะสม + เลือกประเภทโหนด + รัน |
| `scripts/update-node.py` | อัพเดทโหนด (git pull + deps + check) |
| `scripts/update-node.py --full-deps` | อัพเดท + ลง AI/ML deps (torch, numpy) |
| `scripts/health-check.py` | ตรวจ RPC + config + wallet |
| `scripts/join-network.py` | ตรวจ config + RPC อย่างเดียว |
| `scripts/verify-production-ready.py` | ตรวจแบบ production เต็ม |
| `scripts/make-node-package.py` | สร้าง ZIP package สำหรับแจกจ่าย |

---

## Troubleshooting

| ปัญหา | แก้ไข |
|--------|-------|
| `pip` ไม่มี / PEP 668 | `update-node.py` สร้าง .venv ให้อัตโนมัติ |
| Config file not found | รันจาก repo root หรือใช้ `--config` ระบุ path เต็ม |
| ไม่มี bootnodes | ตั้ง `[network] bootnodes` ใน TOML หรือ `AXIONAX_RPC_URL` ใน `.env` |
| Connection refused | ตรวจ RPC URL + firewall; ตรวจว่า chain รันอยู่ |
| Wallet password | รันครั้งแรกจะถามรหัสผ่าน; ใช้รหัสแข็งแรงและเก็บไว้ |
| `python` not found | ใช้ `python3` แทน (Ubuntu 24.04+) |

---

## Documentation

- [**Master Summary**](MASTER_SUMMARY.md) — Vision, architecture, hardware, tokenomics, roadmap
- [Architecture Overview](core/docs/ARCHITECTURE_OVERVIEW.md)
- [API Reference](core/docs/API_REFERENCE.md)
- [Deployment Guide](core/DEPLOYMENT_GUIDE.md)
- [Security Audit](core/SECURITY_AUDIT.md)
- [Project Ascension](core/docs/PROJECT_ASCENSION.md) — Monolith & 9 Pillars
- [Monolith Roadmap](core/docs/MONOLITH_ROADMAP.md) — MK-I to MK-IV hardware
- [Network Nodes](core/docs/NETWORK_NODES.md) — All node types
- [Core docs index](core/docs/README.md) — All docs in `core/docs/`

---

## Contributing

1. **Fork** this repository
2. **Create** a feature branch (`git checkout -b feature/amazing`)
3. **Test** (`cargo test --workspace && cargo clippy`)
4. **Push** and open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License

| Component | License |
|-----------|---------|
| **core/** | AGPLv3 |
| **ops/** | MIT |
| **tools/** | MIT |

---

## Related Projects

- [**axionax Web Universe**](https://github.com/axionaxprotocol/axionax-web-universe) — Frontend, SDK, Docs & Marketplace

## Support

- [Website](https://axionax.org) · [Docs](https://axionaxprotocol.github.io/axionax-docs/) · [Issues](https://github.com/axionaxprotocol/axionax-core-universe/issues)

---

<div align="center">

**Built by the axionax Protocol Team**

*Part of the [axionax Universe](https://github.com/axionaxprotocol)*

</div>
