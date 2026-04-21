# Testnet (canonical layout)

Legacy **Testnet in a Box** bundles (v1.5 / v1.6) were removed from this repository.

Use the public testnet stack instead:

- **Docker Compose & scripts:** [`ops/deploy/environments/testnet/public/`](../../../ops/deploy/environments/testnet/public/)
- **Redeploy script:** `ops/deploy/environments/testnet/public/scripts/redeploy_testnet.sh`
- **Root deploy Dockerfile:** `ops/deploy/Dockerfile` (build context: `core/`)

Chain ID **86137** (`0x15079`).

**Public full node (any operator):** [docs/RUN_PUBLIC_FULL_NODE.md](../../../docs/RUN_PUBLIC_FULL_NODE.md)
