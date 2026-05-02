# Connectivity: Local Full Node, VPS Validator, and Frontend

How **Local full node**, **VPS Validator node**, and **Frontend (hosted website)** connect, and what must be configured.

---

## Overview

| Component | Location / URL | Connects to |
|-----------|----------------|-------------|
| **VPS Validator #1** | 217.216.109.5 (EU), RPC :8545, P2P :30303 | Validator #2 (P2P), clients (RPC) |
| **VPS Validator #2** | 46.250.244.4 (AU), RPC :8545, P2P :30303 | Validator #1 (P2P), clients (RPC) |
| **DNS (if used)** | rpc.axionax.org, faucet.axionax.org, explorer.axionax.org | Points to VPS hosting that service |
| **Frontend (axionax-web-universe)** | Hosted at axionax.org / Vercel / VPS | Uses RPC via URL set in env |
| **Local full node** | Your machine (node running locally) | Choice: point to Public Testnet or run own chain |

---

## 1. Public Testnet (VPS Validators + Frontend)

### Intended connectivity

```
[User] → [axionax.org / website] → RPC (rpc.axionax.org or IP:8545)
                    ↓
            [VPS Validator #1 or #2]
                    ↓
            Chain ID 86137, same state
```

- **Both validators** run the same chain (same genesis, Chain ID 86137) and sync via P2P (port 30303).
- **Frontend (website)** must use an **RPC URL** that points to a node of this chain to be "connected" to the real testnet:
  - With DNS: `NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org` (or `https://testnet-rpc.axionax.org`)
  - Or by IP: `http://217.216.109.5:8545` / `http://46.250.244.4:8545`
- **Faucet** must have `RPC_URL` pointing to the RPC of this chain (validator or RPC node in sync with the validator) to distribute AXX on the same chain the frontend uses.

### What must be in place for "fully connected"

| Item | Status | Notes |
|------|--------|-------|
| VPS Validator runs node and exposes 8545, 30303 | Per README / VPS_VALIDATOR_UPDATE | Must be running and firewall open |
| DNS: rpc.axionax.org → RPC host IP | Set in DNS | If no DNS, use IP in frontend |
| DNS: faucet.axionax.org → Faucet host | Set in DNS | Faucet must set RPC_URL to chain 86137 |
| Frontend (web-universe) env: NEXT_PUBLIC_RPC_URL | Set on hosted site | Use rpc.axionax.org or http://217.216.109.5:8545 |
| Faucet running and RPC_URL pointing to Validator/RPC | Set on Faucet host | See ops/deploy, Dockerfile.faucet |

**Summary:** Everything is connected only when (1) validators run and expose RPC, (2) frontend uses this chain’s RPC URL, (3) Faucet uses the same RPC, and (4) if using domains, DNS is set correctly.

---

## 2. Local Full Node

### Option A: Connect to Public Testnet

- Run a full node on your machine with **bootstrap / RPC** pointing at a validator to sync with the same chain as VPS and frontend:
  - Env: `AXIONAX_BOOTSTRAP_NODES=/ip4/217.216.109.5/tcp/30303/p2p/<PEER_ID>` (requires actual Peer ID from validator)
  - Or do not sync P2P and use the validator RPC as a "remote RPC" from apps/scripts.
- If you use the validator RPC directly (e.g. `http://217.216.109.5:8545`), a **local full node is not required** just to use the frontend/faucet; run one when you want a local copy of the chain.

### Option B: Run a separate chain (not connected to Public Testnet)

- Run the node in standalone mode (no bootstrap or different genesis/chain_id) to get a **local-only chain**:
  - If the frontend runs locally with `NEXT_PUBLIC_RPC_URL=http://localhost:8545`, it connects to this chain, not the VPS validators.
  - Suitable for development only.

---

## 3. Frontend (hosted — axionax-web-universe)

- The hosted site (axionax.org or elsewhere) reads **RPC URL from env** (e.g. `NEXT_PUBLIC_RPC_URL`, `VITE_RPC_URL`):
  - If set to `https://rpc.axionax.org` or `http://217.216.109.5:8545` → connected to **Public Testnet (validators)**.
  - If set to `http://localhost:8545` → connected to **local node (local chain or local node synced to testnet)**.
- So **which chain the frontend uses depends on the RPC URL** used at build/run time, not on where the validator is hosted.

---

## 4. Summary: "Is everything connected?"

| Pair | Connected? | Condition |
|------|------------|-----------|
| **VPS Validator #1 ↔ #2** | Yes | P2P 30303 open between them; same genesis and chain_id |
| **Frontend ↔ Public Testnet** | Yes | Set NEXT_PUBLIC_RPC_URL (or equivalent) to the chain’s RPC (or rpc.axionax.org if DNS points there) |
| **Faucet ↔ Public Testnet** | Yes | Run Faucet and set RPC_URL to the RPC of chain 86137 (validator/RPC node) |
| **Local full node ↔ Public Testnet** | Yes | Set bootstrap/RPC to validator and use same genesis/chain_id |
| **Hosted frontend ↔ Local full node** | Yes | Set frontend RPC URL to the local node (e.g. http://localhost:8545 or IP:8545) |

**Overall:** If DNS (rpc.axionax.org, faucet.axionax.org) points to the VPS that actually run those services, and the frontend uses those URLs, then local full node (if running and synced to validators), VPS validators, and hosted frontend all use the **same chain** and are "connected" at the data level. If DNS is not set or the frontend points RPC elsewhere, configure DNS and env as in the table above.

---

## 5. Quick verification

```bash
# Public Testnet RPC
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://217.216.109.5:8545
# Expect "0x15079" (86137)

# With DNS
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://rpc.axionax.org
```

Full verification script: `ops/deploy/scripts/verify-launch-ready.sh` (checks DNS, RPC, Explorer, Faucet).
