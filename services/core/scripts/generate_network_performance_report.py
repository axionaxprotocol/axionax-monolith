#!/usr/bin/env python3
"""
Run optimize suite (smoke + light) and block-time probe, then write
reports/NETWORK_PERFORMANCE_SUMMARY.md plus JSON artifacts under reports/.

Usage (from repo root):
  python scripts/generate_network_performance_report.py
  python scripts/generate_network_performance_report.py --rpc https://rpc.axionax.org --light-duration 60 --block-duration 90

Requires: requests (optimize suite), web3 (block-time script). See scripts/requirements.txt
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _run(
    root: Path,
    cmd: list[str],
    *,
    timeout_sec: Optional[float] = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=root,
        capture_output=True,
        text=True,
        timeout=timeout_sec,
    )


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _fmt_md(
    *,
    generated_utc: str,
    rpc: str,
    optimize: dict[str, Any],
    block_time: Optional[dict[str, Any]],
    block_time_error: Optional[str],
    commands: dict[str, str],
) -> str:
    lines: list[str] = [
        "# สรุปผลทดสอบ Performance เครือข่าย (Axionax)",
        "",
        f"**สร้างอัตโนมัติ:** {generated_utc}",
        f"**RPC ที่ทดสอบ:** `{rpc}`",
        "",
        "---",
        "",
        "## 1. Optimize suite",
        "",
        f"คำสั่ง: `{commands['optimize']}`",
        "",
    ]

    overall = optimize.get("overall_ok")
    lines.append(f"- **สถานะรวม:** {'PASS' if overall else 'FAIL'}")
    lines.append("")

    for sc in optimize.get("scenarios", []):
        name = sc.get("name", "")
        ok = sc.get("ok")
        summary = sc.get("summary", "")
        metrics = sc.get("metrics", {})
        lines.append(f"### {name}")
        lines.append("")
        lines.append(f"- ผล: **{'PASS' if ok else 'FAIL'}** — {summary}")
        if metrics:
            lines.append("")
            lines.append("| Metric | ค่า |")
            lines.append("|--------|-----|")
            for k, v in metrics.items():
                lines.append(f"| `{k}` | {v} |")
        lines.append("")

    lines.append(f"รายงานดิบ: `reports/optimize_suite_last.json`")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 2. Block timing (`tps_finality_test.py` — block-time)")
    lines.append("")

    if block_time_error:
        lines.append(f"*ไม่ได้รันหรือล้มเหลว:* {block_time_error}")
        lines.append("")
    elif block_time:
        lines.append(f"คำสั่ง: `{commands['block_time']}`")
        lines.append("")
        dur = block_time.get("duration_sec", "?")
        bp = block_time.get("blocks_produced", "?")
        bps = block_time.get("blocks_per_second", "?")
        abt = block_time.get("avg_block_time_sec", "?")
        mbt = block_time.get("max_block_time_sec", 3.0)
        ft = block_time.get(
            "block_time_target_met", block_time.get("finality_target_met", False)
        )
        lines.append("| Metric | ค่า |")
        lines.append("|--------|-----|")
        lines.append(f"| Duration (s) | {dur} |")
        lines.append(f"| Blocks produced | {bp} |")
        lines.append(f"| Blocks/sec | {bps} |")
        lines.append(f"| Avg block time (s) | {abt} |")
        lines.append(f"| Target avg interval ≤ {mbt}s (production-style) | {'PASS' if ft else 'FAIL'} |")
        lines.append("")
        lines.append(
            "**หมายเหตุ:** วัดผ่านการ poll HTTP (ประมาณการ); เกณฑ์ default 5s รองรับ block ~2s + margin เครือข่าย; "
            "ปรับด้วย `--max-block-time-sec` ใน `tps_finality_test.py`"
        )
        lines.append("")
        lines.append("รายงานดิบ: `reports/block_time_last.json`")
    else:
        lines.append("*ไม่มีข้อมูล block-time*")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 3. ขั้นถัดไป")
    lines.append("")
    lines.append("- รันซ้ำจากเครื่อง/VPS ใกล้ RPC เพื่อลด latency ที่วัด")
    lines.append("- เพิ่ม `--block-duration` เพื่อให้ค่าเฉลี่ยเสถียรขึ้น")
    lines.append("- โหมด TPS ต้องมี funded key — ดู `scripts/load_test/tps_finality_test.py --help`")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    root = _repo_root()
    reports = root / "reports"
    reports.mkdir(parents=True, exist_ok=True)

    ap = argparse.ArgumentParser(description="Generate NETWORK_PERFORMANCE_SUMMARY.md from live tests")
    ap.add_argument("--rpc", default="https://rpc.axionax.org", help="JSON-RPC URL")
    ap.add_argument("--light-duration", type=float, default=45.0, help="Light phase duration (seconds)")
    ap.add_argument("--light-rps", type=float, default=2.5, help="Target RPS for light usage")
    ap.add_argument("--block-duration", type=int, default=45, help="Block-time probe duration (seconds)")
    ap.add_argument(
        "--max-block-time-sec",
        type=float,
        default=5.0,
        help="Pass threshold for block-time script (passed to tps_finality_test.py)",
    )
    ap.add_argument(
        "--skip-block-time",
        action="store_true",
        help="Only run optimize suite (no web3 / block-time)",
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output markdown path (default: reports/NETWORK_PERFORMANCE_SUMMARY.md)",
    )
    args = ap.parse_args()

    out_md = args.out or (reports / "NETWORK_PERFORMANCE_SUMMARY.md")
    json_opt = reports / "optimize_suite_last.json"
    json_block = reports / "block_time_last.json"

    py = sys.executable
    optimize_cmd = [
        py,
        str(root / "scripts" / "run_optimize_suite.py"),
        "-q",
        "--mode",
        "full",
        "--rpc",
        args.rpc,
        "--light-duration",
        str(args.light_duration),
        "--light-rps",
        str(args.light_rps),
        "--json-out",
        str(json_opt),
    ]
    commands: dict[str, str] = {
        "optimize": (
            f"python scripts/run_optimize_suite.py -q --mode full --rpc {args.rpc} "
            f"--light-duration {args.light_duration} --light-rps {args.light_rps} "
            f"--json-out reports/optimize_suite_last.json"
        ),
        "block_time": "",
    }

    r1 = _run(root, optimize_cmd, timeout_sec=180 + int(args.light_duration))
    if r1.returncode != 0:
        print(r1.stdout, file=sys.stdout)
        print(r1.stderr, file=sys.stderr)
        print(f"ERROR: optimize suite exited {r1.returncode}", file=sys.stderr)
        return 1

    block_time: Optional[dict[str, Any]] = None
    block_err: Optional[str] = None

    if not args.skip_block_time:
        block_cmd = [
            py,
            str(root / "scripts" / "load_test" / "tps_finality_test.py"),
            "--mode",
            "block-time",
            "--rpc",
            args.rpc,
            "--duration",
            str(args.block_duration),
            "--max-block-time-sec",
            str(args.max_block_time_sec),
            "--json-out",
            str(json_block),
        ]
        commands["block_time"] = (
            f"python scripts/load_test/tps_finality_test.py --mode block-time --rpc {args.rpc} "
            f"--duration {args.block_duration} --max-block-time-sec {args.max_block_time_sec} "
            f"--json-out reports/block_time_last.json"
        )
        r2 = _run(root, block_cmd, timeout_sec=120 + args.block_duration)
        print(r2.stdout, end="")
        if r2.stderr:
            print(r2.stderr, file=sys.stderr)
        if r2.returncode != 0:
            block_err = f"exit {r2.returncode}: {r2.stderr.strip() or r2.stdout.strip()[:500]}"
        elif json_block.is_file():
            try:
                block_time = _load_json(json_block)
            except (OSError, json.JSONDecodeError) as e:
                block_err = str(e)
    else:
        block_err = "skipped (--skip-block-time)"

    optimize_data = _load_json(json_opt)
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    md = _fmt_md(
        generated_utc=generated,
        rpc=args.rpc,
        optimize=optimize_data,
        block_time=block_time,
        block_time_error=block_err,
        commands=commands,
    )
    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_md.write_text(md, encoding="utf-8")
    print(f"Wrote {out_md.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
