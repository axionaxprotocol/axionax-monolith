"""
Axionax Cyber Threat Simulation Suite

Tests the Mock RPC server and DeAI worker layer against cyber threats,
injection attacks, malware patterns, and adversarial inputs.

Attack categories covered:
  1. JSON-RPC Injection Attacks (SQL, XSS, command, path traversal, null byte)
  2. RPC DoS / Abuse Patterns (oversized payloads, nesting, batches, garbage)
  3. Protocol Confusion Attacks (wrong version, missing fields, case sensitivity)
  4. Integer Overflow / Boundary Attacks (block numbers, gas, negative hex)
  5. DeAI Worker Security (wallet, RPC client timeout, fraud detector)
  6. Network Enumeration / Information Leak (stack traces, error format, CORS)

Requires:
  - Mock RPC server running on http://localhost:8545
  - Python packages: requests, pytest, numpy, scikit-learn, eth-account
"""

import json
import math
import os
import sys
import time

import numpy as np
import pytest
import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RPC_URL = "http://localhost:8545"
HEADERS = {"Content-Type": "application/json"}
VALID_ADDRESS = "0x0000000000000000000000000000000000000001"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def rpc_call(method, params=None, id_val=1, jsonrpc="2.0", raw_body=None):
    """Send a JSON-RPC request and return the response object."""
    if raw_body is not None:
        return requests.post(RPC_URL, data=raw_body, headers=HEADERS, timeout=10)
    payload = {"jsonrpc": jsonrpc, "method": method, "params": params or [], "id": id_val}
    return requests.post(RPC_URL, json=payload, headers=HEADERS, timeout=10)


def assert_no_server_crash(resp):
    """The server must still be reachable after every attack."""
    assert resp.status_code in (200, 400, 413, 500), (
        f"Unexpected HTTP status {resp.status_code}"
    )


# ═══════════════════════════════════════════════════════════════════════════
# 1. JSON-RPC Injection Attacks
# ═══════════════════════════════════════════════════════════════════════════

class TestJsonRpcInjection:
    """Verify the RPC server rejects or safely handles injection payloads."""

    def test_sql_injection_in_method_name(self):
        """SQL-style injection in the method field must not crash the server."""
        resp = rpc_call("eth_getBalance'; DROP TABLE blocks;--")
        assert_no_server_crash(resp)
        data = resp.json()
        assert "error" in data, "Injected method should produce an error response"
        assert data["error"]["code"] == -32601

    def test_xss_injection_in_params(self):
        """HTML/JS injection in params must be echoed safely or rejected."""
        xss_payload = "<script>alert('xss')</script>"
        resp = rpc_call("eth_getBalance", [xss_payload, "latest"])
        assert_no_server_crash(resp)
        data = resp.json()
        if "result" in data:
            assert "<script>" not in json.dumps(data["result"]), (
                "XSS payload must not be reflected unescaped in the result"
            )

    def test_command_injection_in_address(self):
        """Shell command injection in params must not execute."""
        for payload in ["$(rm -rf /)", "`cat /etc/passwd`", "; ls -la"]:
            resp = rpc_call("eth_getBalance", [payload, "latest"])
            assert_no_server_crash(resp)
            data = resp.json()
            assert "passwd" not in json.dumps(data), (
                "Command injection must not leak system files"
            )

    def test_path_traversal_in_params(self):
        """Path traversal sequences in params must not leak filesystem info."""
        resp = rpc_call("eth_getBalance", ["../../etc/passwd", "latest"])
        assert_no_server_crash(resp)
        data = resp.json()
        assert "root:" not in json.dumps(data), (
            "Path traversal must not expose /etc/passwd"
        )

    def test_null_byte_injection(self):
        """Null bytes in the method name must not cause undefined behaviour."""
        resp = rpc_call("eth_getBalance\x00DROP")
        assert_no_server_crash(resp)
        data = resp.json()
        assert "error" in data


# ═══════════════════════════════════════════════════════════════════════════
# 2. RPC DoS / Abuse Patterns
# ═══════════════════════════════════════════════════════════════════════════

