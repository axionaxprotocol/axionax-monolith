---
title: 'axionax Security & Protocol Compliance'
version: 1.8.0
status: ✅ Active - All Systems Operational
protocol_version: v1.8.0-testnet
last_updated: 2025-12-05
---

# axionax Upgrade v1.6 — "Stability & Transparency Release"

**Objective:**  
เพิ่มความมั่นคงของมูลค่าเหรียญ AXX ใน Marketplace, เสริมการเฝ้าระวังพฤติกรรมตลาดด้วย DeAI Sentinel รุ่นใหม่  
และปรับพารามิเตอร์เศรษฐศาสตร์ให้เหมาะสมกับช่วงเปิด Testnet → Mainnet

---

## 1. Summary

**ชื่อรหัสอัปเกรด:** `Stability & Transparency`  
**ช่วงเป้าหมาย:** Q4 2025 → Q1 2026  
**สCOPE:** Economic Layer + Oracle Layer + Sentinel + DAO Policy

---

## 2. Motivation

จากการวิเคราะห์ความเสี่ยงใน `AXX_RiskMitigation_v1.6.md` พบว่า:

- การผันผวนของมูลค่า AXX ระหว่าง Commit–Settle ส่งผลต่อความยุติธรรมของผู้ทำงาน
- Oracle เดิมพึ่งแหล่งเดียว อาจเปิดช่องให้เกิด manipulation
- DAO ยังไม่มี liquidity shield ในกรณี shock
- ต้องเพิ่มความโปร่งใสของค่าพารามิเตอร์เครือข่าย (Base_t, slash_rate, DA-miss)

เป้าหมายของ v1.6 คือ "ทำให้ระบบยั่งยืนและโปร่งใสต่อ DAO และสาธารณะมากขึ้น"

---

## 3. Major Features

### 🪙 3.1 Stability & Compensation Layer (SCL)

**Subsystem:** Settlement / Marketplace  
**ฟังก์ชันใหม่:**

- `USD-Peg Escrow` — ผู้ว่าจ้างสามารถจ่ายงานในมูลค่า USD เทียบได้อัตโนมัติ
- `Dual-Timestamp Settlement` — ใช้ราคา oracle ตอน commit และตอน settle เพื่อชดเชยความผันผวน
- `Price Compensation Pool (PCP)` — DAO treasury รองรับส่วนต่างราคาระหว่าง job commit–settle

**ผลลัพธ์:** ลดความเสียเปรียบผู้ทำงานจากความผันผวนราคาเหรียญ  
**พารามิเตอร์ใหม่:**

```yaml
settlement:
  stable_ref: 'USD'
  price_window_sec: 600
  comp_threshold_pct: 10
```

---

### 🧮 3.2 Treasury & Liquidity Guard

**Subsystem:** DAO Treasury  
**ฟังก์ชันใหม่:**

- ตั้ง DAO-Guarded Liquidity Pool (GLP) เพื่อคงสภาพคล่องในตลาด
- ใช้ multisig + timelock 7 วัน สำหรับ release LP
- กำหนด policy "Buyback-on-Dip" เมื่อราคา AXX ร่วง >25% ภายใน 24h

**ผลลัพธ์:** ป้องกัน liquidity shock และช่วยรักษา trust ของตลาด  
**พารามิเตอร์ใหม่:**

```yaml
treasury:
  glp_min_reserve_pct: 15
  buyback_threshold_pct: -25
  buyback_cooldown_hr: 24
```

---

### 🛰️ 3.3 DeAI Sentinel v2 (Market Awareness)

**Subsystem:** Sentinel / DAO Alert  
**ฟังก์ชันใหม่:**

- เพิ่มโมเดล GNN วิเคราะห์ transaction graph (ตรวจ pump/spoof/wash trade)
- Risk class ใหม่: MarketIntegrity
- Threshold ใหม่: θ_market_auto = 0.80 (pre-freeze อัตโนมัติ)

**ผลลัพธ์:** เฝ้าระวังพฤติกรรมตลาดโดยอัตโนมัติ ก่อนเกิดวิกฤติราคา

---

### 🔐 3.4 Oracle Medianization & Sanity Check

**Subsystem:** Oracle / Treasury  
**ฟังก์ชันใหม่:**

