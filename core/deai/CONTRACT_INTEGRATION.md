# Worker ↔ JobMarketplace Contract Integration

DeAI workers talk to the **JobMarketplace** smart contract for registration, job assignment, and result submission. Until the contract is deployed on-chain, workers run in **MOCK** mode (no on-chain txs).

---

## MOCK vs LIVE

| Mode | When | Behaviour |
|------|------|-----------|
| **MOCK** | `contract_address` is `0x0` or unset | All actions are logged only; no transactions sent. Worker still connects to RPC for health. |
| **LIVE** | `contract_address` is a deployed contract | Full on-chain: `registerWorker`, `assignJob`, `submitResult`, `claimReward`. |

---

## How to switch to LIVE

1. **Deploy** the JobMarketplace contract on the target chain (testnet/mainnet).
2. **Set the contract address** in one of:
   - **Config:** In `worker_config.toml` (or your TOML), under `[network]`:
     ```toml
     [network]
     contract_address = "0xYourDeployedContractAddress"
     ```
   - **Environment:** `AXIONAX_MARKETPLACE_ADDRESS=0xYourDeployedContractAddress`
3. **ABI:** The worker loads the ABI from `core/deai/job_marketplace.json`. If you use a different path, set it (or patch the code to use `AXIONAX_ABI_PATH`).
4. **Wallet:** Worker must have AXX for gas and (if required) stake. Use `AXIONAX_WALLET_PATH` / `WORKER_PRIVATE_KEY` / `WORKER_KEY_PASSWORD` as in [README](README.md).
5. **RPC:** `[network] bootnodes` or `AXIONAX_RPC_URL` must point to a node of the same chain (e.g. Chain ID 86137 for testnet).

After that, restart the worker. Logs will show `ContractManager [LIVE]` and registration/result submission will send real transactions.

---

## Contract methods used

| Method | When |
|--------|------|
| `registerWorker(stake)` | On startup (if not already registered). |
| `getWorker(addr)` / `getPendingJobs()` / `getJob(id)` | Polling / job discovery. |
| `assignJob(jobId)` | When claiming a job. |
| `submitResult(jobId, resultHash, proofHash)` | After job execution. |
| `claimReward(jobId)` | After dispute period. |

---

## Mock fallback

If `contract_address` is `0x0` or the contract is not deployed, the worker stays in MOCK mode so development and testing can continue without a live contract.
