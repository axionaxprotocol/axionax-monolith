# 🔧 Fix: Add Token to MetaMask Issue

## Issue Summary

ผู้ใช้ไม่สามารถเพิ่ม AXX Token บน MetaMask ได้

## Root Cause Analysis

### ปัญหาที่พบ:

1. **Inconsistent Config Format**
   - ไฟล์ `deploy_token.js` สร้าง `config.json` โดยให้ `erc20` เป็น **object**:
     ```json
     {
       "erc20": {
         "symbol": "AXX",
         "address": "0x...",
         "decimals": 18
       }
     }
     ```
   - แต่ไฟล์ UI (`index.html`) คาดหวังว่า `cfg.erc20` จะเป็น **string address** โดยตรง:
     ```javascript
     options: { address: CFG.erc20, symbol: 'AXX', decimals: 18 }
     ```

2. **Insufficient Error Handling**
   - ไม่มีการตรวจสอบว่า MetaMask ได้เชื่อมต่อหรือยัง
   - ไม่มีการแสดงผลลัพธ์จาก `wallet_watchAsset` (return value)
   - Error messages ไม่ชัดเจน

3. **Missing Add Token Feature in Web App**
   - Web app หลัก (`apps/web`) ไม่มีฟีเจอร์เพิ่ม token

---

## Changes Made

### 1. ✅ Fixed UI Config Parsing (v1.5 & v1.6)

**Files:**

- `/core-universe/ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/ui/index.html`
- `/core-universe/ops/deploy/environments/testnet/Axionax_v1.5_Testnet_in_a_Box/ui/index.html`

**Changes:**

```javascript
// เพิ่มการ parse config ที่รองรับทั้ง object และ string
const erc20Addr =
  typeof cfg.erc20 === 'object' && cfg.erc20?.address
    ? cfg.erc20.address
    : typeof cfg.erc20 === 'string'
      ? cfg.erc20
      : null;
const erc20Symbol = typeof cfg.erc20 === 'object' && cfg.erc20?.symbol ? cfg.erc20.symbol : 'AXX';
const erc20Decimals =
  typeof cfg.erc20 === 'object' && cfg.erc20?.decimals ? cfg.erc20.decimals : 18;

CFG = {
  // ... other fields
  erc20: erc20Addr,
  erc20Symbol: erc20Symbol,
  erc20Decimals: erc20Decimals,
  // ...
};
```

### 2. ✅ Improved addToken Function

**Enhanced error handling:**

```javascript
async function addToken() {
  try {
    if (!CFG?.erc20) throw new Error('ERC20 ยังไม่ได้กำหนดใน config.json');
    if (!ethereum) throw new Error('MetaMask ยังไม่ได้เชื่อมต่อ');

    const tokenAddress = CFG.erc20;
    const tokenSymbol = CFG.erc20Symbol || 'AXX';
    const tokenDecimals = CFG.erc20Decimals || 18;

    log(`กำลังเพิ่มโทเค็น ${tokenSymbol} (${tokenAddress})...`);

    const wasAdded = await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenAddress,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
        },
      },
    });

    if (wasAdded) {
      log(`[ok] เพิ่มโทเค็น ${tokenSymbol} (ERC-20) ใน MetaMask แล้ว ✅`);
    } else {
      log('[warn] ผู้ใช้ปฏิเสธการเพิ่มโทเค็น');
    }
  } catch (e) {
    console.error('Add token error:', e);
    log(`[err] Add token failed: ${e.message}`);
  }
}
```

### 3. ✅ Added Token Functions to Web3 Library

**File:** `/apps/web/src/lib/web3.ts`

**New exports:**

```typescript
export interface AddTokenParams {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
}

export const addTokenToMetaMask = async (params: AddTokenParams): Promise<boolean> => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  const { ethereum } = window as unknown as {
    ethereum?: {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
    };
  };

  try {
    const wasAdded = (await ethereum?.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: params.address,
          symbol: params.symbol,
          decimals: params.decimals,
          image: params.image,
        },
      },
    })) as boolean;

    return wasAdded;
  } catch (error) {
    console.error('Error adding token to MetaMask:', error);
    throw error;
  }
};

export const addAXXToken = async (tokenAddress: string): Promise<boolean> => {
  return addTokenToMetaMask({
    address: tokenAddress,
    symbol: 'AXX',
    decimals: 18,
  });
};
```

### 4. ✅ Added "Add Token" Button to ConnectButton

**File:** `/apps/web/src/components/wallet/ConnectButton.tsx`

**Changes:**

- เพิ่ม import `addAXXToken` จาก `@/lib/web3`
- เพิ่ม state `isAddingToken` สำหรับ loading state
- เพิ่มฟังก์ชัน `handleAddToken`
- เพิ่มปุ่ม "Add AXX Token" ใน dropdown menu

