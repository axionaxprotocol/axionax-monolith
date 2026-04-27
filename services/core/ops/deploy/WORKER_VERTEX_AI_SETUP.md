# 🚀 axionax Worker Node - Vertex AI Workbench Setup

**Platform**: Google Cloud Vertex AI Workbench  
**Credit**: $300 GCP Free Credit  
**Time**: 15-20 minutes  
**Date**: 2025-11-25

---

## 📋 Why Use Vertex AI Workbench?

✅ **Pre-installed ML Stack**
- PyTorch, TensorFlow, Keras
- Jupyter Notebook/Lab
- CUDA drivers & toolkit
- Common ML libraries

✅ **Managed Service**
- Auto-configured GPU
- One-click setup
- Easy start/stop
- Integrated with GCP

✅ **Cost Effective**
- Same pricing as Compute Engine
- Auto-shutdown when idle
- Pay-per-use

---

## 🎯 Part 1: Create Workbench Instance (5 minutes)

### Step 1: Open Vertex AI Workbench

```
https://console.cloud.google.com/vertex-ai/workbench/instances
```

Or from the GCP Console:
1. Navigation Menu (☰)
2. **Vertex AI** → **Workbench**

### Step 2: Create New Instance

**Click "NEW NOTEBOOK"** or **"CREATE NEW"**

#### 📝 Configuration

**Framework & Environment:**
```
Environment: PyTorch 2.0+ (or latest)
Framework: PyTorch with CUDA
Operating System: Debian 11 (or Ubuntu 20.04)
```

**Instance Details:**
```
Name: axionax-worker-1
Region: us-central1
Zone: us-central1-a
```

**Machine Configuration:**
```
Machine type: n1-standard-4
  - 4 vCPU
  - 15 GB memory
```

**GPU Configuration:**
```
GPU type: NVIDIA Tesla T4
Number of GPUs: 1
```

**Storage:**
```
Boot disk size: 100 GB
Boot disk type: Balanced persistent disk
```

**Click "CREATE"**

⏱️ **Wait 3-5 minutes** for the instance to be created and start running

---

## 🔧 Part 2: Getting Started with Workbench (2-3 minutes)

### Step 3: Open JupyterLab

When the instance is ready (status **RUNNING**):

1. Find the instance named `axionax-worker-1`
2. Click **"OPEN JUPYTERLAB"**
3. JupyterLab will open in a new tab

### Step 4: Open Terminal

In JupyterLab:
1. File → New → **Terminal**
2. A terminal window will open

---

## 📦 Part 3: Setup axionax Worker (5-10 minutes)

### Step 5: Verify GPU

```bash
# Verify GPU
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 525.xx    Driver Version: 525.xx    CUDA Version: 12.0         |
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# |   0  Tesla T4            Off  | 00000000:00:04.0 Off |                    0 |
# +-----------------------------------------------------------------------------+
```

### Step 6: Verify PyTorch CUDA

```bash
# Test PyTorch
python3 -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"

# Expected output:
# PyTorch version: 2.x.x
# CUDA available: True
# GPU: Tesla T4
```

### Step 7: Install Rust (for axionax core)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Verify
rustc --version
cargo --version
```

### Step 8: Clone axionax Repository

```bash
# Clone repo
cd ~
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe
```

### Step 9: Build axionax Core

```bash
# Build core (takes 5-10 minutes)
cd ~/axionax-core-universe/core
cargo build --release
```

### Step 10: Install Additional Dependencies

```bash
# DeAI dependencies
cd ~/axionax-core-universe/core/deai
pip install -r requirements.txt

# Additional ML libraries (if not already installed)
pip install transformers datasets scikit-learn scipy
```

---

## 🧪 Part 4: Test Training (5 minutes)

### Step 11: Run Training Example

```bash
cd ~/axionax-core-universe/core/examples
python deai_simple_training.py
```

**Expected output:**

```
🚀 axionax DeAI - Simple Training Example
============================================================

📋 Job Configuration:
  job_id: deai_training_20251125_120000
  task_type: image_classification
  model: SimpleCNN
  dataset: MNIST
  batch_size: 128
  epochs: 5
  learning_rate: 0.001
  optimizer: Adam
  device: cuda

