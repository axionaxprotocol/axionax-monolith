# 🚀 axionax Worker Node - Vertex AI Workbench Setup

**Platform**: Google Cloud Vertex AI Workbench  
**Credit**: $300 GCP Free Credit  
**Time**: 15-20 นาที  
**Date**: 2025-11-25

---

## 📋 ทำไมถึงใช้ Vertex AI Workbench?

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

## 🎯 Part 1: สร้าง Workbench Instance (5 นาที)

### Step 1: เปิด Vertex AI Workbench

```
https://console.cloud.google.com/vertex-ai/workbench/instances
```

หรือจาก GCP Console:
1. Navigation Menu (☰)
2. **Vertex AI** → **Workbench**

### Step 2: Create New Instance

**คลิก "NEW NOTEBOOK"** หรือ **"CREATE NEW"**

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

**คลิก "CREATE"**

⏱️ **รอ 3-5 นาที** ให้ instance สร้างและเริ่มทำงาน

---

## 🔧 Part 2: เริ่มใช้งาน Workbench (2-3 นาที)

### Step 3: เปิด JupyterLab

เมื่อ instance พร้อมแล้ว (สถานะ **RUNNING**):

1. หา instance ชื่อ `axionax-worker-1`
2. คลิก **"OPEN JUPYTERLAB"**
3. JupyterLab จะเปิดใน tab ใหม่

### Step 4: เปิด Terminal

ใน JupyterLab:
1. File → New → **Terminal**
2. Terminal window จะเปิดขึ้นมา

---

## 📦 Part 3: Setup axionax Worker (5-10 นาที)

### Step 5: Verify GPU

```bash
# ตรวจสอบ GPU
nvidia-smi

# ควรเห็น:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 525.xx    Driver Version: 525.xx    CUDA Version: 12.0         |
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# |   0  Tesla T4            Off  | 00000000:00:04.0 Off |                    0 |
# +-----------------------------------------------------------------------------+
```

### Step 6: Verify PyTorch CUDA

```bash
# ทดสอบ PyTorch
python3 -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"

# ควรเห็น:
# PyTorch version: 2.x.x
# CUDA available: True
# GPU: Tesla T4
```

### Step 7: Install Rust (สำหรับ axionax core)

```bash
# ติดตั้ง Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# ตรวจสอบ
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
# Build core (ใช้เวลา 5-10 นาที)
cd ~/axionax-core-universe/core
cargo build --release
```

### Step 10: Install Additional Dependencies

```bash
# DeAI dependencies
cd ~/axionax-core-universe/core/deai
pip install -r requirements.txt

# Additional ML libraries (ถ้ายังไม่มี)
pip install transformers datasets scikit-learn scipy
```

---

## 🧪 Part 4: ทดสอบ Training (5 นาที)

### Step 11: รัน Training Example

```bash
cd ~/axionax-core-universe/core/examples
python deai_simple_training.py
```

**ผลลัพธ์ที่คาดหวัง:**

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

## 📓 Part 5: ใช้งาน Jupyter Notebook (Advanced)

### วิธีสร้าง Notebook สำหรับ Training

1. ใน JupyterLab: **File → New → Notebook**
2. เลือก **Python 3** kernel
3. สร้าง notebook ใหม่

**ตัวอย่าง Notebook:**

```python
# Cell 1: Import และ Setup
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

### ค่าใช้จ่าย Vertex AI Workbench

**n1-standard-4 + T4 GPU:**
- **Running**: ~$0.50/hour
- **Stopped**: ~$0.10/hour (storage only)

### Start/Stop Instance

**จาก Console:**
1. ไปที่ Vertex AI → Workbench
2. เลือก instance
3. คลิก **STOP** หรือ **START**

**จาก CLI:**
```bash
# Stop
gcloud notebooks instances stop axionax-worker-1 \
  --location=us-central1-a

# Start
gcloud notebooks instances start axionax-worker-1 \
  --location=us-central1-a
```

### Auto-Shutdown (ประหยัดเครดิต!)

**ตั้งค่า Auto-shutdown:**
1. เลือก instance
2. คลิก **EDIT**
3. เปิด **Idle shutdown**
4. ตั้งเวลา: **60 minutes** (ถ้าไม่ใช้งาน 1 ชม. = auto stop)
5. **SAVE**

💡 **แนะนำ**: ตั้ง idle shutdown เพื่อไม่ให้เสียเครดิตโดยเปล่าประโยชน์

---

## 📊 การใช้เครดิต $300

### Scenario 1: ใช้งาน 8 ชม./วัน (แนะนำ)
```
Running: 8 hours/day × $0.50 = $4/day
Stopped: 16 hours/day × $0.10 = $1.60/day
Total: $5.60/day = $168/month

เครดิตใช้ได้: 53 วัน (1.8 เดือน)
```

### Scenario 2: ใช้งาน 24/7 พร้อม Auto-shutdown
```
Active: 12 hours/day × $0.50 = $6/day
Idle (auto-stop): 12 hours/day × $0.10 = $1.20/day
Total: $7.20/day = $216/month

เครดิตใช้ได้: 41 วัน (1.4 เดือน)
```

### Scenario 3: ใช้งานตามต้องการ (Manual)
```
Start เมื่อต้องใช้
Stop เมื่อเสร็จ
Average: 4 hours/day

Cost: 4 × $0.50 + 20 × $0.10 = $4/day = $120/month

เครดิตใช้ได้: 75 วัน (2.5 เดือน)
```

---

## 🛠️ Configuration Worker

### สร้าง Worker Config

```bash
mkdir -p ~/axionax-worker/config
nano ~/axionax-worker/config/worker.toml
```

**เนื้อหา:**

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

### สร้าง Directories

```bash
mkdir -p ~/worker-data ~/models ~/logs
```

---

## 🎓 Advanced: Custom Training Jobs

### ตัวอย่าง: Training LLM (Small Model)

สร้าง notebook ใหม่:

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
- [ ] สร้าง Vertex AI Workbench instance
- [ ] เปิด JupyterLab ได้
- [ ] Verify GPU (nvidia-smi)
- [ ] Verify PyTorch CUDA
- [ ] ติดตั้ง Rust
- [ ] Clone axionax repo
- [ ] Build core สำเร็จ
- [ ] รัน training example สำเร็จ

**Configuration:**
- [ ] ตั้งค่า Auto-shutdown
- [ ] สร้าง worker.toml
- [ ] สร้าง worker directories

**Integration:**
- [ ] เชื่อมต่อกับ RPC node (217.216.109.5)
- [ ] สร้าง worker wallet
- [ ] พร้อมรับ DeAI jobs

---

## 🆘 Troubleshooting

### GPU ไม่ทำงาน
```bash
# Restart kernel
# Kernel → Restart Kernel

# หรือ restart instance
gcloud notebooks instances stop axionax-worker-1 --location=us-central1-a
gcloud notebooks instances start axionax-worker-1 --location=us-central1-a
```

### Out of Memory
```bash
# ลด batch size
# เช้น: batch_size=64 แทน 128

# หรือใช้ gradient accumulation
```

### Package ไม่พบ
```bash
# Reinstall ใน terminal
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

1. **รัน Training ทดสอบ**
   - MNIST classification ✅
   - Custom models
   - Distributed training

2. **Connect to axionax Network**
   - Register worker
   - รับ jobs จาก network
   - Submit results

3. **Scale Up**
   - เพิ่ม GPU (A100)
   - Multi-GPU training
   - Distributed workers

---

**Created**: 2025-11-25  
**Platform**: Vertex AI Workbench  
**Status**: ✅ Ready  
**Estimated Time**: 15-20 minutes
