# 🚀 GCP Worker Node Setup Guide

**สำหรับ**: axionax DeAI Worker Node  
**เครดิต**: $300 GCP Free Credit  
**วัตถุประสงค์**: ทดสอบ DeAI Training Workloads

---

## 📋 ขั้นตอนที่ 1: สร้าง GCP Compute Instance

### 1.1 เข้า GCP Console

```bash
# เปิด browser ไปที่
https://console.cloud.google.com/compute/instances
```

### 1.2 สร้าง Instance ด้วย GPU

**คลิก "CREATE INSTANCE"** แล้วตั้งค่าดังนี้:

#### Basic Configuration
- **Name**: `axionax-worker-1`
- **Region**: `us-central1` (ราคาถูกสุด)
- **Zone**: `us-central1-a` (มี GPU T4)

#### Machine Configuration
- **Series**: N1
- **Machine type**: `n1-standard-4`
  - 4 vCPU
  - 15 GB memory

#### GPU Configuration
**คลิก "ADD GPU"**
- **GPU type**: NVIDIA Tesla T4
- **Number of GPUs**: 1
- **GPU memory**: 16GB

#### Boot Disk
- **Operating System**: Ubuntu
- **Version**: Ubuntu 22.04 LTS
- **Boot disk type**: Balanced persistent disk
- **Size**: 100 GB

#### Firewall
- ✅ Allow HTTP traffic
- ✅ Allow HTTPS traffic

**คลิก "CREATE"**

---

## 📋 ขั้นตอนที่ 2: ติดตั้ง Dependencies

### 2.1 SSH เข้า Instance

```bash
# จาก local machine
gcloud compute ssh axionax-worker-1 --zone=us-central1-a

# หรือคลิก "SSH" ใน GCP Console
```

### 2.2 ติดตั้ง NVIDIA Drivers และ CUDA

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# ติดตั้ง dependencies
sudo apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    git \
    curl \
    wget

# ติดตั้ง NVIDIA Driver
sudo apt-get install -y nvidia-driver-535

# ติดตั้ง CUDA Toolkit
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt-get update
sudo apt-get install -y cuda-toolkit-12-2

# Reboot
sudo reboot
```

### 2.3 ตรวจสอบ GPU

```bash
# SSH กลับเข้าไปอีกครั้งหลัง reboot
gcloud compute ssh axionax-worker-1 --zone=us-central1-a

# ตรวจสอบ GPU
nvidia-smi

# ควรเห็น output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.x.x    Driver Version: 535.x.x    CUDA Version: 12.2       |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |===============================+======================+======================|
# |   0  Tesla T4            Off  | 00000000:00:04.0 Off |                    0 |
# | N/A   42C    P0    27W /  70W |      0MiB / 15360MiB |      0%      Default |
# +-------------------------------+----------------------+----------------------+
```

---

## 📋 ขั้นตอนที่ 3: ติดตั้ง axionax Worker Software

### 3.1 ติดตั้ง Rust

```bash
# ติดตั้ง Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# ตรวจสอบ
rustc --version
cargo --version
```

### 3.2 ติดตั้ง Python และ Dependencies

```bash
# ติดตั้ง Python 3.10+
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev

# สร้าง virtual environment
python3 -m venv ~/axionax-env
source ~/axionax-env/bin/activate

# ติดตั้ง PyTorch with CUDA support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# ติดตั้ง ML libraries
pip install numpy pandas scikit-learn scipy transformers datasets

# ตรวจสอบ PyTorch + CUDA
python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"
```

### 3.3 Clone axionax Repository

```bash
# Clone repository
cd ~
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe

# Build core
cd core
cargo build --release

# ติดตั้ง DeAI dependencies
cd deai
pip install -r requirements.txt
```

---

## 📋 ขั้นตอนที่ 4: ตั้งค่า Worker Node

### 4.1 สร้าง Worker Configuration

```bash
# สร้างไฟล์ config
mkdir -p ~/axionax-worker/config
nano ~/axionax-worker/config/worker.toml
```

**เนื้อหาไฟล์ `worker.toml`:**

```toml
[worker]
# Worker identity
address = "0xYOUR_WALLET_ADDRESS"  # แก้เป็น wallet address ของคุณ
region = "us-central1"
name = "gcp-worker-1"

[hardware]
# GPU specs (T4)
gpu_model = "NVIDIA Tesla T4"
vram = 16  # GB
cpu_cores = 4
ram = 15  # GB

[network]
# RPC endpoint (เชื่อมต่อกับ testnet)
rpc_url = "http://217.216.109.5:8545"
ws_url = "ws://217.216.109.5:8546"

[performance]
# Performance targets
popc_pass_rate = 0.95
da_reliability = 0.98
target_uptime = 0.99

[storage]
# Storage paths
data_dir = "/home/axionax/worker-data"
models_dir = "/home/axionax/models"
logs_dir = "/home/axionax/logs"
```

### 4.2 สร้าง Directories

```bash
mkdir -p ~/worker-data ~/models ~/logs
```

---

## 📋 ขั้นตอนที่ 5: ทดสอบการทำงาน

### 5.1 ทดสอบ GPU Training

```bash
# สร้างไฟล์ test
nano ~/test_gpu.py
```

**เนื้อหา `test_gpu.py`:**

```python
import torch
import time

