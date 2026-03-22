"""Minimal JSON-RPC helpers for the optimization suite (stdlib + requests only)."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Mapping, MutableMapping, Optional

import requests


@dataclass(frozen=True)
class RpcCallResult:
    """Outcome of a single HTTP/RPC attempt."""

    ok: bool
    http_status: Optional[int]
    latency_ms: float
    error: Optional[str]
    rpc_error: Optional[Mapping[str, Any]]
    result: Any


def jsonrpc_post(
    url: str,
    method: str,
    params: Optional[list[Any]] = None,
    *,
    timeout_sec: float = 15.0,
    session: Optional[requests.Session] = None,
    extra_headers: Optional[MutableMapping[str, str]] = None,
    raw_body: Optional[bytes] = None,
) -> RpcCallResult:
    """
    POST JSON-RPC. If raw_body is set, method/params are ignored and body is sent as-is.
    """
    sess = session or requests.Session()
    headers: MutableMapping[str, str] = {"Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)

    start = time.perf_counter()
    try:
        if raw_body is not None:
            r = sess.post(url, data=raw_body, headers=headers, timeout=timeout_sec)
        else:
            body = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params if params is not None else [],
                "id": 1,
            }
            r = sess.post(url, data=json.dumps(body), headers=headers, timeout=timeout_sec)
        latency_ms = (time.perf_counter() - start) * 1000.0
        try:
            data = r.json()
        except ValueError:
            return RpcCallResult(
                ok=False,
                http_status=r.status_code,
                latency_ms=latency_ms,
                error="response_not_json",
                rpc_error=None,
                result=None,
            )
        if not isinstance(data, dict):
            return RpcCallResult(
                ok=False,
                http_status=r.status_code,
                latency_ms=latency_ms,
                error="response_not_object",
                rpc_error=None,
                result=None,
            )
        rpc_err = data.get("error")
        if rpc_err is not None:
            return RpcCallResult(
                ok=False,
                http_status=r.status_code,
                latency_ms=latency_ms,
                error=None,
                rpc_error=rpc_err if isinstance(rpc_err, dict) else {"message": str(rpc_err)},
                result=data.get("result"),
            )
        if r.status_code >= 400:
            return RpcCallResult(
                ok=False,
                http_status=r.status_code,
                latency_ms=latency_ms,
                error=f"http_{r.status_code}",
                rpc_error=None,
                result=None,
            )
        return RpcCallResult(
            ok=True,
            http_status=r.status_code,
            latency_ms=latency_ms,
            error=None,
            rpc_error=None,
            result=data.get("result") if isinstance(data, dict) else None,
        )
    except requests.RequestException as e:
        latency_ms = (time.perf_counter() - start) * 1000.0
        return RpcCallResult(
            ok=False,
            http_status=None,
            latency_ms=latency_ms,
            error=str(e),
            rpc_error=None,
            result=None,
        )


def http_get(url: str, *, timeout_sec: float = 10.0) -> tuple[int, float]:
    """GET request; returns (status_code, latency_ms)."""
    start = time.perf_counter()
    try:
        r = requests.get(url, timeout=timeout_sec)
        return r.status_code, (time.perf_counter() - start) * 1000.0
    except requests.RequestException:
        return -1, (time.perf_counter() - start) * 1000.0
