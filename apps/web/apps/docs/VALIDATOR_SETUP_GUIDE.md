# Validator Node Setup Guide 🛡️

**Protocol Version**: v1.8.0-testnet  
**Last Updated**: December 5, 2025  
**Target**: Testnet Validators

---

## 📋 Table of Contents

1. [Requirements](#requirements)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Configuration](#configuration)
5. [Running the Validator](#running-the-validator)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## 💻 Requirements

### Hardware Requirements (Minimum)

- **CPU**: 4 cores / 8 threads
- **RAM**: 16GB
- **Storage**: 500GB SSD
- **Network**: 100 Mbps up/down
- **Public IP**: Required

### Hardware Requirements (Recommended)

- **CPU**: 8+ cores / 16+ threads
- **RAM**: 32GB+
- **Storage**: 1TB+ NVMe SSD
- **Network**: 1 Gbps up/down
- **Public IP**: Static IP preferred

### Software Requirements

- **OS**: Ubuntu 22.04 LTS (recommended) or Ubuntu 20.04 LTS
- **Docker**: 24.0+ and Docker Compose 2.0+
- **Node.js**: 18.x or 20.x
- **Rust**: 1.75+
- **Git**: 2.x

---

## 🚀 Quick Start

### One-Line Setup (Ubuntu)

```bash
curl -sSL https://raw.githubusercontent.com/axionaxprotocol/axionax-core/main/scripts/setup-validator.sh | bash
```

This script will:

1. Install all dependencies
2. Clone the repository
3. Build the validator
4. Generate keys
5. Start the node

---

## 🔧 Detailed Setup

### Step 1: Prepare the Server

#### Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential jq
```

#### Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup update
```

#### Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 2: Clone Repository

```bash
# Clone the validator repository
git clone https://github.com/axionaxprotocol/axionax-validator.git
cd axionax-validator

# Checkout testnet branch
git checkout testnet-v1.8.0
```

### Step 3: Build Validator

```bash
# Build in release mode
cargo build --release --bin axionax-validator

# Verify build
./target/release/axionax-validator --version
# Should output: axionax-validator v1.8.0-testnet
```

### Step 4: Generate Validator Keys

#### Create Validator Keys

```bash
# Generate new validator keypair
./target/release/axionax-validator keys generate \
  --output ./keys/validator-key.json

# Generate node key (for P2P)
./target/release/axionax-validator keys generate-node-key \
  --output ./keys/node-key.json
```

**Important**:

- Backup these keys securely
- Never share `validator-key.json`
- Store in encrypted backup

#### Export Keys (for backup)

```bash
# Create secure backup
tar -czf validator-keys-$(date +%Y%m%d).tar.gz ./keys/
gpg -c validator-keys-$(date +%Y%m%d).tar.gz

# Move encrypted backup to safe location
mv validator-keys-*.tar.gz.gpg ~/backups/
```

---

## ⚙️ Configuration

### Step 1: Create Configuration File

Create `config.toml`:

```toml
# axionax Validator Configuration v1.8.0

[network]
chain_id = 86137
network_name = "axionax-testnet-1"

[p2p]
# Your node's external IP
external_address = "YOUR_PUBLIC_IP:30303"
# P2P listening port
listen_address = "0.0.0.0:30303"
# Maximum peers
max_peers = 50

[rpc]
# RPC endpoints
http_enabled = true
http_address = "0.0.0.0:8545"
ws_enabled = true
ws_address = "0.0.0.0:8546"

# CORS for development (disable in production)
http_cors_origins = ["*"]

[validator]
# Path to validator key
key_file = "./keys/validator-key.json"
# Validator address (will be derived from key)
address = ""

[consensus]
# PoPC parameters
block_time = 3  # seconds
sample_size = 1000
min_confidence = 0.99
fraud_window = 3600  # seconds

[database]
# Database path
path = "./data"

[logging]
level = "info"
# Available levels: trace, debug, info, warn, error
format = "json"
```

### Step 2: Configure Environment Variables

Create `.env`:

```bash
# Network Configuration
CHAIN_ID=86137
NETWORK_NAME=axionax-testnet-1

# Node Configuration
NODE_NAME="My Validator Node"
EXTERNAL_IP=YOUR_PUBLIC_IP_HERE

# RPC Configuration
RPC_HTTP_PORT=8545
RPC_WS_PORT=8546

# P2P Configuration
P2P_PORT=30303
MAX_PEERS=50

# Bootnodes (for peer discovery)
BOOTNODES="enode://validator1@217.216.109.5:30303,enode://validator2@46.250.244.4:30303"

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
```

### Step 3: Bootstrap Node Data

#### Download Genesis File

```bash
curl -o genesis.json \
  https://raw.githubusercontent.com/axionaxprotocol/axionax-validator/main/genesis/testnet.json
```

#### Initialize Database

```bash
./target/release/axionax-validator init \
  --config config.toml \
  --genesis genesis.json
```

---

## 🏃 Running the Validator

### Method 1: Direct Run (Development)

```bash
./target/release/axionax-validator run \
  --config config.toml
```

### Method 2: Using systemd (Production)

#### Create systemd Service

```bash
sudo nano /etc/systemd/system/axionax-validator.service
```

Add:

```ini
[Unit]
Description=axionax Validator Node
After=network.target

[Service]
Type=simple
User=axionax
WorkingDirectory=/home/axionax/axionax-validator
ExecStart=/home/axionax/axionax-validator/target/release/axionax-validator run --config /home/axionax/axionax-validator/config.toml
Restart=on-failure
RestartSec=10
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

#### Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable axionax-validator

# Start service
sudo systemctl start axionax-validator

# Check status
sudo systemctl status axionax-validator

# View logs
sudo journalctl -u axionax-validator -f
```

### Method 3: Using Docker

#### Create Dockerfile

```dockerfile
FROM rust:1.75 as builder

WORKDIR /build
COPY . .
RUN cargo build --release --bin axionax-validator

FROM ubuntu:22.04
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/axionax-validator /usr/local/bin/
COPY config.toml /etc/axionax/config.toml
COPY genesis.json /etc/axionax/genesis.json

EXPOSE 8545 8546 30303 9090

CMD ["axionax-validator", "run", "--config", "/etc/axionax/config.toml"]
```

#### Build and Run

```bash
# Build image
docker build -t axionax-validator:v1.8.0 .

# Run container
docker run -d \
  --name axionax-validator \
  -p 8545:8545 \
  -p 8546:8546 \
  -p 30303:30303 \
  -p 9090:9090 \
  -v $(pwd)/data:/data \
  -v $(pwd)/keys:/keys \
  axionax-validator:v1.8.0
```

---

## 📊 Monitoring

### Check Node Status

```bash
# Using RPC
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Using CLI
./target/release/axionax-validator status

# Check peers
./target/release/axionax-validator peers list
```

### View Logs

```bash
# If using systemd
sudo journalctl -u axionax-validator -f

# If using Docker
docker logs -f axionax-validator

# Direct run
tail -f validator.log
```

### Metrics & Prometheus

Access metrics at: `http://localhost:9090/metrics`

**Key Metrics**:

```promql
# Is syncing
axionax_sync_status

# Current block height
axionax_block_height

# Peer count
axionax_peer_count

# Validator balance
axionax_validator_balance

# Blocks validated
axionax_blocks_validated_total

# Validation errors
axionax_validation_errors_total
```

### Setup Grafana Dashboard

1. Install Grafana:

```bash
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

2. Access: `http://localhost:3000` (admin/admin)

3. Add Prometheus data source:
   - URL: `http://localhost:9090`

4. Import dashboard:
   - ID: `axionax-validator` (from https://grafana.com)

---

## 🔒 Security Best Practices

### Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow RPC (only if needed publicly)
# sudo ufw allow 8545/tcp
# sudo ufw allow 8546/tcp

# Allow P2P
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp

# Allow metrics (restrict to monitoring server)
sudo ufw allow from MONITORING_IP to any port 9090

# Enable firewall
sudo ufw enable
```

### Key Security

```bash
# Set proper permissions
chmod 600 keys/validator-key.json
chmod 600 keys/node-key.json

# Consider using hardware security module (HSM)
# or secure enclave for key storage
```

### SSH Hardening

```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

### Regular Updates

```bash
# Keep system updated
sudo apt update && sudo apt upgrade -y

# Update validator software
cd axionax-validator
git pull origin testnet-v1.8.0
cargo build --release
sudo systemctl restart axionax-validator
```

---

## 🔧 Troubleshooting

### Node Won't Start

**Check logs**:

```bash
sudo journalctl -u axionax-validator -n 100 --no-pager
```

**Common issues**:

- Port already in use → Change ports in config
- Invalid genesis file → Re-download genesis
- Corrupted database → Delete `./data` and re-init
- Missing keys → Generate new keys

### Node Not Syncing

**Check peers**:

```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```

**Solutions**:

- Check firewall (port 30303)
- Verify bootnodes in config
- Check internet connectivity
- Try different bootnodes

### Low Peer Count

**Possible causes**:

- Firewall blocking P2P port
- NAT/router configuration
- Node behind proxy

**Solutions**:

```bash
# Test P2P port
nc -zv YOUR_IP 30303

# Configure port forwarding on router
# Forward port 30303 to your node's local IP

# Update external_address in config
external_address = "YOUR_PUBLIC_IP:30303"
```

### High Memory Usage

**Check resource usage**:

```bash
docker stats axionax-validator
# or
top -p $(pgrep axionax-validator)
```

**Solutions**:

- Increase system RAM
- Adjust cache settings in config
- Restart node periodically
- Use SSD for database

---

## 📞 Support & Resources

### Get Help

- **Discord**: https://discord.gg/axionax (#validator-support)
- **Documentation**: https://docs.axionax.org
- **GitHub Issues**: https://github.com/axionaxprotocol/axionax-validator/issues

### Useful Links

- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Network Status](./TESTNET_STATUS.md)
- [Operations Runbook](./RUNBOOK.md)

### Validator Requirements for Mainnet

When mainnet launches, validators must:

- ✅ Run testnet validator successfully for 3+ months
- ✅ Maintain >99% uptime
- ✅ Stake minimum required AXX tokens
- ✅ Complete KYC/KYB process
- ✅ Pass security audit

---

**Happy Validating! 🚀**

_Last Updated: December 5, 2025 | v1.8.0-testnet_
