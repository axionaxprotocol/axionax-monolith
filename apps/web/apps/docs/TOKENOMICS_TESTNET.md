# AXX Token - Testnet Configuration

> ℹ️ **This document describes the CURRENT TESTNET implementation**
>
> For mainnet tokenomics specification, see [TOKENOMICS.md](./TOKENOMICS.md)

## Overview

The testnet uses a simplified token model designed for testing and development purposes. This configuration allows developers and early adopters to test the protocol without the complexity of full mainnet tokenomics.

## Testnet Token Supply

- **Token Symbol**: AXXt (Testnet Token)
- **Total Supply**: 1,000,000,000 AXXt (1 Billion)
- **Initial Mint**: 100,000,000 AXXt (100 Million)
- **Max Supply**: 1 Billion AXXt (fixed cap)
- **Precision**: 18 decimals
- **Network**: Axionax Testnet (Chain ID: 86137)
- **Name**: Axionax Testnet Token

## Key Differences from Mainnet

| Feature             | Testnet               | Mainnet (Planned)          |
| ------------------- | --------------------- | -------------------------- |
| **Token Symbol**    | **AXXt**              | **AXX**                    |
| **Token Name**      | Axionax Testnet Token | Axionax Token              |
| **Total Supply**    | 1 Billion             | 1 Trillion                 |
| **Initial Mint**    | 100M (10%)            | Distributed per allocation |
| **Vesting**         | ❌ Not implemented    | ✅ Full vesting schedules  |
| **Allocation**      | Simple (single mint)  | Complex (7 categories)     |
| **Governance**      | Simplified            | Full DAO governance        |
| **Staking Rewards** | Basic                 | 2.25% APY with metrics     |

## Testnet Token Features

### ✅ Implemented Features

1. **ERC-20 Standard**
   - Standard token interface
   - Transfer, approve, transferFrom

2. **Burnable**
   - Users can burn their tokens
   - Reduces circulating supply

3. **ERC-20 Permit (EIP-2612)**
   - Gasless approvals
   - Better UX for token interactions

4. **Minting Control**
   - Owner-only minting
   - Yearly mint cap: 100M AXX
   - Transparent minting with reason

5. **Emergency Functions**
   - Emergency token withdrawal
   - Owner-controlled safety features

### ❌ Not Implemented (Testnet)

1. **Token Allocation**
   - No pre-defined distribution
   - All minted to single address

2. **Vesting Contracts**
   - No time-locked vesting
   - Immediate token availability

3. **Staking Rewards**
   - Basic staking contract only
   - No automated reward distribution

4. **Governance Integration**
   - Basic governance contract
   - No on-chain voting power calculation

## Smart Contract Details

### Contract Address

**Testnet (Chain ID: 86137)**

```
AXX Token: Check deployment docs or explorer
Staking: Check deployment docs
Governance: Check deployment docs
```

### Contract Configuration

```solidity
// Maximum supply: 1 billion AXX
uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;

// Minting cap per year (10% of max supply)
uint256 public constant YEARLY_MINT_CAP = 100_000_000 * 10**18;

// Initial supply minted to owner
constructor(address initialOwner) {
    _mint(initialOwner, 100_000_000 * 10**18); // 100M
}
```

## Getting Testnet Tokens

### 1. Faucet (Recommended)

Visit the official faucet to claim test tokens:

- **URL**: https://faucet.axionax.org
- **Amount**: 10 AXXt per request
- **Cooldown**: 24 hours

### 2. Local Testnet

For local development, use the Testnet in a Box:

```bash
cd core-universe/ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box
npm run setup
```

Tokens will be automatically distributed to test accounts.

### 3. Request from Team

For larger amounts (testing, development):

- Discord: #testnet-tokens
- Email: testnet@axionax.org

## Testnet Token Allocation (Simplified)

Unlike mainnet's complex allocation, testnet uses simple distribution:

```
100,000,000 AXXt (Initial Mint)
├── Faucet Reserve:    40,000,000 AXXt (40%)
├── Development:       30,000,000 AXXt (30%)
├── Testing:           20,000,000 AXXt (20%)
└── Community:         10,000,000 AXXt (10%)
```

Additional tokens can be minted as needed (up to yearly cap).

## Use Cases on Testnet

### 1. Testing Transactions

- Send/receive tokens
- Test gas fees
- Practice wallet management

### 2. Smart Contract Development

- Deploy and test contracts
- Interact with AXX token
- Test token integrations

### 3. Staking Testing

- Stake tokens to become validator
- Test staking rewards
- Practice unstaking

### 4. DApp Development

- Integrate token in your dApp
- Test token approvals
- Practice MetaMask integration

## Limitations & Important Notes

### ⚠️ Testnet Limitations

1. **No Real Value**
   - Testnet tokens have NO monetary value
   - Cannot be traded on real exchanges
   - Used for testing purposes only

2. **Network Resets**
   - Testnet may be reset periodically
   - Token balances will be wiped
   - Save contract addresses and test data

