"""
axionax DeAI Worker - Test AMD GPU with DirectML
Quick test to verify DirectML setup on Windows
"""

import torch_directml
import torch
import torch.nn as nn
import time

print("="*60)
print("🧪 axionax Worker Node - AMD GPU Test")
print("="*60)

# Check DirectML
print(f"\n✅ DirectML available: {torch_directml.is_available()}")

# Get device
dml = torch_directml.device()
print(f"🎮 Device: {dml}")

# Simple computation test
print("\n🔧 Running simple GPU computation test...")

# Create random tensors
x = torch.randn(1000, 100).to(dml)
y = torch.randn(1000, 10).to(dml)

# Simple model
model = nn.Sequential(
    nn.Linear(100, 256),
    nn.ReLU(),
    nn.Linear(256, 128),
    nn.ReLU(),
    nn.Linear(128, 10)
).to(dml)

optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.MSELoss()

print(f"📊 Model parameters: {sum(p.numel() for p in model.parameters()):,}")

# Training loop
print("\n🎓 Training for 100 iterations...")
start = time.time()

for epoch in range(100):
    optimizer.zero_grad()
    output = model(x)
    loss = criterion(output, y)
    loss.backward()
    optimizer.step()
    
    if (epoch + 1) % 20 == 0:
        print(f"  Iteration {epoch+1}/100, Loss: {loss.item():.4f}")

elapsed = time.time() - start

print(f"\n{'='*60}")
print(f"✅ Test Complete!")
print(f"{'='*60}")
print(f"⏱️  Time: {elapsed:.2f} seconds")
print(f"⚡ Speed: {100/elapsed:.2f} iterations/second")
print(f"🎮 Using AMD Radeon RX 560 with DirectML")
print(f"\n💡 AMD GPU is working correctly!")
print(f"{'='*60}")
