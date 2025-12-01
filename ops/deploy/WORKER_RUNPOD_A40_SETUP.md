# 🚀 axionax Worker Node - RunPod A40 GPU Setup

**Platform**: RunPod.io Cloud GPU  
**GPU**: NVIDIA A40 (48GB VRAM)  
**OS**: Ubuntu 22.04 LTS (RunPod default)  
**Date**: 2025-11-25

---

## 📋 ทำไมถึงใช้ RunPod A40?

✅ **High-Performance GPU**
- NVIDIA A40 Professional GPU
- 48GB VRAM (3x มากกว่า T4)
- 14.75 TFLOPS (FP32)
- Perfect สำหรับ large model training

✅ **Cost Effective**
- Pay-as-you-go ไม่มี commitment
- ~$0.60-0.80/hour (ถูกกว่า GCP/AWS)
- Auto-pause เมื่อไม่ใช้งาน
- สามารถ bid spot instances

✅ **Quick Setup**
- Pre-installed CUDA & drivers
- SSH และ Jupyter access
- Template สำเร็จรูป (PyTorch, TensorFlow)
- Deploy ใน 2-3 นาที

---

## 🎯 Part 1: สร้าง RunPod A40 Instance (5 นาที)

### Step 1: สร้าง RunPod Account

1. ไปที่ https://www.runpod.io/
2. Sign up (รองรับ Google/GitHub login)
3. เติมเงิน (minimum $10-20 แนะนำ)

### Step 2: Deploy New Pod

**คลิก "Deploy" → "GPU Instance"**

#### 📝 GPU Configuration

**GPU Selection:**
```
GPU Type: NVIDIA A40
VRAM: 48GB
Number of GPUs: 1
```

**Instance Type:**
- **On-Demand** (แนะนำสำหรับ production)
  - Always available
  - ~$0.79/hour
- **Spot** (ถูกกว่า แต่อาจถูก terminate)
  - ~$0.44/hour
  - ประหยัด ~40%

**Template Selection:**
```
Template: RunPod PyTorch 2.1
- PyTorch 2.1+ with CUDA 12.1
- Ubuntu 22.04 LTS
- Pre-installed: Jupyter, SSH, tmux
```

**Container Configuration:**
```
Container Disk: 50GB (minimum)
Volume: 100GB (persistent storage - แนะนำ)
```

**Network:**
```
✅ Enable SSH (Port 22)
✅ Enable Jupyter (Port 8888)  
✅ Enable HTTP/HTTPS (ถ้าต้องการ)
```

**คลิก "Deploy On-Demand"** หรือ **"Deploy Spot"**

⏱️ **รอ 1-2 นาที** ให้ instance เริ่มทำงาน

---

## 🔐 Part 2: เชื่อมต่อกับ RunPod Instance

### Step 3: SSH Access

เมื่อ pod พร้อมแล้ว (สถานะ **RUNNING**):

#### วิธีที่ 1: Web Terminal (ง่ายสุด)
1. จาก RunPod Console
2. คลิก pod ที่สร้าง
3. คลิก **"Connect"** → **"Start Web Terminal"**
4. Terminal จะเปิดในเบราว์เซอร์

#### วิธีที่ 2: SSH Client (แนะนำ)

**ดู SSH Command:**
```
คลิก pod → "Connect" → คัดลอก SSH command
```

**จาก Windows PowerShell:**
```powershell
# รูปแบบ SSH command จะเป็น:
ssh root@<POD_ID>.<DATACENTER>.pods.runpod.io -p <PORT> -i ~/.ssh/id_ed25519_runpod

# ตัวอย่าง:
ssh root@abc123xyz.runpod-west-1.pods.runpod.io -p 22456 -i ~/.ssh/id_ed25519_runpod
```

**ถ้ายังไม่มี SSH Key:**
```powershell
# สร้าง SSH key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_runpod

# Copy public key
cat ~/.ssh/id_ed25519_runpod.pub
# นำ public key ไปเพิ่มใน RunPod Account Settings → SSH Keys
```

---

## ✅ Part 3: Verify GPU และ Environment

### Step 4: ตรวจสอบ GPU

```bash
# Check GPU
nvidia-smi

# ควรเห็น:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.xx    Driver Version: 535.xx    CUDA Version: 12.1         |
# |-------------------------------+----------------------+----------------------+
# |   0  NVIDIA A40         Off  | 00000000:00:04.0 Off |                    0 |
# | N/A   30C    P0    70W / 300W |      0MiB / 48640MiB |      0%      Default |
# +-----------------------------------------------------------------------------+
```

