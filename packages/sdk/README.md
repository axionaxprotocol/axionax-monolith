# `@axionax/sdk`

Typed JSON-RPC client + shared chain primitives for Axionax Protocol.

Used by:
- `apps/os-dashboard` (Node OS UI)
- `apps/web` (public dApp)
- Any internal Node tool that needs to query a node

## Install (within the workspace)

Already wired via pnpm workspaces — just add to a package's `package.json`:

```json
"dependencies": {
  "@axionax/sdk": "workspace:*"
}
```

then `pnpm install`.

## Usage

```ts
import { getNodeStatus, DEFAULT_NODES, rpcCall } from "@axionax/sdk";

const statuses = await Promise.all(DEFAULT_NODES.map(getNodeStatus));

// Low-level — never throws, always returns a Result.
const r = await rpcCall<string>(node.url, "eth_blockNumber");
if (r.ok) {
  console.log(parseInt(r.data, 16));
} else {
  console.error(r.error.code, r.error.message);
}
```

See `src/rpc.ts` for the full surface.

## Design rules

1. **Never throws.** Every public function returns either `Result<T>` or a
   ready-to-render value. Network failures are first-class data.
2. **Zero runtime deps.** Only types from this package and the host's `fetch`.
3. **Browser ↔ Node ↔ Edge compatible.** No `node:` imports, no
   `performance` assumptions.
4. **EIP-1474 aware.** RPC error codes are passed through; we synthesize
   `"timeout"`, `"offline"`, `"malformed"`, `"unknown"` for non-RPC failures.
