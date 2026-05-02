#Requires -Version 5.1
<#
  Full DoD P2P stability window from the monorepo root (Windows PowerShell).
  Optional: $env:AXIONAX_P2P_WEBHOOK = '<discord-url>' before running.
#>
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location $RepoRoot
$env:PYTHONUNBUFFERED = "1"

$pyArgs = @(
  "services/core/scripts/p2p_stability_monitor.py",
  "--duration-hours", "24",
  "--interval-seconds", "30",
  "--output-root", "services/core/reports"
)
if ($env:AXIONAX_P2P_WEBHOOK) {
  $pyArgs += @("--webhook", $env:AXIONAX_P2P_WEBHOOK)
}
python @pyArgs
