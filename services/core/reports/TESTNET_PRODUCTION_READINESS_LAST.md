# Testnet production readiness (automated)

**UTC:** 2026-04-23T15:06:22.957755+00:00
**Overall:** PASS

Criteria: **validators** height/hash among themselves; **public RPC** tip lag vs validators; **faucet** HTTP; all **chainId** match.

## Checks

| OK | Check | Detail |
|----|-------|--------|
| yes | eth_chainId http://46.250.244.4:8545 | match |
| yes | eth_blockNumber http://46.250.244.4:8545 | height=0 |
| yes | validators_height_consensus | skipped (--skip-validators or no validators) |
| yes | public_block_hash @0x0 | ok |
| yes | public_rpc_tip_lag | skipped (no validators to compare) |
| yes | faucet_http | skipped |

## Manual follow-up

See [docs/TESTNET_PRODUCTION_READINESS.md](../docs/TESTNET_PRODUCTION_READINESS.md) and [TESTNET_OPTIMIZATION_CHECKLIST.md](../docs/TESTNET_OPTIMIZATION_CHECKLIST.md).
