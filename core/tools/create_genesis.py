#!/usr/bin/env python3
"""
Axionax Genesis Block #0 Generator

Total Supply : 1,000,000,000,000 AXX  (1 trillion, 18 decimals)
Creator alias: axionaxius

Usage:
    python3 create_genesis.py                 # generate genesis.json
    python3 create_genesis.py --verify        # generate + verify
    python3 create_genesis.py --out /tmp/g.json
"""

import hashlib
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

CHAIN_ID_TESTNET = 86137
CHAIN_ID_MAINNET = 86150
CHAIN_ID = CHAIN_ID_TESTNET
CHAIN_NAME = "Axionax Testnet"
SYMBOL = "AXX"
DECIMALS = 18
ONE_AXX = 10 ** DECIMALS
TOTAL_SUPPLY = 1_000_000_000_000  # 1 trillion AXX
TOTAL_SUPPLY_WEI = TOTAL_SUPPLY * ONE_AXX

# Q2 2026 Mainnet Genesis — 2026-04-01 00:00:00 UTC
GENESIS_TIMESTAMP = 1_775_001_600

CREATOR_ALIAS = "axionaxius"
EXTRA_DATA_TEXT = f"{CREATOR_ALIAS} - Genesis Block #0 - Axionax Core Universe"

# Deterministic EVM addresses (sha256 seed, 40 hex chars). Reproducible, EVM-compatible.
def _evm_addr(seed: str) -> str:
    h = hashlib.sha256(seed.encode()).hexdigest()
    return "0x" + h[:40]


def _faucet_address() -> str:
    """Faucet address from deterministic key (testnet). For mainnet use --faucet-address."""
    try:
        from eth_account import Account
        pk = hashlib.sha256(b"axionax_faucet_mainnet_q2_2026").digest()
        return Account.from_key(pk).address
    except ImportError:
        return _evm_addr("axionax_genesis_faucet")


def _get_allocations(faucet_address: str | None = None) -> dict:
    """Build allocations dict with faucet address resolved."""
    allocations = {
    "creator": {
        "address": _evm_addr("axionaxius_genesis_creator"),
        "label": f"Creator ({CREATOR_ALIAS})",
        "percent": 10,
    },
    "ecosystem_rewards": {
        "address": _evm_addr("axionax_genesis_ecosystem"),
        "label": "Ecosystem & Rewards Pool",
        "percent": 30,
        "note": "Validator rewards, worker incentives, staking emissions",
    },
    "foundation": {
        "address": _evm_addr("axionax_genesis_foundation"),
        "label": "Foundation / Treasury",
        "percent": 20,
        "vesting": {"enabled": True, "cliff": "1 year", "schedule": "4 years linear unlock"},
    },
    "community": {
        "address": _evm_addr("axionax_genesis_community"),
        "label": "Community",
        "percent": 15,
        "note": "Airdrops, incentives, DAO governance",
        "vesting": {"enabled": True, "schedule": "2 years linear unlock"},
    },
    "team": {
        "address": _evm_addr("axionax_genesis_team"),
        "label": "Team & Advisors",
        "percent": 10,
        "vesting": {"enabled": True, "cliff": "1 year", "schedule": "4 years linear vest"},
    },
    "validators": {
        "percent": 5,
        "split": [
            {
                "address": _evm_addr("axionax_genesis_validator_eu_217_76_61_116"),
                "label": "Validator-EU-01",
                "region": "EU",
                "ip": "217.76.61.116",
            },
            {
                "address": _evm_addr("axionax_genesis_validator_au_46_250_244_4"),
                "label": "Validator-AU-01",
                "region": "AU",
                "ip": "46.250.244.4",
            },
            {
                "address": _evm_addr("axionax_genesis_validator_us_mainnet"),
                "label": "Validator-US-01",
                "region": "US",
                "ip": "0.0.0.0",
            },
        ],
    },
    "public_sale": {
        "address": _evm_addr("axionax_genesis_public_sale"),
        "label": "Public Sale",
        "percent": 5,
    },
    "faucet": {
        "address": faucet_address or _faucet_address(),
        "label": "Faucet (Testnet & Mainnet)",
        "percent": 3,
    },
    "reserve": {
        "address": _evm_addr("axionax_genesis_reserve"),
        "label": "Strategic Reserve",
        "percent": 2,
        "note": "Emergency liquidity, strategic partnerships",
    },
}
    return allocations


