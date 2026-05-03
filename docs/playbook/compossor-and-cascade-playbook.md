# Cascade Prompt Playbook — Axionax Protocol

> Curated prompts for working with **Windsurf (Cascade)** on Axionax — an L1 DePIN protocol with Rust core, Python DeAI workers, and a TypeScript Web Universe.
> Use these as starting points; refine with `@file` references for best results.

---

## 1. Debugging — P2P & Network

For the recurring "nodes connect on localhost but not over public IPs" class of problem.

### Session checklist (2026-05-01)

- [x] Resolve duplicate Cargo workspace roots (`services/core/Cargo.toml` conflict).
- [x] Add and run network handshake tests (`handshake_test`).
- [x] Verify ignored mDNS handshake test passes with `--ignored`.
- [x] Diagnose zero-peer state (empty `AXIONAX_BOOTSTRAP_NODES` + unreachable P2P path).
- [x] Fix peer identity / bootstrap setup and confirm both nodes show `peers: 1`.
- [x] Add runbook for `identity.key` and `AXIONAX_BOOTSTRAP_NODES` in `README.md`.
- [x] Rename playbook to `docs/compossor-and-cascade-playbook.md` and update references.

### Analyze P2P discovery logic

> Analyze the P2P discovery logic in `@services/core/core/core/network/src/`. Why would nodes fail to connect over public IPs while working fine on localhost? Check if the DHT/Kademlia or bootstrap node configuration needs explicit external IP handling (NAT traversal, AutoNAT, observed-address relays).

### Audit Docker port mapping

> Review `@services/core/docker-compose.dev.yml` and `@services/core/ops/deploy/Dockerfile`. Ensure that the P2P ports (UDP/TCP 30303) are correctly exposed and mapped to the host machine for cross-cloud connectivity. Suggest any missing network configurations (UFW rules, cloud security groups, multiaddr advertisement).

### Add tracing & logging

> Add detailed `tracing` spans and structured logs to the handshake and peer discovery process in `@services/core/core/core/network/src/manager.rs`. I need to see exactly where the connection drops — at the TCP level, the noise handshake, or the libp2p protocol negotiation phase.

---

## 2. Infrastructure & Automation

For multi-node operations and CI hygiene.

### Node-sync health script

> Create `scripts/check-node-sync.sh` that queries the local RPC (`http://localhost:8545`) and a peer's RPC, compares block heights via `eth_blockNumber`, and triggers a warning log if the local node lags behind the peer by more than 10 blocks. Exit code should be non-zero on degradation so cron / systemd timers can act.

### Optimize Docker image

> Refactor `@services/core/ops/deploy/Dockerfile` to use a multi-stage build with cargo dependency caching (cargo-chef or equivalent). Aim for the smallest final image while keeping shared libraries needed for AI acceleration (BLAS, OpenSSL). Pin base image versions and run as non-root.

### Periodic validator monitor

> Add a `validator_monitor.py` to `@services/core/ops/scripts/` that polls each validator's RPC, records block height + peer count, alerts on Slack/Discord if any validator stalls for >30s, and writes a daily summary to `reports/`.

---

## 3. Scaling & AI Workload

For evolving the protocol toward production AI workloads.

### Design AI Task transaction type

> Propose a Rust struct for an `AiTask` transaction variant in `@services/core/core/core/blockchain/` that can carry model metadata (hash + IPFS CID) and input parameters efficiently across the network without bloating the block size. Consider compression and witness separation. Update the `Transaction` enum and add serde tests.

### RPC security audit

> Review `@services/core/core/core/rpc/` for potential vulnerabilities. Suggest a way to implement rate-limiting or API key authentication for explorer / dApp access without breaking the existing `eth_*` JSON-RPC contract. Include middleware design and Prometheus metric for `rpc_throttled_total`.

### DeAI sandbox hardening

> Audit `@services/core/core/deai/` for sandbox escape risks. Recommend changes to `DockerSandbox` so untrusted compute jobs cannot exfiltrate node keys or RPC credentials. Add allow-listed syscall set if practical.

---

## 4. Documentation & Branding

Keep docs aligned with the protocol's professional tone.

### Minimalist testnet README

