# เพิ่มเครือข่าย Axionax และเหรียญ AXX ใน MetaMask และวอลเล็ตอื่นๆ

คู่มือเพิ่ม **Axionax Testnet** และเหรียญ **AXX** ใน MetaMask, Rabby, Coinbase Wallet ฯลฯ

**คู่มือฉบับเต็ม (ภาษาไทย + ปุ่ม Add Token จากเว็บ):** [axionax-web-universe → Add Token to MetaMask](https://github.com/axionaxprotocol/axionax-web-universe/blob/main/apps/docs/ADD_TOKEN_TO_METAMASK.md)

---

## ข้อมูลเครือข่าย (Testnet)

| รายการ | ค่า |
|--------|-----|
| **Network name** | Axionax Testnet |
| **RPC URL** | `https://testnet-rpc.axionax.org` หรือ `http://217.76.61.116:8545` / `http://46.250.244.4:8545` |
| **Chain ID** | `86137` |
| **Currency symbol** | AXX |
| **Decimals** | 18 |
| **Block explorer** | https://explorer.axionax.org |

---

## 1. MetaMask

### ขั้นตอนเพิ่มเครือข่าย (Custom Network)

1. เปิด **MetaMask** → คลิก dropdown เครือข่าย (ด้านบน) → **Add network** หรือ **Add a network manually**
2. กรอกค่าดังนี้:

   | ช่อง | กรอก |
   |-----|------|
   | **Network name** | `Axionax Testnet` |
   | **RPC URL** | `http://217.76.61.116:8545` |
   | **Chain ID** | `86137` |
   | **Currency symbol** | `AXX` |
   | **Block explorer URL** | ว่างไว้ได้ (หรือใส่เมื่อมี explorer) |

3. กด **Save** แล้วสลับมาใช้เครือข่าย **Axionax Testnet**

เมื่อเพิ่มเครือข่ายแล้ว **เหรียญ AXX (native)** จะแสดงในกระเป๋าอัตโนมัติ ไม่ต้อง “Import token” แยก (เพราะเป็น native token ของ chain นี้)

### ถ้าต้องการเพิ่มโทเคนแบบ ERC-20 (มี contract แยก)

ถ้ามีสัญญา ERC-20 อื่น (เช่น โทเคนทดสอบ) ที่ต้องการให้ MetaMask แสดง:

1. อยู่ที่เครือข่าย **Axionax Testnet**
2. ด้านล่างกด **Import tokens** (หรือ **Add token**)
3. ใส่ **Token contract address** ที่ได้จากทีม/เอกสาร
4. MetaMask จะดึง **Token symbol** และ **Decimals** ให้อัตโนมัติ (ถ้า contract มาตรฐาน) — หรือใส่เอง: Symbol เช่น `TEST`, Decimals `18`
5. กด **Add custom token**

---

## 2. วอลเล็ตอื่นๆ (Rabby, Coinbase Wallet, Frame ฯลฯ)

แนวทางเหมือน MetaMask: เพิ่ม **Custom network / Custom RPC** ด้วยค่าข้างบน

- **Rabby:** Settings → Network → Add a custom network  
- **Coinbase Wallet:** Settings → Networks → Add custom network  
- **Frame:** Settings → Networks → Add network  
- **WalletConnect-compatible:** ส่วนใหญ่มี “Add network” / “Custom RPC” — ใช้ค่าเดียวกัน

| ช่อง | ค่า |
|-----|-----|
| Network name | Axionax Testnet |
| RPC URL | `http://217.76.61.116:8545` |
| Chain ID | `86137` |
| Symbol | AXX |

เหรียญ **AXX (native)** จะแสดงเมื่อเลือกเครือข่ายนี้โดยไม่ต้อง import โทเคนเพิ่ม

---

## 3. รับ AXX Testnet (Claim จาก Faucet)

ยอด 0 AXX แก้ได้โดย **รับจาก Faucet** เท่านั้น (ปุ่ม "Add funds" ใน MetaMask ใช้สำหรับซื้อด้วย fiat ไม่ใช่รับ testnet)

### วิธีที่ 1: ใช้ Faucet เว็บ (แนะนำ)

1. เปิด **Faucet อย่างเป็นทางการ** (จาก [axionax-web-universe](https://github.com/axionaxprotocol/axionax-web-universe)):
   - **https://faucet.axionax.org**
   - หรือ [axionax.org](https://axionax.org) แล้วหาลิงก์ Faucet / Get testnet AXX
   - (ทางเลือก) **https://testnet-faucet.axionax.org** ถ้ามีเปิดไว้
2. **Copy ที่อยู่กระเป๋า** จาก MetaMask (คลิก "Account 1" หรือที่อยู่ด้านบน → Copy)
3. วางที่อยู่ในช่องที่หน้า Faucet → กด Request / Claim
4. รอสักครู่ (มักได้ 100 AXX ต่อครั้ง, cooldown 24 ชม. ต่อที่อยู่)

### วิธีที่ 2: เรียก Faucet ผ่าน API (ถ้ามี Faucet รันอยู่)

ถ้ามี Faucet รันที่ URL เดียวกัน (เช่น `https://testnet-faucet.axionax.org` หรือ `http://YOUR_FAUCET_IP:3002`):

```bash
# แทน 0xYOUR_METAMASK_ADDRESS ด้วยที่อยู่จาก MetaMask
curl -X POST https://testnet-faucet.axionax.org/request \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYOUR_METAMASK_ADDRESS"}'
```

หรือถ้ารัน Faucet ในเครื่องเอง (พอร์ต 3002):

```bash
curl -X POST http://localhost:3002/request \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYOUR_METAMASK_ADDRESS"}'
```

ตอบสำเร็จจะได้ `"success": true` และ `tx_hash` — หลังจากนั้นยอด AXX ใน MetaMask จะอัปเดต (อาจต้องรอไม่กี่วินาที หรือ refresh)

### ถ้า claim ไม่ได้ / ยังไม่ได้เหรียญ

| สาเหตุ | วิธีแก้ |
|--------|--------|
| **Faucet เว็บยังไม่เปิดหรือลิงก์เปลี่ยน** | ดูที่ [axionax.org](https://axionax.org) หรือ Discord/GitHub ว่าลิงก์ Faucet ปัจจุบันคืออะไร |
| **ใส่ที่อยู่ผิด** | ต้องเป็นรูปแบบ EVM: `0x` + ตัว hex 40 ตัว (รวมแล้ว 42 ตัวอักษร) — copy จาก MetaMask โดยตรง |
| **Cooldown 24 ชม.** | Faucet จำกัด 1 ครั้งต่อที่อยู่ต่อ 24 ชม. — รอหรือใช้ที่อยู่กระเป๋าอื่น |
| **Faucet ยอดหมด** | ติดต่อทีม/ชุมชนให้เติม Faucet |
| **RPC ไม่ตรงกับที่ Faucet ใช้** | MetaMask ต้องใช้เครือข่าย **Axionax Testnet** (Chain ID 86137) และ RPC ที่ทีมระบุ (เช่น `http://217.76.61.116:8545`) |

---

## 4. สรุป

| ต้องการ | วิธี |
|--------|------|
| **เห็นเหรียญ AXX ใน MetaMask/วอลเล็ต** | เพิ่มเครือข่าย Axionax Testnet (RPC + Chain ID 86137 + สัญลักษณ์ AXX) → native AXX จะแสดงเอง |
| **เห็นโทเคน ERC-20 อื่น** | อยู่ที่เครือข่าย Axionax Testnet → Import token ด้วย contract address |
| **Mainnet (อนาคต)** | Chain ID จะเป็น `86150` — วิธีเพิ่มเครือข่ายเหมือนกัน แค่เปลี่ยน Chain ID และ RPC ตามที่ประกาศ |

---

*อัปเดตจาก README และ genesis: Chain ID 86137, สัญลักษณ์ AXX, decimals 18*