def _wei(axx_amount: int) -> str:
    return str(axx_amount * ONE_AXX)


def _to_hex_str(data: str) -> str:
    return "0x" + data.encode("utf-8").hex()


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_alloc(allocations: dict):
    alloc = {}
    running_total = 0

    for key, spec in allocations.items():
        pct = spec["percent"]
        amount_axx = TOTAL_SUPPLY * pct // 100
        amount_wei = amount_axx * ONE_AXX

        if key == "validators":
            n = len(spec["split"])
            per_validator = amount_axx // n
            remainder = amount_axx - per_validator * n
            for i, v in enumerate(spec["split"]):
                val_amount = per_validator + (remainder if i == 0 else 0)
                entry = {"label": v["label"], "balance": _wei(val_amount)}
                alloc[v["address"]] = entry
                running_total += val_amount * ONE_AXX
        else:
            entry = {"label": spec["label"], "percent": f"{pct}%", "balance": str(amount_wei)}
            if "vesting" in spec:
                entry["vesting"] = spec["vesting"]
            if "note" in spec:
                entry["note"] = spec["note"]
            alloc[spec["address"]] = entry
            running_total += amount_wei

    assert running_total == TOTAL_SUPPLY_WEI, (
        f"Allocation mismatch: {running_total} != {TOTAL_SUPPLY_WEI}"
    )
    return alloc


def build_validators(allocations: dict):
    spec = allocations["validators"]
    n = len(spec["split"])
    total_axx = TOTAL_SUPPLY * spec["percent"] // 100
    per_validator = total_axx // n
    remainder = total_axx - per_validator * n
    validators = []
    for i, v in enumerate(spec["split"]):
        val_amount = per_validator + (remainder if i == 0 else 0)
        validators.append({
            "address": v["address"],
            "name": v["label"],
            "region": v["region"],
            "ip": v["ip"],
            "stake": _wei(val_amount),
            "commission": 0.1,
            "enode": f"enode://GENERATED@{v['ip']}:30303",
            "active": True,
        })
    return validators


