# 📢 Axionax Testnet Launch Announcement

---

## 🎉 We're Live! Axionax Testnet is Now Available

**Date**: April 24, 2026  
**Version**: 2.1.0 (Genesis Public Testnet)

We're thrilled to announce the official launch of **Axionax Testnet** - a high-performance Layer-1 blockchain designed for decentralized compute markets!

---

## 🌟 What's Launched

### ✅ Core Infrastructure

- **3-VPS Topology** (EU Validator 🇪🇺 + AU Validator 🇦🇺 + Infra Hub)
- **1 Active Validator** (AU only - EU currently offline)
- **2-Second Block Time** with consistent performance
- **99.9%+ Uptime** since deployment
- **SSL-Secured Website** at https://axionax.org
- **Public RPC** at https://rpc.axionax.org
- **Live Faucet** at https://faucet.axionax.org

### ✅ Web Interface

- **Live Metrics Dashboard** - Real-time block height updates
- **Block Explorer** - Search blocks, transactions, and accounts (https://explorer.axionax.org)
- **Modern Architecture** - React 19 + TanStack Query v5
- **Mobile-First Design** - Fully responsive across devices

### 🔧 Next Milestones

- **Community Channels** - Discord & Twitter (2026 Q2)
- **Additional Validators** - Asia, Americas (2026 Q2-Q3)
- **Explorer API** - Advanced querying (2026 Q2)

---

## 🚀 Quick Start

### 1. Add Network to MetaMask

```
Network Name: Axionax Testnet
RPC URL: https://rpc.axionax.org
Chain ID: 86137
Currency: AXX
Explorer: https://explorer.axionax.org
```

### 2. Explore the Network

Visit **https://axionax.org** to:

- View live block height (updates every 2 seconds)
- Check validator status (1/2 online - AU only)
- Browse recent blocks and transactions
- Monitor network health

### 3. Get Test Tokens

- **Faucet**: Visit https://faucet.axionax.org
- **Amount**: 100 AXX per request
- **Cooldown**: 24 hours per IP

---

## 💻 For Developers

### RPC Endpoints

```bash
# Primary (HTTPS - Recommended)
https://rpc.axionax.org

# Direct Validators
EU: http://217.76.61.116:8545
AU: http://46.250.244.4:8545
```

### Example: Get Latest Block

```bash
curl -X POST https://rpc.axionax.org \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }'
```

### SDK Support

```bash
npm install @axionax/sdk
```

```typescript
import { AxionaxClient } from '@axionax/sdk';

const client = new AxionaxClient({
  rpcUrl: 'https://rpc.axionax.org',
  chainId: 86137,
});

const blockHeight = await client.getBlockNumber();
console.log(`Current block: ${blockHeight}`);
```

---

## 🏗️ Technical Highlights

### Modern Tech Stack

- **Frontend**: Next.js 14 + React 19
- **State Management**: Zustand + TanStack Query v5
- **Styling**: Tailwind CSS (mobile-first)
- **Infrastructure**: Nginx + SSL + Reverse Proxy
- **Monitoring**: Prometheus + Grafana

### Network Specifications

- **Consensus**: PoPC (Proof of Protocol Consensus)
- **Block Time**: 2 seconds
- **TPS**: ~200 transactions per second
- **Gas Model**: EVM-compatible
- **Chain ID**: 86137 (0x15079)
- **Genesis SHA-256**: `0xed1bdac7c278e5b4f58a1eceb7594a4238e39bb63e1018e38ec18a555c762b55`

---

## 🎯 What Makes Axionax Different?

### 🚀 Built for Compute Markets

Unlike general-purpose blockchains, Axionax is specifically designed for:

- **Decentralized compute resource trading**
- **High-throughput task scheduling**
- **Efficient resource allocation**
- **Fair pricing mechanisms**

### ⚡ Performance-First

- **Fast Finality**: 2-second blocks
- **Low Latency**: Multi-region validators
- **High Throughput**: 200+ TPS
- **Cost-Effective**: Minimal gas fees

### 🛠️ Developer-Friendly

- **EVM-Compatible**: Use existing Ethereum tools
- **Modern SDK**: TypeScript-first development
- **Comprehensive Docs**: Clear guides and examples
- **Active Support**: Responsive community

---

## 🗺️ Roadmap

### Completed (April 2026)

- [x] Genesis Public Testnet launch
- [x] Three-VPS topology (EU + AU + Infra hub)
- [x] Website with live metrics
- [x] Block explorer (optional on VPS 3)
- [x] Faucet functionality (https://faucet.axionax.org)
- [x] Public RPC (https://rpc.axionax.org)

### Current Status

- [ ] EU validator offline - single-validator mode active
- [x] AU validator (46.250.244.4) running and producing blocks

### 2026 Q2-Q3

- [ ] Additional validators (Asia, Americas)
- [ ] Enhanced developer tools
- [ ] Community channels (Discord, Twitter)
- [ ] Compute marketplace beta
- [ ] Security audit

### Q2 2026

- [ ] Mainnet launch
- [ ] Token generation event
- [ ] Staking mechanism
- [ ] Governance implementation
- [ ] Full marketplace launch

---

## 🤝 Join the Community

### We Need You!

- **Developers**: Build dApps and tools
- **Testers**: Help us find bugs
- **Validators**: Run nodes (mainnet)
- **Users**: Try the network and provide feedback

### Get Involved

- **GitHub**: [github.com/axionaxprotocol](https://github.com/axionaxprotocol)
- **Issues**: Report bugs or request features
- **PRs**: Contribute to open-source repos
- **Discord**: Coming soon - stay tuned!

---

## 📊 Live Statistics

Current network status (as of April 24, 2026):

```
Block Height:    Growing
Validators:      1/2 online (AU only)
Uptime:          99.9%+
Avg Block Time:  2.0 seconds
Network Hash:    Stable
```

Visit https://axionax.org for real-time metrics!

---

## 🔗 Links

- **Website**: https://axionax.org
- **RPC**: https://rpc.axionax.org
- **Faucet**: https://faucet.axionax.org
- **Explorer**: https://explorer.axionax.org
- **Docs**: https://axionax.org/docs
- **GitHub**: https://github.com/axionaxprotocol
- **Testnet Guide**: [TESTNET_LAUNCH.md](./TESTNET_LAUNCH.md)

---

## 💬 Feedback

We'd love to hear from you! Share your thoughts:

- Open GitHub issues for bugs
- Suggest features via discussions
- Share your experience on social media
- Help improve our documentation

---

## 🙏 Thank You

Special thanks to:

- Our early testers and supporters
- The open-source community
- Everyone who believed in the vision

**Let's build the future of decentralized compute together!** 🚀

---

<div align="center">

**Axionax Protocol**

_Powering the Future of Compute_

[Website](https://axionax.org) • [GitHub](https://github.com/axionaxprotocol) • [Docs](https://axionax.org/docs)

</div>
