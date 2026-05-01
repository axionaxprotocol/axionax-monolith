# Axionax OS Dashboard

A self-hosted, Umbrel-style web dashboard for managing an Axionax node.

## Features (alpha)

- Live status of remote/local nodes (`eth_blockNumber`, `net_peerCount`, `eth_chainId`)
- App Store mock (Worker, Sentinel, Explorer, Faucet)
- Wallet placeholder, Settings, Activity pages
- Dark, modern UI built with Next.js 14 + Tailwind + Lucide icons

## Run locally

```bash
cd apps/os-dashboard
pnpm install   # or: npm install
pnpm dev       # http://localhost:3030
```

## Configure nodes

Default nodes are defined in `src/lib/rpc.ts` (`DEFAULT_NODES`). Update the
list (or wire it to env vars) to point at your own RPC endpoints.

## Layout

```
src/
  app/                Next.js App Router pages
    page.tsx          Dashboard home
    nodes/            Node detail
    apps/             App store
    wallet/           Wallet
    activity/         Activity feed
    settings/         Settings
  components/         UI building blocks (Sidebar, Card)
  lib/                rpc.ts (JSON-RPC client), cn.ts (tailwind merge)
```

## Notes

- Frontend-only app per repo rules (`apps/`). It must talk to `services/core`
  exclusively through RPC; never import core internals.
- Designed to eventually be packaged inside a future `os/` Debian image.

## Deploy to Netlify (free monitor hosting)

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Netlify, create a new site from that repository.
3. Netlify auto-detects `netlify.toml` at repo root and uses:
   - Base directory: `apps/os-dashboard`
   - Build command: `pnpm build`
4. Add required environment variables in Netlify Site Settings (recommended):
   - `NEXT_PUBLIC_MONITOR_API_URL`
   - `NEXT_PUBLIC_CHAIN_NAME`
   - `NEXT_PUBLIC_REFRESH_MS`
5. Trigger deploy and open the generated site URL.
