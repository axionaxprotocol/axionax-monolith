# Security audit — remediation status (living document)

**Source report:** [SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md) (2026-03-05, 97 deduplicated findings)  
**This status:** Generated from codebase review **2026-04-05** — not a formal re-audit.

## Legend

| Status | Meaning |
|--------|---------|
| **Remediated** | Current code appears to address the finding; spot-checked in repo. |
| **Partial** | Improved materially; audit recommendation not fully met or deployment-dependent. |
| **Open** | No evidence of fix in this pass, or still structurally true (e.g. HTTP without TLS). |
| **Dev / out of scope** | Applies to mocks, examples, or repos not in `axionax-core-universe`; accept risk for dev only. |

---

## Summary

| Section | Remediated (approx.) | Partial | Open / dev |
|---------|----------------------|---------|------------|
| §1 Rust — consensus/crypto/state/network | 10 | 2 | 15+ |
| §2 Rust — RPC / staking / governance / node | 8 | 4 | 10+ |
| §3 Python DeAI | 0 | 1 | 9+ |
| §4 TypeScript / website | — | — | Dev (other repo) |
| §5 Deploy / Docker / scripts | 1 | 2 | 25+ |

**Important:** Many **Open** items are **config/ops** (TLS, secrets in compose, `:latest` images). They are not “fixed” by Rust tests alone.

---

## §1 — Rust core (consensus, blockchain, crypto, state, network)

| ID | Status | Notes / evidence |
|----|--------|------------------|
| RC-1 | **Remediated** | Legacy `VRF` removed; `core/core/crypto/src/lib.rs` documents use `ECVRF` only. |
| RC-2 | **Remediated** | Same as RC-1 (legacy construction removed). |
| RC-3 | **Remediated** | `AxionaxBehaviour::new` takes real `keypair`; Gossipsub `Signed(keypair)`, Identify uses `keypair.public()` (`behaviour.rs`). |
| RH-1 | **Remediated** | `output_size == 0` guard in `consensus/src/lib.rs`. |
| RH-2 | **Remediated** | `deserialize_proofs`: caps `num_proofs` (10_000), `num_siblings` (64); tests for huge counts (`merkle.rs`). |
| RH-3 | **Partial** | `load_or_generate_keypair` when `key_file` set (`manager.rs`); **ephemeral** if `key_file` is `None`. |
| RH-4 | **Remediated** | `blockchain/src/lib.rs` — no `.expect(` in spot-check; genesis paths use `Result`-style flow. |
| RH-5 | **Remediated** | `add_block` validates `parent_hash` vs previous block; `test_parent_hash_validation`. |
| RH-6 | **Remediated** | Gossipsub messages deserialized and forwarded via `event_tx` (`manager.rs`). |
| RH-7 | **Remediated** | `generate_samples` uses `HashSet` for unique indices (`consensus/src/lib.rs`). |
| RM-1 | **Open** | Reputation `unwrap` — needs file-level check if still present. |
| RM-2 | **Open** | Mempool nonce overflow — verify `mempool.rs` saturating/checked ops. |
| RM-3 | **Open** | Fraud probability truncation — verify `consensus` helpers. |
| RM-4 | **Partial** | Gossipsub mode still config-driven; default permissiveness depends on `NetworkConfig`. |
| RM-5 | **Open** | Tx value bounds — validation exists but confirm all paths. |
| RM-6 | **Open** | Block size estimation constant. |
| RM-7 | **Remediated** | `validation.rs`: `tx.data.len() > 131_072` rejected; min gas price enforced. |
| RM-8 | **Remediated** | `mpsc::channel(1000)` for messages and events (`manager.rs`). |
| RM-9 | **Remediated** | `TransactionMessage.value` is `u128` (`protocol.rs`). |
| RM-10 | **Open** | Reputation decay overflow — verify `reputation.rs`. |
| RL-1 | **Open** | Duplicate tx within block — verify block assembly path. |
| RL-2 | **Open** | Storage corruption fallback — verify `blockchain/storage.rs`. |
| RL-3 | **Open** | Validator registration auth — protocol-level. |
| RL-4 | **Partial** | Health still simplified in places; `http_health` module exists — unify with audit claim. |
| RL-5 | **Partial** | Rate limiting / payload limits in RPC middleware + adversarial tests; binding `0.0.0.0` still operator choice. |
| RI-1 | **Open** | `panic = "abort"` in release profile if still set — intentional tradeoff. |
| RI-2 | **Open** | Modulo bias in sampling — review VRF/sample loop. |
| RI-3 | **Partial** | Production key load uses file I/O; `Keypair::generate_ed25519()` paths — verify RNG source. |

