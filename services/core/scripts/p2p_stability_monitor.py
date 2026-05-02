#!/usr/bin/env python3
"""
P2P stability evidence collector for Axionax testnet validators.

Produces a report directory containing:
- peer-events.log
- sync-height.csv
- network-quality.txt
- incident-notes.md
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def rpc_call(
    url: str,
    method: str,
    params: list[Any] | None = None,
    timeout: int = 15,
    retries: int = 2,
    retry_delay: float = 3.0,
) -> Any:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or [],
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}

    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = Request(url=url, data=data, headers=headers, method="POST")
            with urlopen(req, timeout=timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            if "error" in body:
                raise RuntimeError(f"{method} error from {url}: {body['error']}")
            return body.get("result")
        except (URLError, TimeoutError, RuntimeError, ConnectionError) as exc:
            last_err = exc
            if attempt < retries:
                time.sleep(retry_delay * (attempt + 1))
    raise last_err  # type: ignore[misc]


def hex_to_int(value: Any) -> int:
    if isinstance(value, str) and value.startswith("0x"):
        return int(value, 16)
    raise ValueError(f"Expected hex value, got {value!r}")


def get_node_state(name: str, rpc_url: str, rpc_timeout: int = 15, rpc_retries: int = 2) -> dict[str, Any]:
    state: dict[str, Any] = {
        "name": name,
        "rpc_url": rpc_url,
        "ok": False,
        "height": None,
        "peers": None,
        "system_peers": None,
        "error": "",
    }

    try:
        state["height"] = hex_to_int(rpc_call(rpc_url, "eth_blockNumber", timeout=rpc_timeout, retries=rpc_retries))
        state["peers"] = hex_to_int(rpc_call(rpc_url, "net_peerCount", timeout=rpc_timeout, retries=rpc_retries))
        try:
            system_status = rpc_call(rpc_url, "system_status", timeout=rpc_timeout, retries=1)
            if isinstance(system_status, dict):
                state["system_peers"] = system_status.get("peers")
        except Exception:
            state["system_peers"] = None
        state["ok"] = True
    except (URLError, TimeoutError, RuntimeError, ValueError, ConnectionError) as exc:
        state["error"] = str(exc)

    return state


def append_peer_event(peer_log: Path, line: str) -> None:
    with peer_log.open("a", encoding="utf-8") as f:
        f.write(f"[{now_utc()}] {line}\n")


def send_webhook_alert(webhook_url: str, title: str, body: str) -> None:
    """Send a Discord-compatible webhook alert. Silently ignores failures."""
    payload = {
        "content": None,
        "embeds": [
            {
                "title": title,
                "description": body,
                "color": 0xFF5555,
                "timestamp": now_utc(),
            }
        ],
    }
    try:
        req = Request(
            url=webhook_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req, timeout=10) as resp:
            pass  # best-effort — never crash the main loop
    except Exception:
        pass


def _ping_command(host: str) -> list[str]:
    if sys.platform == "win32":
        return ["ping", "-n", "20", host]
    return ["ping", "-c", "20", host]


def _trace_command(host: str) -> tuple[str, list[str]] | None:
    """Return (label, argv) for route tracing, or None if no tool found."""
    if sys.platform == "win32":
        return ("tracert", ["tracert", "-d", host])
    tr = shutil.which("traceroute")
    if tr:
        return ("traceroute", [tr, "-n", host])
    tp = shutil.which("tracepath")
    if tp:
        return ("tracepath", [tp, host])
    return None


def run_network_quality_report(output: Path, host_a: str, host_b: str) -> None:
    with output.open("w", encoding="utf-8") as f:
        f.write(f"# Network quality report ({now_utc()})\n")
        f.write(f"# host_a={host_a}, host_b={host_b}\n")
        f.write(f"# platform={sys.platform}\n\n")

        checks: list[tuple[str, list[str]]] = [
            ("ping host_a", _ping_command(host_a)),
            ("ping host_b", _ping_command(host_b)),
        ]
        ta = _trace_command(host_a)
        tb = _trace_command(host_b)
        if ta:
            checks.append((f"{ta[0]} host_a", ta[1]))
        if tb:
            checks.append((f"{tb[0]} host_b", tb[1]))
        if not ta and not tb and sys.platform != "win32":
            f.write(
                "## trace skipped\n"
                "Install `traceroute` or `tracepath` for hop diagnostics on this OS.\n\n"
            )

        for title, cmd in checks:
            f.write(f"## {title}\n")
            f.write(f"$ {' '.join(cmd)}\n")
            try:
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180, check=False)
                if proc.stdout:
                    f.write(proc.stdout + "\n")
                if proc.stderr:
                    f.write(proc.stderr + "\n")
                f.write(f"[exit_code={proc.returncode}]\n\n")
            except Exception as exc:
                f.write(f"Failed to run {title}: {exc}\n\n")


def write_incident_template(
    incident_notes: Path,
    start_time: str,
    end_time: str,
    total_samples: int,
    disconnect_events: int,
    reconnect_events: int,
    stall_events: int,
    reorg_events: int,
    max_height_gap: int,
) -> None:
    with incident_notes.open("w", encoding="utf-8") as f:
        f.write("# Incident Notes - P2P Stability Window\n\n")
        f.write("## Run metadata\n")
        f.write(f"- Start (UTC): {start_time}\n")
        f.write(f"- End (UTC): {end_time}\n")
        f.write(f"- Total samples: {total_samples}\n\n")
        f.write("## Auto-detected events\n")
        f.write(f"- Disconnect events (>60s peer=0): {disconnect_events}\n")
        f.write(f"- Reconnect events: {reconnect_events}\n")
        f.write(f"- Sync stall events (>120s flat height): {stall_events}\n")
        f.write(f"- Reorg-like drops (height rollback): {reorg_events}\n")
        f.write(f"- Max absolute height gap between nodes: {max_height_gap}\n\n")
        f.write("## Manual analysis\n")
        f.write("- Root cause summary:\n")
        f.write("- Mitigation applied:\n")
        f.write("- Follow-up actions:\n")
        f.write("- Final verdict against DoD:\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect 24h P2P stability evidence.")
    parser.add_argument("--rpc-a", default="http://217.216.109.5:8545", help="Validator A RPC URL")
    parser.add_argument("--rpc-b", default="http://46.250.244.4:8545", help="Validator B RPC URL")
    parser.add_argument("--host-a", default="217.216.109.5", help="Validator A host for ping/traceroute")
    parser.add_argument("--host-b", default="46.250.244.4", help="Validator B host for ping/traceroute")
    parser.add_argument("--name-a", default="validator-a", help="Display name for validator A")
    parser.add_argument("--name-b", default="validator-b", help="Display name for validator B")
    parser.add_argument("--duration-hours", type=float, default=24.0, help="Total monitoring hours")
    parser.add_argument("--interval-seconds", type=int, default=30, help="Poll interval")
    parser.add_argument("--output-root", default="services/core/reports", help="Base output folder")
    parser.add_argument("--rpc-timeout", type=int, default=15, help="RPC call timeout in seconds")
    parser.add_argument("--rpc-retries", type=int, default=2, help="Retries per RPC call on transient failure")
    parser.add_argument("--snapshot", action="store_true", help="Quick snapshot mode: 5 samples, skip network-quality")
    parser.add_argument("--webhook", default="", help="Discord/Slack webhook URL for alerts (optional)")
    args = parser.parse_args()

    if args.interval_seconds < 5:
        print("interval-seconds must be >= 5", file=sys.stderr)
        return 2

    webhook_url: str = args.webhook.strip()
    if webhook_url:
        print(f"Webhook alerts enabled: {len(webhook_url)} chars")

    if args.snapshot:
        # 5 samples with zero dwell — sets duration just enough for the 5 loops
        args.duration_hours = max(0.001, args.interval_seconds * 5 / 3600.0)
        print(f"Snapshot mode: {5} samples at {args.interval_seconds}s interval")

    started = now_utc()
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_dir = Path(args.output_root.strip("/").strip("\\")) / f"p2p-stability-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    peer_events_path = out_dir / "peer-events.log"
    sync_csv_path = out_dir / "sync-height.csv"
    network_quality_path = out_dir / "network-quality.txt"
    incident_notes_path = out_dir / "incident-notes.md"

    append_peer_event(
        peer_events_path,
        f"Monitoring started. out_dir={out_dir} timeout={args.rpc_timeout}s retries={args.rpc_retries} snapshot={args.snapshot}",
    )
    append_peer_event(peer_events_path, f"rpc_a={args.rpc_a}, rpc_b={args.rpc_b}")

    with sync_csv_path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(
            [
                "timestamp_utc",
                "a_ok",
                "a_height",
                "a_peers",
                "b_ok",
                "b_height",
                "b_peers",
                "height_delta_a_minus_b",
            ]
        )

    total_seconds = int(args.duration_hours * 3600)
    total_loops = max(1, total_seconds // args.interval_seconds)

    zero_peer_since: dict[str, float | None] = {args.name_a: None, args.name_b: None}
    last_peers: dict[str, int | None] = {args.name_a: None, args.name_b: None}
    last_height: dict[str, int | None] = {args.name_a: None, args.name_b: None}
    last_height_change_ts: dict[str, float | None] = {args.name_a: None, args.name_b: None}

    disconnect_events = 0
    reconnect_events = 0
    stall_events = 0
    reorg_events = 0
    max_gap = 0

    for _ in range(total_loops):
        loop_start = time.time()
        ts = now_utc()

        a = get_node_state(args.name_a, args.rpc_a, args.rpc_timeout, args.rpc_retries)
        b = get_node_state(args.name_b, args.rpc_b, args.rpc_timeout, args.rpc_retries)

        a_height = a["height"] if a["ok"] else None
        b_height = b["height"] if b["ok"] else None
        a_peers = a["peers"] if a["ok"] else None
        b_peers = b["peers"] if b["ok"] else None

        delta = None
        if isinstance(a_height, int) and isinstance(b_height, int):
            delta = a_height - b_height
            max_gap = max(max_gap, abs(delta))

        with sync_csv_path.open("a", encoding="utf-8", newline="") as csv_file:
            writer = csv.writer(csv_file)
            writer.writerow([ts, int(a["ok"]), a_height, a_peers, int(b["ok"]), b_height, b_peers, delta])

        for node in (a, b):
            name = node["name"]
            peers = node["peers"] if node["ok"] else None
            height = node["height"] if node["ok"] else None

            if node["ok"] and isinstance(peers, int):
                prev = last_peers[name]
                if prev is not None and prev == 0 and peers > 0:
                    reconnect_events += 1
                    append_peer_event(peer_events_path, f"{name}: RECONNECT peers={peers}")
                    send_webhook_alert(webhook_url, f"\u2705 {name} reconnected", f"Peers: {peers}")

                if peers == 0:
                    if zero_peer_since[name] is None:
                        zero_peer_since[name] = loop_start
                    elif loop_start - zero_peer_since[name] > 60 and prev == 0:
                        disconnect_events += 1
                        append_peer_event(peer_events_path, f"{name}: DISCONNECT >60s peers=0")
                        zero_peer_since[name] = loop_start + 999999
                        send_webhook_alert(webhook_url, f"\u274C {name} disconnected >60s", "Peers: 0 — node may need attention")
                else:
                    zero_peer_since[name] = None
                last_peers[name] = peers

            if node["ok"] and isinstance(height, int):
                prev_h = last_height[name]
                if prev_h is not None:
                    if height < prev_h:
                        reorg_events += 1
                        append_peer_event(peer_events_path, f"{name}: REORG-LIKE height {prev_h} -> {height}")
                        send_webhook_alert(webhook_url, f"\u26A0\uFE0F {name} reorg-like", f"Height dropped: {prev_h} -> {height}")
                    elif height > prev_h:
                        last_height_change_ts[name] = loop_start
                    else:
                        changed_at = last_height_change_ts[name]
                        if changed_at is not None and loop_start - changed_at > 120:
                            stall_events += 1
                            append_peer_event(peer_events_path, f"{name}: STALL >120s at height={height}")
                            last_height_change_ts[name] = loop_start + 999999
                            send_webhook_alert(webhook_url, f"\u23F3 {name} sync stalled >120s", f"Height={height} — not advancing")
                else:
                    last_height_change_ts[name] = loop_start
                last_height[name] = height

            if not node["ok"]:
                append_peer_event(peer_events_path, f"{name}: RPC_ERROR {node['error']}")

        elapsed = time.time() - loop_start
        sleep_for = max(0, args.interval_seconds - elapsed)
        time.sleep(sleep_for)

    if not args.snapshot:
        run_network_quality_report(network_quality_path, args.host_a, args.host_b)
    else:
        network_quality_path.write_text(f"# Network quality report — skipped in snapshot mode ({stamp})\n", encoding="utf-8")

    ended = now_utc()
    write_incident_template(
        incident_notes_path,
        started,
        ended,
        total_loops,
        disconnect_events,
        reconnect_events,
        stall_events,
        reorg_events,
        max_gap,
    )
    append_peer_event(peer_events_path, f"Monitoring completed. ended_at={ended}")

    print(f"Evidence generated at: {out_dir}")
    print("Files: peer-events.log, sync-height.csv, network-quality.txt, incident-notes.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

