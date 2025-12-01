# 🚀 RunPod A40 Worker - Quick Start

ตั้งค่า RunPod A40 GPU เป็น worker node สำหรับ axionax testnet ใน 3 ขั้นตอน

## ⚡ Quick Setup (20 minutes)

### 1. Deploy RunPod Instance
- ไป https://www.runpod.io/
- เลือก **NVIDIA A40** (48GB VRAM)
- Template: **RunPod PyTorch 2.1**
- Container Disk: **50GB**, Volume: **100GB**
- Deploy!

### 2. SSH เข้า Pod
```bash
# คัดลอก SSH command จาก RunPod Console:
# "Connect" → "SSH" → copy command

# ตัวอย่าง:
ssh root@abc123.runpod.io -p 22456 -i ~/. ssh/id_ed25519_runpod
```

### 3. Run Setup Script
```bash
# Download และ run setup script
wget https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/ops/deploy/scripts/setup-runpod-worker.sh
chmod +x setup-runpod-worker.sh
./setup-runpod-worker.sh
```

Script จะติดตั้งทุกอย่างอัตโนมัติ:
- ✅ Rust toolchain
- ✅ axionax core
- ✅ DeAI dependencies
- ✅ Worker configuration
- ✅ Helper scripts

### 4. Configure Wallet
```bash
# แก้ไข worker config
nano /workspace/axionax-worker/config/worker.toml

# แก้ไขบรรทัดนี้:
address = "0xYOUR_WALLET_ADDRESS_HERE"
# เปลี่ยนเป็น wallet address ของคุณ
```

### 5. Start Worker
```bash
# Start worker in tmux
tmux new -s axionax-worker
~/start-worker.sh

# Detach: กด Ctrl+B แล้ว D
# Re-attach: tmux attach -t axionax-worker
```

✅ **เสร็จแล้ว!** Worker กำลังทำงานและพร้อมรับ jobs จาก testnet

---

## 📊 Monitoring

```bash
# ดู GPU status
nvidia-smi

# Monitor worker
~/monitor-worker.sh

# ดู logs
tail -f /workspace/axionax-worker/logs/worker.log
```

---

## 💡 Tips

**ประหยัดค่าใช้จ่าย:**
- ใช้ **Spot Instance** (ถูกกว่า 40%)
- Stop pod เมื่อไม่ใช้งาน
- Data จะปลอดภัยใน `/workspace` (persistent volume)

**Performance:**
- A40 = 48GB VRAM
- เทียบเท่า 3x T4
- เหมาะสำหรับ large models

---

## 📚 Full Documentation

สำหรับรายละเอียดเพิ่มเติม:
- **Full Guide**: [`WORKER_RUNPOD_A40_SETUP.md`](WORKER_RUNPOD_A40_SETUP.md)
- **General Setup**: [`WORKER_SETUP_QUICK_GUIDE.md`](WORKER_SETUP_QUICK_GUIDE.md)

---

**Platform**: RunPod.io  
**GPU**: NVIDIA A40 (48GB)  
**Cost**: ~$0.44-0.79/hour  
**Setup Time**: 20 minutes
