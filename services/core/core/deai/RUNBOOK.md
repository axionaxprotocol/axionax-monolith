# Hello DeAI - Runbook

> End-to-end DeAI workload demo: submit -> cloud worker execute -> result hash -> evidence package.

## Architecture (Decentralized Flow)

```
local submitter         cloud worker (VPS)          evidence
+----------------+     +----------------------+      +----------------+
| deai_submit.py | --> | deai_monitor.py     | ---> | run.json       |
| (localhost)     |     | polls queue/*.json   |      | results.csv    |
+----------------+     | executes in sandbox |      | details.log    |
                       +----------------------+      | incident-notes |
                                              |      +----------------+
                                              v
                                     result hash + worker proof
```

## Decentralized Quick Start

### Step 1: On local machine (submitter)
```bash
# Set private key (required for on-chain identity)
export WORKER_PRIVATE_KEY="0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Submit jobs to queue (simulates blockchain submission)
python services/core/core/deai/deai_submit.py \
  --queue-dir services/core/reports/deai-queue \
  --jobs 3 \
  --no-wait
```

### Step 2: Transfer queue to cloud VPS
```bash
# Copy job files to cloud worker
scp services/core/reports/deai-queue/job-*.json \
  root@217.216.109.5:/root/axionax-core-universe/services/core/reports/deai-queue/
```

### Step 3: On cloud VPS (worker monitor)
```bash
cd /root/axionax-core-universe

# Run worker monitor (polls queue, executes jobs, writes results)
python services/core/core/deai/deai_monitor.py \
  --queue-dir services/core/reports/deai-queue \
  --once
```

### Step 4: Transfer results back
```bash
# Copy result files back to local
scp root@217.216.109.5:/root/axionax-core-universe/services/core/reports/deai-queue/result-*.json \
  services/core/reports/deai-queue/
```

### Step 5: Verify hashes (decentralized proof)
```bash
python -c "
import json, hashlib, os
q = 'services/core/reports/deai-queue'
for f in os.listdir(q):
    if f.startswith('result-') and f.endswith('.json'):
        r = json.load(open(os.path.join(q, f), encoding='utf-8'))
        out = r.get('result', {}).get('output', '') or ''
        h = hashlib.sha256(out.encode()).hexdigest()
        match = h == (r.get('result_hash') or '')
        print(f'{f}: output_hash={h[:16]}..  match={match}')
"
```

## Files

| File | Purpose |
|---|---|
| `deai_submit.py` | Local submitter - writes job*.json to queue |
| `deai_monitor.py` | Cloud worker - polls queue, executes in sandbox, writes result*.json |
| `hello_deai.py` | Legacy single-machine demo (register + execute + hash) |
| `RUNBOOK.md` | This runbook |
| `wallet_manager.py` | Patched (ASCII-only, no emoji crash) |

## Evidence Package Format

### `results.csv`
CSV columns: `job_id, desc, status, output_hash, exec_time_ms, retries, error`

### `details.log`
Per-job execution log with SHA256 hashes, outputs, stack traces.

### `incident-notes.md`
Auto-populated with events + manual analysis template.

## Job Catalog

| Job ID | Description | Expected |
|---|---|---|
| `deai-001` | sum 0..999 | SUCCESS, hash computed |
| `deai-002` | model inference payload | SUCCESS, hash computed |
| `deai-003` | training complete | SUCCESS, hash computed |

## Retry / Failure Semantics

1. Sandbox execution raises -> caught, retried up to `--max-retries` with exponential backoff
2. Timeout (`--timeout`) -> job marked `timeout`, no retry
3. All retries exhausted -> `details.log` records full traceback

## Sandbox Modes

| Mode | Security |
|---|---|
| DockerSandbox | Full isolation (cap-drop, no-network, readonly rootfs) |
| MockSandbox | NO isolation - demo only (when Docker unavailable) |

**Important:** `MockSandbox` returns a fixed `[MOCK] Execution simulated` output.  
To get real execution traces, run with Docker available. The full execution path  
(`execute_python_script` -> `execute` -> container lifecycle) is exercised identically.

## CLI Reference

### deai_submit.py
| Flag | Default | Purpose |
|---|---|---|
| `--queue-dir` | `services/core/reports/deai-queue` | Queue directory (shared with worker) |
| `--jobs` | `3` | How many sample jobs to submit |
| `--timeout` | `300` | Max wait per job result (seconds) |
| `--no-wait` | false | Submit only, do not wait for results |

### deai_monitor.py
| Flag | Default | Purpose |
|---|---|---|
| `--queue-dir` | `services/core/reports/deai-queue` | Queue directory |
| `--poll-ms` | `5000` | Poll interval (milliseconds) |
| `--max-retries` | `2` | Max retries per job |
| `--once` | false | Process pending jobs once and exit |

## Troubleshooting

### "Docker unavailable"
Install Docker Desktop, or continue with MockSandbox (demo mode).

### "Web3 module not found"
```bash
pip install web3
```

### "eth-account module not found"
```bash
pip install eth-account
```

### "UnicodeEncodeError" on Windows
The codebase has been patched to use ASCII-only print/debug strings.  
If emoji re-appear after merge, replace with ASCII equivalents.

---

_Last updated: 2026-05-02_  
_Evidence from: deai_submit.py + deai_monitor.py decentralized flow_
