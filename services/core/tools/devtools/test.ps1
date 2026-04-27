# Axionax Core - Simple Test Script
Write-Host "Axionax Core - Quick Test" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# 1. Check Binary
Write-Host "Step 1: Check Axionax Core Binary" -ForegroundColor Green
if (Test-Path ".\build\axionax-core.exe") {
    Write-Host "OK - Binary found" -ForegroundColor Green
    .\build\axionax-core.exe version
} else {
    Write-Host "ERROR - Binary not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Test Configuration
Write-Host "Step 2: Test Configuration" -ForegroundColor Green
.\build\axionax-core.exe config init
Write-Host ""

# 3. Test Key Generation
Write-Host "Step 3: Test Key Management" -ForegroundColor Green
.\build\axionax-core.exe keys generate --type validator
Write-Host ""

# 4. Test Status Commands
Write-Host "Step 4: Test Status Commands" -ForegroundColor Green
.\build\axionax-core.exe validator status
Write-Host ""
.\build\axionax-core.exe worker status
Write-Host ""

# 5. Check Docker
Write-Host "Step 5: Check Docker" -ForegroundColor Green
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    Write-Host "OK - Docker installed" -ForegroundColor Green
    $dockerStatus = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - Docker Engine running" -ForegroundColor Green
        docker ps --format "table {{.Names}}\t{{.Status}}"
    } else {
        Write-Host "WARN - Docker Engine not running" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARN - Docker not installed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  .\build\axionax-core.exe start --network testnet" -ForegroundColor White
Write-Host "  .\build\axionax-core.exe validator start" -ForegroundColor White
Write-Host "  .\build\axionax-core.exe --help" -ForegroundColor White
Write-Host ""
Write-Host "Public testnet (Docker):" -ForegroundColor Cyan
Write-Host "  See repo: ops\deploy\environments\testnet\public\" -ForegroundColor White
Write-Host "  Or redeploy on Linux: ./ops/deploy/environments/testnet/public/scripts/redeploy_testnet.sh" -ForegroundColor White
Write-Host ""
