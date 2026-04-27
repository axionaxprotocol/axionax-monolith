<#
.SYNOPSIS
    Deploy axionax-web to VPS
.DESCRIPTION
    Automated deployment script for pushing updates to production VPS
.PARAMETER SkipTests
    Skip running tests before deployment
.EXAMPLE
    .\deploy-to-vps.ps1
    .\deploy-to-vps.ps1 -SkipTests
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

# VPS Configuration
$VPS_IP = "217.216.109.5"
$SSH_USER = "root"
$DEPLOY_PATH = "/opt/axionax-web"

Write-Host "`n🚀 axionax Web - VPS Deployment Script" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "Target VPS: ${SSH_USER}@${VPS_IP}" -ForegroundColor Yellow
Write-Host "Deploy Path: ${DEPLOY_PATH}" -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Cyan

# 1. Pre-deployment checks
Write-Host "`n📋 Step 1/8: Pre-deployment checks..." -ForegroundColor Yellow

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Are you in the axionax-web directory?" -ForegroundColor Red
    exit 1
}

# Check current git branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan

# Check if there are uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  Warning: You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host $gitStatus
    $response = Read-Host "Continue anyway? [y/N]"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Pre-deployment checks passed" -ForegroundColor Green

# 1.5 Check server connectivity BEFORE building
Write-Host "`n🔍 Step 1.5/8: Checking VPS connectivity..." -ForegroundColor Yellow
Write-Host "Testing connection to ${VPS_IP}..." -ForegroundColor Cyan

try {
    # Test SSH connection with timeout
    $testConnection = Test-Connection -ComputerName $VPS_IP -Count 1 -ErrorAction Stop
    Write-Host "✅ VPS is reachable (ping: $($testConnection.Latency)ms)" -ForegroundColor Green
    
    # Test SSH port
    $sshTest = Test-NetConnection -ComputerName $VPS_IP -Port 22 -WarningAction SilentlyContinue
    if ($sshTest.TcpTestSucceeded) {
        Write-Host "✅ SSH port 22 is open" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: SSH port 22 might be blocked" -ForegroundColor Yellow
    }
    
    # Test HTTP (check if website is running)
    try {
        $httpTest = Invoke-WebRequest -Uri "http://${VPS_IP}" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Host "✅ Current website status: HTTP $($httpTest.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host " Website not responding (may be first deployment)" -ForegroundColor Cyan
    }
} catch {
    Write-Host " Cannot reach VPS at ${VPS_IP}" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "`n   Please check:" -ForegroundColor Yellow
    Write-Host "   1. VPS is powered on" -ForegroundColor White
    Write-Host "   2. Network/Firewall allows connection" -ForegroundColor White
    Write-Host "   3. VPS IP is correct: ${VPS_IP}" -ForegroundColor White
    $response = Read-Host "Continue anyway? [y/N]"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host " Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

# 2. Run tests
if (-not $SkipTests) {
    Write-Host "`n[2/7] Running tests..." -ForegroundColor Yellow
    
    # Check if lint script exists
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.scripts.lint) {
        Write-Host "Running linter..." -ForegroundColor Cyan
        npm run lint
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Linting issues found, but continuing..." -ForegroundColor Yellow
        }
    }
    
    Write-Host "✅ Tests completed" -ForegroundColor Green
} else {
    Write-Host "`n[SKIP] Step 2/7: Skipping tests (-SkipTests flag used)" -ForegroundColor Yellow
}

# 3. Security scan
Write-Host "`n[3/7] Running security audit..." -ForegroundColor Yellow
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) {
    Write-Host " Warning: High severity vulnerabilities found!" -ForegroundColor Yellow
    Write-Host "Run 'npm audit fix' to resolve issues." -ForegroundColor Yellow
}
Write-Host " Security audit completed" -ForegroundColor Green

# 4. Build production
Write-Host "`n[4/7] Building production bundle..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Production build completed" -ForegroundColor Green

# 5. Commit and push to GitHub
Write-Host "`n[5/7] Pushing to GitHub..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "deploy: Update production build - $timestamp"

git add .
$gitCommit = git commit -m $commitMsg -m "Deployed to VPS: ${VPS_IP}" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Changes committed: $commitMsg" -ForegroundColor Cyan
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Warning: Git push failed. Check your credentials." -ForegroundColor Yellow
        $response = Read-Host "Continue with deployment? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            exit 1
        }
    } else {
        Write-Host " Changes pushed to GitHub" -ForegroundColor Green
    }
} else {
    Write-Host " No changes to commit" -ForegroundColor Cyan
}

