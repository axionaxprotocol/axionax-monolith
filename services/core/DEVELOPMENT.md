# Axionax Core Universe - Development Guide

## 🚀 Quick Start

### Prerequisites
- **Rust** 1.75+ (for blockchain core)
- **Docker** & Docker Compose
- **Node.js** 18+ & pnpm (for web development)
- **Python** 3.10+ (for DeAI modules)

### 1. First Time Setup

```bash
# Clone with submodules
git clone --recursive https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe

# Or if already cloned, init submodules
git submodule update --init --recursive

# Install Rust dependencies
cd core
cargo build --release
```

### 2. Development Modes

#### 🦀 Core Only (Rust Development)
```bash
cd core

# Build
cargo build --release

# Run tests
cargo test --workspace

# Run local dev node
cargo run --release -- --dev --rpc-port 8545

# Benchmark
cargo bench
```

#### 🐳 Full Stack (Docker)
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f axionax-node

# Stop all
docker-compose -f docker-compose.dev.yml down
```

**Services Available:**

| Service | URL | Description |
|---------|-----|-------------|
| 🦀 Node | http://localhost:8545 | Primary blockchain RPC |
| 🦀 Validator | http://localhost:8555 | Second validator |
| 🌐 Web | http://localhost:3000 | Next.js website |
| 🛒 Marketplace | http://localhost:5173 | React marketplace |
| 💧 Faucet | http://localhost:3002 | Token faucet |
| 📊 Prometheus | http://localhost:9090 | Metrics |
| 📈 Grafana | http://localhost:3030 | Dashboards (admin/axionax) |
| 🗄️ PostgreSQL | localhost:5432 | Database |

#### 🌐 Web Development (from submodule)
```bash
cd web-universe

# Install dependencies
pnpm install

# Run dev server (connects to local node)
pnpm dev
```

### 3. Project Structure

```
axionax-core-universe/
├── core/                    # 🦀 Rust Blockchain Core
│   ├── src/
│   │   ├── blockchain/      # Block & chain management
│   │   ├── consensus/       # PoPC consensus
│   │   ├── crypto/          # Ed25519, Blake3
│   │   ├── network/         # P2P networking
│   │   ├── rpc/             # JSON-RPC API
│   │   ├── state/           # RocksDB state
│   │   ├── staking/         # Native staking
│   │   ├── governance/      # On-chain governance
│   │   ├── asr/             # Auto-Selection Router
│   │   └── deai/            # Python DeAI integration
│   ├── Cargo.toml
│   └── tests/
├── ops/
│   └── deploy/              # 🌍 Deployment & Operations
│       ├── environments/    # Testnet/Mainnet configs
│       ├── scripts/         # Setup automation
│       ├── monitoring/      # Prometheus & Grafana
│       └── nginx/           # Reverse proxy
├── tools/
│   ├── faucet/              # 💧 Testnet faucet
│   └── devtools/            # 🛠️ Testing utilities
├── web-universe/            # 👈 Git Submodule
│   ├── apps/web/            # Next.js website
│   ├── apps/marketplace/    # React marketplace
│   └── packages/sdk/        # TypeScript SDK
└── docker-compose.dev.yml   # Development services
```

### 4. Core Development Commands

```bash
cd core

# Build release
cargo build --release

# Build with all features
cargo build --release --all-features

# Run specific test
cargo test test_block_creation

# Run with logging
RUST_LOG=debug cargo run --release -- --dev

# Check code
cargo clippy --workspace

# Format code
cargo fmt --all

# Generate docs
cargo doc --open
```

### 5. Connecting to Live Testnet

Instead of running a local node, connect to live validators:

```bash
# In web-universe
cd web-universe
echo "NEXT_PUBLIC_RPC_URL=https://axionax.org/rpc/" > apps/web/.env.local
pnpm dev
```

**RPC Endpoints:**
- **HTTPS**: https://axionax.org/rpc/
- **EU Validator**: http://217.216.109.5:8545
- **AU Validator**: http://46.250.244.4:8545

**Chain ID:** 86137 (0x15079)

### 6. Testing

```bash
# Core tests (Rust)
cd core
cargo test --workspace

# Integration tests
cd tools/devtools
python -m pytest tests/ -v

# Load testing
python tests/load_test.py

# E2E tests (from web-universe)
cd web-universe/apps/web
npm run test:e2e
```

### 7. Deployment

```bash
# Deploy to VPS
cd ops/deploy
./scripts/setup_validator.sh

# Deploy with Docker
docker-compose -f docker-compose.vps.yml up -d

# Setup monitoring
docker-compose -f monitoring/docker-compose.yaml up -d
```

---

## 📚 Documentation

- [Core README](core/README.md)
- [Deployment Guide](ops/deploy/DEPLOYMENT_GUIDE.md)
- [Quick Start](core/QUICK_START.md)
- [Security Audit](core/SECURITY_AUDIT.md)
- [Web Universe](web-universe/README.md)

## 🔗 Links

- **Website**: https://axionax.org
- **Explorer**: https://axionax.org/explorer
- **GitHub**: https://github.com/axionaxprotocol

---

**Built with ❤️ by the Axionax Team**
