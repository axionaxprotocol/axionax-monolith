# Solo maintainer: web ↔ core (dual repo)

Lightweight discipline when you are the only person touching **axionax-web-universe** and **axionax-core-universe**.

## Rules of thumb

1. **Core is the source of truth** for anything the chain actually uses: chain ID, genesis-related values, consensus/staking params in `core/.env.example` and `core/DEPLOYMENT_GUIDE.md`.
2. **This repo mirrors** those values in `packages/blockchain-utils` (and anything that imports it, including `@axionax/sdk`). See [PARAMETERS_SYNC.md](../packages/blockchain-utils/PARAMETERS_SYNC.md) for the file mapping.
3. **Record the pair** whenever you change mirrored values: update [CORE_WEB_COMPAT.md](CORE_WEB_COMPAT.md) (core tag or SHA + this repo ref + date).

## Checklist (after you change core)

- [ ] Open core: `core/.env.example`, `core/DEPLOYMENT_GUIDE.md`, or the files you actually changed.
- [ ] Open web: `packages/blockchain-utils/src/constants.ts` (and any other files listed in PARAMETERS_SYNC).
- [ ] Align numbers/names; run `pnpm --filter @axionax/blockchain-utils type-check` (or `pnpm --filter @axionax/sdk test`) from the monorepo root.
- [ ] Update [CORE_WEB_COMPAT.md](CORE_WEB_COMPAT.md).
- [ ] Commit this repo with a message that mentions core, for example:
  - `chore(blockchain-utils): sync chain params with core (tag v0.x.y)`
  - or `chore(blockchain-utils): sync with core abc1234`

## Checklist (after you only change web RPC/UI)

- [ ] If you did **not** change on-chain params, you do not need to touch CORE_WEB_COMPAT unless you are verifying RPC endpoints against a specific core deployment.

## When to add automation

If you start missing sync steps or forget which core revision matches production, add a small CI step that compares constants to a checked-in JSON snapshot from core. Until then, the table in CORE_WEB_COMPAT.md is enough.

## Links

- Core repo: https://github.com/axionaxprotocol/axionax-core-universe  
- Parameter map: [PARAMETERS_SYNC.md](../packages/blockchain-utils/PARAMETERS_SYNC.md)  
- Dev setup: [DEVELOPMENT.md](DEVELOPMENT.md)
