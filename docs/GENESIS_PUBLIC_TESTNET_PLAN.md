# แผน Genesis Public Testnet — ภายในเดือนนี้

ใช้ VPS 3 ตัว (spec: 4 vCPU, 8 GB RAM, 75 GB NVMe / 150 GB SSD, 200 Mbit/s) ให้ครบวงจร: Validators + RPC + Faucet + (optional Explorer) + Frontend ชี้มาที่ chain เดียวกัน

---

## 1. จัดสรร VPS 3 ตัว

| VPS | IP | บทบาท | Services | หมายเหตุ |
|-----|-----|--------|----------|----------|
| **VPS 1 (EU)** | **217.76.61.116** | Validator #1 + RPC | axionax-node (validator + RPC 8545, P2P 30303) | Genesis validator, เปิด 8545, 30303 |
| **VPS 2 (AU)** | **46.250.244.4** | Validator #2 + RPC | axionax-node (validator + RPC 8545, P2P 30303) | Genesis validator, sync P2P กับ VPS1 |
| **VPS 3 (Infra)** | **217.216.109.5** | RPC proxy + Faucet + (optional Explorer) | Nginx, Faucet, Postgres, Redis; optional Explorer | ไม่รัน node — ชี้ RPC ไป VPS1/VPS2 |

### เหตุผลจัดแบบนี้

- **Validator ต้อง 2 ตัวขึ้นไป** สำหรับ consensus (repo ใช้ 217.76 / 46.250 อยู่ใน genesis แล้ว) — ใส่ spec 4c/8GB/75GB ตรงกับ NODE_SPECS ขั้นต่ำของ Validator สำหรับ testnet
- **RPC อยู่บน Validator เลย** — ลดความซับซ้อน, ไม่ต้อง sync node เพิ่มบน VPS3; ผู้ใช้/เว็บเรียก `http://217.76.61.116:8545` หรือ `http://46.250.244.4:8545` ได้เลย
- **VPS3 เป็นจุดรวม traffic** — ใช้ Nginx ทำ reverse proxy (เช่น rpc.axionax.org → VPS1 หรือ round-robin), รัน Faucet (RPC_URL ชี้ไป VPS1), ถ้า RAM พอค่อยรัน Explorer; ไม่รัน chain node จึงประหยัด RAM/CPU

### Resource คร่าวๆ ต่อ VPS

| VPS | CPU | RAM | Storage | โน้ต |
|-----|-----|-----|---------|-----|
| VPS1 | 4 vCPU ใช้เต็ม (node + RPC) | ~6–8 GB (node 3–4 GB + RPC + OS) | 75 GB พอสำหรับ testnet (แนะนำ 100 GB ระยะยาว) | อยู่ที่ขีดขั้นต่ำ NODE_SPECS; monitor disk |
| VPS2 | เหมือน VPS1 | เหมือน VPS1 | เหมือน VPS1 | เหมือน VPS1 |
| VPS3 | Nginx + Faucet + DB (+ Explorer ถ้าเปิด) | Nginx ~100 MB, Faucet ~512 MB, Postgres 2–4 GB, Redis ~100 MB, Explorer 2–4 GB ถ้าเปิด → รวม ~6–8 GB | 75 GB (ส่วนใหญ่เป็น Postgres ถ้ารัน Explorer) | ถ้า 8 GB แคบ ให้รันแค่ Nginx + Faucet ก่อน แล้วค่อยเพิ่ม Explorer |

---

## 2. สิ่งที่ต้องมีก่อน Genesis

- [ ] **Genesis file** — chain_id 86137, validators 2 ตัว (ที่อยู่ + enode ของ VPS1, VPS2)
- [ ] **Validator keys** — แต่ละ VPS มี key สำหรับ block production (และถ้ามี identity key สำหรับ P2P ให้ตรงกัน)
- [ ] **Faucet key** — ใส่ใน genesis เป็น allocation; ตั้ง `FAUCET_PRIVATE_KEY` บน VPS3
- [ ] **Firewall** — VPS1 & VPS2: เปิด 22, 8545, 30303 (และ 8546 ถ้าใช้ WS); VPS3: 22, 80, 443, 3002 (ถ้า expose Faucet โดยตรงก่อนมี Nginx)

---

## 3. Timeline — ให้สำเร็จภายในเดือนนี้

### สัปดาห์ที่ 1: เตรียม Validators + Genesis

| วัน | งาน | หมายเหตุ |
|-----|-----|----------|
| 1–2 | สร้าง/อัปเดต genesis (chain_id 86137, validators EU+AU), สร้าง validator keys | ใช้ `core/tools/create_genesis.py`, ใส่ IP 217.76.61.116, 46.250.244.4 |
| 2–3 | Deploy node บน VPS1 และ VPS2 (binary หรือ Docker), ใช้ genesis เดียวกัน | ใช้ `ops/deploy/scripts/update-validator-vps.sh` หรือ setup ตาม VPS_VALIDATOR_UPDATE.md |
| 3–4 | เปิดพอร์ต 8545, 30303 (และ 8546 ถ้าต้องการ) บนทั้งสอง VPS; ตรวจ RPC และ P2P | `curl` eth_chainId, eth_blockNumber; ตรวจว่า P2P เห็นกัน (log หรือ metrics) |
| 4–5 | ยืนยันว่า block ถูก produce และ sync ระหว่างสอง validator | ดู block height จากทั้งสอง RPC ว่าเพิ่มใกล้เคียงกัน |

