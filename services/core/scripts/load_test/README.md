# Load Test — TPS & Finality Validation

Scripts to validate protocol targets:

- **TPS:** 45,000+ transactions per second (goal)
- **Finality:** <0.5 s (time from tx inclusion to finality)

## Prerequisites

- Python 3.10+
- `web3` (e.g. `pip install web3`)
- Running Axionax RPC (e.g. `http://217.76.61.116:8545` or local node)

## 1. Block timing & finality (no funded account)

Measures block production rate and block time as a proxy for finality:

```bash
python tps_finality_test.py --rpc http://localhost:8545 --mode block-time --duration 60
```

Output: blocks per second, average block time (s), approximate finality.

## 2. TPS test (requires funded account)

Sends many transactions and measures throughput. Needs a wallet with AXX for gas.

```bash
export AXIONAX_PRIVATE_KEY=0x...   # optional, or use --key file
python tps_finality_test.py --rpc http://localhost:8545 --mode tps --duration 30 --tx-rate 1000
```

Output: sent count, included count, TPS (included txs / elapsed time), block time.

## Targets (from docs)

| Metric   | Target    |
|----------|-----------|
| TPS      | 45,000+   |
| Finality | < 0.5 s   |

Run in CI or before testnet launch to record baseline; fix RPC and node config if below target.
