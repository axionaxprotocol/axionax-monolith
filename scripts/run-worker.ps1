# Run Axionax DeAI Worker from repo root.
# Usage: .\scripts\run-worker.ps1 [-Config path]
# Example: .\scripts\run-worker.ps1 -Config configs\monolith_worker.toml

param(
    [string]$Config = "core/deai/worker_config.toml"
)

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot
& python core/deai/worker_node.py --config $Config
