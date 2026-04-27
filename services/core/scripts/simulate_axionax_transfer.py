#!/usr/bin/env python3
"""
Simulate native coin transfers on Axionax JSON-RPC for network testing.

Axionax ``eth_sendRawTransaction`` expects a **hex-encoded JSON** transaction
(Ed25519-signed), not Ethereum RLP. This matches ``core/core/rpc`` and
``core/tools/faucet``.

Prerequisites::

    pip install requests PyNaCl eth-utils

Examples::

    # Generate a key, show address (fund it via faucet / genesis first), then transfer
    python scripts/simulate_axionax_transfer.py --rpc http://127.0.0.1:8545 \\
        --generate-key --to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --value 1000000000000000

    # Use a 32-byte Ed25519 seed (64 hex chars, no 0x)
    python scripts/simulate_axionax_transfer.py --rpc http://127.0.0.1:8545 \\
        --from-seed aabbccdd... \\
        --to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --value 1000000000000000

    # Several sequential transfers (nonce auto-incremented)
    python scripts/simulate_axionax_transfer.py --rpc http://127.0.0.1:8545 \\
        --from-seed ... --to 0x... --value 1000 --repeat 5
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from typing import Any

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    raise SystemExit(1)

try:
    from nacl.signing import SigningKey
except ImportError:
    print("Install PyNaCl: pip install PyNaCl", file=sys.stderr)
    raise SystemExit(1)

try:
    from eth_utils import keccak
except ImportError:
    print("Install eth-utils: pip install eth-utils", file=sys.stderr)
    raise SystemExit(1)


def _rpc(url: str, method: str, params: list[Any], timeout: float = 30.0) -> Any:
    r = requests.post(
        url,
        json={"jsonrpc": "2.0", "method": method, "params": params, "id": 1},
        headers={"Content-Type": "application/json"},
        timeout=timeout,
    )
    r.raise_for_status()
    body = r.json()
    if "error" in body:
        raise RuntimeError(body["error"])
    return body["result"]


def address_from_ed25519_pubkey(pub32: bytes) -> str:
    """Match crypto::signature::address_from_public_key (keccak256(pub)[12:])."""
    if len(pub32) != 32:
        raise ValueError("Ed25519 public key must be 32 bytes")
    h = keccak(pub32)
    return "0x" + h[12:].hex()


def signing_payload(
    from_addr: str,
    to_addr: str,
    value: int,
    gas_price: int,
    gas_limit: int,
    nonce: int,
    data: bytes,
) -> bytes:
    """Must match blockchain::Transaction::signing_payload (Rust)."""
    buf = bytearray()
    buf.extend(from_addr.encode("utf-8"))
    buf.extend(to_addr.encode("utf-8"))
    buf.extend(value.to_bytes(16, "little"))
    buf.extend(gas_price.to_bytes(16, "little"))
    buf.extend(gas_limit.to_bytes(8, "little"))
    buf.extend(nonce.to_bytes(8, "little"))
    buf.extend(data)
    return bytes(buf)


def blake2s_256(data: bytes) -> bytes:
    """Match crypto::hash::blake2s_256 (32-byte digest)."""
    return hashlib.blake2s(data, digest_size=32).digest()


def build_signed_tx_json(
    sk: SigningKey,
    to_addr: str,
    value: int,
    gas_price: int,
    gas_limit: int,
    nonce: int,
    data: bytes,
) -> bytes:
    vk = sk.verify_key
    pub = bytes(vk.encode())
    from_addr = address_from_ed25519_pubkey(pub)
    payload = signing_payload(from_addr, to_addr, value, gas_price, gas_limit, nonce, data)
    tx_hash = blake2s_256(payload)
    sig_msg = sk.sign(payload)
    # PyNaCl SignedMessage: 64-byte detached signature
    signature = sig_msg.signature

    tx_obj = {
        "hash": list(tx_hash),
        "from": from_addr,
        "to": to_addr,
        "value": value,
        "gas_price": gas_price,
        "gas_limit": gas_limit,
        "nonce": nonce,
        "data": list(data),
        "signature": list(signature),
        "signer_public_key": list(pub),
    }
    return json.dumps(tx_obj, separators=(",", ":")).encode("utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Axionax native transfer simulator (JSON + Ed25519)")
    ap.add_argument("--rpc", default=os.environ.get("AXIONAX_RPC_URL", "http://127.0.0.1:8545"))
    ap.add_argument("--to", help="Recipient 0x address (20-byte hex)")
    ap.add_argument(
        "--from-seed",
        help="32-byte Ed25519 seed as hex (64 hex chars). Or set AXIONAX_ED25519_SEED_HEX",
    )
    ap.add_argument("--generate-key", action="store_true", help="Generate ephemeral keypair and exit after printing address")
    ap.add_argument("--value", type=int, default=1_000_000_000_000_000, help="Amount in smallest units (default: 0.001 if 18 decimals)")
    ap.add_argument("--gas-price", type=int, default=1_000_000_000)
    ap.add_argument("--gas-limit", type=int, default=21000)
    ap.add_argument("--repeat", type=int, default=1, help="Number of sequential transfers (nonce++)")
    args = ap.parse_args()

    seed_hex = args.from_seed or os.environ.get("AXIONAX_ED25519_SEED_HEX")
    if args.generate_key:
        sk = SigningKey.generate()
        pub = bytes(sk.verify_key.encode())
        addr = address_from_ed25519_pubkey(pub)
        seed = sk.encode()  # 32 bytes seed
        print("Generated Ed25519 key (fund `from` on chain before sending txs):")
        print(f"  address:    {addr}")
        print(f"  seed_hex:   {seed.hex()}  # keep secret; pass as --from-seed")
        return 0

    if not args.to:
        ap.error("--to is required unless --generate-key")
    to_addr = args.to.strip()
    if not to_addr.startswith("0x") or len(to_addr) != 42:
        print("ERROR: --to must be 0x + 40 hex chars", file=sys.stderr)
        return 1

    if not seed_hex:
        print("ERROR: provide --from-seed or AXIONAX_ED25519_SEED_HEX, or use --generate-key first", file=sys.stderr)
        return 1

    seed_hex = seed_hex.strip().lower().replace("0x", "")
    if len(seed_hex) != 64:
        print("ERROR: seed must be 32 bytes = 64 hex characters", file=sys.stderr)
        return 1

    sk = SigningKey(bytes.fromhex(seed_hex))
    from_addr = address_from_ed25519_pubkey(bytes(sk.verify_key.encode()))

    # Nonce from chain
    nonce_hex = _rpc(args.rpc, "eth_getTransactionCount", [from_addr, "latest"])
    nonce = int(nonce_hex, 16)

    print(f"RPC:        {args.rpc}")
    print(f"From:       {from_addr}")
    print(f"To:         {to_addr}")
    print(f"Start nonce:{nonce}")

    for i in range(args.repeat):
        n = nonce + i
        raw_json = build_signed_tx_json(
            sk, to_addr, args.value, args.gas_price, args.gas_limit, n, b""
        )
        tx_hex = "0x" + raw_json.hex()
        try:
            tx_hash = _rpc(args.rpc, "eth_sendRawTransaction", [tx_hex])
            print(f"  [{i+1}/{args.repeat}] nonce={n} tx_hash={tx_hash}")
        except Exception as e:
            print(f"  [{i+1}/{args.repeat}] FAILED nonce={n}: {e}", file=sys.stderr)
            return 1

    bal = _rpc(args.rpc, "eth_getBalance", [from_addr, "latest"])
    print(f"From balance after: {bal}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