---

## §2 — Rust RPC, staking, governance, node

| ID | Status | Notes / evidence |
|----|--------|------------------|
| SC-1 | **Partial** | **Write** paths: `staking_*` and `gov_*` use `verify_signed_request` + `signature`/`public_key`. Read-only methods still unauthenticated (expected for public RPC). |
| SC-2 | **Remediated** | `gov_vote` loads `actual_weight` from staking (`governance_rpc.rs`). |
| SC-3 | **Remediated** | `gov_createProposal` uses `actual_stake` from staking for proposer. |
| SC-4 | **Remediated** | `gov_finalizeProposal` uses `staking.get_total_staked()` only (no caller-supplied total). |
| SH-1 | **Remediated** | `eth_sendRawTransaction` requires signed tx + `verify_signature()` (`rpc/src/lib.rs`). |
| SH-2 | **Open** | Node still binds per CLI/config; **no built-in TLS** — use reverse proxy for production. |
| SH-3 | **Partial** | `UnifiedRpcConfig.rate_limit`, CORS and request validation exist (`server.rs`, `middleware.rs`); confirm all entrypoints use same stack. |
| SH-4 | **Open** | Unstake semantics — verify `staking` implementation matches economic intent. |
| SH-5 | **Open** | u128→u64 in node paths — grep remaining casts. |
| SH-6 | **Open** | `gov_executeProposal(proposal_id)` — no extra signer; anyone who can reach RPC may execute **if** governance allows — review policy. |
| SM-1 | **Open** | `SystemTime` unwraps — grep workspace. |
| SM-2 | **Open** | `unwrap_or(0)` on state errors — grep `state` consumers. |
| SM-3 | **Open** | Event bus O(n) removal — verify `events`. |
| SM-4 | **Open** | `block_on` in async — grep. |
| SM-5 | **Partial** | Mempool + `apply_transaction` nonce checks; confirm all submission paths. |
| SM-6 | **Open** | Slashing vs voting power — verify `staking`. |
| SM-7 | **Open** | WS subscription limits. |
| SM-8 | **Open** | Secret exposure APIs — verify `crypto::signature`. |
| SL-1 | **Open** | Genesis / docs may still list example IPs — operational hygiene. |
| SL-2 | **Open** | Metrics auth — `metrics_prometheus` often unauthenticated. |
| SL-3 | **Open** | `--unsafe-rpc` behaviour — verify CLI. |
| SL-4 | **Open** | Metric label spoofing. |
| SL-5 | **Partial** | `CorsConfig::dev()` vs production — operator must set production CORS. |
| SL-6 | **Open** | Proposal title/description max length in governance. |
| SL-7 | **Remediated** | Gas price / limit validation in `validation.rs` (min gas price, data size). |
| SI-1 | **Open** | DA erasure coding simplification — design-level. |
| SI-2 | **Open** | ASR “VRF” semantics — design-level. |
| SI-3 | **Open** | RPC example drift — verify examples. |
| SI-4 | **Partial** | Node sync still has placeholder aspects; network **does** emit inbound events now. |
| SI-5 | **Open** | Metrics `Relaxed` ordering. |

---

## §3 — Python DeAI & bridge

