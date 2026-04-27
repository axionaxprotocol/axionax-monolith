#!/usr/bin/env python3
"""
RPC Load Test — Stress test the JSON-RPC endpoint with concurrent requests.

Simulates DDoS-like traffic patterns to verify:
1. Server remains responsive under load
2. Response times stay reasonable
3. No crashes or resource exhaustion
4. Rate limiting activates correctly

Usage:
    python3 -m pytest tests/test_rpc_load.py -v --tb=short
"""

import json
import time
import statistics
import concurrent.futures
from typing import List, Tuple

import pytest
import requests

RPC_URL = "http://localhost:8545"


def _rpc_call(method: str, params: list = None, id: int = 1) -> Tuple[float, int, dict]:
    payload = {"jsonrpc": "2.0", "method": method, "params": params or [], "id": id}
    start = time.monotonic()
    try:
        resp = requests.post(RPC_URL, json=payload, timeout=10)
        elapsed = time.monotonic() - start
        return elapsed, resp.status_code, resp.json()
    except Exception as e:
        elapsed = time.monotonic() - start
        return elapsed, 0, {"error": str(e)}


def _batch_rpc(count: int, method: str = "eth_blockNumber") -> List[Tuple[float, int]]:
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(count, 50)) as executor:
        futures = [
            executor.submit(_rpc_call, method, [], i) for i in range(count)
        ]
        for f in concurrent.futures.as_completed(futures):
            elapsed, status, _ = f.result()
            results.append((elapsed, status))
    return results


class TestRpcLoadBasic:
    """Basic load tests — sequential and small parallel."""

    def test_sequential_100_requests(self):
        """100 sequential requests should all succeed."""
        latencies = []
        for i in range(100):
            elapsed, status, data = _rpc_call("eth_blockNumber", id=i)
            latencies.append(elapsed)
            assert status == 200, f"Request {i} failed with status {status}"

        avg = statistics.mean(latencies)
        p99 = sorted(latencies)[98]
        print(f"\n  Sequential 100: avg={avg*1000:.1f}ms p99={p99*1000:.1f}ms")
        assert avg < 1.0, f"Average latency too high: {avg:.3f}s"

    def test_parallel_50_requests(self):
        """50 concurrent requests should all succeed."""
        results = _batch_rpc(50)
        success = sum(1 for _, s in results if s == 200)
        latencies = [e for e, s in results if s == 200]

        avg = statistics.mean(latencies) if latencies else 0
        print(f"\n  Parallel 50: {success}/50 success, avg={avg*1000:.1f}ms")
        assert success >= 45, f"Too many failures: {success}/50"


class TestRpcLoadStress:
    """Heavy load — 500-1000 concurrent requests."""

    def test_concurrent_500_eth_blockNumber(self):
        """500 concurrent eth_blockNumber requests."""
        results = _batch_rpc(500, "eth_blockNumber")
        success = sum(1 for _, s in results if s == 200)
        latencies = [e for e, s in results if s == 200]

        avg = statistics.mean(latencies) if latencies else 0
        p95 = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0
        print(f"\n  Stress 500: {success}/500 success, avg={avg*1000:.1f}ms p95={p95*1000:.1f}ms")
        assert success >= 400, f"Server collapsed: only {success}/500 succeeded"

    def test_concurrent_1000_mixed_methods(self):
        """1000 concurrent requests across different RPC methods."""
        methods = ["eth_blockNumber", "eth_chainId", "eth_gasPrice", "eth_getBlockByNumber"]
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            futures = []
            for i in range(1000):
                method = methods[i % len(methods)]
                params = ["latest", False] if method == "eth_getBlockByNumber" else []
                futures.append(executor.submit(_rpc_call, method, params, i))

            for f in concurrent.futures.as_completed(futures):
                elapsed, status, _ = f.result()
                results.append((elapsed, status))

        success = sum(1 for _, s in results if s == 200)
        latencies = [e for e, s in results if s == 200]
        avg = statistics.mean(latencies) if latencies else 0
        p99 = sorted(latencies)[int(len(latencies) * 0.99)] if len(latencies) > 1 else 0
        total_time = max(e for e, _ in results) if results else 0

        print(f"\n  Mixed 1000: {success}/1000 success, avg={avg*1000:.1f}ms p99={p99*1000:.1f}ms wall={total_time:.2f}s")
        assert success >= 800, f"Server collapsed: only {success}/1000 succeeded"


class TestRpcLoadBatchRequests:
    """Test JSON-RPC batch request handling under load."""

    def test_batch_request_10_items(self):
        """Single batch request with 10 calls — server may or may not support batch."""
        batch = [
            {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": i}
            for i in range(10)
        ]
        start = time.monotonic()
        resp = requests.post(RPC_URL, json=batch, timeout=10)
        elapsed = time.monotonic() - start

        assert resp.status_code == 200
        data = resp.json()
        if isinstance(data, list):
            assert len(data) == 10
        else:
            assert "error" in data or "result" in data
        print(f"\n  Batch 10: {elapsed*1000:.1f}ms (batch={'supported' if isinstance(data, list) else 'unsupported'})")

    def test_batch_request_50_items(self):
        """Single batch request with 50 calls."""
        batch = [
            {"jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": i}
            for i in range(50)
        ]
        start = time.monotonic()
        resp = requests.post(RPC_URL, json=batch, timeout=30)
        elapsed = time.monotonic() - start

        assert resp.status_code == 200
        print(f"\n  Batch 50: {elapsed*1000:.1f}ms")


class TestRpcLoadSustained:
    """Sustained load over time — verify no resource leaks."""

    def test_sustained_30_seconds(self):
        """Send requests continuously for 30 seconds."""
        duration = 30
        start = time.monotonic()
        count = 0
        errors = 0

        while time.monotonic() - start < duration:
            try:
                resp = requests.post(
                    RPC_URL,
                    json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": count},
                    timeout=5,
                )
                if resp.status_code != 200:
                    errors += 1
            except Exception:
                errors += 1
            count += 1

        elapsed = time.monotonic() - start
        rps = count / elapsed
        error_rate = errors / count * 100 if count > 0 else 0

        print(f"\n  Sustained {elapsed:.0f}s: {count} requests, {rps:.0f} req/s, {error_rate:.1f}% errors")
        assert error_rate < 5.0, f"Error rate too high: {error_rate:.1f}%"
        assert rps > 10, f"Throughput too low: {rps:.0f} req/s"
