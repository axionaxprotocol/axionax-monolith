"""
axionax DeAI - Simple Training Example

Simple AI Training Job example for testing Worker Node
Runs MNIST digit classification
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import time
import json
from datetime import datetime

# Check GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🔧 Using device: {device}")
if torch.cuda.is_available():
    print(f"🎮 GPU: {torch.cuda.get_device_name(0)}")
    print(f"💾 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")


# Simple CNN Model
class SimpleCNN(nn.Module):
    """Simple CNN for MNIST classification"""
    
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


def train_epoch(model, train_loader, optimizer, criterion, epoch):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    correct = 0
    total = 0
    
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        _, predicted = output.max(1)
        total += target.size(0)
        correct += predicted.eq(target).sum().item()
        
        if batch_idx % 100 == 0:
            print(f'  Batch {batch_idx}/{len(train_loader)}, '
                  f'Loss: {loss.item():.4f}, '
                  f'Acc: {100.*correct/total:.2f}%')
    
    avg_loss = total_loss / len(train_loader)
    accuracy = 100. * correct / total
    return avg_loss, accuracy


def test(model, test_loader, criterion):
    """Evaluate model"""
    model.eval()
    test_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            test_loss += criterion(output, target).item()
            _, predicted = output.max(1)
            total += target.size(0)
            correct += predicted.eq(target).sum().item()
    
    avg_loss = test_loss / len(test_loader)
    accuracy = 100. * correct / total
    return avg_loss, accuracy


def main():
    """Main training function"""
    print("\n" + "="*60)
    print("🚀 axionax DeAI - Simple Training Example")
    print("="*60 + "\n")
    
    # Job configuration
    config = {
        "job_id": f"deai_training_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "task_type": "image_classification",
        "model": "SimpleCNN",
        "dataset": "MNIST",
        "batch_size": 128,
        "epochs": 5,
        "learning_rate": 0.001,
        "optimizer": "Adam",
        "device": str(device)
    }
    
    print("📋 Job Configuration:")
    for key, value in config.items():
        print(f"  {key}: {value}")
    print()
    
    # Load MNIST dataset
    print("📦 Loading MNIST dataset...")
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    train_dataset = datasets.MNIST(
        root='./data',
        train=True,
        download=True,
        transform=transform
    )
    
    test_dataset = datasets.MNIST(
        root='./data',
        train=False,
        download=True,
        transform=transform
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['batch_size'],
        shuffle=True,
        num_workers=2
    )
    
    test_loader = DataLoader(
        test_dataset,
        batch_size=config['batch_size'],
        shuffle=False,
        num_workers=2
    )
    
    print(f"✅ Training samples: {len(train_dataset)}")
    print(f"✅ Test samples: {len(test_dataset)}")
    print()
    
    # Initialize model
    print("🏗️  Initializing model...")
    model = SimpleCNN().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=config['learning_rate'])
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    print(f"✅ Model parameters: {total_params:,}")
    print()
    
    # Training loop
    print("🎓 Starting training...\n")
    training_start = time.time()
    
    results = {
        "job_id": config["job_id"],
        "config": config,
        "epochs": []
    }
    
    for epoch in range(config['epochs']):
        epoch_start = time.time()
        print(f"📚 Epoch {epoch + 1}/{config['epochs']}")
        
        # Train
        train_loss, train_acc = train_epoch(
            model, train_loader, optimizer, criterion, epoch
        )
        
        # Test
        test_loss, test_acc = test(model, test_loader, criterion)
        
        epoch_time = time.time() - epoch_start
        
        # Summary
        print(f"\n  📊 Epoch {epoch + 1} Summary:")
        print(f"    Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
        print(f"    Test Loss:  {test_loss:.4f}, Test Acc:  {test_acc:.2f}%")
        print(f"    Time: {epoch_time:.2f}s")
        
        # GPU stats
        if torch.cuda.is_available():
            print(f"    GPU Memory: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
        print()
        
        # Record results
        results["epochs"].append({
            "epoch": epoch + 1,
            "train_loss": train_loss,
            "train_accuracy": train_acc,
            "test_loss": test_loss,
            "test_accuracy": test_acc,
            "time_seconds": epoch_time
        })
    
    training_time = time.time() - training_start
    
    # Final results
    print("="*60)
    print("✅ Training Complete!")
    print("="*60)
    print(f"⏱️  Total training time: {training_time:.2f}s")
    print(f"📈 Final test accuracy: {results['epochs'][-1]['test_accuracy']:.2f}%")
    
    results["total_time_seconds"] = training_time
    results["final_accuracy"] = results['epochs'][-1]['test_accuracy']
    
    # Save results
    output_file = f"training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"💾 Results saved to: {output_file}")
    
    # Save model
    model_file = f"model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pth"
    torch.save({
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'config': config,
        'final_accuracy': results['final_accuracy']
    }, model_file)
    
    print(f"🎯 Model saved to: {model_file}")
    print("\n" + "="*60 + "\n")
    
    # Return for programmatic use
    return results


if __name__ == "__main__":
    main()
