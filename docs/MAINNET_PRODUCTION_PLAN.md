# Mainnet Production Plan — Target Mid-Year 2026

แผนเปิด **Mainnet** หลัง Testnet (Chain ID 86137) รันเสถียร — เป้าหมาย **เปิด mainnet กลางปี 2026** (Chain ID **86150**)

อ้างอิง: [GENESIS_PUBLIC_TESTNET_PLAN.md](GENESIS_PUBLIC_TESTNET_PLAN.md) · [TESTNET_OPTIMIZATION_CHECKLIST.md](TESTNET_OPTIMIZATION_CHECKLIST.md) · [ADD_NETWORK_AND_TOKEN.md](ADD_NETWORK_AND_TOKEN.md) (Mainnet Chain ID 86150)

---

## 1. สรุปเป้าหมาย

| รายการ | ค่า |
|--------|-----|
| **Mainnet Chain ID** | 86150 (0x15086) |
| **Genesis** | สร้างใหม่สำหรับ mainnet — ไม่ใช้ genesis ของ testnet |
| **Validator keys** | สร้างใหม่สำหรับ mainnet — ไม่ใช้ key เดียวกับ testnet |
| **Faucet** | จำกัดหรือปิดหลัง mainnet (หรือ rate limit เข้ม; ไม่ใช้ seed เดียวกับ testnet) |
| **Timeline** | Testnet stable → Pre-mainnet prep → Mainnet genesis + launch |

---

## 2. Timeline (ภาพรวมถึงกลางปี)

| ช่วง | เป้าหมาย |
|------|----------|
| **มี.ค.–เม.ย.** | Testnet รันเสถียร; ไล่ [TESTNET_OPTIMIZATION_CHECKLIST.md](TESTNET_OPTIMIZATION_CHECKLIST.md) ให้ครบ; รวบรวม lesson learned |
| **เม.ย.–พ.ค.** | Pre-mainnet: สร้าง mainnet genesis (86150), key ใหม่, security hardening, audit/remediation |
| **พ.ค.–มิ.ย.** | Mainnet infra พร้อม (VPS/validators), runbook อัปเดต, monitoring, go/no-go |
| **มิ.ย. (เป้า)** | Mainnet launch: เปิด chain 86150, ประกาศ RPC / Add Network, docs อัปเดต |

---

## 3. Pre-Mainnet Checklist (ก่อนเปิด Mainnet)

### 3.1 จาก Testnet

- [ ] Testnet รันต่อเนื่องไม่ล่ม; block produce สม่ำเสมอ; sync ระหว่าง validator ดี
- [ ] ไล่ [TESTNET_OPTIMIZATION_CHECKLIST.md](TESTNET_OPTIMIZATION_CHECKLIST.md) ครบ (Stability, Consensus, RPC, Faucet, Monitoring, Security)
- [ ] บันทึก lesson learned (disk, ulimit, P2P, RPC timeout) และนำไปใช้ใน mainnet deploy

### 3.2 Genesis & Keys (Mainnet)

- [ ] **Genesis ใหม่** — สร้าง genesis สำหรับ mainnet เท่านั้น (chain_id **86150**); ใช้ `core/tools/create_genesis.py` (หรือ script ที่กำหนด mainnet)
- [ ] **Validator keys ใหม่** — แต่ละ validator ใช้ key ที่ generate ใหม่สำหรับ mainnet; ไม่ใช้ key จาก testnet
- [ ] **Faucet (ถ้ามี)** — ถ้ายังเปิด faucet mainnet ใช้ key/address ใหม่; rate limit เข้ม; ไม่ใช้ seed เดียวกับ testnet
- [ ] **Genesis hash** — บันทึก SHA-256 ของ mainnet genesis และประกาศให้ validator ใช้ชุดเดียวกัน

### 3.3 Security

- [ ] **Audit** — ทำตาม [SECURITY_AUDIT_SCOPE.md](SECURITY_AUDIT_SCOPE.md); ปิด remediation ตาม [SECURITY_REMEDIATION_PLAN.md](../SECURITY_REMEDIATION_PLAN.md) / [AUDIT_REMEDIATION.md](AUDIT_REMEDIATION.md)
- [ ] **Key storage** — Private key เก็บใน env/secret manager บน server; ไม่ commit; พิจารณา HSM หรือ cold key ตามนโยบาย
- [ ] **Firewall** — เปิดเฉพาะ port ที่จำเป็น (22, 8545, 30303 ฯลฯ); จำกัด SSH ตามความเหมาะสม
- [ ] **HTTPS only** — RPC และ frontend ใช้ HTTPS; ไม่ redirect ไป HTTP