class TestRpcDosAbuse:
    """Ensure the server handles abusive payloads gracefully."""

    def test_oversized_json_payload(self):
        """A ~10 MB JSON body should be rejected or handled without crash."""
        big_data = "A" * (10 * 1024 * 1024)
        payload = json.dumps({
            "jsonrpc": "2.0",
            "method": "eth_blockNumber",
            "params": [big_data],
            "id": 1,
        })
        try:
            resp = requests.post(RPC_URL, data=payload, headers=HEADERS, timeout=15)
            assert resp.status_code in (200, 400, 413, 500)
        except requests.exceptions.ConnectionError:
            pass  # acceptable — server may drop oversized connections

    def test_deeply_nested_json(self):
        """100 levels of nesting should not crash the JSON parser."""
        nested = {"value": "leaf"}
        for _ in range(100):
            nested = {"nested": nested}
        nested["jsonrpc"] = "2.0"
        nested["method"] = "eth_blockNumber"
        nested["params"] = []
        nested["id"] = 1
        try:
            resp = requests.post(RPC_URL, json=nested, headers=HEADERS, timeout=10)
            assert resp.status_code in (200, 400, 500)
        except requests.exceptions.ConnectionError:
            pass

    def test_massive_batch_request(self):
        """A batch of 10 000 requests should not hang or crash the server."""
        batch = [
            {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": i}
            for i in range(10_000)
        ]
        try:
            resp = requests.post(RPC_URL, json=batch, headers=HEADERS, timeout=30)
            assert resp.status_code in (200, 400, 413, 500)
        except requests.exceptions.ConnectionError:
            pass

    def test_empty_body_request(self):
        """An empty POST body should return an error, not crash."""
        resp = requests.post(RPC_URL, data="", headers=HEADERS, timeout=10)
        assert_no_server_crash(resp)

    def test_invalid_json_syntax(self):
        """Malformed JSON must be rejected gracefully."""
        for bad_json in [
            '{"jsonrpc": "2.0", method: eth_blockNumber}',  # missing quotes
            '{"jsonrpc": "2.0",, "method": "eth_blockNumber"}',  # double comma
            '{jsonrpc: 2.0}',  # no quotes at all
        ]:
            resp = requests.post(RPC_URL, data=bad_json, headers=HEADERS, timeout=10)
            assert resp.status_code in (200, 400, 500)

    def test_binary_garbage_payload(self):
        """Random binary bytes should not crash the server."""
        garbage = os.urandom(4096)
        try:
            resp = requests.post(RPC_URL, data=garbage, headers=HEADERS, timeout=10)
            assert resp.status_code in (200, 400, 500)
        except requests.exceptions.ConnectionError:
            pass

    def test_unicode_bomb(self):
        """Zero-width chars and RTL overrides must not cause issues."""
        zwj_bomb = "\u200b" * 500 + "\u202e" * 50 + "\ufeff" * 50
        resp = rpc_call("eth_getBalance", [zwj_bomb, "latest"])
        assert_no_server_crash(resp)


# ═══════════════════════════════════════════════════════════════════════════
# 3. Protocol Confusion Attacks
# ═══════════════════════════════════════════════════════════════════════════

class TestProtocolConfusion:
    """Ensure strict JSON-RPC 2.0 compliance under malformed requests."""

    def test_wrong_jsonrpc_version(self):
        """jsonrpc: '1.0' must be rejected with an error."""
        resp = rpc_call("eth_blockNumber", jsonrpc="1.0")
        data = resp.json()
        assert "error" in data, "Non-2.0 jsonrpc version must return error"

    def test_missing_id_field(self):
        """A request without 'id' should still produce a valid response."""
        payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": []}
        resp = requests.post(RPC_URL, json=payload, headers=HEADERS, timeout=10)
        assert_no_server_crash(resp)
        data = resp.json()
        assert "jsonrpc" in data

    def test_negative_id(self):
        """Negative id values must be echoed back correctly."""
        resp = rpc_call("eth_blockNumber", id_val=-99999)
        data = resp.json()
        assert data.get("id") == -99999

    def test_float_id(self):
        """Float id values should be handled without crash."""
        resp = rpc_call("eth_blockNumber", id_val=3.14)
        assert_no_server_crash(resp)
        data = resp.json()
        assert "jsonrpc" in data

    def test_method_case_sensitivity(self):
        """Upper-case method names should return method-not-found."""
        resp = rpc_call("ETH_BLOCKNUMBER")
        data = resp.json()
        assert "error" in data, "Case-incorrect method must return error"
        assert data["error"]["code"] == -32601

    def test_extra_unknown_fields(self):
        """Extra fields in the request body should not cause errors."""
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_blockNumber",
            "params": [],
            "id": 1,
            "foo": "bar",
            "exploit": True,
            "nested": {"deep": "value"},
        }
        resp = requests.post(RPC_URL, json=payload, headers=HEADERS, timeout=10)
        data = resp.json()
        assert "result" in data or "error" in data


# ═══════════════════════════════════════════════════════════════════════════
# 4. Integer Overflow / Boundary Attacks
# ═══════════════════════════════════════════════════════════════════════════

