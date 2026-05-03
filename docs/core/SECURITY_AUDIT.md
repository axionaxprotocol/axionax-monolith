# Security Audit — Axionax Core

Security review of genesis, keys, faucet, RPC, and operational practices.

**Version:** 2026-02  
**Scope:** Core (Rust), tools (faucet, genesis), config, and secrets handling.

---

## 1. Executive Summary

| Area            | Status   | Notes |
|-----------------|----------|--------|
| Secrets / keys  | OK       | Env vars, .gitignore, no hardcoded keys in code |
| Genesis         | OK       | Deterministic addresses; mainnet should rotate keys if desired |
| Faucet          | Hardened | Address validation + CORS; rate limit already present |
| RPC             | OK       | Hex validation; signature verification still TODO |
| Blockchain core | Hardened | Genesis hash parsing no longer panics on bad length |
| Ops / runbooks  | OK       | RUNBOOK.md, MAINNET_GENESIS_CHECKLIST |

---

## 2. Secrets & Key Management

### 2.1 No Hardcoded Secrets

- **Status:** OK  
- Private keys and API keys are read from environment (`FAUCET_PRIVATE_KEY`, `DEPLOYER_PRIVATE_KEY`, `JWT_SECRET`, `API_KEY`, etc.).
- `.env.example` and `core/.env.example` contain placeholders only; no real secrets.
- Root `.gitignore` includes `.env`, `.env.local`, `.env.production`, `worker_key.json`, `*.keystore`.

### 2.2 Recommendations

- Never commit `.env`; use `.env.example` as a template.
- Restrict permissions: `chmod 600 .env` on servers.
- For mainnet, consider a secrets manager (e.g. Vault) or at least encrypted backups of creator/validator keys.

---

## 3. Genesis & Addresses

### 3.1 Deterministic Addresses

- Genesis addresses (creator, foundation, team, validators, faucet, etc.) are derived from fixed seeds in `core/core/genesis` and `core/tools/create_genesis.py`.
- Same seeds produce same addresses across Rust and Python (EVM hex, 0x + 40 hex chars).

### 3.2 Mainnet Considerations

- **MAINNET_GENESIS_CHECKLIST.md** recommends generating fresh keypairs for mainnet and regenerating genesis with new addresses.
- Faucet: generate a new key with `scripts/generate-faucet-key.py` (no `--testnet`) and add to genesis via `--faucet-address`.

### 3.3 Blockchain Genesis Parsing

- `blockchain::create_genesis()` uses `genesis::GenesisGenerator::mainnet()`; hash/state_root are parsed from hex.
- Parsing is now defensive: invalid hex or wrong length returns an error instead of panicking (see §6).

---

## 4. Faucet

### 4.1 Rate Limiting

- **Status:** OK  
- Per-IP and per-address cooldown (default 24h); configurable via `COOLDOWN_SECS`.
- Uses `DashMap` for in-memory limiters (no persistent bypass).

### 4.2 Address Validation

- **Status:** Hardened  
- Request body `address` is validated as EVM format: `0x` + 40 hex chars, not the zero address.
- Rejects invalid or malicious strings before building a transaction.

### 4.3 CORS

- **Status:** Hardened  
- Default remains permissive for local/testnet; production should restrict origins (e.g. via `CORS_ORIGINS` env or config) to avoid abuse from arbitrary websites.

### 4.4 Private Key Loading

- `FAUCET_PRIVATE_KEY` required at startup; invalid hex returns a clear error instead of panic where possible.
- Key is kept in process memory only (no logging of key material).

---

## 5. RPC

### 5.1 Input Validation

- `eth_sendRawTransaction`: hex decoded with `hex::decode`; invalid hex returns `InvalidParams`.
- Hash parsing uses length check (64 hex chars) and returns `Result` (no panic).

### 5.2 Signature Verification

- **TODO:** RPC layer does not yet verify transaction signatures (documented in code).
- Mempool/consensus should enforce signature verification before including txs in blocks.

### 5.3 Binding

- Default RPC bind is `0.0.0.0`; ensure firewall rules limit access in production (e.g. only from known IPs or behind a reverse proxy).

---

## 6. Blockchain Core

### 6.1 Genesis Hash Parsing

- **Status:** Hardened  
- `parse_hex_hash` in `blockchain` returns `Result<[u8; 32], _>` and validates length (64 hex chars) before `hex::decode` and `copy_from_slice`.
- Prevents panic if genesis format or upstream data is wrong.

### 6.2 Block / Transaction Validation

- `BlockValidator` and `TransactionValidator` in `blockchain::validation` check block number, parent hash, timestamps, gas, and address format (EVM 0x + 40 hex, no zero address).

---

## 7. Operational Security

### 7.1 Runbooks

- **RUNBOOK.md** covers deploy (validator, RPC, faucet, bootnode) and incident response (chain halt, RPC issues, fork, DoS, faucet).
- **MAINNET_GENESIS_CHECKLIST.md** covers pre-launch steps and key handling.

### 7.2 Dependencies

- Run `cargo audit` in `core/` regularly to check for known Rust vulnerabilities.
- Python/Node deps: use `pip audit` / `npm audit` where applicable.

---

## 8. Checklist (Pre-Mainnet)

- [ ] All secrets in env or secrets manager; no `.env` in repo.
- [ ] Fresh faucet key for mainnet; genesis regenerated with `--faucet-address`.
- [ ] Creator/team/validator keys secured; multisig considered for foundation/community.
- [ ] Faucet CORS restricted to known origins in production.
- [ ] RPC/firewall rules limit exposure (e.g. internal or proxy-only).
- [ ] `cargo audit` (and other audits) run and issues addressed.
- [ ] Runbooks and incident contacts agreed with operators.

---

## 9. References

- [MAINNET_GENESIS_CHECKLIST.md](./MAINNET_GENESIS_CHECKLIST.md)
- [RUNBOOK.md](./RUNBOOK.md)
- [NODE_SPECS.md](./NODE_SPECS.md)
- [core/.env.example](../.env.example)
