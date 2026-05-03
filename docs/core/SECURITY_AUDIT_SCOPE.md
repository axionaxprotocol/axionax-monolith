# Security Audit Scope — Axionax Protocol

**Version:** 1.0  
**Status:** Preparation for external audit  
**Last updated:** March 2026

---

## 1. Purpose

This document defines the scope and deliverables for **external security audits** (third-party) before public testnet/mainnet launch. Use it when engaging audit firms (e.g. Trail of Bits, OpenZeppelin, Halborn).

---

## 2. In-Scope Components

| Component | Repo / Path | Focus |
|-----------|-------------|--------|
| **Core consensus (PoPC)** | `core/core/consensus` | Probabilistic checking, challenge generation, fraud proofs |
| **Core blockchain** | `core/core/blockchain` | Block validation, tx pool, reorg safety |
| **Core crypto** | `core/core/crypto` | Ed25519, hashing, key handling |
| **RPC layer** | `core/core/rpc` | Input validation, rate limits, CORS, injection |
| **Staking** | `core/core/staking` | Stake/delegate/slash, reward distribution |
| **Governance** | `core/core/governance` | Proposals, voting, execution |
| **Network (P2P)** | `core/core/network` | libp2p, peer validation, DoS |
| **DeAI Worker** | `core/deai/` | Sandbox escape, contract calls, wallet handling |
| **Rust–Python bridge** | `core/bridge/rust-python` | FFI safety, data validation |
| **Faucet** | `core/tools/faucet`, `ops/deploy` | Rate limits, key handling, drain attacks |
| **Smart contracts** | JobMarketplace ABI / future Solidity/WASM | Reentrancy, access control, arithmetic |

---

## 3. Out of Scope (for initial audit)

- Web frontend (axionax-web-universe) — separate audit
- Third-party dependencies (libp2p, RocksDB, etc.) — rely on upstream security
- Operational security (key storage on production servers) — infra review

---

## 4. Deliverables Expected from Auditor

1. **Report** (PDF): Executive summary, findings (Critical/High/Medium/Low/Info), recommendations, remediation status.
2. **Fix verification**: Re-review of critical/high fixes before testnet launch.
3. **Consensus & crypto**: Explicit sign-off on PoPC design and key/signature usage.

---

## 5. How to Run Local Security Tooling

Before engaging an external audit, run automated checks locally:

```bash
# From repo root
./scripts/security/run_audit_tools.sh   # Linux/macOS
# Or Windows:
# .\scripts\security\run_audit_tools.ps1
```

- **Rust:** `cargo audit` (known CVEs in dependencies)  
- **Python (DeAI):** `bandit` (static security linter)  
- **Secrets:** no hardcoded secrets in repo (pre-commit or CI check)

See [scripts/security/README.md](../scripts/security/README.md) for details.

---

## 6. References

- [SECURITY_AUDIT](../core/SECURITY_AUDIT.md) — existing security notes (if present)
- [PRE_TESTNET_REPORT](../tools/devtools/docs/PRE_TESTNET_REPORT.md) — testnet readiness
- [CONTRIBUTING.md](../CONTRIBUTING.md) — security reporting (e.g. private disclosure)

---

*Do not launch public testnet until at least one external audit is completed and critical/high findings are remediated.*
