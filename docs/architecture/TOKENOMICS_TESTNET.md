# axionax Testnet Tokenomics

> **Current Testnet Configuration** — Genesis Public Testnet (Phase 1)

**Last Updated**: May 3, 2026  
**Network**: Testnet (Chain ID: 86137)  
**Token Symbol**: AXXt (Testnet Token)

---

## Overview

The Axionax Testnet uses a simplified token model designed for testing and development purposes. This configuration differs significantly from the planned mainnet tokenomics.

---

## Testnet Token Supply

| Parameter | Value |
|-----------|-------|
| **Token Symbol** | AXXt |
| **Token Name** | Axionax Testnet Token |
| **Total Supply** | 1,000,000,000 AXXt (1 Billion) |
| **Supply Model** | Fixed (no inflation) |
| **Precision** | 18 decimals |
| **Network** | Testnet |

---

## Distribution

### Faucet Distribution

| Allocation | Amount | Purpose |
|------------|--------|---------|
| **Testnet Faucet** | 500,000,000 AXXt | Free distribution for developers and testers |
| **Validator Rewards** | 300,000,000 AXXt | Block rewards for testnet validators |
| **Development Reserve** | 200,000,000 AXXt | Core team testing and development |

### Faucet Details

- **URL**: `https://faucet.axionax.org` (planned) / Direct RPC request
- **Daily Limit**: 1,000 AXXt per address
- **Rate Limiting**: 1 request per hour per IP
- **Minimum Balance**: 0.01 AXXt (for gas)

---

## Key Differences from Mainnet

| Feature | Testnet | Mainnet (Planned) |
|---------|---------|-------------------|
| **Total Supply** | 1 Billion AXXt | 1 Trillion AXX |
| **Vesting** | None (immediate) | Yes (4-year vesting) |
| **Value** | No real value | Market-determined |
| **Faucet** | Free unlimited | N/A (purchase only) |
| **Staking** | Optional | Required for validators |
| **Slashing** | Disabled | Enabled |

---

## Testnet Token Utilities

### 1. Gas Fees

- **Purpose**: Pay for transaction execution
- **Cost**: Minimal (0.001-0.1 AXXt per transaction)
- **Burned**: No (recycled to faucet)

### 2. Staking (Testing)

- **Minimum Stake**: 1,000 AXXt (testnet)
- **Mainnet Equivalent**: 10,000 AXX
- **Rewards**: 1 AXXt per block (distributed to validator)
- **Unstaking Period**: 1 block (testnet) vs 21 days (mainnet)

### 3. Compute Marketplace (PoPC)

- **Job Payment**: AXXt for compute jobs
- **Worker Collateral**: 100 AXXt minimum
- **Price Mechanism**: Posted Price Controller (testing)

---

## Getting Testnet Tokens

### Method 1: Faucet (Recommended)

```bash
# Request from faucet via RPC
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "faucet_request",
    "params": ["0xYOUR_ADDRESS"],
    "id": 1
  }'
```

### Method 2: Direct from Validator

Contact testnet validators for development allocation:
- **AU Validator**: `46.250.244.4:8545`
- **ES Validator**: `217.216.109.5:8545`

### Method 3: Block Rewards

Run a validator node and earn block rewards (1 AXXt per block).

---

## Testnet Economics

### Block Rewards

- **Reward per Block**: 1.0 AXXt
- **Block Time**: ~2 seconds
- **Daily Emission**: ~43,200 AXXt
- **Target**: Sustainable for multi-year testing

### Validator Economics

| Metric | Testnet Value |
|--------|---------------|
| **Min Stake** | 1,000 AXXt |
| **Block Reward** | 1.0 AXXt |
| **Expected ROI** | N/A (testing) |
| **Validator Count** | 2 (target: 10+) |

---

## Migration to Mainnet

⚠️ **Important**: Testnet tokens (AXXt) have no value and will not be convertible to mainnet AXX.

### Mainnet Launch

- Testnet will continue running post-mainnet
- New testnets may be launched for major upgrades
- No token swap or bridge planned

---

## Network Parameters

| Parameter | Value |
|-----------|-------|
| **Chain ID** | 86137 (0x15079) |
| **Symbol** | AXXt |
| **Decimals** | 18 |
| **Block Time** | 2 seconds |
| **Genesis** | April 24, 2026 |
| **Validators** | 2 (AU, ES) |

---

## See Also

- [TOKENOMICS.md](./TOKENOMICS.md) — Mainnet tokenomics (production plan)
- [GOVERNANCE.md](./GOVERNANCE.md) — DAO governance structure
- [ROADMAP.md](./ROADMAP.md) — Development timeline
- [JOIN_TESTNET.md](../web/web-integration/JOIN_TESTNET.md) — How to join testnet

---

_Last updated: May 3, 2026_
