# ความพร้อมสำหรับ Production

เอกสารสำหรับการรัน **Production จริง** — รวมถึง **Monolith MK-I Scout** ที่จะสร้างแล้วเสร็จในไม่นาน

---

## Monolith MK-I Scout — Production Checklist

### 1. ฮาร์ดแวร์

| รายการ | หมายเหตุ |
|--------|----------|
| Raspberry Pi 5 (8GB แนะนำ) | Base unit |
| Raspberry Pi AI HAT+ 2 (Hailo-10H) | NPU สำหรับ inference |
| การระบายความร้อน | ฝาครอบ/พัดลม ให้ Hailo ไม่ร้อนเกิน |
| SD card / SSD | ความจุเพียงพอ + คลาสเร็ว |
| ไฟเลี้ยง | 5V 5A (USB-C PD แนะนำ) |

### 2. ซอฟต์แวร์บน Scout

```bash
# บน Raspberry Pi OS (64-bit)
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.10-full python3-pip python3-venv

# โคลน repo (หรือ copy จากเครื่อง dev)
git clone --recursive https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe

# Python DeAI
cd core/deai
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Config และเครือข่าย

- **Validator (production):** ใช้ RPC จาก VPS 2 ตัวที่รันอยู่แล้ว  
  - `217.76.61.116:8545` (EU)  
  - `46.250.244.4:8545` (AU)  
- Config ของ Monolith มี `[network]` bootnodes ชี้ไปที่ 2 IP นี้แล้ว (`configs/monolith_sentinel.toml`, `configs/monolith_worker.toml`)
- ถ้า Scout รันแบบ **Single Core** (Hailo ตัวเดียว): ใช้ **`configs/monolith_scout_single.toml`** — พร้อม production network และ limits สำหรับ RPi
- ถ้า Scout รันแบบ **Dual Core (HYDRA)** — สอง Hailo: ใช้ `hydra_manager.py` กับ configs Monolith ตาม [RUN.md](RUN.md)

### 4. Wallet และความปลอดภัย (Production)

| รายการ | การทำ |
|--------|--------|
| **Wallet ต่อเครื่อง** | แต่ละ Scout ควรมี `worker_key.json` แยก (หรือ `AXIONAX_WALLET_PATH` คนละไฟล์) |
| **รหัสผ่าน** | ใช้รหัสผ่านแข็งแรง; ตั้ง `WORKER_KEY_PASSWORD` ใน env ถ้าไม่ต้องการพิมพ์ทุกครั้ง (เก็บในที่ปลอดภัย) |
| **Backup** | Backup ไฟล์ wallet + รหัสผ่าน เก็บไว้ในที่ปลอดภัย — อย่า commit ลง git |
| **.env** | copy จาก `core/deai/.env.example` เป็น `.env` ใน `core/deai/`; ใส่ override ถ้าต้องการ (ไม่ commit) |

### 5. รันและตรวจสอบ

```bash
# จาก root repo

# ตรวจก่อนรัน (RPC + config)
python scripts/join-network.py --config configs/monolith_worker.toml
# หรือตรวจแบบ production เต็ม
python scripts/verify-production-ready.py --config configs/monolith_scout_single.toml

# แบบ Single Worker (Scout ตัวเดียว — Hailo เดียว)
python core/deai/worker_node.py --config configs/monolith_scout_single.toml

# แบบ HYDRA (Sentinel + Worker คู่)
python hydra_manager.py
```

หลังรัน: ดู log ว่ามี "Worker registered successfully" และ "Starting Axionax Worker Node" (หรือ SENTINEL/WORKER ตาม role)

### 6. รันเป็นบริการ (Production)

- ใช้ **systemd** (Linux) หรือ **launchd** (macOS) ให้ HYDRA หรือ worker_node รันต่อเนื่องและ restart เมื่อล้ม
- ตัวอย่าง unit อยู่ใน repo: **[scripts/axionax-hydra.service.example](scripts/axionax-hydra.service.example)** — copy ไปที่ `/etc/systemd/system/axionax-hydra.service` แล้วแก้ path / user ให้ตรงกับเครื่อง
- จากนั้น: `sudo systemctl daemon-reload && sudo systemctl enable --now axionax-hydra`

---

## สิ่งที่ควรรู้ก่อน Production

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| **Worker registration / submit result** | Mock ในโค้ด | `contract_manager` ส่ง tx แบบ mock จนกว่าจะมี smart contract จริงบน chain — Worker ยังเชื่อม RPC และรัน job ได้ปกติ |
| **Validator RPC** | ✅ จริง | 217.76.61.116, 46.250.244.4 — ใช้ได้เลย |
| **Wallet / Keys** | ✅ จริง | สร้างและเข้ารหัสได้จริง; เก็บให้ปลอดภัย |

เมื่อมี contract address จริง: ตั้งใน config `[network] contract_address` และอัปเดต `contract_manager` ให้ส่ง transaction จริง

---

## Production ทั่วไป (ทุกโหนด)

### Security

- อย่า commit `.env`, `worker_key.json`, หรือ private key ใดๆ
- ใช้ firewall: เปิดเฉพาะพอร์ตที่จำเป็น (ไม่ต้องเปิด 8545 ออกนอกถ้าเป็น Worker ล้วน)
- อัปเดต OS และ dependencies เป็นระยะ

### Monitoring

- ใช้ `scripts/health-check.py` เป็นระยะ หรือรวมเข้า cron/systemd timer
- ถ้ามี Prometheus/Grafana อยู่แล้ว: เพิ่ม target สำหรับ metrics ของ worker (ถ้ามี endpoint)

### เอกสารที่เกี่ยวข้อง

| เอกสาร | ใช้เมื่อ |
|--------|----------|
| [JOIN.md](JOIN.md) | เข้าร่วมเครือข่ายครั้งแรก (ง่าย + ปลอดภัย) |
| [RUN.md](RUN.md) | รัน Worker / HYDRA, config, Security |
| [TESTNET_READINESS.md](TESTNET_READINESS.md) | สถานะ Validator, RPC, Checklist |
| [core/docs/MONOLITH_ROADMAP.md](core/docs/MONOLITH_ROADMAP.md) | MK-I → MK-IV hardware |

---

**สรุป:** Monolith MK-I Scout พร้อมสำหรับ production เมื่อ (1) ฮาร์ดแวร์และ OS พร้อม (2) ติดตั้ง Python + deps (3) ตั้ง wallet และไม่ commit secret (4) รันด้วย config Monolith หรือ HYDRA และ (5) ใส่บริการ systemd ถ้าต้องการรันต่อเนื่อง
