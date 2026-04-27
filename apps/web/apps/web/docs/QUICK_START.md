# axionax-web Quick Start Guide 🚀

Get the axionax Protocol web interface running in under 5 minutes.

**Last Updated**: December 5, 2025  
**Protocol Version**: v1.9.0-testnet

---

## 🎯 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

---

## ⚡ Quick Start (Development)

### 1. Clone Repository

```bash
git clone https://github.com/axionaxprotocol/axionax-web.git
cd axionax-web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your RPC endpoint
# Default uses testnet RPC at rpc.axionax.org
```

Example `.env`:

```env
NEXT_PUBLIC_RPC_URL=https://axionax.org/rpc/
NEXT_PUBLIC_CHAIN_ID=86137
NEXT_PUBLIC_NETWORK_NAME=axionax-testnet-1
```

### 4. Start Development Server

```bash
npm run dev
```

Open browser: [http://localhost:3000](http://localhost:3000)

**Done!** 🎉 You should see the axionax web interface.

---

## 🏗️ Production Build

### Build Static Site

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

Production server runs on [http://localhost:3000](http://localhost:3000)

### Export Static Files

```bash
npm run build
# Static files in ./out directory
```

Deploy to Vercel, Netlify, GitHub Pages, or any static host.

---

## 🐳 Docker Deployment

### Quick Docker Run

```bash
# Build image
docker build -t axionax-web .

# Run container
docker run -d \
  --name axionax-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_RPC_URL=http://rpc.axionax.org \
  axionax-web
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop services
docker-compose down
```

Access at [http://localhost:3000](http://localhost:3000)

---

## 🔗 Connecting to Testnet

### Current Testnet Infrastructure

The axionax testnet is currently live:

- **RPC HTTP**: https://axionax.org/rpc/
- **RPC WebSocket**: wss://axionax.org/rpc/
- **Chain ID**: 86137
- **Network Name**: axionax-testnet-1

### MetaMask Configuration

Add axionax testnet to MetaMask:

1. Open MetaMask
2. Networks → Add Network → Add Manually
3. Enter details:
   - **Network Name**: AxionAX Testnet
   - **RPC URL**: https://axionax.org/rpc/
   - **Chain ID**: 86137
   - **Currency Symbol**: AXXt
   - **Block Explorer**: https://axionax.org/explorer

---

## 📚 Available Scripts

```bash
# Development
npm run dev              # Start dev server (hot reload)
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

---

## 🎨 Project Structure

```
axionax-web/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── page.tsx           # Home page
│   │   ├── explorer/          # Block explorer
│   │   ├── faucet/            # Testnet faucet
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # UI primitives
│   │   ├── layout/           # Layout components
│   │   └── home/             # Home page sections
│   ├── lib/                  # Utilities
│   │   ├── rpc/             # RPC client
│   │   └── utils.ts         # Helper functions
│   └── styles/              # Global styles
├── public/                   # Static assets
├── docker-compose.yml        # Docker services
├── Dockerfile               # Container build
└── package.json             # Dependencies
```

---

## 🔧 Configuration

### Environment Variables

| Variable                   | Description        | Default                 |
| -------------------------- | ------------------ | ----------------------- |
| `NEXT_PUBLIC_RPC_URL`      | RPC endpoint URL   | `http://localhost:8545` |
| `NEXT_PUBLIC_CHAIN_ID`     | Chain ID           | `86137`                 |
| `NEXT_PUBLIC_NETWORK_NAME` | Network name       | `axionax-testnet-1`     |
| `NEXT_PUBLIC_EXPLORER_URL` | Block explorer URL | `http://localhost:3001` |
| `NEXT_PUBLIC_FAUCET_URL`   | Faucet API URL     | `http://localhost:3002` |

### RPC Connection

The web interface uses the axionax SDK to connect to the RPC node:

```typescript
import { AxionAXClient } from '@axionax/sdk';

const client = new AxionAXClient({
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '86137'),
});
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### RPC Connection Failed

1. Check RPC URL in `.env`
2. Verify RPC node is running:
   ```bash
   curl https://axionax.org/rpc/ -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```
3. Check firewall/network settings

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Docker Issues

```bash
# Rebuild without cache
docker-compose build --no-cache

# Check logs
docker-compose logs web
```

---

## 📊 Current Deployment Status

### Live Services (as of Nov 13, 2025)

| Service       | Status       | Endpoint                  |
| ------------- | ------------ | ------------------------- |
| Web Interface | ✅ Running   | https://axionax.org       |
| RPC HTTP      | ✅ Healthy   | https://axionax.org/rpc/  |
| Explorer API  | ✅ Healthy   | https://axionax.org/api   |
| Faucet API    | ✅ Healthy   | https://axionax.org/faucet|

**Overall**: All services operational

---

## 🔗 Related Documentation

- **[README.md](README.md)** - Full documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[DNS_SETUP.md](docs/DNS_SETUP.md)** - Domain configuration
- **[axionax-docs](https://github.com/axionaxprotocol/axionax-docs)** - Protocol documentation
- **[axionax-deploy](https://github.com/axionaxprotocol/axionax-deploy)** - Backend infrastructure

---

## 🤝 Need Help?

- **Documentation**: [docs.axionax.org](https://docs.axionax.org)
- **GitHub Issues**: [axionax-web/issues](https://github.com/axionaxprotocol/axionax-web/issues)
- **Email**: support@axionax.org

---

## ⚡ Next Steps

After getting the web interface running:

1. **Connect Wallet**: Add axionax testnet to MetaMask
2. **Explore Blockchain**: Try the block explorer
3. **Get Testnet Tokens**: Use faucet (when API is ready)
4. **Read Docs**: Check out [docs.axionax.org](https://docs.axionax.org)
5. **Join Community**: Discord/Telegram (coming Q1 2026)

---

<div align="center">

**Built with Next.js 15 + TypeScript + Tailwind CSS**

[GitHub](https://github.com/axionaxprotocol/axionax-web) • [Docs](https://docs.axionax.org) • [Protocol](https://axionax.org)

</div>
