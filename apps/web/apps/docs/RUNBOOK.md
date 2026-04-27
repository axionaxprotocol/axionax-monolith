# axionax Protocol Operations Runbook 📚

**Version**: v1.8.0-testnet  
**Last Updated**: December 5, 2025  
**Target Audience**: DevOps, SRE, Operations Team

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Health Check Commands](#health-check-commands)
3. [Service Management](#service-management)
4. [Troubleshooting](#troubleshooting)
5. [Emergency Procedures](#emergency-procedures)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Backup & Recovery](#backup--recovery)
8. [Maintenance Tasks](#maintenance-tasks)

---

## 🏗️ System Overview

### Infrastructure

- **VPS**: vmi2895217
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 8GB
- **CPU**: 4 vCores
- **Disk**: 72GB SSD

### Services Architecture

```
┌─────────────────────────────────────────┐
│         Nginx (Reverse Proxy)           │
│       Ports: 80 (HTTP), 443 (HTTPS)    │
└─────────────────────────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    │                               │
┌───▼────┐  ┌────────┐  ┌──────────▼─────┐
│ Web    │  │ Faucet │  │ Explorer       │
│ :3000  │  │ :3002  │  │ :3001          │
└────────┘  └────────┘  └────────────────┘
    │                         │
    └────────┬────────────────┘
             │
    ┌────────▼──────────┐
    │ RPC Server        │
    │ :8545 (HTTP)      │
    │ :8546 (WebSocket) │
    └───────┬───────────┘
            │
    ┌───────▼───────────────────┐
    │  PostgreSQL    │  Redis   │
    │  :5432         │  :6379   │
    └────────────────┴──────────┘

    ┌──────────────────────────┐
    │ Monitoring Stack         │
    │ - Grafana :3030         │
    │ - Primary: `ssh root@vmi2895217`      │
    └──────────────────────────┘
```

### Service Status Summary

| Service      | Port      | Container Name | Status     |
| ------------ | --------- | -------------- | ---------- |
| Nginx        | 80/443    | nginx          | ✅ Running |
| Web          | 3000      | axionax-web    | ✅ Running |
| Explorer API | 3001      | explorer-api   | ✅ Running |
| Faucet API   | 3002      | faucet-api     | ✅ Running |
| RPC Server   | 8545/8546 | rpc-server     | ✅ Running |
| PostgreSQL   | 5432      | postgres       | ✅ Running |
| Redis        | 6379      | redis          | ✅ Running |
| Grafana      | 3030      | grafana        | ✅ Running |
| Prometheus   | 9090      | prometheus     | ✅ Running |

---

## 🩺 Health Check Commands

### Quick Health Check (All Services)

```bash
#!/bin/bash
# Run this to check all services at once

echo "=== axionax Protocol Health Check ==="
echo "Date: $(date)"
echo ""

# Nginx
echo "1. Nginx (Port 80):"
curl -s -o /dev/null -w "%{http_code}" http://localhost
echo ""

# Web Interface
echo "2. Web Interface (Port 3000):"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
echo ""

# Explorer API
echo "3. Explorer API (Port 3001):"
curl -s http://localhost:3001/health | jq '.'
echo ""

# Faucet API
echo "4. Faucet API (Port 3002):"
curl -s http://localhost:3002/health | jq '.'
echo ""

# RPC Server
echo "5. RPC Server (Port 8545):"
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  | jq '.'
echo ""

# PostgreSQL
echo "6. PostgreSQL (Port 5432):"
docker exec postgres pg_isready
echo ""

# Redis
echo "7. Redis (Port 6379):"
docker exec redis redis-cli ping
echo ""

# Grafana
echo "8. Grafana (Port 3030):"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/api/health
echo ""

# Prometheus
echo "9. Prometheus (Port 9090):"
curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/-/healthy
echo ""

echo ""
echo "=== Health Check Complete ==="
```

### Individual Service Checks

#### Nginx

```bash
# Check status
systemctl status nginx

# Test configuration
nginx -t

# Check access logs
tail -f /var/log/nginx/access.log

# Check error logs
tail -f /var/log/nginx/error.log
```

#### Docker Containers

```bash
# List all containers
docker ps -a

# Check specific container logs
docker logs axionax-web --tail 100 -f
docker logs explorer-api --tail 100 -f
docker logs faucet-api --tail 100 -f

# Check container stats
docker stats
```

#### PostgreSQL

```bash
# Connect to database
docker exec -it postgres psql -U axionax -d axionax_db

# Check database size
docker exec postgres psql -U axionax -d axionax_db -c "\l+"

# Check active connections
docker exec postgres psql -U axionax -d axionax_db -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

#### Redis

```bash
# Check memory usage
docker exec redis redis-cli info memory

# Check connected clients
docker exec redis redis-cli info clients

# Monitor commands
docker exec redis redis-cli monitor
```

#### RPC Server

```bash
# Get block number
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get network version
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'

# Check syncing status
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'
```

---

## 🔧 Service Management

### Start/Stop/Restart Services

#### Using Docker Compose

```bash
# Start all services
cd /path/to/docker-compose
docker-compose up -d

# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart axionax-web
docker-compose restart explorer-api
docker-compose restart faucet-api
```

#### Individual Containers

```bash
# Restart a container
docker restart <container_name>

# Stop a container
docker stop <container_name>

# Start a container
docker start <container_name>

# Remove and recreate
docker stop <container_name>
docker rm <container_name>
docker-compose up -d <service_name>
```

#### Nginx

```bash
# Reload configuration (no downtime)
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx

# Stop Nginx
sudo systemctl stop nginx

# Start Nginx
sudo systemctl start nginx
```

### View Logs

```bash
# Real-time logs (all services)
docker-compose logs -f

# Specific service logs
docker-compose logs -f axionax-web
docker-compose logs -f explorer-api --tail 100

# Export logs to file
docker logs axionax-web > /tmp/web.log 2>&1
```

---

## 🔥 Troubleshooting

### Problem: Service Not Responding

#### Symptoms

- HTTP 502 Bad Gateway
- Connection timeout
- Container shows as "Up" but not working

#### Diagnosis

```bash
# Check container status
docker ps | grep <service_name>

# Check container logs for errors
docker logs <container_name> --tail 50

# Check container resource usage
docker stats <container_name>

# Check port bindings
docker port <container_name>

# Test port connectivity
telnet localhost <port>
nc -zv localhost <port>
```

#### Solutions

```bash
# Restart the service
docker restart <container_name>

# If restart doesn't help, recreate
docker stop <container_name>
docker rm <container_name>
docker-compose up -d <service_name>

# Check environment variables
docker inspect <container_name> | jq '.[0].Config.Env'

# Check volumes
docker inspect <container_name> | jq '.[0].Mounts'
```

### Problem: Database Connection Errors

#### Symptoms

- "Connection refused"
- "Too many connections"
- Services can't connect to PostgreSQL

#### Diagnosis

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs postgres --tail 100

# Test connection
docker exec postgres psql -U axionax -d axionax_db -c "SELECT version();"

# Check max connections
docker exec postgres psql -U axionax -d axionax_db -c \
  "SHOW max_connections;"

# Check current connections
docker exec postgres psql -U axionax -d axionax_db -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

#### Solutions

```bash
# Restart PostgreSQL
docker restart postgres

# Increase max_connections (if needed)
# Edit postgresql.conf
docker exec postgres bash -c \
  "echo 'max_connections = 200' >> /var/lib/postgresql/data/postgresql.conf"
docker restart postgres

# Kill idle connections
docker exec postgres psql -U axionax -d axionax_db -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND state_change < current_timestamp - INTERVAL '10 minutes';"
```

### Problem: High Memory Usage

#### Diagnosis

```bash
# Check system memory
free -h

# Check Docker memory usage
docker stats --no-stream

# Check top memory consumers
docker stats --no-stream --format \
  "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | sort -k 3 -h -r
```

#### Solutions

```bash
# Restart high-memory service
docker restart <container_name>

# Clear Redis cache
docker exec redis redis-cli FLUSHALL

# Set memory limits
docker update --memory 512m <container_name>

# Clean up unused Docker resources
docker system prune -a --volumes
```

### Problem: Disk Space Full

#### Diagnosis

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Find large files
du -sh /* | sort -h -r | head -10

# Check logs size
du -sh /var/log/*
```

#### Solutions

```bash
# Clean up Docker
docker system prune -a --volumes

# Rotate logs
sudo logrotate -f /etc/logrotate.conf

# Clean old backups
find /backups -type f -mtime +7 -delete

# Clean package cache
sudo apt-get clean
```

---

## 🚨 Emergency Procedures

### Service Down - Quick Recovery

#### Step 1: Assess the Situation

```bash
# Check what's down
./health-check.sh

# Check system resources
top
df -h
free -h
```

#### Step 2: Check Logs

```bash
# Recent errors
docker logs <service> --since 10m | grep -i error

# System logs
sudo journalctl -xe --since "10 minutes ago"
```

#### Step 3: Restart Service

```bash
# Try restart first
docker restart <service>

# Wait 30 seconds
sleep 30

# Check if working
curl http://localhost:<port>/health
```

#### Step 4: Recreate if Needed

```bash
# Stop and remove
docker stop <service>
docker rm <service>

# Recreate
docker-compose up -d <service>

# Verify
docker logs <service> -f
```

### Complete System Failure

#### Full Restart Procedure

```bash
#!/bin/bash
# Emergency full restart

echo "=== EMERGENCY: Full System Restart ==="
echo "Starting at: $(date)"

# Stop all services
echo "1. Stopping all Docker services..."
docker-compose down

# Wait for clean shutdown
sleep 10

# Start infrastructure layer
echo "2. Starting infrastructure..."
docker-compose up -d postgres redis

# Wait for databases
sleep 15

# Start application layer
echo "3. Starting applications..."
docker-compose up -d rpc-server explorer-api faucet-api axionax-web

# Wait for apps
sleep 10

# Start monitoring
echo "4. Starting monitoring..."
docker-compose up -d grafana prometheus

# Restart Nginx
echo "5. Restarting Nginx..."
sudo systemctl restart nginx

# Wait for everything to stabilize
echo "6. Waiting for services to stabilize..."
sleep 30

# Run health check
echo "7. Running health check..."
./health-check.sh

echo "=== Restart Complete at: $(date) ==="
```

### Data Corruption Recovery

#### If PostgreSQL is corrupted

```bash
# Stop services
docker-compose down

# Restore from backup
./restore-backup.sh latest

# Start services
docker-compose up -d

# Verify data integrity
docker exec postgres psql -U axionax -d axionax_db -c \
  "SELECT count(*) FROM blocks;"
```

---

## 📊 Monitoring & Alerts

### Grafana Dashboards

Access: http://YOUR_VPS_IP:3030

**Login**:

- Username: `admin`
- Password: (check `/secrets/grafana-password`)

**Dashboards**:

1. **System Overview** - CPU, Memory, Disk, Network
2. **Service Health** - All services status
3. **RPC Metrics** - Request rate, latency, errors
4. **Database Performance** - Queries, connections, cache hit rate

### Prometheus Metrics

Access: http://YOUR_VPS_IP:9090

**Key Metrics**:

```promql
# Service uptime
up{job="axionax"}

# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (p95)
histogram_quantile(0.95, http_request_duration_seconds_bucket)
```

### Alert Rules

**Critical Alerts** (Page immediately):

- Service down > 2 minutes
- Disk usage > 90%
- Memory usage > 95%
- Error rate > 10%

**Warning Alerts** (Notify):

- Service down > 30 seconds
- Disk usage > 80%
- Memory usage > 85%
- Error rate > 5%

---

## 💾 Backup & Recovery

### Automated Backups

**Schedule**: Daily at 02:00 UTC

**Retention**: 7 days

**Location**: `/backups/`

### Manual Backup

```bash
#!/bin/bash
# Manual backup script

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
docker exec postgres pg_dump -U axionax axionax_db \
  > "$BACKUP_DIR/postgres_$TIMESTAMP.sql"

# Backup volumes
docker run --rm \
  -v axionax_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/volumes_$TIMESTAMP.tar.gz /data

# Backup configs
tar czf "$BACKUP_DIR/configs_$TIMESTAMP.tar.gz" \
  /etc/nginx \
  /path/to/docker-compose.yml \
  /path/to/.env

echo "Backup completed: $TIMESTAMP"
```

### Restore from Backup

```bash
#!/bin/bash
# Restore from backup

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file>"
  exit 1
fi

# Stop services
docker-compose down

# Restore database
docker-compose up -d postgres
sleep 10
docker exec -i postgres psql -U axionax axionax_db < $BACKUP_FILE

# Start services
docker-compose up -d

echo "Restore completed"
```

---

## 🔄 Maintenance Tasks

### Daily Tasks (Automated)

- ✅ Health checks every 5 minutes
- ✅ Log rotation
- ✅ Backup at 02:00 UTC
- ✅ Metrics collection

### Weekly Tasks

```bash
# Clean up Docker
docker system prune -f

# Update packages
sudo apt update
sudo apt upgrade -y

# Check SSL certificates
sudo certbot certificates

# Review logs for errors
grep -i error /var/log/nginx/error.log | tail -100
```

### Monthly Tasks

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Security updates
sudo apt update
sudo apt dist-upgrade -y

# Audit user access
last | head -20

# Review backup integrity
ls -lh /backups/
```

### SSL Certificate Renewal

```bash
# Auto-renew (runs automatically)
sudo certbot renew

# Manual renew
sudo certbot renew --force-renewal

# Test renewal
sudo certbot renew --dry-run
```

---

## 📞 Escalation & Contacts

### On-Call Rotation

- **Primary**: DevOps Team (Discord #ops-alerts)
- **Secondary**: Backend Team
- **Emergency**: CTO

### Escalation Path

1. **Level 1** (0-15 min): On-call engineer
2. **Level 2** (15-30 min): Team lead
3. **Level 3** (30+ min): CTO + All hands

### Contact Information

- **Discord**: #ops-emergency
- **Email**: ops@axionax.org
- **Phone**: (Emergency only, check internal docs)

---

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Best Practices](./SECURITY.md)
- [Incident Response Playbook](./INCIDENT_RESPONSE.md)

---

**Keep this runbook updated!** Last reviewed: December 5, 2025

_For questions or improvements, contact the DevOps team._
