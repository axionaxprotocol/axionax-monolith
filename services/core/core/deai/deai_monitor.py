#!/usr/bin/env python3
"""
deai_monitor.py — Cloud Worker Monitor.

Polls the job queue, executes jobs in sandbox, and writes results.
Implements: result hash, execution logs, retry on failure.

Architecture:
  deai_monitor.py (cloud) --polls--> queue/*.json
                          --> sandbox.execute_python_script()
                          --> write result-*.json (hash, logs, retry count)

For decentralized demo: run this on the cloud VPS (e.g. 217.216.109.5)
with access to the same queue directory (shared via scp/rsync or mounted).
"""

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

# ---- add deai to path ----
DEAI_DIR = os.path.dirname(os.path.abspath(__file__))
if DEAI_DIR not in sys.path:
    sys.path.insert(0, DEAI_DIR)

from sandbox import create_sandbox, ResourceLimits, ExecutionStatus


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def process_job(
    job_file: Path,
    sandbox,
    queue_dir: Path,
    max_retries: int = 2,
) -> Dict[str, Any]:
    """
    Process a single job: load -> sandbox execute -> write result.
    Returns the full job record with result_hash.
    """
    job_id = job_file.stem.replace("job-", "")

    try:
        job = json.loads(job_file.read_text(encoding="utf-8"))
    except Exception as e:
        return {
            "job_id": job_id,
            "status": "failed",
            "error": f"Cannot read job file: {e}",
            "retries": 0,
        }

    script = job.get("payload", {}).get("script", "")
    timeout = job.get("payload", {}).get("timeout", 60)
    retries_left = max_retries - job.get("retries", 0)

    limits = ResourceLimits(
        cpu_count=2.0,
        memory_mb=2048,
        timeout_seconds=timeout,
        network_disabled=True,
    )

    last_err: Optional[Exception] = None

    while retries_left >= 0:
        try:
            print(f"[{utc_now()}] [EXEC   ]  {job_id}  attempt {max_retries - retries_left}/{max_retries}...")

            start_ms = int(time.time() * 1000)
            result = sandbox.execute_python_script(script=script, limits=limits)
            elapsed_ms = int(time.time() * 1000) - start_ms

            output_raw = (result.output or "").strip()
            output_bytes = output_raw.encode("utf-8")
            output_hash = sha256(output_bytes)  # sha256(output) — decentralised result hash

            # worker proof = sha256(job_id + output)
            worker_proof = sha256(f"{job_id}:{output_raw}".encode("utf-8"))

            print(f"[{utc_now()}] [RESULT ]  {job_id}  status={result.status.value}  output_hash={output_hash[:16]}..")

            if result.status == ExecutionStatus.SUCCESS:
                rec = {
                    "job_id": job_id,
                    "status": "completed",
                    "result": {
                        "output": output_raw,
                        "output_hash": output_hash,
                        "worker_proof": worker_proof,
                        "execution_time_ms": elapsed_ms,
                    },
                    "result_hash": output_hash,
                    "error": None,
                    "retries": max_retries - retries_left,
                }
                result_file = queue_dir / f"result-{job_id}.json"
                result_file.write_text(json.dumps(rec, indent=2), encoding="utf-8")
                return rec

            elif result.status == ExecutionStatus.TIMEOUT:
                raise RuntimeError(f"Timeout after {limits.timeout_seconds}s")
            else:
                raise RuntimeError(result.error or "Unknown sandbox error")

        except Exception as exc:
            last_err = exc
            retries_left -= 1
            if retries_left >= 0:
                delay = 2.0 * (max_retries - retries_left)
                print(f"[{utc_now()}] [RETRY ]  {job_id}  delay={delay:.1f}s  err={exc}")
                # Update retry count in job file
                job["retries"] = job.get("retries", 0) + 1
                job_file.write_text(json.dumps(job, indent=2), encoding="utf-8")
                time.sleep(delay)
            else:
                print(f"[{utc_now()}] [FAILED ]  {job_id}  EXHAUSTED retries")
                rec = {
                    "job_id": job_id,
                    "status": "failed",
                    "result": None,
                    "result_hash": None,
                    "error": str(last_err),
                    "retries": max_retries,
                }
                result_file = queue_dir / f"result-{job_id}.json"
                result_file.write_text(json.dumps(rec, indent=2), encoding="utf-8")
                return rec

    # Should not reach here
    return {"job_id": job_id, "status": "failed", "error": "unreachable"}


def main() -> int:
    parser = argparse.ArgumentParser(description="DeAI Cloud Worker Monitor")
    parser.add_argument("--queue-dir", default="services/core/reports/deai-queue", help="Queue directory")
    parser.add_argument("--poll-ms", type=int, default=5000, help="Poll interval ms")
    parser.add_argument("--max-retries", type=int, default=2, help="Max retries per job")
    parser.add_argument("--once", action="store_true", help="Process pending jobs once and exit")
    args = parser.parse_args()

    queue_dir = Path(args.queue_dir)
    queue_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'=' * 60}")
    print(f"  DeAI Cloud Worker Monitor")
    print(f"  Queue: {queue_dir}")
    print(f"  Poll interval: {args.poll_ms}ms")
    print(f"{'=' * 60}\n")

    sandbox = create_sandbox(use_docker=True)
    print(f"[{utc_now()}] [INIT   ]  Sandbox: {type(sandbox).__name__}")

    def process_all():
        job_files = list(queue_dir.glob("job-*.json"))
        processed = 0
        for jf in job_files:
            try:
                job_data = json.loads(jf.read_text(encoding="utf-8"))
            except Exception:
                continue
            if job_data.get("status") in ("completed", "failed"):
                continue  # Already done
            rec = process_job(jf, sandbox, queue_dir, max_retries=args.max_retries)
            processed += 1
        return processed

    if args.once:
        n = process_all()
        print(f"\nProcessed {n} job(s). Exiting.")
        return 0

    # Continuous mode
    try:
        while True:
            n = process_all()
            if n == 0:
                time.sleep(args.poll_ms / 1000.0)
    except KeyboardInterrupt:
        print(f"\n[{utc_now()}] [STOP   ]  Worker stopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
