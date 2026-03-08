# สถานะ Wallet / Private Key / Public Key

สรุปความพร้อมของการจัดการกระเป๋าและคีย์ในโปรเจกต์ (core only)

---

## สรุปภาพรวม

| ใช้กับ | Private key | Public key / Identity | พร้อมหรือไม่ |
|--------|-------------|------------------------|--------------|
| **Worker (DeAI)** | ✅ | ✅ (ที่อยู่จาก private) | **พร้อม** — wallet_manager.py + env/keystore |
| **Faucet** | ✅ | ✅ | **พร้อม** — generate-faucet-key.py |
| **Node (P2P identity)** | ✅ (libp2p keypair) | ✅ (PeerId) | **พร้อม** — รองรับ `--identity-key` แล้ว |

---

## 1. Worker (DeAI) — พร้อม

- **ที่อยู่:** `core/deai/wallet_manager.py`
- **รูปแบบคีย์:** EVM (eth_account), รองรับที่อยู่จาก private key
- **การเก็บ private key:**
  - **Option 1:** `WORKER_PRIVATE_KEY=0x...` (env) — เหมาะ production
  - **Option 2:** ไฟล์ keystore เข้ารหัส (AES-128-CTR + scrypt), ใช้กับ `WORKER_KEY_PASSWORD` หรือใส่รหัสตอนรัน
  - **Option 3:** สร้างกระเป๋าใหม่ → บันทึกเป็น keystore เข้ารหัส
- **ฟังก์ชัน:** โหลด/สร้าง, ถอดรหัส, sign message, sign transaction
- **ที่เก็บไฟล์:** กำหนดได้ (default `worker_key.json`), path ตั้งใน config หรือ env ได้

---

## 2. Faucet — พร้อม

- **สคริปต์:** `scripts/generate-faucet-key.py`
- **Testnet:** คีย์ deterministic จาก seed (ตรงกับที่ genesis ใช้)
- **Mainnet:** สุ่มด้วย `secrets.token_hex(32)`
- **Output:** แสดง address + private key; ใส่ใน genesis ด้วย `--faucet-address`; เก็บใน `.env` เป็น `FAUCET_PRIVATE_KEY` (ห้าม commit)

```bash
python scripts/generate-faucet-key.py              # mainnet (random)
python scripts/generate-faucet-key.py --testnet     # testnet (deterministic)
python scripts/generate-faucet-key.py --env         # เขียน .env.faucet.example
```

---

## 3. Node (Validator / Full node) — พร้อมหลังเพิ่ม `--identity-key`

- **P2P identity:** libp2p Ed25519 keypair → ได้ **PeerId** (ใช้เป็น “public identity” ของ node)
- **การเก็บ:** ไฟล์ binary (protobuf encoding) ที่ path ที่ส่งเข้า `--identity-key`
- **พฤติกรรม:**
  - **ไม่ส่ง `--identity-key`:** สร้างคีย์ในหน่วยความจำทุกครั้งที่รัน → PeerId เปลี่ยนทุก restart (เหมาะ full node ทั่วไป)
  - **ส่ง `--identity-key /path/to/key`:** โหลดจากไฟล์ หรือถ้าไม่มีจะ **สร้างแล้วบันทึก** ที่ path นั้น → PeerId คงที่ (เหมาะ validator)

**ตัวอย่าง (validator คง identity):**

```bash
./target/release/axionax-node --role full --chain-id 86137 \
  --rpc 0.0.0.0:8545 --state-path /var/lib/axionax-node \
  --identity-key /var/lib/axionax-node/identity.key
```

ครั้งแรกที่รันจะสร้างไฟล์ `identity.key`; ครั้งถัดไปจะโหลดคีย์เดิม → PeerId เหมือนเดิม

---

## 4. สิ่งที่ไม่มีใน repo นี้ (และไม่จำเป็นสำหรับ core)

- **คำสั่งแบบ “axionax-core keys generate”:** ในเอกสารบางจุดอ้างอิงคำสั่งนี้ แต่ใน repo นี้ไม่มี binary ชื่อ `axionax-core` ที่มี subcommand `keys generate`. การสร้างคีย์ทำผ่าน:
  - Worker: `WalletManager` (สร้างจาก Python)
  - Faucet: `generate-faucet-key.py`
  - Node: ส่ง `--identity-key` แล้วให้ node สร้างไฟล์ครั้งแรก
- **Wallet UI / dApp:** อยู่ repo อื่น (เช่น axionax-web-universe)

---

## 5. ความปลอดภัยที่ทำแล้ว

- ไม่มี private key แบบ plaintext ใน repo (มีแค่ deterministic faucet seed สำหรับ testnet)
- Worker: รองรับ keystore เข้ารหัส และ migration จาก plaintext ไป encrypted
- Node key file: สิทธิ์ 0o600 บน Unix
- เอกสารและ .env.example เน้นไม่ commit `.env` / `worker_key.json` / ไฟล์คีย์

---

## 6. Balance & Faucet (พร้อมสำหรับ UI)

- **Genesis:** ตอน node รันครั้งแรก (chain height = 0, chain_id 86137/86150) จะ seed ยอดจาก genesis (`seed_genesis_balances`) → ที่อยู่ faucet และ allocations อื่นๆ มี balance ทันที
- **RPC:** `eth_getBalance(address, block)` และ `eth_getTransactionCount(address, block)` ใช้ state จริง (ตาราง CHAIN_STATE: `bal_0x<addr>`, `nonce_0x<addr>`)
- **ส่ง TX:** เมื่อ RPC รับ `send_raw_transaction` จะเพิ่ม tx เข้า mempool และ **apply ทันที** ไปที่ state (หัก balance ผู้ส่ง, เพิ่ม balance ผู้รับ, เพิ่ม nonce) — ในโหมด single-node/testnet ไม่ต้องรอ block producer จึง **หน้าเว็บ UI แสดง balance หลัง airdrop ได้ทันที**
- **Faucet:** ใช้ `FAUCET_PRIVATE_KEY` ที่ตรงกับ genesis faucet address → มี balance จาก genesis; airdrop = ส่ง raw tx ไปที่ RPC → state อัปเดต → UI เรียก `eth_getBalance` ได้ยอดใหม่

**สรุป:** Flow กระเป๋า → genesis balance → faucet airdrop → แสดงใน UI **ครบและใช้งานได้แล้ว**

---

**สรุป:** เรื่องกระเป๋า (wallet), private key และ public key / identity **พร้อมสำหรับ Worker, Faucet และ Node (รวม validator)** ภายในขอบเขตของ repo core นี้แล้ว
