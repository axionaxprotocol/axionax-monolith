# Security Scripts — Audit Preparation

Run these before engaging an external audit and in CI.

## Important: run from repo root

All scripts expect to be run from the **repository root** (e.g. `D:\...\axionax-core-universe`), not from `core/`.

## Quick run

- **Linux/macOS:** `./scripts/security/run_audit_tools.sh`
- **Windows (PowerShell):** `.\scripts\security\run_audit_tools.ps1`

## What they do

| Tool | Scope | Command (if run manually from repo root) |
|------|--------|------------------------------------------|
| **cargo audit** | Rust deps (core) | `cd core && cargo audit` |
| **bandit** | Python DeAI | `bandit -r core/deai -ll` (from root) or `bandit -r deai -ll` (from core/) |
| **Secrets check** | No accidental commits | grep / git diff for patterns |

## Prerequisites

- Rust: `cargo install cargo-audit`
- Python: `pip install bandit`

## CI

Add to your CI pipeline:

```yaml
- run: ./scripts/security/run_audit_tools.sh
```

Exit code is non-zero if any check fails (e.g. high/critical CVE or high bandit finding).
