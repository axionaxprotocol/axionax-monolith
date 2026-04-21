# Testnet production readiness (automated)

**UTC:** 2026-04-21T15:36:16.085786+00:00
**Overall:** PASS

Criteria: **validators** height/hash among themselves; **public RPC** tip lag vs validators; **faucet** HTTP; all **chainId** match.

## Checks

| OK | Check | Detail |
|----|-------|--------|
| yes | eth_chainId http://127.0.0.1:8545 | match |
| yes | eth_blockNumber http://127.0.0.1:8545 | height=1018 |
| yes | validators_height_consensus | skipped (--skip-validators or no validators) |
| yes | public_block_hash @0x3fa | ok |
| yes | public_rpc_tip_lag | skipped (no validators to compare) |
| yes | faucet_http | skipped |

## Manual follow-up

See [docs/TESTNET_PRODUCTION_READINESS.md](../docs/TESTNET_PRODUCTION_READINESS.md) and [TESTNET_OPTIMIZATION_CHECKLIST.md](../docs/TESTNET_OPTIMIZATION_CHECKLIST.md).
