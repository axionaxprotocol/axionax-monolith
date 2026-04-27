"""
axionax DeAI - Simple CPU Training Test
Windows Local Worker Node
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import time
from datetime import datetime

# Use CPU
device = torch.device("cpu")
print("="*60)
print("🚀 axionax DeAI - CPU Training Test")
print("="*60)
print(f"🔧 Using device: {device}")
print(f"📊 PyTorch version: {torch.__version__}")

# Simple CNN
class SimpleCNN(nn.Module):
    def __init__(self):
        super(SimpleCNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 16, 3, padding=1)  # Reduced from 32
        self.conv2 = nn.Conv2d(16, 32, 3, padding=1)  # Reduced from 64
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(32 * 7 * 7, 64)  # Reduced from 128
        self.fc2 = nn.Linear(64, 10)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.25)
    
    def forward(self, x):
        x = self.pool(self.relu(self.conv1(x)))
        x = self.pool(self.relu(self.conv2(x)))
        x = x.view(-1, 32 * 7 * 7)
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x

# Load data
print("\n📦 Loading MNIST dataset...")
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,))
])

# Small subset for quick testing
train_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
test_dataset = datasets.MNIST('./data', train=False, transform=transform)

# Smaller batch size for CPU
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)

print(f"✅ Training samples: {len(train_dataset):,}")
print(f"✅ Test samples: {len(test_dataset):,}")

# Model
model = SimpleCNN().to(device)
params = sum(p.numel() for p in model.parameters())
print(f"\n🏗️  Model parameters: {params:,}")

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Train for 2 epochs (quick test)
epochs = 2
print(f"\n🎓 Starting training for {epochs} epochs...\n")

for epoch in range(epochs):
    model.train()
    train_loss = 0
    correct = 0
    total = 0
    
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
        
        train_loss += loss.item()
        _, predicted = output.max(1)
        total += target.size(0)
        correct += predicted.eq(target).sum().item()
        
        if batch_idx % 200 == 0:
            print(f'  Epoch {epoch+1}/{epochs}, Batch {batch_idx}/{len(train_loader)}, '
                  f'Loss: {loss.item():.4f}, Acc: {100.*correct/total:.2f}%')
    
    # Test
    model.eval()
    test_correct = 0
    test_total = 0
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            _, predicted = output.max(1)
            test_total += target.size(0)
            test_correct += predicted.eq(target).sum().item()
    
    train_acc = 100. * correct / total
    test_acc = 100. * test_correct / test_total
    
    print(f"\n  📊 Epoch {epoch+1} Summary:")
    print(f"    Train Accuracy: {train_acc:.2f}%")
    print(f"    Test Accuracy: {test_acc:.2f}%")
    print()

print("="*60)
print("✅ Training Complete!")
print("="*60)
print(f"💻 Local Windows Worker Node is ready!")
print(f"🎯 Final test accuracy: {test_acc:.2f}%")
print(f"\n💡 Next: Connect to axionax network")
print("="*60)