- ดึงราคาจาก 3 แหล่ง: Chainlink, Pyth, axionax Internal Feed
- Median Aggregation + deviation guard (|ΔP| < 10%)
- ส่ง alert เข้า DAO ถ้า deviation เกิน 15%

**ผลลัพธ์:** ลดความเสี่ยงจาก oracle manipulation  
**พารามิเตอร์ใหม่:**

```yaml
oracle:
  sources: ['chainlink', 'pyth', 'axx-feed']
  median_guard_pct: 10
  deviation_alert_pct: 15
```

---

### ⚖️ 3.5 Governance & Transparency Upgrade

**Subsystem:** DAO Core  
**การเปลี่ยนแปลง:**

- เพิ่ม quorum vote จาก 15% → 25%
- เพิ่ม timelock 72h หลัง proposal ผ่าน
- เปิด public dashboard ผ่าน Grafana/Onchain data:
  - base_t
  - da_miss_rate
  - slash_rate
  - treasury_balance

**ผลลัพธ์:** โปร่งใสและปลอดภัยยิ่งขึ้น

---

## 4. Parameter Summary (Diff from v1.5)

| Parameter             | v1.5        | v1.6                    | หมายเหตุ                   |
| --------------------- | ----------- | ----------------------- | -------------------------- |
| base_t                | dynamic PID | dynamic PID (unchanged) | maintain auto-balance      |
| stable_ref            | —           | "USD"                   | เพิ่มใน Settlement         |
| price_window_sec      | —           | 600                     | window สำหรับ Oracle       |
| comp_threshold_pct    | —           | 10                      | ช่วงชดเชยราคา              |
| quorum_vote           | 15%         | 25%                     | ป้องกัน takeover           |
| timelock_hr           | 24          | 72                      | เพิ่มความปลอดภัย           |
| θ_market_auto         | —           | 0.80                    | threshold ใหม่ของ Sentinel |
| glp_min_reserve_pct   | —           | 15                      | DAO liquidity buffer       |
| buyback_threshold_pct | —           | -25                     | buyback trigger            |
| median_guard_pct      | —           | 10                      | oracle sanity bound        |

---

## 5. Expected Impact

| หมวด                    | ผลกระทบที่คาด    | คำอธิบาย                          |
| ----------------------- | ---------------- | --------------------------------- |
| ความยุติธรรมของผู้ทำงาน | 🟢 เพิ่มขึ้นมาก  | ได้รับค่าตอบแทนเทียบ USD เสมอ     |
| ความเสถียรของตลาด       | 🟢 เพิ่มขึ้น     | ลด shock จากราคาผันผวน            |
| ความน่าเชื่อถือของ DAO  | 🟢 เพิ่มขึ้น     | governance โปร่งใสและตรวจสอบได้   |
| ภาระระบบ                | 🟡 เพิ่มเล็กน้อย | เพิ่ม oracle และ settlement logic |
| ความเสี่ยงใหม่          | 🟢 ต่ำ           | มี Sentinel v2 คอยตรวจจับ         |

---

## 6. Rollout Plan

| ขั้นตอน               | รายละเอียด                            | สถานะ                            |
| --------------------- | ------------------------------------- | -------------------------------- |
| 1️⃣ Testnet simulation | ทดสอบ Escrow/Oracle median บน testnet | ✅ เสร็จสิ้น                     |
| 2️⃣ DAO Review         | เสนอร่างนี้เข้าสู่ vote AXN-UP-016    | ✅ ผ่านการอนุมัติ                |
| 3️⃣ Code Merge         | รวมใน branch v1.6-stability           | ✅ เสร็จสิ้น                     |
| 4️⃣ Security Audit     | ตรวจสอบ smart contract Escrow/Oracle  | ✅ เสร็จสิ้น (ส่วนหนึ่งของ v1.6) |
| 5️⃣ Activation         | เปิดใช้จริงใน v1.6                    | ✅ เสร็จสิ้น                     |

---

## 7. References

- AXX_RiskMitigation_v1.6.md
- axionax protocol — v1.0 (Implementation-Ready)
- DAO Governance Framework (v1.4)
- Sentinel Spec Sheet (internal)

---

**Maintainer:** axionax DAO Core  
**Contributors:** Tokenomics, Treasury, Sentinel, DevOps Teams  
**License:** CC-BY-SA 4.0
