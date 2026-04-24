# 🚀 Axionax Testnet Launch Guide

**Launch Date**: April 24, 2026  
**Version**: 2.1.0 (Genesis Public Testnet)  
**Status**: ✅ LIVE

---

## 🌐 Live Services

| Service            | URL                          | Status         |
| ------------------ | ---------------------------- | -------------- |
| **Website**        | https://axionax.org          | ✅ Online      |
| **RPC**            | https://rpc.axionax.org      | ✅ Live        |
| **Faucet**         | https://faucet.axionax.org   | ✅ Live        |
| **Block Explorer** | https://explorer.axionax.org | ✅ Live        |
| **Documentation**  | https://axionax.org/docs     | ✅ Active      |

---

## 🏗️ Network Information

### Testnet Details

- **Network Name**: Axionax Testnet
- **Chain ID**: 86137 (0x15079)
- **Currency**: AXX
- **Block Time**: 2 seconds
- **Consensus**: PoPC (Proof of Protocol Consensus)

### RPC Endpoints

```
Public (HTTPS):    https://rpc.axionax.org
WebSocket:         wss://rpc.axionax.org
EU Validator:      http://217.76.61.116:8545
AU Validator:      http://46.250.244.4:8545
```

### Validators

| Region       | IP Address    | Status    | Uptime |
| ------------ | ------------- | --------- | ------ |
| 🇪🇺 Europe    | 217.76.61.116 | ❌ Offline | -      |
| 🇦🇺 Australia | 46.250.244.4  | ✅ Online | 2d+    |

---

## 🦊 MetaMask Configuration

### Add Network to MetaMask

```javascript
Network Name: Axionax Testnet
RPC URL: https://axionax.org/rpc/
Chain ID: 86137
Currency Symbol: AXX
Block Explorer: https://axionax.org/explorer
```

### Quick Add (Manual)

1. Open MetaMask
2. Click network dropdown
3. Select "Add Network"
4. Enter details above
5. Click "Save"

---

## 💧 Getting Testnet Tokens

### Faucet

Visit: https://faucet.axionax.org

**Requirements**:

- Valid Ethereum address
- One request per 24 hours per IP
- 100 AXX per request

### Alternative Methods

1. **Join Discord**: Request tokens in #faucet channel
2. **Twitter**: Tweet with #AxionaxTestnet and tag @AxionaxProtocol
3. **GitHub**: Open issue in axionax-web repo

---

## 🔍 Exploring the Network

### Block Explorer Features

- **Real-time Block Updates**: New blocks every 2 seconds
- **Transaction Search**: Search by hash, address, block number
- **Account Balances**: View AXX balances and transaction history
- **Network Statistics**: Live validator status and metrics

### Live Metrics Dashboard

Visit homepage to see:

- Current block height (updates every 2s)
- Active validators (1/2 - AU only, EU offline)
- Network uptime
- Infrastructure status

---

## 🧪 Testing Guide

### Basic Testing Workflow

1. **Add Network to MetaMask**
   - Use configuration above
   - Verify connection

2. **Get Test Tokens**
   - Use faucet (when available)
   - Or request via Discord

3. **Make Test Transaction**
   - Send AXX between accounts
   - Verify on explorer

4. **Monitor Block Explorer**
   - Check transaction status
   - View block confirmations

### Developer Testing

```bash
# Connect to RPC
curl -X POST https://rpc.axionax.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get latest block
curl -X POST https://rpc.axionax.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest",true],"id":1}'
```

---

## 📊 Performance Metrics

### Current Network Stats

- **TPS (Transactions Per Second)**: ~200 TPS
- **Block Time**: 2 seconds (consistent)
- **Validator Uptime**: 99.9%+
- **Average Gas Price**: 1 Gwei
- **Genesis SHA-256**: `0xed1bdac7c278e5b4f58a1eceb7594a4238e39bb63e1018e38ec18a555c762b55`

### Infrastructure

- **Web Server**: Nginx with SSL/TLS
- **Load Balancer**: Nginx reverse proxy
- **Monitoring**: Prometheus + Grafana
- **Database**: PostgreSQL (future)

---

## 🐛 Known Issues

### Current Limitations

1. **Explorer**: Optional on VPS 3
   - May be deferred if RAM budget is tight
   - Workaround: Use direct RPC calls via https://rpc.axionax.org

2. **Historical Data**: Limited
   - Only recent blocks available
   - Full archive node coming soon

---

## 🆘 Support

### Get Help

- **GitHub Issues**: [axionaxprotocol/axionax-web/issues](https://github.com/axionaxprotocol/axionax-web/issues)
- **Email**: support@axionax.org

### Reporting Bugs

Please include:

- Network: Testnet
- Browser: Chrome/Firefox/etc.
- Wallet: MetaMask version
- Transaction hash (if applicable)
- Screenshot (if relevant)

---

## 🎯 Roadmap

### Completed (April 2026)

- [x] Genesis Public Testnet launch
- [x] Three-VPS topology (EU + AU + Infra hub)
- [x] Website deployment with SSL
- [x] Live metrics dashboard
- [x] Block explorer (optional on VPS 3)
- [x] Faucet functionality (https://faucet.axionax.org)
- [x] Public RPC (https://rpc.axionax.org)

### Current Status

- [ ] EU validator offline - single-validator mode active
- [x] AU validator (46.250.244.4) running and producing blocks

### Medium-term (2026 Q2-Q3)

- [ ] Community Discord launch
- [ ] Additional validators (Asia, Americas)
- [ ] Historical data indexing
- [ ] SDK improvements

### Long-term (Q1 2026)

- [ ] Mainnet preparation
- [ ] Security audit
- [ ] Token economics finalization
- [ ] Compute marketplace beta
- [ ] Staking mechanism

---

## 🎉 Community

### Join the Movement

We're building the future of decentralized compute! Join our growing community:

- **Developers**: Build dApps on Axionax
- **Validators**: Run nodes (mainnet)
- **Users**: Test and provide feedback
- **Contributors**: Help improve the protocol

### Stay Updated

- Follow development on GitHub
- Join Discord for announcements
- Subscribe to newsletter (coming soon)
- Follow on Twitter (coming soon)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

<div align="center">

**Axionax Protocol - Powering the Future of Compute**

Built with ❤️ by the Axionax Team

Last Updated: April 24, 2026

</div>
