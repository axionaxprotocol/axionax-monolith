# Axionax Core - Quick Test Script
# Script for quickly testing Axionax Core

Write-Host "🚀 Axionax Core - Quick Test" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"

# Helper function
function Test-Command {
    param($Name, $Command)
    Write-Host "🔍 Testing: $Name" -ForegroundColor Yellow
    Invoke-Expression $Command
    Write-Host "`n"
}

# 1. Check Binary
Write-Host "Step 1: Check Axionax Core Binary" -ForegroundColor Green
if (Test-Path ".\build\axionax-core.exe") {
    Write-Host "✅ Binary found!" -ForegroundColor Green
    Test-Command "Version" ".\build\axionax-core.exe version"
} else {
    Write-Host "❌ Binary not found! Please build first: go build -o build\axionax-core.exe .\cmd\axionax" -ForegroundColor Red
    exit 1
}

# 2. Test Configuration
Write-Host "Step 2: Test Configuration" -ForegroundColor Green
Test-Command "Config Init" ".\build\axionax-core.exe config init"
Test-Command "Config Show" ".\build\axionax-core.exe config show"

# 3. Test Key Generation
Write-Host "Step 3: Test Key Management" -ForegroundColor Green
Test-Command "Generate Validator Key" ".\build\axionax-core.exe keys generate --type validator"
Test-Command "Generate Worker Key" ".\build\axionax-core.exe keys generate --type worker"
Test-Command "List Keys" ".\build\axionax-core.exe keys list"

# 4. Test Status Commands
Write-Host "Step 4: Test Status Commands" -ForegroundColor Green
Test-Command "Validator Status" ".\build\axionax-core.exe validator status"
Test-Command "Worker Status" ".\build\axionax-core.exe worker status"
Test-Command "Stake Balance" ".\build\axionax-core.exe stake balance"

# 5. Create Worker Specs
Write-Host "Step 5: Create Worker Specifications" -ForegroundColor Green
$workerJson = @'
{
  "gpus": [{
    "model": "NVIDIA RTX 4090",
    "vram": 24,
    "count": 1
  }],
  "cpu_cores": 16,
  "ram": 64,
  "storage": 1000,
  "bandwidth": 1000,
  "region": "us-west"
}
'@
Set-Content -Path "worker-specs.json" -Value $workerJson -Encoding UTF8
Write-Host "Created worker-specs.json" -ForegroundColor Green

# 6. Check Docker (if available)
Write-Host "`nStep 6: Check Docker and Testnet" -ForegroundColor Green
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    Write-Host "Docker found" -ForegroundColor Green
    
    $dockerStatus = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker Engine is running" -ForegroundColor Green
        
        Write-Host "`nDocker Containers:" -ForegroundColor Cyan
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        Write-Host "`nTestnet Services:" -ForegroundColor Cyan
        Write-Host "  RPC: http://localhost:8545" -ForegroundColor White
        Write-Host "  Explorer: http://localhost:4001" -ForegroundColor White
        Write-Host "  Faucet: http://localhost:8080" -ForegroundColor White
        
    } else {
        Write-Host "Docker Engine is not running - please start Docker Desktop" -ForegroundColor Yellow
    }
} else {
    Write-Host "Docker is not installed - Demo Mode available" -ForegroundColor Yellow
}

# 7. Show useful commands
Write-Host "`n" -ForegroundColor White
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Start Node:" -ForegroundColor Green
Write-Host "   .\build\axionax-core.exe start --network testnet" -ForegroundColor White
Write-Host ""
Write-Host "Start Validator:" -ForegroundColor Green
Write-Host "   .\build\axionax-core.exe validator start" -ForegroundColor White
Write-Host ""
Write-Host "Register Worker:" -ForegroundColor Green
Write-Host "   .\build\axionax-core.exe worker register --specs worker-specs.json" -ForegroundColor White
Write-Host ""
Write-Host "Deposit Stake:" -ForegroundColor Green
Write-Host "   .\build\axionax-core.exe stake deposit 10000 --address 0x..." -ForegroundColor White
Write-Host ""
Write-Host "Help:" -ForegroundColor Green
Write-Host "   .\build\axionax-core.exe --help" -ForegroundColor White
Write-Host ""

# 8. Test RPC endpoint (if Docker is running)
if ($dockerInstalled -and ($LASTEXITCODE -eq 0)) {
    Write-Host "Testing Testnet Endpoints..." -ForegroundColor Green
    
    $curlInstalled = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curlInstalled) {
        $rpcTest = curl.exe -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' 2>&1
        
        if ($rpcTest -match "0x7a69") {
            Write-Host "RPC Endpoint is working (Chain ID: 31337)" -ForegroundColor Green
        } else {
            Write-Host "RPC Endpoint is not responding" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Testing complete!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Read more at:" -ForegroundColor Cyan
Write-Host "   TESTING_GUIDE.md - Full testing guide" -ForegroundColor White
Write-Host "   QUICKSTART.md - Quick start guide" -ForegroundColor White
Write-Host "   docs/API_REFERENCE.md - API documentation" -ForegroundColor White
Write-Host ""
