# Public Full Node Smoke Test (External Operator)

Run this checklist from a **fresh machine** (not one of the validator hosts) to verify that the public full-node guide is reproducible end-to-end.

Related: `docs/RUN_PUBLIC_FULL_NODE.md`, `docs/PUBLIC_TESTNET_BOOTSTRAPS.txt`.

---

## 1) Test prerequisites

- Fresh Linux/macOS host (or clean WSL) with Internet access.
- `git`, `curl`, `python3`, Rust toolchain installed.
- Inbound firewall open for `30303/tcp` (and `30303/udp` if used).
- `docs/PUBLIC_TESTNET_BOOTSTRAPS.txt` contains at least one **uncommented** `/ip4/.../p2p/...` line.

If bootstrap list is empty, stop and publish bootstrap values first.

---

## 2) Run from scratch

```bash
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe

export AXIONAX_BOOTSTRAP_NODES="$(grep -v '^#' docs/PUBLIC_TESTNET_BOOTSTRAPS.txt | grep '/ip4/' | paste -sd, -)"
test -n "$AXIONAX_BOOTSTRAP_NODES"

cd ops/deploy/scripts
chmod +x axionax-node-bootstrap.sh
./axionax-node-bootstrap.sh build

sudo ./axionax-node-bootstrap.sh setup --role full --data-dir /var/lib/axionax-node
sudo timeout 300 ./axionax-node-bootstrap.sh run --data-dir /var/lib/axionax-node
```

Notes:
- `timeout 300` runs for 5 minutes to observe initial sync behavior.
- For permanent run, use `install-systemd` instead of `timeout`.

---

## 3) Verify required outcomes

### Chain identity

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://127.0.0.1:8545
```

Expected: `"result":"0x15079"` (86137).

### Height movement

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545

sleep 30

curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545
```

Expected: second height >= first height.

### Height parity (tolerance)

```bash
LOCAL_HEX=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545 | jq -r '.result')

PUBLIC_HEX=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://rpc.axionax.org | jq -r '.result')

python3 - <<'PY'
import os
local_h = int(os.environ["LOCAL_HEX"], 16)
public_h = int(os.environ["PUBLIC_HEX"], 16)
print("local=", local_h, "public=", public_h, "delta=", abs(local_h-public_h))
PY
```

Expected: delta trends down over time (allow temporary lag during initial sync).

---

## 4) Record and publish smoke-test evidence

Create a short report in `reports/`:

- Date/time (UTC)
- Host spec (CPU/RAM/disk/region)
- Bootstrap list snapshot used
- Chain ID result
- Initial + final block heights
- Local/public height delta
- Pass/Fail with notes

Suggested filename:

```text
reports/SMOKE_TEST_PUBLIC_FULL_NODE_YYYYMMDD.md
```

---

## 5) Publish bootstrap list (maintainer flow)

Run on each validator host:

```bash
cd ops/deploy/scripts
chmod +x export-bootstrap-multiaddr.sh
./export-bootstrap-multiaddr.sh --public-ip <VALIDATOR_PUBLIC_IP>
```

Take outputs from all active validators and paste as uncommented lines into:

`docs/PUBLIC_TESTNET_BOOTSTRAPS.txt`

Then re-run this smoke test from a clean machine.