def build_tokenomics(allocations: dict):
    items = {}
    for key, spec in allocations.items():
        if key == "validators":
            items[key] = {"percent": spec["percent"], "amount": str(TOTAL_SUPPLY * spec["percent"] // 100), "label": "Validator Bootstrap"}
        else:
            items[key] = {"percent": spec["percent"], "amount": str(TOTAL_SUPPLY * spec["percent"] // 100), "label": spec["label"]}
    return {
        "name": "Axionax",
        "symbol": SYMBOL,
        "decimals": DECIMALS,
        "totalSupply": str(TOTAL_SUPPLY),
        "totalSupplyWei": str(TOTAL_SUPPLY_WEI),
        "allocation": items,
    }


def build_genesis(faucet_address: str | None = None) -> dict:
    allocations = _get_allocations(faucet_address)
    return {
        "config": {
            "chainId": CHAIN_ID,
            "chainName": CHAIN_NAME,
            "homesteadBlock": 0,
            "eip150Block": 0,
            "eip155Block": 0,
            "eip158Block": 0,
            "byzantiumBlock": 0,
            "constantinopleBlock": 0,
            "petersburgBlock": 0,
            "istanbulBlock": 0,
            "berlinBlock": 0,
            "londonBlock": 0,
            "axionax": {
                "consensus": "popc",
                "blockTime": 2,
                "epochLength": 100,
                "minValidatorStake": _wei(10_000),
                "maxValidators": 100,
                "slashingRate": 0.1,
                "falsPassPenalty": 500,
                "totalSupply": str(TOTAL_SUPPLY_WEI),
                "decimals": DECIMALS,
                "symbol": SYMBOL,
            },
        },
        "nonce": "0x0",
        "timestamp": hex(GENESIS_TIMESTAMP),
        "extraData": _to_hex_str(EXTRA_DATA_TEXT),
        "extraDataDecoded": EXTRA_DATA_TEXT,
        "gasLimit": "0x1c9c380",
        "difficulty": "0x1",
        "mixHash": "0x" + "0" * 64,
        "coinbase": "0x" + "0" * 40,
        "creator": {
            "alias": CREATOR_ALIAS,
            "note": f"Genesis created by {CREATOR_ALIAS} — founder of Axionax Protocol",
        },
        "tokenomics": build_tokenomics(allocations),
        "validators": build_validators(allocations),
        "alloc": build_alloc(allocations),
    }


def print_summary(genesis: dict, allocations: dict):
    ts = int(genesis["timestamp"], 16)
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)

    print("=" * 64)
    print("  AXIONAX — Genesis Block #0 (Q2 2026 Mainnet)")
    print("=" * 64)
    print(f"  Creator     : {CREATOR_ALIAS}")
    print(f"  Chain ID    : {CHAIN_ID}")
    print(f"  Chain Name  : {CHAIN_NAME}")
    print(f"  Symbol      : {SYMBOL}")
    print(f"  Decimals    : {DECIMALS}")
    print(f"  Total Supply: {TOTAL_SUPPLY:,} {SYMBOL}")
    print(f"  Timestamp   : {dt.isoformat()}")
    print()
    print("  Token Allocation:")
    print("  " + "-" * 56)
    for key, spec in allocations.items():
        if key == "validators":
            label, pct = "Validator Bootstrap", spec["percent"]
        else:
            label, pct = spec.get("label", key.replace("_", " ").title()), spec["percent"]
        amount = TOTAL_SUPPLY * pct // 100
        print(f"    {label:<32} {pct:>3}%  {amount:>18,} {SYMBOL}")
    print("  " + "-" * 56)
    print(f"    {'TOTAL':<32} 100%  {TOTAL_SUPPLY:>18,} {SYMBOL}")
    print()
    print(f"  Validators: {len(genesis['validators'])}")
    for v in genesis["validators"]:
        print(f"    - {v['name']} ({v['region']}) @ {v['ip']}")
    print()


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Axionax Genesis Block #0 Generator (Q2 2026 Mainnet)")
    parser.add_argument("--out", default=None, help="Output path (default: genesis.json next to this script)")
    parser.add_argument("--verify", action="store_true", help="Run verification after generation")
    parser.add_argument("--faucet-address", default=None, help="Faucet EVM address (default: deterministic from seed)")
    parser.add_argument("--chain-id", type=int, default=None, help="Chain ID (86137=testnet, 86150=mainnet)")
    args = parser.parse_args()

    global CHAIN_ID, CHAIN_NAME
    if args.chain_id is not None:
        CHAIN_ID = args.chain_id
    if CHAIN_ID == CHAIN_ID_MAINNET:
        CHAIN_NAME = "Axionax Mainnet"
    elif CHAIN_ID == CHAIN_ID_TESTNET:
        CHAIN_NAME = "Axionax Testnet"
    else:
        CHAIN_NAME = f"Axionax Dev ({CHAIN_ID})"

    allocations = _get_allocations(args.faucet_address)
    genesis = build_genesis(args.faucet_address)
    print_summary(genesis, allocations)

    out_path = Path(args.out) if args.out else Path(__file__).parent / "genesis.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(genesis, f, indent=2)

    file_hash = _sha256(out_path.read_bytes())
    print(f"  Saved to    : {out_path}")
    print(f"  SHA-256     : 0x{file_hash}")
    print("=" * 64)

    if args.verify:
        print()
        alloc = genesis["alloc"]
        total = sum(int(v["balance"]) for v in alloc.values())
        ok = total == TOTAL_SUPPLY_WEI
        print(f"  Verify alloc sum = total supply: {'PASS' if ok else 'FAIL'}")
        if not ok:
            print(f"    alloc sum  = {total}")
            print(f"    expected   = {TOTAL_SUPPLY_WEI}")
            sys.exit(1)
        print(f"  Verify chain ID = {CHAIN_ID}: {'PASS' if genesis['config']['chainId'] == CHAIN_ID else 'FAIL'}")
        print(f"  Verify creator  = {CREATOR_ALIAS}: {'PASS' if genesis['creator']['alias'] == CREATOR_ALIAS else 'FAIL'}")
        print()
        print("  All checks passed.")
        print("=" * 64)


if __name__ == "__main__":
    main()
