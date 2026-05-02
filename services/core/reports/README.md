# P2P stability evidence

This directory holds **time-stamped** output from
`services/core/scripts/p2p_stability_monitor.py`.

Each run creates a folder:

`p2p-stability-<YYYYMMDD-HHMMSS>/`

Expected artifacts (DoD):

| File | Purpose |
|------|---------|
| `sync-height.csv` | Timestamped heights / deltas per poll |
| `peer-events.log` | Connect, disconnect, stall, reorg-like transitions |
| `network-quality.txt` | Placeholder or pasted `mtr` / latency summary between validators |
| `incident-notes.md` | Human notes on incidents and mitigations |

## Quick snapshot (5 samples)

From repo root:

```bash
python services/core/scripts/p2p_stability_monitor.py --snapshot --output-root services/core/reports
```

## 24-hour production run

From repo root (same flags as the playbook):

```bash
python services/core/scripts/p2p_stability_monitor.py --duration-hours 24 --interval-seconds 30 --output-root services/core/reports
```

Wrappers (set working directory to repo root automatically):

- **Linux / macOS / WSL:** `bash services/core/scripts/run-p2p-stability-24h.sh`
- **Windows PowerShell:** `pwsh services/core/scripts/run-p2p-stability-24h.ps1`

Optional Discord alerts: pass `--webhook <url>` or set env **`AXIONAX_P2P_WEBHOOK`** before running a wrapper.

`network-quality.txt` uses **ping** on all platforms; **tracert** on Windows and **traceroute** / **tracepath** on Unix when installed.