```tsx
const handleAddToken = async (tokenAddress: string): Promise<void> => {
  if (!isMetaMaskInstalled()) {
    alert('โปรดติดตั้ง MetaMask ก่อนใช้งาน');
    return;
  }

  setIsAddingToken(true);
  try {
    const wasAdded = await addAXXToken(tokenAddress);
    if (wasAdded) {
      alert('เพิ่ม AXX Token ลง MetaMask สำเร็จ! ✅');
    } else {
      alert('ผู้ใช้ปฏิเสธการเพิ่ม token');
    }
  } catch (error) {
    console.error('Error adding token:', error);
    alert('ไม่สามารถเพิ่ม token ได้: ' + (error as Error).message);
  } finally {
    setIsAddingToken(false);
  }
};
```

**UI Addition:**

```tsx
<button
  onClick={() => void handleAddToken('0x0000000000000000000000000000000000001000')}
  disabled={isAddingToken}
  className="w-full px-3 py-2 text-sm text-primary-400 hover:bg-dark-700 rounded-lg transition-colors text-left flex items-center gap-2 disabled:opacity-50"
>
  <svg className="w-4 h-4" ...>
    <path d="M12 4v16m8-8H4" />
  </svg>
  {isAddingToken ? 'Adding...' : 'Add AXX Token'}
</button>
```

### 5. ✅ Created Documentation

**File:** `/apps/docs/ADD_TOKEN_TO_METAMASK.md`

**Includes:**

- ปัญหาที่พบบ่อยและวิธีแก้
- วิธีเพิ่ม Token ด้วยตนเอง (Manual)
- วิธีเพิ่ม Token แบบอัตโนมัติ (Recommended)
- Code examples สำหรับ developers
- Troubleshooting guide

---

## Testing Checklist

### Local Testnet UI

- [ ] เปิด `index.html` ใน browser
- [ ] คลิก "Connect Wallet" และเชื่อมต่อกับ MetaMask
- [ ] คลิก "Add AXX Token"
- [ ] ตรวจสอบว่า MetaMask แสดงหน้าต่างยืนยัน
- [ ] คลิก "Add Token" ใน MetaMask
- [ ] ตรวจสอบว่า token ปรากฏใน Assets list

### Web App

- [ ] เข้า https://axionax.org
- [ ] คลิก "Connect Wallet"
- [ ] เชื่อมต่อกับ MetaMask
- [ ] คลิก wallet dropdown (แสดง address และ balance)
- [ ] คลิก "Add AXX Token"
- [ ] ตรวจสอบว่า token ถูกเพิ่มสำเร็จ

### Error Scenarios

- [ ] ทดสอบเมื่อไม่มี MetaMask (ต้องแสดง error)
- [ ] ทดสอบเมื่ออยู่ใน wrong network (ต้องแสดงคำเตือน)
- [ ] ทดสอบเมื่อ user decline การเพิ่ม token (ต้องแสดง message)
- [ ] ทดสอบเมื่อใช้ invalid token address (ต้อง handle error)

---

## Files Changed

```
✅ /core-universe/ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/ui/index.html
✅ /core-universe/ops/deploy/environments/testnet/Axionax_v1.5_Testnet_in_a_Box/ui/index.html
✅ /apps/web/src/lib/web3.ts
✅ /apps/web/src/components/wallet/ConnectButton.tsx
✅ /apps/docs/ADD_TOKEN_TO_METAMASK.md (NEW)
✅ /apps/docs/FIX_ADD_TOKEN_ISSUE.md (THIS FILE)
```

---

## Benefits

1. ✅ **รองรับ Config ทั้งสองแบบ** - ทำงานได้ทั้งแบบ object และ string
2. ✅ **Error Handling ดีขึ้น** - แสดง error messages ที่ชัดเจน
3. ✅ **User Experience ดีขึ้น** - มีปุ่มเพิ่ม token ใน web app
4. ✅ **Developer Friendly** - มี functions สำเร็จรูปในไลบรารี
5. ✅ **Documentation** - มีเอกสารสำหรับผู้ใช้และ developers

---

## Future Improvements

### Potential Enhancements:

1. **Dynamic Token Address** - อ่าน token address จาก API/config แทนการ hardcode
2. **Token Icon** - เพิ่ม token logo URL ใน metadata
3. **Multi-token Support** - รองรับการเพิ่ม token หลายตัว
4. **Success Toast** - แสดง notification แทน alert
5. **Token Balance Display** - แสดง ERC-20 token balance ใน wallet dropdown

---

## Related Issues

- #N/A - User cannot add token to MetaMask
- Related: Network configuration issues
- Related: Web3 integration improvements

---

**Fixed by:** GitHub Copilot  
**Date:** December 6, 2025  
**Version:** v1.0.0
