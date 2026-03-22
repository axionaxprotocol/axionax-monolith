# Testnet production readiness (automated)

**UTC:** 2026-03-21T15:28:52.346729+00:00
**Overall:** FAIL

Criteria: **validators** height/hash among themselves; **public RPC** tip lag vs validators; **faucet** HTTP; all **chainId** match.

## Checks

| OK | Check | Detail |
|----|-------|--------|
| yes | eth_chainId http://217.76.61.116:8545 | match |
| yes | eth_chainId http://46.250.244.4:8545 | match |
| yes | eth_chainId https://rpc.axionax.org | match |
| yes | eth_blockNumber http://217.76.61.116:8545 | height=110504 |
| yes | eth_blockNumber http://46.250.244.4:8545 | height=111458 |
| yes | eth_blockNumber https://rpc.axionax.org | height=110504 |
| no | validators_height_consensus | min=110504 max=111458 diff=954 (max_allowed=25) |
| no | validators_block_hash @0x1afa8 | all match |
| no | public_rpc_tip_lag | public=110504 validator_min=110504 validator_max=111458 lag_behind_max_tip=954 (max_allowed=40) |
| no | full_stack_block_hash | skipped (validators not aligned) |
| yes | faucet_http https://faucet.axionax.org | status=404 (root may 404; verify UI path in browser) |

## Manual follow-up

See [docs/TESTNET_PRODUCTION_READINESS.md](../docs/TESTNET_PRODUCTION_READINESS.md) and [TESTNET_OPTIMIZATION_CHECKLIST.md](../docs/TESTNET_OPTIMIZATION_CHECKLIST.md).
