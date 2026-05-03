# Validator Setup Guide

> **Complete guide to setting up an Axionax validator node**

**Last Updated**: May 3, 2026  
**Protocol Version**: v1.9.0-testnet

---

## Overview

This guide covers setting up a validator node on the Axionax network. Validators participate in consensus, produce blocks, and secure the network through PoPC (Proof of Correct Computation) and PoS (Proof of Stake).

**Primary Reference**: See [`../architecture/AXIONAX_PROTOCOL.md`](../architecture/AXIONAX_PROTOCOL.md) for complete protocol architecture, including:
- Core workflow: Post → Assign → Execute → Commit → DA Pre-commit → Wait k → Challenge → Prove → Verify → Seal → Fraud Window → Finalize
- PoPC (Proof of Probabilistic Checking) with s=1000 samples
- Delayed VRF for challenge generation (k≥2 blocks)
- Data Availability requirements
- Security and anti-fraud mechanisms

**Prerequisites:**
- Linux server (Ubuntu 20.04+ recommended)
- Static IP address
- Minimum 10,000 AXX staked
- Docker and Docker Compose installed
- Basic command-line knowledge

---

## Hardware Requirements

| Tier | CPU | RAM | Storage | Bandwidth | Use Case |
|------|-----|-----|---------|-----------|----------|
| **Minimum** | 4 cores | 8 GB | 100 GB NVMe | 2 TB/mo | Testnet |
| **Recommended** | 8 cores | 16 GB | 200 GB NVMe | 4 TB/mo | Production |
| **Production** | 8+ cores | 32 GB | 500 GB NVMe | 6 TB/mo | Mainnet |

**Notes:**
- NVMe recommended for I/O performance
- 99.9%+ uptime target
- DDoS protection recommended
- Static IP required for P2P

---

## Network Configuration

### Required Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 30333 | TCP/UDP | P2P network |
| 8545 | TCP | JSON-RPC HTTP |
| 8546 | TCP | WebSocket RPC |

### Firewall Setup

```bash
# Allow P2P
sudo ufw allow 30333/tcp
sudo ufw allow 30333/udp

# Allow RPC
sudo ufw allow 8545/tcp
sudo ufw allow 8546/tcp

# Enable firewall
sudo ufw enable
```

---

## Quick Start (Docker)

### 1. Clone Repository

```bash
git clone https://github.com/axionaxprotocol/axionax-monolith.git
cd axionax-monolith
```

### 2. Configure Validator

Create `validator-config.yaml`:

```yaml
node:
  mode: "validator"
  network: "testnet"  # or "mainnet"
  p2p:
    listen_addr: "/ip4/0.0.0.0/tcp/30333"
    bootnodes:
      - "/ip4/217.216.109.5/tcp/30333/p2p/QmBootnode1"
      - "/ip4/46.250.244.4/tcp/30333/p2p/QmBootnode2"
  
  rpc:
    enabled: true
    host: "0.0.0.0"
    port: 8545
    ws_port: 8546

validator:
  private_key: "YOUR_PRIVATE_KEY_HERE"
  min_stake: 10000  # AXX
  commission_bps: 500  # 5%
```

### 3. Start Validator

```bash
docker-compose -f docker-compose.validator.yml up -d
```

### 4. Check Status

```bash
# Check logs
docker-compose -f docker-compose.validator.yml logs -f

# Check sync status
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Manual Setup (Binary)

### 1. Download Binary

```bash
wget https://github.com/axionaxprotocol/axionax-core/releases/download/v1.9.0/axionax-node-linux-amd64
chmod +x axionax-node-linux-amd64
sudo mv axionax-node-linux-amd64 /usr/local/bin/axionax-node
```

### 2. Create Service User

```bash
sudo useradd -r -s /bin/false axionax
sudo mkdir -p /var/lib/axionax
sudo chown axionax:axionax /var/lib/axionax
```

### 3. Create Systemd Service

Create `/etc/systemd/system/axionax-validator.service`:

```ini
[Unit]
Description=Axionax Validator Node
After=network.target

[Service]
Type=simple
User=axionax
ExecStart=/usr/local/bin/axionax-node \
  --role validator \
  --config /etc/axionax/validator-config.yaml \
  --data-dir /var/lib/axionax
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 4. Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable axionax-validator
sudo systemctl start axionax-validator
```

---

## Staking

### 1. Fund Validator Address

Ensure your validator address has at least 10,000 AXX.

### 2. Stake Tokens

```bash
# Using JSON-RPC
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_stake",
    "params": ["0xYOUR_ADDRESS", "0x8ac7230489e80000"],
    "id": 1
  }'
```

### 3. Check Validator Status

```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_getValidator",
    "params": ["0xYOUR_ADDRESS"],
    "id": 1
  }'
```

---

## Monitoring

### Prometheus Metrics

Validator exposes metrics on port 9615:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'axionax-validator'
    static_configs:
      - targets: ['localhost:9615']
```

### Grafana Dashboard

Import the Axionax validator dashboard from the repository.

### Health Checks

```bash
# Check if node is syncing
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'

# Check validator is active
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"staking_getValidator","params":["0xYOUR_ADDRESS"],"id":1}'
```

---

## Security Best Practices

1. **Private Key Security**
   - Never commit private keys to git
   - Use environment variables or secret management
   - Store keys in hardware wallet if possible

2. **Network Security**
   - Use firewall rules
   - Enable DDoS protection
   - Use VPN for remote access

3. **Update Regularly**
   - Keep software updated
   - Monitor security advisories
   - Test upgrades on testnet first

4. **Backup**
   - Backup validator keys securely
   - Backup chain data periodically
   - Document recovery procedures

---

## Troubleshooting

### Node Not Syncing

```bash
# Check peer connections
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'

# Check logs
journalctl -u axionax-validator -f
```

### Validator Not Producing Blocks

```bash
# Check stake status
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"staking_getValidator","params":["0xYOUR_ADDRESS"],"id":1}'

# Check if validator is in active set
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"staking_getActiveValidators","params":[],"id":1}'
```

### High Memory Usage

```bash
# Check RocksDB cache settings
# Adjust in config.yaml
db:
  cache_size_mb: 4096
```

---

## Upgrading

```bash
# Stop service
sudo systemctl stop axionax-validator

# Backup data
sudo cp -r /var/lib/axionax /var/lib/axionax.backup

# Download new binary
wget https://github.com/axionaxprotocol/axionax-core/releases/download/vX.Y.Z/axionax-node-linux-amd64
chmod +x axionax-node-linux-amd64
sudo mv axionax-node-linux-amd64 /usr/local/bin/axionax-node

# Start service
sudo systemctl start axionax-validator
```

---

## See Also

**Primary Protocol Reference:**
- [AXIONAX_PROTOCOL.md](../architecture/AXIONAX_PROTOCOL.md) — Complete protocol architecture, PoPC, VRF, DA, security

**Additional Resources:**
- [Node Hardware Specs](../../services/core/core/docs/NODE_SPECS.md)
- [Network Nodes](../../services/core/core/docs/NETWORK_NODES.md)
- [JSON-RPC API](../api/JSON_RPC.md)
- [Glossary](../glossary.md)

---

_Last updated: May 3, 2026_
