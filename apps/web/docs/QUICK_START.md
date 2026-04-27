# Quick Start Guide 🚀

Get up and running with Axionax Web Universe in 5 minutes!

---

## 📋 Prerequisites

Make sure you have these installed:

- **Node.js**: v18.x or v20.x ([Download](https://nodejs.org/))
- **pnpm**: v8.x or later
  ```bash
  npm install -g pnpm
  ```
- **Git**: v2.x or later ([Download](https://git-scm.com/))

Optional:

- **Docker**: v24.x+ (for running full stack locally)
- **VS Code**: Recommended IDE

---

## ⚡ Quick Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/axionaxprotocol/axionax-web-universe.git
cd axionax-web-universe
```

### 2️⃣ Install Dependencies

```bash
pnpm install
```

This will install all dependencies for all packages in the monorepo.

### 3️⃣ Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

**Minimum required variables:**

```bash
CHAIN_ID=86137
NETWORK_NAME=axionax-testnet-1
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.axionax.org
```

### 4️⃣ Start Development Servers

```bash
# Start all apps in development mode
pnpm dev
```

This will start:

- 🌐 Web: http://localhost:3000
- 🛒 Marketplace: http://localhost:3001
- 📚 Docs: http://localhost:3002

---

## 🎯 What to Run

### Option A: Run Specific App

```bash
# Web application only
pnpm --filter @axionax/web dev

# Marketplace only
pnpm --filter @axionax/marketplace dev

# SDK development
pnpm --filter @axionax/sdk dev
```

### Option B: Run All Apps (Recommended)

```bash
pnpm dev
```

### Option C: Use Docker (Full Stack)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This includes:

- Web Frontend
- Marketplace
- Explorer API
- Faucet API
- RPC Server
- PostgreSQL
- Redis
- Nginx
- Monitoring (Prometheus + Grafana)

---

## 🔧 Available Commands

### Development

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm start            # Start all apps in production mode
pnpm test             # Run all tests
pnpm lint             # Lint all code
pnpm format           # Format all code with Prettier
```

### Workspace Management

```bash
pnpm clean            # Clean build artifacts
pnpm deps:check       # Check for outdated dependencies
pnpm deps:update      # Update all dependencies
pnpm security:audit   # Run security audit
```

### Docker Commands

```bash
pnpm docker:build     # Build Docker images
pnpm docker:up        # Start Docker services
pnpm docker:down      # Stop Docker services
pnpm docker:logs      # View Docker logs
```

---

## 📁 Project Structure

```
axionax-web-universe/
├── 📱 apps/
│   ├── web/              # Next.js website
│   ├── marketplace/      # React marketplace
│   ├── docs/             # Documentation site
│   ├── api/              # Backend API (Hono + PostgreSQL)
│   ├── faucet-api/       # Faucet backend
│   └── genesis-generator/# Genesis block generator CLI
│
├── 📦 packages/
│   ├── sdk/              # TypeScript SDK
│   ├── blockchain-utils/ # Chain utilities
│   └── ui/               # Shared UI components
│
├── scripts/              # Ops & deployment scripts
│
└── 📄 Configuration Files
    ├── package.json      # Root package config
    ├── pnpm-workspace.yaml
    ├── tsconfig.base.json
    └── docker-compose.yml
```

---

## 🌐 Access Points

After starting the development servers:

| Service         | URL                   | Description         |
| --------------- | --------------------- | ------------------- |
| 🌐 Website      | http://localhost:3000 | Main website        |
| 🛒 Marketplace  | http://localhost:3001 | Compute marketplace |
| 📚 Docs         | http://localhost:3002 | Documentation       |
| 🔌 RPC          | http://localhost:8545 | JSON-RPC endpoint   |
| 🔍 Explorer API | http://localhost:3001 | Block explorer API  |
| 💧 Faucet API   | http://localhost:3002 | Testnet faucet      |

---

## 🧪 Test Your Setup

### 1. Check Web App

Open http://localhost:3000 in your browser. You should see the Axionax homepage.

### 2. Test RPC Connection

```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Expected response:

```json
{ "jsonrpc": "2.0", "id": 1, "result": "0x..." }
```

### 3. Run Tests

```bash
pnpm test
```

All tests should pass ✅

---

## 🔌 Connect to Testnet

### Add Network to MetaMask

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Enter details:

```
Network Name: Axionax Testnet
RPC URL: https://testnet-rpc.axionax.org
Chain ID: 86137
Currency Symbol: AXX
Block Explorer: https://explorer.axionax.org
```

### Get Test Tokens

Visit the faucet: https://faucet.axionax.org

Enter your wallet address and claim 10 AXX (once per 24 hours).

---

## 🐛 Troubleshooting

### Issue: `pnpm: command not found`

**Solution**: Install pnpm globally

```bash
npm install -g pnpm
```

### Issue: Port already in use

**Solution**: Kill process or change port

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or change port in package.json
```

### Issue: Out of memory during build

**Solution**: Increase Node.js memory

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

### Issue: Docker containers won't start

**Solution**: Check Docker daemon

```bash
# Check Docker status
docker info

# Restart Docker
sudo systemctl restart docker

# Clean up old containers
docker system prune -a
```

### Issue: Dependencies installation fails

**Solution**: Clear cache and reinstall

```bash
pnpm clean:all
pnpm install --frozen-lockfile
```

---

## 📚 Next Steps

Now that you're set up:

1. **Read the Docs**: [Documentation](./apps/docs/README.md)
2. **Join Testnet**: [Testnet Guide](./apps/docs/JOIN_TESTNET.md)
3. **Deploy Contracts**: [Smart Contract Examples](./apps/docs/SMART_CONTRACT_EXAMPLES.md)
4. **Run Validator**: [Validator Setup](./apps/docs/VALIDATOR_SETUP_GUIDE.md)
5. **Contribute**: [Contributing Guide](./CONTRIBUTING.md)

---

## 💬 Get Help

Need help? We're here:

- **Discord**: https://discord.gg/axionax (#dev-help)
- **GitHub Discussions**: Ask questions
- **GitHub Issues**: Report bugs
- **Documentation**: https://docs.axionax.org

---

## 🎓 Learning Resources

### For Developers

- [API Reference](./apps/docs/API_REFERENCE.md)
- [Architecture](./apps/docs/ARCHITECTURE.md)
- [Smart Contract Examples](./apps/docs/SMART_CONTRACT_EXAMPLES.md)

### For Operators

- [Deployment Checklist](./apps/docs/DEPLOYMENT_CHECKLIST.md)
- [Operations Runbook](./apps/docs/RUNBOOK.md)
- [Validator Setup](./apps/docs/VALIDATOR_SETUP_GUIDE.md)

### For Contributors

- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)

---

**Happy Building! 🚀**

Questions? Open an issue or ask in Discord!

---

**Last Updated**: December 5, 2025 | v1.8.0-testnet
