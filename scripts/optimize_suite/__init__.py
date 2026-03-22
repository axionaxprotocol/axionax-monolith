"""
Axionax testnet optimization suite: light usage simulation and optional RPC stress tests.

- Targets only JSON-RPC you pass in (--rpc / AXIONAX_RPC_URL); no third-party APIs for chain logic.
- Optional cyber mode is for operator-authorized testing of your own RPC/proxy, not third-party networks.
- Dependencies: stdlib + requests (see scripts/requirements.txt); no runtime fetch from package registries.

Run: from repo root `python scripts/run_optimize_suite.py --help`, or from `scripts/` directory `python run_optimize_suite.py --help` (do not prefix `scripts/` when cwd is already `scripts`).
"""

__version__ = "0.1.0"
