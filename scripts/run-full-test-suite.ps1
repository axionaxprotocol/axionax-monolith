# Axionax Full Test Suite
# Run: .\scripts\run-full-test-suite.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AXIONAX — Full Test Suite" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$Failed = 0

# 1. Genesis verification
Write-Host "[1/5] Genesis verification..." -ForegroundColor Yellow
try {
    python core/tools/verify_genesis.py
    if ($LASTEXITCODE -ne 0) { throw "Genesis verification failed" }
    Write-Host "  PASS" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
    $Failed++
}

# 2. Genesis generator
Write-Host ""
Write-Host "[2/5] Genesis generator (create + verify)..." -ForegroundColor Yellow
try {
    python core/tools/create_genesis.py --verify 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Genesis generator failed" }
    Write-Host "  PASS" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
    $Failed++
}

# 3. Health check (RPC connectivity)
Write-Host ""
Write-Host "[3/5] Health check (RPC)..." -ForegroundColor Yellow
try {
    python scripts/health-check.py --config core/deai/worker_config.toml 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Health check failed" }
    Write-Host "  PASS" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
    $Failed++
}

# 4. DeAI Python tests
Write-Host ""
Write-Host "[4/5] DeAI pytest..." -ForegroundColor Yellow
try {
    Push-Location core/deai
    python -m pytest . -v --tb=short -q --ignore=tests 2>&1 | Out-Null
    Pop-Location
    if ($LASTEXITCODE -ne 0) { throw "DeAI tests failed" }
    Write-Host "  PASS" -ForegroundColor Green
} catch {
    Pop-Location -ErrorAction SilentlyContinue
    Write-Host "  FAIL: $_" -ForegroundColor Red
    $Failed++
}

# 5. Devtools tests
Write-Host ""
Write-Host "[5/5] Devtools pytest..." -ForegroundColor Yellow
try {
    Push-Location tools/devtools
    python -m pytest tests/ -v --tb=short -q 2>&1 | Out-Null
    Pop-Location
    if ($LASTEXITCODE -ne 0) { throw "Devtools tests failed" }
    Write-Host "  PASS" -ForegroundColor Green
} catch {
    Pop-Location -ErrorAction SilentlyContinue
    Write-Host "  FAIL: $_" -ForegroundColor Red
    $Failed++
}

# Optional: Rust tests (requires libclang on Windows)
Write-Host ""
Write-Host "[Optional] Rust tests (cargo test)..." -ForegroundColor Gray
Write-Host "  Run on Linux/CI or install LLVM+libclang on Windows" -ForegroundColor Gray
Write-Host "  cd core && cargo test --workspace" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
if ($Failed -eq 0) {
    Write-Host "  All tests PASSED" -ForegroundColor Green
} else {
    Write-Host "  $Failed test(s) FAILED" -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

exit $Failed
