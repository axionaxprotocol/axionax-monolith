$ErrorActionPreference = 'Stop'

Write-Host 'axionax Testnet Pre-Launch Verification'
Write-Host '======================================='
Write-Host ''

$script:Errors = 0
$script:Warnings = 0

function Check-Pass([string]$Message) { Write-Host ('[PASS] ' + $Message) -ForegroundColor Green }
function Check-Fail([string]$Message) { Write-Host ('[FAIL] ' + $Message) -ForegroundColor Red; $script:Errors++ }
function Check-Warn([string]$Message) { Write-Host ('[WARN] ' + $Message) -ForegroundColor Yellow; $script:Warnings++ }

function Get-HttpStatusCode([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -Method Get -MaximumRedirection 5 -UseBasicParsing -TimeoutSec 15
        return [int]$r.StatusCode
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { return [int]$_.Exception.Response.StatusCode }
        return $null
    }
}

function Test-DnsResolve([string]$Domain) {
    try { Resolve-DnsName -Name $Domain -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

function Test-SslCertificate([string]$Domain) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect($Domain, 443)
        $ssl = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false, ({ $true }))
        $ssl.AuthenticateAsClient($Domain)
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($ssl.RemoteCertificate)
        $ssl.Close(); $tcp.Close()
        return ($cert.NotAfter -gt (Get-Date))
    } catch { return $false }
}

function Load-DotEnv([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    Get-Content -Path $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim().Trim("'").Trim('"')
        [Environment]::SetEnvironmentVariable($key, $val, 'Process')
    }
}

Write-Host '1. Checking Genesis Configuration...'
$genesisFile = $null
if (Test-Path 'genesis.json') { $genesisFile = 'genesis.json' }
elseif (Test-Path 'core/tools/genesis.json') { $genesisFile = 'core/tools/genesis.json' }

if ($genesisFile) {
    Check-Pass ("Genesis file exists: " + $genesisFile)
    try { $genesis = Get-Content -Path $genesisFile -Raw | ConvertFrom-Json; Check-Pass 'Genesis JSON is valid' }
    catch { Check-Fail 'Genesis JSON is invalid'; $genesis = $null }

    if ($genesis) {
        $chainOk = $false
        if ($genesis.config -and "$($genesis.config.chainId)" -eq '86137') { Check-Pass 'Chain ID is correct (EVM): 86137'; $chainOk = $true }
        if (-not $chainOk -and "$($genesis.chain_id)" -eq 'axionax-testnet-1') { Check-Pass 'Chain ID is correct (legacy): axionax-testnet-1'; $chainOk = $true }
        if (-not $chainOk) { Check-Fail 'Chain ID not found or not 86137 / axionax-testnet-1' }

        $count = 0
        if ($genesis.validators -is [System.Collections.IEnumerable]) { $count = @($genesis.validators).Count }
        if ($count -ge 2) { Check-Pass ("Genesis has " + $count + " validators") }
        elseif ($count -ge 1) { Check-Warn ("Only " + $count + " validators in genesis; recommended at least 2") }
        else { Check-Warn 'No validators array found in genesis' }
    }
} else {
    Check-Fail 'Genesis file not found (genesis.json or core/tools/genesis.json)'
}
Write-Host ''

Write-Host '2. Checking DNS Configuration...'
@('axionax.org', 'rpc.axionax.org', 'explorer.axionax.org', 'faucet.axionax.org') | ForEach-Object {
    if (Test-DnsResolve $_) { Check-Pass ("DNS resolves: " + $_) } else { Check-Fail ("DNS does not resolve: " + $_) }
}
Write-Host ''

Write-Host '3. Checking RPC Endpoint...'
$rpcUrl = if ($env:RPC_URL) { $env:RPC_URL } else { 'https://rpc.axionax.org' }
$rpcStatus = Get-HttpStatusCode ($rpcUrl + '/health')
if ($rpcStatus -eq 200) { Check-Pass ("RPC endpoint is accessible: " + $rpcUrl) } else { Check-Fail ("RPC endpoint is not accessible: " + $rpcUrl) }
Write-Host ''

Write-Host '4. Checking Block Explorer...'
$explorerUrl = if ($env:EXPLORER_URL) { $env:EXPLORER_URL } else { 'https://explorer.axionax.org' }
$explorerStatus = Get-HttpStatusCode $explorerUrl
if ($explorerStatus -in @(200, 301, 302)) { Check-Pass ("Explorer is accessible: " + $explorerUrl) } else { Check-Fail ("Explorer is not accessible: " + $explorerUrl) }
Write-Host ''

Write-Host '5. Checking Faucet...'
$faucetUrl = if ($env:FAUCET_URL) { $env:FAUCET_URL } else { 'https://faucet.axionax.org' }
$faucetStatus = Get-HttpStatusCode $faucetUrl
if ($faucetStatus -in @(200, 301, 302)) { Check-Pass ("Faucet is accessible: " + $faucetUrl) } else { Check-Fail ("Faucet is not accessible: " + $faucetUrl) }
Write-Host ''