> Generate a technical `README.md` for the testnet repo. Use a professional, minimalist tone. Include sections for **Hardware Requirements**, **Quick Start with Docker**, **Network Endpoints (current testnet)**, and a **P2P Troubleshooting** guide.

### Monorepo structure audit

> Analyze the current monorepo structure (`@apps/`, `@services/core/`, `@packages/`). Does it follow best practices for a growing L1 project? Suggest a folder hierarchy that cleanly separates **Core**, **Web Universe**, **Shared Packages**, and **Ops**. Note migration steps and any breaking imports.

### Changelog discipline

> Update `@services/core/core/CHANGELOG.md` with all changes since the last tagged release. Group entries under `Added / Changed / Fixed / Security`. Reference commits and PR numbers.

---

## Cascade Best Practices

1. **Index the codebase first.** When opening the workspace, let Cascade scan for a moment before issuing complex prompts.
2. **Use `@` references.** `@services/core/core/core/network/src/manager.rs` is far more accurate than describing the file in prose.
3. **Two-step flow for big changes.** First prompt: *"Analyze ... and propose a plan."* Second prompt: *"Apply the plan to these files only."*
4. **Constrain the domain.** Mention `services/core/` (backend) vs `apps/web/` (frontend) explicitly to match the workspace rules.
5. **Ask for tests first.** For new features: *"Write the tests first, then the implementation."*
6. **Run `cargo clippy --workspace -- -D warnings`** mentally before accepting Rust suggestions; remind Cascade to do the same.

---

## Key References

| File | Purpose |
|---|---|
| `services/core/.windsurfrules` | Core engineer rules (Rust/Python golden rules, key constants) |
| `services/core/RULES.md` | Detailed coding rules |
| `services/core/SKILLS.md` | Domain skills checklist |
| `services/core/AGENTS.md` | Agent persona definitions |
| `.windsurf/workflows/` | Saved slash-command workflows (`/deploy-testnet`, `/run-tests`, `/setup-dev`) |

---

_Last updated: 2026-05-01_

---

# Playbook — Phase 2 (Axionax OS · P2P Deep · Integration · Design)

> Added 2026-04-30 to extend the original playbook now that the OS Dashboard
> is up and the focus shifts to a true Command Center experience.

## 5. Axionax OS — Frontend & UX

The "Obsidian Matte Black" command-center aesthetic.

### Window Management System

> Implement a **Window Management System** for Axionax OS in `@apps/os-dashboard/` using React. I need draggable + resizable windows with the Matte Black glassmorphism we already have on `.glass`/`.glass-strong`. Each window should host a different component (Terminal, Node Monitor, App Store, Settings). Reuse the existing `glass-strong` utility and `app-icon-shadow` filter; persist window position/size in `localStorage`; add z-index focus management.

### Real-time Node Dashboard widget

> Design a minimalist dashboard widget at `@apps/os-dashboard/src/components/node-monitor.tsx` that visualizes real-time stats from `RPC :8545` and `Health :8080`. Show **Block Height · Connected Peers · Memory Usage · Uptime** with sparklines. Keep the dark/high-contrast palette; reserve neon-green only for "active/healthy" status to keep the signal-to-noise high.

### Web-based Terminal

> Create `@apps/os-dashboard/src/components/terminal.tsx` that accepts a small allow-list of commands (`axionax --status`, `p2p --check-peers`, `node --logs --tail 100`). Use `xterm.js` for the renderer; pipe output from a tiny WebSocket endpoint we'll add to the Rust node (see §7). Monospaced font, command history (↑/↓), tab completion against the allow-list.

---

## 6. P2P Deep Debugging — beyond logging

For when the diagnostic logs we added in `@services/core/core/core/network/src/manager.rs` aren't enough.

### External IP / Multiaddr handling

> Review `@services/core/core/core/network/src/manager.rs` and `@services/core/core/core/network/src/config.rs` regarding **Multiaddr** handling. Verify the node announces its **public** IP (`/ip4/<PUBLIC>/tcp/30303/p2p/<PEER_ID>`) instead of the Docker bridge IP. Add an `external_addr_strategy` config knob with three modes: `manual` (env var), `autonat` (libp2p AutoNAT), `stun` (fallback). Wire it into the Identify behaviour.

### P2P Handshake Simulator

