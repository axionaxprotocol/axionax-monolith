"""
ContractManager — interface to the JobMarketplace smart contract.

Supports two modes:
  - LIVE:  MARKETPLACE_ADDRESS is set to a real deployed contract → real on-chain transactions
  - MOCK:  MARKETPLACE_ADDRESS is 0x0 (default) → logs actions without sending transactions

Set the contract address in your config TOML under [network] contract_address,
or via the AXIONAX_MARKETPLACE_ADDRESS environment variable.
"""

import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from web3 import Web3
from web3.exceptions import ContractLogicError

logger = logging.getLogger("axionax.contract")

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

def _abi_path() -> Path:
    """ABI path: AXIONAX_ABI_PATH env or default job_marketplace.json beside this module."""
    env_path = os.environ.get("AXIONAX_ABI_PATH", "").strip()
    if env_path and Path(env_path).exists():
        return Path(env_path)
    return Path(__file__).parent / "job_marketplace.json"

MARKETPLACE_ADDRESS = os.environ.get(
    "AXIONAX_MARKETPLACE_ADDRESS", ZERO_ADDRESS
).strip()

CHAIN_ID = int(os.environ.get("AXIONAX_CHAIN_ID", "86137"))


def _load_abi() -> list:
    abi_path = _abi_path()
    if abi_path.exists():
        with open(abi_path, encoding="utf-8") as f:
            return json.load(f)
    logger.warning("ABI file not found at %s — using empty ABI", abi_path)
    return []


def _to_bytes32(data: str) -> bytes:
    """Hash arbitrary string to bytes32 (keccak256)."""
    return Web3.keccak(text=data)


