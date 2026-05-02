# Distribute genesis.json to both Validator VPS (Week 1)
# Run from repo root. Requires: SSH to root@217.216.109.5 and root@46.250.244.4
# Usage: .\ops\deploy\scripts\distribute-genesis.ps1
#        .\ops\deploy\scripts\distribute-genesis.ps1 -User root -Vps1 217.216.109.5 -Vps2 46.250.244.4

param(
    [string]$User = "root",
    [string]$Vps1 = "217.216.109.5",
    [string]$Vps2 = "46.250.244.4"
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
for ($i = 0; $i -lt 3; $i++) { $RepoRoot = Split-Path -Parent $RepoRoot }
$GenesisPath = Join-Path $RepoRoot "core\tools\genesis.json"
$RemoteDir = "~/.axionax/config"
$RemotePath = "$RemoteDir/genesis.json"

if (-not (Test-Path $GenesisPath)) {
    Write-Host "Error: genesis.json not found at $GenesisPath" -ForegroundColor Red
    Write-Host "Run: cd core\tools; python create_genesis.py --verify" -ForegroundColor Yellow
    exit 1
}

$hash = (Get-FileHash -Path $GenesisPath -Algorithm SHA256).Hash.ToLower()
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Distribute Genesis to Validators" -ForegroundColor Cyan
Write-Host "  Genesis: $GenesisPath" -ForegroundColor Cyan
Write-Host "  SHA-256: 0x$hash" -ForegroundColor Cyan
Write-Host "  VPS: $Vps1 (EU), $Vps2 (AU)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

foreach ($vps in $Vps1, $Vps2) {
    Write-Host "`n--- $vps ---" -ForegroundColor Yellow
    Write-Host "Creating $RemoteDir if needed..."
    ssh "${User}@${vps}" "mkdir -p $RemoteDir"
    Write-Host "Uploading genesis.json..."
    scp $GenesisPath "${User}@${vps}:${RemotePath}"
    Write-Host "Verifying hash on remote..."
    $remoteHash = ssh "${User}@${vps}" "sha256sum $RemotePath 2>/dev/null | awk '{print `$1}'"
    if ($remoteHash -eq $hash) {
        Write-Host "  OK: Hash matches on $vps" -ForegroundColor Green
    } else {
        Write-Host "  WARN: Hash mismatch on $vps (local $hash vs remote $remoteHash)" -ForegroundColor Yellow
    }
}

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "  Done. Next: run run-update-both-vps.ps1 to update/restart nodes" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
