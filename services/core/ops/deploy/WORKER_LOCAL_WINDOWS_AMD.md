# axionax Worker Node - Local Windows Setup Guide

**Platform**: Windows with AMD GPU  
**GPU**: AMD Radeon RX 560 (4GB VRAM)  
**CPU**: AMD Ryzen 5 4500 (6 cores/12 threads)  
**Date**: 2025-11-25

---

## ✅ System Verification

### Your System Specs:
```
CPU: AMD Ryzen 5 4500
  - 6 Physical Cores
  - 12 Logical Processors
  
GPU: AMD Radeon RX 560 Series
  - VRAM: 4GB (4,293,918,720 bytes)
  
Software:
  ✅ Python 3.13.7
  ✅ Cargo 1.91.1
  ✅ Git (available)
```

**Conclusion**: ✅ **This machine is ready to be used as a Worker Node!**

---

## 🎯 Setup Strategy for AMD GPU

### AMD GPU Support Options:

#### Option 1: PyTorch with DirectML ⭐ **Recommended for Windows**
- Uses DirectML (Microsoft)
- Supports AMD GPU on Windows
- Easy to install
- Performance is sufficient for testing

#### Option 2: PyTorch CPU-only
- Uses CPU only
- Slower than GPU but still functional
- Stable

#### Option 3: ROCm (Linux only)
- Best performance for AMD
- Requires Linux/WSL2

---

## 📦 Installation Steps

### Step 1: Virtual Environment

```powershell
# Create virtual environment
cd d:\axionax-core-universe
python -m venv worker-env

# Activate
.\worker-env\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip
```

### Step 2: Install PyTorch with DirectML

```powershell
# Install PyTorch-DirectML
pip install torch-directml

# Install other ML libraries
pip install numpy pandas scikit-learn scipy matplotlib
```

### Step 3: Install DeAI Dependencies

```powershell
# Navigate to deai folder
cd core\deai

# Install requirements
pip install -r requirements.txt
```

### Step 4: Verify Installation

```powershell
# Test PyTorch DirectML
python -c "import torch_directml; print(f'DirectML available: {torch_directml.is_available()}'); print(f'Device: {torch_directml.device()}')"
```

---

## 🧪 Test Training

### Quick Test Script

Create file `test_amd_gpu.py`:

```python
import torch_directml
import torch
import torch.nn as nn
import numpy as np
import time

print(f"DirectML available: {torch_directml.is_available()}")

# Set device
dml = torch_directml.device()
print(f"Device: {dml}")

# Simple test
print("\n🧪 Running simple GPU test...")

# Create random data
x = torch.randn(1000, 100).to(dml)
y = torch.randn(1000, 10).to(dml)

# Simple model
model = nn.Sequential(
    nn.Linear(100, 256),
    nn.ReLU(),
    nn.Linear(256, 10)
).to(dml)

optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.MSELoss()

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
print(f"⚡ Using AMD GPU with DirectML")
```

Run the test:
```powershell
python test_amd_gpu.py
```

---

## 🚀 Run DeAI Training Example

### Modified for DirectML

Create file `deai_training_amd.py`:

```python
"""
axionax DeAI Training - AMD GPU Version
"""

import torch_directml
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import time
from datetime import datetime
import json

# Setup DirectML device
dml = torch_directml.device()
print(f"🔧 Using device: {dml}")

# Model
class SimpleCNN(nn.Module):
    def __init__(self):
        super(SimpleCNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(64 * 7 * 7, 128)
        self.fc2 = nn.Linear(128, 10)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.25)
    
    def forward(self, x):
        x = self.pool(self.relu(self.conv1(x)))
        x = self.pool(self.relu(self.conv2(x)))
        x = x.view(-1, 64 * 7 * 7)
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x

# Data
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,))
])

print("📦 Loading MNIST dataset...")
train_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
test_dataset = datasets.MNIST('./data', train=False, transform=transform)

train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)  # Smaller batch for AMD
test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)

# Model setup
model = SimpleCNN().to(dml)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Training
epochs = 3  # Fewer epochs for testing
print(f"\n🎓 Starting training for {epochs} epochs...\n")

for epoch in range(epochs):
    model.train()
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(dml), target.to(dml)
        
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
        
        if batch_idx % 100 == 0:
            print(f'Epoch {epoch+1}/{epochs}, Batch {batch_idx}/{len(train_loader)}, Loss: {loss.item():.4f}')
    
    # Test
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(dml), target.to(dml)
            output = model(data)
            _, predicted = output.max(1)
            total += target.size(0)
            correct += predicted.eq(target).sum().item()
    
    accuracy = 100. * correct / total
    print(f"Epoch {epoch+1} - Test Accuracy: {accuracy:.2f}%\n")

print("✅ Training complete!")
```

Run:
```powershell
python deai_training_amd.py
```

---

## 🔧 Configure Worker Node

### Create Worker Config

```powershell
mkdir worker-config
notepad worker-config\worker.toml
```

Content of `worker.toml`:

```toml
[worker]
address = "0xYOUR_WALLET_ADDRESS"
region = "local"
name = "windows-amd-worker-1"
environment = "local-windows"

[hardware]
gpu_model = "AMD Radeon RX 560"
vram = 4
cpu_cores = 6
cpu_threads = 12
ram = 16  # Adjust to your actual RAM

[network]
rpc_url = "http://217.216.109.5:8545"
ws_url = "ws://217.216.109.5:8546"

[performance]
popc_pass_rate = 0.90  # Lower for AMD GPU
da_reliability = 0.95
target_uptime = 0.95

[storage]
data_dir = "D:\\axionax-worker\\data"
models_dir = "D:\\axionax-worker\\models"
logs_dir = "D:\\axionax-worker\\logs"
```

---

## ⚠️ AMD GPU Considerations

### Performance vs NVIDIA T4:

| Feature | AMD RX 560 | NVIDIA T4 |
|---------|------------|-----------|
| **VRAM** | 4GB | 16GB |
| **Performance** | ~2.6 TFLOPS | ~8.1 TFLOPS |
| **Speed** | ~30% of T4 | Baseline |
| **Support** | DirectML | CUDA (native) |

**Summary**:
- ✅ Usable for testing
- ⚠️ ~3x slower than NVIDIA
- ⚠️ Less VRAM (4GB vs 16GB)
- ✅ No cost!

### Recommendations:
1. **Batch size**: Use 32-64 (instead of 128)
2. **Model size**: Start with small models
3. **Epochs**: Test with 3-5 epochs first
4. **Purpose**: Use for development/testing

---

## 📊 Monitoring

### Resources Monitor

```powershell
# CPU/RAM
Get-Process python | Format-Table Name, CPU, WorkingSet -AutoSize

# GPU (if AMD Software installed)
# Check AMD Radeon Software
```

---

## ✅ Next Steps

1. **Install Dependencies** (10 min)
2. **Test DirectML** (5 min)
3. **Run Training Example** (15 min)
4. **Configure Worker** (5 min)
5. **Connect to axionax Network** (Later)

---

## 💡 Tips

### Optimize Performance:
- Close other applications during training
- Use small batch sizes (32-64)
- Monitor temperature

### When to Upgrade:
- For production: consider an NVIDIA GPU
- For scaling: use cloud (GCP/AWS)
- Local = perfect for development!

---

**Created**: 2025-11-25  
**Platform**: Windows + AMD GPU  
**Status**: Ready to Setup 🚀
