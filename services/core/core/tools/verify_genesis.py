#!/usr/bin/env python3
"""
Axionax Genesis Verification Tool

Validates genesis.json integrity and prints a human-readable summary.

Usage:
    python3 verify_genesis.py                          # verify default genesis.json
    python3 verify_genesis.py /path/to/genesis.json    # verify specific file
    python3 verify_genesis.py genesis.json 0xabcd...   # verify + check expected hash
"""

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

EXPECTED_CHAIN_ID = 86137
EXPECTED_CONSENSUS = "popc"
EXPECTED_CREATOR = "axionaxius"
EXPECTED_TOTAL_SUPPLY = 1_000_000_000_000  # 1 trillion AXX
EXPECTED_TOTAL_SUPPLY_WEI = EXPECTED_TOTAL_SUPPLY * (10 ** 18)
EXPECTED_DECIMALS = 18


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(filepath: str, expected_hash: str = None) -> bool:
    path = Path(filepath)
    if not path.is_file():
        print(f"  File not found: {filepath}")
        return False

    file_hash = sha256_file(path)
    print("=" * 64)
    print("  Axionax Genesis Verification")
    print("=" * 64)
    print(f"  File    : {path}")
    print(f"  SHA-256 : 0x{file_hash}")

    if expected_hash:
        expected = expected_hash.replace("0x", "").lower()
        if file_hash == expected:
            print("  Hash    : MATCH")
        else:
            print(f"  Hash    : MISMATCH")
            print(f"  Expected: 0x{expected}")
            return False

    try:
        genesis = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        print(f"  Invalid JSON: {e}")
        return False

    config = genesis.get("config", {})
    axionax = config.get("axionax", {})
    alloc = genesis.get("alloc", {})
    validators = genesis.get("validators", [])
    creator = genesis.get("creator", {})
    tokenomics = genesis.get("tokenomics", {})

    print()
    print(f"  Chain ID    : {config.get('chainId')}")
    print(f"  Chain Name  : {config.get('chainName', 'N/A')}")
    print(f"  Consensus   : {axionax.get('consensus')}")
    print(f"  Symbol      : {axionax.get('symbol', 'N/A')}")
    print(f"  Creator     : {creator.get('alias', 'N/A')}")

    ts_hex = genesis.get("timestamp", "0x0")
    try:
        ts = int(ts_hex, 16)
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        print(f"  Timestamp   : {dt.isoformat()} (Unix {ts})")
    except Exception:
        print(f"  Timestamp   : {ts_hex}")

    print()
    print(f"  Validators  : {len(validators)}")
    for v in validators:
        print(f"    - {v.get('name', 'Unnamed')} @ {v.get('ip', 'N/A')}")
        stake_wei = int(v.get("stake", "0"))
        print(f"      Stake: {stake_wei / 10**18:,.0f} AXX")

    print()
    print(f"  Allocations : {len(alloc)} addresses")
    total_wei = 0
    for addr, data in alloc.items():
        bal = int(data.get("balance", "0"))
        total_wei += bal
        label = data.get("label", addr[:20])
        pct = data.get("percent", "")
        print(f"    {label:<36} {pct:>5}  {bal / 10**18:>22,.0f} AXX")

    print(f"    {'':->64}")
    print(f"    {'TOTAL':<36}       {total_wei / 10**18:>22,.0f} AXX")

    issues = []
    warnings = []

    if config.get("chainId") != EXPECTED_CHAIN_ID:
        issues.append(f"Chain ID is {config.get('chainId')}, expected {EXPECTED_CHAIN_ID}")

    if axionax.get("consensus") != EXPECTED_CONSENSUS:
        issues.append(f"Consensus is '{axionax.get('consensus')}', expected '{EXPECTED_CONSENSUS}'")

    if creator.get("alias") != EXPECTED_CREATOR:
        issues.append(f"Creator is '{creator.get('alias')}', expected '{EXPECTED_CREATOR}'")

    if total_wei != EXPECTED_TOTAL_SUPPLY_WEI:
        issues.append(
            f"Alloc total {total_wei} != expected {EXPECTED_TOTAL_SUPPLY_WEI} "
            f"(diff: {total_wei - EXPECTED_TOTAL_SUPPLY_WEI})"
        )

    if len(validators) == 0:
        issues.append("No validators")
    elif len(validators) < 3:
        warnings.append(f"Only {len(validators)} validators (3+ recommended)")

    addrs = [v.get("address") for v in validators]
    if len(addrs) != len(set(addrs)):
        issues.append("Duplicate validator addresses")

    print()
    if issues:
        print("  ISSUES:")
        for i in issues:
            print(f"    [FAIL] {i}")
    if warnings:
        print("  WARNINGS:")
        for w in warnings:
            print(f"    [WARN] {w}")
    if not issues and not warnings:
        print("  All checks passed.")

    print()
    result = "VALID" if not issues else "INVALID"
    print(f"  Result: {result}")
    print("=" * 64)
    return not issues


def main():
    filepath = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent / "genesis.json")
    expected_hash = sys.argv[2] if len(sys.argv) > 2 else None

    ok = verify(filepath, expected_hash)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
