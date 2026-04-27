# 🚀 RunPod A40 Worker - Quick Start

Set up a RunPod A40 GPU as a worker node for the axionax testnet in 3 steps

## ⚡ Quick Setup (20 minutes)

### 1. Deploy RunPod Instance
- Go to https://www.runpod.io/
- Select **NVIDIA A40** (48GB VRAM)
- Template: **RunPod PyTorch 2.1**
- Container Disk: **50GB**, Volume: **100GB**
- Deploy!

### 2. SSH into Pod
```bash
# Copy SSH command from RunPod Console:
# "Connect" → "SSH" → copy command

# Example:
ssh root@abc123.runpod.io -p 22456 -i ~/. ssh/id_ed25519_runpod
```

### 3. Run Setup Script
```bash
# Download and run setup script
wget https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/ops/deploy/scripts/setup-runpod-worker.sh
chmod +x setup-runpod-worker.sh
./setup-runpod-worker.sh
```

The script will install everything automatically:
- ✅ Rust toolchain
- ✅ axionax core
- ✅ DeAI dependencies
- ✅ Worker configuration
- ✅ Helper scripts

### 4. Configure Wallet
```bash
# Edit worker config
nano /workspace/axionax-worker/config/worker.toml

# Edit this line:
address = "0xYOUR_WALLET_ADDRESS_HERE"
# Change to your wallet address
```

### 5. Start Worker
```bash
# Start worker in tmux
tmux new -s axionax-worker
~/start-worker.sh

# Detach: Press Ctrl+B then D
# Re-attach: tmux attach -t axionax-worker
```

✅ **Done!** The worker is running and ready to receive jobs from the testnet

---

## 📊 Monitoring

```bash
# View GPU status
nvidia-smi

# Monitor worker
~/monitor-worker.sh

# View logs
tail -f /workspace/axionax-worker/logs/worker.log
```

---

## 💡 Tips

**Save costs:**
- Use **Spot Instance** (40% cheaper)
- Stop pod when not in use
- Data is safe in `/workspace` (persistent volume)

**Performance:**
- A40 = 48GB VRAM
- Equivalent to 3x T4
- Suitable for large models

---

## 📚 Full Documentation

For more details:
- **Full Guide**: [`WORKER_RUNPOD_A40_SETUP.md`](WORKER_RUNPOD_A40_SETUP.md)
- **General Setup**: [`WORKER_SETUP_QUICK_GUIDE.md`](WORKER_SETUP_QUICK_GUIDE.md)

---

**Platform**: RunPod.io  
**GPU**: NVIDIA A40 (48GB)  
**Cost**: ~$0.44-0.79/hour  
**Setup Time**: 20 minutes