### Step 5: ตรวจสอบ PyTorch CUDA

```bash
# Test PyTorch
python3 << EOF
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
EOF

# Output ที่คาดหวัง:
# PyTorch version: 2.1.x
# CUDA available: True
# CUDA version: 12.1
# GPU: NVIDIA A40
# GPU Memory: 48.00 GB
```

✅ **พร้อมใช้งานแล้ว! PyTorch + CUDA ทำงานได้**

---

## 📦 Part 4: ติดตั้ง axionax Worker (10-15 นาที)

### วิธีที่ 1: ใช้ Setup Script (แนะนำ)

```bash
# Download setup script
cd ~
wget https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/ops/deploy/scripts/setup-runpod-worker.sh

# Make executable
chmod +x setup-runpod-worker.sh

# Run setup
./setup-runpod-worker.sh
```

**Script จะติดตั้ง:**
- ✅ Rust toolchain
- ✅ axionax core repository
- ✅ DeAI dependencies
- ✅ Worker directories
- ✅ Configuration files

⏱️ **ใช้เวลา 10-15 นาที**

### วิธีที่ 2: Manual Setup (Step-by-Step)

#### Step 6: ติดตั้ง Rust

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Verify
rustc --version
cargo --version
```

#### Step 7: Clone axionax Repository

```bash
# Clone repo
cd ~
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe
```

#### Step 8: Build axionax Core

```bash
# Build core (ใช้เวลา 5-10 นาที)
cd ~/axionax-core-universe/core
cargo build --release
```

#### Step 9: ติดตั้ง DeAI Dependencies

```bash
# Install Python packages
pip install --upgrade pip

# Install DeAI requirements
cd ~/axionax-core-universe/core/deai
pip install -r requirements.txt

# Install additional ML libraries
pip install transformers datasets accelerate
```

---

## 🧪 Part 5: ทดสอบ Training (5 นาที)

### Step 10: รัน GPU Training Test

```bash
# Run simple training example
cd ~/axionax-core-universe/core/examples
python deai_simple_training.py
```

**ผลลัพธ์ที่คาดหวัง:**

```
🚀 axionax DeAI - Simple Training Example
============================================================

📋 Job Configuration:
  job_id: deai_training_20251125_210000
  task_type: image_classification
  model: SimpleCNN
  dataset: MNIST
  batch_size: 256  # Larger batch size for A40!
  epochs: 5
  learning_rate: 0.001
  optimizer: Adam
  device: cuda

🔧 Using device: cuda
🎮 GPU: NVIDIA A40
💾 GPU Memory: 48.00 GB

📦 Loading MNIST dataset...
✅ Training samples: 60000
✅ Test samples: 10000

🎓 Starting training...

📚 Epoch 1/5
  Batch 0/234, Loss: 2.3026, Acc: 12.50%
  Batch 50/234, Loss: 0.2145, Acc: 91.23%
  Batch 100/234, Loss: 0.1567, Acc: 93.45%

  📊 Epoch 1 Summary:
    Train Loss: 0.2845, Train Acc: 91.23%
    Test Loss:  0.1234, Test Acc:  96.12%
    Time: 8.23s  # ⚡ เร็วกว่า T4 มาก!
    GPU Memory: 1.2 GB / 48 GB

...

✅ Training Complete!
⏱️  Total training time: 41.5s
📈 Final test accuracy: 98.67%
```

### Performance Comparison

| GPU | VRAM | Training Time | Speed |
|-----|------|---------------|-------|
| **A40** | 48GB | ~42s | **1.0x** |
| T4 | 16GB | ~92s | 0.46x |
| RX 560 | 4GB | ~280s | 0.15x |

✅ **A40 เร็วกว่า T4 ประมาณ 2x!**

---

## 🔧 Part 6: Configure Worker for Testnet

### Step 11: สร้าง Worker Configuration

```bash
# Create worker config directory
mkdir -p ~/axionax-worker/config

# Create worker.toml
nano ~/axionax-worker/config/worker.toml
```

**เนื้อหา `worker.toml`:**

```toml
[worker]
# ใส่ wallet address ของคุณ
address = "0xYOUR_WALLET_ADDRESS_HERE"
region = "runpod-us-west"
name = "runpod-a40-worker-1"
environment = "runpod-cloud"
testnet = true