Write-Host '6. Checking Website...'
$websiteUrl = if ($env:WEBSITE_URL) { $env:WEBSITE_URL } else { 'https://axionax.org' }
$websiteStatus = Get-HttpStatusCode $websiteUrl
if ($websiteStatus -eq 200) { Check-Pass ("Website is accessible: " + $websiteUrl) } else { Check-Fail ("Website is not accessible: " + $websiteUrl) }
Write-Host ''

Write-Host '7. Checking SSL Certificates...'
@('rpc.axionax.org', 'explorer.axionax.org', 'faucet.axionax.org') | ForEach-Object {
    if (Test-SslCertificate $_) { Check-Pass ("SSL certificate valid: " + $_) } else { Check-Warn ("SSL certificate issue: " + $_) }
}
Write-Host ''

Write-Host '8. Checking Docker Services...'
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    try {
        $containers = @(docker ps --format '{{.Names}}')
        $running = @($containers | Where-Object { $_ -and $_.Trim() -ne '' }).Count
        if ($running -gt 0) { Check-Pass ($running.ToString() + ' Docker containers running'); docker ps --format 'table {{.Names}}\t{{.Status}}' }
        else { Check-Warn 'No Docker containers running' }
    } catch { Check-Warn 'Docker not accessible' }
} else { Check-Warn 'Docker not installed or not accessible' }
Write-Host ''

Write-Host '9. Checking Environment Variables...'
$envFile = if (Test-Path 'ops/deploy/.env') { 'ops/deploy/.env' } else { '.env' }
if (Test-Path $envFile) {
    Check-Pass ('.env file exists (' + $envFile + ')')
    Load-DotEnv $envFile
    @('DB_PASSWORD', 'REDIS_PASSWORD', 'FAUCET_PRIVATE_KEY', 'GRAFANA_PASSWORD') | ForEach-Object {
        $v = (Get-Item ("Env:" + $_) -ErrorAction SilentlyContinue).Value
        if ([string]::IsNullOrWhiteSpace($v)) { Check-Warn ($_ + ' is not set') } else { Check-Pass ($_ + ' is set') }
    }
} else { Check-Warn '.env not found; optional for pre-launch and required for deploy' }
Write-Host ''

Write-Host '10. Checking GitHub Repositories...'
@('axionax-core-universe', 'axionax-web-universe') | ForEach-Object {
    $status = Get-HttpStatusCode ('https://api.github.com/repos/axionaxprotocol/' + $_)
    if ($status -eq 200) { Check-Pass ('Repository accessible: ' + $_) } else { Check-Warn ('Repository not accessible: ' + $_) }
}
Write-Host ''

Write-Host '11. Checking Monitoring Stack...'
$grafanaUrl = if ($env:GRAFANA_URL) { $env:GRAFANA_URL } else { 'http://localhost:3000' }
$promUrl = if ($env:PROMETHEUS_URL) { $env:PROMETHEUS_URL } else { 'http://localhost:9090' }
if ((Get-HttpStatusCode $grafanaUrl) -in @(200, 302)) { Check-Pass 'Grafana is accessible' } else { Check-Warn 'Grafana is not accessible' }
if ((Get-HttpStatusCode $promUrl) -eq 200) { Check-Pass 'Prometheus is accessible' } else { Check-Warn 'Prometheus is not accessible' }
Write-Host ''

Write-Host '12. Checking Documentation...'
$docsOk = (Test-Path 'README.md') -or (Test-Path 'docs/GENESIS_PUBLIC_TESTNET_PLAN.md') -or (Test-Path 'docs/ADD_NETWORK_AND_TOKEN.md')
if ($docsOk) { Check-Pass 'Key docs exist (README, Genesis plan, Add token)' } else { Check-Warn 'Some key docs missing' }
if ((Test-Path 'ops/deploy/VPS_VALIDATOR_UPDATE.md') -or (Test-Path 'VPS_VALIDATOR_UPDATE.md')) { Check-Pass 'Validator/deploy guide exists' } else { Check-Warn 'VPS_VALIDATOR_UPDATE.md not found' }
Write-Host ''

Write-Host '======================================='
Write-Host 'Verification Summary'
Write-Host '======================================='
if ($script:Errors -eq 0 -and $script:Warnings -eq 0) { Write-Host '[PASS] All checks passed!' -ForegroundColor Green; exit 0 }
if ($script:Errors -eq 0) { Write-Host ('[WARN] ' + $script:Warnings + ' warning(s)') -ForegroundColor Yellow; exit 0 }
Write-Host ('[FAIL] ' + $script:Errors + ' error(s), ' + $script:Warnings + ' warning(s)') -ForegroundColor Red
exit 1
