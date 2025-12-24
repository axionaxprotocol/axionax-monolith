# Axionax RPC API Reference
# คู่มือ API สำหรับ Axionax Protocol

## Overview / ภาพรวม

Axionax Protocol ใช้ **JSON-RPC 2.0** เป็น API หลักสำหรับการเชื่อมต่อกับ blockchain

**URL:** `http://your-node:8545`

---

## 🔗 Ethereum-Compatible (eth_*)
## เมธอดที่เข้ากันได้กับ Ethereum

| Method | คำอธิบาย | Params |
|--------|----------|--------|
| `eth_blockNumber` | ดึงหมายเลข block ล่าสุด | ไม่มี |
| `eth_getBlockByNumber` | ดึงข้อมูล block ตามหมายเลข | `blockNumber`, `fullTx` |
| `eth_getBlockByHash` | ดึงข้อมูล block ตาม hash | `blockHash`, `fullTx` |
| `eth_getTransactionByHash` | ดึงข้อมูล transaction | `txHash` |
| `eth_chainId` | Chain ID (hex) | ไม่มี |
| `net_version` | Chain ID (decimal) | ไม่มี |
| `eth_sendRawTransaction` | ส่ง transaction | `txHex` |

---

## 💰 Staking (staking_*)
## ระบบ Staking - การวาง stake เพื่อเป็น Validator

| Method | คำอธิบาย | Params |
|--------|----------|--------|
| `staking_getValidator` | ดึงข้อมูล validator | `address` |
| `staking_getActiveValidators` | รายชื่อ validator ที่ active | ไม่มี |
| `staking_getTotalStaked` | จำนวน token ที่ stake ทั้งหมด | ไม่มี |
| `staking_getStats` | สถิติระบบ staking | ไม่มี |
| `staking_stake` | วาง stake เพื่อเป็น validator | `address`, `amount` |
| `staking_unstake` | เริ่มถอน stake (ต้องรอ 21 วัน) | `address`, `amount` |
| `staking_delegate` | มอบ stake ให้ validator อื่น | `delegator`, `validator`, `amount` |
| `staking_claimRewards` | รับ rewards ที่สะสม | `address` |

### ตัวอย่าง: ดึงข้อมูล Validator

**Request (คำขอ):**
```json
{
  "jsonrpc": "2.0",
  "method": "staking_getValidator",
  "params": ["0x1234567890123456789012345678901234567890"],
  "id": 1
}
```

**Response (การตอบกลับ):**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "address": "0x1234...",
    "stake": "0x8ac7230489e80000",       // จำนวนที่ stake เอง
    "delegated": "0x0",                   // จำนวนที่ได้รับ delegate
    "voting_power": "0x8ac7230489e80000", // พลังเสียงรวม (stake + delegated)
    "is_active": true,                    // สถานะ active
    "commission_bps": 500,                // ค่าคอมมิชชั่น 5%
    "total_rewards": "0x0",               // rewards ทั้งหมดที่เคยได้
    "unclaimed_rewards": "0x0"            // rewards ที่ยังไม่ได้รับ
  },
  "id": 1
}
```

---

## 🏛️ Governance (gov_*)
## ระบบ Governance - การลงมติบน Blockchain

| Method | คำอธิบาย | Params |
|--------|----------|--------|
| `gov_getProposal` | ดึงข้อมูล proposal | `proposalId` |
| `gov_getActiveProposals` | รายการ proposal ที่กำลังเปิด vote | ไม่มี |
| `gov_getStats` | ค่า config และสถิติ governance | ไม่มี |
| `gov_createProposal` | สร้าง proposal ใหม่ | `proposer`, `stake`, `title`, `desc`, `type` |
| `gov_vote` | ลงคะแนนเสียง | `voter`, `proposalId`, `vote`, `weight` |
| `gov_getVote` | ตรวจสอบคะแนนที่ลง | `proposalId`, `voter` |
| `gov_finalizeProposal` | สรุปผลหลังหมดเวลา vote | `proposalId`, `totalStaked` |
| `gov_executeProposal` | Execute proposal ที่ผ่าน | `proposalId` |

### ประเภท Proposal (Proposal Types)

| Type | รูปแบบ | คำอธิบาย |
|------|--------|----------|
| Text | `text` | ข้อเสนอทั่วไป ไม่มีผลต่อ chain |
| Parameter | `parameter:key=value` | เปลี่ยนค่า config ของ chain |
| Treasury | `treasury:recipient:amount` | เบิกเงินจาก treasury |
| Upgrade | `upgrade:version` | อัพเกรด protocol |

### ตัวเลือกการ Vote

| Vote | ค่าที่ใช้ได้ |
|------|------------|
| เห็นด้วย | `for`, `yes`, `1` |
| ไม่เห็นด้วย | `against`, `no`, `0` |
| งดออกเสียง | `abstain`, `2` |

### ตัวอย่าง: สร้าง Proposal

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "gov_createProposal",
  "params": [
    "0x1234...proposer_address",          // ที่อยู่ผู้เสนอ
    "0x152d02c7e14af6800000",             // stake ขั้นต่ำ (100,000 AXX)
    "เพิ่ม Base Fee",                      // หัวข้อ
    "เสนอให้เพิ่ม base fee เพื่อลด spam",   // รายละเอียด
    "parameter:base_fee=2000000000"        // ประเภท: เปลี่ยน parameter
  ],
  "id": 1
}
```

