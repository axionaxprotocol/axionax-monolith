# รายงานความสอดคล้องของเอกสาร (Documentation Consistency Report)

**วันที่ตรวจสอบ:** March 2026  
**ขอบเขต:** axionax-web-universe + axionax-core-universe

---

## สรุปผลการตรวจสอบ

| หมวด | สถานะ | รายละเอียด |
|------|--------|-------------|
| **PoPC Naming** | ✅ แก้แล้ว | MASTER_SUMMARY, pitch-deck แก้เป็น "Probabilistic Checking" |
| **Chain ID** | ✅ แก้แล้ว | แก้ 888, 1001 → 86137 ใน INFRASTRUCTURE_STATUS, MONITORING, HEALTH_CHECKS, index, README, QUICK_START |
| **Domain** | ✅ แก้แล้ว | POPC_CORRECTION_SUMMARY, docs/page, WHITEPAPER แก้เป็น axionax.org |
| **Token Symbol** | ✅ แก้แล้ว | TOKENOMICS.md, TESTNET_ANNOUNCEMENT แก้เป็น AXXt |
| **RPC URL** | ✅ แก้แล้ว | docs/page แก้เป็น axionax.org/rpc/ |
| **Vision/Terminology** | ✅ สอดคล้อง | DePIN, Civilization OS, 7 Sentinels, Geo-Hierarchy ตรงกัน |

---

## 1. PoPC (Proof of ...) — ไม่สอดคล้อง

**ค่าที่ถูกต้อง:** Proof of **Probabilistic Checking** (ตาม Whitepaper, POPC_CORRECTION_SUMMARY, Technology.tsx)

| ไฟล์ | ค่าที่ใช้ | สถานะ |
|------|-----------|--------|
| MASTER_SUMMARY.md | Proof of **Processing Capability** | ❌ แก้ |
| apps/web/public/pitch-deck.html | Proof of **Processing Capability** | ❌ แก้ |
| Whitepaper, Technology, Features, etc. | Proof of **Probabilistic Checking** | ✅ ถูก |

---

## 2. Chain ID — ไม่สอดคล้อง

**ค่าที่ถูกต้อง:** **86137** (0x15079) สำหรับ Testnet

| ไฟล์ | ค่าที่ใช้ | สถานะ |
|------|-----------|--------|
| apps/web/public/TESTNET_ANNOUNCEMENT.md | axionax-testnet-1, 1001 | ❌ แก้ |
| apps/docs/index.md | 888 | ❌ แก้ |
| apps/docs/MONITORING.md | 888 | ❌ แก้ |
| apps/docs/HEALTH_CHECKS.md | 888 | ❌ แก้ |
| apps/docs/INFRASTRUCTURE_STATUS.md | 888 | ❌ แก้ |
| apps/web/docs/QUICK_START.md | 888 | ❌ แก้ |
| apps/marketplace/QUICK_START.md | 1337 | ⚠️ Local dev? |
| ส่วนใหญ่ | 86137 | ✅ ถูก |

---

## 3. Domain (axionax.org vs axionax.io)

**ค่าที่ถูกต้อง:** **axionax.org** (primary domain)

| ไฟล์ | ค่าที่ใช้ | สถานะ |
|------|-----------|--------|
| apps/docs/POPC_CORRECTION_SUMMARY.md | tech@axionax.**io** | ❌ แก้ |
| apps/web/src/app/docs/page.tsx | rpc.testnet.axionax.**io** | ❌ แก้ |
| WHITEPAPER (seeds config) | seed1.testnet.axionax.**io** | ⚠️ Placeholder |
| ส่วนใหญ่ | axionax.**org** | ✅ ถูก |

---

## 4. RPC / Endpoint URLs

**ค่าที่ถูกต้อง:**
- RPC: `https://axionax.org/rpc/` หรือ `https://rpc.axionax.org`
- Validators: EU 217.76.61.116:8545, AU 46.250.244.4:8545

| ไฟล์ | ค่าที่ใช้ | สถานะ |
|------|-----------|--------|
| apps/web/src/app/docs/page.tsx | rpc.testnet.axionax.io | ❌ แก้ |
| apps/web/.env.example | testnet-rpc.axionax.org | ⚠️ ตรวจสอบ |
| ส่วนใหญ่ | axionax.org/rpc/ หรือ rpc.axionax.org | ✅ ถูก |

---

## 5. Token Symbol (AXX vs AXXt)

**ค่าที่ถูกต้อง:**
- **Testnet:** AXXt (Axionax Testnet Token)
- **Mainnet:** AXX (Axionax Token)

| ไฟล์ | ค่าที่ใช้ | สถานะ |
|------|-----------|--------|
| TOKENOMICS.md (notice) | "1 Billion AXX (for testing)" | ⚠️ ควรเป็น AXXt |
| TESTNET_ANNOUNCEMENT.md | AXX | ⚠️ Testnet ควรใช้ AXXt ในบริบท token |
| TOKENOMICS_TESTNET.md | AXXt | ✅ ถูก |
| Whitepaper | AXX / AXXt | ✅ ถูก |

