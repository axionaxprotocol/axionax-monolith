# Testnet — ภาพรวมความพร้อมแบบ “production-grade”

เอกสารนี้ช่วยตอบว่า **testnet ปัจจุบันพร้อมให้รับภาระระดับผู้ใช้จริง (production-like) หรือยัง** โดยผูกกับ [TESTNET_OPTIMIZATION_CHECKLIST.md](TESTNET_OPTIMIZATION_CHECKLIST.md)

---

## 1. ความหมาย (สั้น ๆ)

| คำว่า | ความหมายใน repo นี้ |
|--------|---------------------|
| **Production-grade** | โครงสร้างและพฤติกรรมของ chain + RPC + faucet + การสังเกตการณ์ **พร้อมสำหรับการใช้งานจริงต่อเนื่อง** — ไม่ได้หมายว่า “mainnet ที่ audit ครบ” แต่หมายถึง **ไม่มีช่องโหว่ชัดในระดับปฏิบัติการ** (เสถียร, sync, ปลอดภัยพื้นฐาน, วัดผลได้) |
| **Testnet** | ยังคงเป็น **สภาพแวดล้อมทดสอบ** — โทเค็นไม่มีมูลค่าเงินจริง, อาจยัง reset/optimize ต่อได้ |

**สรุป:** “พร้อม production-grade บน testnet” = ผ่านเกณฑ์ด้านล่าง **โดยรวม**; ไม่มีการรับประกันทางกฎหมายหรือการเงิน

---

## 2. แผนที่ไปยัง Checklist (ควรไล่ตามลำดับ)

| ลำดับ | หมวด (Checklist) | บทบาทต่อ “พร้อมใช้งานจริง” | ตรวจอัตโนมัติได้ |
|-------|-------------------|---------------------------|-------------------|
| 1 | **Stability & Uptime** | โหนดไม่ล่ม, disk/RAM พอ | ไม่ (ต้อง SSH / metric) |
| 2 | **Consensus & Sync** | สอง validator เห็น chain เดียวกัน, ไม่ fork | **ได้** (chainId, height ระหว่าง validator, hash, แล้วเทียบ public RPC แยก) |
| 3 | **RPC Performance** | Latency/CORS/HTTPS ใช้ได้ | **บางส่วน** (latency, HTTPS) |
| 4 | **Faucet** | ผู้ทดสอบได้เงิน, rate limit พอดี | **บางส่วน** (HTTP ขึ้น, ไม่ 5xx) |
| 5 | **Monitoring** | รู้เมื่อเครือข่ายแย่ | ไม่ (ต้องตั้ง Prometheus/Grafana หรือ cron) |
| 6 | **Security** | Firewall, ไม่ leak key, HTTPS | ไม่ (ตรวจด้วยนโยบาย + เครื่องมือภายนอก) |

---

## 3. เกณฑ์ที่สคริปต์ `check_testnet_production_readiness.py` ใช้

สคริปต์แยก **สองชั้น** เพื่อไม่สับสนระหว่าง “validator ไม่ตรงกัน” กับ “public RPC ช้ากว่า backend”

| หัวข้อ | เกณฑ์ |
|--------|--------|
| **Chain ID** | ทุก endpoint คืน **0x15079** (หรือ `--expected-chain-id`) |
| **Validators (≥2)** | ความสูงต่างกัน ≤ `--max-validator-height-diff` (default **25**); **hash ตรงกัน** ที่ความสูงต่ำสุดในกลุ่ม validator |
| **Public RPC** | `pub_height ≥ min(validator)` และ `(max(validator) - pub_height) ≤ --max-public-lag` (default **40** block) — ยอมให้ proxy ตามหลัง tip ได้เล็กน้อย |
| **Hash ข้าม stack** | เมื่อ validator ผ่าน consensus แล้ว — เปรียบเทียบ hash ที่ความสูงเดียวกันระหว่าง validator + public |
| **Faucet** | HTTP ไม่ใช่ 5xx (root อาจ 404 — ต้องยืนยัน path ในเบราว์เซอร์) |
| **เสถียรภาพโหนด / monitoring / firewall** | ยังต้องทำด้วยมือตาม checklist |

ถ้า **validator สองตัวสูงไม่ตรงกันเกิน threshold** → **ยังไม่ production-grade** จนกว่าจะแก้ sync/peer (ไม่ใช่แค่ปรับเลขใน flag)

---

## 4. Performance / block time (`tps_finality_test.py`)

- เกณฑ์เดิม `Finality <0.5s` **ไม่เหมาะ** กับ chain ที่ block ~2s และการวัดผ่าน HTTP poll
- ใช้ **`--max-block-time-sec`** (default **5.0** วินาที) เป็นเกณฑ์แบบ production-style: ผ่านเมื่อค่าเฉลี่ยที่วัดได้ ≤ ค่านี้
- รายงานรวม: `python scripts/generate_network_performance_report.py` (ส่งต่อ `--max-block-time-sec` ได้)

---

## 5. เครื่องมือใน repo

```bash
python scripts/check_testnet_production_readiness.py --help
```

- รายงาน: `reports/TESTNET_PRODUCTION_READINESS_LAST.md` (+ `--json-out` ถ้าต้องการ)

```bash
python scripts/generate_network_performance_report.py
```

- รายงาน: `reports/NETWORK_PERFORMANCE_SUMMARY.md`

---

## 6. สิ่งที่ยังไม่มีในระบบอัตโนมัติ

- **SSH / disk / RAM / docker**, **SSL หมดอายุ**, **CORS จากเว็บจริง**, **rate limit**, **firewall / key** — ตาม checklist

---

## สรุป

- **ไล่ checklist 1→6** ใน [TESTNET_OPTIMIZATION_CHECKLIST.md](TESTNET_OPTIMIZATION_CHECKLIST.md)
- ใช้ **`check_testnet_production_readiness.py`** เป็นชั้นอัตโนมัติสำหรับ **consensus ระหว่าง validator + public lag + faucet**
- **Testnet ไม่ใช่ mainnet** — แยก asset และ SLA ให้ชัดเสมอ
