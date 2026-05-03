# Axionax Protocol Glossary

> **Technical Terms & Definitions** — Reference for developers and users

**Last Updated**: May 3, 2026  
**Version**: v1.9.0-testnet

---

## A

### ASR (Auto Selection Router)
**Type**: Core Component  
Top-K weighted VRF-based router for assigning compute jobs to workers. Uses K=64 with max_quota=12.5% per worker.

### AXX
**Type**: Token  
Native utility token of Axionax protocol. Mainnet: 1 trillion supply. Testnet (AXXt): 1 billion supply.

### AXXt
**Type**: Token  
Testnet version of AXX token. Used for testing purposes only, no real value.

---

## B

### Block Time
**Type**: Network Parameter  
Target time between blocks. Testnet: ~2 seconds.

### Bootnode
**Type**: Network Node  
Entry point for new nodes joining the P2P network. Advertises other peers via DHT.

---

## C

### Chain ID
**Type**: Network Parameter  
Unique identifier for the blockchain network.
- Testnet: `86137` (0x15079)
- Mainnet (planned): `86150`

### Consensus
**Type**: Protocol Mechanism  
**PoPC (Proof of Probabilistic Consensus)** — Sampling-based validation with s=1000, confidence=0.99

### Core Universe
**Type**: Domain  
Blockchain core, DeAI worker, P2P network. Located in `services/core/`.

---

## D

### DA (Data Availability)
**Type**: Layer  
Ensures job inputs/outputs are available for verification. Uses erasure coding and stratified sampling.

### DeAI
**Type**: System  
Decentralized AI compute layer. Handles job submission, worker assignment, and result verification.

### Delayed VRF
**Type**: Security Mechanism  
Verifiable Random Function with k≥2 block delay to prevent manipulation.

---

## E

### EC (Erasure Coding)
**Type**: Technology  
Error-correcting code for data redundancy. Reed-Solomon and Fountain codes under evaluation.

---

## F

### Faucet
**Type**: Service  
Distributes free testnet tokens (AXXt). Rate limited: 1,000 AXXt per address per day.

### Finality
**Type**: Network Property  
Time until transaction is considered irreversible. Target: <0.5s finality with ≥2/3 validators.

---

## G

### Genesis
**Type**: Event  
Initial block of the blockchain.
- Testnet Genesis: April 24, 2026
- SHA-256: `0xed1bdac7c278e5b4f58a1eceb7594a4238e39bb63e1018e38ec18a555c762b55`

### Governance
**Type**: DAO  
Decentralized decision-making via AXX token holder voting.

---

## H

### HYDRA
**Type**: Node Configuration  
High-performance node combining Sentinel + Worker roles. Requires 12 cores, 32GB RAM, 1TB NVMe.

---

## J

### Job
**Type**: Compute Unit  
AI/ML computation submitted to the network. Specs: GPU type, VRAM, framework, region.

---

## M

### Mainnet
**Type**: Network  
Production blockchain (planned Q4 2026 - Q2 2027).

### Marketplace
**Type**: Platform  
Decentralized compute marketplace where users submit jobs and workers bid/accept.

### Monolith
**Type**: Architecture  
Unified repository containing both Web and Core domains in `axionax-monolith/`.

### Monolith Scout
**Type**: Node Configuration  
Raspberry Pi 5 + Hailo-8 NPU edge device for AI tasks.

---

## N

### Node
**Type**: Network Participant  
Software running Axionax protocol. Types: Validator, RPC, Full, Light, Worker.

---

## P

### Peer
**Type**: Network Participant  
Another node connected via P2P protocol on port 30303 (TCP + QUIC).

### PoPC (Proof of Probabilistic Consensus)
**Type**: Consensus Algorithm  
Core validation mechanism using stratified sampling (s=1000) with 99% confidence.

### PPC (Posted Price Controller)
**Type**: Economics Module  
Manages compute pricing based on utilization and queue depth.

### P2P
**Type**: Network Layer  
Peer-to-peer networking using libp2p with TCP/30303 and QUIC.

---

## R

### RPC (Remote Procedure Call)
**Type**: API  
JSON-RPC endpoint for interacting with the blockchain. Default port: 8545 (HTTP), 8546 (WebSocket).

---

## S

### Sampling
**Type**: Validation Method  
PoPC uses stratified + adaptive sampling with s=1000 samples per job.

### Sentinel
**Type**: Node Role  
Advanced validator with additional responsibilities (7 types: AION-VX, SERAPH-VX, etc.).

### Slashing
**Type**: Penalty  
Economical punishment for validator misbehavior (disabled on testnet).

### Staking
**Type**: Economics  
Locking AXX tokens to participate in consensus. Min: 10,000 AXX (mainnet), 1,000 AXXt (testnet).

---

## T

### Testnet
**Type**: Network  
Public testing network (Chain ID 86137). Current validators: AU (46.250.244.4) + ES (217.216.109.5).

### TPS (Transactions Per Second)
**Type**: Performance Metric  
Target: 45,000 TPS with <0.5s finality.

### TVL (Total Value Locked)
**Type**: Economic Metric  
Total AXX tokens staked in the network.

---

## V

### Validator
**Type**: Node Role  
Participates in consensus, produces blocks. Requires 8+ cores, 16GB RAM, 500GB NVMe, static IP.

### VRF (Verifiable Random Function)
**Type**: Cryptography  
Generates provably random numbers for worker selection and sampling.

---

## W

### Web Universe
**Type**: Domain  
Frontend applications, dApp, marketplace UI. Located in `apps/`.

### Worker
**Type**: Node Role  
Executes compute jobs. Requirements vary by job type (GPU, RAM, etc.).

---

## Z

### Zero-Downtime
**Type**: Migration Property  
Ability to upgrade without stopping the network.

---

## Acronyms Quick Reference

| Acronym | Full Name | Category |
|---------|-----------|----------|
| AXX | Axionax Token | Token |
| ASR | Auto Selection Router | Component |
| DA | Data Availability | Layer |
| DAO | Decentralized Autonomous Organization | Governance |
| DeAI | Decentralized AI | System |
| EC | Erasure Coding | Technology |
| HYDRA | High-Performance Validator | Node Type |
| NPU | Neural Processing Unit | Hardware |
| PoPC | Proof of Probabilistic Consensus | Consensus |
| PPC | Posted Price Controller | Economics |
| P2P | Peer-to-Peer | Network |
| RPC | Remote Procedure Call | API |
| TPS | Transactions Per Second | Performance |
| TVL | Total Value Locked | Economics |
| VRF | Verifiable Random Function | Cryptography |

---

## See Also

- [TOKENOMICS.md](./architecture/TOKENOMICS.md) — Token economics
- [ROADMAP.md](./architecture/ROADMAP.md) — Development timeline
- [API Reference](./api/JSON_RPC.md) — Technical API documentation

---

_Last updated: May 3, 2026_
