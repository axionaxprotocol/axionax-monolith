# Parameter sync with axionax-core-universe

Chain IDs, staking, and chain/node parameters in this package are kept in sync with **axionax-core-universe**.

**Source of truth:**  
https://github.com/axionaxprotocol/axionax-core-universe

| Source in core-universe                                                                                                                        | Used in this package                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `core/.env.example` — `CHAIN_ID=86137` (testnet), `86150` (mainnet)                                                                           | `CHAIN_IDS.TESTNET`, `CHAIN_IDS.MAINNET`             |
| `core/DEPLOYMENT_GUIDE.md` — `chain_id = 86137`, `min_validator_stake = "10000000000000000000000"` (10,000 tokens)                          | `STAKING_CONSTANTS.MIN_VALIDATOR_STAKE`              |
| `core/DEPLOYMENT_GUIDE.md` — `[consensus] sample_size = 1000`, `min_confidence = 0.999`, `fraud_window_blocks = 720`                        | `POPC_PARAMS`                                         |
| `core/.env.example` — `RPC_PORT=8545`, `WS_PORT=8546`, `P2P_PORT=30303`, `RATE_LIMIT=100`, `MAX_PEERS=50`, `TX_POOL_SIZE=10000`             | `CHAIN_PARAMS.RPC_PORT/WS_PORT/P2P_PORT/...`         |
| `core/.env.example` — `BLOCK_GAS_LIMIT=30000000`, `CACHE_SIZE=2048`                                                                           | `CHAIN_PARAMS.GAS_LIMIT`, `CHAIN_PARAMS.CACHE_SIZE_MB` |
| `core/DEPLOYMENT_GUIDE.md` — `[blockchain] block_time_secs = 5`, `max_block_size = 1048576`; `[security] min_gas_price = "1000000000"`      | `CHAIN_PARAMS.BLOCK_TIME_SECS`, `MAX_BLOCK_SIZE_BYTES`, `MIN_GAS_PRICE_WEI` |

When updating constants, check the latest values in core-universe and adjust this package so backend and frontend stay aligned.

**Solo maintainer:** use the short workflow and pairing record in [`docs/SOLO_CORE_WEB_SYNC.md`](../../docs/SOLO_CORE_WEB_SYNC.md) and [`docs/CORE_WEB_COMPAT.md`](../../docs/CORE_WEB_COMPAT.md).
