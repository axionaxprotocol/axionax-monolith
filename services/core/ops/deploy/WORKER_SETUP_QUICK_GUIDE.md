# 🚀 axionax Worker Node - Quick Setup Guide

**For**: GCP $300 Credit  
**Time Required**: 30-45 minutes  
**Date**: 2025-11-25

---

## 📋 Part 1: Create GCP Instance (5-10 minutes)

### Step 1: Open GCP Console

✅ **Open**: https://console.cloud.google.com/compute/instances

### Step 2: Create Instance

**Click "CREATE INSTANCE"** and fill in the following:

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

#### 🎮 GPU (very important!)
**Click "ADD GPU"**
```
GPU type: NVIDIA Tesla T4
Number of GPUs: 1
```

#### 💾 Boot Disk
**Click "CHANGE"**
```
Operating System: Ubuntu
Version: Ubuntu 22.04 LTS
Boot disk type: Balanced persistent disk
Size (GB): 100
```

#### 🔧 Additional Settings
- ✅ Allow HTTP traffic
- ✅ Allow HTTPS traffic

**Click "CREATE"** 🎉

---

## 📋 Part 2: SSH and Install (20-30 minutes)

### Step 3: SSH into Instance

**Method 1: Via Web (easiest)**
```
1. In GCP Console
2. Click the "SSH" button next to the instance name
3. Wait for the SSH window to open
```

**Method 2: Via gcloud CLI**
```bash
gcloud compute ssh axionax-worker-1 --zone=us-central1-a
```

### Step 4: Download Setup Script

```bash
# Download script
wget https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/ops/deploy/scripts/setup-gcp-worker.sh

# Or if the repo is not yet public
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe/ops/deploy/scripts
chmod +x setup-gcp-worker.sh
```

### Step 5: Run Setup Script

```bash
sudo ./setup-gcp-worker.sh
```

**⏱️ This will take 15-20 minutes** — the script will install:
- ✅ NVIDIA Driver 535
- ✅ CUDA Toolkit 12.2
- ✅ Rust toolchain
- ✅ Python 3.10+ and venv
- ✅ PyTorch with CUDA
- ✅ ML libraries (numpy, pandas, sklearn, etc.)
- ✅ axionax core and DeAI

### Step 6: Reboot (required!)

```bash
sudo reboot
```

**Wait 1-2 minutes** then SSH back in

---

## 📋 Part 3: Verify and Test (5-10 minutes)

### Step 7: Verify GPU

```bash
# Verify GPU
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.xx    Driver Version: 535.xx    CUDA Version: 12.2         |
# |-------------------------------+----------------------+----------------------+
# |   0  Tesla T4            Off  | 00000000:00:04.0 Off |                    0 |
# +-----------------------------------------------------------------------------+
```

### Step 8: Activate Environment

```bash
source ~/activate-worker.sh

# Expected output:
# ✅ axionax Worker environment activated
# 🔧 CUDA: 12.2
# 🦀 Rust: rustc 1.75.x
# 🐍 Python: Python 3.10.x
```

### Step 9: Test PyTorch CUDA

```bash
python -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"

# Expected output:
# CUDA Available: True
# GPU: Tesla T4
```

### Step 10: Run Training Example

```bash
cd ~/axionax-core-universe/core/examples
python deai_simple_training.py
```

**Expected output:**
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

## 📋 Part 4: Configuration (5 minutes)

### Step 11: Create Worker Config

```bash
nano ~/axionax-worker/config/worker.toml
```

**Enter the following:**

```toml
[worker]
# Worker identity (you need to generate a wallet first)
address = "0xYOUR_WALLET_ADDRESS"
region = "us-central1"
name = "gcp-worker-1"

[hardware]
gpu_model = "NVIDIA Tesla T4"
vram = 16  # GB
cpu_cores = 4
ram = 15  # GB

[network]
# Connect to your RPC node
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

### Step 12: Generate Worker Wallet (Optional)

```bash
# Create a wallet for the worker
cd ~/axionax-core-universe/core
cargo run --bin keygen -- generate --output ~/axionax-worker/keys/worker-key.json

# Or if you already have a wallet, copy the private key into the config
```

---

## 💰 Cost Management

### Check Costs

```bash
# View billing
gcloud billing accounts list

# View current usage
gcloud compute instances list --format="table(name,zone,status)"
```

### Start/Stop Instance (save credit)

```bash
# Stop instance when not in use
gcloud compute instances stop axionax-worker-1 --zone=us-central1-a

# Start when needed
gcloud compute instances start axionax-worker-1 --zone=us-central1-a
```

**💡 Tips:**
- Stop instance when not in use → save ~$0.50/hour
- Storage still costs ~$10/month (but data is preserved)
- Use 8 hrs/day → credit lasts 2.5 months

---

## 🎯 Monitoring Commands

### GPU Monitoring
```bash
# Real-time GPU usage
watch -n 1 nvidia-smi

# Or use gpustat (install first)
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

### Process Monitoring (if running training)
```bash
# Use tmux so training continues even if disconnected
tmux new -s training
python deai_simple_training.py

# Detach: Ctrl+B then D
# Reattach: tmux attach -t training
```

---

## ✅ Checklist

**Setup:**
- [ ] Create GCP instance with T4 GPU
- [ ] SSH into instance
- [ ] Run setup script
- [ ] Reboot
- [ ] Verify GPU (nvidia-smi)
- [ ] Test PyTorch CUDA
- [ ] Run training example successfully

**Configuration:**
- [ ] Create worker.toml
- [ ] Generate worker wallet (optional)
- [ ] Connect to RPC node

**Next Steps:**
- [ ] Connect to axionax Network
- [ ] Register worker on testnet
- [ ] Receive first DeAI jobs

---

## 🆘 Troubleshooting

**Problem: nvidia-smi does not find GPU**
```bash
# Check that GPU is attached
lspci | grep -i nvidia

# Reinstall driver
sudo apt-get install --reinstall nvidia-driver-535
sudo reboot
```

**Problem: PyTorch does not find CUDA**
```bash
# Reinstall PyTorch
source ~/axionax-env/bin/activate
pip install --force-reinstall torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Problem: Out of Memory**
```bash
# Reduce batch size in training script
# Edit deai_simple_training.py:
# batch_size = 64  # instead of 128
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
