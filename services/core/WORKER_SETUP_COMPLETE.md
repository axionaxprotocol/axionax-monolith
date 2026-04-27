# 🎉 axionax Worker Node - Windows Setup Complete!

**Date**: 2025-11-25  
**Platform**: Windows 11 Pro (Local Machine)  
**Status**: ✅ Ready for Testing

---

## ✅ Installation Summary

### Your System
```
CPU: AMD Ryzen 5 4500
  ├─ 6 Physical Cores
  └─ 12 Logical Threads

GPU: AMD Radeon RX 560
  └─ 4GB VRAM (CPU fallback for now)

RAM: 16GB

OS: Windows 11 Pro

Environment:
  ├─ Python 3.13.7
  ├─ PyTorch 2.9.1 (CPU)
  ├─ Virtual Env: worker-env
  └─ All DeAI dependencies installed ✅
```

---

## 🚀 Quick Start Guide

### 1. Activate Environment

```powershell
cd D:\axionax-core-universe
.\worker-env\Scripts\Activate.ps1
```

### 2. Run Simple Test (Optional)

```powershell
# Quick PyTorch test
python -c "import torch; print(f'PyTorch {torch.__version__} ready!')"

# Or run training test
python core\examples\test_cpu_worker.py
```

### 3. Worker Configuration

Create file `worker-config\worker.toml`:

```toml
[worker]
address = "0xYOUR_WALLET_ADDRESS"  # Generate this
region = "local-thailand"
name = "windows-worker-local-1"
environment = "development"

[hardware]
cpu_model = "AMD Ryzen 5 4500"
cpu_cores = 6
cpu_threads = 12
ram = 16
gpu_model = "AMD Radeon RX 560 (CPU mode)"
vram = 4

[network]
# Connect to your RPC node
rpc_url = "http://217.216.109.5:8545"
ws_url = "ws://217.216.109.5:8546"

[performance]
# Conservative for CPU-only
popc_pass_rate = 0.85
da_reliability = 0.90
target_uptime = 0.95
batch_size = 32

[storage]
data_dir = "D:\\axionax-worker\\data"
models_dir = "D:\\axionax-worker\\models"
logs_dir = "D:\\axionax-worker\\logs"
```

### 4. Create Directories

```powershell
mkdir D:\axionax-worker\data
mkdir D:\axionax-worker\models
mkdir D:\axionax-worker\logs
```

---

## 📊 Performance Expectations

### CPU vs GPU Training

| Task | CPU (Your System) | NVIDIA T4 (Cloud) |
|------|-------------------|-------------------|
| **MNIST (60k images)** | ~5-10 min/epoch | ~1-2 min/epoch |
| **Small Model Training** | ✅ Suitable | ⚡ Fast |
| **Large Models (LLM)** | ⚠️ Slow | ✅ Suitable |

**Your System Best For:**
- ✅ Development & Testing
- ✅ Small to medium models
- ✅ Learning & Experimentation
- ✅ No cost! 🎉

**When to Use Cloud:**
- Large model training (>1B parameters)
- Production workloads
- Time-sensitive tasks
- Need for GPU acceleration

---

## 🔧 Available Commands

```powershell
# Activate environment
.\worker-env\Scripts\Activate.ps1

# Run training example
python core\examples\test_cpu_worker.py

# Test DeAI components
cd core\deai
python asr.py  # Test Auto Selection Router

# Check installed packages
pip list | grep torch

# Deactivate when done
deactivate
```

---

## 🌐 Connect to axionax Network

### Test RPC Connection

```powershell
# Test connection to your RPC node
curl http://217.216.109.5:8545 -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json"
```

### Register Worker (Future)

```powershell
# When ready to register
cd core
cargo run --bin worker-register -- --config ../worker-config/worker.toml
```

---

## 💡 Tips & Tricks

### Optimize CPU Performance

```powershell
# Set CPU affinity (example)
$process = Get-Process python
$process.ProcessorAffinity = 0x3F  # Use all 6 cores

# Monitor performance
Get-Process python | Format-Table Name,CPU,WorkingSet -AutoSize
```

### Save Resources

- Close other applications when training
- Use smaller batch sizes (32-64)
- Start with fewer epochs (2-3 for testing)

### When to Stop/Start

```powershell
# Save your work frequently
# Stop training: Ctrl+C
# Virtual env persists - just reactivate when needed
```

---

## 📁 Project Structure

```
D:\axionax-core-universe\
├── worker-env\              # Virtual environment ✅
├── core\
│   ├── deai\               # DeAI components
│   └── examples\
│       ├── test_cpu_worker.py      # Training test
│       └── test_amd_gpu.py         # GPU test
├── worker-config\          # Your config (create this)
│   └── worker.toml
└── ops\deploy\
    ├── WORKER_LOCAL_WINDOWS_AMD.md  # Full guide
    └── ...

D:\axionax-worker\          # Worker data (create this)
├── data\
├── models\
└── logs\
```

---

## ✅ What's Working

- ✅ Python 3.13.7 installed
- ✅ Virtual environment created
- ✅ PyTorch 2.9.1 with CPU support
- ✅ All ML libraries (numpy, pandas, sklearn, etc.)
- ✅ DeAI dependencies (122 packages)
- ✅ System ready for training

---

## 🎯 Next Steps

**Immediate (5-10 minutes):**
1. Create `worker-config\worker.toml`
2. Create data directories
3. Test basic PyTorch operation

**Soon (when ready):**
4. Run training test
5. Connect to RPC node (217.216.109.5)
6. Submit test job to network

**Future:**
7. Consider cloud GPU for production
8. Scale to multiple workers
9. Contribute to testnet!

---

## 🆘 Troubleshooting

**Issue: Virtual environment won't activate**
```powershell
# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Issue: PyTorch import error**
```powershell
# Reinstall in virtual env
.\worker-env\Scripts\Activate.ps1
pip install --force-reinstall torch
```

**Issue: Out of memory**
```powershell
# Reduce batch size in training scripts
# Edit: batch_size = 16  # Instead of 32 or 64
```

---

## 📞 Support

- **Documentation**: `ops\deploy\WORKER_LOCAL_WINDOWS_AMD.md`
- **Training Examples**: `core\examples\`
- **DeAI Code**: `core\deai\`

---

## 🎊 Congratulations!

**Your Windows machine is now an axionax Worker Node!**

This machine is ready for:
- ✅ Development & Testing
- ✅ Small model training
- ✅ Learning DeAI concepts
- ✅ Testnet participation (when ready)

**Total Cost: $0** (using existing hardware) 💰

You can start testing right away, or wait for a cloud GPU when needed!

---

**Status**: ✅ **READY TO USE**  
**Created**: 2025-11-25  
**Next**: Create config & test! 🚀
