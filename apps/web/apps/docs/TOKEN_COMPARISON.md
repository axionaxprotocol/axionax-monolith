# Token Configuration Comparison

## Testnet vs Mainnet Token Specifications

This document provides a clear comparison between testnet and mainnet token configurations to avoid confusion.

---

## 📊 Quick Comparison

| Feature             | Testnet (Current)     | Mainnet (Planned)         |
| ------------------- | --------------------- | ------------------------- |
| **Token Symbol**    | **AXXt**              | **AXX**                   |
| **Token Name**      | Axionax Testnet Token | Axionax Token             |
| **Total Supply**    | 1 Billion AXXt        | 1 Trillion AXX            |
| **Initial Mint**    | 100 Million (10%)     | Per allocation plan       |
| **Max Supply**      | 1,000,000,000 AXXt    | 1,000,000,000,000 AXX     |
| **Yearly Mint Cap** | 100M AXXt (10%)       | 100B AXX (10%)            |
| **Vesting**         | ❌ Not implemented    | ✅ Full vesting schedules |
| **Allocation**      | Simple (single mint)  | Complex (7 categories)    |
| **Governance**      | Simplified            | Full DAO                  |
| **Staking Rewards** | Basic                 | 2.25% APY with metrics    |
| **Token Value**     | ❌ No real value      | ✅ Real economic value    |
| **Network**         | Testnet (86137)       | Mainnet (TBA)             |

---

## 🔍 Detailed Comparison

### 1. Total Supply

#### Testnet

```solidity
ERC20("axionax Testnet Token", "AXXt")
uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;  // 1 Billion
```

- **Symbol**: AXXt (with 't' suffix)
- **Why**: Simplified for testing
- **Benefit**: Easier to manage test allocations
- **Status**: Production-ready contract

#### Mainnet

```
Symbol: AXX (production token)
Total Supply: 1,000,000,000,000 AXX (1 Trillion)
```

- **Symbol**: AXX (clean, professional)
- **Why**: Support full ecosystem growth
- **Benefit**: Adequate supply for global adoption
- **Status**: Specification ready, contract needs update

---

### 2. Initial Distribution

#### Testnet

```solidity
constructor(address initialOwner) {
    ERC20("axionax Testnet Token", "AXXt")
    _mint(initialOwner, 100_000_000 * 10**18);  // 100M AXXt to owner
}
```

- **Symbol**: AXXt
- **Distribution**: Single mint to deployer
- **Purpose**: Quick setup for testing
- **Vesting**: None (immediate availability)

#### Mainnet

```
Symbol: AXX
Genesis Allocation (1 Trillion AXX total):
├── Ecosystem Reserve: 450B AXX (45%)
├── Team & Advisors:   200B AXX (20%) - 4yr vesting
├── Early Investors:   100B AXX (10%) - 2yr vesting
├── Public Sale:       100B AXX (10%) - immediate
├── Foundation:         80B AXX ( 8%) - 3yr vesting
├── Airdrops:           50B AXX ( 5%) - various
└── Liquidity:          20B AXX ( 2%) - immediate
```

- **Symbol**: AXX
- **Distribution**: Multiple allocations with vesting
- **Purpose**: Fair, sustainable distribution
- **Vesting**: Complex schedules per category

---

### 3. Minting Control

#### Testnet

```solidity
uint256 public constant YEARLY_MINT_CAP = 100_000_000 * 10**18;  // 100M AXXt/year

function mint(address to, uint256 amount, string calldata reason)
    external onlyOwner
{
    require(totalSupply() + amount <= MAX_SUPPLY, "max supply exceeded");
    require(yearlyMinted[currentYear()] + amount <= YEARLY_MINT_CAP, "yearly cap exceeded");
    // ... mint logic
}
```

- **Token**: AXXt
- **Cap**: 100M AXXt per year
- **Control**: Owner can mint up to cap
- **Purpose**: Testing reward distribution

