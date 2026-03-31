"""
deploy_marketplace.py — Deploy MockAXXToken + JobMarketplace to Axionax testnet.

Usage:
    python ops/scripts/deploy_marketplace.py [--rpc RPC_URL] [--chain-id CHAIN_ID]

Required env vars:
    WORKER_PRIVATE_KEY   — deployer private key (hex, 0x-prefixed)

Optional env vars / flags:
    AXIONAX_RPC_URL      — default: http://127.0.0.1:8545
    AXIONAX_CHAIN_ID     — default: 86137

After deployment the script prints the addresses and writes them to
ops/deploy/marketplace_addresses.json so the worker can pick them up.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("deploy")

# ---------------------------------------------------------------------------
# Resolve repo root so the script works regardless of cwd
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT   = _SCRIPT_DIR.parent.parent
_CONTRACTS   = _REPO_ROOT / "contracts"
_OUT_DIR     = _SCRIPT_DIR.parent / "deploy"


def _require_solcx() -> None:
    try:
        import solcx  # noqa: F401
    except ImportError:
        log.error("py-solc-x not installed. Run: pip install py-solc-x")
        sys.exit(1)


def _install_solc(version: str = "0.8.20") -> None:
    from solcx import get_installed_solc_versions, install_solc
    installed = [str(v) for v in get_installed_solc_versions()]
    if version not in installed:
        log.info("Installing solc %s (one-time) …", version)
        install_solc(version)
    else:
        log.info("solc %s already installed.", version)


def _compile_contract(sol_path: Path, contract_name: str, solc_version: str = "0.8.20") -> tuple[list, str]:
    """Compile a standalone .sol file and return (abi, bytecode)."""
    from solcx import compile_source, set_solc_version
    set_solc_version(solc_version)
    source = sol_path.read_text(encoding="utf-8")
    compiled = compile_source(
        source,
        output_values=["abi", "bin"],
        solc_version=solc_version,
    )
    key = f"<stdin>:{contract_name}"
    if key not in compiled:
        available = list(compiled.keys())
        raise KeyError(f"Contract '{contract_name}' not found. Available: {available}")
    abi      = compiled[key]["abi"]
    bytecode = compiled[key]["bin"]
    return abi, bytecode


def _deploy(w3, abi: list, bytecode: str, deployer, constructor_args: list, chain_id: int) -> str:
    """Deploy a compiled contract and return the deployed address."""
    from web3.exceptions import ContractLogicError  # noqa: F401

    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(deployer.address)
    tx = contract.constructor(*constructor_args).build_transaction({
        "from":     deployer.address,
        "nonce":    nonce,
        "gas":      3_000_000,
        "gasPrice": w3.eth.gas_price,
        "chainId":  chain_id,
    })
    signed  = w3.eth.account.sign_transaction(tx, deployer.key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    log.info("TX submitted: %s", tx_hash.hex())
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt["status"] != 1:
        raise RuntimeError(f"Deployment reverted: {tx_hash.hex()}")
    addr = receipt["contractAddress"]
    log.info("Deployed at: %s  (block %s)", addr, receipt["blockNumber"])
    return addr


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy MockAXXToken + JobMarketplace")
    parser.add_argument("--rpc",      default=os.environ.get("AXIONAX_RPC_URL", "http://127.0.0.1:8545"))
    parser.add_argument("--chain-id", type=int, default=int(os.environ.get("AXIONAX_CHAIN_ID", "86137")))
    parser.add_argument(
        "--initial-supply", type=int, default=1_000_000,
        help="MockAXXToken initial supply (whole tokens, not wei). Default: 1 000 000 tAXX",
    )
    parser.add_argument(
        "--min-stake", type=int, default=10_000,
        help="JobMarketplace minStake in whole tokens. Default: 10 000 tAXX",
    )
    parser.add_argument(
        "--fee-rate", type=int, default=100,
        help="Platform fee in basis points (100 = 1%%). Default: 100",
    )
    parser.add_argument(
        "--dispute-period", type=int, default=3600,
        help="Dispute period in seconds. Default: 3600 (1 hour)",
    )
    parser.add_argument(
        "--solc-version", default="0.8.20",
        help="Solidity compiler version to use. Default: 0.8.20",
    )
    args = parser.parse_args()

    _require_solcx()
    _install_solc(args.solc_version)

    from eth_account import Account
    from web3 import Web3

    private_key = os.environ.get("WORKER_PRIVATE_KEY", "").strip()
    if not private_key:
        log.error("Set WORKER_PRIVATE_KEY env var before deploying.")
        sys.exit(1)

    deployer = Account.from_key(private_key)
    w3       = Web3(Web3.HTTPProvider(args.rpc))
    if not w3.is_connected():
        log.error("Cannot connect to RPC: %s", args.rpc)
        sys.exit(1)

    log.info("Connected to %s  (chain %s)", args.rpc, args.chain_id)
    log.info("Deployer: %s", deployer.address)
    balance_eth = w3.from_wei(w3.eth.get_balance(deployer.address), "ether")
    log.info("Balance: %s AXX", balance_eth)

    # 1 ── MockAXXToken
    log.info("─" * 50)
    log.info("Compiling MockAXXToken …")
    mock_sol   = _contracts_path() / "MockAXXToken.sol"
    mock_abi, mock_bin = _compile_contract(mock_sol, "MockAXXToken", args.solc_version)

    decimals        = 10 ** 18
    initial_wei     = args.initial_supply * decimals
    log.info("Deploying MockAXXToken (supply=%s tAXX) …", args.initial_supply)
    token_address   = _deploy(w3, mock_abi, mock_bin, deployer, [initial_wei], args.chain_id)

    # 2 ── JobMarketplace
    log.info("─" * 50)
    log.info("Compiling JobMarketplace (standalone) …")
    market_sol = _contracts_path() / "JobMarketplaceStandalone.sol"
    market_abi, market_bin = _compile_contract(market_sol, "JobMarketplace", args.solc_version)

    min_stake_wei   = args.min_stake * decimals
    log.info(
        "Deploying JobMarketplace (minStake=%s tAXX, fee=%sbps, disputePeriod=%ss) …",
        args.min_stake, args.fee_rate, args.dispute_period,
    )
    market_address  = _deploy(
        w3, market_abi, market_bin, deployer,
        [token_address, min_stake_wei, args.fee_rate, args.dispute_period],
        args.chain_id,
    )

    # 3 ── Save results
    output = {
        "chain_id":           args.chain_id,
        "rpc":                args.rpc,
        "deployer":           deployer.address,
        "MockAXXToken":       token_address,
        "JobMarketplace":     market_address,
    }
    _OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_file = _OUT_DIR / "marketplace_addresses.json"
    out_file.write_text(json.dumps(output, indent=2))

    log.info("─" * 50)
    log.info("✅  Deployment complete!")
    log.info("    MockAXXToken  : %s", token_address)
    log.info("    JobMarketplace: %s", market_address)
    log.info("    Saved to      : %s", out_file)
    log.info("")
    log.info("Next steps:")
    log.info("  1. Add to worker_config.toml under [network]:")
    log.info("       contract_address = \"%s\"", market_address)
    log.info("  2. Or export: AXIONAX_MARKETPLACE_ADDRESS=%s", market_address)
    log.info("  3. Transfer tAXX to worker wallet and approve the marketplace contract.")


def _contracts_path() -> Path:
    return _CONTRACTS


if __name__ == "__main__":
    main()