print("🔍 Testing GPU...")
print(f"CUDA Available: {torch.cuda.is_available()}")
print(f"GPU Device: {torch.cuda.get_device_name(0)}")
print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

# Simple training test
print("\n🚀 Running simple training test...")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Create random data
x = torch.randn(1000, 100).to(device)
y = torch.randn(1000, 10).to(device)

# Simple model
model = torch.nn.Sequential(
    torch.nn.Linear(100, 256),
    torch.nn.ReLU(),
    torch.nn.Linear(256, 10)
).to(device)

optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = torch.nn.MSELoss()

# Training loop
start = time.time()
for epoch in range(100):
    optimizer.zero_grad()
    output = model(x)
    loss = criterion(output, y)
    loss.backward()
    optimizer.step()
    
    if (epoch + 1) % 10 == 0:
        print(f"Epoch {epoch+1}/100, Loss: {loss.item():.4f}")

elapsed = time.time() - start
print(f"\n✅ Training completed in {elapsed:.2f} seconds")
print(f"⚡ GPU Utilization: {torch.cuda.utilization()}%")
print(f"💾 GPU Memory Used: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
```

**รันทดสอบ:**

```bash
source ~/axionax-env/bin/activate
python3 ~/test_gpu.py
```

---

## 📋 ขั้นตอนที่ 6: เชื่อมต่อกับ axionax Network

### 6.1 Generate Worker Wallet

```bash
# สร้าง wallet สำหรับ worker
cd ~/axionax-core-universe/tools
cargo run --bin keygen -- --output ~/axionax-worker/keys/worker-key.json

# Backup key (สำคัญมาก!)
cat ~/axionax-worker/keys/worker-key.json
# Copy และเก็บไว้ในที่ปลอดภัย
```

### 6.2 Register Worker (บน Testnet)

```bash
# Connect to testnet RPC
export AXIONAX_RPC="http://217.216.109.5:8545"

# Register worker (ต้องมี AXX tokens สำหรับ gas)
# ในอนาคตจะมี script auto register
```

---

## 💰 การประมาณการใช้เครดิต

### Instance Type: n1-standard-4 + T4

| ระยะเวลา | ชั่วโมง | ค่าใช้จ่าย | เครดิตคงเหลือ |
|----------|---------|-----------|---------------|
| 1 วัน | 24h | $12 | $288 |
| 1 สัปดาห์ | 168h | $84 | $216 |
| 2 สัปดาห์ | 336h | $168 | $132 |
| 3 สัปดาห์ | 504h | $252 | $48 |
| 25 วัน | 600h | $300 | $0 |

**💡 เคล็ดลับประหยัดเครดิต:**
- ใช้งานเฉพาะช่วงทดสอบ (ไม่ต้อง 24/7)
- Stop instance เมื่อไม่ใช้งาน (ยังคงเสีย storage ~$10/เดือน)
- ใช้ Preemptible VM (ถูกกว่า 60-91% แต่อาจถูก interrupt)

---

## 🎮 แนะนำการใช้งาน

### แบบทดสอบ (8 ชม./วัน)
- **ค่าใช้จ่าย**: ~$120/เดือน
- **ใช้เครดิตได้**: 2.5 เดือน
- เปิดเฉพาะช่วงทำงาน/ทดสอบ

### แบบ Development (12 ชม./วัน)
- **ค่าใช้จ่าย**: ~$180/เดือน
- **ใช้เครดิตได้**: 1.7 เดือน

### แบบ Full-time (24 ชม./วัน)
- **ค่าใช้จ่าย**: ~$360/เดือน
- **ใช้เครดิตได้**: 25 วัน

---

## 🛠️ Management Commands

```bash
# Start instance
gcloud compute instances start axionax-worker-1 --zone=us-central1-a

# Stop instance (ประหยัดเครดิต)
gcloud compute instances stop axionax-worker-1 --zone=us-central1-a

# SSH
gcloud compute ssh axionax-worker-1 --zone=us-central1-a

# Monitor costs
gcloud billing accounts list
gcloud billing projects describe PROJECT_ID

# Delete instance (เมื่อเสร็จสิ้นการทดสอบ)
gcloud compute instances delete axionax-worker-1 --zone=us-central1-a
```

---

## 📊 Monitoring

```bash
# GPU monitoring (ใน SSH session)
watch -n 1 nvidia-smi

# System resources
htop

# Disk usage
df -h
```

---

## ✅ Checklist

- [ ] สร้าง GCP instance ด้วย T4 GPU
- [ ] ติดตั้ง NVIDIA drivers และ CUDA
- [ ] ติดตั้ง Rust และ Python
- [ ] ทดสอบ GPU ด้วย PyTorch
- [ ] Clone axionax repository
- [ ] สร้าง worker configuration
- [ ] ทดสอบ training script
- [ ] Generate worker wallet
- [ ] Register กับ testnet
- [ ] ส่ง training job แรก

---

**Created**: 2025-11-25  
**Last Updated**: 2025-11-25  
**Status**: Ready for Testing 🚀
