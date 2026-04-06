# Axionax Development Environment

# Quick start scripts for full-stack development

## Repos

| Repo                                                                                  | Role                                                             |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **axionax-web-universe** (this repo)                                                  | Frontend (Next.js, Marketplace), SDK, Faucet API, docs           |
| **[axionax-core-universe](https://github.com/axionaxprotocol/axionax-core-universe)** | **Backend**: blockchain node, validators (EU/AU), consensus, ops |

Validator node setup, persistence, Docker/volume config, and chain data live in **axionax-core-universe**. This repo only connects to validators via RPC (e.g. 217.76.61.116, 46.250.244.4).

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ & pnpm
- Rust (for core development)

### 1. First Time Setup

```bash
# Clone repository
git clone https://github.com/axionaxprotocol/axionax-web-universe.git
cd axionax-web-universe

# Install dependencies
pnpm install
```

### 2. Development Modes

#### 🌐 Web Only (Connect to Live Testnet)

```bash
# Uses live validators (217.76.61.116, 46.250.244.4)
pnpm dev
```

- Web: http://localhost:3000
- Marketplace: http://localhost:5173

#### 🐳 Full Stack (Local Blockchain)

Requires Node + DB + Redis + Web/Marketplace. For a local blockchain node, clone [axionax-core-universe](https://github.com/axionaxprotocol/axionax-core-universe) to `./core-universe` and uncomment the `axionax-node` service in `docker-compose.dev.yml`.

```bash
# Start services (web, DB, Redis, Prometheus, Grafana, Adminer)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

Services:
| Service | URL | Description |
|---------|-----|-------------|
| 🦀 Node | http://localhost:8545 | Local blockchain RPC |
| 🌐 Web | http://localhost:3000 | Next.js website |
| 🛒 Marketplace | http://localhost:5173 | React marketplace |
| 💧 Faucet | http://localhost:3002 | Token faucet |
| 📊 Prometheus | http://localhost:9090 | Metrics |
| 📈 Grafana | http://localhost:3030 | Dashboards |
| 🗄️ Adminer | http://localhost:8080 | Database UI |

#### 🦀 Core Development (Rust)

Core (blockchain node) is in a separate repository. For local node development:

```bash
# Clone core repo (optional, for full-stack local dev)
git clone https://github.com/axionaxprotocol/axionax-core-universe.git core-universe
cd core-universe/core

# Build & run
cargo build --release
cargo run --release -- --dev
```

### 3. Common Commands

```bash
# Rebuild specific service
docker-compose -f docker-compose.dev.yml build web

# View specific logs
docker-compose -f docker-compose.dev.yml logs -f axionax-node

# Stop all
docker-compose -f docker-compose.dev.yml down

# Clean volumes (reset data)
docker-compose -f docker-compose.dev.yml down -v
```

### 4. Project Structure (this repo only; backend = axionax-core-universe)

```
axionax-web-universe/
├── apps/
│   ├── web/                 # Next.js 14 website
│   ├── marketplace/         # Vite + React marketplace
│   ├── faucet-api/          # Faucet service
│   └── docs/                # Documentation
├── packages/
│   ├── sdk/                 # TypeScript SDK
│   ├── blockchain-utils/    # Chain utilities
│   └── ui/                  # Shared UI components
├── scripts/                 # Ops & deployment scripts
├── docker-compose.yml       # Production services
└── docker-compose.dev.yml   # Development services
```

### 5. Software versions (latest)

Dependencies are kept at **latest stable** within current major versions. After `pnpm install`, you get:

| Stack              | Version |
| ------------------ | ------- |
| Node               | 18+     |
| pnpm               | 8+      |
| Next.js (web)      | 14.2.x  |
| React              | 18.3.x  |
| Vite (marketplace) | 5.x     |
| TypeScript         | 5.7+    |
| Tailwind CSS       | 3.4.x   |
| ethers             | 6.16+   |
| viem               | 2.39+   |
| Hono (api)         | 4.11+   |
| Drizzle            | 0.38+   |

To refresh to latest within semver: `pnpm update -r`. To check for newer majors: `pnpm outdated -r`.

### 5a. Cloud / automation workspace bootstrap

Cursor and similar automation may run [scripts/cloud-agent-startup.sh](../scripts/cloud-agent-startup.sh) from the repo root before tasks. It performs `pnpm install --frozen-lockfile` and runs the TypeScript checker for `@axionax/blockchain-utils`. If agent or CI steps fail on install or `tsc`, reproduce locally with the same script.

### 6. Environment Variables

Copy example env files:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/marketplace/.env.example apps/marketplace/.env
```

### 7. Connecting to Live Testnet

RPC Endpoints:

- **HTTPS (Recommended)**: https://axionax.org/rpc/
- **EU Validator**: http://217.76.61.116:8545
- **AU Validator**: http://46.250.244.4:8545

Chain ID: `86137` (0x15079)

### 8. Validator node persistence (EU/AU)

Validator nodes (EU/AU) run from the **backend repo [axionax-core-universe](https://github.com/axionaxprotocol/axionax-core-universe)**. All node config, data paths, Docker/volumes, and restart procedures are documented there.

If you restart a validator and its **block height drops to a low number** (e.g. ~29 while the other is at 800k+), the node is starting from a fresh chain because **chain data was not persisted**.

**Cause (summary):** Data directory not on a persistent volume, or wiped, or node started with a dev/fresh flag.

**Fix (see axionax-core-universe for details):** Use a persistent volume for chain data; set the other validator as bootnode/peer so the restarted node can sync; avoid `--dev` in production. The dashboard in this repo will show the restarted node’s height climbing as it syncs.

---

## 📚 Documentation

- [Web README](../apps/web/README.md)
- [Marketplace README](../apps/marketplace/README.md)
- [Core Universe](https://github.com/axionaxprotocol/axionax-core-universe) (separate repo)
- [SDK README](../packages/sdk/README.md)

## 🔗 Links

- **Website**: https://axionax.org
- **Explorer**: https://axionax.org/explorer
- **GitHub**: https://github.com/axionaxprotocol
