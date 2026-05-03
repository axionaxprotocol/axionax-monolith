# External Operator Acceptance Checklist

Use this before public announcement to verify that an external operator can run and validate a full node without private assistance.

---

## A. Bootstrap and docs readiness

- [ ] `docs/PUBLIC_TESTNET_BOOTSTRAPS.txt` contains at least 2 uncommented, verified multiaddrs.
- [ ] Each bootstrap line matches `/ip4/<ip>/tcp/30303/p2p/<PeerId>`.
- [ ] `docs/RUN_PUBLIC_FULL_NODE.md` is up to date with current chain ID and script paths.
- [ ] `docs/SMOKE_TEST_PUBLIC_FULL_NODE.md` has a latest PASS report reference.

## B. Reproducibility from a fresh machine

- [ ] Fresh machine can clone repo and build `axionax-node` with documented commands only.
- [ ] `axionax-node-bootstrap.sh setup --role full` works without manual file patching.
- [ ] Node starts with `run` or `install-systemd` and keeps running for at least 15 minutes.
- [ ] `eth_chainId` returns `0x15079`.
- [ ] Block height increases over time locally.

## C. Network correctness

- [ ] Local node height trends toward public RPC height.
- [ ] No persistent zero-peer condition after bootstrap is set.
- [ ] No recurring critical runtime errors in logs (panic, DB corruption, bind failure loops).

## D. Benchmark and claim readiness

- [ ] `docs/BENCHMARK_BASELINE.md` process has been run at least once this week.
- [ ] Latest benchmark artifacts exist in `reports/` (JSON/TXT/MD).
- [ ] Any public performance statement references measured profile and date.
- [ ] No unqualified "fastest/highest in the world" claim in docs/announcements.

## E. Operator support quality

- [ ] Troubleshooting section includes at least: wrong genesis, missing bootstrap, blocked port, RPC bind conflict.
- [ ] One command is documented for publishing bootstrap values from validator hosts.
- [ ] Team owner is assigned to maintain `PUBLIC_TESTNET_BOOTSTRAPS.txt`.

---

## Sign-off

| Item | Value |
|------|-------|
| Date (UTC) | |
| Reviewer | |
| Result | PASS / CONDITIONAL / FAIL |
| Notes | |
