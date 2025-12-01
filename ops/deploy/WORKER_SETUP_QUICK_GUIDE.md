# 🚀 axionax Worker Node - Quick Setup Guide

**สำหรับ**: GCP $300 Credit  
**เวลาที่ใช้**: 30-45 นาที  
**วันที่**: 2025-11-25

---

## 📋 Part 1: สร้าง GCP Instance (5-10 นาที)

### ขั้นตอนที่ 1: เข้า GCP Console

✅ **เปิดแล้ว**: https://console.cloud.google.com/compute/instances

### ขั้นตอนที่ 2: สร้าง Instance

**คลิก "CREATE INSTANCE"** แล้วกรอกข้อมูลดังนี้:

#### 📝 Basic Info
```
Name: axionax-worker-1
Region: us-central1
Zone: us-central1-a
```

#### 💻 Machine Configuration
```
Series: N1
Machine type: n1-standard-4
  - 4 vCPU
  - 15 GB memory
```

#### 🎮 GPU (สำคัญมาก!)
**คลิก "ADD GPU"**
```
GPU type: NVIDIA Tesla T4
Number of GPUs: 1
```

#### 💾 Boot Disk
**คลิก "CHANGE"**
```
Operating System: Ubuntu
Version: Ubuntu 22.04 LTS
Boot disk type: Balanced persistent disk
Size (GB): 100
```

#### 🔧 Additional Settings
- ✅ Allow HTTP traffic
- ✅ Allow HTTPS traffic

**คลิก "CREATE"** 🎉

---

## 📋 Part 2: SSH และติดตั้ง (20-30 นาที)

### ขั้นตอนที่ 3: SSH เข้า Instance

**วิธีที่ 1: ผ่าน Web (ง่ายที่สุด)**
```
1. ใน GCP Console
2. คลิกปุ่ม "SSH" ข้างชื่อ instance
3. รอหน้าต่าง SSH เปิด
```

**วิธีที่ 2: ผ่าน gcloud CLI**
```bash
gcloud compute ssh axionax-worker-1 --zone=us-central1-a
```

### ขั้นตอนที่ 4: Download Setup Script

```bash
# Download script
wget https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/ops/deploy/scripts/setup-gcp-worker.sh

# หรือถ้า repo ยังไม่ public
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe/ops/deploy/scripts
chmod +x setup-gcp-worker.sh
```

### ขั้นตอนที่ 5: รัน Setup Script

```bash
sudo ./setup-gcp-worker.sh
```

**⏱️ จะใช้เวลา 15-20 นาที** - ระหว่างนี้ script จะติดตั้ง:
- ✅ NVIDIA Driver 535
- ✅ CUDA Toolkit 12.2
- ✅ Rust toolchain
- ✅ Python 3.10+ และ venv
- ✅ PyTorch with CUDA
- ✅ ML libraries (numpy, pandas, sklearn, etc.)
- ✅ axionax core และ DeAI

### ขั้นตอนที่ 6: Reboot (จำเป็น!)

```bash
sudo reboot
```

**รอ 1-2 นาที** แล้ว SSH กลับเข้าไปอีกครั้ง

---

## 📋 Part 3: Verify และ Test (5-10 นาที)

### ขั้นตอนที่ 7: Verify GPU

```bash
# ตรวจสอบ GPU
nvidia-smi

# ควรเห็น output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.xx    Driver Version: 535.xx    CUDA Version: 12.2         |
# |-------------------------------+----------------------+----------------------+
# |   0  Tesla T4            Off  | 00000000:00:04.0 Off |                    0 |
# +-----------------------------------------------------------------------------+
```

### ขั้นตอนที่ 8: Activate Environment

```bash
source ~/activate-worker.sh

# ควรเห็น:
# ✅ axionax Worker environment activated
# 🔧 CUDA: 12.2
# 🦀 Rust: rustc 1.75.x
# 🐍 Python: Python 3.10.x
```

### ขั้นตอนที่ 9: Test PyTorch CUDA

```bash
python -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"

# ควรเห็น:
# CUDA Available: True
# GPU: Tesla T4
```

### ขั้นตอนที่ 10: รัน Training Example

```bash
cd ~/axionax-core-universe/core/examples
python deai_simple_training.py
```

**ผลลัพธ์ที่คาดหวัง:**
```
🚀 axionax DeAI - Simple Training Example
============================================================
🔧 Using device: cuda
🎮 GPU: Tesla T4
💾 GPU Memory: 15.36 GB

📦 Loading MNIST dataset...
✅ Training samples: 60000
✅ Test samples: 10000

🎓 Starting training...
📚 Epoch 1/5
  📊 Epoch 1 Summary:
    Train Loss: 0.2845, Train Acc: 91.23%
    Test Loss:  0.1234, Test Acc:  96.12%
    Time: 25.34s
    GPU Memory: 0.85 GB

[... epochs 2-5 ...]

✅ Training Complete!
============================================================
⏱️  Total training time: 127.45s
📈 Final test accuracy: 98.67%
💾 Results saved to: training_results_YYYYMMDD_HHMMSS.json
🎯 Model saved to: model_YYYYMMDD_HHMMSS.pth
```