> Write a Rust integration test (or `tools/p2p-sim`) under `@services/core/core/core/network/tests/` that simulates a handshake between two `NetworkManager` instances on different ports. Log every step — TCP accept, noise encryption, multistream-select, gossipsub subscribe — to isolate exactly where the "still not p2p" stall is. Output a Mermaid sequence diagram on success.

### Kademlia routing-table inspector

> Analyze how the **Kademlia DHT** is initialized in `@services/core/core/core/network/src/behaviour.rs`. Verify `bootstrap()` is called after dialing seed peers. Add a `kad_routing_table()` method on `NetworkManager` that snapshots the current k-buckets. Expose it via `axionaxctl debug routing-table` so we can see *which* peers our node believes it knows about, vs. which it has open connections to.

---

## 7. Integration — wiring OS ↔ Core

### Typed RPC wrapper for the OS dashboard

> Generate a TypeScript wrapper at `@packages/sdk/src/rpc.ts` (we'll create the package per the monorepo audit) that types the Axionax JSON-RPC: `getPeerCount`, `getLatestBlock`, `getBlockByNumber`, `sendTransaction`, `getBalance`. Handle `Node Offline`, timeouts, and EIP-1474 errors gracefully — return a discriminated union `{ ok: true, data } | { ok: false, error }`. The OS dashboard's `lib/rpc.ts` should re-export from `@axionax/sdk`.

### Real-time log streaming via WebSocket

> Propose a way to stream Rust core logs to the Axionax OS Terminal in real-time. Recommendation: spawn a tracing-subscriber `Layer` that fan-outs to a `tokio::sync::broadcast` channel; expose the channel over a WebSocket endpoint at `ws://localhost:8546/logs?level=info&target=p2p`. Provide a basic implementation under `@services/core/core/core/rpc/src/ws_logs.rs` and the matching client hook in `@apps/os-dashboard/src/lib/use-log-stream.ts`.

### Worker → OS notification bus

> Add a lightweight notification bus so DeAI worker events (`job_started`, `job_completed`, `reward_received`) surface in the OS dashboard's Notifications widget without polling. Server: SSE endpoint on the node. Client: `EventSource` hook in the dashboard.

---

## 8. Aesthetic & Design System — Obsidian Matte Black

### Tailwind palette

> Generate a `tailwind.config.ts` patch for `@apps/os-dashboard/` that defines an **Axionax-Dark** palette:
> - `obsidian.{900..950}` for surfaces
> - `matte.{700..900}` for borders/dividers
> - `accent.ai` (neon teal #5EEAD4) for AI actions
> - `accent.chain` (indigo #6366F1) for blockchain actions
> - `accent.warn` (amber) and `accent.danger` (rose) for alerts
> Keep it low-eye-strain; document contrast ratios for WCAG AA in the comment header.

### Minimalist icon set

> Suggest 6 ultra-thin (1.25px stroke) SVG icons for Axionax OS representing **Neural Network · Blockchain Node · Peer Discovery · Security Shield · DeAI Worker · Edge Device**. Match the visual weight of `lucide-react` so they can sit next to existing icons. Place them under `@apps/os-dashboard/src/icons/` and export a unified `<Icon name="..." />` component.

### Sound + motion language (optional)

> Define a tiny motion system: `<300ms` ease-out for window open/close, `<150ms` for hover, `400ms` for theme transitions (already in place). Codify in CSS variables (`--motion-instant`, `--motion-fast`, `--motion-thoughtful`). Audit existing components and replace ad-hoc durations.

---

## 9. Cascade Advanced — Context Injection

When something is genuinely broken, paste **two artifacts**:

1. **The actual log lines** (or absence of them — "node has been quiet for 10 min").
2. **The most relevant file** via `@` reference.

Template:

> I'm running two nodes (A: `46.250.244.4`, B: `217.216.109.5`). Here are the last 200 lines of logs from both:
>
> ```
> <paste log A>
> ---
> <paste log B>
> ```
>
> `@services/core/core/core/network/src/manager.rs` is the main logic; `@services/core/core/core/network/src/behaviour.rs` defines the protocols. Based on these logs, why aren't they discovering each other? Please also check the firewall-related code in `@services/core/scripts/`.

This forces Cascade to ground its analysis in the actual symptom rather than guessing from the file alone.

---

_Phase 2 added 2026-04-30. Sections will be reorganized when this list grows past §10._  
_Checklist execution updated 2026-05-02 (Hello DeAI + Axionax OS DoD)._

---

## Definition of Done (Execution Checklist)

Version focused on real-world execution across tech, testnet operations, finance, energy, and family cadence.

### Phase 1: Testnet & Infrastructure

- [ ] **P2P Discovery stability** (24h run is an ops window — automation + evidence layout are ready)
  - DoD: `217.216.109.5` and `46.250.244.4` see each other as peers continuously for 24 hours.
  - DoD: block sync does not stall, reorg remains within accepted bounds, auto-reconnect succeeds.
  - Evidence: peer logs, sync-height graph, latency and packet-loss report.
  - Execution runbook (24h window):
    - Command (from repo root):
      - `python services/core/scripts/p2p_stability_monitor.py --duration-hours 24 --interval-seconds 30`
      - Or wrappers: `bash services/core/scripts/run-p2p-stability-24h.sh` / `pwsh services/core/scripts/run-p2p-stability-24h.ps1` (optional env `AXIONAX_P2P_WEBHOOK`).
    - Output folder:
      - `services/core/reports/p2p-stability-<timestamp>/`
    - Start both nodes with persistent logs (`journalctl -u axionax-node -f` or container logs) and NTP sync enabled.
    - Poll every 30s from each node: `net_peerCount`, `eth_blockNumber`, and `system_status`; persist timeline in `sync-height.csv` and transition events in `peer-events.log`.
    - Alert condition: `net_peerCount == 0` for more than 60s on either node.
    - Sync-stall condition: block height unchanged for more than 120s while peer is still producing blocks.
    - Reorg bound: canonical head rollback must stay within agreed limit (default <= 2 blocks unless ops changes this).
    - Auto-reconnect passes when peer link recovers to `>= 1` peers within 90s after transient disconnect.
  - Evidence package (attach to issue/PR):
    - `peer-events.log`: connect/disconnect timeline from both validators.
    - `sync-height.csv`: timestamp, node A height, node B height, delta.
    - `network-quality.txt`: `mtr` or equivalent latency/packet-loss summary between `217.216.109.5` and `46.250.244.4`.
    - `incident-notes.md`: any stalls/reconnects, root-cause note, and mitigation applied.
- [x] **Hello DeAI completed**
  - DoD: Python workload is sent end-to-end from a main node to a worker node.
  - DoD: result hash, execution logs, and retry/failure path are captured.
  - Evidence: demo script and runbook.
- [x] **Axionax OS (Obsidian Matte Black)**
  - DoD: design tokens cover color, spacing, and typography.
  - DoD: core dashboard pages are complete (node health, jobs, logs, wallet/actions).
  - DoD: Lighthouse and responsive targets pass agreed thresholds (`apps/os-dashboard`: `pnpm lighthouse:report`; gates in README).
- [ ] **Monolith Core + Edge Node**
  - DoD: Raspberry Pi 5 + Hailo-10H can register as a node on the network.
  - DoD: inferencing benchmark runs at least one standard workload.
  - Evidence: throughput-per-watt, thermal, and uptime report.

### Phase 2: Cashflow & Expansion

- [ ] **Prop Firm pipeline**
  - DoD: EA passes defined risk policy (daily loss, max drawdown, consistency).
  - DoD: PnL and risk dashboard is available to enforce discipline.
- [ ] **One-click node packaging**
  - DoD: a new user can deploy a node in 10-15 minutes.
  - DoD: at least one clear packaging channel exists (PWA/Tauri/Image) with auto-update.
  - Evidence: onboarding guide and fresh-machine test results.

### Phase 3: Physical Realm

- [ ] **Axionax Estate blueprint**
  - DoD: version-1 masterplan for 10 rai is complete with zoning (compute, living, utility, security).
- [ ] **Solar + BOI feasibility**
  - DoD: CAPEX/OPEX table, payback period, and latest legal/BOI constraints are documented.
  - DoD: 3-stage rollout plan exists (pilot -> partial -> full).

### Daily Human OS

- [ ] **Quality time**
  - DoD: fixed daily/weekly time blocks with explicit no-work windows.
- [ ] **Mindfulness and gratitude**
  - DoD: 10-15 minute daily ritual plus one weekly reflection.