### 3.4 Infrastructure

- [ ] **VPS / Validators** — ตัดสินใจใช้ชุด VPS เดียวกับ testnet หรือแยก (แนะนำแยกหรือ re-image สำหรับ mainnet เพื่อไม่ปน key/config testnet)
- [ ] **Spec** — ตาม [NODE_SPECS.md](../core/docs/NODE_SPECS.md); พิจารณาเพิ่ม resource ถ้า mainnet load สูงกว่า testnet
- [ ] **RPC** — Nginx/SSL, domain (เช่น rpc.axionax.org ชี้ mainnet หรือแยก mainnet.axionax.org); rate limit และ CORS ตั้งไว้
- [ ] **Ulimit / OS** — ใช้ค่า nofile และ tuning ตามที่แก้ใน testnet (เช่น [GENESIS_LAUNCH_DAY_CHECKLIST.md#แก้ปัญหา-too-many-open-files](GENESIS_LAUNCH_DAY_CHECKLIST.md))

### 3.5 Monitoring & Runbook

- [ ] **Monitoring** — Disk, CPU, RAM, block height, RPC latency/errors; alert เมื่อ block ค้างหรือ RPC ล่ม
- [ ] **Runbook** — อัปเดต [core/docs/RUNBOOK.md](../core/docs/RUNBOOK.md) สำหรับ mainnet (chain halt, fork, RPC, faucet)
- [ ] **Contacts** — กำหนดคนรับผิดชอบและช่องทางแจ้งเหตุ (Slack/Discord/email)

### 3.6 Docs & Communication

- [ ] **Add Network** — อัปเดต [ADD_NETWORK_AND_TOKEN.md](ADD_NETWORK_AND_TOKEN.md) ให้มี mainnet (Chain ID 86150, RPC URL, symbol AXX)
- [ ] **Frontend** — ตั้ง RPC mainnet; แยกหรือสลับ network testnet/mainnet ตาม UI
- [ ] **ประกาศ** — กำหนดวันเปิด mainnet, RPC URL, Chain ID 86150, วิธี Add Network และข้อควรระวัง (ไม่มี faucet หรือ rate limit)

---

## 4. Mainnet Launch Day (สรุป)

- [ ] ส่ง mainnet genesis ไปยัง validators ทั้งหมด; ตรวจ genesis hash ตรงกัน
- [ ] Deploy/start node mainnet บนทุก validator (ไม่รัน testnet บนเครื่องเดียวกันพร้อมกัน เว้นแต่แยก config/port)
- [ ] ตรวจ chain_id 86150 และ block produce สม่ำเสมอ
- [ ] เปิด RPC mainnet (HTTPS); ทดสอบ `eth_chainId`, `eth_blockNumber`
- [ ] อัปเดต frontend และประกาศ mainnet กับชุมชน

---

## 5. สิ่งที่ไม่ทำกับ Mainnet (แตกต่างจาก Testnet)

| รายการ | Testnet | Mainnet |
|--------|---------|---------|
| Chain ID | 86137 | 86150 |
| Genesis | genesis.json (testnet) | genesis ใหม่เฉพาะ mainnet |
| Validator key | key testnet | key ใหม่ mainnet only |
| Faucet | เปิดให้ขอ AXX | จำกัดมากหรือปิด; ไม่ใช้ seed เดียวกับ testnet |
| ค่า/โทเคน | ไม่มีมูลค่าจริง | มีมูลค่า — security และ key management เข้มขึ้น |

---

## 6. อ้างอิง

- Testnet plan: [GENESIS_PUBLIC_TESTNET_PLAN.md](GENESIS_PUBLIC_TESTNET_PLAN.md)
- Testnet optimization: [TESTNET_OPTIMIZATION_CHECKLIST.md](TESTNET_OPTIMIZATION_CHECKLIST.md)
- Launch day (testnet): [GENESIS_LAUNCH_DAY_CHECKLIST.md](GENESIS_LAUNCH_DAY_CHECKLIST.md)
- Add network: [ADD_NETWORK_AND_TOKEN.md](ADD_NETWORK_AND_TOKEN.md) (mainnet 86150)
- Security audit: [SECURITY_AUDIT_SCOPE.md](SECURITY_AUDIT_SCOPE.md), [SECURITY_REMEDIATION_PLAN.md](../SECURITY_REMEDIATION_PLAN.md)
- Runbook: [core/docs/RUNBOOK.md](../core/docs/RUNBOOK.md)
- Node spec: [core/docs/NODE_SPECS.md](../core/docs/NODE_SPECS.md)
- Bible: [AXIONAX_BIBLE.md](AXIONAX_BIBLE.md)