---

## 📋 Part 4: Configuration (5 นาที)

### ขั้นตอนที่ 11: สร้าง Worker Config

```bash
nano ~/axionax-worker/config/worker.toml
```

**กรอกข้อมูลนี้:**

```toml
[worker]
# Worker identity (จะต้องสร้าง wallet ก่อน)
address = "0xYOUR_WALLET_ADDRESS"
region = "us-central1"
name = "gcp-worker-1"

[hardware]
gpu_model = "NVIDIA Tesla T4"
vram = 16  # GB
cpu_cores = 4
ram = 15  # GB

[network]
# เชื่อมต่อกับ RPC node ของคุณ
rpc_url = "http://217.216.109.5:8545"
ws_url = "ws://217.216.109.5:8546"

[performance]
popc_pass_rate = 0.95
da_reliability = 0.98
target_uptime = 0.99

[storage]
data_dir = "/home/YOUR_USERNAME/worker-data"
models_dir = "/home/YOUR_USERNAME/models"
logs_dir = "/home/YOUR_USERNAME/logs"
```

**Save**: `Ctrl+X` → `Y` → `Enter`

### ขั้นตอนที่ 12: Generate Worker Wallet (Optional)

```bash
# สร้าง wallet สำหรับ worker
cd ~/axionax-core-universe/core
cargo run --bin keygen -- generate --output ~/axionax-worker/keys/worker-key.json

# หรือถ้ามี wallet แล้ว ก็ copy private key มาใส่
```

---

## 💰 Cost Management

### ตรวจสอบค่าใช้จ่าย

```bash
# ดู billing
gcloud billing accounts list

# ดู current usage
gcloud compute instances list --format="table(name,zone,status)"
```

### Start/Stop Instance (ประหยัดเครดิต)

```bash
# Stop instance เมื่อไม่ใช้งาน
gcloud compute instances stop axionax-worker-1 --zone=us-central1-a

# Start เมื่อต้องการใช้
gcloud compute instances start axionax-worker-1 --zone=us-central1-a
```

**💡 Tips:**
- Stop instance เมื่อไม่ใช้งาน → ประหยัด ~$0.50/hour
- ยังคงเสียค่า storage ~$10/เดือน (แต่ข้อมูลยังอยู่)
- ใช้งาน 8 ชม./วัน → เครดิตใช้ได้ 2.5 เดือน

---

## 🎯 Monitoring Commands

### GPU Monitoring
```bash
# Real-time GPU usage
watch -n 1 nvidia-smi

# หรือใช้ gpustat (ติดตั้งก่อน)
pip install gpustat
gpustat -i 1
```

### System Monitoring
```bash
# CPU, RAM, Disk
htop

# Disk usage
df -h

# Network
ifconfig
```

### Process Monitoring (ถ้ารัน training)
```bash
# ใช้ tmux เพื่อให้ training รันต่อได้แม้ disconnect
tmux new -s training
python deai_simple_training.py

# Detach: Ctrl+B แล้วกด D
# Reattach: tmux attach -t training
```

---

## ✅ Checklist

**Setup:**
- [ ] สร้าง GCP instance with T4 GPU
- [ ] SSH เข้า instance
- [ ] รัน setup script
- [ ] Reboot
- [ ] Verify GPU (nvidia-smi)
- [ ] Test PyTorch CUDA
- [ ] รัน training example สำเร็จ

**Configuration:**
- [ ] สร้าง worker.toml
- [ ] Generate worker wallet (optional)
- [ ] เชื่อมต่อกับ RPC node

**Next Steps:**
- [ ] เชื่อมต่อกับ axionax Network
- [ ] Register worker on testnet
- [ ] รับ DeAI jobs แรก

---

## 🆘 Troubleshooting

**ปัญหา: nvidia-smi ไม่เจอ GPU**
```bash
# ตรวจสอบว่า GPU ถูก attach
lspci | grep -i nvidia

# Reinstall driver
sudo apt-get install --reinstall nvidia-driver-535
sudo reboot
```

**ปัญหา: PyTorch ไม่เจอ CUDA**
```bash
# ติดตั้ง PyTorch ใหม่
source ~/axionax-env/bin/activate
pip install --force-reinstall torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**ปัญหา: Out of Memory**
```bash
# ลด batch size ใน training script
# แก้ไขใน deai_simple_training.py:
# batch_size = 64  # จาก 128
```

---

## 📞 Need Help?

- **Documentation**: `~/axionax-core-universe/ops/deploy/gcp-worker-setup.md`
- **Training Example**: `~/axionax-core-universe/core/examples/deai_simple_training.py`
- **Setup Script**: `~/axionax-core-universe/ops/deploy/scripts/setup-gcp-worker.sh`

---

**Created**: 2025-11-25  
**Status**: ✅ Ready to Use  
**Estimated Time**: 30-45 minutes total
