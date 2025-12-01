#!/bin/bash

###############################################################################
# axionax DeAI Worker Node - RunPod Quick Setup Script
###############################################################################
# 
# ใช้สำหรับติดตั้ง Worker Node บน RunPod.io
# รองรับ: Ubuntu 22.04 LTS with NVIDIA GPU (A40, A100, RTX 4090, etc.)
#
# Usage:
#   wget https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/ops/deploy/scripts/setup-runpod-worker.sh
#   chmod +x setup-runpod-worker.sh
#   ./setup-runpod-worker.sh
#
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║       axionax DeAI Worker Node Setup (RunPod)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Detect user
if [ "$EUID" -eq 0 ]; then
    ACTUAL_USER=root
    USER_HOME=/root
else
    ACTUAL_USER=$USER
    USER_HOME=$HOME
fi

log_info "Setup for user: $ACTUAL_USER"
log_info "Home directory: $USER_HOME"

# Step 1: Update system
log_info "Step 1: Updating system packages..."
apt-get update && apt-get upgrade -y
log_success "System updated"

# Step 2: Install basic dependencies
log_info "Step 2: Installing basic dependencies..."
apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    git \
    curl \
    wget \
    htop \
    vim \
    tmux \
    tree \
    jq \
    software-properties-common
log_success "Basic dependencies installed"

# Step 3: Verify GPU
log_info "Step 3: Verifying GPU..."
if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)
    GPU_MEMORY=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader | head -n 1)
    log_success "GPU detected: $GPU_NAME ($GPU_MEMORY)"
else
    log_error "NVIDIA GPU not detected! Please check your RunPod instance."
    exit 1
fi

# Step 4: Verify CUDA
log_info "Step 4: Verifying CUDA..."
if command -v nvcc &> /dev/null; then
    CUDA_VERSION=$(nvcc --version | grep "release" | awk '{print $5}' | sed 's/,//')
    log_success "CUDA $CUDA_VERSION detected"
else
    log_warning "CUDA toolkit not found in PATH, but should be available in Docker"
fi

# Step 5: Verify PyTorch
log_info "Step 5: Verifying PyTorch installation..."
python3 << EOF
import torch
import sys
print(f"PyTorch version: {torch.__version__}")
if not torch.cuda.is_available():
    print("❌ CUDA not available in PyTorch!")
    sys.exit(1)
print(f"✅ CUDA available: {torch.cuda.is_available()}")
print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
print(f"✅ CUDA version: {torch.version.cuda}")
EOF
log_success "PyTorch with CUDA verified"

# Step 6: Install Rust
log_info "Step 6: Installing Rust..."
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    log_success "Rust installed"
else
    log_warning "Rust already installed"
    rustc --version
fi

# Step 7: Ensure Rust is in PATH
if ! grep -q "cargo/env" "$USER_HOME/.bashrc"; then
    echo 'source $HOME/.cargo/env' >> "$USER_HOME/.bashrc"
fi
source $HOME/.cargo/env

# Step 8: Clone axionax repository
log_info "Step 8: Cloning axionax repository..."
if [ ! -d "$USER_HOME/axionax-core-universe" ]; then
    git clone https://github.com/axionaxprotocol/axionax-core-universe.git "$USER_HOME/axionax-core-universe"
    log_success "Repository cloned"
else
    log_warning "Repository already exists, pulling latest changes..."
    cd "$USER_HOME/axionax-core-universe"
    git pull
fi

# Step 9: Build Rust core
log_info "Step 9: Building axionax core (this may take 5-10 minutes)..."
cd "$USER_HOME/axionax-core-universe/core"
source $HOME/.cargo/env
cargo build --release
log_success "Core built successfully"

# Step 10: Install DeAI dependencies
log_info "Step 10: Installing DeAI dependencies..."
pip install --upgrade pip
cd "$USER_HOME/axionax-core-universe/core/deai"
pip install -r requirements.txt
log_success "DeAI dependencies installed"

# Step 11: Install additional ML libraries
log_info "Step 11: Installing additional ML libraries..."
pip install transformers datasets accelerate bitsandbytes
log_success "ML libraries installed"

# Step 12: Create worker directories in persistent storage
log_info "Step 12: Creating worker directories..."
mkdir -p /workspace/axionax-worker/{config,keys,data,models,logs}
mkdir -p /workspace/cache
log_success "Worker directories created in /workspace"

# Step 13: Create worker config template
log_info "Step 13: Creating worker config template..."
cat > /workspace/axionax-worker/config/worker.toml << 'EOF'
[worker]
# ⚠️ แก้ไข address ของคุณที่นี่!
address = "0xYOUR_WALLET_ADDRESS_HERE"
region = "runpod-us-west"
name = "runpod-worker-1"
environment = "runpod-cloud"
testnet = true

[hardware]
# Script will auto-detect GPU
gpu_model = "AUTO_DETECT"
vram = 0  # Will be auto-detected
cpu_cores = 16
cpu_threads = 32
ram = 64

[network]
# axionax Testnet RPC
rpc_url = "http://217.216.109.5:8545"
ws_url = "ws://217.216.109.5:8546"

[performance]
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
mixed_precision = true
gradient_checkpointing = false
dataloader_workers = 8
EOF

