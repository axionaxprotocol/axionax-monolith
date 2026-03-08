# การเชื่อมต่อระหว่าง Local Full Node, VPS Validator และ Frontend

สรุปว่า **Local full node**, **VPS Validator node** และ **Frontend (เว็บ/เว็บไซต์)** เชื่อมต่อกันอย่างไร และต้องตั้งค่าอะไรบ้าง

---

## ภาพรวม

| ส่วน | ที่อยู่ / URL | เชื่อมกับ |
|------|----------------|----------|
| **VPS Validator #1** | 217.76.61.116 (EU), RPC :8545, P2P :30303 | Validator #2 (P2P), Client (RPC) |
| **VPS Validator #2** | 46.250.244.4 (AU), RPC :8545, P2P :30303 | Validator #1 (P2P), Client (RPC) |
| **DNS (ถ้าเปิด)** | rpc.axionax.org, faucet.axionax.org, explorer.axionax.org | ชี้ไป VPS ที่รัน service นั้น |
| **Frontend (axionax-web-universe)** | เว็บโฮสต์ที่ axionax.org / Vercel / VPS | ใช้ RPC ผ่าน URL ที่ตั้งใน env |
| **Local full node** | เครื่องคุณ (รัน node เอง) | เลือกได้: ชี้ไป Public Testnet หรือรัน chain เอง |

---

## 1. Public Testnet (VPS Validators + Frontend)

### การเชื่อมต่อที่ออกแบบไว้

```
[ผู้ใช้] → [axionax.org / เว็บ] → RPC (rpc.axionax.org หรือ IP:8545)
                    ↓
            [VPS Validator #1 หรือ #2]
                    ↓
            Chain ID 86137, state เดียวกัน
```

- **Validator ทั้งสองตัว** รัน chain เดียวกัน (Genesis เดียว, Chain ID 86137) และ sync กันผ่าน P2P (พอร์ต 30303).
- **Frontend (เว็บ)** ต้องใช้ **RPC URL** ที่ชี้ไปที่ node ของ chain นี้ จึงจะ “เชื่อมต่อ” กับ testnet จริง:
  - ถ้ามี DNS: `NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org` (หรือ `https://testnet-rpc.axionax.org`)
  - หรือชี้ตรงไปที่ IP: `http://217.76.61.116:8545` / `http://46.250.244.4:8545`
- **Faucet** ต้องใช้ `RPC_URL` ชี้ไปที่ RPC ของ chain เดียวกัน (Validator หรือ RPC node ที่ sync กับ Validator) ถึงจะแจก AXX บน chain ที่เว็บใช้

### สิ่งที่ต้องทำถึงจะ “เชื่อมต่อครบ”

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| VPS Validator รัน node + เปิดพอร์ต 8545, 30303 | ตาม README / VPS_VALIDATOR_UPDATE | ต้องรันและ firewall เปิด |
| DNS: rpc.axionax.org → IP ของ RPC | ต้องตั้งบน DNS | ถ้าไม่มี DNS ใช้ IP โดยตรงใน Frontend |
| DNS: faucet.axionax.org → IP ของเครื่องที่รัน Faucet | ต้องตั้งบน DNS | Faucet ต้องตั้ง RPC_URL ชี้ไป chain 86137 |
| Frontend (web-universe) env: NEXT_PUBLIC_RPC_URL | ต้องตั้งในเว็บที่โฮสต์ | ใช้ rpc.axionax.org หรือ http://217.76.61.116:8545 |
| Faucet รันและ RPC_URL ชี้ไป Validator/RPC | ต้องตั้งบนเครื่องที่รัน Faucet | ดู ops/deploy, Dockerfile.faucet |

สรุป: **เชื่อมต่อกันได้ก็ต่อเมื่อ** (1) Validator รันและเปิด RPC (2) Frontend ใช้ RPC URL ของ chain นี้ (3) Faucet ใช้ RPC เดียวกัน และถ้าใช้โดเมน ต้องมี DNS ชี้ถูก

---

## 2. Local Full Node

### ตัวเลือก A: ต่อกับ Public Testnet (เชื่อมกับ Validator)

- รัน full node ในเครื่องคุณ โดยให้ **bootstrap / RPC ชี้ไป Validator** จะได้ sync กับ chain เดียวกับ VPS และ frontend:
  - ใช้ env: `AXIONAX_BOOTSTRAP_NODES=/ip4/217.76.61.116/tcp/30303/p2p/<PEER_ID>` (ต้องมี Peer ID จริงจาก Validator)  
  - หรือไม่ sync P2P แค่ใช้ RPC ของ Validator เป็น “remote RPC” จากแอป/สคริปต์ก็ได้
