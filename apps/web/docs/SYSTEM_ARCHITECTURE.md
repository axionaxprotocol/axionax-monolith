# System Architecture Report: axionax-web-universe

**Date:** December 13, 2025 (reference update Feb 2026)  
**Protocol:** v2.1 — Series Seed Preparation ([Master Summary](../MASTER_SUMMARY.md))  
**Scope:** `apps/web`, `apps/marketplace`, `apps/api`, `packages/sdk`, `packages/blockchain-utils`  
**Status:** All Systems Operational (100%) ✅

> Protocol-level architecture (Core, DePIN, Geo-Hierarchy, Sentinels) see [MASTER_SUMMARY.md](../MASTER_SUMMARY.md)

---

## 1. High-Level Architecture

`axionax-web-universe` is a **pnpm workspaces** monorepo designed to separate Core Logic (SDK) from User Interfaces (Web & Marketplace)

```mermaid
graph TD
    User((User))

    subgraph "apps/web (Next.js)"
        Website[Main Website]
        Web3Lib[lib/web3.ts]
    end

    subgraph "apps/marketplace (Vite)"
        Marketplace[ASR Marketplace]
        EscrowUI[EscrowPanel]
    end

    subgraph "packages/sdk"
        SDK[Axionax SDK]
        Client[AxionaxClient]
        Types[Shared Types]
    end

    subgraph "Blockchain / Network"
        InfraNode[Infra Node (VPS)]
        RPC[Validator Nodes]
        Contract[Smart Contracts]
    end

    User --> Website
    User --> Marketplace

    Website --> Web3Lib
    Web3Lib -->|Ethers.js| InfraNode
    Web3Lib -->|Ethers.js| RPC

    Marketplace --> SDK
    EscrowUI --> SDK
    SDK -->|JsonRpcProvider| RPC
```

### Main components:

1. **`packages/sdk`**: The "brain" — TypeScript library for blockchain interaction (Jobs, Workers, Escrow). Currently runs in **Mock Mode** but structured for real RPC.
2. **`apps/marketplace`**: The "consumer" — Vite SPA client that uses SDK for Worker selection and Escrow management.
3. **`apps/web`**: The "face" — Next.js SSR app for main site and docs. Manages Web3 connection independently from SDK.

---

## 2. Tech Stack Summary

| Workspace                       | Type | Framework / Library         | Key Dependencies                                   | State Management             |
| :------------------------------ | :--- | :-------------------------- | :------------------------------------------------- | :--------------------------- |
| **`apps/web`**                  | App  | **Next.js 14** (App Router) | `ethers`, `react-query`, `zustand`, `@axionax/sdk` | `zustand` + React Context    |
| **`apps/marketplace`**          | App  | **Vite** + React            | `@axionax/sdk`, `ethers`, `viem`                   | React `useState` / `useMemo` |
| **`apps/api`**                  | App  | **Hono** + Drizzle ORM      | `postgres`, `viem`, `zod`                          | N/A (Stateless)              |
| **`packages/sdk`**              | Lib  | **TypeScript**              | `ethers`, `@axionax/blockchain-utils`              | N/A (Stateless)              |
| **`packages/blockchain-utils`** | Lib  | **TypeScript**              | `viem`                                             | N/A (Stateless)              |
| **`packages/ui`**               | Lib  | **React**                   | `react`, `react-dom`                               | N/A                          |

- **Styling**: All apps use **Tailwind CSS**
- **Package Manager**: `pnpm` (efficient dependency management)

---

## 3. Data Flow Analysis

### A. Marketplace (SDK Integration)

Marketplace relies on SDK for business logic.

1. **Input**: User selects Worker and deposits via `EscrowPanel`
2. **Process**:
   - `EscrowPanel` creates `AxionaxClient` instance
   - Calls `client.depositEscrow(jobId, amount)`
   - **SDK Logic**: Currently returns **Mock Transaction** immediately
3. **Output**: UI updates status to "Deposited" from SDK response
   - _Future_: SDK will sign transaction → send to RPC → wait for block confirmation

### B. Website (Direct Web3)

Website manages blockchain connection directly, not via SDK.

1. **Input**: User clicks "Connect Wallet"
2. **Process**:
   - `Web3Context` calls `connectWallet()` from `lib/web3.ts`
   - Uses `window.ethereum` for account access
   - Hardcoded RPCs: `https://axionax.org/rpc/`, `http://217.76.61.116:8545`
3. **Output**: App state (`account`, `balance`) updated via `zustand` or Context

---

## 4. Code Quality Assessment

### Strengths

- ✅ **Monorepo Structure**: Clear separation of apps and packages; easy to maintain and publish SDK separately
- ✅ **Type Safety**: Comprehensive TypeScript interfaces (`Job`, `Worker`, `EscrowTransaction`) for consistent data
- ✅ **Modern Stack**: Next.js 14 and Vite are current best practices

### Areas for Improvement

- ⚠️ **Logic Duplication**: `apps/web` has its own wallet connection logic (`lib/web3.ts`) overlapping with what SDK _should_ do; RPC URL must be updated in 2 places
- ⚠️ **Hardcoded Config**: RPC URLs embedded in code (`apps/web/src/lib/web3.ts` and `apps/marketplace/src/components/EscrowPanel.tsx`)
- ⚠️ **Mock Dependency**: Marketplace works but relies on SDK mock data; requires SDK logic for production

---

## 5. Recommendations

1. **Centralize Web3 Logic**:
   - Move `connectWallet`, `getBalance`, and chain config from `apps/web/lib/web3.ts` into `@axionax/sdk`
   - Have `apps/web` use `@axionax/sdk` instead of managing `ethers` directly

2. **Environment Variables**:
   - Move RPC URLs (e.g. `http://46.250.244.4:8545`) to `.env` or central config in SDK

3. **Complete SDK**:
   - Replace `// TODO` in `packages/sdk` with real smart contract calls
   - Require: **Escrow Smart Contract ABI** and **Deployed Address**

4. **Shared UI Components**:
   - Consider `packages/ui` workspace for shared components (buttons, cards) for consistent styling

---

## 6. Network Infrastructure

- **Infrastructure Node (VPS)**:
  - **Role**: Gateway for services
  - **Services**: Webservice, RPC Gateway, Faucet API, Explorer API, etc.
  - Primary connection point for frontend (e.g. `apps/web` fetches metrics)

- **Validator Nodes**:
  - `217.76.61.116` (EU Region)
  - `46.250.244.4` (AU Region)
  - **Role**: Consensus and block production (Blockchain Core)
