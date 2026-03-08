# Testnet Readiness

**Main documentation is in [README.md](README.md)** — see "Current Network (Testnet)".

- **Genesis:** Complete (chain_id 86137, Rust + Python genesis, validators, allocations). First run of the node seeds balance from genesis automatically.
- **Balance & Faucet:** `eth_getBalance` / `eth_getTransactionCount` work against real state; `send_raw_transaction` applies tx immediately → web UI can show balance and receive airdrop from faucet. Details: [docs/WALLET_AND_KEYS_READINESS.md](docs/WALLET_AND_KEYS_READINESS.md) § Balance & Faucet.

## Launch & Operations

| Doc | Description |
|-----|-------------|
| [docs/GENESIS_PUBLIC_TESTNET_PLAN.md](docs/GENESIS_PUBLIC_TESTNET_PLAN.md) | Testnet launch plan + allocation of 3 VPS |
| [docs/ADD_NETWORK_AND_TOKEN.md](docs/ADD_NETWORK_AND_TOKEN.md) | Add Axionax network and AXX token in MetaMask / receive from Faucet |
| [docs/CONNECTIVITY_OVERVIEW.md](docs/CONNECTIVITY_OVERVIEW.md) | Connectivity: Local node, Validator, Frontend |
| [docs/GITHUB_READINESS.md](docs/GITHUB_READINESS.md) | GitHub repository readiness |
| [ops/deploy/scripts/verify-launch-ready.sh](ops/deploy/scripts/verify-launch-ready.sh) | Pre-launch verification script (Genesis, DNS, RPC, Faucet, docs) |
