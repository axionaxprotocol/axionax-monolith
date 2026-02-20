# 🚀 axionax Worker Node - RunPod A40 GPU Setup

**Platform**: RunPod.io Cloud GPU  
**GPU**: NVIDIA A40 (48GB VRAM)  
**OS**: Ubuntu 22.04 LTS (RunPod default)  
**Date**: 2025-11-25

---

## 📋 Why Use RunPod A40?

✅ **High-Performance GPU**
- NVIDIA A40 Professional GPU
- 48GB VRAM (3x more than T4)
- 14.75 TFLOPS (FP32)
- Perfect for large model training

✅ **Cost Effective**
- Pay-as-you-go with no commitment
- ~$0.60-0.80/hour (cheaper than GCP/AWS)
- Auto-pause when not in use
- Can bid on spot instances

✅ **Quick Setup**
- Pre-installed CUDA & drivers
- SSH and Jupyter access
- Ready-made templates (PyTorch, TensorFlow)
- Deploy in 2-3 minutes

---

## 🎯 Part 1: Create RunPod A40 Instance (5 minutes)

### Step 1: Create RunPod Account

1. Go to https://www.runpod.io/
2. Sign up (supports Google/GitHub login)
3. Add funds (minimum $10-20 recommended)

### Step 2: Deploy New Pod

**Click "Deploy" → "GPU Instance"**

#### 📝 GPU Configuration

**GPU Selection:**
```
GPU Type: NVIDIA A40
VRAM: 48GB
Number of GPUs: 1
```

**Instance Type:**
- **On-Demand** (recommended for production)
  - Always available
  - ~$0.79/hour
- **Spot** (cheaper but may be terminated)
  - ~$0.44/hour
  - ~40% savings

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
Volume: 100GB (persistent storage - recommended)
```

**Network:**
```
✅ Enable SSH (Port 22)
✅ Enable Jupyter (Port 8888)  
✅ Enable HTTP/HTTPS (if needed)
```

**Click "Deploy On-Demand"** or **"Deploy Spot"**

⏱️ **Wait 1-2 minutes** for the instance to start

---

## 🔐 Part 2: Connect to RunPod Instance

### Step 3: SSH Access

When the pod is ready (status **RUNNING**):

#### Method 1: Web Terminal (easiest)
1. From RunPod Console
2. Click the pod you created
3. Click **"Connect"** → **"Start Web Terminal"**
4. Terminal will open in the browser

#### Method 2: SSH Client (recommended)

**Get SSH Command:**
```
Click pod → "Connect" → copy SSH command
```

**From Windows PowerShell:**
```powershell
# SSH command format:
ssh root@<POD_ID>.<DATACENTER>.pods.runpod.io -p <PORT> -i ~/.ssh/id_ed25519_runpod

# Example:
ssh root@abc123xyz.runpod-west-1.pods.runpod.io -p 22456 -i ~/.ssh/id_ed25519_runpod
```

**If you don't have an SSH key yet:**
```powershell
# Generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_runpod

# Copy public key
cat ~/.ssh/id_ed25519_runpod.pub
# Add the public key in RunPod Account Settings → SSH Keys
```

---

## ✅ Part 3: Verify GPU and Environment

### Step 4: Verify GPU

```bash
# Check GPU
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.xx    Driver Version: 535.xx    CUDA Version: 12.1         |
# |-------------------------------+----------------------+----------------------+
# |   0  NVIDIA A40         Off  | 00000000:00:04.0 Off |                    0 |
# | N/A   30C    P0    70W / 300W |      0MiB / 48640MiB |      0%      Default |
# +-----------------------------------------------------------------------------+
```

### Step 5: Verify PyTorch CUDA

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

# Expected output:
# PyTorch version: 2.1.x
# CUDA available: True
# CUDA version: 12.1
# GPU: NVIDIA A40
# GPU Memory: 48.00 GB
```

✅ **Ready to use! PyTorch + CUDA is working**

---

## 📦 Part 4: Install axionax Worker (10-15 minutes)

### Method 1: Use Setup Script (recommended)

```bash
# Download setup script
cd ~
wget https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/ops/deploy/scripts/setup-runpod-worker.sh

# Make executable
chmod +x setup-runpod-worker.sh

# Run setup
./setup-runpod-worker.sh
```

**Script will install:**
- ✅ Rust toolchain
- ✅ axionax core repository
- ✅ DeAI dependencies
- ✅ Worker directories
- ✅ Configuration files

⏱️ **Takes 10-15 minutes**

### Method 2: Manual Setup (Step-by-Step)

