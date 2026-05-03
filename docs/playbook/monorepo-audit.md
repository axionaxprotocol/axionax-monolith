# Monorepo Structure Audit

> **Scope:** `axionax-monolith` working tree, captured 2026-05-01.
> **Goal:** identify drift, recommend a folder hierarchy that scales for an L1 protocol with both blockchain core and Web Universe.

---

## 1. Current shape

```
axionax-monolith/
├── apps/
│   ├── os-dashboard/      # Next.js OS-style dashboard (this repo's "OS")
│   └── web/               # Public dApp + marketplace (335 items, deeply nested)
├── services/
│   └── core/              # Rust Cargo workspace + Python DeAI + Docker + ops
│       ├── core/          # Inner workspace — Cargo workspace root
│       │   ├── core/      # ← THIS triple-nest is a smell (see §3.1)
│       │   ├── bridge/, deai/, contracts/, ...
│       ├── ops/, scripts/, configs/, contracts/, docs/, ...
├── packages/              # Shared packages (`sdk` active)
├── scripts/               # Repo-wide ops scripts (check-node-sync.sh, etc.)
├── docs/                  # New cross-cutting docs (compossor-and-cascade-playbook.md)
├── package.json           # Root pnpm workspace manifest (version: 1.0.0)
├── pnpm-workspace.yaml    # `apps/*` + `packages/*` (services/core NOT a workspace)
├── pnpm-lock.yaml
└── .windsurfrules
```

**Dependency managers in play:**
- **pnpm 10** — workspaces over `apps/*`, `packages/*` (TypeScript)
- **Cargo workspace** — rooted at `services/core/core/Cargo.toml` (Rust)
- **pip / pyproject.toml** — `services/core/core/deai/` (Python)
- **Docker compose** — `services/core/docker-compose.dev.yml`

---

## 2. What works

| Strength | Why it matters |
|---|---|
| **Hard Web ↔ Core split via `.windsurfrules`** | Cascade and humans both know which tree owns what. Prevents tangled cross-imports. |
| **Single source of truth per domain** | Rust core has its own workspace, Web has its own pnpm scope. No mixed `Cargo.toml` + `package.json` at the same level. |
| **Existing per-tree rules** | `services/core/.windsurfrules` is detailed (golden rules, key constants, known TODOs). |
| **Multi-stage Docker already in place** | `ops/deploy/Dockerfile` (recently refactored to cargo-chef + tini). |
| **Workflows directory** | `.windsurf/workflows/` carries `/deploy-testnet`, `/run-tests`, `/setup-dev` slash commands. |

---

## 3. Issues & recommendations

### 3.1 The `services/core/core/core/` triple nest

**Observed:** `services/core/core/core/network/`, `services/core/core/core/consensus/`, etc.

Each `core/` segment had a different historical role:
1. `services/core/` — service envelope (Docker, ops, configs)
2. `services/core/core/` — Cargo workspace root
3. `services/core/core/core/` — the actual `core` crate folder containing sub-crates

**Effect:** every `@file` reference is 3 directories deeper than necessary. Pathing is brittle (e.g. `services/core/core/core/network/src/manager.rs`).

**Recommendation (low risk):** rename the **innermost** `core/` to `crates/`:

```
services/core/core/crates/network/
services/core/core/crates/consensus/
...
```

Migration:

```bash
cd services/core/core
git mv core crates
# Update Cargo.toml workspace members:
#   members = ["crates/*", "bridge/rust-python", "tools/faucet", ...]
sed -i 's|"core/|"crates/|g' Cargo.toml
cargo check --workspace      # confirm nothing else hardcoded "core/"
```

The middle `core/` (Cargo workspace root) can then be flattened further in a follow-up — but renaming the inner one alone removes the most painful path doubling.

### 3.2 `services/core/` is not a pnpm workspace member

**Observed:** `pnpm-workspace.yaml` lists `apps/*` and `packages/*` only. `services/core/core/package.json` exists but isn't part of the workspace.

**Why this is OK for now:** the Rust core doesn't *need* pnpm hoisting. Faucet (`tools/faucet`) and explorer-api are the only Node-ish bits and they ship via Docker.

**Recommendation:** keep services out of the pnpm workspace **unless** we add Node tooling that should share TypeScript types. If/when we do, add `services/*/package.json` selectively (not a wildcard) to avoid pulling in stray scripts.

### 3.3 `packages/` started (SDK present)

**Observed:** `packages/sdk` now exists and is being used as the shared TypeScript boundary.

**Recommendation:** keep consolidating shared RPC/business logic into `@axionax/sdk`; add new packages only when justified (not by default). Next candidates when needed:

```
packages/
├── sdk/                  # @axionax/sdk — typed JSON-RPC client (shared by apps/web + apps/os-dashboard)
├── types/                # @axionax/types — chain primitives (Block, Tx, AiTask) generated from Rust
└── ui/                   # @axionax/ui — shared Tailwind + Radix component primitives
```

Keep avoiding speculative scaffolding; each new package should have a concrete consumer and CI check.

### 3.4 Two `scripts/` directories, two `docs/` directories

**Observed:**
- `scripts/` (root) — new, cross-cutting (`check-node-sync.sh`)
- `services/core/scripts/` — node-operator scripts (`join-axionax.py`, `health-check.py`)
- `docs/` (root) — new (`compossor-and-cascade-playbook.md`)
- `services/core/docs/` — Core Universe docs (24 items)

**Recommendation:** **keep both.** The split is meaningful:
- **Root** = "applies to the whole monolith / cross-domain"
- **`services/core/`** = "applies to the Core Universe only"

Just be disciplined about where each new file lands. Add a one-liner to each `README.md` clarifying the split.

### 3.5 `apps/web` has 335 items at depth ≤ 1

**Observed:** large surface area, includes its own husky hook (which broke `pnpm install` at the root earlier).

**Recommendation:**
1. **Move pre-existing husky setup to the repo root.** Husky should hook the monolith, not a single workspace member. This will prevent the `pnpm install` failure observed in this session.
2. If `apps/web` is itself a monorepo (it might be — it has `pnpm.overrides`), consider treating it as a **subtree** rather than a workspace child to avoid double-management. A simple convention:
   ```
   apps/
   ├── web/           # legacy mirror — read-only, sync from upstream
   ├── os-dashboard/  # owned here
   └── README.md      # explains the contract
   ```

### 3.6 Cargo workspace inheritance

**Recommendation (light touch):** lift shared `[workspace.dependencies]` and `[workspace.lints]` into `services/core/core/Cargo.toml` so each crate inherits with `dep.workspace = true`. This is already partially done; finish it by:

```toml
[workspace.lints.rust]
unsafe_code = "deny"
unused_must_use = "deny"

