# Deployment Checklist ✅

**Protocol Version**: v1.8.0-testnet  
**Last Updated**: December 5, 2025  
**Target**: DevOps & Release Management

---

## 📋 Table of Contents

1. [Pre-Deployment](#pre-deployment)
2. [Deployment Steps](#deployment-steps)
3. [Post-Deployment](#post-deployment)
4. [Rollback Procedures](#rollback-procedures)
5. [Environment Configs](#environment-configs)
6. [Monitoring Setup](#monitoring-setup)

---

## 🔍 Pre-Deployment

### Code Review Checklist

#### ✅ Code Quality

- [ ] All tests passing (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] Code coverage > 80%
- [ ] All dependencies updated to latest stable
- [ ] Security audit completed (if applicable)
- [ ] Performance testing completed

#### ✅ Documentation

- [ ] CHANGELOG.md updated with new version
- [ ] README.md updated (if needed)
- [ ] API documentation updated
- [ ] Deployment instructions reviewed
- [ ] Migration guides written (if breaking changes)

#### ✅ Version Control

- [ ] All changes committed to feature branch
- [ ] Feature branch merged to `develop`
- [ ] `develop` branch passing CI/CD
- [ ] Release branch created from `develop`
- [ ] Version bumped in all `package.json` files
- [ ] Git tags created for release

#### ✅ Security Review

- [ ] Environment variables secured
- [ ] No hardcoded credentials
- [ ] CORS policies reviewed
- [ ] Rate limiting configured
- [ ] SSL/TLS certificates valid
- [ ] Firewall rules configured
- [ ] Dependency vulnerabilities checked (`pnpm audit`)

---

## 🚀 Deployment Steps

### Step 1: Environment Preparation

#### Backup Current State

```bash
# Backup database
docker exec axionax-postgres pg_dump -U axionax axionax_testnet > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup configuration
tar -czf config-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  /etc/nginx/sites-available/axionax \
  /etc/systemd/system/axionax*.service \
  docker-compose.yml \
  .env

# Create application snapshot
docker commit axionax-web axionax-web-snapshot-$(date +%Y%m%d-%H%M%S)
```

#### Stop Services (if required)

```bash
# Check current status
docker-compose ps

# Stop services gracefully
docker-compose stop

# OR for specific services
docker-compose stop axionax-web
docker-compose stop explorer-api
docker-compose stop faucet-api
```

### Step 2: Deploy New Version

#### Pull Latest Code

```bash
cd /var/www/axionax-web-universe
git fetch origin
git checkout main
git pull origin main

# Verify correct version
git log -1
git describe --tags
```

#### Update Dependencies

```bash
# Clean install
pnpm install --frozen-lockfile

# Rebuild packages
pnpm build

# Verify build artifacts
ls -la apps/web/.next
ls -la apps/marketplace/dist
```

#### Update Environment Variables

```bash
# Review .env changes
cat .env.example

# Update .env
nano .env

# Validate environment
node -e "require('dotenv').config(); console.log('✅ Environment loaded')"
```

#### Database Migrations

```bash
# Check pending migrations
docker exec -it axionax-postgres psql -U axionax -d axionax_testnet -c "\dt"

# Run migrations (if using Prisma)
pnpm --filter @axionax/web prisma migrate deploy

# Verify migration
docker exec -it axionax-postgres psql -U axionax -d axionax_testnet -c "SELECT version FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;"
```

### Step 3: Start Services

#### Start in Order

```bash
# 1. Infrastructure services
docker-compose up -d postgres redis

# Wait for health checks
sleep 15

# 2. Backend services
docker-compose up -d rpc-server explorer-api faucet-api

# Wait for health checks
sleep 10

# 3. Frontend services
docker-compose up -d axionax-web marketplace

# 4. Monitoring (if separate)
docker-compose up -d prometheus grafana
```

#### Verify Services

```bash
# Check all containers
docker-compose ps

# Check logs
docker-compose logs -f --tail=50

# Health checks
curl -f http://localhost:3000/api/health || exit 1
curl -f http://localhost:3001/api/health || exit 1
curl -f http://localhost:3002/api/health || exit 1
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## ✅ Post-Deployment

### Smoke Tests

#### Test Web Application

```bash
# Homepage loads
curl -I https://axionax.org | grep "200 OK"

# Assets loading
curl -I https://axionax.org/_next/static/chunks/main.js | grep "200 OK"

# API endpoints
curl https://axionax.org/api/health
curl https://axionax.org/api/stats
```

#### Test Explorer API

```bash
# Health check
curl https://explorer-api.axionax.org/api/health

# Recent blocks
curl https://explorer-api.axionax.org/api/blocks?limit=10

# Recent transactions
curl https://explorer-api.axionax.org/api/transactions?limit=10
```

#### Test Faucet API

```bash
# Health check
curl https://faucet-api.axionax.org/api/health

# Faucet info
curl https://faucet-api.axionax.org/api/info
```

#### Test RPC Server

```bash
# Block number
curl -X POST https://testnet-rpc.axionax.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Chain ID
curl -X POST https://testnet-rpc.axionax.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Network version
curl -X POST https://testnet-rpc.axionax.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
```

### Integration Tests

#### Run Automated Tests

```bash
# E2E tests
pnpm --filter @axionax/web test:e2e

# Integration tests
pnpm --filter @axionax/web test:integration

# API tests
pnpm test:api
```

#### Manual Testing Checklist

- [ ] Login/Authentication works
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Account page displays correct balance
- [ ] Transaction sending works
- [ ] Transaction history loads
- [ ] Block explorer search works
- [ ] Faucet drip works (claim test tokens)
- [ ] Marketplace loads correctly
- [ ] Smart contract interactions work

### Performance Validation

#### Load Time Checks

```bash
# Measure page load time
curl -o /dev/null -s -w "time_total: %{time_total}s\n" https://axionax.org

# Check Core Web Vitals
npx lighthouse https://axionax.org \
  --only-categories=performance \
  --chrome-flags="--headless"
```

#### Resource Usage

```bash
# Check container resource usage
docker stats --no-stream

# Check disk usage
df -h

# Check memory
free -h

# Check CPU
top -bn1 | head -20
```

### Update Monitoring

#### Update Grafana Dashboards

```bash
# Access Grafana
open https://grafana.axionax.org

# Verify dashboards showing new version
# Check for any new metrics
```

#### Update Alerts

```bash
# Review Prometheus rules
cat /etc/prometheus/rules/*.yml

# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload
```

### Documentation Updates

#### Update Public Docs

- [ ] Deploy documentation site
- [ ] Update version number in docs
- [ ] Add release notes
- [ ] Update API reference
- [ ] Update screenshots (if UI changed)

#### Update Internal Docs

- [ ] Update deployment log
- [ ] Document any issues encountered
- [ ] Update runbook with new procedures
- [ ] Update team knowledge base

### Notifications

#### Send Deployment Notifications

```bash
# Discord webhook
curl -X POST https://discord.com/api/webhooks/YOUR_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🚀 **Deployment Complete**",
    "embeds": [{
      "title": "axionax v1.8.0-testnet Deployed",
      "description": "All services operational",
      "color": 65280,
      "fields": [
        {"name": "Version", "value": "v1.8.0-testnet", "inline": true},
        {"name": "Environment", "value": "Production", "inline": true},
        {"name": "Status", "value": "✅ Success", "inline": true}
      ],
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }]
  }'
```

#### Update Status Page

```bash
# Update status.axionax.org if you have one
# Or update #announcements Discord channel
```

---

## 🔙 Rollback Procedures

### When to Rollback

- Critical bug discovered in production
- Performance degradation >50%
- Service availability <99%
- Data integrity issues
- Security vulnerability discovered

### Quick Rollback

#### Revert to Previous Docker Image

```bash
# List available images
docker images | grep axionax-web

# Stop current
docker-compose stop axionax-web

# Start previous version
docker run -d \
  --name axionax-web-rollback \
  -p 3000:3000 \
  --env-file .env \
  axionax-web:1.7.0-testnet

# Verify rollback
curl http://localhost:3000/api/health
```

#### Revert Git Version

```bash
# Find previous release tag
git tag -l

# Checkout previous version
git checkout v1.7.0-testnet

# Rebuild and restart
pnpm install
pnpm build
docker-compose up -d --build
```

### Database Rollback

#### Restore Database Backup

```bash
# Stop services
docker-compose stop

# Restore database
docker exec -i axionax-postgres psql -U axionax axionax_testnet < backup-YYYYMMDD-HHMMSS.sql

# Restart services
docker-compose up -d
```

#### Revert Migration

```bash
# Check migration status
pnpm --filter @axionax/web prisma migrate status

# Rollback last migration
pnpm --filter @axionax/web prisma migrate resolve --rolled-back MIGRATION_NAME

# OR restore from backup (safer)
```

### Full System Rollback

#### Complete Rollback Script

```bash
#!/bin/bash
set -e

echo "🔙 Starting rollback to v1.7.0..."

# 1. Stop all services
echo "Stopping services..."
docker-compose stop

# 2. Restore database
echo "Restoring database..."
docker exec -i axionax-postgres psql -U axionax axionax_testnet < backup-latest.sql

# 3. Checkout previous version
echo "Reverting code..."
git checkout v1.7.0-testnet
git submodule update --init --recursive

# 4. Rebuild
echo "Rebuilding..."
pnpm install --frozen-lockfile
pnpm build

# 5. Restart services
echo "Starting services..."
docker-compose up -d

# 6. Health checks
echo "Running health checks..."
sleep 30
./scripts/health-check.sh

echo "✅ Rollback complete"
```

### Post-Rollback

#### Verify Rollback

```bash
# Check version
curl https://axionax.org/api/version

# Check all services
./scripts/health-check.sh

# Monitor logs
docker-compose logs -f --tail=100
```

#### Document Rollback

- [ ] Note rollback time and reason
- [ ] Identify root cause of failure
- [ ] Create incident report
- [ ] Plan fix for failed deployment
- [ ] Schedule post-mortem meeting

---

## ⚙️ Environment Configs

### Production Environment

**File**: `.env.production`

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=1.8.0-testnet
NEXT_PUBLIC_CHAIN_ID=86137
NEXT_PUBLIC_NETWORK_NAME=axionax-testnet-1

# API Endpoints
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.axionax.org
NEXT_PUBLIC_WS_URL=wss://testnet-ws.axionax.org
NEXT_PUBLIC_EXPLORER_API_URL=https://explorer-api.axionax.org
NEXT_PUBLIC_FAUCET_API_URL=https://faucet-api.axionax.org

# Database
DATABASE_URL=postgresql://axionax:STRONG_PASSWORD@postgres:5432/axionax_testnet
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=RANDOM_256_BIT_SECRET
SESSION_SECRET=RANDOM_256_BIT_SECRET
CORS_ORIGIN=https://axionax.org,https://www.axionax.org

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
ENABLE_METRICS=true
PROMETHEUS_PORT=9090

# Feature Flags
ENABLE_FAUCET=true
ENABLE_MARKETPLACE=true
ENABLE_STAKING=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (if applicable)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@axionax.org
SMTP_PASS=APP_SPECIFIC_PASSWORD
```

### Staging Environment

**File**: `.env.staging`

```bash
# Application
NODE_ENV=staging
NEXT_PUBLIC_APP_VERSION=1.8.0-testnet
NEXT_PUBLIC_CHAIN_ID=86137
NEXT_PUBLIC_NETWORK_NAME=axionax-staging

# API Endpoints
NEXT_PUBLIC_RPC_URL=https://staging-rpc.axionax.org
NEXT_PUBLIC_WS_URL=wss://staging-ws.axionax.org
NEXT_PUBLIC_EXPLORER_API_URL=https://staging-explorer-api.axionax.org
NEXT_PUBLIC_FAUCET_API_URL=https://staging-faucet-api.axionax.org

# Database
DATABASE_URL=postgresql://axionax:PASSWORD@staging-postgres:5432/axionax_staging
REDIS_URL=redis://staging-redis:6379

# Security (different secrets than production!)
JWT_SECRET=DIFFERENT_SECRET_FOR_STAGING
SESSION_SECRET=DIFFERENT_SECRET_FOR_STAGING
CORS_ORIGIN=https://staging.axionax.org

# Monitoring
SENTRY_DSN=https://yyy@sentry.io/yyy
SENTRY_ENVIRONMENT=staging
ENABLE_METRICS=true

# Feature Flags (can enable experimental features)
ENABLE_FAUCET=true
ENABLE_MARKETPLACE=true
ENABLE_STAKING=true
ENABLE_DEBUG=true
```

---

## 📊 Monitoring Setup

### Prometheus Targets

**File**: `prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'axionax-web'
    static_configs:
      - targets: ['axionax-web:9090']

  - job_name: 'explorer-api'
    static_configs:
      - targets: ['explorer-api:9091']

  - job_name: 'faucet-api'
    static_configs:
      - targets: ['faucet-api:9092']

  - job_name: 'rpc-server'
    static_configs:
      - targets: ['rpc-server:9093']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Alert Rules

**File**: `prometheus/alerts.yml`

```yaml
groups:
  - name: axionax_alerts
    interval: 30s
    rules:
      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'Service {{ $labels.job }} is down'
          description: '{{ $labels.job }} has been down for more than 2 minutes.'

      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High error rate on {{ $labels.job }}'
          description: 'Error rate is {{ $value }} for {{ $labels.job }}.'

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High response time on {{ $labels.job }}'
          description: '95th percentile response time is {{ $value }}s.'

      # High memory usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is above 90%.'

      # High disk usage
      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High disk usage on {{ $labels.mountpoint }}'
          description: 'Disk usage is above 85%.'

      # Database connection issues
      - alert: DatabaseConnectionError
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Cannot connect to PostgreSQL'
          description: 'PostgreSQL is unreachable.'
```

### Health Check Script

**File**: `scripts/health-check.sh`

```bash
#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🏥 Running health checks..."
echo ""

# Array to track failures
declare -a FAILURES

# Function to check endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected=$3

    echo -n "Checking $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response, expected $expected)"
        FAILURES+=("$name")
    fi
}

# Function to check RPC
check_rpc() {
    local name=$1
    local url=$2

    echo -n "Checking $name... "

    response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')

    if echo "$response" | grep -q "result"; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILURES+=("$name")
    fi
}

# Run checks
check_endpoint "Web Application" "https://axionax.org" "200"
check_endpoint "Explorer API" "https://explorer-api.axionax.org/api/health" "200"
check_endpoint "Faucet API" "https://faucet-api.axionax.org/api/health" "200"
check_rpc "RPC Server" "https://testnet-rpc.axionax.org"

# Database check
echo -n "Checking PostgreSQL... "
if docker exec axionax-postgres pg_isready -U axionax > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    FAILURES+=("PostgreSQL")
fi

# Redis check
echo -n "Checking Redis... "
if docker exec axionax-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    FAILURES+=("Redis")
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#FAILURES[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ ${#FAILURES[@]} health check(s) failed:${NC}"
    for failure in "${FAILURES[@]}"; do
        echo "  • $failure"
    done
    exit 1
fi
```

**Make executable**:

```bash
chmod +x scripts/health-check.sh
```

---

## 📝 Deployment Log Template

**File**: `deployments/2025-12-05-v1.8.0.md`

```markdown
# Deployment: v1.8.0-testnet

**Date**: December 5, 2025  
**Time**: 14:30 UTC  
**Deployed by**: @username  
**Environment**: Production

## Pre-Deployment

- [x] All tests passing
- [x] Code review completed
- [x] Security audit passed
- [x] Database backup created
- [x] Configuration backup created

## Deployment

**Start time**: 14:30 UTC  
**End time**: 14:52 UTC  
**Duration**: 22 minutes  
**Downtime**: 0 minutes (rolling deployment)

### Steps Executed

1. Pulled latest code from `main` branch
2. Ran `pnpm install --frozen-lockfile`
3. Ran `pnpm build`
4. Updated environment variables
5. Ran database migrations
6. Restarted services (rolling)
7. Ran health checks

## Post-Deployment

- [x] All health checks passed
- [x] Smoke tests completed
- [x] Integration tests passed
- [x] Performance validated
- [x] Monitoring updated
- [x] Documentation updated
- [x] Team notified

## Metrics

**Before Deployment**:

- Response time (p95): 245ms
- Error rate: 0.02%
- Memory usage: 3.2GB
- CPU usage: 28%

**After Deployment**:

- Response time (p95): 198ms
- Error rate: 0.01%
- Memory usage: 3.0GB
- CPU usage: 25%

## Issues Encountered

None

## Rollback Required

No

## Notes

Deployment completed successfully. Performance improvements observed due to optimization in block processing.

## Links

- Release notes: https://github.com/axionaxprotocol/axionax-web-universe/releases/tag/v1.8.0
- PR: https://github.com/axionaxprotocol/axionax-web-universe/pull/123
```

---

## 📞 Emergency Contacts

### On-Call Schedule

```
Monday-Wednesday: @devops-lead
Thursday-Friday: @sre-engineer
Weekend: @platform-engineer
Backup: @cto
```

### Contact Methods

- **Urgent**: Signal group "axionax-oncall"
- **Non-urgent**: Discord #deployments
- **Escalation**: Email cto@axionax.org

---

**Last Updated**: December 5, 2025 | v1.8.0-testnet

**Next Review**: Before v1.9.0 deployment
