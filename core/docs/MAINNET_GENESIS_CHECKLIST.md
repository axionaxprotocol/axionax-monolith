# Mainnet Genesis Launch Checklist — Q2 2026

Pre-launch checklist for Axionax Mainnet Genesis Block #0.

---

## 1. Genesis Configuration (Ready)

| Item | Status |
|------|--------|
| Creator alias | axionaxius |
| Total supply | 1,000,000,000,000 AXX (1 trillion) |
| Creator allocation | 10% |
| Genesis timestamp | 2026-04-01 00:00:00 UTC |
| Chain ID | 86137 |
| EVM addresses | Valid hex (deterministic from seeds) |

---

## 2. Pre-Launch Steps

### 2.1 Faucet Key (Mainnet)

For mainnet, generate a fresh faucet keypair:

```bash
python scripts/generate-faucet-key.py
```

- Add `FAUCET_PRIVATE_KEY` to `.env` on the faucet server
- Regenerate genesis with the new address:
  ```bash
  python core/tools/create_genesis.py --faucet-address <ADDRESS> --verify
  ```

For testnet, the default deterministic key is used (no extra step).

### 2.2 Regenerate Genesis

```bash
cd axionax-core-universe
python core/tools/create_genesis.py --verify
```

Output: `core/tools/genesis.json`

### 2.3 Verify Genesis

```bash
python core/tools/verify_genesis.py core/tools/genesis.json
```

### 2.4 Distribute to Validators

- Share `genesis.json` with all validators
- Announce genesis hash (SHA-256 of file)
- Validators place at: `~/.axionax/config/genesis.json` (or per deploy path)

### 2.5 Creator / Team Keys

The following addresses receive allocations. Ensure private keys are secured:

| Allocation | Address | Key Management |
|------------|---------|----------------|
| Creator | `0xb9e3968de4ec06c75ecb3c8ca151b446939aec7f` | axionaxius holds key |
| Foundation | `0xa77f117ff23b672cf484b1d05cc48b5e7c03909d` | Multisig recommended |
| Team | `0x6af7d73fdcc0bf711ccada1422774ab1fdff9ae4` | Secure storage |
| Community | `0x776b0130e806cb70003744a4691238052c0b972a` | DAO / multisig |
| Public Sale | `0x58abb3d4e75f232b4177bfd6061972a210f4c9e6` | Sale coordinator |
| Reserve | `0xa61e8cb3ec1e6246a852ca0493f7e8c9c44006cd` | Emergency fund |

**Note:** Addresses are deterministic from seeds. For mainnet, consider generating fresh keypairs and updating genesis before launch.

---

## 3. Validator Setup

| Validator | IP | Address |
|-----------|-----|---------|
| EU-01 | 217.76.61.116 | `0xca0e4e60f8ce825dbb820c72a7e28e28cdae3326` |
| AU-01 | 46.250.244.4 | `0x26e714016c6a91b791bb440ca8db6cd7c4d1e6cb` |

Each receives 25,000,000,000 AXX (2.5% of supply) as bootstrap stake.

---

## 4. Faucet Address (Testnet Default)

```
0x59927b9ed220aa6bf2f0ef46bc6efefaf935109f
```

Deterministic key seed: `axionax_faucet_mainnet_q2_2026`

For testnet, set in `.env`:
```
FAUCET_PRIVATE_KEY=<derived from seed - use generate-faucet-key.py --testnet to get>
```

---

## 5. Launch Day

1. **T-24h:** Final genesis.json distributed, hash announced
2. **T-1h:** All validators confirm genesis hash match
3. **T-0:** Validators start nodes with genesis
4. **T+0:** RPC, Explorer, Faucet go live
5. **T+1h:** Verify block production, RPC responding

---

## 6. Post-Launch

- [ ] Monitor block production
- [ ] Verify RPC endpoints (EU, AU)
- [ ] Test faucet (rate limit, amount)
- [ ] Explorer indexing
- [ ] Announce mainnet live

---

## See Also

- [GENESIS_LAUNCH_README.md](../tools/GENESIS_LAUNCH_README.md) — Launch toolkit
- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) — System architecture
- [RUNBOOK.md](./RUNBOOK.md) — Deploy & incident response
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) — Security audit & hardening

**Version:** 2026-02 · Q2 2026 Mainnet Target
