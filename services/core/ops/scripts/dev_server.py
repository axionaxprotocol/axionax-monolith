#!/usr/bin/env python3
"""
Axionax Dev Mock Server
Simulates axionax-node JSON-RPC + health endpoints using Python stdlib only.
Run: python ops/scripts/dev_server.py [--port 8545] [--host 127.0.0.1]
"""

import argparse
import hashlib
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

# ---------- Shared in-memory chain state ----------
_state_lock = threading.Lock()
_state = {
    "chain_id": 86137,
    "block_number": 0,
    "blocks": {},          # number -> block dict
    "balances": {          # address -> balance (wei)
        "0x0000000000000000000000000000000000000001": 1_000_000 * 10**18,
    },
    "nonces": {},          # address -> nonce int
    "txpool": [],          # pending tx hashes
    "start_time": time.time(),
}

_BLOCK_TIME = 6  # seconds


def _sha3(data: bytes) -> str:
    return "0x" + hashlib.sha3_256(data).hexdigest()


def _make_block(number: int, parent_hash: str) -> dict:
    ts = int(time.time())
    h = _sha3(f"{parent_hash}{number}{ts}".encode())
    return {
        "number": hex(number),
        "hash": h,
        "parentHash": parent_hash,
        "timestamp": hex(ts),
        "miner": "0x0000000000000000000000000000000000000001",
        "transactions": [],
        "gasUsed": "0x0",
        "gasLimit": hex(30_000_000),
        "stateRoot": _sha3(str(number).encode()),
        "size": "0x200",
        "difficulty": "0x1",
        "totalDifficulty": hex(number + 1),
        "nonce": "0x0000000000000000",
        "extraData": "0x",
        "logsBloom": "0x" + "0" * 512,
        "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
        "receiptsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
        "transactionsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
        "uncles": [],
    }


def _mine_loop():
    """Background thread: produce a new block every BLOCK_TIME seconds."""
    parent_hash = "0x" + "0" * 64
    while True:
        time.sleep(_BLOCK_TIME)
        with _state_lock:
            n = _state["block_number"] + 1
            prev = _state["blocks"].get(n - 1, {}).get("hash", parent_hash)
            blk = _make_block(n, prev)
            _state["blocks"][n] = blk
            _state["block_number"] = n
            # drain txpool into block
            blk["transactions"] = list(_state["txpool"])
            _state["txpool"] = []
        print(f"[block] #{n}  hash={blk['hash'][:14]}...")


# ---------- RPC method handlers ----------

def eth_chainId(_params):
    return hex(_state["chain_id"])


def eth_blockNumber(_params):
    return hex(_state["block_number"])


def eth_getBlockByNumber(params):
    tag, _full = params[0], params[1] if len(params) > 1 else False
    with _state_lock:
        n = _state["block_number"] if tag in ("latest", "pending") else int(tag, 16)
        return _state["blocks"].get(n)


def eth_getBlockByHash(params):
    want = params[0]
    with _state_lock:
        for blk in _state["blocks"].values():
            if blk["hash"] == want:
                return blk
    return None


def eth_getBalance(params):
    addr = params[0].lower()
    with _state_lock:
        bal = _state["balances"].get(addr, 0)
    return hex(bal)


def eth_getTransactionCount(params):
    addr = params[0].lower()
    with _state_lock:
        n = _state["nonces"].get(addr, 0)
    return hex(n)


def eth_sendRawTransaction(params):
    raw = params[0]
    tx_hash = _sha3(raw.encode())
    with _state_lock:
        _state["txpool"].append(tx_hash)
    return tx_hash


def eth_gasPrice(_params):
    return hex(1_000_000_000)  # 1 Gwei


def eth_estimateGas(_params):
    return hex(21_000)


def eth_getCode(params):
    return "0x"


def eth_call(_params):
    return "0x"


def net_version(_params):
    return str(_state["chain_id"])


def net_peerCount(_params):
    return hex(2)


def web3_clientVersion(_params):
    return "axionax-dev-mock/1.8.0/python3"


def eth_accounts(_params):
    return list(_state["balances"].keys())


def eth_syncing(_params):
    return False


_METHODS = {
    "eth_chainId": eth_chainId,
    "eth_blockNumber": eth_blockNumber,
    "eth_getBlockByNumber": eth_getBlockByNumber,
    "eth_getBlockByHash": eth_getBlockByHash,
    "eth_getBalance": eth_getBalance,
    "eth_getTransactionCount": eth_getTransactionCount,
    "eth_sendRawTransaction": eth_sendRawTransaction,
    "eth_gasPrice": eth_gasPrice,
    "eth_estimateGas": eth_estimateGas,
    "eth_getCode": eth_getCode,
    "eth_call": eth_call,
    "net_version": net_version,
    "net_peerCount": net_peerCount,
    "web3_clientVersion": web3_clientVersion,
    "eth_accounts": eth_accounts,
    "eth_syncing": eth_syncing,
}


def _handle_rpc(body: bytes) -> dict:
    try:
        req = json.loads(body)
    except json.JSONDecodeError:
        return {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}

    rpc_id = req.get("id")
    method = req.get("method", "")
    params = req.get("params", [])

    handler = _METHODS.get(method)
    if handler is None:
        return {"jsonrpc": "2.0", "id": rpc_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}}
    try:
        result = handler(params)
        return {"jsonrpc": "2.0", "id": rpc_id, "result": result}
    except Exception as exc:
        return {"jsonrpc": "2.0", "id": rpc_id,
                "error": {"code": -32603, "message": str(exc)}}


# ---------- HTTP handler ----------

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress default access log; we print our own

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        uptime = int(time.time() - _state["start_time"])
        if self.path in ("/health", "/api/health"):
            self._send_json({
                "status": "healthy",
                "uptime_seconds": uptime,
                "block_height": _state["block_number"],
                "peers_connected": 2,
                "sync_ok": True,
                "database_ok": True,
                "version": "1.8.0-dev-mock",
            })
        elif self.path == "/metrics":
            self._send_json({
                "block_height": _state["block_number"],
                "peers_connected": 2,
                "pending_txs": len(_state["txpool"]),
                "uptime_seconds": uptime,
                "chain_id": _state["chain_id"],
            })
        elif self.path == "/version":
            self._send_json({
                "version": "1.8.0",
                "chain_id": _state["chain_id"],
                "mode": "dev-mock",
                "rust_version": "N/A (mock)",
            })
        else:
            self._send_json({"error": "not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        response = _handle_rpc(body)
        method = json.loads(body).get("method", "?") if body else "?"
        print(f"[rpc]  {method}")
        self._send_json(response)


# ---------- Entry point ----------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Axionax Dev Mock Server")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8545)))
    args = parser.parse_args()

    # Seed genesis block
    genesis = _make_block(0, "0x" + "0" * 64)
    _state["blocks"][0] = genesis

    # Start block production thread
    t = threading.Thread(target=_mine_loop, daemon=True)
    t.start()

    server = HTTPServer((args.host, args.port), Handler)
    print(f"Axionax Dev Mock Server running on http://{args.host}:{args.port}")
    print(f"  chain_id : {_state['chain_id']}")
    print(f"  block    : every {_BLOCK_TIME}s")
    print(f"  health   : http://{args.host}:{args.port}/health")
    print(f"  metrics  : http://{args.host}:{args.port}/metrics")
    print(f"  version  : http://{args.host}:{args.port}/version")
    print("Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
