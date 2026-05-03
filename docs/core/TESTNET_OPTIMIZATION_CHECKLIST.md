# Testnet Optimization Checklist

ใช้ระหว่าง **ช่วง testnet** เพื่อ optimize เสถียรภาพ, consensus, RPC, faucet และ monitoring ตาม [GENESIS_PUBLIC_TESTNET_PLAN.md](GENESIS_PUBLIC_TESTNET_PLAN.md)

---

## 1. Stability & Uptime (เสถียรภาพและเวลาใช้งาน)

### Validators (VPS1, VPS2)

- [ ] **Disk** — ตรวจพื้นที่ว่างบนแต่ละ VPS (ไม่ให้เต็ม)
  ```bash
  ssh root@217.216.109.5 'df -h'
  ssh root@46.250.244.4 'df -h'
  ```
- [ ] **Memory** — ตรวจ RAM usage (ไม่ OOM)
  ```bash
  ssh root@217.216.109.5 'free -h'
  ssh root@46.250.244.4 'free -h'
  ```
- [ ] **Container ทำงานต่อเนื่อง** — ไม่ restart บ่อย
  ```bash
  docker ps -a --format '{{.Names}}\t{{.Status}}'
  ```
- [ ] **Ulimit** — ไม่เจอ "Too many open files" (ถ้าเจอ ใช้ [GENESIS_LAUNCH_DAY_CHECKLIST.md#แก้ปัญหา-too-many-open-files](GENESIS_LAUNCH_DAY_CHECKLIST.md))

### RPC / VPS3

- [ ] **RPC proxy ขึ้น** — `https://rpc.axionax.org` ตอบ
  ```bash
  curl -s -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    https://rpc.axionax.org
  # คาดหวัง: "result":"0x15079"
  ```
- [ ] **Nginx / Certbot** — SSL ยังใช้งานได้ ไม่หมดอายุ

---

## 2. Consensus & Sync (ฉันทามติและ sync)

- [ ] **Chain ID ตรงกัน** — ทั้งสอง validator คืน 86137 (0x15079)
  ```bash
  curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://217.216.109.5:8545
  curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://46.250.244.4:8545
  ```
- [ ] **Block height ใกล้เคียงกัน** — ต่างกันไม่เกินหลักสิบเมื่อรอสักพัก
  ```bash
  curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://217.216.109.5:8545
  curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://46.250.244.4:8545
  ```
- [ ] **Block hash ตรงกันที่ความสูงเดียวกัน** — ไม่ fork
  ```bash
  # แทน <HEX_BLOCK> ด้วยความสูงเดียวกัน เช่น 0x64 (= 100)
  curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["<HEX_BLOCK>",false],"id":1}' http://217.216.109.5:8545
  curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["<HEX_BLOCK>",false],"id":1}' http://46.250.244.4:8545
  # เปรียบเทียบ "hash" ใน response ต้องเหมือนกัน
  ```
- [ ] **Block produce สม่ำเสมอ** — block time ~2s ตาม genesis; block number สูงขึ้นเรื่อยๆ

---

## 3. RPC Performance (ความเร็วและความพร้อม)

- [ ] **Latency พอใช้** — วัดเวลา response จาก frontend หรือ script (เช่น `eth_blockNumber` < 2s)
- [ ] **Rate limit ไม่หนักเกินไป** — ผู้ใช้ / dApp เรียก RPC ได้ไม่ถูก block บ่อย
- [ ] **CORS ถูกต้อง** — frontend (axionax.org) เรียก RPC ได้ไม่มี CORS error
- [ ] **HTTPS ใช้งานได้** — ใช้ `https://rpc.axionax.org` ไม่ fallback เป็น HTTP
- [ ] **Optimize suite (Python)** — จำลองโหลดอ่านแบบเบาและ (ถ้าต้องการ) ทดสอบความทนทาน RPC ต่อทราฟฟิกผิดรูปแบบ บน **เครือข่ายที่คุณเป็น operator หรือได้รับอนุญาตเท่านั้น** — รันจาก **root ของ repo**: `python scripts/run_optimize_suite.py …` หรือถ้าอยู่ในโฟลเดอร์ `scripts` แล้วใช้ `python run_optimize_suite.py …` (อย่าใช้ `python scripts/run_optimize_suite.py` ขณะ `cd` อยู่ใน `scripts` เพราะ path จะกลายเป็น `scripts/scripts/...`) — โหมด `--mode smoke` / `light` / `full`; stress ต้องมี `--cyber`; ชี้ RPC ด้วย `--rpc` หรือ `AXIONAX_RPC_URL`

---

## 4. Faucet & Token Distribution

- [ ] **Faucet ขึ้น** — `https://faucet.axionax.org` ตอบ (ตาม [VPS3_FAUCET_DEPLOY.md](../ops/deploy/VPS3_FAUCET_DEPLOY.md))
- [ ] **Balance faucet พอ** — ตรวจ balance ของ faucet address; เติมหรือปรับ amount ต่อ request ถ้าจำเป็น
- [ ] **Rate limit สมเหตุสมผล** — จำกัดต่อ IP/address (เช่น 24h) ไม่ให้ abuse แต่ยังให้ทดสอบได้
- [ ] **Request สำเร็จ** — ทดสอบขอ AXX จาก faucet แล้วได้ token; ดู log ถ้ามี error (RPC timeout, gas)

---

## 5. Monitoring & Observability

- [ ] **Disk/CPU/RAM ตรวจได้** — มี cron หรือ script เช็ก `df`, `free` เป็นระยะ หรือใช้ node-exporter + Prometheus ถ้ามี
- [ ] **RPC errors นับได้** — ดู Nginx access/error log หรือ RPC error rate
- [ ] **Block production monitor** — รู้ได้ทันทีถ้า block ค้าง (ความสูงไม่ขึ้น)

### ตัวอย่างคำสั่งเช็กรวดเดียว (จากเครื่องคุณ)

```powershell
# สรุปสถานะ RPC + block
$rpc = "https://rpc.axionax.org"
$body = '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
Invoke-RestMethod -Uri $rpc -Method Post -Body $body -ContentType "application/json"
```

```bash
# เช็กทั้งสอง validator + public RPC
for url in http://217.216.109.5:8545 http://46.250.244.4:8545 https://rpc.axionax.org; do
  echo -n "$url: "
  curl -s -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$url" | jq -r '.result'
done
```

---

## 6. Security (พื้นฐาน)

- [ ] **Firewall** — VPS เปิดแค่ port ที่ใช้ (22, 80, 443, 8545 ตามที่ deploy)
- [ ] **ไม่ leak key** — ไม่ commit `.env`, `FAUCET_PRIVATE_KEY`; ใช้ env บน server
- [ ] **HTTPS เท่านั้น** — RPC และ Faucet ใช้ HTTPS; ไม่ redirect user ไป HTTP
- [ ] **ทดสอบโหลด / จำลองภัยคุกคามอย่างรับผิดชอบ** — ใช้ optimize suite หรือเครื่องมือ stress กับ **โครงสร้างของคุณเอง หรือเมื่อได้รับอนุญาตเป็นลายลักษณ์อักษรเท่านั้น** ไม่ใช้เป็นภัยต่อเครือข่ายของผู้อื่น (สอดคล้องหลัก self-sufficiency: chain ทำงานได้โดยไม่พึ่ง telemetry/API ภายนอก; การทดสอบเป็น optional และแยกจาก runtime ของ node)

---

## สรุปลำดับโฟกัส

| ลำดับ | หมวด | เป้าหมาย |
|-------|------|----------|
| 1 | Stability & Uptime | Node และ RPC อยู่ได้ยาว ไม่ล่ม |
| 2 | Consensus & Sync | สอง validator เห็น chain เดียวกัน ไม่ fork |
| 3 | RPC Performance | Latency ดี, CORS ถูก, rate limit ไม่หนักเกิน |
| 4 | Faucet | Balance พอ, rate limit ใช้ได้จริง |
| 5 | Monitoring | Disk/CPU/RAM และ RPC error เห็นได้ชัด |
| 6 | Security | Firewall, ไม่ leak key, ใช้ HTTPS |

---

## อ้างอิง

- Launch day: [GENESIS_LAUNCH_DAY_CHECKLIST.md](GENESIS_LAUNCH_DAY_CHECKLIST.md)
- Plan: [GENESIS_PUBLIC_TESTNET_PLAN.md](GENESIS_PUBLIC_TESTNET_PLAN.md)
- Add network: [ADD_NETWORK_AND_TOKEN.md](ADD_NETWORK_AND_TOKEN.md)
- Faucet deploy: [VPS3_FAUCET_DEPLOY.md](../ops/deploy/VPS3_FAUCET_DEPLOY.md)
- Optimize suite (RPC smoke / light / optional stress): จาก root `python scripts/run_optimize_suite.py` หรือจาก `scripts/` รัน `python run_optimize_suite.py` — แพ็กเกจ `scripts/optimize_suite/` — unit test (ไม่ต้องมีเครือข่าย): `cd scripts && python -m unittest discover -s optimize_suite/tests -q`
- สร้างรายงาน performance อัตโนมัติ (optimize + block-time → `reports/NETWORK_PERFORMANCE_SUMMARY.md`): จาก root `python scripts/generate_network_performance_report.py` (ต้องมี `web3` สำหรับขั้น block-time — ดู `scripts/requirements.txt`)
- ภาพรวมความพร้อมแบบ production-like + เกณฑ์: [TESTNET_PRODUCTION_READINESS.md](TESTNET_PRODUCTION_READINESS.md) — เช็กอัตโนมัติ (chain / height / hash / faucet): `python scripts/check_testnet_production_readiness.py` → `reports/TESTNET_PRODUCTION_READINESS_LAST.md`
