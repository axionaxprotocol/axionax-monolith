# Run a public full node (Axionax testnet)

Anyone with a Linux or macOS host (or WSL on Windows), a public IP, and open firewall ports can run **`axionax-node`** in **`full`** mode and join the **public Axionax testnet** (chain ID **86137**). No allowlist or special account is required.

---

## 1. What you get

| Item | Value |
|------|--------|
| **Role** | Full node: syncs via P2P, serves JSON-RPC locally (or on your LAN/VPS) |
| **Chain ID** | `86137` (`0x15079`) |
| **Genesis** | Same file as the public validators — see [§2](#2-genesis-file) |
| **Bootstrap** | At least one libp2p **multiaddr** so your node can discover peers — see [§3](#3-bootstrap-multiaddrs) |

---

## 2. Genesis file

Use the **canonical** genesis from this repository (same hash validators use).

**Option A — already cloned the repo**

```text
core/tools/genesis.json
```

**Option B — download only (no clone)**

```bash
curl -fsSL -o genesis.json \
  https://raw.githubusercontent.com/axionaxprotocol/axionax-core-universe/main/core/tools/genesis.json
```

Verify the file is JSON and contains `"chainId": 86137` (or `86137` under `config` per your file layout).

---

## 3. Bootstrap multiaddrs

Testnet nodes use **libp2p** multiaddrs, for example:

```text
/ip4/203.0.113.10/tcp/30303/p2p/12D3KooWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Set **one or more** (comma-separated, no spaces) in the environment variable:

```bash
export AXIONAX_BOOTSTRAP_NODES="/ip4/.../tcp/30303/p2p/12D3KooW...,/ip4/.../tcp/30303/p2p/12D3KooW..."
```

**Where to get current values**

1. **Repository list (preferred when maintained)** — file [PUBLIC_TESTNET_BOOTSTRAPS.txt](PUBLIC_TESTNET_BOOTSTRAPS.txt): non-comment lines are multiaddrs. Load them:

   ```bash
   export AXIONAX_BOOTSTRAP_NODES="$(grep -v '^#' docs/PUBLIC_TESTNET_BOOTSTRAPS.txt | grep '/ip4/' | paste -sd, -)"
   ```

2. **Maintainer export (preferred)** — run `ops/deploy/scripts/export-bootstrap-multiaddr.sh` on each validator host, then publish results into `docs/PUBLIC_TESTNET_BOOTSTRAPS.txt`.

3. **Community / operators** — if the file is stale, ask on the project’s public channels or an operator of a running validator for a current multiaddr (from validator logs: line **`Local peer ID:`** plus the validator’s public **IP** and **P2P port**, usually **30303**).

4. **Validator IPs (reference only)** — public validator endpoints are listed in [README.md](../README.md) (*Current Network (Testnet)*) and [NETWORK_NODES.md](../core/docs/NETWORK_NODES.md). You still need the **PeerId** (`12D3KooW…`) to build the full multiaddr.

Without a valid `AXIONAX_BOOTSTRAP_NODES`, your node may start but **not** find the public chain.

---

## 4. Prerequisites

| Requirement | Notes |
|-------------|--------|
| **OS** | Linux x86_64 (recommended), macOS, or WSL2 |
| **Rust** | Stable toolchain (see [AGENTS.md](../AGENTS.md) — use recent stable for `edition2024` deps) |
| **RAM** | ≥ 4 GB recommended |
| **Disk** | ≥ 20 GB for state (more for long-running nodes) |
| **Network** | Inbound **30303/tcp** (and **30303/udp** if you use UDP) open to the Internet; **8545** only if you expose RPC |
| **Firewall** | Open SSH + P2P; restrict **8545** to localhost unless you intend a public RPC |

---

## 5. Build the binary

```bash
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe/core
cargo build --release -p node
```

Binary path:

```text
target/release/axionax-node
```

---

## 6. One-command layout (recommended)

From the repository, use the bootstrap script (build → data directory → `run.sh` → optional systemd):

```bash
cd axionax-core-universe/ops/deploy/scripts
chmod +x axionax-node-bootstrap.sh

./axionax-node-bootstrap.sh build

export AXIONAX_BOOTSTRAP_NODES="<comma-separated-multiaddrs-from-section-3>"

sudo ./axionax-node-bootstrap.sh setup --role full --data-dir /var/lib/axionax-node

sudo ./axionax-node-bootstrap.sh run --data-dir /var/lib/axionax-node
```

For a **system service**:

```bash
sudo ./axionax-node-bootstrap.sh install-systemd --data-dir /var/lib/axionax-node
sudo systemctl start axionax-node
sudo systemctl status axionax-node
```

Reference: [README-NODE-RUNTIME.md](../ops/deploy/scripts/README-NODE-RUNTIME.md), [VPS_FULL_NODE_RUNBOOK.md](../ops/deploy/VPS_FULL_NODE_RUNBOOK.md).

---

## 7. Verify RPC

If RPC listens on `127.0.0.1:8545`:

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://127.0.0.1:8545
```

Expect `"result":"0x15079"`. Compare block height with the public endpoint (read-only):

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://rpc.axionax.org
```

Heights should move toward the same network over time once peers connect.

Script:

```bash
./axionax-node-bootstrap.sh doctor --rpc http://127.0.0.1:8545
```

---

## 8. Public RPC vs your full node

| Endpoint | Role |
|----------|------|
| `https://rpc.axionax.org` | Hosted public RPC for wallets and apps — **no** P2P bootstrap from your browser |
| Your node’s `:8545` | Your own RPC after sync — under **your** security and rate limits |

Running a full node does **not** replace the public RPC URL in MetaMask unless you choose to point MetaMask at **your** server.

---

## 9. Docker (optional)

If you use a published container image instead of building from source, follow the same **genesis** and **`AXIONAX_BOOTSTRAP_NODES`** rules as in [environments/testnet/public/docker-compose.yaml](../ops/deploy/environments/testnet/public/docker-compose.yaml) (`--chain` volume, env for bootstraps). Image tags and registry are defined in that stack.

---

## 10. Maintainer note (project team)

Keep [PUBLIC_TESTNET_BOOTSTRAPS.txt](PUBLIC_TESTNET_BOOTSTRAPS.txt) updated with **non-comment** multiaddrs whenever validator **PeerIds** or IPs change, so operators can copy-paste without private chats.

Use:

```bash
cd ops/deploy/scripts
./export-bootstrap-multiaddr.sh --public-ip <VALIDATOR_PUBLIC_IP>
```

---

*Canonical public full-node guide for axionax-core-universe.*