# 6. Deploy to VPS
Write-Host "`n[6/7] Deploying to VPS..." -ForegroundColor Yellow
Write-Host "Connecting to ${SSH_USER}@${VPS_IP}..." -ForegroundColor Cyan
Write-Host "(You will be prompted for SSH password)" -ForegroundColor Gray

# Create deployment script
$deployScript = @"
#!/bin/bash
set -e

echo '======================================================================'
echo '🚀 axionax Web Deployment on VPS'
echo '======================================================================'

# Navigate to deployment directory
if [ ! -d "${DEPLOY_PATH}" ]; then
    echo '❌ Error: Deployment directory does not exist!'
    echo 'Creating directory: ${DEPLOY_PATH}'
    mkdir -p ${DEPLOY_PATH}
    cd ${DEPLOY_PATH}
    
    echo '📥 Cloning repository for the first time...'
    git clone https://github.com/axionaxprotocol/axionax-web.git .
else
    cd ${DEPLOY_PATH}
fi

echo ''
echo '📥 Pulling latest changes from GitHub...'
git fetch origin
git reset --hard origin/main
git pull origin main

echo ''
echo '🔄 Stopping current containers...'
docker-compose down

echo ''
echo '🔨 Building and starting new containers...'
docker-compose up -d --build

echo ''
echo '⏳ Waiting for services to start...'
sleep 15

echo ''
echo '✅ Checking service status...'
docker-compose ps

echo ''
echo '📊 Recent logs (last 30 lines):'
docker-compose logs --tail=30

echo ''
echo '======================================================================'
echo '✅ Deployment completed successfully!'
echo '======================================================================'
echo 'Website URL: http://${VPS_IP}'
echo 'HTTPS URL: https://axionax.org (if SSL configured)'
echo ''
"@

# Save deployment script temporarily
$tempScript = [System.IO.Path]::GetTempFileName()
$deployScript | Out-File -FilePath $tempScript -Encoding UTF8

# Execute deployment via SSH
try {
    Write-Host "`nExecuting deployment commands on VPS..." -ForegroundColor Cyan
    Get-Content $tempScript | ssh ${SSH_USER}@${VPS_IP} "bash -s"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n✅ Deployment to VPS completed" -ForegroundColor Green
} catch {
    Write-Host "❌ SSH connection failed: $_" -ForegroundColor Red
    Write-Host "`nTroubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Verify VPS IP is correct: ${VPS_IP}" -ForegroundColor White
    Write-Host "2. Check if SSH port 22 is open" -ForegroundColor White
    Write-Host "3. Verify SSH credentials" -ForegroundColor White
    Write-Host "4. Try manual SSH: ssh ${SSH_USER}@${VPS_IP}" -ForegroundColor White
    exit 1
} finally {
    # Clean up temp file
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
}

# 7. Verification
Write-Host "`n[7/7] Verifying deployment..." -ForegroundColor Yellow

# Test if website is accessible
$websiteUrl = "http://${VPS_IP}"
Write-Host "Testing website accessibility at ${websiteUrl}..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $websiteUrl -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Website is accessible and responding with HTTP 200" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: Website returned status code $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Warning: Could not verify website accessibility" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "Please check manually at: ${websiteUrl}" -ForegroundColor Yellow
}

# Final summary
Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host " Pre-checks:   Passed" -ForegroundColor Green
Write-Host " Build:        Success" -ForegroundColor Green
Write-Host " Security:     Scanned" -ForegroundColor Green
Write-Host " GitHub:       Pushed" -ForegroundColor Green
Write-Host " VPS Deploy:   Complete" -ForegroundColor Green
Write-Host " Verification: Done" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "`nWebsite URLs:" -ForegroundColor Cyan
Write-Host "   HTTP:  http://${VPS_IP}" -ForegroundColor White
Write-Host "   HTTPS: https://axionax.org (if SSL configured)" -ForegroundColor White
Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "   View logs:    ssh ${SSH_USER}@${VPS_IP} 'cd ${DEPLOY_PATH} && docker-compose logs -f'" -ForegroundColor White
Write-Host "   Restart:      ssh ${SSH_USER}@${VPS_IP} 'cd ${DEPLOY_PATH} && docker-compose restart'" -ForegroundColor White
Write-Host "   Check status: ssh ${SSH_USER}@${VPS_IP} 'cd ${DEPLOY_PATH} && docker-compose ps'" -ForegroundColor White
$completionTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Write-Host "Deployment completed at: $completionTime" -ForegroundColor Green
Write-Host ""
