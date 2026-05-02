#!/usr/bin/env python3
"""
Hello DeAI - End-to-End Demo Script
====================================
End-to-end demo: main node registers worker, dispatches compute jobs through
the DeAI worker sandbox, captures result hash + execution logs + retry/failure.

Architecture (mock mode - marketplace address = 0x0):
  main node --> contract.register_worker()
             --> sandbox.execute_python_script(script)  [simulated worker dispatch]
             --> sha256(output) + logs + retry on failure

Usage:
  python hello_deai.py
    [--rpc-url http://217.216.109.5:8545]
    [--output-dir services/core/reports/deai-demo-{stamp}]
    [--retries 2] [--jobs 5] [--timeout 60]
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import sys
import time
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

# --------------- add deai to path ---------------
DEAI_DIR = os.path.dirname(os.path.abspath(__file__))
if DEAI_DIR not in sys.path:
    sys.path.insert(0, DEAI_DIR)

from rpc_client import AxionaxRpcClient
from sandbox import create_sandbox, ResourceLimits, ExecutionStatus
from contract_manager import ContractManager
from wallet_manager import WalletManager


# --------------- helpers ---------------
def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def logger(tag: str, msg: str) -> None:
    ts = utc_now()
    print(f"[{ts}] [{tag:7s}]  {msg}", flush=True)


# =============================================================================
# Job definitions -- realistic DeAI workloads
# =============================================================================

SAMPLE_JOBS = [
    {
        "id": "hello-deai-1",
        "script": "print('Hello, DeAI!'); print(sum(range(1000)))",
        "desc": "base compute: sum 0..999",
    },
    {
        "id": "hello-deai-2",
        "script": "import json; print(json.dumps({'model':'resnet18','accuracy':0.9432,'params':11176512}))",
        "desc": "model inference payload",
    },
    {
        "id": "hello-deai-3",
        "script": "import os, sys; print(f'cwd={os.getcwd()}, py={sys.version.split()[0]}')",
        "desc": "environment check",
    },
    {
        "id": "hello-deai-large",
        "script": "import hashlib; data=b'x'*5_000_000; print(hashlib.sha256(data).hexdigest())",
        "desc": "memory-heavy hashing",
    },
    {
        "id": "hello-deai-fail-expected",
        "script": "raise RuntimeError('deliberate job failure [retry test]')",
        "desc": "deliberate crash",
    },
]


# =============================================================================
# Result record
# =============================================================================

@dataclass
class JobRecord:
    job_id: str
    desc: str
    status: str  # success | failed | timeout
    output_hash: Optional[str] = None
    output_preview: Optional[str] = None
    error: Optional[str] = None
    execution_time_ms: int = 0
    retries_used: int = 0


# =============================================================================
# Runner
# =============================================================================

def run_job(
    job: dict[str, Any],
    sandbox,
    max_retries: int = 2,
    timeout_s: int = 60,
) -> JobRecord:
    job_id: str = job["id"]
    script: str = job["script"]
    desc: str = job.get("desc", "")
    retries_left = max_retries
    last_err: Optional[Exception] = None

    limits = ResourceLimits(
        cpu_count=2.0,
        memory_mb=2048,
        timeout_seconds=timeout_s,
        network_disabled=True,
    )

    while retries_left >= 0:
        try:
            start_ms = int(time.time() * 1000)

            # Dispatch to sandbox (simulates worker node executing picked job)
            result = sandbox.execute_python_script(script=script, limits=limits)
            elapsed_ms = int(time.time() * 1000) - start_ms

            out_raw = (result.output or "").strip()
            out_hash = sha256(out_raw.encode("utf-8")) if out_raw else None
            preview = out_raw[:120] if out_raw else None

            logger(
                "execute",
                f"{job_id}  status={result.status.value}  "
                f"elapsed={elapsed_ms}ms  hash={out_hash[:16] if out_hash else 'N/A'}..",
            )

            if result.status == ExecutionStatus.SUCCESS:
                logger(
                    "result",
                    f"{job_id}  {desc}  "
                    f"hash={out_hash}  output_len={len(out_raw)}",
                )
                return JobRecord(
                    job_id=job_id,
                    desc=desc,
                    status="success",
                    output_hash=out_hash,
                    output_preview=preview,
                    execution_time_ms=elapsed_ms,
                    retries_used=max_retries - retries_left,
                )
            elif result.status == ExecutionStatus.TIMEOUT:
                return JobRecord(
                    job_id=job_id,
                    desc=desc,
                    status="timeout",
                    error=f"Timeout after {limits.timeout_seconds}s",
                    execution_time_ms=elapsed_ms,
                    retries_used=max_retries - retries_left,
                )
            else:
                raise RuntimeError(result.error or "Unknown execution error")

        except Exception as exc:
            last_err = exc
            retries_left -= 1
            if retries_left >= 0:
                delay = 2.0 * (max_retries - retries_left)
                logger(
                    "retry",
                    f"{job_id}  attempt {max_retries - retries_left}/{max_retries}  "
                    f"delay={delay:.1f}s  error={exc}",
                )
                time.sleep(delay)
            else:
                trace = "".join(
                    traceback.format_exception(type(last_err), last_err, last_err.__traceback__)
                ) if last_err and last_err.__traceback__ else str(last_err)
                logger("fail", f"{job_id}  EXHAUSTED retries  error={last_err}")
                return JobRecord(
                    job_id=job_id,
                    desc=desc,
                    status="failed",
                    error=trace,
                    retries_used=max_retries,
                    execution_time_ms=0,
                )

    return JobRecord(job_id=job_id, desc=desc, status="failed",
                     error="unreachable", retries_used=max_retries)


# =============================================================================
# Evidence package
# =============================================================================

def write_evidence(
    out_dir: Path,
    records: list[JobRecord],
    rpc_url: str,
    block_num: int,
    wallet_addr: str,
    total_time_s: float,
    max_retries: int,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # ---- run.json
    run_meta = {
        "started_utc": out_dir.name.replace("deai-demo-", ""),
        "rpc_url": rpc_url,
        "chain_height": block_num,
        "worker_address": wallet_addr,
        "max_retries": max_retries,
        "total_time_seconds": round(total_time_s, 1),
        "jobs_total": len(records),
        "jobs_success": sum(1 for r in records if r.status == "success"),
        "jobs_failed": sum(1 for r in records if r.status in ("failed", "timeout")),
        "jobs": [
            {
                "id": r.job_id,
                "desc": r.desc,
                "status": r.status,
                "output_hash": r.output_hash,
                "output_preview": r.output_preview,
                "error": r.error,
                "execution_time_ms": r.execution_time_ms,
                "retries_used": r.retries_used,
            }
            for r in records
        ],
    }
    (out_dir / "run.json").write_text(json.dumps(run_meta, indent=2), encoding="utf-8")

    # ---- results.csv
    with (out_dir / "results.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["job_id", "desc", "status", "output_hash", "exec_time_ms", "retries", "error"])
        for r in records:
            w.writerow(
                [
                    r.job_id, r.desc, r.status,
                    r.output_hash or "", r.execution_time_ms, r.retries_used,
                    r.error or "",
                ]
            )

    # ---- details.log
    with (out_dir / "details.log").open("w", encoding="utf-8") as f:
        f.write(f"# Hello DeAI - Demo execution log ({utc_now()})\n")
        f.write(f"# RPC: {rpc_url}  |  Chain height: {block_num}\n")
        f.write(f"# Worker: {wallet_addr}  |  Jobs: {len(records)}\n\n")
        for r in records:
            f.write(f"## {r.job_id} [{r.status.upper()}]\n")
            f.write(f"- desc: {r.desc}\n")
            if r.output_hash:
                f.write(f"- output_hash: {r.output_hash}\n")
            if r.output_preview:
                f.write(f"- output_preview: {r.output_preview}\n")
            if r.error:
                f.write(f"- error: {r.error}\n")
            f.write(f"- execution_time_ms: {r.execution_time_ms}\n")
            f.write(f"- retries: {r.retries_used}\n\n")

    # ---- incident-notes.md (template for manual analysis)
    passed = sum(1 for r in records if r.status == "success")
    failed = sum(1 for r in records if r.status in ("failed", "timeout"))
    verdict = "PASS" if passed == len(records) and failed == 0 else "REQUIRES ANALYSIS"
    with (out_dir / "incident-notes.md").open("w", encoding="utf-8") as f:
        f.write("# Hello DeAI - Runbook Notes\n\n")
        f.write("## Run metadata\n")
        f.write(f"- RPC URL: {rpc_url}\n")
        f.write(f"- Chain height: {block_num}\n")
        f.write(f"- Worker address: {wallet_addr}\n")
        f.write(f"- Jobs submitted: {len(records)}\n")
        f.write(f"- Success: {passed}  |  Failed: {failed}\n")
        f.write(f"- Total run time: {round(total_time_s, 1)}s\n\n")
        f.write("## Auto-detected events\n")
        for r in records:
            if r.status != "success":
                f.write(f"- {r.job_id}: {r.status} -- {r.error or '(no detail)'}\n")
        f.write("\n## Manual analysis\n")
        f.write("- Root cause summary:\n")
        f.write("- Mitigation applied:\n")
        f.write("- Follow-up actions:\n")
        f.write(f"- Final verdict against DoD: {verdict}\n")


# =============================================================================
# main
# =============================================================================

def main() -> int:
    parser = argparse.ArgumentParser(description="Hello DeAI - End-to-End Demo")
    parser.add_argument("--rpc-url", default="http://217.216.109.5:8545", help="Validator RPC URL")
    parser.add_argument("--retries", type=int, default=2, help="Max retries per job")
    parser.add_argument("--jobs", type=int, default=5, help="Number of sample jobs")
    parser.add_argument("--timeout", type=int, default=60, help="Job timeout in seconds")
    parser.add_argument("--output-dir", default="", help="Override output directory")
    parser.add_argument("--skip-fail", action="store_true", help="Skip deliberate failure job")
    args = parser.parse_args()

    # ---- select jobs
    job_candidates = SAMPLE_JOBS.copy()
    if args.skip_fail:
        job_candidates = [j for j in job_candidates if "fail" not in j["id"]]
    jobs = job_candidates[: max(1, min(args.jobs, len(job_candidates)))]

    # ---- connect to chain
    logger("init", f"RPC -> {args.rpc_url}")
    client = AxionaxRpcClient(args.rpc_url)

    block_num = client.get_block_number()
    if block_num == 0:
        logger("error", "Cannot reach RPC -- block number was 0. Check URL and network.")
        return 1
    logger("block", f"Chain height = {block_num}")

    # ---- sandbox (MockSandbox when Docker not available externally)
    sandbox = create_sandbox(use_docker=True)
    logger("sandbox", f"Sandbox: {type(sandbox).__name__}")

    # ---- wallet
    wallet = WalletManager()
    wallet_addr = wallet.get_address()
    logger("wallet", f"Worker address: {wallet_addr}")

    # ---- contract (register worker -- mock mode since address = 0x0)
    contract = ContractManager(
        rpc_url=args.rpc_url,
        account=wallet.account,
    )
    try:
        tx_hash = contract.register_worker(
            {
                "device": "cpu",
                "version": "1.9.0",
                "sandbox_enabled": True,
                "max_memory_mb": 32768,
                "max_timeout_s": 1800,
                "model_cache_enabled": False,
            }
        )
        logger("register", f"Worker registered  tx={tx_hash or 'mock'}")
    except Exception as e:
        logger("register", f"Worker registration skipped: {e}")

    # ---- run all jobs
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_dir = (
        Path(args.output_dir)
        if args.output_dir
        else Path("services/core/reports") / f"deai-demo-{stamp}"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  Hello DeAI - {len(jobs)} job(s), max {args.retries} retries each")
    print(f"  Evidence -> {out_dir}")
    print(f"{'='*60}\n")

    records: list[JobRecord] = []
    t0 = time.time()

    for i, job in enumerate(jobs, 1):
        print(f"--- Job {i}/{len(jobs)}: {job['id']} ({job['desc']}) ---")
        rec = run_job(job, sandbox, max_retries=args.retries, timeout_s=args.timeout)
        records.append(rec)
        print(
            f"     result: {rec.status}  "
            f"hash={rec.output_hash or '-'}  "
            f"ms={rec.execution_time_ms}  "
            f"retries={rec.retries_used}\n"
        )

    total_time = time.time() - t0

    # ---- evidence
    write_evidence(out_dir, records, args.rpc_url, block_num, wallet_addr, total_time, args.retries)

    succeeded = sum(1 for r in records if r.status == "success")
    logger("done", f"{succeeded}/{len(records)} jobs succeeded")
    logger("done", f"Evidence package: {out_dir}")
    logger("done", "Hello DeAI - DoD complete")

    return 0 if succeeded == len(records) else 1


if __name__ == "__main__":
    raise SystemExit(main())