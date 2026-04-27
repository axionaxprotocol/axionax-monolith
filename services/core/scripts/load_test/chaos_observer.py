#!/usr/bin/env python3
"""
Axionax Chaos Engineering — Observer Script (runs from local Windows)

This script monitors the testnet while the operator manually stops/starts
a validator on one of the VPS nodes. It does NOT require SSH access.

Usage:
  python chaos_observer.py --monitor-rpc http://217.76.61.116:8545 --duration 120

The operator should:
  1. Start this script
  2. SSH into a VPS and run: docker stop <validator-container>
  3. Wait for the script to track block production
  4. Run: docker start <validator-container>
  5. Let the script finish and check the report
"""

import argparse
import json
import os
import time
from datetime import datetime

try:
    from web3 import Web3
except ImportError:
    print("Install web3: pip install web3")
    raise SystemExit(1)


def get_block(w3: Web3) -> int:
    try:
        return w3.eth.block_number
    except Exception:
        return -1


def get_peers(w3: Web3) -> int:
    try:
        return w3.net.peer_count
    except Exception:
        return -1


def fmt(ts: float) -> str:
    return datetime.fromtimestamp(ts).strftime("%H:%M:%S")


def run_chaos_observer(
    rpc_urls: list[str],
    duration_sec: int,
    poll_interval: float = 2.0,
) -> dict:
    """Monitor multiple RPCs and track block production over time."""
    providers = {}
    for url in rpc_urls:
        w3 = Web3(Web3.HTTPProvider(url, request_kwargs={"timeout": 5}))
        label = url.split("//")[1].split(":")[0] if "//" in url else url
        providers[label] = w3

    print(f"\n{'='*70}")
    print(f"  🔥 AXIONAX CHAOS OBSERVER")
    print(f"  Monitoring {len(providers)} RPC endpoint(s) for {duration_sec}s")
    print(f"  Poll interval: {poll_interval}s")
    print(f"{'='*70}\n")

    # Snapshot initial state
    initial = {}
    for label, w3 in providers.items():
        block = get_block(w3)
        peers = get_peers(w3)
        initial[label] = {"block": block, "peers": peers}
        print(f"  [{label}] Initial block={block}  peers={peers}")

    print(f"\n{'─'*70}")
    print(f"  ⏱  Monitoring started at {fmt(time.time())}")
    print(f"  📋 Now kill a validator on one VPS: docker stop <container>")
    print(f"{'─'*70}\n")

    # Track blocks over time
    history: dict[str, list[dict]] = {label: [] for label in providers}
    stall_counts:    dict[str, int] = {label: 0 for label in providers}
    max_stall:       dict[str, int] = {label: 0 for label in providers}
    start = time.time()

    while (time.time() - start) < duration_sec:
        time.sleep(poll_interval)
        elapsed = time.time() - start
        line_parts = [f"  [{elapsed:6.1f}s]"]

        for label, w3 in providers.items():
            block = get_block(w3)
            prev_block = history[label][-1]["block"] if history[label] else initial[label]["block"]

            if block < 0:
                line_parts.append(f"{label}=OFFLINE")
                stall_counts[label] += 1
            elif block > prev_block:
                delta = block - prev_block
                line_parts.append(f"{label}=#{block}(+{delta})✓")
                stall_counts[label] = 0
            else:
                line_parts.append(f"{label}=#{block}(stall)")
                stall_counts[label] += 1

            max_stall[label] = max(max_stall[label], stall_counts[label])
            history[label].append({"ts": time.time(), "block": block})

        print("  ".join(line_parts))

    # Final snapshot
    print(f"\n{'─'*70}")
    print(f"  ⏱  Monitoring ended at {fmt(time.time())}")
    print(f"{'─'*70}\n")

    final = {}
    for label, w3 in providers.items():
        block = get_block(w3)
        peers = get_peers(w3)
        final[label] = {"block": block, "peers": peers}

    # Build report
    report = {}
    for label in providers:
        start_block = initial[label]["block"]
        end_block = final[label]["block"]
        blocks = end_block - start_block if end_block > 0 and start_block > 0 else 0
        report[label] = {
            "start_block": start_block,
            "end_block": end_block,
            "blocks_produced": blocks,
            "blocks_per_sec": round(blocks / duration_sec, 4) if blocks > 0 else 0,
            "max_consecutive_stalls": max_stall[label],
            "final_peers": final[label]["peers"],
            "network_survived": blocks > 0 and max_stall[label] < 10,
        }

    # Print summary
    print(f"{'='*70}")
    print(f"  📋 CHAOS OBSERVER REPORT")
    print(f"{'='*70}")
    all_survived = True
    for label, r in report.items():
        status = "✅ PASS" if r["network_survived"] else "❌ FAIL"
        all_survived = all_survived and r["network_survived"]
        print(f"\n  [{label}]")
        print(f"    Blocks: {r['start_block']} → {r['end_block']} (+{r['blocks_produced']})")
        print(f"    Rate:   {r['blocks_per_sec']} blocks/sec")
        print(f"    Max stall streak: {r['max_consecutive_stalls']}")
        print(f"    Final peers: {r['final_peers']}")
        print(f"    Result: {status}")

    print(f"\n{'─'*70}")
    overall = "✅ NETWORK RESILIENT" if all_survived else "❌ NETWORK FRAGILE"
    print(f"  Overall: {overall}")
    print(f"{'='*70}\n")

    return {"overall_pass": all_survived, "endpoints": report}


def main():
    ap = argparse.ArgumentParser(description="Axionax Chaos Observer")
    ap.add_argument(
        "--monitor-rpc",
        nargs="+",
        default=[
            os.environ.get("AXIONAX_RPC_EU", "http://217.76.61.116:8545"),
            os.environ.get("AXIONAX_RPC_AU", "http://46.250.244.4:8545"),
        ],
        help="RPC endpoint(s) to monitor",
    )
    ap.add_argument("--duration", type=int, default=120, help="Total monitoring duration (seconds)")
    ap.add_argument("--poll", type=float, default=3.0, help="Poll interval (seconds)")
    ap.add_argument("--json-out", default=None, help="Write JSON report to this path")
    args = ap.parse_args()

    result = run_chaos_observer(args.monitor_rpc, args.duration, args.poll)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(f"  JSON report written to {args.json_out}")

    raise SystemExit(0 if result["overall_pass"] else 1)


if __name__ == "__main__":
    main()
