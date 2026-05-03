# Worker Setup Guide

> **Complete guide to setting up an Axionax compute worker node**

**Last Updated**: May 3, 2026  
**Protocol Version**: v1.9.0-testnet

---

## Overview

This guide covers setting up a worker node on the Axionax Compute Marketplace. Workers receive compute jobs (Inference, Training, DataProcessing) from the marketplace and submit results with PoPC proofs.

**Primary Reference**: See [`../architecture/AXIONAX_PROTOCOL.md`](../architecture/AXIONAX_PROTOCOL.md) for complete protocol architecture, including:
- Core workflow: Post → Assign → Execute → Commit → DA Pre-commit → Wait k → Challenge → Prove → Verify → Seal → Fraud Window → Finalize
- ASR (Auto-Selection Router) with K=64 and weighted VRF
- PoPC (Proof of Probabilistic Checking) with s=1000 samples
- Data Availability requirements
- Security and anti-fraud mechanisms

**Prerequisites:**
- Python 3.9+
- Docker (optional, for sandboxing)
- GPU/NPU (optional, for accelerated compute)
- Access to Axionax RPC endpoint

---

## Worker Types

| Type | Hardware | Tier | Use Case |
|------|----------|------|----------|
| **PC / Laptop** | CPU / AMD / NVIDIA GPU | 1 | Light Inference, Testing |
| **Cloud GPU** | RunPod A40, GCP, Vertex AI | 2 | Heavy Training / Inference |
| **Monolith MK-I Sentinel** | RPi 5 + Hailo #0 | 3 | Security / Vision |
| **Monolith MK-I Worker** | RPi 5 + Hailo #1 | 3 | General compute |
| **Monolith MK-II** | Optical (future) | 3 | Photonic compute |

---

## Hardware Requirements

### Tier 1 - PC / Laptop (Edge)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16 GB |
| **GPU** | Optional (4 GB VRAM) | NVIDIA / AMD 8 GB+ |
| **Storage** | 50 GB | 100 GB SSD |
| **Network** | 10 Mbps | 50 Mbps |

### Tier 2 - Cloud GPU (Server)

| Component | RunPod A40 | GCP T4 | Vertex AI |
|-----------|------------|--------|-----------|
| **GPU** | A40 48 GB | T4 16 GB | T4/V100 16 GB+ |
| **CPU** | 8 vCPU | 4 vCPU | 4 vCPU |
| **RAM** | 32 GB | 15 GB | 15 GB |
| **Storage** | 100 GB | 100 GB | 100 GB |

### Tier 3 - Monolith MK-I

| Component | Sentinel | Worker |
|-----------|----------|--------|
| **Base** | RPi 5 8 GB | RPi 5 8 GB |
| **NPU** | Hailo #0 (Vision) | Hailo #1 (Compute) |
| **Storage** | 64 GB | 64 GB |
| **Power** | 15–25 W | 15–25 W |

---

## Quick Start (Python)

### 1. Install Dependencies

```bash
# Clone repository
git clone https://github.com/axionaxprotocol/axionax-monolith.git
cd axionax-monolith/services/core

# Install Python dependencies
pip install -r requirements.txt

# Install ML frameworks (optional)
pip install torch torchvision  # PyTorch
# or
pip install tensorflow tensorflow-gpu  # TensorFlow
```

### 2. Configure Worker

Create `worker-config.yaml`:

```yaml
worker:
  private_key: "YOUR_PRIVATE_KEY_HERE"
  rpc_url: "http://testnet.axionax.org:8545"  # or local RPC

  # Hardware specs
  device: "cuda"  # or "cpu", "hailo0", "hailo1"
  gpu: "NVIDIA RTX 4090"  # or null for CPU/NPU
  cpu_cores: 16
  ram_gb: 64
  storage_gb: 1000

  # Capabilities (see AXIONAX_PROTOCOL.md for ASR scoring)
  compute_type: "SILICON"  # SILICON, NPU, PHOTONIC, HYBRID
  hardware_tier: 2  # 1 (PC), 2 (Cloud), 3 (Monolith)
  optical_bridge_available: false

  # Job limits
  max_memory_mb: 64000
  max_timeout_s: 3600

  # Features
  sandbox_enabled: true
  model_cache_enabled: true
  tensor_cores_enabled: true

  # Supported frameworks
  frameworks:
    - "pytorch"
    - "tensorflow"
```

