#!/usr/bin/env python3
"""CLI for the Axionax optimization suite."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List

from .scenarios import ScenarioReport, run_all


def _print_banner() -> None:
    print(
        "Axionax optimize suite - smoke / light usage / optional RPC stress.\n"
        "Use cyber mode only on networks you operate or have explicit permission to test.\n"
    )


def _reports_to_json(rpc_url: str, reports: List[ScenarioReport]) -> dict[str, Any]:
    return {
        "rpc_url": rpc_url,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "scenarios": [asdict(r) for r in reports],
        "overall_ok": all(r.ok for r in reports),
    }


def main(argv: list[str] | None = None) -> int:
    default_rpc = os.environ.get("AXIONAX_RPC_URL", "https://rpc.axionax.org").strip()
    ap = argparse.ArgumentParser(
        description="Simulate light testnet traffic and optional RPC stress (authorized use only)."
    )
    ap.add_argument("--rpc", default=default_rpc, help="JSON-RPC HTTP endpoint")
    ap.add_argument(
        "--mode",
        choices=("smoke", "light", "cyber", "full"),
        default="full",
        help="smoke: chain id + block; light: low RPS reads; cyber: stress; full: smoke+light (+cyber with --cyber)",
    )
    ap.add_argument("--light-duration", type=float, default=30.0, help="Seconds for light usage")
    ap.add_argument("--light-rps", type=float, default=2.5, help="Target RPS for light usage")
    ap.add_argument("--cyber-burst", type=int, default=40, help="Parallel eth_blockNumber calls in cyber burst")
    ap.add_argument("--cyber-malformed", type=int, default=8, help="Malformed body iterations (approx)")
    ap.add_argument(
        "--cyber",
        action="store_true",
        help="Required for mode=cyber or full to run cyber_simulation (malformed traffic + burst)",
    )
    ap.add_argument("--json-out", type=Path, default=None, help="Write JSON report to this path")
    ap.add_argument("-q", "--quiet", action="store_true", help="Suppress banner and notes")
    args = ap.parse_args(argv)

    if not args.quiet:
        _print_banner()

    rpc_url = args.rpc
    run_light = args.mode in ("light", "full")
    run_cyber = args.mode == "cyber" or (args.mode == "full" and args.cyber)

    if args.mode == "cyber" and not args.cyber:
        print("ERROR: mode=cyber requires --cyber (confirms authorized testing).", file=sys.stderr)
        return 2

    if args.mode == "full" and not args.cyber and not args.quiet:
        print("Note: full without --cyber runs smoke + light only.")

    reports: List[ScenarioReport]
    if args.mode == "smoke":
        from .scenarios import run_smoke

        reports = [run_smoke(rpc_url)]
    elif args.mode == "light":
        from .scenarios import run_light_usage, run_smoke

        reports = [run_smoke(rpc_url), run_light_usage(rpc_url, duration_sec=args.light_duration, target_rps=args.light_rps)]
    elif args.mode == "cyber":
        from .scenarios import run_cyber_simulation, run_smoke

        reports = [
            run_smoke(rpc_url),
            run_cyber_simulation(
                rpc_url,
                burst_parallel=args.cyber_burst,
                malformed_repeat=args.cyber_malformed,
            ),
        ]
    else:
        reports = run_all(
            rpc_url,
            run_light=run_light,
            run_cyber=run_cyber,
            light_duration_sec=args.light_duration,
            light_rps=args.light_rps,
            cyber_burst=args.cyber_burst,
            cyber_malformed=args.cyber_malformed,
        )

    for r in reports:
        status = "PASS" if r.ok else "FAIL"
        print(f"[{status}] {r.name}: {r.summary}")
        if r.metrics:
            print(f"       metrics: {json.dumps(r.metrics, ensure_ascii=False)}")

    payload = _reports_to_json(rpc_url, reports)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {args.json_out}")

    return 0 if payload["overall_ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
