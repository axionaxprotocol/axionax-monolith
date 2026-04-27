# สรุปผลทดสอบ Performance เครือข่าย (Axionax)

**สร้างอัตโนมัติ:** 2026-03-21 15:20:53 UTC
**RPC ที่ทดสอบ:** `https://rpc.axionax.org`

---

## 1. Optimize suite

คำสั่ง: `python scripts/run_optimize_suite.py -q --mode full --rpc https://rpc.axionax.org --light-duration 45.0 --light-rps 2.5 --json-out reports/optimize_suite_last.json`

- **สถานะรวม:** PASS

### smoke

- ผล: **PASS** — smoke OK

| Metric | ค่า |
|--------|-----|
| `eth_chainId_ms` | 903.12 |
| `eth_blockNumber_ms` | 700.6 |
| `chain_id_hex` | 0x15079 |
| `block_number_hex` | 0x1af35 |

### light_usage

- ผล: **PASS** — light: 48 core ok, 0 core fail over 45s (p50 472ms)

| Metric | ค่า |
|--------|-----|
| `core_successes` | 48 |
| `core_failures` | 0 |
| `optional_attempts` | 3 |
| `optional_ok` | 0 |
| `latency_p50_ms` | 472.43 |
| `latency_p95_ms` | 648.79 |
| `latency_mean_ms` | 489.81 |

รายงานดิบ: `reports/optimize_suite_last.json`

---

## 2. Block timing (`tps_finality_test.py` — block-time)

คำสั่ง: `python scripts/load_test/tps_finality_test.py --mode block-time --rpc https://rpc.axionax.org --duration 45 --json-out reports/block_time_last.json`

| Metric | ค่า |
|--------|-----|
| Duration (s) | 45.6 |
| Blocks produced | 9 |
| Blocks/sec | 0.1974 |
| Avg block time (s) | 4.7443 |
| Script target Finality &lt;0.5s | FAIL |

**หมายเหตุ:** เกณฑ์ `<0.5 s` เป็นค่าภายในสคริปต์ ไม่ใช่พารามิเตอร์ genesis โดยตรง; ค่าช่วง block ที่วัดผ่านการ poll HTTP ผสม latency เครือข่าย — ใช้เปรียบเทียบเชิง trend

รายงานดิบ: `reports/block_time_last.json`

---

## 3. ขั้นถัดไป

- รันซ้ำจากเครื่อง/VPS ใกล้ RPC เพื่อลด latency ที่วัด
- เพิ่ม `--block-duration` เพื่อให้ค่าเฉลี่ยเสถียรขึ้น
- โหมด TPS ต้องมี funded key — ดู `scripts/load_test/tps_finality_test.py --help`
