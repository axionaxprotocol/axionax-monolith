# 🚀 GCP Worker Node Setup Guide

**For**: axionax DeAI Worker Node  
**Credit**: $300 GCP Free Credit  
**Objective**: Test DeAI Training Workloads

---

## 📋 Step 1: Create a GCP Compute Instance

### 1.1 Open GCP Console

```bash
# Open your browser and go to
https://console.cloud.google.com/compute/instances
```

### 1.2 Create an Instance with GPU

**Click "CREATE INSTANCE"** and configure as follows:

#### Basic Configuration
- **Name**: `axionax-worker-1`
- **Region**: `us-central1` (cheapest)
- **Zone**: `us-central1-a` (has T4 GPUs)

#### Machine Configuration
- **Series**: N1
- **Machine type**: `n1-standard-4`
  - 4 vCPU
  - 15 GB memory

#### GPU Configuration
**Click "ADD GPU"**
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

**Click "CREATE"**

---

## 📋 Step 2: Install Dependencies

### 2.1 SSH into the Instance

```bash
# From your local machine
gcloud compute ssh axionax-worker-1 --zone=us-central1-a

# Or click "SSH" in the GCP Console
```

### 2.2 Install NVIDIA Drivers and CUDA

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    git \
    curl \
    wget

# Install NVIDIA Driver
sudo apt-get install -y nvidia-driver-535

# Install CUDA Toolkit
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt-get update
sudo apt-get install -y cuda-toolkit-12-2

# Reboot
sudo reboot
```

### 2.3 Verify GPU

```bash
# SSH back in after reboot
gcloud compute ssh axionax-worker-1 --zone=us-central1-a

# Verify GPU
nvidia-smi

# Expected output:
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

## 📋 Step 3: Install axionax Worker Software

### 3.1 Install Rust

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Verify
rustc --version
cargo --version
```

### 3.2 Install Python and Dependencies

```bash
# Install Python 3.10+
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev

# Create virtual environment
python3 -m venv ~/axionax-env
source ~/axionax-env/bin/activate

# Install PyTorch with CUDA support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install ML libraries
pip install numpy pandas scikit-learn scipy transformers datasets

# Verify PyTorch + CUDA
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

# Install DeAI dependencies
cd deai
pip install -r requirements.txt
```

---

## 📋 Step 4: Configure Worker Node

### 4.1 Create Worker Configuration

```bash
# Create config file
mkdir -p ~/axionax-worker/config
nano ~/axionax-worker/config/worker.toml
```

**Content of `worker.toml`:**

```toml
[worker]
# Worker identity
address = "0xYOUR_WALLET_ADDRESS"  # Change to your wallet address
region = "us-central1"
name = "gcp-worker-1"

[hardware]
# GPU specs (T4)
gpu_model = "NVIDIA Tesla T4"
vram = 16  # GB
cpu_cores = 4
ram = 15  # GB

[network]
# RPC endpoint (connect to testnet)
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

### 4.2 Create Directories

```bash
mkdir -p ~/worker-data ~/models ~/logs
```

---

## 📋 Step 5: Test Functionality

### 5.1 Test GPU Training

```bash
# Create test file
nano ~/test_gpu.py
```

**Content of `test_gpu.py`:**

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

**Run the test:**

```bash
source ~/axionax-env/bin/activate
python3 ~/test_gpu.py
```

---

## 📋 Step 6: Connect to axionax Network

### 6.1 Generate Worker Wallet

```bash
# Create a wallet for the worker
cd ~/axionax-core-universe/tools
cargo run --bin keygen -- --output ~/axionax-worker/keys/worker-key.json

# Backup key (very important!)
cat ~/axionax-worker/keys/worker-key.json
# Copy and store in a safe place
```

### 6.2 Register Worker (on Testnet)

```bash
# Connect to testnet RPC
export AXIONAX_RPC="http://217.216.109.5:8545"

# Register worker (requires AXX tokens for gas)
# An auto-register script will be available in the future
```

---

## 💰 Estimated Credit Usage

### Instance Type: n1-standard-4 + T4

| Duration | Hours | Cost | Remaining Credit |
|----------|-------|------|-----------------|
| 1 day | 24h | $12 | $288 |
| 1 week | 168h | $84 | $216 |
| 2 weeks | 336h | $168 | $132 |
| 3 weeks | 504h | $252 | $48 |
| 25 days | 600h | $300 | $0 |

**💡 Tips to Save Credit:**
- Use only during testing (not 24/7)
- Stop instance when not in use (still costs ~$10/month for storage)
- Use Preemptible VM (60-91% cheaper but may be interrupted)

---

## 🎮 Usage Recommendations

### Testing Mode (8 hrs/day)
- **Cost**: ~$120/month
- **Credit lasts**: 2.5 months
- Turn on only during work/testing hours

### Development Mode (12 hrs/day)
- **Cost**: ~$180/month
- **Credit lasts**: 1.7 months

### Full-time Mode (24 hrs/day)
- **Cost**: ~$360/month
- **Credit lasts**: 25 days

---

## 🛠️ Management Commands

```bash
# Start instance
gcloud compute instances start axionax-worker-1 --zone=us-central1-a

# Stop instance (save credit)
gcloud compute instances stop axionax-worker-1 --zone=us-central1-a

# SSH
gcloud compute ssh axionax-worker-1 --zone=us-central1-a

# Monitor costs
gcloud billing accounts list
gcloud billing projects describe PROJECT_ID

# Delete instance (when testing is complete)
gcloud compute instances delete axionax-worker-1 --zone=us-central1-a
```

---

## 📊 Monitoring

```bash
# GPU monitoring (in SSH session)
watch -n 1 nvidia-smi

# System resources
htop

# Disk usage
df -h
```

---

## ✅ Checklist

- [ ] Create GCP instance with T4 GPU
- [ ] Install NVIDIA drivers and CUDA
- [ ] Install Rust and Python
- [ ] Test GPU with PyTorch
- [ ] Clone axionax repository
- [ ] Create worker configuration
- [ ] Test training script
- [ ] Generate worker wallet
- [ ] Register with testnet
- [ ] Submit first training job

---

**Created**: 2025-11-25  
**Last Updated**: 2025-11-25  
**Status**: Ready for Testing 🚀
