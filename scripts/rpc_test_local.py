#!/usr/bin/env python3
"""Quick RPC test for local node."""
import urllib.request
import json

url = "http://127.0.0.1:8545"
body = json.dumps({"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}).encode()
req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=5) as r:
    out = json.loads(r.read().decode())
    print(json.dumps(out, indent=2))
