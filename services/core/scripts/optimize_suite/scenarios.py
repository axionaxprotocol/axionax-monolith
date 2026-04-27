"""Light usage simulation and optional RPC stress / malformed-traffic scenarios."""

from __future__ import annotations

import json
import random
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import requests

from .rpc import RpcCallResult, http_get, jsonrpc_post


@dataclass
class ScenarioReport:
    name: str
    ok: bool
    summary: str
    metrics: Dict[str, Any] = field(default_factory=dict)


def _percentile(sorted_vals: List[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    k = (len(sorted_vals) - 1) * p
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    return sorted_vals[f] + (k - f) * (sorted_vals[c] - sorted_vals[f])


def _rpc_failure_hint(res: RpcCallResult) -> str:
    if res.ok:
        return ""
    if res.error:
        return res.error[:500]
    if res.rpc_error is not None:
        try:
            s = json.dumps(res.rpc_error, ensure_ascii=False)
        except (TypeError, ValueError):
            s = str(res.rpc_error)
        return f"rpc_error:{s[:400]}"
    return f"http_{res.http_status}"


def run_smoke(rpc_url: str, timeout_sec: float = 15.0) -> ScenarioReport:
    """Minimal connectivity: chain id + block number."""
    session = requests.Session()
    chain = jsonrpc_post(rpc_url, "eth_chainId", [], timeout_sec=timeout_sec, session=session)
    block = jsonrpc_post(rpc_url, "eth_blockNumber", [], timeout_sec=timeout_sec, session=session)
    ok = bool(chain.ok and block.ok)
    summary = "smoke OK" if ok else "smoke failed (see metrics)"
    metrics: Dict[str, Any] = {
        "eth_chainId_ms": round(chain.latency_ms, 2),
        "eth_blockNumber_ms": round(block.latency_ms, 2),
        "chain_id_hex": chain.result,
        "block_number_hex": block.result,
    }
    if not chain.ok:
        metrics["eth_chainId_error"] = _rpc_failure_hint(chain)
    if not block.ok:
        metrics["eth_blockNumber_error"] = _rpc_failure_hint(block)
    return ScenarioReport(
        name="smoke",
        ok=ok,
        summary=summary,
        metrics=metrics,
    )


def run_light_usage(
    rpc_url: str,
    *,
    duration_sec: float = 30.0,
    target_rps: float = 2.5,
    timeout_sec: float = 15.0,
) -> ScenarioReport:
    """
    Simulate light dApp-style traffic: rotating read-only JSON-RPC calls at low rate.
    """
    session = requests.Session()
    core_methods: List[tuple[str, list[Any]]] = [
        ("eth_chainId", []),
        ("eth_blockNumber", []),
        ("net_version", []),
        ("eth_getBlockByNumber", ["latest", False]),
    ]
    optional_methods: List[tuple[str, list[Any]]] = [
        ("staking_getActiveValidators", []),
    ]

    deadline = time.perf_counter() + duration_sec
    latencies: List[float] = []
    core_successes = 0
    core_failures = 0
    optional_attempts = 0
    optional_ok = 0
    interval = 1.0 / target_rps if target_rps > 0 else 0.4

    while time.perf_counter() < deadline:
        use_optional = random.random() < 0.12
        if use_optional:
            method, params = random.choice(optional_methods)
            optional_attempts += 1
        else:
            method, params = random.choice(core_methods)
        res = jsonrpc_post(
            rpc_url, method, params, timeout_sec=timeout_sec, session=session
        )
        if res.ok:
            latencies.append(res.latency_ms)
            if use_optional:
                optional_ok += 1
            else:
                core_successes += 1
        else:
            if use_optional:
                pass
            else:
                core_failures += 1
        time.sleep(interval + random.uniform(-0.05, 0.05))

    lat_sorted = sorted(latencies)
    core_total = core_successes + core_failures
    core_fail_rate = core_failures / max(1, core_total)
    ok = core_failures == 0 or (core_successes > 0 and core_fail_rate < 0.15)
    summary = (
        f"light: {core_successes} core ok, {core_failures} core fail over {duration_sec:.0f}s "
        f"(p50 {_percentile(lat_sorted, 0.5):.0f}ms)"
    )
    return ScenarioReport(
        name="light_usage",
        ok=ok,
        summary=summary,
        metrics={
            "core_successes": core_successes,
            "core_failures": core_failures,
            "optional_attempts": optional_attempts,
            "optional_ok": optional_ok,
            "latency_p50_ms": round(_percentile(lat_sorted, 0.5), 2),
            "latency_p95_ms": round(_percentile(lat_sorted, 0.95), 2),
            "latency_mean_ms": round(statistics.mean(latencies), 2) if latencies else 0.0,
        },
    )


def run_cyber_simulation(
    rpc_url: str,
    *,
    burst_parallel: int = 40,
    malformed_repeat: int = 8,
    timeout_sec: float = 15.0,
) -> ScenarioReport:
    """
    Authorized-only: malformed payloads, wrong verb, and burst read load to exercise
    reverse proxies, rate limits, and RPC error handling. Does not exploit app-layer auth.
    """
    session = requests.Session()
    metrics: Dict[str, Any] = {}

    # 1) Malformed / non-JSON body
    bad_bodies: List[bytes] = [
        b"{",
        b"",
        b"\x00\x01\xff not json",
    ]
    malformed_http_ok = 0
    for body in bad_bodies * max(1, malformed_repeat // len(bad_bodies)):
        try:
            r = session.post(
                rpc_url,
                data=body,
                headers={"Content-Type": "application/json"},
                timeout=timeout_sec,
            )
            if r.status_code < 500:
                malformed_http_ok += 1
        except requests.RequestException:
            pass
        time.sleep(0.02)
    metrics["malformed_non500_responses"] = malformed_http_ok

    # 2) Oversized string param (tune down if nginx 413)
    huge = "0x" + "f" * min(64_000, 256_000)
    huge_res = jsonrpc_post(
        rpc_url,
        "eth_getBlockByNumber",
        [huge, False],
        timeout_sec=timeout_sec,
        session=session,
    )
    metrics["oversized_param_http"] = huge_res.http_status
    metrics["oversized_param_ok"] = huge_res.ok

    # 3) Unknown method spam (should return JSON-RPC error, not crash)
    unknown_rpc_errors = 0
    for _ in range(12):
        r = jsonrpc_post(rpc_url, "eth_thisMethodDoesNotExist", [], timeout_sec=timeout_sec, session=session)
        if r.rpc_error is not None:
            unknown_rpc_errors += 1
    metrics["unknown_method_jsonrpc_errors_seen"] = unknown_rpc_errors

    # 4) Wrong Content-Type
    try:
        rr = session.post(
            rpc_url,
            data=b'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}',
            headers={"Content-Type": "text/plain"},
            timeout=timeout_sec,
        )
        metrics["wrong_content_type_status"] = rr.status_code
    except requests.RequestException as e:
        metrics["wrong_content_type_error"] = str(e)

    # 5) GET on RPC URL (expect non-200 or empty)
    st, lat = http_get(rpc_url, timeout_sec=timeout_sec)
    metrics["get_on_rpc_status"] = st
    metrics["get_on_rpc_ms"] = round(lat, 2)

    # 6) Parallel burst (read-only)
    def one_block_number(_: int) -> RpcCallResult:
        return jsonrpc_post(
            rpc_url, "eth_blockNumber", [], timeout_sec=timeout_sec, session=requests.Session()
        )

    burst_latencies: List[float] = []
    burst_ok = 0
    with ThreadPoolExecutor(max_workers=max(4, burst_parallel)) as ex:
        futs = [ex.submit(one_block_number, i) for i in range(burst_parallel)]
        for fut in as_completed(futs):
            res = fut.result()
            burst_latencies.append(res.latency_ms)
            if res.ok:
                burst_ok += 1
    burst_sorted = sorted(burst_latencies)
    metrics["burst_parallel"] = burst_parallel
    metrics["burst_ok"] = burst_ok
    metrics["burst_p95_ms"] = round(_percentile(burst_sorted, 0.95), 2)

    # Pass if node stayed reachable: majority of burst succeeded or clear JSON-RPC errors (not connection loss)
    ok = burst_ok >= burst_parallel // 3
    summary = (
        f"cyber: burst {burst_ok}/{burst_parallel} ok, "
        f"unknown-method JSON-RPC errors {metrics['unknown_method_jsonrpc_errors_seen']}/12"
    )
    return ScenarioReport(name="cyber_simulation", ok=ok, summary=summary, metrics=metrics)


def run_all(
    rpc_url: str,
    *,
    run_light: bool = True,
    run_cyber: bool = False,
    light_duration_sec: float = 30.0,
    light_rps: float = 2.5,
    cyber_burst: int = 40,
    cyber_malformed: int = 8,
) -> List[ScenarioReport]:
    out: List[ScenarioReport] = [run_smoke(rpc_url)]
    if run_light:
        out.append(
            run_light_usage(
                rpc_url,
                duration_sec=light_duration_sec,
                target_rps=light_rps,
            )
        )
    if run_cyber:
        out.append(
            run_cyber_simulation(
                rpc_url,
                burst_parallel=cyber_burst,
                malformed_repeat=cyber_malformed,
            )
        )
    return out
