# Axionax Bible

**Canonical documentation index for Axionax Protocol — single entry point for Vision, Protocol, Run, Deploy, and Launch.**

This repository contains many documents. This file is the central index: content is organised into Books with links to the actual documents, so you do not need to memorise paths.

**Documentation principles:** Docs in this repository are canonical, formal, and somewhat academic; substance over aesthetics. See [DOCUMENTATION_PRINCIPLES.md](DOCUMENTATION_PRINCIPLES.md). All documentation is in English.

---

## Table of Contents

| Book | Name | Content |
|------|------|---------|
| I | [Vision & Principles](#book-i-vision--principles) | Vision, Self-Sufficiency, Cyber Defense |
| II | [Protocol & Architecture](#book-ii-protocol--architecture) | Architecture, nodes, RPC, network |
| III | [Run & Develop](#book-iii-run--develop) | Run Worker/Node, development, Quick Start |
| IV | [Ops & Deploy](#book-iv-ops--deploy) | VPS Validator, Genesis, Testnet, Faucet |
| V | [Launch & Testnet](#book-v-launch--testnet) | Launch readiness, MetaMask, Faucet |
| VI | [Security & Audit](#book-vi-security--audit) | Security, audit reports, Runbook |
| VII | [Reference](#book-vii-reference) | API reference and supplementary docs |

---

## Book I: Vision & Principles

**What Axionax is and what principles it follows.**

| Document | Description |
|----------|-------------|
| [MASTER_SUMMARY.md](../MASTER_SUMMARY.md) | Full project summary: Vision, Architecture, Hardware, Tokenomics, Roadmap |
| [SELF_SUFFICIENCY.md](SELF_SUFFICIENCY.md) | Self-Sufficiency — protocol runs independently; no runtime dependency on PyPI/npm/external API |
| [CYBER_DEFENSE.md](CYBER_DEFENSE.md) | Cyber defence via DeAI (7 Sentinels); no centralised dependency |

---

## Book II: Protocol & Architecture

**Layer 1 architecture, nodes, and network.**

| Document | Description |
|----------|-------------|
| [core/docs/ARCHITECTURE_OVERVIEW.md](../core/docs/ARCHITECTURE_OVERVIEW.md) | System overview, stack, and main components |
| [core/docs/NODE_SPECS.md](../core/docs/NODE_SPECS.md) | Hardware spec (CPU, RAM, Storage) for Full Node, Validator, RPC, Faucet, Explorer |
| [core/docs/NETWORK_NODES.md](../core/docs/NETWORK_NODES.md) | Node types (Validator, RPC, Bootnode, Explorer, Faucet) and roles |
| [core/docs/RPC_API.md](../core/docs/RPC_API.md) | Ethereum-compatible RPC and Staking API |
| [core/docs/PROJECT_ASCENSION.md](../core/docs/PROJECT_ASCENSION.md) | Monolith and 9 Pillars |
| [core/docs/MONOLITH_ROADMAP.md](../core/docs/MONOLITH_ROADMAP.md) | Hardware roadmap MK-I to MK-IV |
| [core/docs/SENTINELS.md](../core/docs/SENTINELS.md) | 7 Sentinels (AION-VX, SERAPH-VX, …) |

---

## Book III: Run & Develop

**Run node/Worker and develop.**

| Document | Description |
|----------|-------------|
| [README.md](../README.md) | Main entry: Quick Start, Network Testnet, Config, repo structure |
| [RUN.md](../RUN.md) | Commands to run Worker, Monolith Scout, HYDRA, and Update |
| [DEVELOPMENT.md](../DEVELOPMENT.md) | Development environment, Docker, scripts, tests |
| [GET_STARTED.md](../GET_STARTED.md) | Getting started for developers |
| [JOIN.md](../JOIN.md) | How to join the network |
| [core/README.md](../core/README.md) | Core structure (Rust + DeAI), build/test commands |
| [core/deai/README.md](../core/deai/README.md) | DeAI Worker Python config and run |
| [core/examples/contracts/README.md](../core/examples/contracts/README.md) | Example smart contracts (Token, NFT, Staking) and deploy |

---

## Book IV: Ops & Deploy

**Deploy Validator, RPC, Faucet, and infra.**

| Document | Description |
|----------|-------------|
| [GENESIS_PUBLIC_TESTNET_PLAN.md](GENESIS_PUBLIC_TESTNET_PLAN.md) | Genesis public testnet plan, VPS allocation (3 nodes), weekly timeline |
| [CONNECTIVITY_OVERVIEW.md](CONNECTIVITY_OVERVIEW.md) | How Local full node, VPS Validator, and Frontend connect |
| [ADD_NETWORK_AND_TOKEN.md](ADD_NETWORK_AND_TOKEN.md) | Add Axionax Testnet and AXX token in MetaMask; receive from Faucet |
| [ops/deploy/VPS_VALIDATOR_UPDATE.md](../ops/deploy/VPS_VALIDATOR_UPDATE.md) | Validator VPS update (217.76.61.116, 46.250.244.4) and checklist |
| [ops/deploy/VPS_FULL_NODE_RUNBOOK.md](../ops/deploy/VPS_FULL_NODE_RUNBOOK.md) | Run full node on VPS (chain_id 86137, RPC 8545, P2P 30303) |
| [RUN_PUBLIC_FULL_NODE.md](RUN_PUBLIC_FULL_NODE.md) | Permissionless public testnet full node — genesis, bootstrap, build, verify (any operator worldwide) |
| [PUBLIC_TESTNET_BOOTSTRAPS.txt](PUBLIC_TESTNET_BOOTSTRAPS.txt) | Maintainer-updated libp2p multiaddrs for `AXIONAX_BOOTSTRAP_NODES` |
| [SMOKE_TEST_PUBLIC_FULL_NODE.md](SMOKE_TEST_PUBLIC_FULL_NODE.md) | Fresh-machine smoke test for external operators + bootstrap publish flow |
| [EXTERNAL_OPERATOR_ACCEPTANCE_CHECKLIST.md](EXTERNAL_OPERATOR_ACCEPTANCE_CHECKLIST.md) | Release gate checklist for external node-operator readiness |
| [ops/deploy/README.md](../ops/deploy/README.md) | ops/deploy structure, Docker, Nginx, scripts |
| [core/tools/GENESIS_LAUNCH_README.md](../core/tools/GENESIS_LAUNCH_README.md) | Genesis tools (create_genesis, verify, launch) |
| [tools/devtools/tools/faucet/README.md](../tools/devtools/tools/faucet/README.md) | Faucet API (Rust) and deploy |

---

## Book V: Launch & Testnet

**Launch readiness and Testnet usage.**

| Document | Description |
|----------|-------------|
| [GENESIS_PUBLIC_TESTNET_PLAN.md](GENESIS_PUBLIC_TESTNET_PLAN.md) | Genesis public testnet plan, VPS allocation, weekly timeline |
| [TESTNET_OPTIMIZATION_CHECKLIST.md](TESTNET_OPTIMIZATION_CHECKLIST.md) | Testnet optimization checklist (Stability, Consensus, RPC, Faucet, Monitoring, Security) |
| [MAINNET_PRODUCTION_PLAN.md](MAINNET_PRODUCTION_PLAN.md) | Mainnet production plan — target mid-year 2026 (Chain ID 86150), pre-mainnet checklist, launch |
| [BENCHMARK_BASELINE.md](BENCHMARK_BASELINE.md) | Reproducible benchmark baseline (TPS/block-time/latency) and claim policy |
| [TESTNET_READINESS.md](../TESTNET_READINESS.md) | Testnet readiness (Genesis, Balance, Faucet) and launch doc links |
| [GITHUB_READINESS.md](GITHUB_READINESS.md) | Repository readiness on GitHub (CI, secrets, docs, verify script) |
| [WALLET_AND_KEYS_READINESS.md](WALLET_AND_KEYS_READINESS.md) | Wallet, private key, Faucet key, node identity, Balance & Faucet flow |
| [ops/deploy/scripts/verify-launch-ready.sh](../ops/deploy/scripts/verify-launch-ready.sh) | Pre-launch verification (Genesis, DNS, RPC, Faucet, docs) |

---

## Book VI: Security & Audit

**Security, audit reports, and incident response.**

| Document | Description |
|----------|-------------|
| [SECURITY.md](../SECURITY.md) | Security policy and how to report vulnerabilities |
| [core/docs/SECURITY_AUDIT.md](../core/docs/SECURITY_AUDIT.md) | Audit scope and approach (genesis, keys, faucet, RPC) |
| [core/docs/RUNBOOK.md](../core/docs/RUNBOOK.md) | Runbook: deploy Validator/RPC/Faucet; incidents (chain halt, RPC, faucet) |
| [SECURITY_REMEDIATION_PLAN.md](../SECURITY_REMEDIATION_PLAN.md) | Remediation plan from audit |
| [docs/AUDIT_REMEDIATION.md](AUDIT_REMEDIATION.md) | Audit remediation status |

---

## Book VII: Reference

**API reference and supplementary docs.**

| Document | Description |
|----------|-------------|
| [DOCUMENTATION_PRINCIPLES.md](DOCUMENTATION_PRINCIPLES.md) | Documentation principles — canonical, formal, English |
| [core/docs/API_REFERENCE.md](../core/docs/API_REFERENCE.md) | RPC API reference |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to contribute (Fork, branch, PR) |
| [core/docs/README.md](../core/docs/README.md) | Index of docs in core/docs |
| [docs/COMPATIBILITY_REPORT.md](COMPATIBILITY_REPORT.md) | Config and chain_id compatibility report |
| [docs/DOCKER_AND_CI_REPORT.md](DOCKER_AND_CI_REPORT.md) | Docker and CI in repo |
| [docs/PROJECT_SURVEY.md](PROJECT_SURVEY.md) | Project structure summary |

---

## Worker / Node operator (additional)

| Document | Description |
|----------|-------------|
| [ops/deploy/WORKER_SETUP_QUICK_GUIDE.md](../ops/deploy/WORKER_SETUP_QUICK_GUIDE.md) | Quick Worker setup guide |
| [ops/deploy/WORKER_LOCAL_WINDOWS_AMD.md](../ops/deploy/WORKER_LOCAL_WINDOWS_AMD.md) | Run Worker on Windows (AMD) |
| [ops/deploy/QUICK_START.md](../ops/deploy/QUICK_START.md) | Quick Start for deploy |
| [core/deai/WEB_INTEGRATION.md](../core/deai/WEB_INTEGRATION.md) | DeAI integration with web and RPC |

---

## Summary

- **Understand vision and principles** → Book I + MASTER_SUMMARY
- **Run node/Worker** → Book III + README + RUN
- **Deploy Testnet / Validator** → Book IV + GENESIS_PUBLIC_TESTNET_PLAN
- **Add network / receive AXX in MetaMask** → ADD_NETWORK_AND_TOKEN
- **Check launch readiness** → Book V + verify-launch-ready.sh

---

*Axionax Bible — central index of canonical documentation for axionax-core-universe.*