### ตัวอย่าง: ลงคะแนน

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "gov_vote",
  "params": [
    "0xvoter_address",        // ที่อยู่ผู้ vote
    1,                        // proposal ID
    "for",                    // เห็นด้วย
    "0x8ac7230489e80000"      // น้ำหนักเสียง = จำนวน stake
  ],
  "id": 1
}
```

---

## ⚙️ Configuration / ค่า Config

### Staking Parameters

| Parameter | ค่าเริ่มต้น | คำอธิบาย |
|-----------|------------|----------|
| `min_validator_stake` | 10,000 AXX | stake ขั้นต่ำเพื่อเป็น validator |
| `min_delegation` | 100 AXX | จำนวนขั้นต่ำที่ delegate ได้ |
| `unstaking_lock_blocks` | 725,760 | ระยะเวลา lock หลัง unstake (~21 วัน) |
| `epoch_reward_rate_bps` | 50 | อัตรา reward 0.5% ต่อ epoch |
| `max_slash_rate_bps` | 5,000 | อัตรา slash สูงสุด 50% |

### Governance Parameters

| Parameter | ค่าเริ่มต้น | คำอธิบาย |
|-----------|------------|----------|
| `min_proposal_stake` | 100,000 AXX | stake ขั้นต่ำเพื่อสร้าง proposal |
| `voting_period_blocks` | 241,920 | ระยะเวลา vote (~7 วัน) |
| `execution_delay_blocks` | 69,120 | รอหลัง vote ผ่าน (~2 วัน) |
| `quorum_bps` | 3,000 | ต้องมีคน vote อย่างน้อย 30% |
| `pass_threshold_bps` | 5,000 | ต้องได้ "เห็นด้วย" มากกว่า 50% |

---

## ❌ Error Codes / รหัสข้อผิดพลาด

| Code | คำอธิบาย |
|------|----------|
| -32000 | Staking/Governance error - ข้อผิดพลาดจากระบบ |
| -32001 | Block not found - ไม่พบ block |
| -32002 | Transaction not found - ไม่พบ transaction |
| -32602 | Invalid parameters - พารามิเตอร์ไม่ถูกต้อง |
| -32603 | Internal error - ข้อผิดพลาดภายใน |

---

## 📚 ตัวอย่างการใช้งาน

### JavaScript (ethers.js style)

```javascript
// ดึงข้อมูล validator
const response = await fetch('http://localhost:8545', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'staking_getActiveValidators',
    params: [],
    id: 1
  })
});

const { result } = await response.json();
console.log('Active validators:', result.length);
```

### cURL

```bash
# ดึง active proposals
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"gov_getActiveProposals","params":[],"id":1}'
```
