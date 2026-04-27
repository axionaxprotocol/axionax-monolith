# Join the Network

**Main documentation is in [README.md](README.md)** — see "Quick Start — Join the Network"

## Blockchain full node (Rust `axionax-node`, testnet 86137)

To run a **permissionless full node** (sync + optional local RPC) from anywhere on the Internet, follow **[docs/RUN_PUBLIC_FULL_NODE.md](docs/RUN_PUBLIC_FULL_NODE.md)** and keep bootstrap multiaddrs in sync with **[docs/PUBLIC_TESTNET_BOOTSTRAPS.txt](docs/PUBLIC_TESTNET_BOOTSTRAPS.txt)**.

## DeAI / Worker (Python)

```bash
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe
python3 scripts/update-node.py
python3 scripts/join-axionax.py
```