- ถ้าใช้ RPC ของ Validator โดยตรง (เช่น `http://217.76.61.116:8545`) แปลว่า **Local full node ไม่จำเป็นต้องรัน** สำหรับแค่เชื่อม frontend/faucet; รันเมื่อต้องการ sync chain ไว้ในเครื่อง

### ตัวเลือก B: รัน Chain แยก (ไม่เชื่อม Public Testnet)

- รัน node แบบ standalone (ไม่ใส่ bootstrap หรือใช้ genesis อื่น / chain_id อื่น) จะได้ **chain แยกในเครื่อง**:
  - Frontend ถ้ารัน local และตั้ง `NEXT_PUBLIC_RPC_URL=http://localhost:8545` จะเชื่อมกับ chain นี้ ไม่ใช่กับ VPS Validator
  - ใช้ได้สำหรับ dev เท่านั้น

---

## 3. Frontend (เว็บโฮสต์ – axionax-web-universe)

- เว็บที่โฮสต์ (axionax.org หรือที่อื่น) อ่าน **RPC URL จาก env** (เช่น `NEXT_PUBLIC_RPC_URL`, `VITE_RPC_URL`):
  - ถ้าใส่ `https://rpc.axionax.org` หรือ `http://217.76.61.116:8545` → เชื่อมกับ **Public Testnet (Validator)**
  - ถ้าใส่ `http://localhost:8545` → เชื่อมกับ **node ในเครื่อง (local chain หรือ local node ที่ sync testnet)**
- ดังนั้น **frontend “เชื่อมต่อ” กับ chain ไหน ขึ้นกับค่า RPC URL ที่ใช้ตอน build/รัน** ไม่ได้ขึ้นกับว่า Validator อยู่ที่ไหน โดยตรง

---

## 4. สรุปคำตอบ: “ทั้งหมดเชื่อมต่อกันหรือยัง”

| คู่ที่ถาม | เชื่อมต่อกันหรือไม่ | เงื่อนไข |
|-----------|----------------------|----------|
| **VPS Validator #1 ↔ #2** | ได้ | เปิด P2P 30303 ระหว่างกัน, genesis + chain_id ตรงกัน |
| **Frontend ↔ Public Testnet** | ได้ | ตั้ง NEXT_PUBLIC_RPC_URL (หรือเทียบเท่า) ให้ชี้ไป RPC ของ Validator (หรือ rpc.axionax.org ถ้า DNS ชี้ไปที่นั้น) |
| **Faucet ↔ Public Testnet** | ได้ | รัน Faucet และตั้ง RPC_URL ไปที่ RPC ของ chain 86137 (Validator/RPC node) |
| **Local full node ↔ Public Testnet** | ได้ | ตั้ง bootstrap/RPC ชี้ไป Validator และใช้ genesis/chain_id เดียวกัน |
| **Frontend โฮสต์ ↔ Local full node** | ได้ | ตั้ง RPC URL ใน frontend เป็นที่อยู่ของ local node (เช่น http://localhost:8545 หรือ IP:8545) |

**โดยรวม:**  
- **ถ้า DNS (rpc.axionax.org, faucet.axionax.org) ชี้ไปที่ VPS ที่รัน service จริง และ Frontend ใช้ URL เหล่านั้น** → Local full node (ถ้ารันและ sync กับ Validator), VPS Validator และ Frontend โฮสต์ ใช้ **chain เดียวกัน** จึงถือว่า “เชื่อมต่อกัน” ในระดับข้อมูล chain  
- **ถ้า DNS ยังไม่ตั้ง หรือ Frontend ยังชี้ RPC ไปที่อื่น** → ต้องไปตั้ง DNS และ env ตามตารางด้านบนถึงจะครบ

---

## 5. ตรวจสอบแบบเร็ว

```bash
# RPC ของ Public Testnet ใช้ได้หรือไม่
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://217.76.61.116:8545
# คาดว่าได้ "0x15079" (86137)

# ถ้ามี DNS
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://rpc.axionax.org
```

สคริปต์ตรวจสอบแบบเต็ม: `ops/deploy/scripts/verify-launch-ready.sh` (เช็ค DNS, RPC, Explorer, Faucet)
