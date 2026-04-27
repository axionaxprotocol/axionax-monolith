# The 7 Sentinels — Network Immune System

The Sentinels are dedicated AI models that run on **Sentinel nodes** to secure and govern the Axionax network. They form the network’s immune and trust layer.

---

## Overview

| Sentinel   | Role                     | Focus                    |
|-----------|--------------------------|--------------------------|
| **AION-VX**   | Temporal integrity       | Time and ordering checks |
| **SERAPH-VX** | Network defense          | Attack detection and mitigation |
| **ORION-VX**  | Fraud detection          | Detecting fake or invalid results |
| **DIAOCHAN-VX** | Reputation             | Scoring and trust signals |
| **VULCAN-VX**  | Hardware verification   | Verifying node hardware and attestation |
| **THEMIS-VX**  | Dispute resolution      | Resolving job/submission disputes |
| **NOESIS-VX**  | GenAI core / governance | High-level analysis and governance decisions |

---

## Roles in short

- **AION-VX** — Ensures temporal consistency (e.g. block order, timestamps, causality).
- **SERAPH-VX** — Monitors and reacts to network-level attacks (e.g. DDoS, eclipse, Sybil).
- **ORION-VX** — Flags suspicious or fraudulent compute results (e.g. replay, spoofing).
- **DIAOCHAN-VX** — Builds and updates reputation scores for workers and validators.
- **VULCAN-VX** — Validates that nodes run on attested, compliant hardware (e.g. TEE, Monolith).
- **THEMIS-VX** — Handles disputes (e.g. job outcomes, slashing appeals) in a rule-based way.
- **NOESIS-VX** — Uses GenAI for system-wide analysis, reporting, and governance support.

---

## Integration with the stack

- **Sentinel nodes** run one or more Sentinel models (e.g. Monolith MK-I “left brain” as Sentinel).
- **Worker nodes** receive jobs; **ORION-VX** and **DIAOCHAN-VX** can score or flag results.
- **THEMIS-VX** and **NOESIS-VX** feed into governance and parameter updates (e.g. slashing, rewards).

See [MASTER_SUMMARY.md](../MASTER_SUMMARY.md) and [PROJECT_ASCENSION.md](PROJECT_ASCENSION.md) for vision and roadmap.

---

**Version:** 2026-02
