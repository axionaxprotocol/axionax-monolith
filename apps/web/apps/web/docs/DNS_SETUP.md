# DNS Setup Guide for axionax.org

Complete guide for configuring DNS records for Axionax Protocol domains.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [DNS Provider Setup](#dns-provider-setup)
- [Required DNS Records](#required-dns-records)
- [Subdomain Configuration](#subdomain-configuration)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### Domain Structure

```
axionax.org                    # Main website
├── www.axionax.org           # WWW redirect
├── rpc.axionax.org           # RPC Node endpoint
├── explorer.axionax.org      # Block Explorer
├── faucet.axionax.org        # Testnet Faucet
├── api.axionax.org           # Explorer API
├── faucet-api.axionax.org    # Faucet API
└── docs.axionax.org          # Documentation (GitHub Pages)
```

### What You'll Need

- Domain name: `axionax.org` (already registered)
- VPS IP address (your server)
- DNS provider access (Namecheap, Cloudflare, GoDaddy, etc.)
- SSL certificates (Let's Encrypt)

---

## 📦 Prerequisites

### 1. Get Your VPS IP Address

**On Linux VPS:**

```bash
# Get public IP
curl -4 ifconfig.me
# or
curl ipinfo.io/ip
```

**On Windows VPS:**

```powershell
# Get public IP
Invoke-RestMethod -Uri https://ipinfo.io/ip
# or
(Invoke-WebRequest -Uri https://ifconfig.me/ip).Content
```

**Example output:**

```
203.0.113.45  # This is your VPS IP address
```

### 2. Have SSH/RDP Access to Your VPS

Make sure you can access your VPS where the services will run.

---

## 🌐 DNS Provider Setup

### Option 1: Cloudflare (Recommended)

**Why Cloudflare?**

- ✅ Free SSL/TLS certificates
- ✅ DDoS protection
- ✅ CDN for faster loading
- ✅ Easy DNS management
- ✅ Automatic HTTPS redirect

**Setup Steps:**

1. **Create Cloudflare Account**
   - Go to https://cloudflare.com
   - Sign up for free account
   - Click "Add a Site"

2. **Add Your Domain**

   ```
   Domain: axionax.org
   Plan: Free (sufficient for most needs)
   ```

3. **Update Nameservers**
   - Cloudflare will provide nameservers like:
     ```
     ns1.cloudflare.com
     ns2.cloudflare.com
     ```
   - Go to your domain registrar (where you bought axionax.org)
   - Update nameservers to Cloudflare's nameservers

4. **Wait for Propagation**
   - Usually takes 5-30 minutes
   - Can take up to 24-48 hours

### Option 2: Direct DNS (Namecheap, GoDaddy, etc.)

If you prefer to use your registrar's DNS:

1. **Log in to Your Domain Registrar**
   - Namecheap: https://namecheap.com
   - GoDaddy: https://godaddy.com
   - Other providers

2. **Navigate to DNS Management**
   - Find "Advanced DNS" or "DNS Management"
   - Look for "Host Records" or "DNS Records"

---

## 📝 Required DNS Records

### Basic Setup (Minimum Required)

Replace `YOUR_VPS_IP` with your actual VPS IP address (e.g., `203.0.113.45`)

| Type  | Host/Name  | Value/Target              | TTL  | Priority |
| ----- | ---------- | ------------------------- | ---- | -------- |
| A     | @          | YOUR_VPS_IP               | 3600 | -        |
| A     | www        | YOUR_VPS_IP               | 3600 | -        |
| A     | rpc        | YOUR_VPS_IP               | 3600 | -        |
| A     | explorer   | YOUR_VPS_IP               | 3600 | -        |
| A     | faucet     | YOUR_VPS_IP               | 3600 | -        |
| A     | api        | YOUR_VPS_IP               | 3600 | -        |
| A     | faucet-api | YOUR_VPS_IP               | 3600 | -        |
| CNAME | docs       | axionaxprotocol.github.io | 3600 | -        |

### Additional Records (Recommended)

**Email Setup (if using email):**

```
Type: MX
Host: @
Value: mail.axionax.org
Priority: 10
TTL: 3600
```

**SPF Record (email security):**

```
Type: TXT
Host: @
Value: v=spf1 mx ~all
TTL: 3600
```

**DMARC Record (email authentication):**

```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@axionax.org
TTL: 3600
```

---

## 🔧 Subdomain Configuration

### Step-by-Step for Each Subdomain

#### 1. Main Website (axionax.org)

**DNS Record:**

```
Type: A
Host: @ (or leave empty)
Value: YOUR_VPS_IP
TTL: 3600
```

**Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/axionax.org

server {
    listen 80;
    listen [::]:80;
    server_name axionax.org www.axionax.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 2. RPC Node (rpc.axionax.org)

**DNS Record:**

```
Type: A
Host: rpc
Value: YOUR_VPS_IP
TTL: 3600
```

**Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/rpc.axionax.org

server {
    listen 80;
    listen [::]:80;
    server_name rpc.axionax.org;

    location / {
        proxy_pass http://localhost:8545;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "POST, GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
    }
}
```

#### 3. Block Explorer (explorer.axionax.org)

**DNS Record:**

```
Type: A
Host: explorer
Value: YOUR_VPS_IP
TTL: 3600
```

**Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/explorer.axionax.org

server {
    listen 80;
    listen [::]:80;
    server_name explorer.axionax.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Faucet (faucet.axionax.org)

**DNS Record:**

```
Type: A
Host: faucet
Value: YOUR_VPS_IP
TTL: 3600
```

**Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/faucet.axionax.org

server {
    listen 80;
    listen [::]:80;
    server_name faucet.axionax.org;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 5. APIs (api.axionax.org, faucet-api.axionax.org)

**DNS Records:**

```
Type: A
Host: api
Value: YOUR_VPS_IP

Type: A
Host: faucet-api
Value: YOUR_VPS_IP
```

**Nginx Configuration:**

```nginx
# /etc/nginx/sites-available/api.axionax.org

server {
    listen 80;
    server_name api.axionax.org;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}

# /etc/nginx/sites-available/faucet-api.axionax.org

server {
    listen 80;
    server_name faucet-api.axionax.org;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

#### 6. Documentation (docs.axionax.org)

**DNS Record (CNAME):**

```
Type: CNAME
Host: docs
Value: axionaxprotocol.github.io.
TTL: 3600
```

**GitHub Pages Setup:**

1. In your `axionax-docs` repository, create file `CNAME`:

   ```
   docs.axionax.org
   ```

2. Enable GitHub Pages in repository settings:
   - Go to Settings > Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

---

## 🔒 SSL Certificate Setup

### Using Certbot (Let's Encrypt)

**Linux (Ubuntu/Debian):**

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get certificates for all domains at once
sudo certbot --nginx -d axionax.org \
  -d www.axionax.org \
  -d rpc.axionax.org \
  -d explorer.axionax.org \
  -d faucet.axionax.org \
  -d api.axionax.org \
  -d faucet-api.axionax.org

# Follow prompts:
# - Enter email: your-email@example.com
# - Agree to terms: Yes (A)
# - Redirect HTTP to HTTPS: Yes (2)

# Test auto-renewal
sudo certbot renew --dry-run
```

**Windows (Using win-acme):**

```powershell
# Download win-acme
Invoke-WebRequest -Uri https://github.com/win-acme/win-acme/releases/latest/download/win-acme.v2.x.x.zip -OutFile win-acme.zip
Expand-Archive win-acme.zip -DestinationPath C:\win-acme
cd C:\win-acme

# Run win-acme
.\wacs.exe

# Choose options:
# - M: Create certificate (full options)
# - 2: Manual input
# - Enter all domains separated by comma
# - Choose validation method (HTTP)
# - Select IIS or manual installation
```

### Using Cloudflare (Automatic SSL)

If using Cloudflare:

1. **Enable SSL/TLS**
   - Go to SSL/TLS tab
   - Set to "Full" or "Full (strict)"

2. **Enable Always Use HTTPS**
   - Go to SSL/TLS > Edge Certificates
   - Turn on "Always Use HTTPS"

3. **Enable HSTS (Recommended)**
   - Enable HTTP Strict Transport Security
   - Max Age: 6 months

---

## ✅ Verification

### 1. Check DNS Propagation

**Online Tools:**

- https://dnschecker.org
- https://www.whatsmydns.net
- https://mxtoolbox.com/SuperTool.aspx

**Command Line:**

```bash
# Check A record
dig axionax.org +short
nslookup axionax.org

# Check specific subdomain
dig rpc.axionax.org +short
dig explorer.axionax.org +short

# Check CNAME record
dig docs.axionax.org +short
```

**Expected Results:**

```bash
$ dig axionax.org +short
203.0.113.45  # Your VPS IP

$ dig rpc.axionax.org +short
203.0.113.45  # Your VPS IP

$ dig docs.axionax.org +short
axionaxprotocol.github.io.
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

### 2. Test HTTP Access

```bash
# Test each endpoint
curl -I http://axionax.org
curl -I http://rpc.axionax.org
curl -I http://explorer.axionax.org
curl -I http://faucet.axionax.org
curl -I http://api.axionax.org
curl -I http://docs.axionax.org
```

### 3. Test HTTPS (After SSL Setup)

```bash
# Test SSL certificate
curl -I https://axionax.org
curl -I https://rpc.axionax.org
curl -I https://explorer.axionax.org

# Check SSL details
openssl s_client -connect axionax.org:443 -servername axionax.org
```

### 4. Test RPC Endpoint

```bash
# Test JSON-RPC
curl -X POST https://rpc.axionax.org \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }'
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x1234"
}
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. DNS Not Resolving

**Problem:** Domain doesn't resolve to IP

**Solutions:**

```bash
# Check if DNS has propagated
dig axionax.org +trace

# Clear local DNS cache
# Windows:
ipconfig /flushdns

# Linux:
sudo systemd-resolve --flush-caches

# macOS:
sudo dscacheutil -flushcache
```

**Wait Time:**

- Local ISP: 5-30 minutes
- Global: Up to 48 hours (rare)

#### 2. SSL Certificate Fails

**Problem:** Certbot fails with "Connection refused"

**Solutions:**

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check port 80 is open
sudo netstat -tlnp | grep :80

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Test Nginx configuration
sudo nginx -t

# Try again
sudo certbot --nginx
```

#### 3. "This site can't be reached"

**Problem:** Site unreachable after DNS setup

**Check:**

```bash
# 1. VPS firewall
sudo ufw status
sudo ufw allow 'Nginx Full'

# 2. Cloud provider firewall
# Check your VPS provider dashboard (AWS Security Groups, etc.)

# 3. Nginx is running
sudo systemctl status nginx
sudo systemctl restart nginx

# 4. Application is running
docker ps
sudo netstat -tlnp
```

#### 4. 502 Bad Gateway

**Problem:** Nginx shows 502 error

**Solutions:**

```bash
# Check backend service is running
docker ps
docker-compose ps

# Check logs
docker-compose logs web
docker-compose logs explorer-api

# Restart services
docker-compose restart

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

#### 5. Mixed Content Warning (HTTP/HTTPS)

**Problem:** HTTPS site loads HTTP resources

**Solution:**

```nginx
# Add to Nginx config
add_header Content-Security-Policy "upgrade-insecure-requests";

# Force HTTPS redirect
server {
    listen 80;
    server_name axionax.org;
    return 301 https://$server_name$request_uri;
}
```

#### 6. Cloudflare Error 521

**Problem:** Cloudflare can't connect to origin

**Solutions:**

```bash
# 1. Check Nginx is running
sudo systemctl status nginx

# 2. Verify origin IP in Cloudflare
# Must match your VPS IP

# 3. Set Cloudflare SSL to "Full"
# Not "Full (strict)" if using self-signed

# 4. Pause Cloudflare temporarily to test
# If site works, issue is with Cloudflare config
```

---

## 📊 DNS Records Summary Table

### Complete DNS Configuration for axionax.org

| Type  | Host/Name  | Value/Target               | TTL  | Purpose        |
| ----- | ---------- | -------------------------- | ---- | -------------- |
| A     | @          | YOUR_VPS_IP                | 3600 | Main website   |
| A     | www        | YOUR_VPS_IP                | 3600 | WWW subdomain  |
| A     | rpc        | YOUR_VPS_IP                | 3600 | RPC endpoint   |
| A     | explorer   | YOUR_VPS_IP                | 3600 | Block explorer |
| A     | faucet     | YOUR_VPS_IP                | 3600 | Testnet faucet |
| A     | api        | YOUR_VPS_IP                | 3600 | Explorer API   |
| A     | faucet-api | YOUR_VPS_IP                | 3600 | Faucet API     |
| CNAME | docs       | axionaxprotocol.github.io. | 3600 | Documentation  |
| TXT   | @          | v=spf1 mx ~all             | 3600 | Email SPF      |
| TXT   | \_dmarc    | v=DMARC1; p=none; rua=...  | 3600 | Email DMARC    |

**Replace `YOUR_VPS_IP` with your actual VPS IP address!**

---

## 🚀 Quick Setup Script

### Automated DNS Check Script

```bash
#!/bin/bash
# check-dns.sh - Verify all DNS records

DOMAIN="axionax.org"
SUBDOMAINS=("www" "rpc" "explorer" "faucet" "api" "faucet-api" "docs")

echo "Checking DNS records for $DOMAIN..."
echo ""

# Check root domain
echo "Root domain:"
dig $DOMAIN +short

echo ""
echo "Subdomains:"

# Check each subdomain
for sub in "${SUBDOMAINS[@]}"; do
    echo -n "$sub.$DOMAIN: "
    dig $sub.$DOMAIN +short
done

echo ""
echo "Testing HTTP access..."

# Test HTTP access
for sub in "" "${SUBDOMAINS[@]}"; do
    if [ -z "$sub" ]; then
        url="http://$DOMAIN"
    else
        url="http://$sub.$DOMAIN"
    fi

    echo -n "Testing $url: "
    status=$(curl -s -o /dev/null -w "%{http_code}" $url)
    echo "HTTP $status"
done
```

**Usage:**

```bash
chmod +x check-dns.sh
./check-dns.sh
```

---

## 📚 Additional Resources

### Official Documentation

- **Cloudflare Docs**: https://developers.cloudflare.com/dns/
- **Let's Encrypt**: https://letsencrypt.org/getting-started/
- **Nginx Documentation**: https://nginx.org/en/docs/

### DNS Tools

- **DNS Checker**: https://dnschecker.org
- **MX Toolbox**: https://mxtoolbox.com
- **SSL Labs**: https://www.ssllabs.com/ssltest/

### Axionax Protocol Docs

- **Full Deployment Guide**: [DEPLOYMENT.md](../DEPLOYMENT.md)
- **Docker Compose Setup**: [docker-compose.yml](../docker-compose.yml)
- **Nginx Configuration**: [nginx/](../nginx/)

---

## 📞 Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section above
2. Review [DEPLOYMENT.md](../DEPLOYMENT.md)
3. Open issue: https://github.com/axionaxprotocol/axionax-web/issues
4. Email: support@axionax.org

---

## 📝 Checklist

Use this checklist to track your DNS setup:

- [ ] Register domain (axionax.org)
- [ ] Get VPS IP address
- [ ] Choose DNS provider (Cloudflare recommended)
- [ ] Update nameservers (if using Cloudflare)
- [ ] Add A records for main domain and subdomains
- [ ] Add CNAME record for docs subdomain
- [ ] Wait for DNS propagation (5-30 min)
- [ ] Verify DNS with dig/nslookup
- [ ] Configure Nginx for all subdomains
- [ ] Test HTTP access to all domains
- [ ] Install SSL certificates with Certbot
- [ ] Test HTTPS access
- [ ] Enable auto-renewal for SSL
- [ ] Test RPC endpoint
- [ ] Test Explorer API
- [ ] Test Faucet
- [ ] Setup monitoring (optional)
- [ ] Document custom configurations

---

<div align="center">

**DNS Setup for Axionax Protocol**

Built with ❤️ by the axionax Team

Last Updated: November 7, 2025

</div>
