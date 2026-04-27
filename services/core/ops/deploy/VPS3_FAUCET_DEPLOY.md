# Deploy Testnet Faucet on VPS3

ใช้เมื่อต้องการรัน **Faucet สำหรับ chain 86137** บน VPS3 (217.216.109.5) โดยชี้ RPC ไป VPS1

---

## 1. สิ่งที่ต้องมีบน VPS3

- Docker + Docker Compose
- Nginx (มีอยู่แล้วจาก check-vps3)
- `FAUCET_PRIVATE_KEY` ที่ตรงกับ address ใน genesis (มี AXX จาก allocation)

---

## 2. หา Faucet Private Key (ถ้าใช้ default จาก create_genesis.py)

Genesis ใช้ address จาก key ที่ได้จาก seed นี้:

```bash
python3 -c "import hashlib; print(hashlib.sha256(b'axionax_faucet_mainnet_q2_2026').hexdigest())"
```

ได้ค่า hex 64 ตัว (ไม่มี `0x`) — ใช้เป็น `FAUCET_PRIVATE_KEY`

---

## 3. Deploy Faucet

**จากเครื่องคุณ (สร้างโฟลเดอร์ให้ก่อนแล้วส่งไฟล์ไป VPS3):**

```powershell
ssh root@217.216.109.5 "mkdir -p /root/axionax-core-universe/ops/deploy/scripts"
scp ops\deploy\docker-compose.vps3-faucet.yml root@217.216.109.5:/root/axionax-core-universe/ops/deploy/
scp ops\deploy\scripts\deploy-faucet-vps3.sh root@217.216.109.5:/root/axionax-core-universe/ops/deploy/scripts/
scp ops\deploy\env.vps3-faucet.example root@217.216.109.5:/root/axionax-core-universe/ops/deploy/
```

**บน VPS3 (SSH เข้าไปแล้ว):**

```bash
cd /root/axionax-core-universe/ops/deploy

# สร้าง .env.vps3-faucet และใส่ FAUCET_PRIVATE_KEY
cp env.vps3-faucet.example .env.vps3-faucet
nano .env.vps3-faucet   # ใส่ FAUCET_PRIVATE_KEY=<hex จากขั้น 2>

# รัน deploy
bash scripts/deploy-faucet-vps3.sh
```

หรือถ้า repo ยังไม่มีบน VPS3 — copy แค่ 2 ไฟล์ไปรันที่ไหนก็ได้:

```bash
mkdir -p /opt/axionax-faucet && cd /opt/axionax-faucet
# วาง docker-compose.vps3-faucet.yml ตรงนี้
echo 'FAUCET_PRIVATE_KEY=<hex_key>' > .env.vps3-faucet
docker compose -f docker-compose.vps3-faucet.yml --env-file .env.vps3-faucet up -d
```

---

## 4. ตรวจว่า Faucet ทำงาน

```bash
curl -s http://127.0.0.1:3002/health
curl -s http://127.0.0.1:3002/info
```

---

## 5. Nginx (ให้ faucet.axionax.org ชี้มาที่ Faucet)

ถ้า Nginx รันบน host (ไม่ใช่ใน Docker) และ Faucet รันใน container ที่ bind port 3002:

- ใช้ `proxy_pass http://127.0.0.1:3002` (ไม่ใช้ `http://faucet:3002`)
- ตัวอย่าง config: `ops/deploy/nginx/conf.d/faucet-vps3.conf.example`
- ตั้ง DNS: faucet.axionax.org → 217.216.109.5
- ออก SSL: `certbot --nginx -d faucet.axionax.org`

---

## 6. ทดสอบขอ AXX

```bash
curl -X POST http://127.0.0.1:3002/request \
  -H "Content-Type: application/json" \
  -d '{"address":"0xYOUR_WALLET_ADDRESS"}'
```

จากนั้นเช็ก balance ผ่าน RPC (eth_getBalance)
