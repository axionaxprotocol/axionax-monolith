"""
Tests for ContractManager — covers mock mode behaviour, ABI loading,
hash helpers, and the Account-based constructor (no live RPC required).
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from eth_account import Account


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DUMMY_KEY = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
_DUMMY_ACCOUNT = Account.from_key(_DUMMY_KEY)

# Minimal ABI that satisfies ContractManager's contract instantiation
_MINIMAL_ABI: list[dict[str, Any]] = [
    {"type": "function", "name": "minStake",      "inputs": [], "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "registerWorker", "inputs": [{"name": "stakeAmount", "type": "uint256"}], "outputs": [], "stateMutability": "nonpayable"},
    {"type": "function", "name": "getWorker",
     "inputs": [{"name": "addr", "type": "address"}],
     "outputs": [{"name": "", "type": "tuple", "components": [
         {"name": "addr",           "type": "address"},
         {"name": "stake",          "type": "uint256"},
         {"name": "reputation",     "type": "uint256"},
         {"name": "jobsCompleted",  "type": "uint256"},
         {"name": "jobsFailed",     "type": "uint256"},
         {"name": "active",         "type": "bool"},
         {"name": "registeredAt",   "type": "uint256"},
     ]}],
     "stateMutability": "view"},
    {"type": "function", "name": "getPendingJobs", "inputs": [], "outputs": [{"name": "", "type": "uint256[]"}], "stateMutability": "view"},
    {"type": "function", "name": "assignJob",      "inputs": [{"name": "jobId", "type": "uint256"}], "outputs": [], "stateMutability": "nonpayable"},
    {"type": "function", "name": "submitResult",
     "inputs": [{"name": "jobId", "type": "uint256"}, {"name": "resultHash", "type": "bytes32"}, {"name": "proofHash", "type": "bytes32"}],
     "outputs": [], "stateMutability": "nonpayable"},
    {"type": "function", "name": "claimReward",    "inputs": [{"name": "jobId", "type": "uint256"}], "outputs": [], "stateMutability": "nonpayable"},
]


def _make_cm(contract_address: str = "", abi_override: list | None = None) -> Any:
    """Create a ContractManager in mock or live-stub mode without a real RPC."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False
    ) as f:
        json.dump(abi_override or _MINIMAL_ABI, f)
        abi_path = f.name

    env = {"AXIONAX_ABI_PATH": abi_path}
    if contract_address:
        env["AXIONAX_MARKETPLACE_ADDRESS"] = contract_address

    with patch.dict(os.environ, env):
        from contract_manager import ContractManager  # local import after env patch
        cm = ContractManager(
            rpc_url="http://127.0.0.1:8545",
            account=_DUMMY_ACCOUNT,
            contract_address=contract_address,
        )
    os.unlink(abi_path)
    return cm


# ---------------------------------------------------------------------------
# Constructor & mode detection
# ---------------------------------------------------------------------------

class TestContractManagerInit:
    def test_mock_mode_when_no_address(self) -> None:
        cm = _make_cm()
        assert cm.is_mock is True
        assert cm.contract is None

    def test_mock_mode_zero_address(self) -> None:
        cm = _make_cm("0x0000000000000000000000000000000000000000")
        assert cm.is_mock is True

    def test_worker_address_matches_account(self) -> None:
        cm = _make_cm()
        assert cm.address == _DUMMY_ACCOUNT.address

    def test_account_object_stored(self) -> None:
        cm = _make_cm()
        assert cm.account is _DUMMY_ACCOUNT

    def test_missing_abi_file_defaults_to_empty(self) -> None:
        with patch.dict(os.environ, {"AXIONAX_ABI_PATH": "/nonexistent/path/abi.json"}):
            from contract_manager import ContractManager
            cm = ContractManager(
                rpc_url="http://127.0.0.1:8545",
                account=_DUMMY_ACCOUNT,
            )
        assert cm.is_mock is True


# ---------------------------------------------------------------------------
# Mock-mode: register_worker
# ---------------------------------------------------------------------------

class TestRegisterWorkerMock:
    def test_returns_none_in_mock_mode(self) -> None:
        cm = _make_cm()
        result = cm.register_worker({"device": "cpu"})
        assert result is None

    def test_no_exception_raised(self) -> None:
        cm = _make_cm()
        cm.register_worker({"version": "1.9.0", "gpu": None})

    def test_stake_amount_ignored_in_mock(self) -> None:
        cm = _make_cm()
        assert cm.register_worker({}, stake_amount=1_000_000) is None


