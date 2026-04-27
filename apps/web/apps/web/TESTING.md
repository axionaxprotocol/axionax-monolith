# Testing Guide – Axionax Web

## Scripts

| Script                 | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `pnpm test:e2e`        | Run Playwright E2E tests (starts dev server automatically) |
| `pnpm test:e2e:ui`     | Run E2E with Playwright UI                                 |
| `pnpm test:e2e:headed` | Run E2E with visible browser                               |

From repo root:

- `pnpm test` – Unit tests (SDK, blockchain-utils, api, genesis-generator)
- `pnpm test:e2e` – E2E for `apps/web` only

## Prerequisites for E2E

1. **Chromium** (used by default):  
   `npx playwright install chromium` (done once per machine)
2. **Dev server**: Started automatically by Playwright (`playwright.config.ts` runs `pnpm dev` against `BASE_URL`, default `http://localhost:3000`) unless `CI` is set. Override the URL with `BASE_URL` if needed.
3. **RPC / network**: Assertions tolerate live RPC being slow or offline (e.g. Explorer shows “—”, API routes may return mock data). No separate `RPC_URL` env is required for the web E2E suite.

## API Routes Used by the App

These routes were added so the site works without external services:

| Route                                | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `GET /api/stats`                     | Network stats (block number, validators) – uses EU/AU RPC or mock |
| `GET /api/blocks?page=1&pageSize=10` | Block list for Explorer – uses RPC or empty list                  |
| `GET /api/faucet/balance`            | Faucet wallet balance – uses faucet-api or mock                   |
| `POST /api/faucet/faucet`            | Request testnet tokens – proxies to faucet-api or mock success    |
| `GET /api/faucet`                    | Faucet status (for E2E)                                           |
| `POST /api/faucet`                   | Same as POST /api/faucet/faucet (E2E)                             |

When validators (RPC) or faucet-api are unreachable, responses fall back to mock/empty data so the UI still loads.

## E2E Test Results

- **API tests**: Most pass. Some may fail if validators are down (e.g. blocks list empty) or if rate limiting differs.
- **UI tests** (updated to match current app):
  - Nav: tests expect Docs, Explorer, Faucet, Wallet (ExplorerLayout nav).
  - Network status: expects `[data-testid="network-status"]` and text like Validator/Connected/online/offline/checking.
  - Wallet: Connect button and optional modal/MetaMask text.
  - Transaction flow: tests skipped (no `/send` page).
  - Faucet: label “wallet/address”, button “Claim” or “Request”.
  - Explorer block number: accepts numeric or “—” when RPC is down.

To run only API E2E:  
`pnpm test:e2e -- tests/e2e/api.spec.ts`

To run only Explorer E2E:  
`pnpm test:e2e -- tests/e2e/explorer.spec.ts`

To run only Faucet E2E:  
`pnpm test:e2e -- tests/e2e/faucet.spec.ts`

## Unit Tests

- `packages/sdk`: `pnpm --filter @axionax/sdk test`
- `packages/blockchain-utils`: `pnpm --filter @axionax/blockchain-utils test`
- `apps/api`: `pnpm --filter @axionax/api test`
- `apps/genesis-generator`: `pnpm --filter @axionax/genesis-generator test`

All via root: `pnpm test`.
