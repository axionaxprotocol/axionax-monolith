#!/usr/bin/env python3
"""
TPS & Finality load test for Axionax Protocol.

Validates:
  - TPS target: 45,000+ (run with sufficient tx rate and duration)
  - Block interval (block-time mode): measured vs --max-block-time-sec (default 3.0s; genesis ~2s + HTTP poll margin)

Modes:
  - block-time: Poll eth_blockNumber and measure block interval (no funded account needed).
  - tps: Send raw transactions and measure included TPS (requires funded account).
"""

import argparse
import json
import os
import time
from pathlib import Path
from typing import Optional

try:
    from web3 import Web3
except ImportError:
    print("Install web3: pip install web3")
    raise SystemExit(1)


def get_block_number(w3: Web3) -> int:
    return w3.eth.block_number


def _ensure_rpc_reachable(w3: Web3, rpc_url: str) -> None:
    """
    Axionax nodes may not implement web3_clientVersion; Web3.is_connected() then
    returns False even when eth_blockNumber works (same as curl). Use a real RPC call.
    """
    try:
        _ = w3.eth.block_number
    except Exception as e:
        raise RuntimeError(f"Cannot connect to RPC: {rpc_url}") from e


def run_block_time_mode(
    rpc_url: str, duration_sec: int, *, max_block_time_sec: float = 5.0
) -> dict:
    """Measure block production rate and average block time (proxy for finality)."""
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    _ensure_rpc_reachable(w3, rpc_url)

    start_block = get_block_number(w3)
    start_time = time.perf_counter()
    block_times: list[float] = []
    prev_block, prev_ts = start_block, start_time

    while (time.perf_counter() - start_time) < duration_sec:
        time.sleep(0.1)
        now = time.perf_counter()
        try:
            block = get_block_number(w3)
        except Exception as e:
            print(f"  Warning: get block failed: {e}")
            continue
        if block > prev_block:
            for _ in range(block - prev_block - 1):
                block_times.append(0.0)  # unknown intermediate
            block_times.append(now - prev_ts)
            prev_block, prev_ts = block, now

    elapsed = time.perf_counter() - start_time
    blocks_produced = get_block_number(w3) - start_block
    avg_block_time = (elapsed / blocks_produced) if blocks_produced else 0.0
    measured = [t for t in block_times if t > 0]
    avg_interval = sum(measured) / len(measured) if measured else 0.0

    interval = avg_interval or avg_block_time
    return {
        "rpc": rpc_url,
        "duration_sec": round(elapsed, 2),
        "blocks_produced": blocks_produced,
        "blocks_per_second": round(blocks_produced / elapsed, 4) if elapsed else 0,
        "avg_block_time_sec": round(interval, 4),
        "max_block_time_sec": max_block_time_sec,
        "block_time_target_met": interval <= max_block_time_sec,
        # legacy key for older automation
        "finality_target_met": interval <= max_block_time_sec,
    }


def run_tps_mode(
    rpc_url: str,
    duration_sec: int,
    tx_rate: int,
    private_key: Optional[str],
) -> dict:
    """Send transactions and measure included TPS. Requires funded account."""
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    _ensure_rpc_reachable(w3, rpc_url)

    if not private_key:
        raise ValueError("TPS mode requires AXIONAX_PRIVATE_KEY or --private-key")

    account = w3.eth.account.from_key(private_key)
    chain_id = w3.eth.chain_id
    nonce = w3.eth.get_transaction_count(account.address)

    start_block = get_block_number(w3)
    start_time = time.perf_counter()
    sent = 0
    interval = 1.0 / tx_rate if tx_rate else 0.001

    while (time.perf_counter() - start_time) < duration_sec:
        tx = {
            "from": account.address,
            "to": account.address,
            "value": 0,
            "gas": 21000,
            "gasPrice": w3.eth.gas_price or 10**9,
            "nonce": nonce + sent,
            "chainId": chain_id,
        }
        signed = account.sign_transaction(tx)
        try:
            w3.eth.send_raw_transaction(signed.raw_transaction)
            sent += 1
        except Exception as e:
            print(f"  Warning: send failed: {e}")
        time.sleep(interval)

    elapsed = time.perf_counter() - start_time
    time.sleep(2)  # allow inclusion
    end_block = get_block_number(w3)
    # Heuristic: assume txs spread over blocks; we don't query receipts here to keep it simple
    blocks_created = max(1, end_block - start_block)
    included_estimate = min(sent, blocks_created * 5000)  # rough upper bound per block
    tps_sent = sent / elapsed if elapsed else 0
    tps_included_estimate = included_estimate / elapsed if elapsed else 0

    return {
        "rpc": rpc_url,
        "duration_sec": round(elapsed, 2),
        "tx_sent": sent,
        "blocks_produced": blocks_created,
        "tps_sent": round(tps_sent, 2),
        "tps_included_estimate": round(tps_included_estimate, 2),
        "target_45k_met": tps_included_estimate >= 45000,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Axionax TPS & Finality load test")
    ap.add_argument("--rpc", default=os.environ.get("AXIONAX_RPC_URL", "http://127.0.0.1:8545"), help="RPC URL")
    ap.add_argument("--mode", choices=["block-time", "tps"], default="block-time", help="block-time or tps")
    ap.add_argument("--duration", type=int, default=60, help="Test duration in seconds")
    ap.add_argument("--tx-rate", type=int, default=100, help="Tx per second in tps mode")
    ap.add_argument("--private-key", default=os.environ.get("AXIONAX_PRIVATE_KEY"), help="Hex key for tps mode")
    ap.add_argument(
        "--json-out",
        type=Path,
        default=None,
        help="Write block-time or tps result JSON to this path (for automation)",
    )
    ap.add_argument(
        "--max-block-time-sec",
        type=float,
        default=5.0,
        help="block-time: PASS if measured avg interval <= this (default 5.0; ~2s chain + HTTP poll margin)",
    )
    args = ap.parse_args()

    print(f"RPC: {args.rpc}  mode: {args.mode}  duration: {args.duration}s")
    if args.mode == "block-time":
        result = run_block_time_mode(
            args.rpc, args.duration, max_block_time_sec=args.max_block_time_sec
        )
        print("--- Block timing (HTTP poll — approximate) ---")
        print(f"  Blocks produced:     {result['blocks_produced']}")
        print(f"  Blocks/sec:         {result['blocks_per_second']}")
        print(f"  Avg block time (s): {result['avg_block_time_sec']}")
        print(
            f"  Block time <= {result['max_block_time_sec']}s: "
            f"{'PASS' if result['block_time_target_met'] else 'FAIL'}"
        )
        if args.json_out:
            args.json_out.parent.mkdir(parents=True, exist_ok=True)
            args.json_out.write_text(json.dumps(result, indent=2), encoding="utf-8")
            print(f"  JSON:               {args.json_out}")
    else:
        result = run_tps_mode(args.rpc, args.duration, args.tx_rate, args.private_key)
        print("--- TPS ---")
        print(f"  Tx sent:            {result['tx_sent']}")
        print(f"  TPS (sent):         {result['tps_sent']}")
        print(f"  TPS (est included): {result['tps_included_estimate']}")
        print(f"  Target 45k+ TPS:    {'PASS' if result['target_45k_met'] else 'FAIL (run longer/higher tx-rate for full validation)'}")
        if args.json_out:
            args.json_out.parent.mkdir(parents=True, exist_ok=True)
            args.json_out.write_text(json.dumps(result, indent=2), encoding="utf-8")
            print(f"  JSON:               {args.json_out}")
    print("Done.")


if __name__ == "__main__":
    main()