#### Step 6: Install Rust

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
# Build core (takes 5-10 minutes)
cd ~/axionax-core-universe/core
cargo build --release
```

#### Step 9: Install DeAI Dependencies

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

## 🧪 Part 5: Test Training (5 minutes)

### Step 10: Run GPU Training Test

```bash
# Run simple training example
cd ~/axionax-core-universe/core/examples
python deai_simple_training.py
```

**Expected output:**

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
    Time: 8.23s  # ⚡ Much faster than T4!
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

✅ **A40 is approximately 2x faster than T4!**

---

## 🔧 Part 6: Configure Worker for Testnet

### Step 11: Create Worker Configuration

```bash
# Create worker config directory
mkdir -p ~/axionax-worker/config

# Create worker.toml
nano ~/axionax-worker/config/worker.toml
```

**Content of `worker.toml`:**

```toml
[worker]
# Enter your wallet address
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
# A40 has high performance
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
gradient_checkpointing = false  # A40 has plenty of VRAM, no need for checkpointing
dataloader_workers = 8
```

### Step 12: Create Worker Directories

```bash
# Create directories
mkdir -p /workspace/axionax-worker/{data,models,logs}
mkdir -p /workspace/cache

# Verify
ls -la /workspace/axionax-worker/
```

### Step 13: Create Worker Wallet (if you don't have one)

```bash
# Generate wallet (using axionax tools)
cd ~/axionax-core-universe/tools
python generate_worker_wallet.py

# Or use an existing wallet
# Edit worker.toml and enter your address
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

# Or run in background with tmux
tmux new -s axionax-worker
cargo run --release --bin axionax-worker -- \
  --config ~/axionax-worker/config/worker.toml \
  --log-level info
# Press Ctrl+B then D to detach
```

**Expected output:**

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

### Tmux Commands (for background worker)

```bash
# List sessions
tmux ls

# Attach to session
tmux attach -t axionax-worker

# Detach from session
# Press Ctrl+B then D

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
- ~40% savings
- ⚠️ May be terminated
```

### Tips to Save Money

1. **Use Spot Instance for development**
   - 40% cheaper than On-Demand
   - Suitable for testing

2. **Auto-Pause when not in use**
   - Stop pod when not training
   - Storage is preserved (persistent volume)

3. **Use Persistent Volume**
   - Store data and models
   - No need to re-download each time

4. **Monitor Usage**
   - Check billing in RunPod dashboard
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

### Using RunPod Volume (recommended)

RunPod has persistent volumes that are preserved across pod restarts:

```bash
# Volume is mounted at /workspace (default)
cd /workspace

# Store important data here:
/workspace/
├── axionax-worker/        # Worker data
├── models/                # Trained models
├── datasets/              # Training datasets
└── cache/                 # Cache files

# ⚠️ Do not store important data in ~/root as it will be lost when the pod terminates!
```

### Backup Important Data

```bash
# Sync to local machine
rsync -avz root@pod-address:/workspace/models/ ./local-models/

# Or upload to cloud storage
# Install rclone
curl https://rclone.org/install.sh | bash

# Configure rclone for Google Drive / S3 / etc
rclone config
```

---

## 🆘 Troubleshooting

### GPU Not Working

```bash
# Restart NVIDIA services
sudo systemctl restart nvidia-persistenced

# Reload driver
sudo nvidia-smi -pm 1
```

### Out of Memory (even with A40's 48GB)

```bash
# Reduce batch size in config
# Edit worker.toml:
max_batch_size = 256  # reduced from 512

# Or enable gradient checkpointing
gradient_checkpointing = true
```

### Connection Lost

```bash
# Check connection
curl http://217.216.109.5:8545

# Check logs
tail -f ~/axionax-worker/logs/worker.log

# Restart worker
tmux kill-session -t axionax-worker
# Then start again
```

### Pod Terminated (Spot Instance)

```bash
# Spot instances may be terminated
# If using persistent volume, data is preserved
# Deploy a new pod and mount the same volume
```

---

## ✅ Checklist

### Setup Complete:
- [ ] Create RunPod account
- [ ] Deploy A40 pod (On-Demand or Spot)
- [ ] SSH into pod successfully
- [ ] Verify GPU (nvidia-smi)
- [ ] Verify PyTorch CUDA
- [ ] Install Rust
- [ ] Clone axionax repo
- [ ] Build core successfully
- [ ] Run training example successfully

### Worker Configuration:
- [ ] Create worker.toml
- [ ] Create worker directories
- [ ] Generate worker wallet
- [ ] Configure RPC connection
- [ ] Start worker node

### Testnet Integration:
- [ ] Connect to testnet RPC successfully
- [ ] Worker registered
- [ ] Ready to receive training jobs

---

## 🎯 Next Steps

1. **Test Receiving Training Jobs**
   - Wait for jobs from testnet
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
