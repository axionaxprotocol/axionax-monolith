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
    nodes/            Node health
    jobs/             Jobs hub (DeAI / inference / Worker links)
    apps/             App store
    wallet/           Wallet
    activity/         Activity feed (+ inference, models)
    logs/             RPC-backed log tail (mock stream)
    settings/         Settings
  components/         UI building blocks (Sidebar, Card)
  lib/                rpc.ts (JSON-RPC client), cn.ts (tailwind merge)
```

## Lighthouse (DoD)

Agreed gates for CI / release checks:

| Category       | Minimum score |
|----------------|---------------|
| Performance    | 85            |
| Accessibility  | 90            |
| Best practices | 90            |
| SEO            | 90            |

Run after a production build (starts Next on **port 3031** so it does not clash with `pnpm dev` on 3030; writes HTML + JSON):

```bash
cd apps/os-dashboard
pnpm lighthouse:report
```

Reports are written to `lighthouse-results/` (`lhr.report.html`, `lhr.report.json`).

## Notes

- Frontend-only app per repo rules (`apps/`). It must talk to `services/core`
  exclusively through RPC; never import core internals.
- Designed to eventually be packaged inside a future `os/` Debian image.

## Deploy to Netlify (free monitor hosting)

The repo root **`netlify.toml`** builds this app with:

`pnpm install && pnpm --filter axionax-os-dashboard build`

and **`@netlify/plugin-nextjs`** (workspace root devDependency). Do not deploy the
`.next` folder as a plain static site without that runtime — routing and SSR will
break and the UI will look missing or 404.

1. Connect the **monorepo root** (not `apps/os-dashboard` only) so `pnpm-workspace.yaml` resolves `@axionax/sdk`.
2. Leave **Base directory** empty in Netlify unless you know you need a subfolder; the root `netlify.toml` drives the build.
3. Optional env vars in Site settings: `NEXT_PUBLIC_MONITOR_API_URL`, `NEXT_PUBLIC_CHAIN_NAME`, `NEXT_PUBLIC_REFRESH_MS`.
4. Redeploy after pulling the fixed `netlify.toml`.