🔧 Using device: cuda
🎮 GPU: Tesla T4
💾 GPU Memory: 15.36 GB

📦 Loading MNIST dataset...
Downloading...
✅ Training samples: 60000
✅ Test samples: 10000

🏗️  Initializing model...
✅ Model parameters: 431,080

🎓 Starting training...

📚 Epoch 1/5
  Batch 0/469, Loss: 2.3026, Acc: 12.50%
  Batch 100/469, Loss: 0.3214, Acc: 85.71%
  Batch 200/469, Loss: 0.2145, Acc: 91.23%
  Batch 300/469, Loss: 0.1567, Acc: 93.45%
  Batch 400/469, Loss: 0.1234, Acc: 94.67%

  📊 Epoch 1 Summary:
    Train Loss: 0.2845, Train Acc: 91.23%
    Test Loss:  0.1234, Test Acc:  96.12%
    Time: 18.45s
    GPU Memory: 0.85 GB

📚 Epoch 2/5
  ...

📚 Epoch 5/5
  📊 Epoch 5 Summary:
    Train Loss: 0.0456, Train Acc: 98.45%
    Test Loss:  0.0378, Test Acc:  98.67%
    Time: 17.89s
    GPU Memory: 0.85 GB

============================================================
✅ Training Complete!
============================================================
⏱️  Total training time: 92.34s
📈 Final test accuracy: 98.67%
💾 Results saved to: training_results_20251125_120000.json
🎯 Model saved to: model_20251125_120000.pth
```

---

## 📓 Part 5: Using Jupyter Notebook (Advanced)

### How to Create a Notebook for Training

1. In JupyterLab: **File → New → Notebook**
2. Select **Python 3** kernel
3. Create a new notebook

**Example Notebook:**

```python
# Cell 1: Import and Setup
import torch
import sys
sys.path.append('/home/jupyter/axionax-core-universe/core/examples')

from deai_simple_training import SimpleCNN, train_epoch, test
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import torch.nn as nn
import torch.optim as optim

# Check GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
```

```python
# Cell 2: Load Data
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,))
])

train_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
test_dataset = datasets.MNIST('./data', train=False, transform=transform)

train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=128, shuffle=False)
```

```python
# Cell 3: Train Model
model = SimpleCNN().to(device)
optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

for epoch in range(5):
    train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, epoch)
    test_loss, test_acc = test(model, test_loader, criterion)
    
    print(f"Epoch {epoch+1}: Train Acc={train_acc:.2f}%, Test Acc={test_acc:.2f}%")
```

```python
# Cell 4: Monitor GPU
!nvidia-smi
```

---

## 💰 Cost Management

### Vertex AI Workbench Costs

**n1-standard-4 + T4 GPU:**
- **Running**: ~$0.50/hour
- **Stopped**: ~$0.10/hour (storage only)

### Start/Stop Instance

**From Console:**
1. Go to Vertex AI → Workbench
2. Select the instance
3. Click **STOP** or **START**

**From CLI:**
```bash
# Stop
gcloud notebooks instances stop axionax-worker-1 \
  --location=us-central1-a

# Start
gcloud notebooks instances start axionax-worker-1 \
  --location=us-central1-a
```

### Auto-Shutdown (save credit!)

**Configure Auto-shutdown:**
1. Select the instance
2. Click **EDIT**
3. Enable **Idle shutdown**
4. Set time: **60 minutes** (auto stop after 1 hour of inactivity)
5. **SAVE**

💡 **Recommended**: Enable idle shutdown to avoid wasting credit

---

## 📊 Using $300 Credit

### Scenario 1: 8 hrs/day usage (recommended)
```
Running: 8 hours/day × $0.50 = $4/day
Stopped: 16 hours/day × $0.10 = $1.60/day
Total: $5.60/day = $168/month

Credit lasts: 53 days (1.8 months)
```

### Scenario 2: 24/7 with Auto-shutdown
```
Active: 12 hours/day × $0.50 = $6/day
Idle (auto-stop): 12 hours/day × $0.10 = $1.20/day
Total: $7.20/day = $216/month

