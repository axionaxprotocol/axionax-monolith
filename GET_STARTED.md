# เริ่มต้นใช้งาน (Get Started)

เลือกเส้นทางที่ตรงกับคุณ — พร้อมที่สุดในขั้นต่ำ

---

## อยากเข้าร่วมเป็นโหนด — ดาวน์โหลดแล้วรันได้เลย

ไม่ว่าใครก็ตามที่ต้องการเข้าร่วมเป็นโหนด: **ดาวน์โหลด packaging** ของโปรเจค แล้วรันสคริปต์เดียว เพื่อ **ตรวจสอบความเหมาะสม** และ **เลือกประเภทโหนด** ได้โดยง่าย

1. **ดาวน์โหลด:** โคลน repo หรือ [ดาวน์โหลดเป็น ZIP](https://github.com/axionaxprotocol/axionax-core-universe/archive/refs/heads/main.zip) แล้วแตกไฟล์  
   หรือใช้ชุด package ที่สร้างจาก repo: `python scripts/make-node-package.py` จะได้ `axionax-node-package.zip`
2. **ติดตั้ง Python 3.10+** และ dependencies: `pip install -r core/deai/requirements.txt`
3. **รัน:** จาก root ของโฟลเดอร์ (ที่มี `core/`, `configs/`, `scripts/`):
   ```bash
   python scripts/join-axionax.py
   ```
4. ทำตามคำแนะนำบนจอ: ตรวจความเหมาะสม → เลือกประเภทโหนด (Worker PC / Scout / HYDRA) → ตรวจ config → รันโหนดได้ทันที

**รายละเอียดใน package:** ดู [NODE_PACKAGE_README.md](NODE_PACKAGE_README.md)

**อัปเดตทุกเครื่องที่เข้าร่วมเครือข่าย (ไม่ต้องบอก IP):** รันบนเครื่องที่รันโหนดเท่านั้น  
`python scripts/update-node.py` — จะดึงโค้ดล่าสุด, อัปเดต dependencies, ตรวจความเหมาะสม

---

## ฉันเป็นผู้ใช้ทั่วไป

→ ใช้ **Website** ไม่ต้องรันโหนด  
**[axionax.org](https://axionax.org)** · [Web Universe](https://github.com/axionaxprotocol/axionax-web-universe)

---

## ฉันจะรัน Worker Node (PC / Server)

1. อ่านสั้นๆ → **[JOIN.md](JOIN.md)** (3 ขั้นตอน: Configure → Verify → Run)  
2. ตรวจก่อนรัน → `python scripts/join-network.py`  
3. รัน Worker → `python core/deai/worker_node.py`  
4. รายละเอียดเพิ่ม → **[RUN.md](RUN.md)**

---

## ฉันมี Monolith MK-I Scout (ฮาร์ดแวร์แล้ว/กำลังจะเสร็จ)

1. อ่าน checklist เต็ม → **[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)**  
2. ติดตั้งบน Scout (Python, venv, requirements)  
3. ใช้ config Monolith:
   - **Scout ตัวเดียว (Hailo เดียว):** `--config configs/monolith_scout_single.toml`  
   - **HYDRA (Sentinel + Worker):** `python hydra_manager.py`  
4. ตรวจก่อนรัน → `python scripts/join-network.py --config configs/monolith_worker.toml`  
5. รันเป็น service → ใช้ [scripts/axionax-hydra.service.example](scripts/axionax-hydra.service.example)

---

## ฉันอยากดูสถานะ Testnet / Validator

→ **[TESTNET_READINESS.md](TESTNET_READINESS.md)** — Validator IP, RPC, Checklist, Verify

---

## ลิงก์สำคัญ

| ต้องการ | เอกสาร |
|--------|--------|
| เข้าร่วมเครือข่าย (ง่าย + ปลอดภัย) | [JOIN.md](JOIN.md) |
| รัน Worker / HYDRA | [RUN.md](RUN.md) |
| Production / Monolith Scout | [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) |
| สถานะ Testnet | [TESTNET_READINESS.md](TESTNET_READINESS.md) |
| สรุปโครงการ | [MASTER_SUMMARY.md](MASTER_SUMMARY.md) |