3. **Different from Mainnet**
   - Simplified tokenomics
   - No vesting schedules
   - Different supply parameters

4. **Centralized Control**
   - Owner can mint additional tokens
   - Emergency functions enabled
   - Not fully decentralized (by design)

### 🔄 Testnet Lifecycle

**Current Phase**: Active Testing

- Network is stable
- Tokens available via faucet
- Smart contracts deployed

**Planned Upgrades**:

- Periodic contract upgrades
- Feature additions
- Bug fixes

**Before Mainnet**:

- Final security audits
- Community testing
- Migration planning

## Contract Source Code

View the testnet token contract:

```solidity
// File: packages/contracts/contracts/AXXToken.sol
// See: core-universe/packages/contracts/contracts/AXXToken.sol
```

**Key Functions:**

```solidity
// Minting (owner only)
function mint(address to, uint256 amount, string calldata reason) external onlyOwner

// Burning (anyone)
function burn(uint256 amount) public

// Check remaining mintable this year
function remainingMintableThisYear() external view returns (uint256)
```

## Adding AXX to MetaMask

Add testnet AXX token to your wallet:

**Token Details:**

```
Token Address: [Check deployment docs]
Token Symbol: AXXt
Token Name: Axionax Testnet Token
Decimals: 18
Network: Axionax Testnet (86137)
```

**Quick Add:**

1. Connect to Axionax Testnet
2. Click wallet dropdown
3. Click "Add AXX Token" button
4. Confirm in MetaMask

See [ADD_TOKEN_TO_METAMASK.md](./ADD_TOKEN_TO_METAMASK.md) for details.

## Migration to Mainnet

### What Happens to Testnet Tokens?

**Testnet tokens will NOT transfer to mainnet:**

- Testnet and mainnet are separate networks
- Different token contracts
- No bridge between them

**Possible Migration Plans:**

1. **Airdrop** - Testnet participants may receive mainnet tokens
2. **Contribution Rewards** - Active testers rewarded
3. **Bug Bounty** - Finding bugs earns mainnet allocation

**Stay Updated:**

- Follow announcements in Discord
- Check official blog
- Monitor GitHub releases

## Testing Guidelines

### Best Practices

1. **Request Reasonable Amounts**
   - Only request what you need
   - Share with community
   - Report faucet issues

2. **Test Responsibly**
   - Don't spam transactions
   - Test edge cases
   - Report bugs you find

3. **Document Your Testing**
   - Share findings in Discord
   - Create GitHub issues
   - Help improve the protocol

4. **Participate in Governance**
   - Vote on test proposals
   - Suggest improvements
   - Engage with community

## Testnet Roadmap

### Phase 1: Current ✅

- Basic token functionality
- Faucet distribution
- Simple staking

### Phase 2: In Progress 🚧

- Governance testing
- Compute job payments
- Worker staking

### Phase 3: Planned 📋

- Full tokenomics testing
- Vesting contract testing
- Migration preparation

### Phase 4: Pre-Mainnet 🎯

- Security audits
- Community review
- Final testing

## Resources

### Documentation

- [TOKENOMICS.md](./TOKENOMICS.md) - Mainnet specification
- [ADD_TOKEN_TO_METAMASK.md](./ADD_TOKEN_TO_METAMASK.md) - Setup guide
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Development docs

### Network Information

- [CHAIN_ID_CONFIGURATION.md](./CHAIN_ID_CONFIGURATION.md) - Network config
- [TESTNET_INTEGRATION.md](./TESTNET_INTEGRATION.md) - Integration guide
- [RPC_NODE_DEPLOYMENT.md](./RPC_NODE_DEPLOYMENT.md) - Node setup

### Community

- **Discord**: [Axionax Community](https://discord.gg/axionax)
- **GitHub**: [axionax-web-universe](https://github.com/axionaxprotocol/axionax-web-universe)
- **Website**: https://axionax.org

## FAQ

### Q: Can I trade testnet AXX?

**A:** No, testnet tokens have no value and cannot be traded.

### Q: Will my testnet balance transfer to mainnet?

**A:** No, testnet and mainnet are separate. Check migration plans for potential rewards.

### Q: How do I get more testnet tokens?

**A:** Use the faucet (24h cooldown) or request from team for development.

### Q: Why is supply different from mainnet docs?

**A:** Testnet uses simplified model (1B) for testing. Mainnet will use full model (1T).

### Q: Can I become a validator with testnet tokens?

**A:** Yes! Stake AXX to test validator functionality.

### Q: What if I find a bug?

**A:** Report it on GitHub Issues or Discord. May be eligible for bug bounty.

### Q: When will mainnet launch?

**A:** TBA. Follow announcements in Discord and official channels.

---

**Last Updated**: December 6, 2025  
**Version**: Testnet v1.6  
**Status**: Active Testing 🟢

---

> 💡 **Remember**: Testnet is for testing! Break things, find bugs, and help us build a better protocol. Your feedback is invaluable for mainnet success.
