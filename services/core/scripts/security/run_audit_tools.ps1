# Security audit preparation — run cargo audit (Rust) and bandit (Python DeAI).
# Exit 1 if critical/high issues found.
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RepoRoot

$Failed = 0

Write-Host "=== Security audit tools ==="

# 1. Cargo audit
try {
    $null = Get-Command cargo -ErrorAction Stop
    Write-Host "[1/3] Running cargo audit (core)..."
    Push-Location core
    try {
        & cargo audit
        if ($LASTEXITCODE -ne 0) { $Failed = 1; Write-Host "  FAIL" } else { Write-Host "  OK" }
    } finally { Pop-Location }
} catch {
    Write-Host "[1/3] cargo not found. Skipping cargo audit."
}

# 2. Bandit
try {
    $null = Get-Command bandit -ErrorAction Stop
    Write-Host "[2/3] Running bandit (core/deai)..."
    & bandit -r core/deai -ll --skip B101 2>$null
    if ($LASTEXITCODE -ne 0) { $Failed = 1; Write-Host "  FAIL" } else { Write-Host "  OK" }
} catch {
    Write-Host "[2/3] bandit not found (pip install bandit). Skipping."
}

# 3. Secrets check (basic)
Write-Host "[3/3] Checking for obvious secrets..."
$patterns = Get-ChildItem -Path core\deai, core\core -Recurse -Include *.py,*.rs -ErrorAction SilentlyContinue |
    Select-String -Pattern "0x[a-fA-F0-9]{64}" -AllMatches | Where-Object { $_.Line -notmatch "0x0{40}" -and $_.Line -notmatch "example|test|mock|dummy" }
if ($patterns) {
    Write-Host "  Possible secret pattern found. Review:"
    $patterns | ForEach-Object { Write-Host "    $($_.Path):$($_.LineNumber)" }
    $Failed = 1
} else {
    Write-Host "  OK"
}

if ($Failed -eq 1) {
    Write-Host "=== One or more checks failed ==="
    exit 1
}
Write-Host "=== All checks passed ==="
exit 0
