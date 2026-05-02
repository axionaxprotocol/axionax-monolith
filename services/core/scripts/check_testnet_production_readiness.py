#!/usr/bin/env python3
"""
Production-grade testnet readiness checks.

- Validators: chain ID, height alignment among validators only, same block hash at shared height.
- Public RPC: chain ID, tip lag vs validator tips (proxy may trail one node), hash at same height when aligned.
- Faucet: HTTP reachability (not 5xx).

Run from repo root:
  python scripts/check_testnet_production_readiness.py
  python scripts/check_testnet_production_readiness.py --skip-validators --public-rpc https://rpc.axionax.org

Requires: requests (scripts/requirements.txt). Validator URLs must be reachable from this host.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from optimize_suite.rpc import jsonrpc_post  # noqa: E402


@dataclass
class CheckItem:
    name: str
    ok: bool
    detail: str
    data: dict[str, Any] = field(default_factory=dict)


def _norm_chain_id(s: Any) -> str:
    if s is None:
        return ""
    h = str(s).strip().lower()
    if h.startswith("0x"):
        return h
    try:
        return hex(int(h, 16)).lower()
    except (TypeError, ValueError):
        return h


def _block_number_int(res: Any) -> int:
    if res is None:
        raise ValueError("no result")
    return int(res, 16) if isinstance(res, str) else int(res)


def _hash_from_block(result: Any) -> Optional[str]:
    if not isinstance(result, dict):
        return None
    h = result.get("hash")
    if isinstance(h, str):
        return h.lower()
    return None


def _height(
    url: str, timeout_sec: float
) -> Tuple[bool, int, Optional[str]]:
    r = jsonrpc_post(url, "eth_blockNumber", [], timeout_sec=timeout_sec)
    if not r.ok:
        return False, -1, r.error or str(r.rpc_error)
    try:
        return True, _block_number_int(r.result), None
    except (TypeError, ValueError):
        return False, -1, "bad block number"


def run_checks(
    *,
    validators: List[str],
    public_rpc: str,
    faucet_url: str,
    expected_chain_id: str,
    max_validator_height_diff: int,
    max_public_lag_blocks: int,
    skip_faucet: bool,
    skip_validators: bool,
    timeout_sec: float,
) -> tuple[bool, List[CheckItem]]:
    items: List[CheckItem] = []
    exp = _norm_chain_id(expected_chain_id)

    all_urls: List[str] = []
    if not skip_validators:
        all_urls.extend(validators)
    all_urls.append(public_rpc)
    seen: set[str] = set()
    all_urls = [u for u in all_urls if not (u in seen or seen.add(u))]

    # --- Chain ID (all endpoints) ---
    for url in all_urls:
        r = jsonrpc_post(url, "eth_chainId", [], timeout_sec=timeout_sec)
        cid = _norm_chain_id(r.result) if r.ok else ""
        ok = r.ok and cid == exp
        items.append(
            CheckItem(
                name=f"eth_chainId {url}",
                ok=ok,
                detail="match" if ok else f"expected {exp}, got {cid!r} err={r.error!r}",
                data={"chain_id": cid},
            )
        )

    # Heights map
    heights: Dict[str, int] = {}
    for url in all_urls:
        ok_h, h, err = _height(url, timeout_sec)
        heights[url] = h
        items.append(
            CheckItem(
                name=f"eth_blockNumber {url}",
                ok=ok_h and h >= 0,
                detail=f"height={h}" if ok_h else f"fail {err}",
                data={"height": h},
            )
        )

    nums_ok = all(heights.get(u, -1) >= 0 for u in all_urls)
    val_urls = [u for u in validators if u in heights]
    pub_h = heights.get(public_rpc, -1)

    # --- Validators-only consensus (>=2 validators) ---
    validators_aligned = True
    min_v = max_v = 0

    if len(val_urls) >= 2 and nums_ok:
        vhs = [heights[u] for u in val_urls if heights[u] >= 0]
        if len(vhs) >= 2:
            min_v, max_v = min(vhs), max(vhs)
            diff_v = max_v - min_v
            validators_aligned = diff_v <= max_validator_height_diff
            items.append(
                CheckItem(
                    name="validators_height_consensus",
                    ok=validators_aligned,
                    detail=f"min={min_v} max={max_v} diff={diff_v} (max_allowed={max_validator_height_diff})",
                    data={"min": min_v, "max": max_v, "diff": diff_v},
                )
            )
            # Hash at min height among validators
            block_param = hex(min_v)
            ref_hash: Optional[str] = None
            v_hashes: Dict[str, Optional[str]] = {}
            v_hash_ok = True
            for url in val_urls:
                if heights[url] < min_v:
                    v_hash_ok = False
                    continue
                r = jsonrpc_post(
                    url,
                    "eth_getBlockByNumber",
                    [block_param, False],
                    timeout_sec=timeout_sec,
                )
                bh = _hash_from_block(r.result) if r.ok else None
                v_hashes[url] = bh
                if bh is None:
                    v_hash_ok = False
                elif ref_hash is None:
                    ref_hash = bh
                elif bh != ref_hash:
                    v_hash_ok = False
            v_detail = (
                "all match"
                if v_hash_ok and validators_aligned
                else (
                    f"height diff too large (see validators_height_consensus); hashes={v_hashes}"
                    if not validators_aligned
                    else f"hash mismatch hashes={v_hashes}"
                )
            )
            items.append(
                CheckItem(
                    name=f"validators_block_hash @{block_param}",
                    ok=v_hash_ok and validators_aligned,
                    detail=v_detail,
                    data={"hashes": v_hashes},
                )
            )
            validators_aligned = validators_aligned and v_hash_ok
        else:
            items.append(
                CheckItem(
                    name="validators_height_consensus",
                    ok=False,
                    detail="not enough validator heights",
                    data={},
                )
            )
            validators_aligned = False
    elif len(val_urls) >= 2 and not nums_ok:
        items.append(
            CheckItem(
                name="validators_height_consensus",
                ok=False,
                detail="one or more endpoints failed eth_blockNumber",
                data={},
            )
        )
        validators_aligned = False
    elif len(val_urls) == 1 and nums_ok:
        items.append(
            CheckItem(
                name="validators_height_consensus",
                ok=True,
                detail="skipped (single validator; add second --validator for consensus check)",
                data={},
            )
        )
        min_v = max_v = heights.get(val_urls[0], 0)
    elif skip_validators or not val_urls:
        items.append(
            CheckItem(
                name="validators_height_consensus",
                ok=True,
                detail="skipped (--skip-validators or no validators)",
                data={},
            )
        )

    # --- Public RPC vs validator tips (when validators listed and consensus is required for prod) ---
    if not skip_validators and len(val_urls) >= 1 and public_rpc in heights and pub_h >= 0:
        v_max = max(heights[u] for u in val_urls if heights[u] >= 0)
        v_min = min(heights[u] for u in val_urls if heights[u] >= 0)
        lag_behind_tip = v_max - pub_h
        # Public should not trail the slowest validator by more than lag budget, and not be far behind fastest
        public_ok = (pub_h >= v_min) and (lag_behind_tip <= max_public_lag_blocks)
        items.append(
            CheckItem(
                name="public_rpc_tip_lag",
                ok=public_ok,
                detail=(
                    f"public={pub_h} validator_min={v_min} validator_max={v_max} "
                    f"lag_behind_max_tip={lag_behind_tip} (max_allowed={max_public_lag_blocks})"
                ),
                data={
                    "public_height": pub_h,
                    "validator_min": v_min,
                    "validator_max": v_max,
                    "lag_behind_tip": lag_behind_tip,
                },
            )
        )
        # Same hash at min_v across validators+public when validators aligned and public has min_v block
        if validators_aligned and len(val_urls) >= 2 and pub_h >= min_v:
            block_param = hex(min_v)
            hashes_all: Dict[str, Optional[str]] = {}
            all_match = True
            ref: Optional[str] = None
            for url in val_urls + [public_rpc]:
                if heights[url] < min_v:
                    all_match = False
                    continue
                r = jsonrpc_post(
                    url,
                    "eth_getBlockByNumber",
                    [block_param, False],
                    timeout_sec=timeout_sec,
                )
                bh = _hash_from_block(r.result) if r.ok else None
                hashes_all[url] = bh
                if bh is None:
                    all_match = False
                elif ref is None:
                    ref = bh
                elif bh != ref:
                    all_match = False
            items.append(
                CheckItem(
                    name=f"full_stack_block_hash @{block_param}",
                    ok=all_match,
                    detail="validators+public match" if all_match else f"hashes={hashes_all}",
                    data={"hashes": hashes_all},
                )
            )
        elif len(val_urls) >= 2 and not validators_aligned:
            items.append(
                CheckItem(
                    name="full_stack_block_hash",
                    ok=False,
                    detail="skipped (validators not aligned)",
                    data={},
                )
            )
    elif public_rpc in heights and (skip_validators or not val_urls):
        # Public only: hash at current min (single chain)
        if pub_h >= 0:
            block_param = hex(pub_h)
            r = jsonrpc_post(
                public_rpc,
                "eth_getBlockByNumber",
                [block_param, False],
                timeout_sec=timeout_sec,
            )
            bh = _hash_from_block(r.result) if r.ok else None
            items.append(
                CheckItem(
                    name=f"public_block_hash @{block_param}",
                    ok=bh is not None,
                    detail="ok" if bh else "no hash",
                    data={"hash": bh},
                )
            )
        items.append(
            CheckItem(
                name="public_rpc_tip_lag",
                ok=True,
                detail="skipped (no validators to compare)",
                data={},
            )
        )

    # --- Faucet ---
    if not skip_faucet:
        try:
            fr = requests.get(faucet_url, timeout=timeout_sec, allow_redirects=True)
            st = fr.status_code
            f_ok = st < 500
            detail = f"status={st}"
            if st == 404:
                detail += " (root may 404; verify UI path in browser)"
            items.append(
                CheckItem(
                    name=f"faucet_http {faucet_url}",
                    ok=f_ok,
                    detail=detail,
                    data={"status": st},
                )
            )
        except requests.RequestException as e:
            items.append(
                CheckItem(
                    name=f"faucet_http {faucet_url}",
                    ok=False,
                    detail=str(e),
                    data={},
                )
            )
    else:
        items.append(CheckItem(name="faucet_http", ok=True, detail="skipped", data={}))

    # Overall: fail closed on any failed check
    overall = all(i.ok for i in items)
    return overall, items


def _write_reports(
    root: Path,
    *,
    overall: bool,
    items: List[CheckItem],
    args: argparse.Namespace,
) -> None:
    reports = root / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "overall_ok": overall,
        "production_grade_criteria": "validators consensus + public tip lag + chain IDs + faucet",
        "args": {k: v for k, v in vars(args).items() if k not in ("json_out", "md_out")},
        "checks": [asdict(i) for i in items],
    }
    if args.json_out:
        p = Path(args.json_out)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {p}")

    md_path = args.md_out or (reports / "TESTNET_PRODUCTION_READINESS_LAST.md")
    lines = [
        "# Testnet production readiness (automated)",
        "",
        f"**UTC:** {payload['generated_at_utc']}",
        f"**Overall:** {'PASS' if overall else 'FAIL'}",
        "",
        "Criteria: **validators** height/hash among themselves; **public RPC** tip lag vs validators; **faucet** HTTP; all **chainId** match.",
        "",
        "## Checks",
        "",
        "| OK | Check | Detail |",
        "|----|-------|--------|",
    ]
    for i in items:
        mark = "yes" if i.ok else "no"
        lines.append(f"| {mark} | {i.name} | {i.detail} |")
    lines.extend(
        [
            "",
            "## Manual follow-up",
            "",
            "See [docs/TESTNET_PRODUCTION_READINESS.md](../docs/TESTNET_PRODUCTION_READINESS.md) and [TESTNET_OPTIMIZATION_CHECKLIST.md](../docs/TESTNET_OPTIMIZATION_CHECKLIST.md).",
            "",
        ]
    )
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {md_path}")


def main() -> int:
    root = _SCRIPTS.parent
    ap = argparse.ArgumentParser(
        description="Production-grade testnet readiness (validators + public RPC + faucet)"
    )
    ap.add_argument(
        "--validator",
        action="append",
        default=None,
        help="Validator JSON-RPC URL (repeatable). Default: two IPs from checklist.",
    )
    ap.add_argument("--public-rpc", default="https://rpc.axionax.org")
    ap.add_argument("--faucet-url", default="https://faucet.axionax.org")
    ap.add_argument("--expected-chain-id", default="0x15079")
    ap.add_argument(
        "--max-validator-height-diff",
        type=int,
        default=25,
        help="Max block difference allowed between validators (production default: 25)",
    )
    ap.add_argument(
        "--max-public-lag",
        type=int,
        default=40,
        help="Max blocks public RPC may trail behind the highest validator tip",
    )
    ap.add_argument("--skip-faucet", action="store_true")
    ap.add_argument(
        "--skip-validators",
        action="store_true",
        help="Only public RPC (+ faucet); consensus checks skipped",
    )
    ap.add_argument("--timeout", type=float, default=20.0)
    ap.add_argument("--json-out", type=Path, default=None)
    ap.add_argument("--md-out", type=Path, default=None)
    args = ap.parse_args()

    validators = args.validator or [
        "http://217.216.109.5:8545",
        "http://46.250.244.4:8545",
    ]
    if args.skip_validators:
        validators = []

    overall, items = run_checks(
        validators=validators,
        public_rpc=args.public_rpc,
        faucet_url=args.faucet_url,
        expected_chain_id=args.expected_chain_id,
        max_validator_height_diff=args.max_validator_height_diff,
        max_public_lag_blocks=args.max_public_lag,
        skip_faucet=args.skip_faucet,
        skip_validators=args.skip_validators,
        timeout_sec=args.timeout,
    )

    for i in items:
        status = "PASS" if i.ok else "FAIL"
        print(f"[{status}] {i.name}: {i.detail}")

    _write_reports(root, overall=overall, items=items, args=args)
    return 0 if overall else 1


if __name__ == "__main__":
    raise SystemExit(main())
