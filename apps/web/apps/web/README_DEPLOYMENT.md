# axionax Web - VPS Deployment Guide

## 🚀 Quick Start

### Deploy to VPS

```powershell
# Full deployment (with tests and security checks)
.\deploy-to-vps.ps1

# Quick deployment (skip tests)
.\deploy-to-vps.ps1 -SkipTests

# Ultra quick (commits and deploys immediately)
.\deploy-quick.ps1
```

## 📋 VPS Configuration

- **IP Address**: `YOUR_VPS_IP`
- **SSH User**: `root`
- **Deploy Path**: `/opt/axionax-web`
- **Website URL**: `http://YOUR_VPS_IP`
- **HTTPS URL**: `https://axionax.org` (if SSL configured)

## 🛠️ Management Commands

### Using Interactive Menu

```powershell
.\vps-commands.ps1
```

This provides:

1. View live logs
2. View recent logs
3. Check service status
4. Restart services
5. Stop/Start services
6. Check disk usage
7. Check memory usage
8. SSH into VPS

### Manual Commands

```powershell
# SSH to VPS
ssh root@YOUR_VPS_IP

# View logs
ssh root@YOUR_VPS_IP "cd /opt/axionax-web && docker-compose logs -f"

# Check status
ssh root@YOUR_VPS_IP "cd /opt/axionax-web && docker-compose ps"

# Restart services
ssh root@YOUR_VPS_IP "cd /opt/axionax-web && docker-compose restart"

# Pull latest and rebuild
ssh root@YOUR_VPS_IP "cd /opt/axionax-web && git pull && docker-compose up -d --build"
```

## 📦 Deployment Process

### Full Deployment Script (`deploy-to-vps.ps1`)

**Steps:**

1. **Pre-deployment checks** - Verify repository state
2. **Run tests** - Lint and validate code (can skip with `-SkipTests`)
3. **Security audit** - Check for vulnerabilities
4. **Build production** - Create optimized build
5. **Push to GitHub** - Commit and push changes
6. **Deploy to VPS** - Pull and rebuild on server
7. **Verification** - Test website accessibility

> Real-time Metrics: If homepage metrics don't update over HTTPS, configure same-origin reverse proxies and keep the frontend using relative paths. See `docs/REALTIME_METRICS.md`.

**Usage:**

```powershell
# Navigate to axionax-web directory
cd C:\Users\engnc\axionaxius02\axionax-web

# Run deployment
.\deploy-to-vps.ps1

# Enter SSH password when prompted
```

### Quick Deploy Script (`deploy-quick.ps1`)

**For rapid iterations:**

```powershell
.\deploy-quick.ps1
```

This skips all tests and immediately:

1. Commits changes
2. Pushes to GitHub
3. Deploys to VPS

## 🔧 Troubleshooting

### SSH Connection Issues

```powershell
# Test SSH connection
ssh root@YOUR_VPS_IP

# If connection fails:
# 1. Check if VPS is online
# 2. Verify firewall allows SSH (port 22)
# 3. Confirm SSH credentials
```

### Website Not Loading

```powershell
# Check if containers are running
ssh root@YOUR_VPS_IP "docker-compose ps"

# View error logs
ssh root@YOUR_VPS_IP "cd /opt/axionax-web && docker-compose logs --tail=100"

# Restart containers
ssh root@YOUR_VPS_IP "cd /opt/axionax-web && docker-compose restart"
```

### Build Failures

```powershell
# Check build logs locally
npm run build

# Check Node.js version
node --version  # Should be >= 18.0.0

# Clear cache and rebuild
Remove-Item -Recurse -Force .next, node_modules
npm install
npm run build
```

### Git Push Failures

```powershell
# Check git status
git status

# Check remote
git remote -v

# Force push (if needed)
git push origin main --force
```

## 📊 Monitoring

### Check Website Status

```powershell
# HTTP request test
Invoke-WebRequest -Uri "http://YOUR_VPS_IP" -UseBasicParsing

# Or use curl
curl http://YOUR_VPS_IP
```

### View Container Stats

```bash
# SSH to VPS
ssh root@YOUR_VPS_IP

# View resource usage
docker stats

# View container details
docker-compose ps
docker-compose top
```

### Check Disk Space

```bash
# On VPS
ssh root@YOUR_VPS_IP "df -h"

# Check Docker disk usage
ssh root@YOUR_VPS_IP "docker system df"
```

## 🔐 Security

### Update SSL Certificate (if needed)

```bash
# Using Certbot
ssh root@YOUR_VPS_IP
certbot --nginx -d axionax.org -d www.axionax.org

# Renew certificate
certbot renew
```

### Update Dependencies

```powershell
# Check for vulnerabilities
npm audit

# Auto-fix issues
npm audit fix

# Force fix (may break things)
npm audit fix --force
```

## 🔄 Rollback

### Rollback to Previous Version

```bash
# SSH to VPS
ssh root@YOUR_VPS_IP
cd /opt/axionax-web

# View git log
git log --oneline -10

# Rollback to specific commit
git reset --hard <commit-hash>
docker-compose up -d --build
```

## 📝 Best Practices

1. **Always test locally first**

   ```powershell
   npm run dev
   npm run build
   ```

2. **Use full deployment for major changes**

   ```powershell
   .\deploy-to-vps.ps1
   ```

3. **Use quick deploy for minor updates**

   ```powershell
   .\deploy-quick.ps1
   ```

4. **Monitor logs after deployment**

   ```powershell
   ssh root@YOUR_VPS_IP "cd /opt/axionax-web && docker-compose logs -f"
   ```

5. **Keep backup of working version**
   ```bash
   git tag -a v1.0.0 -m "Working version"
   git push origin v1.0.0
   ```

## 🆘 Emergency Commands

### Quick Fix

```bash
# SSH and force restart everything
ssh root@YOUR_VPS_IP "cd /opt/axionax-web && docker-compose down && docker-compose up -d --build"
```

### Nuclear Option (full rebuild)

```bash
ssh root@YOUR_VPS_IP
cd /opt/axionax-web
docker-compose down -v  # Remove volumes
docker system prune -af # Clean everything
git reset --hard origin/main
docker-compose up -d --build
```

## 📞 Support

- **GitHub Issues**: https://github.com/axionaxprotocol/axionax-web/issues
- **Documentation**: https://docs.axionax.org
- **Discord**: https://discord.gg/axionax

---

**Last Updated**: 2025-12-05  
**Protocol Version**: v1.9.0-testnet
