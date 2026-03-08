<div align="center">

# 🌐 axionax Web Universe

### Frontend Applications, SDK, Documentation & Marketplace Monorepo

[![Protocol](https://img.shields.io/badge/Protocol-v2.1--Seed-purple?style=flat-square)](https://axionax.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.0-orange?style=flat-square&logo=pnpm)](https://pnpm.io/)
[![Status](https://img.shields.io/badge/Status-100%25%20Operational-green?style=flat-square)](https://axionax.org)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=flat-square&logo=github-actions)](https://github.com/axionaxprotocol/axionax-web-universe/actions)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/axionax)
[![Code of Conduct](https://img.shields.io/badge/Code%20of%20Conduct-Contributor%20Covenant-purple?style=flat-square)](CODE_OF_CONDUCT.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

**Modern Web Stack** • **Monorepo Architecture** • **Type-Safe** • **Series Seed Preparation**

[Website](https://axionax.org) • [Documentation](https://axionaxprotocol.github.io/axionax-docs/) • [Core Universe](https://github.com/axionaxprotocol/axionax-core-universe)

</div>

---

## 📖 Overview

**axionax Web Universe** เป็น monorepo ที่รวมทุกอย่างที่เกี่ยวข้องกับ frontend, documentation, SDK และ marketplace ของ **Axionax Protocol** ไว้ในที่เดียว ใช้ pnpm workspaces สำหรับการจัดการ dependencies ที่มีประสิทธิภาพ

📄 **เอกสารสรุปโครงการ:** [MASTER_SUMMARY.md](MASTER_SUMMARY.md) · **White Paper:** [WHITEPAPER.md](WHITEPAPER.md) · **เตรียมโฮสต์เว็บ:** [docs/HOSTING.md](docs/HOSTING.md)

### 🎯 What's Inside?

```
axionax-web-universe/
├── 📱 apps/
│   ├── web/              # Official Website (Next.js 14)
│   ├── marketplace/      # Compute Marketplace dApp (Vite + React)
│   ├── api/              # Backend API (Hono + PostgreSQL)
│   ├── genesis-generator/# Genesis Block Generator CLI
│   ├── faucet-api/       # Faucet API
│   ├── mobile/           # Mobile app
│   └── docs/             # Static docs (Jekyll, not pnpm package)
│
├── 📦 packages/
│   ├── sdk/              # TypeScript SDK
│   ├── blockchain-utils/ # Shared blockchain helpers
│   └── ui/               # Shared UI components
│
├── 📄 docs/              # Project docs (deploy, dev, architecture, audits)
│   ├── DEPLOY.md
│   ├── DEVELOPMENT.md
│   ├── QUICK_START.md
│   ├── SYSTEM_ARCHITECTURE.md
│   └── audits/           # Audit reports
│
├── 🔧 scripts/           # Build, deploy, VPS, DB scripts
│   ├── deploy.sh
│   ├── vps-setup-from-git.sh
│   └── ...
│
├── deploy-vps.ps1        # VPS deploy (Windows, run from root)
├── MASTER_SUMMARY.md     # เอกสารสรุปโครงการฉบับสมบูรณ์
├── pnpm-workspace.yaml
├── package.json
└── pnpm-lock.yaml
```

---

## ✨ Key Features

### 📱 Official Website (`apps/web`)

- **Next.js 14**: Latest App Router with Server Components
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: Full type safety
- **Responsive**: Mobile-first design
- **Optimized**: Fast page loads, SEO friendly
- **Analytics**: Built-in performance monitoring

### �� Marketplace (`apps/marketplace`)

- **Vite + React**: Lightning-fast development
- **Web3 Integration**: Connect with MetaMask/WalletConnect
- **Real-time Updates**: Live compute resource listings
- **Type-safe**: Full TypeScript support
- **Modern UI**: Beautiful, intuitive interface

### 📚 Documentation (`apps/docs`)

- **50+ Pages**: Comprehensive guides
- **Developer-friendly**: Clear examples & tutorials
- **Searchable**: Fast full-text search
- **Up-to-date**: Always in sync with code

### 📦 TypeScript SDK (`packages/sdk`)

- **Type-safe API**: Full IntelliSense support
- **Promise-based**: Modern async/await syntax
- **Tree-shakeable**: Import only what you need
- **Well-documented**: JSDoc comments throughout
- **Tested**: Comprehensive test coverage

---

## 💰 Token Information

### ⚠️ Testnet Configuration (Current)

The testnet uses simplified tokenomics for testing:

- **Token Symbol**: **AXXt** (Axionax Testnet Token)
- **Total Supply**: 1 Billion AXXt (testnet only)
- **Network**: Axionax Testnet (Chain ID: 86137)
- **Faucet**: https://faucet.axionax.org
- **Purpose**: Testing only - no real value

### 🎯 Mainnet Tokenomics (Planned)

Full specification for production launch:

- **Token Symbol**: **AXX** (Axionax Token)
- **Total Supply**: 1 Trillion AXX (fixed cap)
- **Emission**: ~2.25% APY staking rewards
- **Utilities**: Gas fees, Staking, Governance, Payments
- **Vesting**: Full schedules for team, investors, foundation

📖 **Learn More:**
- [Testnet Configuration](apps/docs/TOKENOMICS_TESTNET.md) - Current setup
- [Mainnet Tokenomics](apps/docs/TOKENOMICS.md) - Full specification
- [Add Token to MetaMask](apps/docs/ADD_TOKEN_TO_METAMASK.md) - Setup guide

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Node.js 18+
- pnpm 8+

# Optional
- Git
```

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/axionaxprotocol/axionax-web-universe.git
cd axionax-web-universe

# Install dependencies (uses pnpm workspaces)
pnpm install
```

### 2. Development Mode

```bash
# Run all apps in parallel
pnpm dev

# Run specific app
pnpm --filter @axionax/web dev
pnpm --filter @axionax/marketplace dev

# Build all
pnpm build

# Build specific app
pnpm --filter @axionax/web build
```

### 3. Using the SDK

```typescript
import { AxionaxClient } from '@axionax/sdk';

// Initialize client
const client = new AxionaxClient({
  rpcUrl: 'http://localhost:8545',
  chainId: 86137
});

// Get account balance
const balance = await client.getBalance('0x...');

// Send transaction
const tx = await client.sendTransaction({
  to: '0x...',
  value: '1000000000000000000', // 1 AXX
  gas: 21000
});

// Wait for confirmation
const receipt = await tx.wait();
console.log('Transaction confirmed:', receipt.hash);
```

---

## 📦 Packages & Apps

### 📱 Website (`apps/web`)

**Official axionax Protocol Website**

- **Package**: `@axionax/web`
- **Version**: 1.9.0
- **Framework**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS
- **Port**: 3000

**Commands:**

```bash
cd apps/web

# Development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint

# Type check (from repo root)
pnpm --filter @axionax/web exec tsc --noEmit
```

**Features:**
- ✅ Server-side rendering (SSR)
- ✅ Static site generation (SSG)
- ✅ Image optimization
- ✅ Font optimization
- ✅ SEO optimized
- ✅ Performance monitoring

---

### 🛒 Marketplace (`apps/marketplace`)

**Decentralized Compute Marketplace**

- **Package**: `@axionax/marketplace`
- **Version**: 0.1.0
- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Port**: 3001

**Commands:**

```bash
cd apps/marketplace

# Development
pnpm dev

# Build
pnpm build

# Preview build
pnpm preview

# Lint
pnpm lint
```

**Features:**
- ✅ Buy/sell compute resources
- ✅ Real-time price updates
- ✅ Wallet integration
- ✅ Transaction history
- ✅ Resource monitoring
- 🟡 Escrow system (Beta)

---

### 📚 Documentation (`apps/docs`)

**Developer Documentation & Guides**

- **Location**: `apps/docs/`
- **Format**: Markdown + HTML
- **Pages**: 50+

**Structure:**

```
apps/docs/
├── guides/
│   ├── getting-started.md
│   ├── quickstart.md
│   └── tutorials/
├── api/
│   ├── rpc-api.md
│   ├── sdk-api.md
│   └── rest-api.md
└── reference/
    ├── cli.md
    └── config.md
```

**Topics Covered:**
- Getting Started Guide
- Quick Start Tutorial
- SDK Documentation
- API Reference
- Smart Contract Development
- Validator Setup
- RPC API Guide

---

### 📦 SDK (`packages/sdk`)

**TypeScript SDK for axionax Protocol**

- **Package**: `@axionax/sdk`
- **Version**: 1.0.0
- **Language**: TypeScript 5.0
- **Size**: ~50KB (minified)

**Installation:**

```bash
# Using pnpm
pnpm add @axionax/sdk

# Using npm
npm install @axionax/sdk

# Using yarn
yarn add @axionax/sdk
```

**API Overview:**

```typescript
// Client
class AxionaxClient {
  constructor(config: ClientConfig);
  
  // Accounts
  getBalance(address: string): Promise<BigNumber>;
  getAccount(address: string): Promise<Account>;
  
  // Transactions
  sendTransaction(tx: Transaction): Promise<TransactionResponse>;
  estimateGas(tx: Transaction): Promise<BigNumber>;
  
  // Blocks
  getBlock(blockNumber: number): Promise<Block>;
  getBlockNumber(): Promise<number>;
  
  // Smart Contracts
  deployContract(bytecode: string, abi: ABI): Promise<Contract>;
  getContract(address: string, abi: ABI): Contract;
}

// Wallet
class Wallet {
  constructor(privateKey: string);
  
  sign(message: string): Promise<Signature>;
  signTransaction(tx: Transaction): Promise<SignedTransaction>;
}

// Utilities
namespace Utils {
  function formatUnits(value: BigNumber, decimals: number): string;
  function parseUnits(value: string, decimals: number): BigNumber;
  function isAddress(address: string): boolean;
  function toChecksumAddress(address: string): string;
}
```

**Full Documentation**: See `packages/sdk/README.md`

---

## 🛠️ Development

### Workspace Commands

```bash
# Install all dependencies
pnpm install

# Run all apps in dev mode (parallel)
pnpm dev

# Build all packages and apps
pnpm build

# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check

# Run tests
pnpm test

# Clean all build artifacts
pnpm clean
```

### Working with Specific Packages

```bash
# Run command in specific package
pnpm --filter @axionax/web dev
pnpm --filter @axionax/sdk build
pnpm --filter @axionax/marketplace test

# Add dependency to specific package
pnpm --filter @axionax/web add lodash
pnpm --filter @axionax/sdk add -D vitest
```

### Adding New Package

```bash
# Create new package
mkdir -p packages/new-package
cd packages/new-package

# Initialize package.json
pnpm init

# Add to workspace
# Edit pnpm-workspace.yaml to include new package
```

---

## 📊 Build & Deploy

### Production Build

```bash
# Build all
pnpm build

# Build outputs:
# - apps/web/.next/          (Next.js build)
# - apps/marketplace/dist/   (Vite build)
# - packages/sdk/dist/       (TypeScript build)
```

### Environment Variables

**Website (`apps/web/.env`):**

```bash
NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org
NEXT_PUBLIC_CHAIN_ID=86137
NEXT_PUBLIC_API_URL=https://api.axionax.org
NEXT_PUBLIC_EXPLORER_URL=https://explorer.axionax.org
```

**Marketplace (`apps/marketplace/.env`):**

```bash
VITE_RPC_URL=https://rpc.axionax.org
VITE_CHAIN_ID=86137
VITE_CONTRACT_ADDRESS=0x...
VITE_WALLET_CONNECT_PROJECT_ID=...
```

### Docker Deployment

```bash
# Build Docker image for website
cd apps/web
docker build -t axionax-website .

# Run container
docker run -p 3000:3000 axionax-website

# Or use docker-compose
docker-compose up -d
```

### ✅ Ready for production deploy

**CI (GitHub Actions):**

- Push/PR ไป `main` หรือ `develop` รัน: lint, type-check, build (web + marketplace), tests, security audit.
- **Deploy จริง:** push ไป `develop` → deploy staging (rsync ขึ้น VPS); push ไป `main` → deploy production (rsync ขึ้น VPS).
- Build ของ `apps/web` ใช้ **standalone output** (โฟลเดอร์เดียวมี `server.js`) แล้ว rsync ผ่าน SSH. ต้องตั้ง **secrets** ต่อ environment (staging/production): `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `REMOTE_PATH`, และถ้าต้องการ restart หลัง sync: `DEPLOY_RESTART_CMD` (เช่น `pm2 restart axionax-web`). รายละเอียดและวิธีตั้ง server ดูที่ [apps/web/docs/DEPLOYMENT.md#cicd-deploy-github-actions](apps/web/docs/DEPLOYMENT.md#-cicd-deploy-github-actions).

**Environment (production):**

- คัดลอก `apps/web/.env.example` เป็น `.env.local` หรือ set บน server (หรือใน host เช่น Vercel).
- ตัวแปรที่ต้องตั้งอย่างน้อย: `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL` (หรือใช้ค่าใน .env.example), `NEXT_PUBLIC_API_URL` ถ้าใช้ API แยก.
- RPC proxy (`/api/rpc/eu`, `/api/rpc/au`) ใช้ `RPC_EU_URL` / `RPC_AU_URL` (ไม่บังคับ มี default).

**Deploy targets:**

| Target        | วิธี | หมายเหตุ |
|---------------|------|----------|
| **CI → VPS**  | ตั้ง secrets แล้ว push `main`/`develop` | ใช้ standalone + rsync ตาม [DEPLOYMENT.md](apps/web/docs/DEPLOYMENT.md) |
| **Vercel**    | เชื่อม repo → build `pnpm --filter @axionax/web build`, root = repo root | รองรับ API routes |
| **Node (VPS)**| Build แล้ว `pnpm --filter @axionax/web start` หรือ Docker ตาม [DEPLOYMENT.md](apps/web/docs/DEPLOYMENT.md) | ใช้ได้กับ full stack |
| **GitHub Pages** | Workflow deploy-pages — ต้องใช้ static export และแอปมี `/api/*` จึงต้องแยก API หรือทำ static-only | ดู [docs/DEPLOY.md](docs/DEPLOY.md) |

**ก่อน deploy ครั้งแรก:**

1. ตั้ง env ตาม `.env.example` (อย่างน้อย `NEXT_PUBLIC_*`).
2. รัน `pnpm build` ที่ root ให้ผ่าน.
3. ถ้าใช้ CI deploy ขึ้น VPS: ตั้ง environment secrets ตามตารางด้านบน และเตรียม server ตาม [DEPLOYMENT.md § CI/CD Deploy](apps/web/docs/DEPLOYMENT.md#-cicd-deploy-github-actions).

---

## 🧪 Testing

### Run Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @axionax/sdk test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

### Test Structure

```
packages/sdk/
├── src/
│   ├── client.ts
│   ├── wallet.ts
│   └── utils.ts
└── tests/
    ├── client.test.ts
    ├── wallet.test.ts
    └── utils.test.ts
```

---

## 📚 Documentation

### Internal Documentation

- [Website README](apps/web/README.md)
- [Marketplace README](apps/marketplace/README.md)
- [SDK README](packages/sdk/README.md)
- [SDK API Docs](packages/sdk/docs/API.md)

### External Documentation

- [Developer Docs](https://axionaxprotocol.github.io/axionax-docs/)
- [API Reference](https://axionaxprotocol.github.io/axionax-docs/API_REFERENCE.html)
- [Tutorials](https://axionaxprotocol.github.io/axionax-docs/TUTORIALS.html)

---

## 🤝 Contributing

We welcome contributions! Here's how:

### Contribution Workflow

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/axionax-web-universe.git
cd axionax-web-universe

# 2. Install dependencies
pnpm install

# 3. Create feature branch
git checkout -b feature/amazing-feature

# 4. Make changes and test
pnpm dev
pnpm build
pnpm lint
pnpm test

# 5. Commit with conventional commits
git commit -m "feat(sdk): add new method for..."

# 6. Push and create PR
git push origin feature/amazing-feature
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
style(scope): formatting changes
refactor(scope): code refactoring
test(scope): add tests
chore(scope): maintenance tasks
```

Examples:
- `feat(sdk): add getTransactionReceipt method`
- `fix(website): resolve mobile navigation issue`
- `docs(marketplace): add usage examples`

---

## �� License

**MIT License** - See [LICENSE](LICENSE) file for details.

All packages and apps in this monorepo are licensed under MIT, allowing free use, modification, and distribution.

---

## 🔗 Related Projects

- **[axionax Core Universe](https://github.com/axionaxprotocol/axionax-core-universe)** - Blockchain Core, Ops & DevTools
- **[axionax Protocol Profile](https://github.com/axionaxprotocol)** - Organization overview

---

## 📞 Support & Community

- 🌐 **Website**: [axionax.org](https://axionax.org)
- 📖 **Documentation**: [docs.axionax.org](https://axionaxprotocol.github.io/axionax-docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/axionaxprotocol/axionax-web-universe/issues)
- 💬 **Discord**: Coming Q1 2026
- 🐦 **Twitter**: Coming Q1 2026

---

## 🎯 Roadmap

### ✅ Completed
- [x] Website v2.0 with Next.js 14
- [x] TypeScript SDK v1.0
- [x] Documentation site (50+ pages)
- [x] Marketplace beta
- [x] Monorepo architecture
- [x] Production deployment

### 🔄 In Progress
- [ ] Marketplace v1.0 (escrow system)
- [ ] Mobile app development
- [ ] Advanced SDK features
- [ ] Interactive tutorials

### 🚀 Upcoming (Q1 2026)
- [ ] SDK v2.0 (enhanced features)
- [ ] Mobile wallet integration
- [ ] GraphQL API
- [ ] Community dashboard

---

## 📈 Statistics

<div align="center">

| Metric | Value | Status |
|--------|-------|--------|
| **Total Packages** | 4 | ✅ Active |
| **TypeScript Coverage** | 100% | ✅ Full |
| **Build Time** | 44.4s | ⚡ Fast |
| **Bundle Size** | 98.5 KB | 📦 Optimized |
| **Lines of Code** | 15,000+ | 📊 Growing |
| **Dependencies** | Shared | 🎯 Efficient |

</div>

---

<div align="center">

**Built with ❤️ by the axionax Protocol Team**

*Part of the [axionax Universe](https://github.com/axionaxprotocol) • Last Updated: November 22, 2025*

[![GitHub Stars](https://img.shields.io/github/stars/axionaxprotocol/axionax-web-universe?style=social)](https://github.com/axionaxprotocol/axionax-web-universe)
[![GitHub Forks](https://img.shields.io/github/forks/axionaxprotocol/axionax-web-universe?style=social)](https://github.com/axionaxprotocol/axionax-web-universe/fork)

**🌐 Welcome to the Web Universe! 🚀**

</div>
