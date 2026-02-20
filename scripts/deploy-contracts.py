#!/usr/bin/env python3
"""
Deploy JobMarketplace contract to the Axionax chain.

Prerequisites:
  - pip install web3 py-solc-x
  - A funded deployer account (private key)
  - RPC access to the Axionax chain

Usage:
  python3 scripts/deploy-contracts.py                          # interactive
  python3 scripts/deploy-contracts.py --rpc http://217.76.61.116:8545 --key 0x...
  python3 scripts/deploy-contracts.py --rpc http://217.76.61.116:8545 --key 0x... --axx-token 0x...

Environment variables (alternative to CLI args):
  AXIONAX_RPC_URL          RPC endpoint
  DEPLOYER_PRIVATE_KEY     Deployer account private key
  AXX_TOKEN_ADDRESS        AXX ERC20 token address (if already deployed)
"""

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Minimal ERC20 ABI for token deployment check
ERC20_ABI = [
    {"type": "function", "name": "name", "inputs": [], "outputs": [{"type": "string"}], "stateMutability": "view"},
    {"type": "function", "name": "symbol", "inputs": [], "outputs": [{"type": "string"}], "stateMutability": "view"},
    {"type": "function", "name": "totalSupply", "inputs": [], "outputs": [{"type": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "approve", "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"type": "bool"}], "stateMutability": "nonpayable"},
]


def compile_contract(sol_path: str):
    """Compile Solidity contract using py-solc-x."""
    try:
        import solcx
    except ImportError:
        print("ERROR: py-solc-x not installed. Run: pip install py-solc-x")
        sys.exit(1)

    solcx.install_solc("0.8.19")
    solcx.set_solc_version("0.8.19")

    source = Path(sol_path).read_text(encoding="utf-8")

    compiled = solcx.compile_source(
        source,
        output_values=["abi", "bin"],
        solc_version="0.8.19",
        import_remappings=[
            f"@openzeppelin/={str(ROOT / 'node_modules' / '@openzeppelin')}/"
        ],
    )

    for key, val in compiled.items():
        if "JobMarketplace" in key:
            return val["abi"], val["bin"]

    raise RuntimeError("JobMarketplace not found in compiled output")


def deploy(w3, account, abi, bytecode, constructor_args, chain_id):
    """Deploy a contract and return (address, tx_hash)."""
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(account.address)

    tx = contract.constructor(*constructor_args).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 5_000_000,
        "gasPrice": w3.eth.gas_price,
        "chainId": chain_id,
    })

    signed = w3.eth.account.sign_transaction(tx, account.key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  TX sent: {tx_hash.hex()}")
    print("  Waiting for confirmation...")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt["status"] != 1:
        print(f"  ERROR: Transaction reverted!")
        sys.exit(1)

    address = receipt["contractAddress"]
    print(f"  Deployed at: {address}")
    return address, tx_hash.hex()


def main():
    from web3 import Web3

    ap = argparse.ArgumentParser(description="Deploy JobMarketplace to Axionax chain")
    ap.add_argument("--rpc", default=os.environ.get("AXIONAX_RPC_URL", "http://217.76.61.116:8545"))
    ap.add_argument("--key", default=os.environ.get("DEPLOYER_PRIVATE_KEY", ""))
    ap.add_argument("--axx-token", default=os.environ.get("AXX_TOKEN_ADDRESS", ""))
    ap.add_argument("--chain-id", type=int, default=int(os.environ.get("AXIONAX_CHAIN_ID", "86137")))
    ap.add_argument("--min-stake", type=int, default=100 * 10**18, help="Min stake in wei (default 100 AXX)")
    ap.add_argument("--fee-rate", type=int, default=250, help="Platform fee in basis points (250 = 2.5%%)")
    ap.add_argument("--dispute-period", type=int, default=3600, help="Dispute period in seconds (default 1h)")
    args = ap.parse_args()

    if not args.key:
        args.key = input("Deployer private key (0x...): ").strip()
    if not args.key:
        print("ERROR: No private key provided")
        sys.exit(1)

    print("=" * 60)
    print("  Axionax — Contract Deployment")
    print("=" * 60)
    print(f"  RPC:      {args.rpc}")
    print(f"  Chain ID: {args.chain_id}")
    print()

    w3 = Web3(Web3.HTTPProvider(args.rpc))
    if not w3.is_connected():
        print("ERROR: Cannot connect to RPC")
        sys.exit(1)

    block = w3.eth.block_number
    print(f"  Connected — block {block}")

    account = w3.eth.account.from_key(args.key)
    balance = w3.eth.get_balance(account.address)
    print(f"  Deployer: {account.address}")
    print(f"  Balance:  {Web3.from_wei(balance, 'ether')} ETH")
    print()

    sol_path = ROOT / "core" / "examples" / "contracts" / "JobMarketplace.sol"

    # Step 1: Compile
    print("[1] Compiling JobMarketplace.sol ...")
    abi, bytecode = compile_contract(str(sol_path))
    print(f"  ABI: {len(abi)} entries, bytecode: {len(bytecode)} bytes")

    # Save compiled ABI
    abi_out = ROOT / "core" / "deai" / "job_marketplace.json"
    with open(abi_out, "w", encoding="utf-8") as f:
        json.dump(abi, f, indent=2)
    print(f"  ABI saved to {abi_out}")
    print()

    # Step 2: Deploy
    axx_token = args.axx_token
    if not axx_token:
        print("  No AXX token address provided.")
        print("  You can deploy a test ERC20 token or provide an existing one.")
        axx_token = input("  AXX token address (or press Enter to skip): ").strip()

    if not axx_token:
        print("  Skipping deployment — need AXX token address.")
        print("  Deploy a test token first, then re-run with --axx-token 0x...")
        return

    print(f"\n[2] Deploying JobMarketplace ...")
    print(f"  AXX Token:      {axx_token}")
    print(f"  Min Stake:      {args.min_stake} wei ({args.min_stake // 10**18} AXX)")
    print(f"  Fee Rate:       {args.fee_rate} bps ({args.fee_rate / 100}%)")
    print(f"  Dispute Period: {args.dispute_period}s")
    print()

    address, tx_hash = deploy(
        w3, account, abi, "0x" + bytecode,
        constructor_args=[
            Web3.to_checksum_address(axx_token),
            args.min_stake,
            args.fee_rate,
            args.dispute_period,
        ],
        chain_id=args.chain_id,
    )

    print()
    print("=" * 60)
    print("  Deployment complete!")
    print("=" * 60)
    print(f"  JobMarketplace: {address}")
    print(f"  TX Hash:        {tx_hash}")
    print()
    print("  Next steps:")
    print(f"  1. Set in config TOML:  [network] contract_address = \"{address}\"")
    print(f"  2. Or set env:          export AXIONAX_MARKETPLACE_ADDRESS={address}")
    print(f"  3. Workers will auto-detect the contract on next start")
    print()

    # Save deployment info
    deploy_info = {
        "marketplace_address": address,
        "axx_token": axx_token,
        "deployer": account.address,
        "chain_id": args.chain_id,
        "tx_hash": tx_hash,
        "block": w3.eth.block_number,
        "min_stake": args.min_stake,
        "fee_rate": args.fee_rate,
        "dispute_period": args.dispute_period,
    }
    deploy_out = ROOT / "core" / "deai" / "deployment.json"
    with open(deploy_out, "w", encoding="utf-8") as f:
        json.dump(deploy_info, f, indent=2)
    print(f"  Deployment info saved to {deploy_out}")


if __name__ == "__main__":
    main()