#### Mainnet

```
Symbol: AXX
Yearly Mint Cap: 100,000,000,000 AXX (100B/year)
- Must respect MAX_SUPPLY (1T AXX)
- Governance-controlled minting
- Transparent on-chain reason
```

- **Token**: AXX
- **Cap**: 100B AXX per year (10% of max)
- **Control**: DAO governance approval
- **Purpose**: Staking rewards, ecosystem growth

---

### 4. Token Features

#### Both Testnet & Mainnet

✅ **Shared Features:**

- ERC-20 Standard compliance
- Burnable (users can burn their tokens)
- ERC-20 Permit (gasless approvals)
- Yearly minting cap enforcement
- Emergency withdrawal function
- Transparent minting with reason

❌ **Testnet Missing:**

- Vesting contracts integration
- Allocation enforcement
- Governance-controlled minting
- Automated staking rewards
- DAO voting power tracking

✅ **Mainnet Additional:**

- Full vesting schedule implementation
- Multi-sig governance control
- Automated reward distribution
- On-chain governance integration
- Slashing mechanism for validators

---

### 5. Use Cases

#### Testnet Use Cases

1. **Development Testing**
   - Deploy and test smart contracts
   - Integrate with dApps
   - Test wallet connections

2. **Feature Testing**
   - Staking mechanism
   - Governance proposals
   - Token transfers

3. **User Experience**
   - Onboarding flow
   - Faucet functionality
   - MetaMask integration

4. **Performance Testing**
   - Transaction throughput
   - Gas optimization
   - Network stress tests

#### Mainnet Use Cases

1. **Gas Fees**
   - Pay for transactions
   - Smart contract execution
   - Network usage

2. **Staking**
   - Validator staking (100K+ AXX)
   - Worker collateral (10-20% in AXX)
   - Earn rewards (~2.25% APY in AXX)

3. **Governance**
   - Vote on proposals
   - Protocol upgrades
   - Treasury allocation

4. **Medium of Exchange**
   - Pay for compute jobs
   - Worker compensation
   - Service payments

---

## 📝 Smart Contract Comparison

### Testnet Contract (AXXToken.sol)

**File**: `packages/contracts/contracts/AXXToken.sol`

```solidity
/**
 * @title AXXt Token (Testnet Version)
 * @notice Testnet token of the axionax Protocol
 *
 * ⚠️ TESTNET CONFIGURATION
 * Symbol: AXXt (with 't' suffix for testnet)
 * This contract uses simplified tokenomics for testing.
 * Mainnet will use symbol "AXX" with different supply.
 */
contract AXXToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;      // 1B AXXt
    uint256 public constant YEARLY_MINT_CAP = 100_000_000 * 10**18;   // 100M AXXt

    constructor(address initialOwner) {
        ERC20("axionax Testnet Token", "AXXt")
        _mint(initialOwner, 100_000_000 * 10**18);  // 100M AXXt initial
    }
}
```

**Deployment:**

- Network: Axionax Testnet (86137)
- Address: Check deployment docs
- Status: ✅ Deployed and operational

### Mainnet Contract (Planned)

**Proposed Changes:**

```solidity
/**
 * @title AXX Token (Mainnet Version)
 * @notice Production token of the axionax Protocol
 */
contract AXXToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000_000 * 10**18;      // 1T AXX
    uint256 public constant YEARLY_MINT_CAP = 100_000_000_000 * 10**18;   // 100B AXX

    // No initial mint in constructor - handled by genesis
    constructor(address initialOwner) {
        ERC20("axionax Token", "AXX")
        // Genesis allocations handled separately
    }

    // Additional governance controls
    // Vesting contract integration
    // Slashing mechanisms
}
```

**Deployment:**

- Network: Axionax Mainnet (TBA)
- Address: TBA
- Status: 🚧 Specification ready

---

## 🎯 Migration Plan

### From Testnet to Mainnet