class ContractManager:
    """
    Interface to the on-chain JobMarketplace contract.

    When the marketplace address is the zero address, all write operations
    are logged but not sent to the chain (mock mode).  Read operations
    return sensible defaults.
    """

    def __init__(self, rpc_url: str, private_key: str, contract_address: str = ""):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address

        addr = (contract_address or MARKETPLACE_ADDRESS).strip()
        self.marketplace_address = Web3.to_checksum_address(addr)
        self.is_mock = self.marketplace_address == Web3.to_checksum_address(ZERO_ADDRESS)

        abi = _load_abi()
        if not self.is_mock and abi:
            self.contract = self.w3.eth.contract(
                address=self.marketplace_address, abi=abi
            )
        else:
            self.contract = None

        mode = "MOCK" if self.is_mock else "LIVE"
        logger.info(
            "ContractManager [%s] worker=%s marketplace=%s",
            mode, self.address, self.marketplace_address,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _send_tx(self, fn, value: int = 0) -> Optional[str]:
        """Build, sign, and send a contract function call. Returns tx hash."""
        try:
            nonce = self.w3.eth.get_transaction_count(self.address)
            tx = fn.build_transaction({
                "from": self.address,
                "nonce": nonce,
                "gas": 500_000,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": CHAIN_ID,
                "value": value,
            })
            signed = self.w3.eth.account.sign_transaction(tx, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            hex_hash = tx_hash.hex()
            logger.info("TX sent: %s", hex_hash)
            return hex_hash
        except ContractLogicError as e:
            logger.error("Contract revert: %s", e)
            raise
        except Exception as e:
            logger.error("TX failed: %s", e)
            raise

    def _wait_receipt(self, tx_hash: str, timeout: int = 120) -> dict:
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
        if receipt["status"] != 1:
            raise RuntimeError(f"TX reverted: {tx_hash}")
        return receipt

    # ------------------------------------------------------------------
    # Worker management
    # ------------------------------------------------------------------

    def register_worker(self, specs: Dict[str, Any], stake_amount: int = 0) -> Optional[str]:
        """
        Register this worker on-chain by staking AXX tokens.

        Args:
            specs: Worker capability dict (logged locally, not sent on-chain).
            stake_amount: Amount of AXX tokens to stake (in wei).
                          If 0, the contract's minStake is used.

        Returns:
            Transaction hash, or None in mock mode.
        """
        logger.info("Registering worker | specs=%s", specs)

        if self.is_mock:
            logger.info("[MOCK] Worker registered (no contract deployed)")
            return None

        if stake_amount == 0:
            stake_amount = self.contract.functions.minStake().call()
            logger.info("Using minStake from contract: %s", stake_amount)

        fn = self.contract.functions.registerWorker(stake_amount)
        tx_hash = self._send_tx(fn)
        self._wait_receipt(tx_hash)
        logger.info("Worker registered on-chain: %s", tx_hash)
        return tx_hash

    def get_worker_info(self) -> Optional[dict]:
        """Get this worker's on-chain info."""
        if self.is_mock:
            return {"addr": self.address, "active": True, "stake": 0, "reputation": 100}
        return self.contract.functions.getWorker(self.address).call()

    def is_registered(self) -> bool:
        """Check if this worker is registered and active."""
        if self.is_mock:
            return True
        try:
            info = self.contract.functions.getWorker(self.address).call()
            return info[5]  # active field
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Job discovery
    # ------------------------------------------------------------------

    def get_pending_jobs(self) -> List[int]:
        """Return list of pending job IDs from the contract."""
        if self.is_mock:
            return []
        try:
            return self.contract.functions.getPendingJobs().call()
        except Exception as e:
            logger.debug("getPendingJobs failed: %s", e)
            return []

    def get_job(self, job_id: int) -> Optional[dict]:
        """Fetch full job details from chain."""
        if self.is_mock:
            return None
        try:
            raw = self.contract.functions.getJob(job_id).call()
            return {
                "id": raw[0],
                "submitter": raw[1],
                "worker": raw[2],
                "jobType": raw[3],
                "status": raw[4],
                "reward": raw[5],
                "deposit": raw[6],
                "timeout": raw[7],
                "createdAt": raw[8],
                "assignedAt": raw[9],
                "completedAt": raw[10],
                "inputHash": raw[11].hex(),
                "resultHash": raw[12].hex(),
                "proofHash": raw[13].hex(),
            }
        except Exception as e:
            logger.debug("getJob(%s) failed: %s", job_id, e)
            return None

    # ------------------------------------------------------------------
    # Job lifecycle
    # ------------------------------------------------------------------

    def assign_job(self, job_id: int) -> Optional[str]:
        """Claim a pending job for this worker."""
        logger.info("Assigning job %s to self", job_id)

        if self.is_mock:
            logger.info("[MOCK] Job %s assigned", job_id)
            return None

        fn = self.contract.functions.assignJob(job_id)
        tx_hash = self._send_tx(fn)
        self._wait_receipt(tx_hash)
        logger.info("Job %s assigned on-chain: %s", job_id, tx_hash)
        return tx_hash

    def submit_result(self, job_id: int, result: Any) -> Optional[str]:
        """
        Submit job result on-chain.

        The result is hashed to bytes32 (keccak256) before submission.
        A proof hash is computed from job_id + result for verification.

        Args:
            job_id: Job identifier.
            result: Result data (dict or string — will be JSON-serialized and hashed).

        Returns:
            Transaction hash, or None in mock mode.
        """
        result_str = json.dumps(result) if isinstance(result, dict) else str(result)
        result_hash = _to_bytes32(result_str)
        proof_hash = _to_bytes32(f"{job_id}:{result_str}")

        logger.info("Submitting result for job %s", job_id)

        if self.is_mock:
            logger.info(
                "[MOCK] Result submitted | job=%s result_hash=%s",
                job_id, result_hash.hex(),
            )
            return None

        fn = self.contract.functions.submitResult(job_id, result_hash, proof_hash)
        tx_hash = self._send_tx(fn)
        self._wait_receipt(tx_hash)
        logger.info("Result submitted on-chain: %s", tx_hash)
        return tx_hash

    def claim_reward(self, job_id: int) -> Optional[str]:
        """Claim reward for a completed job (after dispute period)."""
        if self.is_mock:
            logger.info("[MOCK] Reward claimed for job %s", job_id)
            return None

        fn = self.contract.functions.claimReward(job_id)
        tx_hash = self._send_tx(fn)
        self._wait_receipt(tx_hash)
        logger.info("Reward claimed for job %s: %s", job_id, tx_hash)
        return tx_hash

    # ------------------------------------------------------------------
    # Event scanning
    # ------------------------------------------------------------------

    def scan_job_created_events(self, from_block: int, to_block: int) -> List[dict]:
        """Scan JobCreated events between two blocks."""
        if self.is_mock or not self.contract:
            return []

        try:
            event_filter = self.contract.events.JobCreated.create_filter(
                fromBlock=from_block, toBlock=to_block,
            )
            events = event_filter.get_all_entries()
            jobs = []
            for evt in events:
                args = evt["args"]
                jobs.append({
                    "id": args["jobId"],
                    "submitter": args["submitter"],
                    "jobType": args["jobType"],
                    "reward": args["reward"],
                    "inputHash": args["inputHash"].hex(),
                    "block": evt["blockNumber"],
                    "tx": evt["transactionHash"].hex(),
                })
            return jobs
        except Exception as e:
            logger.debug("scan_job_created_events failed: %s", e)
            return []
