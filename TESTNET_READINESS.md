# ความพร้อมสำหรับ Testnet (Testnet Readiness)

เอกสารสรุปสถานะและวิธีตรวจสอบว่าโปรเจกต์พร้อมสำหรับ Public Testnet  

**เริ่มต้นทุกเส้นทาง:** [GET_STARTED.md](GET_STARTED.md)

---

## 🌐 Validator ปัจจุบัน (รันบน VPS 2 ตัว)

| IP | ภูมิภาค | RPC (HTTP) | หมายเหตุ |
|----|--------|------------|----------|
| **217.76.61.116** | EU | `http://217.76.61.116:8545` | Validator #1 |
| **46.250.244.4** | AU | `http://46.250.244.4:8545` | Validator #2 |

- Worker / SDK / Web ใช้เป็น bootnodes หรือ RPC ได้ (กำหนดใน `core/deai/worker_config.toml` หรือ `AXIONAX_RPC_URL` / `AXIONAX_BOOTNODES`)
- Chain ID testnet: **86137**
- **อัปเดต VPS ทั้ง 2 ตัว:** [ops/deploy/VPS_VALIDATOR_UPDATE.md](ops/deploy/VPS_VALIDATOR_UPDATE.md)

---

## ✅ Checklist ความพร้อม

### Infrastructure (ใน repo นี้)

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| RPC Node | ✅ | `core/` + `docker-compose.dev.yml` หรือ `ops/deploy/docker-compose.vps.yml` |
| Faucet API | ✅ | Build จาก `core/tools/faucet` — ใช้ `ops/deploy/Dockerfile.faucet` |
| Explorer API | ✅ (stub ใน dev) | Dev: stub ใน `tools/devtools/Dockerfile.explorer`; Production: ใช้ image จริงหรือ Blockscout |
| PostgreSQL / Redis | ✅ | กำหนดใน compose |
| Web / Marketplace | ✅ | ใช้จาก `web-universe/` (submodule) |
| Health checks | ✅ | `scripts/health-check.py`, `scripts/join-network.py` |

### ผู้เข้าร่วมเครือข่าย (Node / Worker)

| รายการ | เอกสาร / สคริปต์ |
|--------|-------------------|
| เข้าร่วมเครือข่ายง่ายและปลอดภัย | [JOIN.md](JOIN.md) |
| รัน Worker / HYDRA | [RUN.md](RUN.md) |
| ตรวจก่อนรัน | `python scripts/join-network.py` |

### ความปลอดภัย

- อย่า commit `.env` หรือ `worker_key.json` (มีใน `.gitignore`)
- ตั้ง `FAUCET_PRIVATE_KEY` จริงเมื่อ deploy faucet จริง
- ดู [RUN.md — Security](RUN.md#5-security-ความปลอดภัย)

---

## 🔍 วิธีตรวจสอบ (Verify)

### 1. รัน Stack แบบ Dev (จาก root repo)

```bash
docker compose -f docker-compose.dev.yml up -d
# รอ healthchecks ผ่าน แล้วตรวจ
docker compose -f docker-compose.dev.yml ps
```

บริการที่คาดหวัง:

- `axionax-node` — RPC (8545)
- `axionax-faucet` — Faucet (3002)
- `axionax-explorer-api` — Explorer stub (3001)
- `axionax-web`, `axionax-marketplace`, postgres, redis, prometheus, grafana

### 2. ทดสอบ endpoint ด้วย curl

```bash
# RPC
curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545

# Faucet health
curl -s http://localhost:3002/health

# Explorer API (stub) health
curl -s http://localhost:3001/api/health
```

### 3. Worker / DeAI (ไม่ใช้ Docker)

```bash
python scripts/join-network.py
python core/deai/worker_node.py
```

---

## 📍 ขั้นตอนของแผน (Phase)

- **ตอนนี้:** Phase 2 — Pre-Testnet (Security & Testing)
- **ถัดไป:** Phase 3 — Public Testnet Launch (เป้า Q1 2026)

รายละเอียด: [core/README.md — Roadmap](core/README.md#-roadmap--milestones), [MASTER_SUMMARY.md — Roadmap](MASTER_SUMMARY.md#62-roadmap-project-ascension)

---

## 🛠 Deploy บน VPS

- ใช้ `ops/deploy/docker-compose.vps.yml` — ใช้ image จาก registry (เช่น ghcr.io)
- ถ้า Explorer/Faucet image ยังไม่มีหรือไม่ขึ้น: build จาก source ใช้ `Dockerfile.faucet` และ stub หรือ explorer จริง ตาม [TESTNET_DEPLOYMENT_PLAN.md](tools/devtools/docs/TESTNET_DEPLOYMENT_PLAN.md)
- สคริปต์จัดการบริการ: `ops/deploy/scripts/manage-services.sh`