**Important**: Testnet tokens will NOT transfer to mainnet.

#### What Happens to Testnet Tokens?

1. **Testnet Continues**
   - Testnet remains operational
   - Testnet tokens keep their function
   - Used for ongoing development

2. **Mainnet Launch**
   - New token contract deployed
   - Different addresses
   - Separate economy

3. **User Migration**
   - No automatic transfer
   - Possible airdrop for active testers
   - Rewards for bug reporters

#### Potential Testnet Participant Rewards

🎁 **Possible Mainnet Airdrops:**

- Active testnet users
- Bug bounty participants
- Community contributors
- Validator operators

📊 **Criteria (TBA):**

- Transaction volume on testnet
- Validator uptime
- Bugs reported and fixed
- Community engagement

---

## 📚 Documentation References

### Testnet Documentation

- [TOKENOMICS_TESTNET.md](./TOKENOMICS_TESTNET.md) - Full testnet spec
- [ADD_TOKEN_TO_METAMASK.md](./ADD_TOKEN_TO_METAMASK.md) - Setup guide
- [TESTNET_INTEGRATION.md](./TESTNET_INTEGRATION.md) - Developer guide

### Mainnet Documentation

- [TOKENOMICS.md](./TOKENOMICS.md) - Full mainnet spec
- [GOVERNANCE.md](./GOVERNANCE.md) - Governance system
- [AXX_Upgrade_v1.6.md](./AXX_Upgrade_v1.6.md) - Token evolution

### Smart Contracts

- [AXXToken.sol](../../core-universe/packages/contracts/contracts/AXXToken.sol) - Token contract
- [Staking.sol](../../core-universe/packages/contracts/contracts/Staking.sol) - Staking contract
- [Governance.sol](../../core-universe/packages/contracts/contracts/Governance.sol) - Governance contract

---

## ❓ FAQ

### General Questions

**Q: Why are testnet and mainnet supplies different?**
A: Testnet uses simplified model (1B) for easier testing. Mainnet needs larger supply (1T) for global adoption and ecosystem growth.

**Q: Will my testnet tokens have value?**
A: No, testnet tokens are for testing only and have no monetary value.

**Q: Can I transfer testnet tokens to mainnet?**
A: No, testnet and mainnet are separate networks with different contracts.

**Q: When will mainnet launch?**
A: TBA. Follow announcements on Discord and official channels.

### Technical Questions

**Q: Why not deploy mainnet contract on testnet?**
A: Testnet needs flexibility for testing. Mainnet contract will be more restricted and governance-controlled.

**Q: Can I test vesting on testnet?**
A: Limited vesting contract is available for testing, but not integrated with token distribution.

**Q: How do I test with realistic amounts?**
A: Use testnet amounts proportionally. 1 testnet AXX ≈ 1000 mainnet AXX in testing scenarios.

**Q: Will contract addresses change?**
A: Yes, mainnet will have completely new contract addresses on different network.

### Developer Questions

**Q: Can I use testnet SDK for mainnet?**
A: Yes, but update configuration (RPC URL, chain ID, contract addresses).

**Q: Are ABIs the same?**
A: Mostly, but mainnet may have additional functions for governance and vesting.

**Q: How to prepare dApp for mainnet?**
A: Use environment variables for network config. Keep testnet and mainnet configs separate.

---

## 🔔 Stay Updated

### Get Notified About Mainnet Launch

1. **Join Discord**: #announcements channel
2. **Follow GitHub**: Watch this repository
3. **Subscribe**: Newsletter (coming soon)
4. **Twitter**: @AxionaxProtocol (coming Q1 2026)

### Pre-Launch Activities

- [ ] Security audits completion
- [ ] Community testing phase
- [ ] Governance system review
- [ ] Economic model validation
- [ ] Mainnet deployment countdown

---

**Document Version**: 1.0  
**Last Updated**: December 6, 2025  
**Status**: Testnet Active | Mainnet Planned
