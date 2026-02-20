# เข้าร่วมเครือข่าย Axionax DeAI (Join the Network)

**การใช้งานหลัก:** ผู้ใช้ทั่วไปใช้งานผ่าน **Website** ([axionax.org](https://axionax.org) / Web App จาก [axionax-web-universe](https://github.com/axionaxprotocol/axionax-web-universe)) — ไม่ต้องรันโหนดเอง  

คู่มือนี้สำหรับผู้ที่ต้องการรัน **Worker Node** เข้าร่วมเครือข่าย Axionax DeAI ให้ทำได้**ง่าย** และ**ปลอดภัย**

---

## วิธีที่ง่ายที่สุด: ดาวน์โหลด packaging แล้วรัน

ไม่ว่าใครก็ตามที่ต้องการเข้าร่วมเป็นโหนด สามารถ **ดาวน์โหลด packaging** ของโปรเจค แล้วรันสคริปต์เดียวเพื่อ **ตรวจสอบความเหมาะสม** และ **เลือกประเภทโหนด** ได้เลย:

1. ดาวน์โหลดโปรเจค (โคลนหรือ ZIP จาก GitHub) หรือใช้ชุด package ที่สร้างด้วย `python scripts/make-node-package.py`
2. ติดตั้ง Python 3.10+ และ `pip install -r core/deai/requirements.txt`
3. จาก root ของโฟลเดอร์ รัน: **`python scripts/join-axionax.py`**
4. ทำตามคำแนะนำ: ตรวจความเหมาะสม → เลือกประเภทโหนด (Worker PC / Monolith Scout / HYDRA) → ตรวจ config → รันโหนด

ดูรายละเอียด: [NODE_PACKAGE_README.md](NODE_PACKAGE_README.md) · [GET_STARTED.md](GET_STARTED.md)

**อัปเดต:** ทุกเครื่องที่เข้าร่วมเครือข่ายสามารถอัปเดตได้เองโดยไม่ต้องบอก IP — รันบนเครื่องที่รันโหนด: `python scripts/update-node.py`

---

## สิ่งที่ต้องมี (Prerequisites)

| สิ่งที่ต้องมี | หมายเหตุ |
|--------------|----------|
| **Python 3.10+** | ติดตั้ง dependencies จาก `core/deai/requirements.txt` |
| **RPC** | ชี้ไปที่โหนด Axionax (testnet หรือของตัวเอง) |
| **Wallet** | สร้างอัตโนมัติเมื่อรันครั้งแรก ถ้ายังไม่มี |

---

## 3 ขั้นตอนเข้าร่วมเครือข่าย

### 1. ติดตั้งและตั้งค่า (Configure)

```bash
# จาก root ของ repo
cd core/deai
pip install -r requirements.txt
cp .env.example .env
# แก้ .env ถ้าต้องการ: ตั้ง AXIONAX_RPC_URL หรือ AXIONAX_BOOTNODES
```

- ถ้าไม่แก้ `.env` จะใช้ค่าใน `worker_config.toml` (มี bootnodes testnet อยู่แล้ว)
- ตัวเลือก RPC: ใส่ `AXIONAX_RPC_URL` (ตัวเดียว) หรือ `AXIONAX_BOOTNODES` (หลายตัว คั่นด้วย comma)

### 2. ตรวจสอบก่อนรัน (Verify)

จาก **root ของ repo**:

```bash
python scripts/join-network.py
```

หรือตรวจสอบเอง:

```bash
python scripts/health-check.py
```

- ถ้ายังไม่มี wallet จะมีคำเตือนว่า "จะสร้างเมื่อรันครั้งแรก" — ใช้ได้
- ถ้า RPC เชื่อมต่อได้จะแสดง block number

### 3. รัน Worker (Run)

จาก **root ของ repo**:

```bash
python core/deai/worker_node.py
```

หรือใช้สคริปต์:

- **Windows:** `.\scripts\run-worker.ps1`
- **Linux/macOS:** `./scripts/run-worker.sh`

- รันครั้งแรก: จะถามรหัสผ่านสำหรับเข้ารหัส wallet ใหม่ (เก็บรหัสไว้ในที่ปลอดภัย)
- หลังรันสำเร็จ: จะเห็น "Worker registered successfully" และ "Starting Axionax Worker Node"

---

## ความปลอดภัย (Security) — อ่านก่อนรัน

| ห้าม | ทำแทน |
|-----|--------|
| **ห้าม commit** ไฟล์ `.env` หรือ `worker_key.json` | โปรเจกต์มี `.gitignore` กันไว้แล้ว — อย่า force add |
| **ห้ามแชร์** private key หรือรหัสผ่าน wallet | ใช้ `WORKER_PRIVATE_KEY` ในเครื่อง/CI เท่านั้น และเก็บในที่ปลอดภัย |
| **ห้ามใช้** wallet เดียวกันหลายโหนด (ถ้าไม่ตั้งใจ) | แต่ละโหนดควรมี key แยก หรือใช้ `AXIONAX_WALLET_PATH` คนละไฟล์ |

**แนะนำ:**

1. **Backup wallet:** หลังสร้างครั้งแรก ให้ copy `worker_key.json` ไปเก็บในที่ปลอดภัย (และเก็บรหัสผ่าน)
2. **รหัสผ่าน:** ใช้รหัสผ่านแข็งแรง; หรือตั้ง `WORKER_KEY_PASSWORD` ใน env (เฉพาะในเครื่องที่ปลอดภัย)
3. **Production:** พิจารณาใช้ `WORKER_PRIVATE_KEY` จาก env แทนไฟล์ เพื่อลดการอ่านจาก disk

รายละเอียดการรันและตัวเลือกเพิ่มเติม: [RUN.md](RUN.md)

---

## แก้ปัญหาเบื้องต้น

| อาการ | แก้ไข |
|--------|--------|
| Config ไม่เจอ | รันจาก repo root และใช้ `--config configs/...` หรือ path แบบ absolute |
| RPC ไม่ติด | ตรวจสอบ URL ใน `.env` หรือ `[network] bootnodes` ใน config, เปิด firewall |
| ถามรหัสผ่านทุกครั้ง | ตั้ง `WORKER_KEY_PASSWORD` ใน `.env` (อย่า commit ไฟล์นี้) |

---

**สรุป:** ติดตั้ง → รัน `scripts/join-network.py` เพื่อตรวจสอบ → รัน `python core/deai/worker_node.py` และเก็บ wallet กับรหัสผ่านให้ปลอดภัย  

เส้นทางอื่น (Monolith Scout, สถานะ Testnet): ดู **[GET_STARTED.md](GET_STARTED.md)**
