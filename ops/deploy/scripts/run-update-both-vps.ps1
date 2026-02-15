# Run update on both Validator VPS (217.76.61.116, 46.250.244.4)
# Usage: from repo root or from ops/deploy:
#   .\scripts\run-update-both-vps.ps1
#   .\scripts\run-update-both-vps.ps1 -User root -SkipApt

param(
    [string]$User = "root",
    [string]$Vps1 = "217.76.61.116",
    [string]$Vps2 = "46.250.244.4",
    [switch]$SkipApt,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DeployDir = Split-Path -Parent $ScriptDir
$ScriptName = "update-validator-vps.sh"

$args = @()
if ($SkipApt) { $args += "--skip-apt" }
if ($DryRun)  { $args += "--dry-run" }
$argStr = $args -join " "

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Update both Validator VPS" -ForegroundColor Cyan
Write-Host "  $Vps1 (EU), $Vps2 (AU)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$scriptPath = Join-Path $ScriptDir $ScriptName
if (-not (Test-Path $scriptPath)) {
    Write-Host "Error: $scriptPath not found" -ForegroundColor Red
    exit 1
}

foreach ($vps in $Vps1, $Vps2) {
    Write-Host "`n--- $vps ---" -ForegroundColor Yellow
    Write-Host "Copying script..."
    scp $scriptPath "${User}@${vps}:/tmp/$ScriptName"
    Write-Host "Running update..."
    if ($argStr) {
        ssh "${User}@${vps}" "bash /tmp/$ScriptName $argStr"
    } else {
        ssh "${User}@${vps}" "bash /tmp/$ScriptName"
    }
}

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "  Done both VPS" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
