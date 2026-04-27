# axionax Core - Testnet Testing Guide

วันที่: 22 ตุลาคม 2025

## 🎯 วิธีการทดสอบ Testnet

มี 2 วิธีในการทดสอบ axionax Core:

---

## วิธีที่ 1: Full Testnet (แนะนำ) ✨

### เตรียมความพร้อม

**1. เปิด Docker Desktop**

- กด Windows Key → พิมพ์ "Docker Desktop"
- เปิดโปรแกรม
- รอให้ไอคอนใน system tray เปลี่ยนเป็นสีเขียว (พร้อมใช้งาน)

**2. ตรวจสอบ Docker**

```powershell
docker --version
docker ps
```

ผลลัพธ์ที่ถูกต้อง:

```
Docker version 24.x.x
CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
```

### เริ่ม Testnet

```powershell
# 1. ไปยังโฟลเดอร์ Testnet
cd axionax_v1.5_Testnet_in_a_Box

# 2. เริ่ม services ทั้งหมด
docker compose up -d

# 3. ตรวจสอบว่า services ทำงาน
docker compose ps
```

**Services ที่ควรเห็น:**

- ✅ `hardhat` - Anvil RPC (Port 8545)
- ✅ `blockscout` - Explorer (Port 4000-4001)
- ✅ `faucet` - Token Faucet (Port 8080-8081)
- ✅ `reverse-proxy` - Nginx (Port 80, 443)

### ทดสอบ Endpoints

**1. ทดสอบ RPC:**

```powershell
# ตรวจสอบ Chain ID
curl -X POST http://localhost:8545 `
  -H "Content-Type: application/json" `
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

ผลลัพธ์ที่คาดหวัง:

```json
{ "jsonrpc": "2.0", "result": "0x7a69", "id": 1 }
```

(0x7a69 = 31337 ในเลขฐาน 10)

**2. เปิด Blockscout Explorer:**

```
http://localhost:4001
```

**3. เปิด Faucet Web UI:**

```
http://localhost:8080
```

### รัน axionax Node

```powershell
# กลับไปโฟลเดอร์หลัก
cd ..

# เริ่ม node (เชื่อมต่อกับ Anvil)
.\build\axionax-core.exe start --network testnet
```

คุณจะเห็น:

```
🚀 Starting axionax Core v1.5.0-testnet
📂 Data directory: .axionax
🌐 Network: testnet
🔌 RPC address: 127.0.0.1:8545

✅ Node started successfully!
📡 RPC endpoint: 127.0.0.1:8545
🔗 Chain ID: 31337

Press Ctrl+C to stop...
```

---

## วิธีที่ 2: Demo Mode (ไม่ต้องใช้ Docker) 🎮

ทดสอบ CLI และ features โดยไม่ต้องเชื่อมต่อกับ blockchain จริง

### 1. ทดสอบ Configuration

```powershell
# สร้าง config
.\build\axionax-core.exe config init

# แสดง config ปัจจุบัน
.\build\axionax-core.exe config show
```

**ผลลัพธ์:**

```
📋 Current Configuration:
  Chain ID: 31337
  Network: testnet
  Data Dir: .axionax
  PoPC Sample Size: 1000
  ASR Top K: 64
```

### 2. ทดสอบ Key Management

```powershell
# สร้าง validator key
.\build\axionax-core.exe keys generate --type validator

# สร้าง worker key
.\build\axionax-core.exe keys generate --type worker

# แสดงรายการ keys
.\build\axionax-core.exe keys list
```

### 3. ทดสอบ Validator Commands

```powershell
# ดูสถานะ validator (mock data)
.\build\axionax-core.exe validator status

# จำลอง validator start
.\build\axionax-core.exe validator start
```

**ผลลัพธ์:**

```
🏛️  Starting validator node...
✅ Validator started successfully!
📊 PoPC validation enabled
```

### 4. ทดสอบ Worker Commands

```powershell
# สร้างไฟล์ worker specs
$specs = @"
{
  "gpus": [{
    "model": "NVIDIA RTX 4090",
    "vram": 24,
    "count": 1
  }],
  "cpu_cores": 16,
  "ram": 64,
  "storage": 1000,
  "bandwidth": 1000,
  "region": "us-west"
}
"@
$specs | Out-File -FilePath worker-specs.json -Encoding UTF8

# Register worker
.\build\axionax-core.exe worker register --specs worker-specs.json

# Check worker status
.\build\axionax-core.exe worker status
```

**ผลลัพธ์:**

```
📊 Worker Status:
  Status: Active
  Jobs Completed: 567
  Success Rate: 99.5%
  Current Quota: 8.2%
```

### 5. ทดสอบ Staking Commands

```powershell
# Check balance
.\build\axionax-core.exe stake balance

# Deposit stake (mock)
.\build\axionax-core.exe stake deposit 10000 --address 0x1234...