# ---------------------------------------------------------------------------
# Mock-mode: is_registered / get_worker_info
# ---------------------------------------------------------------------------

class TestWorkerInfoMock:
    def test_is_registered_true_in_mock(self) -> None:
        cm = _make_cm()
        assert cm.is_registered() is True

    def test_get_worker_info_returns_dict(self) -> None:
        cm = _make_cm()
        info = cm.get_worker_info()
        assert isinstance(info, dict)
        assert info["active"] is True
        assert "addr" in info
        assert info["stake"] == 0
        assert info["reputation"] == 100

    def test_get_worker_info_addr_is_worker_address(self) -> None:
        cm = _make_cm()
        info = cm.get_worker_info()
        assert info["addr"] == _DUMMY_ACCOUNT.address


# ---------------------------------------------------------------------------
# Mock-mode: job lifecycle
# ---------------------------------------------------------------------------

class TestJobLifecycleMock:
    def test_get_pending_jobs_returns_empty_list(self) -> None:
        cm = _make_cm()
        assert cm.get_pending_jobs() == []

    def test_get_job_returns_none_in_mock(self) -> None:
        cm = _make_cm()
        assert cm.get_job(1) is None

    def test_assign_job_returns_none_in_mock(self) -> None:
        cm = _make_cm()
        assert cm.assign_job(42) is None

    def test_submit_result_returns_none_in_mock(self) -> None:
        cm = _make_cm()
        assert cm.submit_result(1, {"output": "hello"}) is None

    def test_claim_reward_returns_none_in_mock(self) -> None:
        cm = _make_cm()
        assert cm.claim_reward(1) is None

    def test_scan_job_created_events_returns_empty_in_mock(self) -> None:
        cm = _make_cm()
        assert cm.scan_job_created_events(0, 100) == []


# ---------------------------------------------------------------------------
# Hash helpers
# ---------------------------------------------------------------------------

class TestHashHelpers:
    def test_to_bytes32_is_32_bytes(self) -> None:
        from contract_manager import _to_bytes32
        result = _to_bytes32("hello world")
        assert isinstance(result, bytes)
        assert len(result) == 32

    def test_to_bytes32_deterministic(self) -> None:
        from contract_manager import _to_bytes32
        assert _to_bytes32("axionax") == _to_bytes32("axionax")

    def test_to_bytes32_unique_inputs(self) -> None:
        from contract_manager import _to_bytes32
        assert _to_bytes32("job:1") != _to_bytes32("job:2")

    def test_submit_result_hashes_dict(self) -> None:
        """submit_result must not raise when given a dict result in mock mode."""
        cm = _make_cm()
        cm.submit_result(99, {"score": 0.95, "tokens": 128})

    def test_submit_result_hashes_string(self) -> None:
        cm = _make_cm()
        cm.submit_result(99, "plain string result")


# ---------------------------------------------------------------------------
# ABI loading
# ---------------------------------------------------------------------------

class TestABILoading:
    def test_default_abi_path_is_job_marketplace_json(self) -> None:
        from contract_manager import _abi_path
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("AXIONAX_ABI_PATH", None)
            path = _abi_path()
        assert path.name == "job_marketplace.json"

    def test_env_abi_path_overrides_default(self) -> None:
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            f.write(b"[]")
            tmp = f.name
        try:
            with patch.dict(os.environ, {"AXIONAX_ABI_PATH": tmp}):
                from contract_manager import _abi_path
                assert str(_abi_path()) == tmp
        finally:
            os.unlink(tmp)

    def test_actual_abi_file_is_valid_json(self) -> None:
        """job_marketplace.json must parse as a non-empty list."""
        abi_file = Path(__file__).parent / "job_marketplace.json"
        if abi_file.exists():
            with open(abi_file, encoding="utf-8") as f:
                abi = json.load(f)
            assert isinstance(abi, list)
            assert len(abi) > 0

    def test_abi_contains_required_functions(self) -> None:
        """The bundled ABI must include all methods ContractManager uses."""
        abi_file = Path(__file__).parent / "job_marketplace.json"
        if not abi_file.exists():
            pytest.skip("job_marketplace.json not present")
        with open(abi_file, encoding="utf-8") as f:
            abi = json.load(f)
        names = {entry["name"] for entry in abi if entry.get("type") == "function"}
        required = {
            "registerWorker", "getWorker", "getPendingJobs",
            "getJob", "assignJob", "submitResult", "claimReward", "minStake",
        }
        missing = required - names
        assert not missing, f"ABI missing functions: {missing}"
