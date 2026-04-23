# axionax-node runtime scripts (build → run)

**Public testnet (any operator):** see canonical guide [docs/RUN_PUBLIC_FULL_NODE.md](../../../docs/RUN_PUBLIC_FULL_NODE.md).

Use **`axionax-node-bootstrap.sh`** to build `axionax-node`, lay out data (`genesis.json`, `node.env`, `run.sh`), run in the foreground, or install **systemd**.

| Command | Purpose |
|---------|---------|
| `build` | `cargo build --release -p node` → `core/target/release/axionax-node` |
| `setup` | Create `--data-dir`, copy genesis, write `node.env` + executable `run.sh` |
| `run` | `exec` the node via `run.sh` (loads `node.env`) |
| `install-systemd` | Install `axionax-node.service` → `ExecStart=$DATA_DIR/run.sh` |
| `doctor` | `curl` `eth_chainId` + `eth_blockNumber` |

**Helper:** `node-runtime-common.sh` (sourced only; do not run directly).

---

## Quick path (full node, testnet 86137)

From repo after clone:

```bash
cd axionax-core-universe/ops/deploy/scripts
chmod +x axionax-node-bootstrap.sh

./axionax-node-bootstrap.sh build

sudo AXIONAX_BOOTSTRAP_NODES='/ip4/VALIDATOR_IP/tcp/30303/p2p/PEER_ID' \
  ./axionax-node-bootstrap.sh setup --role full --data-dir /var/lib/axionax-node

sudo ./axionax-node-bootstrap.sh run --data-dir /var/lib/axionax-node
```

Production-style:

```bash
sudo ./axionax-node-bootstrap.sh install-systemd --data-dir /var/lib/axionax-node
sudo systemctl start axionax-node
./axionax-node-bootstrap.sh doctor --rpc http://127.0.0.1:8545
```

---

## Roles

| `--role` | Notes |
|----------|--------|
| `full` | Full sync + RPC (default for community nodes) |
| `rpc` | RPC-oriented full node (same binary flags; use for dedicated RPC) |
| `validator` | Requires `--validator-address` or `AXIONAX_VALIDATOR_ADDRESS` |
| `bootnode` | Default RPC bind `127.0.0.1:8545`; set `--p2p 0.0.0.0:30303` if needed |

---

## Environment

| Variable | When |
|----------|------|
| `AXIONAX_REPO_ROOT` | Repo root if not `…/axionax-core-universe` relative to `ops/deploy/scripts` |
| `AXIONAX_BOOTSTRAP_NODES` | Comma-separated libp2p multiaddrs; required to join existing validators |
| `AXIONAX_VALIDATOR_ADDRESS` | `0x…` for `--role validator` |
| `AXIONAX_NODE_BIN` | Override path to `axionax-node` (written into `node.env` at `setup`) |

After `setup`, edit `node.env` if bootstrap was left empty.

---

## Legacy

`run-full-node.sh` forwards to this flow; prefer `axionax-node-bootstrap.sh` for genesis path and systemd.

See also: [VPS_FULL_NODE_RUNBOOK.md](../VPS_FULL_NODE_RUNBOOK.md), [NETWORK_NODES.md](../../../core/docs/NETWORK_NODES.md).