# Withdraw stake
.\build\axionax-core.exe stake withdraw 5000
```

---

## 🔬 การทดสอบ Advanced Features

### ทดสอบ PoPC (Demo Mode)

```powershell
# แสดงข้อมูล PoPC configuration
.\build\axionax-core.exe config show
```

ดู:

- Sample Size: จำนวนตัวอย่างที่ใช้ validate (1000)
- Fraud Window: เวลาที่เปิดให้รายงานการโกง

### ทดสอบ ASR (Demo Mode)

```powershell
# Worker registration แสดงการทำงานของ ASR
.\build\axionax-core.exe worker register --specs worker-specs.json
```

ASR จะ:

- คำนวณ suitability score
- ประเมิน performance metrics
- ใช้ VRF สำหรับการเลือก

### ทดสอบ PPC (Demo Mode)

```powershell
# แสดง pricing information
.\build\axionax-core.exe config show
```

ดู PPC parameters:

- Target Utilization: 0.7 (70%)
- Target Queue Time: 60s
- Price Range: 0.001 - 10.0 AXX

---

## 📊 การทดสอบกับ Testnet จริง (เมื่อ Docker พร้อม)

### 1. ขอ Test Tokens จาก Faucet

**Option A: ใช้ Web UI**

1. เปิด http://localhost:8080
2. กรอก address ที่ต้องการ
3. กด "Request Tokens"

**Option B: ใช้ curl**

```powershell
# แทนที่ YOUR_ADDRESS ด้วย address จริง
curl -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" `
  "http://localhost:8081/request?address=0xYourAddress"
```

### 2. ตรวจสอบ Balance

```powershell
# ใช้ curl เรียก RPC
curl -X POST http://localhost:8545 `
  -H "Content-Type: application/json" `
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_getBalance",
    "params":["0xYourAddress", "latest"],
    "id":1
  }'
```

### 3. Submit Job (Custom API)

```powershell
$jobSpec = @"
{
  "jsonrpc": "2.0",
  "method": "axn_submitJob",
  "params": [{
    "specs": {
      "gpu": "NVIDIA RTX 4090",
      "vram": 24,
      "framework": "PyTorch",
      "region": "us-west"
    },
    "sla": {
      "max_latency": "30s",
      "max_retries": 3,
      "timeout": "300s",
      "required_uptime": 0.99
    }
  }],
  "id": 1
}
"@

curl -X POST http://localhost:8545 `
  -H "Content-Type: application/json" `
  -d $jobSpec
```

### 4. ตรวจสอบ Job Status

```powershell
curl -X POST http://localhost:8545 `
  -H "Content-Type: application/json" `
  -d '{
    "jsonrpc":"2.0",
    "method":"axn_getJobStatus",
    "params":["job_abc123"],
    "id":1
  }'
```

### 5. ดู Transactions บน Explorer

เปิด Blockscout:

```
http://localhost:4001
```

---

## 🛠️ Troubleshooting

### Docker ไม่ทำงาน

**Problem:** `The system cannot find the file specified`

**Solution:**

1. เปิด Docker Desktop
2. รอให้ Docker Engine start (ดูที่ system tray)
3. ทดสอบ: `docker ps`

### Port ถูกใช้งานแล้ว

**Problem:** `port is already allocated`

**Solution:**

```powershell
# หา process ที่ใช้ port 8545
netstat -ano | findstr :8545

# Kill process (ใช้ PID จากคำสั่งข้างบน)
taskkill /PID <PID> /F

# Restart testnet
docker compose restart
```

### ไม่สามารถเชื่อมต่อ RPC

**Problem:** Connection refused

**Solution:**

```powershell
# ตรวจสอบว่า hardhat ทำงาน
docker compose ps hardhat

# ดู logs
docker compose logs hardhat

# Restart
docker compose restart hardhat
```

### Blockscout ไม่แสดงข้อมูล

**Problem:** No blocks shown

**Solution:**

```powershell
# Restart blockscout
docker compose restart blockscout

# ตรวจสอบ logs
docker compose logs blockscout
```

---

## 📚 ขั้นตอนต่อไป

1. **อ่านเอกสาร:**
   - `QUICKSTART.md` - Quick start guide
   - `docs/API_REFERENCE.md` - API documentation
   - `docs/TESTNET_INTEGRATION.md` - Testnet integration

2. **ทดสอบ Features:**
   - PoPC validation
   - ASR worker selection
   - PPC dynamic pricing

3. **พัฒนา Applications:**
   - สร้าง worker node
   - Submit compute jobs
   - Build monitoring tools

---

## 🆘 ต้องการความช่วยเหลือ?

- **Documentation:** https://docs.axionax.org
- **GitHub:** https://github.com/axionaxprotocol/axionax-core
- **Discord:** https://discord.gg/axionax

---

**Happy Testing! 🚀**

Last updated: October 22, 2025
