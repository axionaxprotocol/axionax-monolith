# Core ↔ Web compatibility record

**Human-maintained.** Update whenever you sync chain-related constants from **axionax-core-universe** into this repo.

| Last updated | Core reference (tag or SHA)                                      | Web reference (tag or SHA) | Notes                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-24   | `28f42cf` — docs: enhance GENESIS_PUBLIC_TESTNET_PLAN + ulimits  | `main` — docs sync pass    | Testnet (chain_id 86137). Genesis SHA-256 `0xed1bdac7c278e5b4f58a1eceb7594a4238e39bb63e1018e38ec18a555c762b55`. Added VPS3 (217.216.109.5) as Faucet/Nginx hub. No constants changed in `packages/blockchain-utils`; doc-only sync across `apps/docs`, `apps/web/src/app/infrastructure`, and CHANGELOG. |

## Genesis parameters (from core `28f42cf`)

| Item                     | Value                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Chain ID                 | `86137` (`0x15079`)                                                                      |
| Native token             | AXX (18 decimals)                                                                        |
| Genesis file             | `core/tools/genesis.json`                                                                |
| Genesis SHA-256          | `0xed1bdac7c278e5b4f58a1eceb7594a4238e39bb63e1018e38ec18a555c762b55`                     |
| Block time               | 2 s (genesis)                                                                            |
| Validator EU             | `217.216.109.5` (VPS 1) — RPC 8545, P2P 30303                                            |
| Validator AU             | `46.250.244.4` (VPS 2) — RPC 8545, P2P 30303                                             |
| Infra hub                | `217.216.109.5` (VPS 3) — Nginx + Faucet + optional Explorer (no chain node)             |
| Faucet compose           | `ops/deploy/docker-compose.vps3-faucet.yml` (core)                                       |

See [SOLO_CORE_WEB_SYNC.md](SOLO_CORE_WEB_SYNC.md) for the checklist and [PARAMETERS_SYNC.md](../packages/blockchain-utils/PARAMETERS_SYNC.md) for the field map.