**Note**: ASR (Auto-Selection Router) uses these specs for job assignment. See [`../architecture/AXIONAX_PROTOCOL.md#2-asr--auto-selection-router`](../architecture/AXIONAX_PROTOCOL.md#2-asr--auto-selection-router) for details on scoring and eligibility.

### 3. Register Worker

```bash
python worker_node.py register --config worker-config.yaml
```

### 4. Start Worker

```bash
python worker_node.py start --config worker-config.yaml
```

---

## Monolith MK-I Setup

### Hardware

- Raspberry Pi 5 (8 GB RAM)
- Hailo-10H AI Accelerator
- 64 GB microSD card
- 15-25W power supply

### 1. Flash OS

```bash
# Flash Raspberry Pi OS to SD card
# Enable SSH on boot
# Set hostname to axionax-sentinel or axionax-worker
```

### 2. Install Hailo SDK

```bash
# Add Hailo apt repository
wget https:// hailo.ai/hailo-apt-repo.sh
chmod +x hailo-apt-repo.sh
sudo ./hailo-apt-repo.sh

# Install Hailo runtime
sudo apt-get install hailo-runtime
```

### 3. Configure Worker

Create `monolith-worker-config.yaml`:

```yaml
worker:
  private_key: "YOUR_PRIVATE_KEY_HERE"
  rpc_url: "http://testnet.axionax.org:8545"
  
  device: "hailo1"  # hailo0 for Sentinel, hailo1 for Worker
  gpu: null
  cpu_cores: 4
  ram_gb: 8
  storage_gb: 64
  
  compute_type: "NPU"
  hardware_tier: 3
  optical_bridge_available: false
  
  max_memory_mb: 8000
  max_timeout_s: 1800
  
  sandbox_enabled: false  # Not needed on Monolith
  model_cache_enabled: true
  
  frameworks:
    - "hailo"
```

### 4. Start Worker

```bash
python3 worker_node.py start --config monolith-worker-config.yaml
```

---

## Cloud GPU Setup (RunPod)

### 1. Create RunPod Account

1. Sign up at [runpod.io](https://runpod.io)
2. Add funds to account
3. Select GPU template (e.g., NVIDIA A40 48GB)

### 2. Deploy Template

```yaml
# RunPod template
docker:
  image: axionax/worker:latest
  env:
    - WORKER_PRIVATE_KEY=YOUR_PRIVATE_KEY
    - RPC_URL=http://testnet.axionax.org:8545
    - DEVICE=cuda
    - COMPUTE_TYPE=SILICON
    - HARDWARE_TIER=2
```

### 3. Connect to Pod

```bash
# SSH into RunPod pod
ssh root@<pod-ip>

# Start worker
python worker_node.py start
```

---

## Job Submission and Execution

**Protocol Workflow**: Workers participate in the core workflow defined in [`../architecture/AXIONAX_PROTOCOL.md#1-core-workflow-v15-ไม่มีประมูล`](../architecture/AXIONAX_PROTOCOL.md#1-core-workflow-v15-ไม่มีประมูล):
1. Assign (via ASR) → 2. Execute → 3. Commit + DA Pre-commit → 4. Wait k → 5. Challenge → 6. Prove → 7. Verify

### 1. Receive Job

Workers automatically poll the marketplace for new jobs:

```python
# worker_node.py
while True:
    jobs = marketplace.get_available_jobs(specs)
    if jobs:
        for job in jobs:
            accept_and_execute(job)
    time.sleep(10)
```

### 2. Execute Job

```python
# Load model
model = load_model(job.model_id)

# Run inference
result = model.predict(job.input_data)

# Generate PoPC proof (s=1000 samples)
# See AXIONAX_PROTOCOL.md#4-popc--proof-of-probabilistic-checking for details
proof = popc.generate_proof(
    job_id=job.id,
    samples=job.samples,
    output=result
)

# Submit result
marketplace.submit_result(job.id, result, proof)
```

### 3. Monitor Jobs

```bash
# Check worker status
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "axn_getWorkerStatus",
    "params": ["0xWORKER_ADDRESS"],
    "id": 1
  }'

# Check job status
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "axn_getJobStatus",
    "params": ["job_abc123"],
    "id": 1
  }'
```

---

## Monitoring

### Metrics

Worker exposes metrics on port 9616:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'axionax-worker'
    static_configs:
      - targets: ['localhost:9616']
```

### Logs

```bash
# View worker logs
tail -f /var/log/axionax/worker.log

# Filter for specific job
grep "job_abc123" /var/log/axionax/worker.log
```

### Performance Tracking

- Total jobs completed
- Success rate
- Average latency
- PoPC pass rate
- Reputation score

---

## Troubleshooting

### Worker Not Receiving Jobs

```bash
# Check worker is registered
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "axn_getWorkerStatus",
    "params": ["0xWORKER_ADDRESS"],
    "id": 1
  }'

# Check marketplace connection
python worker_node.py check-connection
```

### GPU Not Detected

```bash
# Check NVIDIA GPU
nvidia-smi

# Check PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"

# Check device in config
# Ensure device: "cuda" is set correctly
```

### PoPC Validation Failing

```bash
# Check sampling parameters
# Ensure s=1000 samples are being used

# Verify output hash calculation
python -c "import hashlib; print(hashlib.sha256(b'test').hexdigest())"

# Check merkle proof generation
# Verify merkle_paths are correctly formatted
```

### Out of Memory

```bash
# Reduce batch size in model
# Increase max_memory_mb in config

# Clear GPU cache
import torch
torch.cuda.empty_cache()
```

---

## Security Best Practices

1. **Private Key Security**
   - Never commit private keys to git
   - Use environment variables
   - Rotate keys periodically

2. **Sandboxing**
   - Enable Docker sandbox for untrusted jobs
   - Use network isolation
   - Limit resource usage

3. **Model Security**
   - Verify model sources
   - Scan for malicious models
   - Use model signing

4. **Network Security**
   - Use VPN for cloud deployments
   - Enable firewall rules
   - Monitor for suspicious activity

---

## Earning Rewards

Workers earn rewards for:
- Successfully completing jobs
- High PoPC pass rate
- Low latency
- High reputation

Rewards are distributed per epoch based on:
- Number of jobs completed
- Job difficulty
- Worker performance metrics

---

## Upgrading

```bash
# Stop worker
python worker_node.py stop

# Update code
git pull
pip install -r requirements.txt

# Restart worker
python worker_node.py start
```

---

## See Also

**Primary Protocol Reference:**
- [AXIONAX_PROTOCOL.md](../architecture/AXIONAX_PROTOCOL.md) — Complete protocol architecture, ASR, PoPC, DA, security

**Additional Resources:**
- [Marketplace Worker Nodes](../../services/core/core/docs/MARKETPLACE_WORKER_NODES.md)
- [Node Hardware Specs](../../services/core/core/docs/NODE_SPECS.md)
- [JSON-RPC API](../api/JSON_RPC.md)
- [Glossary](../glossary.md)

---

_Last updated: May 3, 2026_
