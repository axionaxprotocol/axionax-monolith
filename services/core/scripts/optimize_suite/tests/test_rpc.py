"""Unit tests for optimize_suite.rpc (mocked HTTP, no live network)."""

from __future__ import annotations

import json
import unittest
from unittest.mock import MagicMock, patch

from optimize_suite.rpc import RpcCallResult, jsonrpc_post


def _mock_response(
    status_code: int = 200,
    json_data: dict | None = None,
    text: str = "",
) -> MagicMock:
    r = MagicMock()
    r.status_code = status_code
    if json_data is not None:
        r.json.return_value = json_data
    else:
        r.json.side_effect = ValueError("not json")
    r.text = text
    return r


class TestJsonRpcPost(unittest.TestCase):
    @patch("optimize_suite.rpc.requests.Session")
    def test_success(self, mock_session_cls: MagicMock) -> None:
        inst = mock_session_cls.return_value
        inst.post.return_value = _mock_response(
            200, {"jsonrpc": "2.0", "id": 1, "result": "0x15079"}
        )
        out = jsonrpc_post("http://127.0.0.1:8545", "eth_chainId", [])
        self.assertIsInstance(out, RpcCallResult)
        self.assertTrue(out.ok)
        self.assertEqual(out.result, "0x15079")
        self.assertIsNone(out.rpc_error)
        inst.post.assert_called_once()
        call_kw = inst.post.call_args
        self.assertIn("data", call_kw[1] or {})
        body = json.loads(call_kw[1]["data"])
        self.assertEqual(body["method"], "eth_chainId")

    @patch("optimize_suite.rpc.requests.Session")
    def test_jsonrpc_error(self, mock_session_cls: MagicMock) -> None:
        inst = mock_session_cls.return_value
        inst.post.return_value = _mock_response(
            200,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "error": {"code": -32601, "message": "Method not found"},
            },
        )
        out = jsonrpc_post("http://127.0.0.1:8545", "eth_bad", [])
        self.assertFalse(out.ok)
        self.assertIsNotNone(out.rpc_error)
        self.assertEqual(out.rpc_error.get("code"), -32601)

    @patch("optimize_suite.rpc.requests.Session")
    def test_http_error_no_json_body(self, mock_session_cls: MagicMock) -> None:
        inst = mock_session_cls.return_value
        r = MagicMock()
        r.status_code = 502
        r.json.side_effect = ValueError("bad gateway html")
        inst.post.return_value = r
        out = jsonrpc_post("http://127.0.0.1:8545", "eth_blockNumber", [])
        self.assertFalse(out.ok)
        self.assertEqual(out.error, "response_not_json")

    @patch("optimize_suite.rpc.requests.Session")
    def test_connection_error(self, mock_session_cls: MagicMock) -> None:
        import requests

        inst = mock_session_cls.return_value
        inst.post.side_effect = requests.ConnectionError("refused")
        out = jsonrpc_post("http://127.0.0.1:8545", "eth_blockNumber", [])
        self.assertFalse(out.ok)
        self.assertIn("refused", out.error or "")


if __name__ == "__main__":
    unittest.main()