# Auto-detect GPU and update config
GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)
GPU_MEMORY_MB=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -n 1)
GPU_MEMORY_GB=$(( (GPU_MEMORY_MB + 512) / 1024 ))

sed -i "s/gpu_model = \"AUTO_DETECT\"/gpu_model = \"$GPU_NAME\"/" /workspace/axionax-worker/config/worker.toml
sed -i "s/vram = 0/vram = $GPU_MEMORY_GB/" /workspace/axionax-worker/config/worker.toml

log_success "Worker config created at /workspace/axionax-worker/config/worker.toml"
log_warning "⚠️  Don't forget to update your wallet address in the config!"

# Step 14: Create worker activation script
log_info "Step 14: Creating worker activation script..."
cat > "$USER_HOME/activate-worker.sh" << 'EOF'
#!/bin/bash
# axionax Worker Environment Activation
source $HOME/.cargo/env
echo "✅ axionax Worker environment activated"
echo "🦀 Rust: $(rustc --version)"
echo "🐍 Python: $(python --version)"
echo "🔥 PyTorch: $(python -c 'import torch; print(torch.__version__)')"
echo "🎮 GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)"
echo "💾 VRAM: $(nvidia-smi --query-gpu=memory.total --format=csv,noheader | head -n 1)"
EOF

chmod +x "$USER_HOME/activate-worker.sh"
log_success "Activation helper created: $USER_HOME/activate-worker.sh"

# Step 15: Create worker start script
log_info "Step 15: Creating worker start script..."
cat > "$USER_HOME/start-worker.sh" << 'EOF'
#!/bin/bash
echo "🚀 Starting axionax Worker Node..."
cd ~/axionax-core-universe/core
source $HOME/.cargo/env

# Check if config exists and has wallet address
if ! grep -q "0xYOUR_WALLET_ADDRESS_HERE" /workspace/axionax-worker/config/worker.toml; then
    cargo run --release --bin axionax-worker -- \
        --config /workspace/axionax-worker/config/worker.toml \
        --log-level info
else
    echo "❌ Please update your wallet address in /workspace/axionax-worker/config/worker.toml"
    exit 1
fi
EOF

chmod +x "$USER_HOME/start-worker.sh"
log_success "Worker start script created: $USER_HOME/start-worker.sh"

# Step 16: Create monitoring script
log_info "Step 16: Creating monitoring script..."
cat > "$USER_HOME/monitor-worker.sh" << 'EOF'
#!/bin/bash
echo "==== GPU Status ===="
nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,utilization.memory,memory.used,memory.total --format=csv

echo ""
echo "==== System Load ===="
uptime

echo ""
echo "==== Disk Usage (Workspace) ===="
df -h /workspace

echo ""
echo "==== Worker Process ===="
ps aux | grep axionax-worker | grep -v grep || echo "Worker not running"

echo ""
echo "==== Recent Logs ===="
if [ -f /workspace/axionax-worker/logs/worker.log ]; then
    tail -n 20 /workspace/axionax-worker/logs/worker.log
else
    echo "No logs found yet"
fi
EOF

chmod +x "$USER_HOME/monitor-worker.sh"
log_success "Monitoring script created: $USER_HOME/monitor-worker.sh"

# Step 17: Run quick test
log_info "Step 17: Running GPU test..."
cd "$USER_HOME/axionax-core-universe/core/examples"
python3 << 'EOF'
import torch
import time

print("\n🧪 Quick GPU Test")
print("=" * 60)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {device}")
print(f"GPU: {torch.cuda.get_device_name(0)}")

# Simple matrix multiplication
size = 5000
print(f"\nTesting matrix multiplication ({size}x{size})...")
start = time.time()
a = torch.randn(size, size, device=device)
b = torch.randn(size, size, device=device)
c = torch.mm(a, b)
torch.cuda.synchronize()
elapsed = time.time() - start

print(f"✅ Completed in {elapsed:.3f} seconds")
print(f"GPU Memory Used: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
print(f"GPU Memory Cached: {torch.cuda.memory_reserved() / 1024**3:.2f} GB")
EOF
log_success "GPU test passed"

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ Installation Complete!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Display GPU info
echo -e "${BLUE}📊 Your GPU Configuration:${NC}"
nvidia-smi --query-gpu=name,memory.total,driver_version,cuda_version --format=table

echo ""
log_info "Next steps:"
echo ""
echo "  1. Configure your wallet address:"
echo "     ${YELLOW}nano /workspace/axionax-worker/config/worker.toml${NC}"
echo "     (แก้ไข address = \"0xYOUR_WALLET_ADDRESS_HERE\")"
echo ""
echo "  2. Activate worker environment:"
echo "     ${YELLOW}source ~/activate-worker.sh${NC}"
echo ""
echo "  3. Test training example:"
echo "     ${YELLOW}cd ~/axionax-core-universe/core/examples${NC}"
echo "     ${YELLOW}python deai_simple_training.py${NC}"
echo ""
echo "  4. Start worker (in tmux):"
echo "     ${YELLOW}tmux new -s axionax-worker${NC}"
echo "     ${YELLOW}~/start-worker.sh${NC}"
echo "     (Press Ctrl+B then D to detach)"
echo ""
echo "  5. Monitor worker:"
echo "     ${YELLOW}~/monitor-worker.sh${NC}"
echo ""
log_success "🎉 Your RunPod worker is ready for testnet!"
echo ""
