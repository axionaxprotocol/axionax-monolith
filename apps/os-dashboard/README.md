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