### สัปดาห์ที่ 2: Infrastructure (VPS3) + Faucet

| วัน | งาน | หมายเหตุ |
|-----|-----|----------|
| 1–2 | บน VPS3: ติดตั้ง Nginx, clone/copy config จาก `ops/deploy/nginx` | เตรียม reverse proxy สำหรับ rpc.axionax.org → VPS1 (หรือ load balance ไป VPS1,VPS2) |
| 2–3 | รัน Faucet (Docker หรือ binary จาก core), ตั้ง `RPC_URL=http://217.76.61.116:8545`, `FAUCET_PRIVATE_KEY`, `CHAIN_ID=86137` | ใช้ image หรือ build จาก `ops/deploy/Dockerfile.faucet` |
| 3–4 | ตั้ง DNS: rpc.axionax.org → VPS3 (หรือตรงไป VPS1 ถ้าไม่ใช้ proxy), faucet.axionax.org → VPS3 | ถ้าใช้ Nginx บน VPS3 ให้ rpc.axionax.org proxy ไป VPS1 (หรือทั้งคู่) |
| 4–5 | ทดสอบ Faucet: รับ AXX ไปที่อยู่ทดสอบ, ตรวจ balance ผ่าน RPC | ใช้ curl POST /request หรือหน้าเว็บ Faucet |

### สัปดาห์ที่ 3: SSL + Frontend ชี้ RPC

| วัน | งาน | หมายเหตุ |
|-----|-----|----------|
| 1–2 | ติดตั้ง SSL บน VPS3 (Certbot), เปิด 443; อัปเดต Nginx ให้ใช้ HTTPS | ใช้ `ops/deploy` certbot + nginx conf |
| 2–3 | Frontend (axionax-web-universe): ตั้ง `NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org` (หรือ http://217.76.61.116:8545 ชั่วคราว) แล้ว build/deploy | โฮสต์ที่ Vercel/VPS ตามที่ใช้อยู่ |
| 3–4 | ทดสอบ Connect Wallet + Add Network (Axionax Testnet, 86137) + รับ AXX จาก Faucet | ตาม docs/ADD_NETWORK_AND_TOKEN.md |
| 4–5 | (Optional) รัน Explorer บน VPS3 ถ้า RAM พอ; ไม่พอให้เลื่อนไปหลัง launch | ใช้ image หรือ stack จาก ops/deploy |

### สัปดาห์ที่ 4: Go Live + สื่อสาร

| วัน | งาน | หมายเหตุ |
|-----|-----|----------|
| 1–2 | ตรวจสอบอีกครั้ง: RPC, Faucet, Frontend, MetaMask; รัน `ops/deploy/scripts/verify-launch-ready.sh` ถ้า path ตรง | แก้จุดที่ script เตือน |
| 2–3 | ประกาศ Public Testnet: เอกสาร RPC URL, Chain ID 86137, Faucet link, วิธีเพิ่มเครือข่ายใน MetaMask | อัป README, docs, axionax.org |
| 3–7 | ติดตาม uptime, disk, RPC errors; เติม Faucet ถ้ายอดหมด | ใช้ Grafana/Prometheus ถ้าติดตั้งบน VPS3 |

---

## 4. คำสั่ง / ไฟล์อ้างอิง

- Genesis: `core/tools/create_genesis.py`, `core/core/genesis/src/lib.rs`
- Validator update: `ops/deploy/scripts/update-validator-vps.sh`, `ops/deploy/VPS_VALIDATOR_UPDATE.md`
- RPC เช็ค: `curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://217.76.61.116:8545`
- Faucet: `ops/deploy/Dockerfile.faucet`, `tools/devtools/tools/faucet/`
- Nginx: `ops/deploy/nginx/conf.d/` (rpc.conf, faucet.conf)
- Launch verify: `ops/deploy/scripts/verify-launch-ready.sh`
- การเชื่อมต่อภาพรวม: `docs/CONNECTIVITY_OVERVIEW.md`
- เพิ่มเครือข่าย/รับ AXX: `docs/ADD_NETWORK_AND_TOKEN.md`

---

## 5. สรุปการจัดสรร

- **VPS 1 (217.76.61.116):** Validator + RPC — หัวใจของ chain (EU)
- **VPS 2 (46.250.244.4):** Validator + RPC — consensus คู่กับ VPS1 (AU)
- **VPS 3 (217.216.109.5):** Nginx + Faucet + (optional Explorer) — ไม่รัน node, ชี้ RPC ไป VPS1/VPS2; เป็นจุดรวมโดเมนและบริการสำหรับผู้ใช้

ทำตาม timeline ด้านบนและเช็คจากรายการใน docs ที่อ้างอิง จะทำให้ Genesis public testnet ภายในเดือนนี้สำเร็จได้ตาม spec ที่มีครับ

**ดูเพิ่ม:** [TESTNET_READINESS.md](../TESTNET_READINESS.md) · [GITHUB_READINESS.md](GITHUB_READINESS.md)
