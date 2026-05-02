#!/usr/bin/env python3
"""
deai_submit.py — Local Submitter

Sends DeAI jobs to the cloud worker queue.
In production this writes to the blockchain (eth_sendTransaction -> submitJob).

Decentralized flow:
  local submitter --(job.json)--> cloud worker (polls queue)
                                        |
                                        +-- result.json + hash

For demo: writes job files to a shared directory (or scp/rsync to cloud).
"""

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


# --------------- defaults ---------------
QUEUE_DIR = Path("services/core/reports/deai-queue")
SAMPLE_JOBS: List[Dict[str, Any]] = [
    {
        "id": "deai-001",
        "type": "python",
        "script": "print('Hello from cloud worker!'); print(sum(range(1000)))",
        "reward": "0.1",
        "timeout": 60,
    },
    {
        "id": "deai-002",
        "type": "inference",
        "script": "import json; print(json.dumps({'model':'resnet18','status':'ok','accuracy':0.94}))",
        "reward": "0.25",
        "timeout": 120,
    },
    {
        "id": "deai-003",
        "type": "training",
        "script": "print('Training complete'); print('epochs=1, loss=0.42')",
        "reward": "0.5",
        "timeout": 300,
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _job_file(queue_dir: Path, job_id: str) -> Path:
    return queue_dir / f"job-{job_id}.json"


def _result_file(queue_dir: Path, job_id: str) -> Path:
    return queue_dir / f"result-{job_id}.json"


def submit_job(
    queue_dir: Path,
    job: Dict[str, Any],
) -> str:
    """
    Submit a job to the queue.
    Returns the SHA256 hash of the job payload (inputHash analog).
    """
    job_id = job["id"]
    payload = json.dumps(job, sort_keys=True).encode("utf-8")
    input_hash = hashlib.sha256(payload).hexdigest()

    job_record = {
        "job_id": job_id,
        "submitted_at": utc_now(),
        "inputHash": input_hash,
        "status": "pending",  # pending | assigned | completed | failed
        "payload": job,
        "result": None,
        "result_hash": None,
        "error": None,
        "retries": 0,
        "max_retries": 2,
    }

    queue_dir.mkdir(parents=True, exist_ok=True)
    job_file = _job_file(queue_dir, job_id)
    job_file.write_text(json.dumps(job_record, indent=2), encoding="utf-8")

    print(f"[{utc_now()}] [SUBMIT ]  {job_id}  hash={input_hash[:16]}..")
    print(f"            queue: {job_file}")
    return input_hash


def wait_for_result(
    queue_dir: Path,
    job_id: str,
    timeout_s: int = 300,
    poll_s: int = 5,
) -> Dict[str, Any]:
    """
    Poll the queue for a result.
    Returns the full job record with result/error.
    """
    job_file = _job_file(queue_dir, job_id)
    result_file = _result_file(queue_dir, job_id)
    deadline = time.time() + timeout_s

    while time.time() < deadline:
        # Check if worker wrote a result file directly
        if result_file.exists():
            try:
                rec = json.loads(result_file.read_text(encoding="utf-8"))
                print(f"[{utc_now()}] [RESULT ]  {job_id}  status={rec.get('status')}")
                return rec
            except Exception as e:
                print(f"[{utc_now()}] [ERROR  ]  {job_id}  failed to read result: {e}")

        # Fall back: check job file status
        if job_file.exists():
            try:
                rec = json.loads(job_file.read_text(encoding="utf-8"))
                status = rec.get("status")
                if status in ("completed", "failed"):
                    print(f"[{utc_now()}] [DONE   ]  {job_id}  status={status}")
                    return rec
            except Exception:
                pass

        time.sleep(poll_s)

    print(f"[{utc_now()}] [TIMEOUT]  {job_id}  no result after {timeout_s}s")
    return {"job_id": job_id, "status": "timeout", "error": f"No result after {timeout_s}s"}


def main() -> int:
    parser = argparse.ArgumentParser(description="DeAI Job Submitter (Decentralized Demo)")
    parser.add_argument("--queue-dir", default=str(QUEUE_DIR), help="Queue directory (shared with worker)")
    parser.add_argument("--jobs", type=int, default=3, help="How many sample jobs to submit")
    parser.add_argument("--timeout", type=int, default=300, help="Max wait per job result (seconds)")
    parser.add_argument("--no-wait", action="store_true", help="Submit only, do not wait for results")
    args = parser.parse_args()

    queue_dir = Path(args.queue_dir)
    queue_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'=' * 60}")
    print(f"  DeAI Submitter — Decentralized Demo")
    print(f"  Queue: {queue_dir}")
    print(f"{'=' * 60}\n")

    jobs_to_submit = SAMPLE_JOBS[: max(1, min(args.jobs, len(SAMPLE_JOBS)))]
    submitted: list[Dict[str, Any]] = []

    for j in jobs_to_submit:
        h = submit_job(queue_dir, j)
        submitted.append({"job": j, "input_hash": h})

    if args.no_wait:
        print(f"\nSubmitted {len(submitted)} jobs. Exiting without waiting.")
        return 0

    print(f"\nWaiting for results (timeout={args.timeout}s per job)...")
    results: list[Dict[str, Any]] = []

    for item in submitted:
        job = item["job"]
        print(f"\n--- Polling {job['id']} ---")
        rec = wait_for_result(queue_dir, job["id"], timeout_s=args.timeout)
        results.append(rec)

        status = rec.get("status")
        result_hash = rec.get("result_hash", "") or ""
        output = (rec.get("result") or {}).get("output", "") or ""

        if status == "completed":
            h = hashlib.sha256(output.encode("utf-8")).hexdigest() if output else ""
            print(f"    SUCCESS  hash={h[:16]}..  output_len={len(output)}")
        elif status == "failed":
            print(f"    FAILED  error={rec.get('error', '?')[:120]}")
        else:
            print(f"    {status.upper()}")

    # ---- summary
    succeeded = sum(1 for r in results if r.get("status") == "completed")
    failed = sum(1 for r in results if r.get("status") == "failed")
    timed_out = sum(1 for r in results if r.get("status") == "timeout")

    print(f"\n{'=' * 60}")
    print(f"  Summary: {succeeded} succeeded, {failed} failed, {timed_out} timeout")
    print(f"  Evidence: {queue_dir}")
    print(f"{'=' * 60}\n")

    return 0 if succeeded == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
