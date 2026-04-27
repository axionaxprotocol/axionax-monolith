# 🌐 Web Integration Guide

This document provides the necessary constants and ABI for integrating the **axionax Frontend** with the DeAI Core.

## 🔗 Network Details
- **RPC Endpoint (Primary)**: `http://217.76.61.116:8545` (EU Validator)
- **RPC Endpoint (Backup)**: `http://46.250.244.4:8545` (AU Validator)
  > **✅ CONFIRMED**: These are the Oldest Validator Nodes, ensuring correct Block Height and consensus data.
- **Chain ID**: `86137`
- **Currency**: `AXX`

## 📜 Smart Contracts

### JobMarketplace
- **Address**: `0x0000000000000000000000000000000000000000` (Mock/Testnet)
- **ABI File**: `core/deai/job_marketplace.json`

#### Key Functions
1.  `registerWorker(string specs)`
    - Call this when a user clicks "Become a Worker".
2.  `submitResult(uint256 jobId, string result)`
    - Called by the Worker Node (Python), not the Frontend.

#### Events to Listen For
1.  `NewJob(uint256 jobId, string jobType, string params)`
    - Frontend can listen to this to show "Live Jobs" feed.

## 🐍 Python Worker Integration
The Python worker runs locally on the user's machine.
- **Wallet**: Generated at `core/deai/worker_key.json`
- **Config**: `core/deai/worker_config.toml`

## 🧪 Testing
To verify the system is running:
1.  Check RPC: `curl http://217.216.109.5:8545`
2.  Check Worker: `python core/deai/worker_node.py`
