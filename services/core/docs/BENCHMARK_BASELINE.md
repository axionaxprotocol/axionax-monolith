# Benchmark Baseline (Reproducible)

This document defines a reproducible baseline for testnet performance measurements and avoids unsupported "best in the world" claims.

Related:
- `scripts/load_test/tps_finality_test.py`
- `ops/scripts/rpc_benchmark.py`
- `docs/SMOKE_TEST_PUBLIC_FULL_NODE.md`

---

## 1. Scope

Track baseline metrics with reproducible commands:

- RPC responsiveness (`eth_blockNumber`, p95 latency)
- Block cadence proxy (block-time mode)
- Throughput estimate in controlled TPS mode
- Height parity against public RPC

---

## 2. Test profile (must be recorded each run)

| Field | Example |
|------|---------|
| Date (UTC) | 2026-04-13T08:00:00Z |
| Node role | full / rpc |
| Host spec | 4 vCPU / 8 GB RAM / NVMe |
| Region | EU |
| RPC target | `http://127.0.0.1:8545` |
| Chain ID | 86137 |
| Bootstrap count | 2 |
| Test duration | 300s |
| Git commit | `<sha>` |

---

## 3. Reproducible commands

From repo root.

### 3.1 Block-time / finality proxy

```bash
python3 scripts/load_test/tps_finality_test.py \
  --rpc http://127.0.0.1:8545 \
  --mode block-time \
  --duration 300 \
  --max-block-time-sec 5.0 \
  --json-out reports/benchmark_block_time.json
```

### 3.2 RPC latency/load sampling

```bash
python3 ops/scripts/rpc_benchmark.py \
  --rpc http://127.0.0.1:8545 \
  > reports/benchmark_rpc.txt
```

If your local version exposes other flags, include the exact command used in the report.

### 3.3 Height parity check

```bash
LOCAL=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545 | jq -r '.result')

PUBLIC=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://rpc.axionax.org | jq -r '.result')

echo "local=$LOCAL public=$PUBLIC"
```

### 3.4 Optional TPS mode (funded account required)

```bash
AXIONAX_PRIVATE_KEY=0x... \
python3 scripts/load_test/tps_finality_test.py \
  --rpc http://127.0.0.1:8545 \
  --mode tps \
  --duration 120 \
  --tx-rate 100 \
  --json-out reports/benchmark_tps.json
```

---

## 4. Reporting template

Create:

```text
reports/BENCHMARK_BASELINE_YYYYMMDD.md
```

Include:

1. Test profile table (section 2)
2. Command list used (exact copy-paste)
3. Results table:

| Metric | Value | Target | Pass/Fail |
|--------|-------|--------|----------|
| avg block time | ... | <= 5.0s | ... |
| blocks/sec | ... | reference | ... |
| rpc p95 latency | ... | team SLO | ... |
| local/public height delta | ... | trending down | ... |
| tps sent | ... | reference | ... |

4. Raw artifacts paths (`*.json`, `*.txt`)
5. Notes (network instability, validator maintenance windows, etc.)

---

## 5. Claim policy

Allowed:
- "Measured under this profile, this commit, this hardware"
- "Improved vs previous internal baseline by X%"

Not allowed (without external independent validation):
- "Fastest in the world"
- "Highest TPS globally"

---

## 6. Minimum publication bar

Before publishing performance claims:

- At least 3 runs on different days
- At least 2 host regions
- Raw artifacts committed under `reports/` or attached in release notes
- Explicitly state test limits and assumptions
