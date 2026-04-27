# AxionAX VPS Deployment Guide

**Quick production checklist:** ตั้ง env ตาม `apps/web/.env.example` (อย่างน้อย `NEXT_PUBLIC_*`), รัน `pnpm --filter @axionax/web build` แล้ว `pnpm --filter @axionax/web start` หรือใช้ Vercel/Docker ตามด้านล่าง. รายละเอียด CI และ deploy targets ดูที่ [README § Build & Deploy – Ready for production deploy](../../README.md#-build--deploy).

---

## 🤖 CI/CD Deploy (GitHub Actions)

Workflow `.github/workflows/ci-cd.yml` จะ **deploy จริง** เมื่อ push ขึ้น branch:

- **Staging:** push ไป `develop` → deploy ไป server ของ staging
- **Production:** push ไป `main` → deploy ไป server ของ production

Build ใช้ **Next.js standalone output** (โฟลเดอร์เดียวมี `server.js` + `.next` + `node_modules`) แล้วส่งขึ้น VPS ด้วย **rsync** ผ่าน SSH.

### Required secrets (ต่อ environment)

ตั้งใน **Settings → Secrets and variables → Actions** แล้วเลือก environment **staging** หรือ **production** (แต่ละ environment ใช้ค่าแยกได้):

| Secret               | บังคับ    | ตัวอย่าง                  | หมายเหตุ                                                           |
| -------------------- | --------- | ------------------------- | ------------------------------------------------------------------ |
| `SSH_HOST`           | ✅        | `YOUR_VPS_IP`             | IP หรือ hostname ของ VPS                                           |
| `SSH_USER`           | ✅        | `root` หรือ `deploy`      | User สำหรับ SSH                                                    |
| `SSH_PRIVATE_KEY`    | ✅        | เนื้อหา private key (PEM) | ใช้คู่กับ public key ที่ใส่ใน server                               |
| `REMOTE_PATH`        | ✅        | `/var/www/axionax-web`    | path บน server ที่จะ rsync เนื้อหา standalone ไปไว้                |
| `DEPLOY_RESTART_CMD` | ไม่บังคับ | `pm2 restart axionax-web` | คำสั่งรันหลัง rsync เพื่อ restart app (ถ้าไม่ตั้ง จะแค่ sync ไฟล์) |

### Server setup (รองรับ CI deploy)

1. **สร้างโฟลเดอร์และสิทธิ์**

   ```bash
   sudo mkdir -p /var/www/axionax-web
   sudo chown $USER:$USER /var/www/axionax-web
   ```

2. **ใส่ SSH public key** ของ GitHub Actions (จากคู่ของ `SSH_PRIVATE_KEY`) เข้า `~/.ssh/authorized_keys` ของ `SSH_USER` บน server

3. **รัน app ครั้งแรก (หรือใช้ PM2)**

   ```bash
   cd /var/www/axionax-web
   PORT=3000 node server.js
   ```

   หรือใช้ PM2:

   ```bash
   pm2 start server.js --name axionax-web
   pm2 save && pm2 startup
   ```

   จากนั้นตั้ง `DEPLOY_RESTART_CMD` = `pm2 restart axionax-web`

4. **Nginx (reverse proxy)** ชี้ domain ไปที่ `http://127.0.0.1:3000` ตามที่ใช้อยู่แล้วใน repo

หลัง push ขึ้น `develop`/`main` workflow จะ build → upload artifact → download ใน deploy job → rsync ไป `REMOTE_PATH` → รัน `DEPLOY_RESTART_CMD` (ถ้ามี).

## 🚀 Complete Setup for VPS Deployment

This guide will help you deploy the entire AxionAX infrastructure on a VPS (Linux or Windows), including:

- Web Frontend
- Block Explorer API
- Faucet API
- RPC Node
- PostgreSQL Database
- Redis Cache

**Supported Platforms:**

- 🐧 Linux (Ubuntu 20.04+, Debian, CentOS)
- 🪟 Windows Server 2019+, Windows 10/11

---

## 📋 Prerequisites

### System Requirements:

- **RAM**: At least 4GB (8GB recommended)
- **Storage**: 50GB+ SSD
- **OS**:
  - Linux: Ubuntu 20.04+, Debian 11+, CentOS 8+
  - Windows: Server 2019+, Windows 10/11 Pro
- **Domain**: Domain name pointing to your VPS IP (see [DNS Setup Guide](docs/DNS_SETUP.md))
- **Ports**: 80, 443 available

### Domain & DNS Setup

**Before deployment, configure your domain DNS:**

See detailed guide: [docs/DNS_SETUP.md](docs/DNS_SETUP.md)

**Quick DNS Setup:**

1. Get your VPS IP: `curl ifconfig.me` (Linux) or `Invoke-RestMethod https://ipinfo.io/ip` (Windows)
2. Add DNS A records for:
   - `axionax.org` → YOUR_VPS_IP
   - `www.axionax.org` → YOUR_VPS_IP
   - `rpc.axionax.org` → YOUR_VPS_IP
   - `explorer.axionax.org` → YOUR_VPS_IP
   - `faucet.axionax.org` → YOUR_VPS_IP
   - `api.axionax.org` → YOUR_VPS_IP
3. Add CNAME record for docs: `docs.axionax.org` → `axionaxprotocol.github.io`
4. Wait 5-30 minutes for DNS propagation

**Verify DNS:**

```bash
# Check if DNS is working
dig axionax.org +short
nslookup rpc.axionax.org
```

### Software Requirements:

- Docker Desktop (Windows) or Docker Engine (Linux)
- Docker Compose
- Git

### Install Docker on Linux (Ubuntu/Debian):

```bash
# Update packages
sudo apt update
sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### Install Docker on Windows:

```powershell
# Download and install Docker Desktop from:
# https://www.docker.com/products/docker-desktop

# Or use Chocolatey (if installed):
choco install docker-desktop -y

# Or use winget:
winget install Docker.DockerDesktop

# After installation, restart your computer
# Enable WSL2 backend (recommended)

# Verify installation (PowerShell):
docker --version
docker-compose --version
```

### Install Git:

**Linux:**

```bash
sudo apt install git -y
```

**Windows:**

```powershell
# Using Chocolatey:
choco install git -y

# Or using winget:
winget install Git.Git

# Or download from: https://git-scm.com/download/win
```

---

## 🛠️ Deployment Steps

### 1. Clone Repository

**Linux:**

```bash
cd /opt
sudo git clone https://github.com/axionaxprotocol/axionax-web.git
cd axionax-web
sudo chown -R $USER:$USER .
```

**Windows (PowerShell as Administrator):**

```powershell
cd C:\
git clone https://github.com/axionaxprotocol/axionax-web.git
cd axionax-web
```

### 2. Configure Environment Variables

**Linux:**

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
# Or use: vim .env
```

**Windows:**

```powershell
# Copy environment template
Copy-Item .env.example .env

# Edit environment variables
notepad .env
# Or use: code .env (if VS Code installed)
```

### 3. Update DNS Records

Point these subdomains to your VPS IP:

- `axionax.org` → Your VPS IP
- `api.axionax.org` → Your VPS IP
- `faucet-api.axionax.org` → Your VPS IP
- `rpc.axionax.org` → Your VPS IP

### 4. Deploy Services

**Linux:**

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**Windows:**

```powershell
# Run deployment script
.\deploy.ps1

# Or manually:
docker-compose up -d --build
```

---

## 🔒 Setup SSL Certificates (Recommended)

### Linux - Using Let's Encrypt (Free):

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificates for all domains
sudo certbot certonly --standalone -d axionax.org -d www.axionax.org
sudo certbot certonly --standalone -d api.axionax.org
sudo certbot certonly --standalone -d faucet-api.axionax.org
sudo certbot certonly --standalone -d rpc.axionax.org

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/axionax.org/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/axionax.org/privkey.pem ./nginx/ssl/

# Update nginx config to use HTTPS (uncomment SSL sections in axionax.conf)

# Restart nginx
docker-compose restart nginx

# Auto-renewal (certbot sets this up automatically)
# Check renewal with:
sudo certbot renew --dry-run
```

### Windows - Using Let's Encrypt:

```powershell
# Install win-acme (ACME client for Windows)
# Download from: https://github.com/win-acme/win-acme/releases

# Run win-acme
.\wacs.exe

# Follow interactive prompts to:
# 1. Create certificate for your domains
# 2. Certificates will be saved to C:\ProgramData\win-acme

# Copy certificates to nginx directory
Copy-Item "C:\ProgramData\win-acme\certificates\*.pem" .\nginx\ssl\

# Restart nginx container
docker-compose restart nginx
```

### Alternative: Using Cloudflare (Both Linux & Windows)

If you use Cloudflare, enable SSL/TLS encryption mode to "Full" or "Full (strict)" in Cloudflare dashboard.
Cloudflare will handle SSL automatically.

---

## 📊 Service URLs

After deployment, services will be available at:

| Service      | URL                           | Port   |
| ------------ | ----------------------------- | ------ |
| Website      | http://axionax.org            | 80/443 |
| Explorer API | http://api.axionax.org        | -      |
| Faucet API   | http://faucet-api.axionax.org | -      |
| RPC Node     | http://rpc.axionax.org        | -      |
| PostgreSQL   | Internal                      | 5432   |
| Redis        | Internal                      | 6379   |

---

## 🐳 Docker Commands

### View all services:

**Linux:**

```bash
docker-compose ps
```

**Windows:**

```powershell
docker-compose ps
```

### View logs:

**Linux:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 web
```

**Windows:**

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 web
```

### Restart services:

**Both platforms:**

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart web
docker-compose restart nginx
```

### Stop all services:

**Both platforms:**

```bash
docker-compose down
```

### Rebuild and restart:

**Both platforms:**

```bash
docker-compose up -d --build

# Force rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Remove all containers and volumes (CAUTION):

**Both platforms:**

```bash
docker-compose down -v
```

---

## 🔄 Update Deployment

**Linux:**

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Or use deployment script
./deploy.sh
```

**Windows:**

```powershell
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Or use deployment script
.\deploy.ps1
```

---

## 🗃️ Database Management

### Access PostgreSQL:

**Linux:**

```bash
docker-compose exec postgres psql -U axionax -d axionax
```

**Windows:**

```powershell
docker-compose exec postgres psql -U axionax -d axionax
```

### Backup Database:

**Linux:**

```bash
# Create backup
docker-compose exec postgres pg_dump -U axionax axionax > backup_$(date +%Y%m%d).sql

# Or with compression
docker-compose exec postgres pg_dump -U axionax axionax | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Windows:**

```powershell
# Create backup
docker-compose exec postgres pg_dump -U axionax axionax > "backup_$(Get-Date -Format 'yyyyMMdd').sql"

# Or with compression (requires 7-Zip)
docker-compose exec postgres pg_dump -U axionax axionax | 7z a -si "backup_$(Get-Date -Format 'yyyyMMdd').sql.gz"
```

### Restore Database:

**Linux:**

```bash
# From SQL file
cat backup.sql | docker-compose exec -T postgres psql -U axionax axionax

# From compressed file
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U axionax axionax
```

**Windows:**

```powershell
# From SQL file
Get-Content backup.sql | docker-compose exec -T postgres psql -U axionax axionax

# Or using type
type backup.sql | docker-compose exec -T postgres psql -U axionax axionax
```

---

## 📝 Environment Variables

Create a `.env` file with these variables:

```env
# Database
POSTGRES_DB=axionax
POSTGRES_USER=axionax
POSTGRES_PASSWORD=your_secure_password_here

# API Keys
EXPLORER_API_KEY=your_explorer_api_key
FAUCET_API_KEY=your_faucet_api_key

# RPC Configuration
RPC_NETWORK=testnet
RPC_CHAIN_ID=1337

# Frontend
NEXT_PUBLIC_API_URL=https://api.axionax.org
NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org
NEXT_PUBLIC_FAUCET_URL=https://faucet-api.axionax.org
```

---

## 🔥 Firewall Configuration

### Linux (UFW):

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Windows (PowerShell as Administrator):

```powershell
# Allow HTTP
New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow HTTPS
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow RDP (if needed)
New-NetFirewallRule -DisplayName "Allow RDP" -Direction Inbound -Protocol TCP -LocalPort 3389 -Action Allow

# Check firewall rules
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*HTTP*"}
```

---

## 🚨 Troubleshooting

### Service won't start:

**Linux:**

```bash
# Check logs
docker-compose logs service-name

# Check if port is already in use
sudo netstat -tulpn | grep :80
sudo lsof -i :80

# Check Docker daemon
sudo systemctl status docker
```

**Windows:**

```powershell
# Check logs
docker-compose logs service-name

# Check if port is already in use
netstat -ano | findstr :80

# Check Docker Desktop is running
Get-Service com.docker.service

# Restart Docker Desktop
Restart-Service com.docker.service
```

### Out of disk space:

**Both platforms:**

```bash
# Clean up Docker
docker system prune -a

# Remove old images
docker image prune -a

# Remove unused volumes
docker volume prune
```

**Check disk space:**

- Linux: `df -h`
- Windows: `Get-PSDrive C`

### Permission issues:

**Linux:**

```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Restart Docker
sudo systemctl restart docker
```

**Windows:**

```powershell
# Run PowerShell as Administrator
# Restart Docker Desktop
Restart-Service com.docker.service

# Or restart Docker Desktop from system tray
```

### Docker Compose not found:

**Linux:**

```bash
# Check installation
docker-compose --version

# Reinstall if needed
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Windows:**

```powershell
# Check installation
docker-compose --version

# Docker Compose is included with Docker Desktop
# Reinstall Docker Desktop if needed
```

### Container keeps restarting:

**Both platforms:**

```bash
# Check container logs
docker logs container-name

# Check container status
docker ps -a

# Inspect container
docker inspect container-name

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Network issues:

**Linux:**

```bash
# Check Docker networks
docker network ls

# Inspect network
docker network inspect axionax-web_default

# Recreate network
docker-compose down
docker network prune
docker-compose up -d
```

**Windows:**

```powershell
# Check Docker networks
docker network ls

# Reset network
docker-compose down
docker network prune
docker-compose up -d

# Reset Docker Desktop networking
# Settings → Resources → Network → Reset to defaults
```

---

## 📈 Monitoring

### Check resource usage:

**Linux:**

```bash
# Docker stats
docker stats

# System resources
htop
# Or: top

# Disk usage
df -h
du -sh /opt/axionax-web/*
```

**Windows:**

```powershell
# Docker stats
docker stats

# System resources (Task Manager)
taskmgr

# Or PowerShell:
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10

# Disk usage
Get-PSDrive C
Get-ChildItem C:\axionax-web -Recurse | Measure-Object -Property Length -Sum
```

### Install monitoring tools:

**Linux:**

```bash
# Install htop
sudo apt install htop -y

# Install monitoring stack (Prometheus + Grafana)
# Add to docker-compose.yml or use separate stack
```

**Windows:**

```powershell
# Use Docker Desktop's built-in monitoring
# Or install Portainer for web-based management:
docker volume create portainer_data
docker run -d -p 9000:9000 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce
```

---

## 🎯 Platform-Specific Tips

### Linux Best Practices:

- Use `systemd` to auto-start Docker on boot: `sudo systemctl enable docker`
- Set up log rotation for Docker logs
- Use `fail2ban` for SSH protection
- Regular security updates: `sudo apt update && sudo apt upgrade`
- Monitor with: `htop`, `netdata`, or `glances`

### Windows Best Practices:

- Enable WSL2 for better Docker performance
- Configure Docker Desktop to start on Windows startup
- Use Windows Task Scheduler for automated backups
- Enable Windows Defender Firewall
- Regular Windows Updates
- Monitor with: Task Manager, Performance Monitor, or Docker Desktop dashboard

### Common Paths:

- **Linux**: `/opt/axionax-web`, `/var/lib/docker`, `/etc/docker`
- **Windows**: `C:\axionax-web`, `C:\ProgramData\Docker`, Docker Desktop settings

---

## 📊 Performance Tuning

### Linux:

```bash
# Increase file descriptors
echo "fs.file-max = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Docker memory limits (in docker-compose.yml)
# mem_limit: 2g
# memswap_limit: 2g

# Optimize Docker storage driver
# Edit /etc/docker/daemon.json:
{
  "storage-driver": "overlay2"
}
```

### Windows:

```powershell
# Allocate more resources to Docker Desktop:
# Settings → Resources → Advanced
# - CPUs: 4+
# - Memory: 8GB+
# - Swap: 2GB+

# Enable WSL2 integration for better performance
# Settings → General → Use WSL2 based engine
```

1. **Implement Backend APIs**
   - Create Explorer backend in `explorer-backend/`
   - Create Faucet backend in `faucet-backend/`
   - Implement RPC node

2. **Setup Monitoring**
   - Add Grafana for metrics
   - Configure alerts

3. **Setup Backups**
   - Database backups
   - Config backups

4. **Security Hardening**
   - Setup firewall rules
   - Configure fail2ban
   - Enable rate limiting

---

## 🎯 Next Steps

For issues or questions:

- GitHub: https://github.com/axionaxprotocol
- Discord: https://discord.gg/axionax
- Docs: https://axionax.org/docs

---

**Happy Deploying! 🚀**
