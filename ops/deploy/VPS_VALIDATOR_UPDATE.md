# VPS ทั้ง 2 ตัว (Validator) — สิ่งที่ควรอัปเดต

Checklist สำหรับอัปเดต **Validator VPS** ทั้งสอง: **217.76.61.116** (EU) และ **46.250.244.4** (AU)

---

## รันสคริปต์อัปเดตบนทั้ง 2 VPS (แนะนำ)

จากเครื่องที่ SSH เข้า 2 ตัวได้ รันบน**แต่ละ VPS**:

```bash
# ส่งสคริปต์ไปที่ VPS แล้วรัน (จาก root ของ repo บนเครื่องคุณ)
scp ops/deploy/scripts/update-validator-vps.sh root@217.76.61.116:/tmp/
scp ops/deploy/scripts/update-validator-vps.sh root@46.250.244.4:/tmp/

# รันบน VPS ตัวที่ 1 (EU)
ssh root@217.76.61.116 'bash /tmp/update-validator-vps.sh'

# รันบน VPS ตัวที่ 2 (AU)
ssh root@46.250.244.4 'bash /tmp/update-validator-vps.sh'
```

หรือถ้าบน VPS มี clone repo อยู่แล้ว (เช่น `/opt/axionax-core-universe` หรือ `/opt/axionax-deploy`):

```bash
cd /opt/axionax-core-universe/ops/deploy   # หรือ path ที่มี scripts/
sudo bash scripts/update-validator-vps.sh
```

**ตัวเลือกสคริปต์:** `--skip-apt` (ข้าม apt upgrade), `--skip-pull` (ข้าม docker pull), `--dry-run` (แสดงว่าจะทำอะไร ไม่รันจริง)

สคริปต์จะ: อัปเดต OS (ถ้าไม่ใช้ --skip-apt), ตรวจ/แก้ chain_id เป็น 86137, ดึง image ล่าสุด, restart rpc-node, ตรวจ RPC

**Windows (PowerShell):** รันอัปเดตทั้ง 2 ตัวจากเครื่องเดียว:
```powershell
cd ops\deploy
.\scripts\run-update-both-vps.ps1
# หรือ .\scripts\run-update-both-vps.ps1 -User root -SkipApt
```

---

## 1. ซอฟต์แวร์ / Image

| การทำ | คำสั่ง/หมายเหตุ |
|--------|-------------------|
| **ดึง image ล่าสุด** | ถ้ารันด้วย Docker: `docker pull ghcr.io/axionaxprotocol/axionax-core:latest` แล้ว `docker compose -f docker-compose.vps.yml up -d rpc-node` (หรือ restart rpc-node) |
| **อัปเดต OS** | `sudo apt update && sudo apt upgrade -y` (เลือกเวลาที่ traffic น้อย) |

---

## 2. Config ที่ต้องตรงกับเครือข่าย

| รายการ | ค่าที่ใช้ใน repo (Worker / Client) | บน VPS |
|--------|-------------------------------------|--------|
| **Chain ID** | **86137** (testnet) | ใน repo แก้เป็น 86137 แล้ว — บน VPS ถ้ายังเป็น 888 ให้รัน `scripts/update-validator-vps.sh` จะแก้ให้ หรือ copy `configs/rpc-config.toml` ใหม่แล้ว restart node |
| **พอร์ต RPC** | 8545 (HTTP), 8546 (WS) | เปิดให้ client เรียกได้ |
| **P2P** | 30303 | เปิดระหว่าง 2 validator ถ้า sync กัน |

---

## 3. Env / Secrets (ถ้ารัน stack เต็ม)

ถ้า VPS รันไม่ใช่แค่ RPC แต่มี Explorer, Faucet ด้วย (เช่น ใช้ `docker-compose.vps.yml`):

- **.env** บน VPS ต้องมี: `DB_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_PASSWORD`, `FAUCET_PRIVATE_KEY` (และถ้าใช้ใน script: `VPS_IP`)
- อย่า commit .env; copy จาก `.env.example` แล้วเติมค่าจริง

---

## 4. Firewall

| พอร์ต | บริการ | การทำ |
|-------|--------|--------|
| 8545 | RPC HTTP | เปิดจาก internet (ให้ Worker / Web เรียก) |
| 8546 | RPC WebSocket | เปิดถ้า client ใช้ WS |
| 30303 | P2P | เปิดระหว่าง 2 VPS (และต่อภายหลังถ้ามี node เพิ่ม) |
| 22 | SSH | เปิดเฉพาะ IP ที่ดูแล (แนะนำ) |

---

## 5. ตรวจสุขภาพหลังอัปเดต

บนแต่ละ VPS (หรือจากเครื่องอื่น):

```bash
# RPC
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://217.76.61.116:8545
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://46.250.244.4:8545
```

ถ้ารัน Docker Compose บน VPS:

```bash
cd /path/to/ops/deploy
./scripts/manage-services.sh status all
./scripts/manage-services.sh restart rpc-node   # ถ้าอัปเดต image หรือ config
```

---

## 6. Explorer / Faucet (ถ้ามีบน VPS นี้)

จาก [TESTNET_DEPLOYMENT_PLAN](../tools/devtools/docs/TESTNET_DEPLOYMENT_PLAN.md): ถ้า Explorer (3001) หรือ Faucet (3002) ยังไม่ขึ้น:

- **Explorer:** ตรวจ `docker logs axionax-explorer-backend`; ถ้า image ไม่มี/ไม่ทำงาน ใช้ stub หรือ build จาก `tools/devtools/Dockerfile.explorer`
- **Faucet:** ตั้ง `FAUCET_PRIVATE_KEY` ใน .env; หรือ build จาก `ops/deploy/Dockerfile.faucet` (context = core/)

---

## สรุปสั้นๆ

| ลำดับ | การทำ |
|--------|--------|
| 1 | อัปเดต OS และดึง Docker image ล่าสุด (ถ้าใช้) |
| 2 | ตรวจ chain_id ใน config ว่าเป็น 86137 (ให้ตรงกับ Worker / docs) |
| 3 | ตรวจ .env และ firewall (8545, 8546, 30303) |
| 4 | หลังอัปเดต: restart service ที่เปลี่ยน แล้วทดสอบ RPC ด้วย curl |

**ใน repo:** ไม่ต้องแก้ IP ของ 2 validator — ใช้ 217.76.61.116 และ 46.250.244.4 ครบแล้วใน configs และ docs