[hardware]
gpu_model = "NVIDIA A40"
vram = 48
cpu_cores = 16
cpu_threads = 32
ram = 64

[network]
# axionax Testnet RPC
rpc_url = "http://217.216.109.5:8545"
ws_url = "ws://217.216.109.5:8546"

[performance]
# A40 มี performance สูง
popc_pass_rate = 0.98
da_reliability = 0.99
target_uptime = 0.99
max_batch_size = 512

[storage]
data_dir = "/workspace/axionax-worker/data"
models_dir = "/workspace/axionax-worker/models"
logs_dir = "/workspace/axionax-worker/logs"
cache_dir = "/workspace/cache"

[optimization]
# A40-specific optimizations
mixed_precision = true  # Use FP16 for faster training
gradient_checkpointing = false  # A40 มี VRAM เยอะ ไม่ต้อง checkpoint
dataloader_workers = 8
```

### Step 12: สร้าง Worker Directories

```bash
# Create directories
mkdir -p /workspace/axionax-worker/{data,models,logs}
mkdir -p /workspace/cache

# Verify
ls -la /workspace/axionax-worker/
```

### Step 13: สร้าง Worker Wallet (ถ้ายังไม่มี)

```bash
# Generate wallet (ใช้ tools จาก axionax)
cd ~/axionax-core-universe/tools
python generate_worker_wallet.py

# หรือใช้ existing wallet
# แก้ไข worker.toml และใส่ address ของคุณ
```

---

## 🚀 Part 7: Start Worker Node

### Step 14: Run Worker

```bash
cd ~/axionax-core-universe/core

# Activate environment
source ~/.cargo/env

# Run worker (foreground)
cargo run --release --bin axionax-worker -- \
  --config ~/axionax-worker/config/worker.toml \
  --log-level info

# หรือ run ใน background ด้วย tmux
tmux new -s axionax-worker
cargo run --release --bin axionax-worker -- \
  --config ~/axionax-worker/config/worker.toml \
  --log-level info
# กด Ctrl+B แล้ว D เพื่อ detach
```

**ผลลัพธ์ที่คาดหวัง:**

```
🚀 axionax Worker Node v0.1.0
============================================================
📋 Worker Configuration:
  Address: 0xYour...Address
  Region: runpod-us-west
  GPU: NVIDIA A40 (48GB)
  Network: Testnet

🔧 Connecting to RPC: http://217.216.109.5:8545
✅ Connected to axionax Testnet
✅ Worker registered successfully

🎯 Worker Status: READY
💚 Listening for training jobs...

[INFO] Worker heartbeat sent
[INFO] Network latency: 45ms
[INFO] GPU temperature: 32°C
[INFO] GPU utilization: 0%
```

### Tmux Commands (สำหรับ background worker)

```bash
# List sessions
tmux ls

# Attach to session
tmux attach -t axionax-worker

# Detach from session
# กด Ctrl+B แล้ว D

# Kill session
tmux kill-session -t axionax-worker
```

---

## 💰 Cost Management

### RunPod A40 Pricing

**On-Demand:**
```
A40 (48GB): ~$0.79/hour
- 24 hours = ~$19/day
- 1 month continuous = ~$570
```

**Spot Instance:**
```
A40 (48GB): ~$0.44/hour
- 24 hours = ~$10.56/day
- 1 month = ~$317
- ประหยัดกว่า ~40%
- ⚠️ อาจถูก terminate ได้
```

### Tips ประหยัดเงิน

1. **ใช้ Spot Instance สำหรับ development**
   - ถูกกว่า On-Demand 40%
   - เหมาะสำหรับ testing

2. **Auto-Pause เมื่อไม่ใช้งาน**
   - Stop pod เมื่อไม่ train
   - Storage ยังคงอยู่ (persistent volume)

3. **Use Persistent Volume**
   - เก็บ data และ models
   - ไม่ต้อง download ใหม่ทุกครั้ง

4. **Monitor Usage**
   - ตรวจสอบ billing ใน RunPod dashboard
   - Set budget alerts

---

## 📊 Monitoring Worker

### Check Worker Status

```bash
# GPU usage
watch -n 1 nvidia-smi

# Worker logs
tail -f ~/axionax-worker/logs/worker.log