| ID | Status | Notes |
|----|--------|-------|
| PC-1 | **Open** | ContractManager key handling — review `core/deai`. |
| PC-2 | **Open** | HTTP without TLS for RPC calls — use TLS at edge. |
| PH-1 | **Partial** | Faucet Rust — review amount limits vs audit (ERC-20 variant). |
| PH-2 | **Dev** | `server.js` faucet variant — dev/mock only. |
| PH-3 | **Dev** | Mock RPC `web3_sha3` — not production. |
| PM-1 | **Dev** | MockSandbox — intentional for tests. |
| PM-2 | **Open** | `rpc_client.py` mutable defaults — grep. |
| PM-3 | **Open** | `get_private_key()` exposure — grep worker code. |
| PM-4 | **Open** | Keystore race — grep. |
| PM-5 | **Open** | Legacy plaintext key deletion. |
| PM-6 | **Open** | Bridge u128→u64 — verify `bridge/`. |
| PM-7 | **Open** | ASR VRF seed width — verify. |
| PM-8 | **Open** | Admin RPC validation — verify. |
| PM-9 | **Open** | Payload logging — verify logging policy. |
| PM-10 | **Dev** | Mock RPC bind — dev only. |
| PL-1 | **Open** | Faucet CSRF — verify HTTP API. |
| PI-1 | **Partial** | Run `pip audit` / dependabot separately. |
| PI-2 | **Open** | `eth_account` usage. |
| PI-3 | **Open** | Docker image digests. |
| PI-4 | **Open** | `sys.path` hacks. |

---

## §4 — TypeScript SDK & website

All findings marked **Dev / other repo** — tracked in `axionax-web-universe`, not verified here.

---

## §5 — Deployment, Docker, Nginx, scripts

| ID | Status | Notes |
|----|--------|-------|
| DC-1 | **Open** | Hardcoded keys in deploy scripts — grep `ops/`, `scripts/`. |
| DC-2 | **Open** | setup scripts passwords. |
| DC-3 | **Open** | Blockscout secrets in examples. |
| DH-1 | **Open** | Example DB credentials in compose/docs. |
| DH-2 | **Open** | Default Grafana password in compose. |
| DH-3 | **Open** | Basic auth defaults. |
| DH-4 | **Open** | CORS `*` in some configs. |
| DH-5 | **Open** | `--unsafe-rpc` in public examples — review `docker-compose`. |
| DH-6 | **Open** | Redis auth in compose. |
| DH-7 | **Open** | Prometheus/node-exporter exposure. |
| DH-8 | **Open** | Hardcoded validator IPs in scripts/docs. |
| DH-9 | **Remediated** | Rust faucet: `FAUCET_PRIVATE_KEY` required (`expect`); no silent `0x01` fallback in current `main.rs`. |
| DM-1 | **Open** | Docker USER non-root — review Dockerfiles. |
| DM-2 | **Open** | Nginx config ordering. |
| DM-3 | **Open** | `server_tokens`. |
| DM-4 | **Open** | Committed `.env.*` secrets — use `.example` + gitignore. |
| DM-5 | **Open** | `0.0.0.0` binds in dev compose. |
| DM-6 | **Open** | Shell injection via `source .env`. |
| DM-7 | **Open** | Grafana password echo. |
| DM-8 | **Open** | Explorer port exposure. |
| DM-9 | **Open** | node-exporter host mount. |
| DM-10 | **Open** | Deterministic faucet key in tooling — use env-only for prod. |
| DL-* / DI-* | **Open** | Base images, headers, resource limits, HEALTHCHECK, compose `version`, alerting — ops checklist. |

---

## Dependency scanning (Rust)

`cargo audit` **2026-04-05** (Windows) reported **2 advisories** (e.g. `quinn-proto`, `rustls-webpki`).  
[docs/AUDIT_REMEDIATION.md](../docs/AUDIT_REMEDIATION.md) may be **stale** vs current lockfile — re-run `cargo update` / `cargo audit` before release.

---

## How to use this file

1. When you fix a finding, update the row to **Remediated** and add PR/commit reference.  
2. For **Open** rows, either schedule work or document accepted risk + owner.  
3. Before **mainnet**, prefer an **external re-audit** or internal sign-off against this matrix.

---

## Related

- [SECURITY_REMEDIATION_PLAN.md](../SECURITY_REMEDIATION_PLAN.md) — phased tasks.  
- [SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md) — original findings.  
- [MAINNET_PRODUCTION_PLAN.md](../docs/MAINNET_PRODUCTION_PLAN.md) — launch gates.
