# Axionax Node Package — ดาวน์โหลดแล้วรัน

ชุดนี้ใช้สำหรับ **เข้าร่วมเครือข่ายเป็นโหนด** — ตรวจสอบความเหมาะสมของเครื่อง และเลือกประเภทโหนดได้โดยง่าย

---

## วิธีใช้ (3 ขั้นตอน)

### 1. เตรียมเครื่อง

- ติดตั้ง **Python 3.10+**  
  https://www.python.org/downloads/
- (ถ้ายังไม่มี) ติดตั้ง dependencies:
  ```bash
  pip install -r core/deai/requirements.txt
  ```

### 2. แตกไฟล์ package

- แตก zip ไปยังโฟลเดอร์ใดก็ได้ (หรือโคลน repo แล้วใช้โฟลเดอร์นั้น)

### 3. รันสคริปต์หลัก

จาก **โฟลเดอร์ที่มีโฟลเดอร์ `core/`, `configs/`, `scripts/`** (root ของ package):

```bash
python scripts/join-axionax.py
```

- สคริปต์จะ **ตรวจความเหมาะสม** (Python, เครือข่าย RPC)
- จากนั้นให้ **เลือกประเภทโหนด**: Worker (PC), Monolith Scout, หรือ HYDRA (Sentinel+Worker)
- หลังตรวจผ่าน จะถามว่าต้องการ **รันโหนดเลยหรือไม่**

---

## ตัวเลือกประเภทโหนด

| เลือก | ประเภท | เหมาะกับ |
|--------|--------|----------|
| 1 | Worker (PC/Server) | เครื่อง PC หรือ server ทั่วไป |
| 2 | Worker Monolith Scout | ฮาร์ดแวร์ Monolith MK-I Scout (Hailo ตัวเดียว) |
| 3 | HYDRA (Sentinel + Worker) | Monolith MK-I สอง Hailo (Sentinel + Worker คู่) |

---

## รันแบบไม่ถาม (ใช้ใน script)

```bash
# ตรวจความเหมาะสมอย่างเดียว
python scripts/join-axionax.py --check-only

# เลือกประเภทแล้วรัน
python scripts/join-axionax.py --type worker
python scripts/join-axionax.py --type scout
python scripts/join-axionax.py --type hydra

# แสดงคำสั่งรัน แต่ไม่รันโหนด
python scripts/join-axionax.py --type worker --no-start
```

---

## ความปลอดภัย

- อย่าแชร์หรือ commit ไฟล์ **.env** และ **worker_key.json**
- หลังรันครั้งแรก: **backup** ไฟล์ wallet และรหัสผ่าน

---

**เอกสารเพิ่ม:** ถ้าโหลดจาก repo เต็ม ดู [JOIN.md](JOIN.md), [GET_STARTED.md](GET_STARTED.md), [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)