Credit lasts: 41 days (1.4 months)
```

### Scenario 3: On-demand usage (Manual)
```
Start when needed
Stop when done
Average: 4 hours/day

Cost: 4 × $0.50 + 20 × $0.10 = $4/day = $120/month

Credit lasts: 75 days (2.5 months)
```

---

## 🛠️ Configuration Worker

### Create Worker Config

```bash
mkdir -p ~/axionax-worker/config
nano ~/axionax-worker/config/worker.toml
```

**Content:**

```toml
[worker]
address = "0xYOUR_WALLET_ADDRESS"
region = "us-central1"
name = "vertexai-worker-1"
environment = "vertex-ai-workbench"

[hardware]
gpu_model = "NVIDIA Tesla T4"
vram = 16
cpu_cores = 4
ram = 15

[network]
rpc_url = "http://217.216.109.5:8545"
ws_url = "ws://217.216.109.5:8546"

[performance]
popc_pass_rate = 0.95
da_reliability = 0.98
target_uptime = 0.99

[storage]
data_dir = "/home/jupyter/worker-data"
models_dir = "/home/jupyter/models"
logs_dir = "/home/jupyter/logs"
```

### Create Directories

```bash
mkdir -p ~/worker-data ~/models ~/logs
```

---

## 🎓 Advanced: Custom Training Jobs

### Example: Training LLM (Small Model)

Create a new notebook:

```python
# Install transformers
!pip install transformers datasets

# Import
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments
from datasets import load_dataset

# Load small model
model_name = "gpt2"  # Small model for testing
model = AutoModelForCausalLM.from_pretrained(model_name).to("cuda")
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Load dataset
dataset = load_dataset("wikitext", "wikitext-2-raw-v1")

# Training arguments
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=1,
    per_device_train_batch_size=4,
    save_steps=1000,
    logging_steps=100,
    fp16=True,  # Use mixed precision for faster training
)

# Train
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
)

trainer.train()
```

---

## ✅ Checklist

**Setup:**
- [ ] Create Vertex AI Workbench instance
- [ ] Open JupyterLab successfully
- [ ] Verify GPU (nvidia-smi)
- [ ] Verify PyTorch CUDA
- [ ] Install Rust
- [ ] Clone axionax repo
- [ ] Build core successfully
- [ ] Run training example successfully

**Configuration:**
- [ ] Configure Auto-shutdown
- [ ] Create worker.toml
- [ ] Create worker directories

**Integration:**
- [ ] Connect to RPC node (217.216.109.5)
- [ ] Create worker wallet
- [ ] Ready to receive DeAI jobs

---

## 🆘 Troubleshooting

### GPU Not Working
```bash
# Restart kernel
# Kernel → Restart Kernel

# Or restart instance
gcloud notebooks instances stop axionax-worker-1 --location=us-central1-a
gcloud notebooks instances start axionax-worker-1 --location=us-central1-a
```

### Out of Memory
```bash
# Reduce batch size
# e.g.: batch_size=64 instead of 128

# Or use gradient accumulation
```

### Package Not Found
```bash
# Reinstall in terminal
pip install --upgrade torch torchvision torchaudio
```

---

## 📚 Resources

**Vertex AI Docs:**
- [Workbench Overview](https://cloud.google.com/vertex-ai/docs/workbench)
- [Pre-built Containers](https://cloud.google.com/vertex-ai/docs/workbench/reference/container-images)

**axionax Docs:**
- Full Setup: `gcp-worker-setup.md`
- Training Example: `core/examples/deai_simple_training.py`
- Quick Guide: `WORKER_SETUP_QUICK_GUIDE.md`

---

## 🎯 Next Steps

1. **Run Test Training**
   - MNIST classification ✅
   - Custom models
   - Distributed training

2. **Connect to axionax Network**
   - Register worker
   - Receive jobs from network
   - Submit results

3. **Scale Up**
   - Upgrade GPU (A100)
   - Multi-GPU training
   - Distributed workers

---

**Created**: 2025-11-25  
**Platform**: Vertex AI Workbench  
**Status**: ✅ Ready  
**Estimated Time**: 15-20 minutes
