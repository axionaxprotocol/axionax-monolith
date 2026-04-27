# Token Symbol Differentiation Guide

## Why Different Symbols?

To prevent confusion and clearly distinguish between test and production environments, we use different token symbols:

- **AXXt** = Testnet Token (temporary, testing only)
- **AXX** = Mainnet Token (production, real value)

---

## 🎯 Symbol Design Rationale

### AXXt (Testnet)

- **'t' suffix** = Instantly recognizable as testnet
- **Lowercase 't'** = Clear distinction from uppercase letters
- **Easy to remember** = Simple rule: "t" for "test"

### AXX (Mainnet)

- **Clean symbol** = Professional, production-ready
- **Three letters** = Industry standard (like ETH, BTC, BNB)
- **No suffix** = Main, canonical token

---

## 🚫 Common Mistakes Prevented

| Scenario             | Without Different Symbols    | With Different Symbols          |
| -------------------- | ---------------------------- | ------------------------------- |
| **Wallet Display**   | "AXX" shows in both networks | "AXXt" (test) vs "AXX" (real)   |
| **User Confusion**   | "Is this real AXX?"          | Clear: AXXt = test only         |
| **Exchange Listing** | Need to verify network       | Symbol itself indicates network |
| **Smart Contracts**  | Must check chain ID          | Symbol makes it obvious         |
| **Documentation**    | Must specify "testnet AXX"   | "AXXt" is self-documenting      |

---

## 📱 How It Appears

### In MetaMask

**Testnet**

```
Balance: 100 AXXt
Network: Axionax Testnet
```

**Mainnet**

```
Balance: 100 AXX
Network: Axionax Mainnet
```

### In Block Explorers

**Testnet Transaction**

```
From: 0x123...
To: 0x456...
Amount: 10 AXXt
```

**Mainnet Transaction**

```
From: 0x123...
To: 0x456...
Amount: 10 AXX
```

### In Smart Contracts

**Testnet Contract**

```solidity
contract TestDApp {
    IERC20 public axxToken;  // AXXt (testnet)

    constructor(address _tokenAddress) {
        axxToken = IERC20(_tokenAddress);
        // Symbol will be "AXXt"
        require(
            keccak256(bytes(IERC20Metadata(_tokenAddress).symbol()))
            == keccak256(bytes("AXXt")),
            "Wrong token - must use AXXt on testnet"
        );
    }
}
```

**Mainnet Contract**

```solidity
contract MainnetDApp {
    IERC20 public axxToken;  // AXX (mainnet)

    constructor(address _tokenAddress) {
        axxToken = IERC20(_tokenAddress);
        // Symbol will be "AXX"
        require(
            keccak256(bytes(IERC20Metadata(_tokenAddress).symbol()))
            == keccak256(bytes("AXX")),
            "Wrong token - must use AXX on mainnet"
        );
    }
}
```

---

## 🔍 Visual Differentiation

### Token Icons

**Testnet (AXXt)**

- Badge with "TEST" or "t" overlay
- Slightly faded or different color scheme
- Clear visual indicator

**Mainnet (AXX)**

- Full, vibrant token icon
- Official brand colors
- Premium appearance

---

## 📋 Implementation Checklist

### Smart Contracts

- [x] Token symbol set to "AXXt" in testnet contract
- [ ] Token symbol will be "AXX" in mainnet contract
- [x] Constructor enforces correct symbol
- [x] Comments clearly indicate testnet vs mainnet

### Documentation

- [x] All docs updated with AXXt/AXX distinction
- [x] README files clarify symbol usage
- [x] API docs specify correct symbols
- [x] Integration guides show both examples

### User Interface

- [ ] Wallet displays show correct symbol
- [ ] Faucet shows "AXXt" not "AXX"
- [ ] Explorer displays correct symbol
- [ ] DApp UIs check symbol match

### Developer Tools

- [ ] SDK supports both symbols
- [ ] Configuration files specify correct symbol
- [ ] Test fixtures use "AXXt"
- [ ] Deployment scripts use correct symbol

---

## 🛡️ Security Benefits

### Prevents Scams

1. **Fake Mainnet Tokens on Testnet**
   - Scammer deploys "AXX" on testnet
   - Users expect "AXXt" on testnet
   - Clear mismatch = obvious scam

2. **Testnet Tokens on Mainnet**
   - Someone tries to use "AXXt" on mainnet
   - Mainnet expects "AXX"
   - Immediate red flag

3. **Exchange Confusion**
   - Exchange lists "AXX"
   - Won't accept "AXXt" deposits
   - No accidental testnet token trading

---

## 📱 User Education

### Clear Communication

**When talking about tokens:**

- ✅ "Request AXXt from the testnet faucet"
- ✅ "AXX will be the mainnet token"
- ❌ "Request AXX from the faucet" (ambiguous)

**In error messages:**

- ✅ "Wrong token: expected AXXt, got AXX"
- ✅ "This is testnet - use AXXt, not AXX"
- ❌ "Wrong token" (not helpful)

**In documentation:**

- ✅ "Add AXXt token to MetaMask for testnet"
- ✅ "The mainnet token symbol is AXX"
- ❌ "Add AXX token" (which one?)

---

## 🔄 Migration Notes

### Testnet to Mainnet

**What Happens:**

1. Testnet continues with AXXt
2. Mainnet launches with AXX
3. Separate tokens, separate economies
4. No automatic conversion

**User Action:**

- Keep using AXXt on testnet
- Acquire AXX on mainnet (when available)
- Understand they're different tokens

---

## 🌐 Industry Examples

Other projects using similar approaches:

| Mainnet | Testnet   | Project     |
| ------- | --------- | ----------- |
| ETH     | GoerliETH | Ethereum    |
| BNB     | tBNB      | Binance     |
| MATIC   | testMATIC | Polygon     |
| **AXX** | **AXXt**  | **Axionax** |

---

## 📖 Quick Reference

### Token Symbols

```
TESTNET:  AXXt
MAINNET:  AXX
```

### Token Names

```
TESTNET:  Axionax Testnet Token
MAINNET:  Axionax Token
```

### Supply

```
TESTNET:  1 Billion AXXt
MAINNET:  1 Trillion AXX
```

### Contract Addresses

```
TESTNET:  [See deployment docs]
MAINNET:  [TBA - not deployed yet]
```

---

## ✅ Advantages Summary

1. **Clear Distinction** - No confusion between test and real tokens
2. **Scam Prevention** - Harder to trick users with fake tokens
3. **Professional** - Industry standard approach
4. **Self-Documenting** - Symbol tells you what network
5. **Exchange-Friendly** - Clear separation for listing
6. **User-Friendly** - Easy to understand

---

## 🎯 Best Practices

### For Developers

```typescript
// ✅ Good: Check symbol
const symbol = await token.symbol();
if (isTestnet) {
  assert(symbol === 'AXXt', 'Must use AXXt on testnet');
} else {
  assert(symbol === 'AXX', 'Must use AXX on mainnet');
}

// ✅ Good: Environment-based config
const TOKEN_SYMBOL = process.env.NETWORK === 'testnet' ? 'AXXt' : 'AXX';

// ❌ Bad: Hardcode same symbol
const TOKEN_SYMBOL = 'AXX'; // Which network?
```

### For Documentation

```markdown
✅ Get testnet tokens (AXXt) from the faucet
✅ Mainnet will use AXX token
✅ Add AXXt to MetaMask for testnet testing

❌ Get tokens (AXX) from the faucet
❌ The token is AXX
❌ Add AXX to MetaMask
```

---

**Document Version**: 1.0  
**Last Updated**: December 6, 2025  
**Status**: Implemented ✅