[workspace.lints.clippy]
unwrap_used = "warn"
expect_used = "warn"
```

Pairs naturally with the `services/core/.windsurfrules` golden rules ("no unwrap in production paths").

---

## 4. Proposed target hierarchy

```
axionax-monolith/
├── .github/                   # CI for the whole monolith (workspace tests + lints)
├── .windsurf/workflows/       # slash-commands (already in place)
├── .windsurfrules             # Web ↔ Core boundaries (already in place)
│
├── apps/
│   ├── web/                   # public dApp + marketplace (subtree)
│   └── os-dashboard/          # self-hosted node OS UI
│
├── packages/                  # shared TS — populate as needs emerge
│   ├── sdk/
│   ├── types/
│   └── ui/
│
├── services/
│   ├── core/                  # blockchain core + DeAI worker
│   │   ├── core/              # Cargo workspace root
│   │   │   ├── crates/        # ← renamed from `core/` (§3.1)
│   │   │   │   ├── consensus/
│   │   │   │   ├── network/
│   │   │   │   ├── rpc/
│   │   │   │   └── …
│   │   │   ├── bridge/
│   │   │   ├── deai/
│   │   │   ├── tools/faucet/
│   │   │   └── Cargo.toml     # workspace deps + lints
│   │   ├── ops/               # Docker, monitoring, deploy scripts
│   │   ├── configs/
│   │   ├── scripts/           # node-operator scripts
│   │   └── docs/              # Core Universe docs
│   └── (future)               # indexer, relayer, oracle, etc.
│
├── docs/                      # cross-cutting docs (playbook, audits, RFCs)
├── scripts/                   # cross-cutting ops (check-node-sync.sh, …)
├── package.json               # root pnpm workspace
├── pnpm-workspace.yaml        # `apps/*`, `packages/*`
└── README.md                  # the elevator pitch + quick start
```

---

## 5. Migration plan (incremental, non-breaking)

| # | Change | Risk | Estimated effort |
|---|---|---|---|
| 1 | Move husky from `apps/web` → root, fix `pnpm install` | low | 30 min |
| 2 | Add `[workspace.lints]` to Rust workspace `Cargo.toml` | low | 15 min |
| 3 | Rename `services/core/core/core` → `crates/`, update `Cargo.toml` | medium | 1–2 hr (touches every `@` reference) |
| 4 | Expand `packages/sdk` coverage (migrate remaining duplicate RPC helpers) | low | 1-2 hr |
| 5 | Add CI matrix: Rust workspace + pnpm workspace | low | 1 hr |
| 6 | Document `scripts/` vs `services/core/scripts/` split in both READMEs | trivial | 10 min |

**Do not** combine 1+3 in a single PR. Touch one structural thing at a time.

---

## 6. Anti-patterns to avoid going forward

- **No cross-imports between `apps/web` and `services/core/`.** They communicate only via JSON-RPC at port 8545. The OS dashboard already proves this works (see `apps/os-dashboard/src/lib/rpc.ts`).
- **No `Cargo.toml` outside `services/`.** Frontend domains have no business shipping native binaries.
- **No global `node_modules` outside pnpm.** The `node_modules/` at the root is pnpm-managed and that's correct; never run `npm install` anywhere in the tree.
- **No new top-level directories** without an entry in this audit. The handful we have should stay finite.

---

_Last updated: 2026-05-01. Maintained alongside `docs/compossor-and-cascade-playbook.md`._