---

## 6. Documentation URL

**ค่าที่ใช้ในโปรเจกต์:**
- `https://axionaxprotocol.github.io/axionax-docs/` (GitHub Pages)
- `https://docs.axionax.org` (บางเอกสารอ้างถึง — ตรวจสอบว่า redirect หรือไม่)

---

## 7. เอกสารที่สอดคล้องกับ Whitepaper v2.1

| เอกสาร | DePIN | Geo-Hierarchy | 7 Sentinels | AXX/AXXt |
|--------|-------|---------------|-------------|----------|
| MASTER_SUMMARY.md | ✅ | ✅ | ✅ | ✅ |
| WHITEPAPER.md | ✅ | ✅ | ✅ | ✅ |
| TOKENOMICS.md | - | - | - | ✅ |
| TOKENOMICS_TESTNET.md | - | - | - | ✅ |
| README.md | - | - | - | ✅ |

---

## แนะนำการแก้ไข (เรียงตามความสำคัญ)

1. **MASTER_SUMMARY.md** — แก้ PoPC เป็น "Probabilistic Checking"
2. **pitch-deck.html** — แก้ PoPC เป็น "Probabilistic Checking"
3. **TESTNET_ANNOUNCEMENT.md** — แก้ Chain ID เป็น 86137, token เป็น AXXt
4. **docs/page.tsx** — แก้ RPC เป็น axionax.org/rpc/ หรือ rpc.axionax.org
5. **POPC_CORRECTION_SUMMARY.md** — แก้ email เป็น axionax.org
6. **apps/docs/index.md, MONITORING, HEALTH_CHECKS, INFRASTRUCTURE_STATUS** — แก้ Chain ID 888 → 86137
7. **apps/web/docs/QUICK_START.md** — แก้ Chain ID 888 → 86137
8. **TOKENOMICS.md** — แก้ notice เป็น "AXXt" สำหรับ testnet

---

## 8. axionax-core-universe — ผลการตรวจสอบ

### 8.1 PoPC Naming

| ไฟล์ | ค่าที่ใช้ | สถานะ |
|------|-----------|--------|
| MASTER_SUMMARY.md | Proof of **Processing Capability** | ❌ แก้ |
| core/docs/API_REFERENCE.md | Proof of **Provable Computation** | ❌ แก้ (ผิด 2 จุด) |
| README.md, core/README.md, CYBER_DEFENSE.md, etc. | Proof of **Probabilistic Checking** | ✅ ถูก |

### 8.2 Chain ID

| ไฟล์ | ค่าที่ใช้ | สถานะ |
|------|-----------|--------|
| ops/deploy/mock-rpc/README.md | default: **888** | ❌ แก้ |
| ops/deploy/DEPLOYMENT_REPORT.md | CHAIN_ID=**888** | ❌ แก้ |
| Axionax_v1.6.../faucet/index.js | default "**8615**" (typo) | ❌ แก้ → 86137 |
| ops/deploy/environments/testnet/public/*.env* | axionax-testnet-1 | ⚠️ Legacy format |
| ส่วนใหญ่ | 86137 | ✅ ถูก |

### 8.3 Domain

| สถานะ | หมายเหตุ |
|-------|----------|
| ✅ | ใช้ axionax.org ทั้งหมด ไม่พบ axionax.io |

### 8.4 Token (AXX vs AXXt)

| หมายเหตุ |
|----------|
| Core ใช้ **AXX** ใน genesis, faucet, contracts — สอดคล้องกับ native token |
| Web-universe ใช้ **AXXt** สำหรับ testnet token name (TOKENOMICS_TESTNET) |
| ADD_NETWORK_AND_TOKEN: "symbol AXX" — native token แสดงเป็น AXX ได้ |

### 8.5 การแก้ไขที่ทำใน axionax-core-universe ✅

| ไฟล์ | การแก้ไข | สถานะ |
|------|----------|--------|
| MASTER_SUMMARY.md | Processing Capability → **Probabilistic Checking** | ✅ แก้แล้ว |
| core/docs/API_REFERENCE.md | Provable Computation → **Probabilistic Checking**, Predictive → **Posted** | ✅ แก้แล้ว |
| ops/deploy/mock-rpc/README.md | CHAIN_ID default 888 → **86137** | ✅ แก้แล้ว |
| ops/deploy/DEPLOYMENT_REPORT.md | CHAIN_ID=888 → **86137** | ✅ แก้แล้ว |
| .../faucet/index.js | CHAIN_ID default "8615" → **"86137"** | ✅ แก้แล้ว |

**Commit:** `docs: fix PoPC naming, Chain ID consistency (86137)` — อยู่ที่ `/workspace/core-universe`  
**หมายเหตุ:** Push ไป remote ต้องใช้บัญชีที่มีสิทธิ์ (cursor bot ไม่มี write access)

---

*รายงานนี้สร้างจากการสแกนเอกสารใน axionax-web-universe และ axionax-core-universe*
