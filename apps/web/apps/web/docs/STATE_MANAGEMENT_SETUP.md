# Axionax Web - State Management Setup

## 📦 สิ่งที่ติดตั้งและตั้งค่าแล้ว

### Dependencies

- ✅ `zustand@5.0.8` - Global state management
- ✅ `@tanstack/react-query@5.90.10` - Server state management

### โครงสร้างที่สร้างขึ้น

```
src/
├── providers/
│   └── QueryProvider.tsx       # TanStack Query setup with QueryClient
├── store/
│   ├── appStore.ts            # Global UI state (sidebar, theme)
│   └── walletStore.ts         # Wallet state (address, balance, chainId)
└── app/
    └── layout.tsx             # Root layout with QueryProvider wrapper
```

### Features

#### 1. **QueryProvider** (`src/providers/QueryProvider.tsx`)

- TanStack Query v5 setup
- Client-side QueryClient instance
- Default options: 1 minute stale time, no refetch on window focus

#### 2. **App Store** (`src/store/appStore.ts`)

- Global UI state management
- Redux DevTools integration
- States: `isSidebarOpen`, `theme`
- Actions: `toggleSidebar()`, `setSidebarOpen()`, `setTheme()`

#### 3. **Wallet Store** (`src/store/walletStore.ts`)

- Wallet connection state
- LocalStorage persistence (address, chainId)
- Redux DevTools integration
- States: `address`, `balance`, `chainId`, `isConnected`
- Actions: `setWalletData()`, `disconnectWallet()`

## 🎨 React 19 Compliance

ทุกคอมโพเนนต์ปรับให้สอดคล้องตาม `.github/copilot-instructions.md`:

### ✅ Props Interface

- เพิ่ม explicit Props interface/type หรือ return type ให้ทุกคอมโพเนนต์
- แทนที่ empty interface ด้วย comments เพื่อหลีก ESLint errors

### ✅ Accessibility (ARIA)

เพิ่ม `aria-label` และ `role="img"` ให้ SVG icons ทั้งหมดใน:

- `Statistics.tsx` (5 icons)
- `Hero.tsx` (2 icons)
- `Features.tsx` (6 icons)
- `Community.tsx` (4 icons: Discord, Twitter, GitHub, Telegram)

### ✅ Tailwind Best Practices

- Mobile-first approach ใช้อยู่แล้ว
- ไม่มี inline styles
- ใช้ Tailwind utility classes สะอาด

### ✅ TypeScript

- Return types ครบถ้วน
- Props interfaces ชัดเจน
- Type-safe Zustand stores

## 🚀 การใช้งาน

### Zustand Store

```tsx
// App Store
import { useAppStore } from '@/store/appStore';

function MyComponent() {
  const { isSidebarOpen, toggleSidebar, setTheme } = useAppStore();

  return <button onClick={toggleSidebar}>Toggle Sidebar</button>;
}

// Wallet Store
import { useWalletStore } from '@/store/walletStore';

function WalletButton() {
  const { address, isConnected, setWalletData, disconnectWallet } =
    useWalletStore();

  if (isConnected) {
    return <button onClick={disconnectWallet}>Disconnect</button>;
  }
  return <button>Connect Wallet</button>;
}
```

### TanStack Query

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';

function BlockHeight() {
  const { data, isLoading } = useQuery({
    queryKey: ['blockHeight'],
    queryFn: async () => {
      const res = await fetch('http://rpc-url/api/block-height');
      return res.json();
    },
    staleTime: 5000, // 5 seconds
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>Block: {data?.height}</div>;
}
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build (TypeScript + ESLint check)
npm run build

# Start production
npm start
```

## 📝 Git Commits

- `e9a907e` - refactor: ปรับปรุง Statistics.tsx + .gitignore
- `0f0349b` - feat: ติดตั้ง Zustand + TanStack Query และปรับคอมโพเนนต์
- `da47fec` - fix: แก้ไข TypeScript และ ESLint issues

## 🎯 Next Steps (Optional)

1. **Migrate Statistics.tsx** ให้ใช้ TanStack Query แทน `useEffect` + `fetch`
2. **สร้าง custom hooks** เช่น `useBlockHeight()`, `useValidatorStats()`
3. **เพิ่ม Zustand stores** สำหรับ feature-specific state
4. **Setup React Query DevTools** (development only)

```tsx
// ตัวอย่าง React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function QueryProvider({ children }: Props) {
  // ...existing code
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

---

**สร้างเมื่อ:** 19 พฤศจิกายน 2025  
**ติดตั้งใน:** Codespace (Ubuntu 24.04.3 LTS)  
**ตามมาตรฐาน:** `.github/copilot-instructions.md` (React 19 + Tailwind + Accessibility)
