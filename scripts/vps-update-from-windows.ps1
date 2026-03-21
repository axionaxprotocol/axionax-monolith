#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy / update web on VPS from Windows without CRLF breaking bash.
.DESCRIPTION
  PowerShell Get-Content -Raw keeps CRLF; piping that to "ssh ... bash -s" breaks Linux bash.

  IMPORTANT: Do NOT use Process + RedirectStandardOutput/Err + ReadToEnd() with interactive
  ssh password auth — it breaks the password prompt and can exit immediately (exit 1).

  This script writes LF-only UTF-8 to a temp file, then Start-Process ssh with
  -RedirectStandardInput only so build logs and password prompt use your console.
.EXAMPLE
  .\scripts\vps-update-from-windows.ps1
  .\scripts\vps-update-from-windows.ps1 -HostName root@217.216.109.5
#>
param(
  [string] $HostName = 'root@217.216.109.5',
  [string] $ScriptName = 'vps-update-and-restart.sh'
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$shPath = Join-Path $here $ScriptName

if (-not (Test-Path -LiteralPath $shPath)) {
  throw "Not found: $shPath"
}

$text = [System.IO.File]::ReadAllText($shPath)
$unix = $text -replace "`r`n", "`n" -replace "`r", "`n"
if (-not $unix.EndsWith("`n")) {
  $unix += "`n"
}

$enc = New-Object System.Text.UTF8Encoding $false
$tmp = Join-Path $env:TEMP ("vps-update-{0}.sh" -f [guid]::NewGuid().ToString('n'))

try {
  [System.IO.File]::WriteAllText($tmp, $unix, $enc)
  Write-Host "Running: ssh $HostName bash -s < $tmp (LF-only script)" -ForegroundColor Cyan
  Write-Host "Enter SSH password when prompted. Build output will appear below.`n" -ForegroundColor DarkGray

  $proc = Start-Process -FilePath 'ssh' `
    -ArgumentList @($HostName.Trim(), 'bash', '-s') `
    -RedirectStandardInput $tmp `
    -Wait `
    -NoNewWindow `
    -PassThru

  if ($proc.ExitCode -ne 0) {
    Write-Host "`nssh exited with code $($proc.ExitCode)" -ForegroundColor Yellow
  }
  exit $proc.ExitCode
}
finally {
  if (Test-Path -LiteralPath $tmp) {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}