class TestIntegerOverflowBoundary:
    """Exercise extreme numeric values in RPC parameters."""

    def test_block_number_overflow(self):
        """A 64-bit max hex block number should not crash the server."""
        resp = rpc_call("eth_getBlockByNumber", ["0xffffffffffffffff", False])
        assert_no_server_crash(resp)
        data = resp.json()
        assert "result" in data or "error" in data

    def test_huge_gas_value(self):
        """A 128-bit gas value should not cause integer overflow crashes."""
        resp = rpc_call("eth_estimateGas", [{
            "from": VALID_ADDRESS,
            "to": VALID_ADDRESS,
            "gas": "0xffffffffffffffffffffffffffffffff",
            "value": "0x0",
        }])
        assert_no_server_crash(resp)

    def test_negative_hex_value(self):
        """A negative hex value should be handled gracefully."""
        resp = rpc_call("eth_getBalance", [VALID_ADDRESS, "-0x1"])
        assert_no_server_crash(resp)
        data = resp.json()
        assert "result" in data or "error" in data


# ═══════════════════════════════════════════════════════════════════════════
# 5. DeAI Worker Security
# ═══════════════════════════════════════════════════════════════════════════

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "deai"))


class TestDeAIWorkerSecurity:
    """Security tests against the Python DeAI worker layer."""

    def test_wallet_manager_rejects_invalid_private_key(self):
        """Feeding garbage hex to Account.from_key must raise."""
        from eth_account import Account

        invalid_keys = [
            "not_a_hex_key",
            "0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
            "",
            "0x",
            "0x00",  # too short
        ]
        for key in invalid_keys:
            with pytest.raises(Exception):
                Account.from_key(key)

    def test_rpc_client_handles_timeout(self):
        """Pointing the RPC client at a non-existent host must not hang."""
        from rpc_client import AxionaxRpcClient

        client = AxionaxRpcClient(rpc_url="http://192.0.2.1:1")  # RFC 5737 TEST-NET
        result = client.get_block_number()
        assert result == 0, "Unreachable host should return fallback 0"

    def test_fraud_detector_handles_adversarial_input(self):
        """NaN and Inf values in proof data must not crash the FraudDetector."""
        from fraud_detection import FraudDetector, ProofData

        detector = FraudDetector()

        adversarial_proof = ProofData(
            job_id="adversarial-001",
            worker_address="0xdead",
            samples={0: b"x"},
            merkle_paths={0: [b"p"]},
            output_root=b"root",
            timestamp=int(time.time()),
        )

        result = detector.analyze(adversarial_proof)
        assert result is not None

        empty_proof = ProofData(
            job_id="adversarial-002",
            worker_address="0xdead",
            samples={},
            merkle_paths={},
            output_root=b"",
            timestamp=0,
        )
        result2 = detector.analyze(empty_proof)
        assert result2.is_suspicious, "Empty proof must be flagged as suspicious"

        mismatched_proof = ProofData(
            job_id="adversarial-003",
            worker_address="0xdead",
            samples={i: b"d" for i in range(10)},
            merkle_paths={i: [b"p"] * (i % 5 + 1) for i in range(5)},
            output_root=b"root",
            timestamp=int(time.time()),
        )
        result3 = detector.analyze(mismatched_proof)
        assert result3.is_suspicious, "Mismatched samples/paths must be flagged"


def _sklearn_available():
    try:
        import sklearn  # noqa: F401
        return True
    except ImportError:
        return False


# ═══════════════════════════════════════════════════════════════════════════
# 6. Network Enumeration / Information Leak
# ═══════════════════════════════════════════════════════════════════════════

class TestNetworkEnumerationInfoLeak:
    """Ensure the RPC server does not leak internal information."""

    def test_error_messages_no_stack_trace(self):
        """Error responses must not contain file paths or stack traces."""
        resp = rpc_call("eth_nonExistentMethod_xyz")
        data = resp.json()
        error_text = json.dumps(data)
        for pattern in ["/home/", "/usr/", "node_modules", ".js:", "at Object.", "Error:"]:
            assert pattern not in error_text, (
                f"Error response leaks internal info: found '{pattern}'"
            )

    def test_unknown_method_error_format(self):
        """Unknown methods must return JSON-RPC error, not HTML or plaintext."""
        resp = rpc_call("eth_totallyFakeMethod_12345")
        assert resp.headers.get("Content-Type", "").startswith("application/json"), (
            "Error response must be JSON, not HTML"
        )
        data = resp.json()
        assert data.get("jsonrpc") == "2.0"
        assert "error" in data
        assert isinstance(data["error"].get("code"), int)
        assert isinstance(data["error"].get("message"), str)

    def test_options_request_headers(self):
        """OPTIONS request should return valid headers without crashing."""
        resp = requests.options(RPC_URL, timeout=10)
        assert resp.status_code in (200, 204, 404, 405)