# System resources
htop
```

### Performance Metrics

```bash
# Create monitoring script
cat > ~/monitor-worker.sh << 'EOF'
#!/bin/bash
echo "==== GPU Status ===="
nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv

echo ""
echo "==== System Load ===="
uptime

echo ""
echo "==== Worker Process ===="
ps aux | grep axionax-worker | grep -v grep
EOF

chmod +x ~/monitor-worker.sh

# Run monitoring
./monitor-worker.sh
```

---

## 💾 Persistent Storage

### Using RunPod Volume (แนะนำ)

RunPod มี persistent volume ที่ไม่หายเมื่อ restart pod:

```bash
# Volume จะ mount ที่ /workspace (default)
cd /workspace

# เก็บข้อมูลสำคัญที่นี่:
/workspace/
├── axionax-worker/        # Worker data
├── models/                # Trained models
├── datasets/              # Training datasets
└── cache/                 # Cache files

# ⚠️ อย่าเก็บข้อมูลสำคัญใน ~/root เพราะจะหายเมื่อ pod terminate!
```

### Backup Important Data

```bash
# Sync ไป local machine
rsync -avz root@pod-address:/workspace/models/ ./local-models/

# หรือ upload to cloud storage
# Install rclone
curl https://rclone.org/install.sh | bash

# Configure rclone สำหรับ Google Drive / S3 / etc
rclone config
```

---

## 🆘 Troubleshooting

### GPU ไม่ทำงาน

```bash
# Restart NVIDIA services
sudo systemctl restart nvidia-persistenced

# Reload driver
sudo nvidia-smi -pm 1
```

### Out of Memory (แม้ A40 มี 48GB)

```bash
# ลด batch size ใน config
# Edit worker.toml:
max_batch_size = 256  # ลดจาก 512

# หรือเปิด gradient checkpointing
gradient_checkpointing = true
```

### Connection ขาด

```bash
# Check นconnection
curl http://217.216.109.5:8545

# Check logging
tail -f ~/axionax-worker/logs/worker.log

# Restart worker
tmux kill-session -t axionax-worker
# แล้ว start ใหม่
```

### Pod Terminated (Spot Instance)

```bash
# Spot instance อาจถูก terminate
# ถ้า using persistent volume, data ยังอยู่
# Deploy pod ใหม่และ mount volume เดิม
```

---

## ✅ Checklist

### Setup Complete:
- [ ] สร้าง RunPod account
- [ ] Deploy A40 pod (On-Demand หรือ Spot)
- [ ] SSH เข้า pod ได้
- [ ] Verify GPU (nvidia-smi)
- [ ] Verify PyTorch CUDA
- [ ] ติดตั้ง Rust
- [ ] Clone axionax repo
- [ ] Build core สำเร็จ
- [ ] รัน training example สำเร็จ

### Worker Configuration:
- [ ] สร้าง worker.toml
- [ ] สร้าง worker directories
- [ ] Generate worker wallet
- [ ] Configure RPC connection
- [ ] Start worker node

### Testnet Integration:
- [ ] เชื่อมต่อกับ testnet RPC สำเร็จ
- [ ] Worker registered
- [ ] พร้อมรับ training jobs

---

## 🎯 Next Steps

1. **Test รับ Training Job**
   - รอ job จาก testnet
   - Monitor worker logs
   - Submit training results

2. **Optimize Performance**
   - Tune batch size
   - Enable mixed precision
   - Optimize dataloader

3. **Production Readiness**
   - Setup monitoring alerts
   - Automate pod restart
   - Backup strategy

4. **Scale Up**
   - Multiple A40 GPUs
   - Multi-GPU training
   - Distributed workers

---

## 📚 Resources

**RunPod Docs:**
- [RunPod Documentation](https://docs.runpod.io/)
- [GPU Pricing](https://www.runpod.io/pricing)
- [SSH Guide](https://docs.runpod.io/docs/ssh)

**axionax Docs:**
- Worker Setup: `WORKER_SETUP_QUICK_GUIDE.md`
- GCP Setup: `gcp-worker-setup.md`
- Vertex AI Setup: `WORKER_VERTEX_AI_SETUP.md`

---

**Created**: 2025-11-25  
**Platform**: RunPod.io Cloud GPU  
**GPU**: NVIDIA A40 (48GB)  
**Status**: ✅ Ready for Testnet  
**Estimated Setup Time**: 20-30 minutes
