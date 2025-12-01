#!/bin/bash

###############################################################################
# axionax DeAI Worker Node - GCP Quick Setup Script
###############################################################################
# 
# ใช้สำหรับติดตั้ง Worker Node บน GCP Compute Engine
# รองรับ: Ubuntu 22.04 LTS with NVIDIA GPU
#
# Usage:
#   wget https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/ops/deploy/scripts/setup-gcp-worker.sh
#   chmod +x setup-gcp-worker.sh
#   sudo ./setup-gcp-worker.sh
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
echo "║         axionax DeAI Worker Node Setup (GCP)             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Get the actual user (not root when using sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
USER_HOME=$(eval echo ~$ACTUAL_USER)

log_info "Setup will be performed for user: $ACTUAL_USER"
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
    software-properties-common
log_success "Basic dependencies installed"

# Step 3: Install NVIDIA Driver
log_info "Step 3: Installing NVIDIA Driver..."
apt-get install -y nvidia-driver-535
log_success "NVIDIA Driver installed (requires reboot)"

# Step 4: Install CUDA Toolkit
log_info "Step 4: Installing CUDA Toolkit 12.2..."
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
dpkg -i cuda-keyring_1.0-1_all.deb
apt-get update
apt-get install -y cuda-toolkit-12-2
rm cuda-keyring_1.0-1_all.deb

# Add CUDA to PATH
if ! grep -q "cuda-12.2" "$USER_HOME/.bashrc"; then
    echo 'export PATH=/usr/local/cuda-12.2/bin:$PATH' >> "$USER_HOME/.bashrc"
    echo 'export LD_LIBRARY_PATH=/usr/local/cuda-12.2/lib64:$LD_LIBRARY_PATH' >> "$USER_HOME/.bashrc"
fi

log_success "CUDA Toolkit installed"

# Step 5: Install Rust
log_info "Step 5: Installing Rust..."
if ! command -v rustc &> /dev/null; then
    sudo -u $ACTUAL_USER sh -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'
    sudo -u $ACTUAL_USER sh -c 'source $HOME/.cargo/env'
    log_success "Rust installed"
else
    log_warning "Rust already installed"
fi

# Step 6: Install Python and dependencies
log_info "Step 6: Installing Python and ML libraries..."
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev

log_success "Python installed"

# Step 7: Create Python virtual environment
log_info "Step 7: Creating Python virtual environment..."
sudo -u $ACTUAL_USER python3 -m venv "$USER_HOME/axionax-env"
log_success "Virtual environment created at $USER_HOME/axionax-env"

# Step 8: Install PyTorch with CUDA
log_info "Step 8: Installing PyTorch with CUDA support..."
sudo -u $ACTUAL_USER sh -c "source $USER_HOME/axionax-env/bin/activate && \
    pip install --upgrade pip && \
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121"
log_success "PyTorch with CUDA installed"

# Step 9: Install ML libraries
log_info "Step 9: Installing ML libraries..."
sudo -u $ACTUAL_USER sh -c "source $USER_HOME/axionax-env/bin/activate && \
    pip install numpy pandas scikit-learn scipy transformers datasets"
log_success "ML libraries installed"

# Step 10: Clone axionax repository
log_info "Step 10: Cloning axionax repository..."
if [ ! -d "$USER_HOME/axionax-core-universe" ]; then
    sudo -u $ACTUAL_USER git clone https://github.com/axionaxprotocol/axionax-core-universe.git "$USER_HOME/axionax-core-universe"
    log_success "Repository cloned"
else
    log_warning "Repository already exists, pulling latest changes..."
    cd "$USER_HOME/axionax-core-universe"
    sudo -u $ACTUAL_USER git pull
fi

# Step 11: Build Rust core
log_info "Step 11: Building axionax core..."
cd "$USER_HOME/axionax-core-universe/core"
sudo -u $ACTUAL_USER sh -c 'source $HOME/.cargo/env && cargo build --release'
log_success "Core built successfully"

# Step 12: Install DeAI dependencies
log_info "Step 12: Installing DeAI dependencies..."
cd "$USER_HOME/axionax-core-universe/core/deai"
sudo -u $ACTUAL_USER sh -c "source $USER_HOME/axionax-env/bin/activate && \
    pip install -r requirements.txt"
log_success "DeAI dependencies installed"

# Step 13: Create worker directories
log_info "Step 13: Creating worker directories..."
sudo -u $ACTUAL_USER mkdir -p "$USER_HOME/axionax-worker"/{config,keys,data,models,logs}
log_success "Worker directories created"

# Step 14: Create activation helper script
log_info "Step 14: Creating activation helper..."
cat > "$USER_HOME/activate-worker.sh" << 'EOF'
#!/bin/bash
# axionax Worker Environment Activation
export PATH=/usr/local/cuda-12.2/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda-12.2/lib64:$LD_LIBRARY_PATH
source $HOME/.cargo/env
source $HOME/axionax-env/bin/activate
echo "✅ axionax Worker environment activated"
echo "🔧 CUDA: $(nvcc --version | grep release | awk '{print $5}')"
echo "🦀 Rust: $(rustc --version)"
echo "🐍 Python: $(python --version)"
EOF

chmod +x "$USER_HOME/activate-worker.sh"
chown $ACTUAL_USER:$ACTUAL_USER "$USER_HOME/activate-worker.sh"
log_success "Activation helper created: $USER_HOME/activate-worker.sh"

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ Installation Complete!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Next steps:"
echo "  1. Reboot the system to load NVIDIA drivers:"
echo "     ${YELLOW}sudo reboot${NC}"
echo ""
echo "  2. After reboot, verify GPU:"
echo "     ${YELLOW}nvidia-smi${NC}"
echo ""
echo "  3. Activate worker environment:"
echo "     ${YELLOW}source ~/activate-worker.sh${NC}"
echo ""
echo "  4. Test PyTorch CUDA:"
echo "     ${YELLOW}python -c 'import torch; print(f\"CUDA: {torch.cuda.is_available()}\")'${NC}"
echo ""
echo "  5. Run training example:"
echo "     ${YELLOW}cd ~/axionax-core-universe/core/examples${NC}"
echo "     ${YELLOW}python deai_simple_training.py${NC}"
echo ""
log_warning "⚠️  IMPORTANT: System reboot required for GPU drivers!"
echo ""
