# Runbook — Deploy & Incident Response

Operational procedures for Axionax validators, RPC nodes, and incident response.

---

## 1. Deploy

### 1.1 Validator Node (First Time)

1. **Provision VPS** per [NODE_SPECS.md](./NODE_SPECS.md) (e.g. 8 cores, 16 GB RAM, 200 GB NVMe).
2. **Install deps** (Ubuntu/Debian):
   ```bash
   sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev clang
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
   source "$HOME/.cargo/env"
   ```
3. **Build node**:
   ```bash
   git clone <repo> && cd axionax-core-universe/core
   cargo build --release -p axionax-core
   ```
4. **Place genesis**:
   ```bash
   mkdir -p ~/.axionax/config
   cp /path/to/genesis.json ~/.axionax/config/
   sha256sum ~/.axionax/config/genesis.json   # verify hash with announced)
   ```
5. **Configure** `~/.axionax/config/config.yaml` (chain_id, state_path, network, RPC).
6. **Run with systemd** (see [ops/deploy/setup_systemd.sh](../ops/deploy/setup_systemd.sh) or [GENESIS_LAUNCH_README.md](../tools/GENESIS_LAUNCH_README.md)).
7. **Open ports**: P2P 30333, RPC 8545 (if exposed).

### 1.2 RPC Node

Same as validator but without block production; point dApps/Explorer/Faucet to this node’s `http://HOST:8545`. Prefer separate RPC node(s) for production load.

### 1.3 Faucet

1. Generate key: `python scripts/generate-faucet-key.py` (mainnet) or `--testnet`.
2. Set env: `FAUCET_PRIVATE_KEY`, `RPC_URL`, `PORT=3002`.
3. Build/run faucet (e.g. `core/tools/faucet` or ops Dockerfile).
4. Regenerate genesis with `--faucet-address <ADDRESS>` if not already in genesis.

### 1.4 Bootnode

Minimal node for P2P discovery only. Share enode with validators; ensure port 30333 is open.

---

## 2. Incident Response

### 2.1 Chain Not Producing Blocks

- **Check validators**: `systemctl status axionax-validator` (or equivalent) on each validator.
- **Logs**: `journalctl -u axionax-validator -f` — look for consensus/network errors.
- **Peers**: Ensure validators can reach each other (firewall, enode, bootnode).
- **Genesis**: Confirm all validators use the same genesis hash; if not, re-distribute genesis and restart.

### 2.2 RPC Unresponsive or Slow

- **Restart RPC process** (or node if RPC is embedded).
- **Check disk I/O** and state DB size; consider pruning or separate RPC node.
- **Rate limiting**: If under attack, enable rate limits or put RPC behind a proxy.

### 2.3 Fork / Divergent Chain

- **Identify canonical chain** (e.g. longest/most stake).
- **Minority validators**: Stop node, remove local chain data for the forked segment, re-sync from a canonical peer or re-download genesis and restart.
- **Announce** in validator channel and document cause.

### 2.4 High Load / DoS

- **Enable rate limits** on RPC and faucet.
- **Block abusive IPs** at firewall or reverse proxy.
- **Scale**: Add RPC nodes or increase resources per [NODE_SPECS.md](./NODE_SPECS.md).

### 2.5 Faucet Empty or Failing

- **Balance**: Check faucet address balance via RPC.
- **Key**: Verify `FAUCET_PRIVATE_KEY` and RPC connectivity.
- **Rate limits**: Relax temporarily if legitimate demand; then tune and re-enable.

---

## 3. Quick Reference

| Item | Location |
|------|----------|
| Genesis checklist | [MAINNET_GENESIS_CHECKLIST.md](./MAINNET_GENESIS_CHECKLIST.md) |
| Launch steps | [GENESIS_LAUNCH_README.md](../tools/GENESIS_LAUNCH_README.md) |
| Node specs | [NODE_SPECS.md](./NODE_SPECS.md) |
| Architecture | [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) |

---

**Version:** 2026-02
