# axionax Core API Reference

Version: 1.9.0-testnet

Last Updated: May 3, 2026

## Testnet Endpoints

| Endpoint | URL | Status |
|----------|-----|--------|
| **AU Validator** | `http://46.250.244.4:8545` | ✅ Live |
| **ES Validator** | `http://217.216.109.5:8545` | ✅ Live |
| **Public RPC** | `https://rpc.axionax.org` | 🔄 Planned |

## Overview

axionax Core provides JSON-RPC APIs compatible with Ethereum clients, plus custom extensions for PoPC, ASR, and protocol-specific features.

## Endpoints

### Standard JSON-RPC (Port 8545)

Standard Ethereum JSON-RPC methods are supported.

### WebSocket (Port 8546)

Real-time event subscriptions.

### Metrics (Port 9090)

Prometheus-compatible metrics endpoint.

---

## Standard Ethereum Methods

### eth_chainId

Returns the current chain ID.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "eth_chainId",
  "params": [],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": "0x7a69",
  "id": 1
}
```

### eth_getBalance

Get AXX balance of an address.

**Parameters:**

1. `address` - Address to check
2. `block` - Block number or "latest"

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "eth_getBalance",
  "params": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "latest"],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": "0x1b1ae4d6e2ef500000",
  "id": 1
}
```

---

## axionax Custom Methods

### axn_submitJob

Submit a compute job to the network.

**Parameters:**

1. `job` - Job specification object

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "axn_submitJob",
  "params": [
    {
      "specs": {
        "gpu": "NVIDIA RTX 4090",
        "vram": 24,
        "framework": "PyTorch",
        "region": "us-west"
      },
      "sla": {
        "max_latency": "30s",
        "max_retries": 3,
        "timeout": "300s",
        "required_uptime": 0.99
      },
      "data": "0x..."
    }
  ],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "job_id": "job_abc123",
    "assigned_worker": "0x...",
    "price": "0.1",
    "status": "assigned"
  },
  "id": 1
}
```

### axn_getJobStatus

Get status of a submitted job.

**Parameters:**

1. `job_id` - Job identifier

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "axn_getJobStatus",
  "params": ["job_abc123"],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "job_id": "job_abc123",
    "status": "completed",
    "worker": "0x...",
    "output_root": "0x...",
    "popc_passed": true,
    "completed_at": "2025-10-22T10:30:00Z"
  },
  "id": 1
}
```

### axn_registerWorker

Register as a compute worker.

**Parameters:**

1. `specs` - Worker hardware specifications

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "axn_registerWorker",
  "params": [
    {
      "gpus": [
        {
          "model": "NVIDIA RTX 4090",
          "vram": 24,
          "count": 1
        }
      ],
      "cpu_cores": 16,
      "ram": 64,
      "storage": 1000,
      "bandwidth": 1000,
      "region": "us-west",
      "asn": "AS15169",
      "organization": "example-org"
    }
  ],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "address": "0x...",
    "status": "active",
    "registered_at": "2025-10-22T10:00:00Z"
  },
  "id": 1
}
```

### axn_getWorkerStatus

Get worker status and statistics.

**Parameters:**

1. `address` - Worker address

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "axn_getWorkerStatus",
  "params": ["0x..."],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "address": "0x...",
    "status": "active",
    "performance": {
      "total_jobs": 567,
      "successful_jobs": 564,
      "failed_jobs": 3,
      "popc_pass_rate": 0.995,
      "da_reliability": 0.998,
      "avg_latency": 12.5,
      "uptime": 0.997
    },
    "quota_used": 0.082,
    "reputation": 0.96
  },
  "id": 1
}
```

### axn_getPricingInfo

Get current pricing information from PPC.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "axn_getPricingInfo",
  "params": [],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "current_price": 0.15,
    "utilization": 0.68,
    "queue_time": 55.2,
    "target_utilization": 0.7,
    "target_queue_time": 60.0,
    "min_price": 0.001,
    "max_price": 10.0
  },
  "id": 1
}
```

### axn_getValidatorInfo

Get validator information.

**Parameters:**

1. `address` - Validator address

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "axn_getValidatorInfo",
  "params": ["0x..."],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "address": "0x...",
    "stake": "10000",
    "status": "active",
    "total_votes": 1234,
    "correct_votes": 1230,
    "false_pass": 4,
    "commission": 0.05
  },
  "id": 1
}
```

### axn_getPoPCChallenge

Get PoPC challenge for a job (validators only).

---

## Staking API (staking_*)

Stake tokens to become a Validator or delegate to existing validators.

| Method | Description | Params |
|--------|-------------|--------|
| `staking_getValidator` | Get validator information | `address` |
| `staking_getActiveValidators` | List of active validators | None |
| `staking_getTotalStaked` | Total staked tokens | None |
| `staking_getStats` | Staking system statistics | None |
| `staking_stake` | Stake tokens to become a validator | `address`, `amount` |
| `staking_unstake` | Begin unstaking (21-day wait required) | `address`, `amount` |
| `staking_delegate` | Delegate stake to another validator | `delegator`, `validator`, `amount` |
| `staking_claimRewards` | Claim accumulated rewards | `address` |

### Example: Get Active Validators

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "staking_getActiveValidators",
  "params": [],
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "address": "0x1234...",
      "stake": "0x8ac7230489e80000",
      "voting_power": "0x8ac7230489e80000",
      "is_active": true,
      "commission_bps": 500
    }
  ],
  "id": 1
}
```

---

## Governance API (gov_*)

On-chain voting and proposal management.

| Method | Description | Params |
|--------|-------------|--------|
| `gov_getProposal` | Get proposal information | `proposalId` |
| `gov_getActiveProposals` | List of proposals currently open for voting | None |
| `gov_getStats` | Governance config and statistics | None |
| `gov_createProposal` | Create a new proposal | `proposer`, `stake`, `title`, `desc`, `type` |
| `gov_vote` | Cast a vote | `voter`, `proposalId`, `vote`, `weight` |
| `gov_getVote` | Check a cast vote | `proposalId`, `voter` |
| `gov_finalizeProposal` | Finalize result after voting period ends | `proposalId`, `totalStaked` |
| `gov_executeProposal` | Execute a passed proposal | `proposalId` |

### Proposal Types

| Type | Format | Description |
|------|--------|-------------|
| Text | `text` | General proposal with no on-chain effect |
| Parameter | `parameter:key=value` | Change a chain config value |
| Treasury | `treasury:recipient:amount` | Withdraw funds from treasury |
| Upgrade | `upgrade:version` | Upgrade protocol |

### Example: Create Parameter Change Proposal

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "gov_createProposal",
  "params": [
    "0x1234...proposer_address",
    "0x152d02c7e14af6800000",
    "Increase Block Gas Limit",
    "Propose to increase block gas limit for higher throughput",
    "parameter:block_gas_limit=30000000"
  ],
  "id": 1
}
```

---

## Configuration Parameters

### Staking Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `min_validator_stake` | 10,000 AXX | Minimum stake to become a validator |
| `min_delegation` | 100 AXX | Minimum delegation amount |
| `unstaking_lock_blocks` | 725,760 | Lock period after unstaking (~21 days) |
| `epoch_reward_rate_bps` | 50 | Reward rate 0.5% per epoch |
| `max_slash_rate_bps` | 5,000 | Maximum slash rate 50% |

### Governance Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `min_proposal_stake` | 100,000 AXX | Minimum stake to create a proposal |
| `voting_period_blocks` | 241,920 | Voting period (~7 days) |
| `execution_delay_blocks` | 69,120 | Delay after vote passes (~2 days) |
| `quorum_bps` | 3,000 | At least 30% participation required |
| `pass_threshold_bps` | 5,000 | Must receive more than 50% "in favor" votes |

---

## Error Codes

| Code | Description |
|------|-------------|
| -32000 | Staking/Governance error - system error |
| -32001 | Block not found |
| -32002 | Transaction not found |
| -32602 | Invalid parameters |
| -32603 | Internal error |
| -32700 | Parse error |
| -32600 | Invalid request |
| -32601 | Method not found |

**Parameters:**

1. `job_id` - Job identifier

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "axn_getPoPCChallenge",
  "params": ["job_abc123"],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "job_id": "job_abc123",
    "samples": [12, 45, 78, 123, ...],
    "vrf_seed": "0x...",
    "block_delay": 2
  },
  "id": 1
}
```

### axn_submitPoPCProof

Submit PoPC proof (workers only).

**Parameters:**

1. `proof` - PoPC proof object

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "axn_submitPoPCProof",
  "params": [{
    "job_id": "job_abc123",
    "samples": {
      "12": "0x...",
      "45": "0x...",
      ...
    },
    "merkle_paths": {
      "12": ["0x...", "0x...", ...],
      "45": ["0x...", "0x...", ...],
      ...
    },
    "output_root": "0x..."
  }],
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "job_id": "job_abc123",
    "passed": true,
    "samples_verified": 1000,
    "samples_total": 1000,
    "confidence": 0.9995
  },
  "id": 1
}
```

---

## WebSocket Subscriptions

### Subscribe to New Jobs

```json
{
  "jsonrpc": "2.0",
  "method": "axn_subscribe",
  "params": ["newJobs"],
  "id": 1
}
```

### Subscribe to Job Updates

```json
{
  "jsonrpc": "2.0",
  "method": "axn_subscribe",
  "params": ["jobUpdates", { "job_id": "job_abc123" }],
  "id": 1
}
```

### Subscribe to Price Updates

```json
{
  "jsonrpc": "2.0",
  "method": "axn_subscribe",
  "params": ["priceUpdates"],
  "id": 1
}
```

---

## Error Codes

| Code   | Message            | Description                            |
| ------ | ------------------ | -------------------------------------- |
| -32700 | Parse error        | Invalid JSON                           |
| -32600 | Invalid request    | Request is not valid JSON-RPC          |
| -32601 | Method not found   | Method does not exist                  |
| -32602 | Invalid params     | Invalid method parameters              |
| -32603 | Internal error     | Internal JSON-RPC error                |
| -32000 | Job not found      | Job ID does not exist                  |
| -32001 | Worker not found   | Worker address not registered          |
| -32002 | Insufficient stake | Not enough staked AXX                  |
| -32003 | Invalid specs      | Hardware specs don't meet requirements |
| -32004 | Quota exceeded     | Worker has exceeded epoch quota        |
| -32005 | Validation failed  | PoPC validation failed                 |

---

## Rate Limits

- Standard RPC: 100 requests/second per IP
- WebSocket: 50 subscriptions per connection
- Burst: 200 requests in 10 seconds

---

## Authentication

Most endpoints are public. Sensitive operations require signed transactions:

```json
{
  "from": "0x...",
  "signature": "0x...",
  "nonce": 123,
  ...
}
```

---

## Examples

### Using curl

```bash
# Get chain ID
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Get pricing info
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"axn_getPricingInfo","params":[],"id":1}'
```

### Using Go

```go
import "github.com/ethereum/go-ethereum/rpc"

client, _ := rpc.Dial("http://localhost:8545")

var result string
client.Call(&result, "eth_chainId")
```

### Using JavaScript

```javascript
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

// Standard methods
const chainId = await web3.eth.getChainId();

// Custom methods
const pricing = await web3.currentProvider.send('axn_getPricingInfo', []);
```

---

## Additional Resources

- [Testnet Integration Guide](../web/web-integration/JOIN_TESTNET.md)
- [Architecture Overview](../architecture/AXIONAX_PROTOCOL.md)
- [GitHub Repository](https://github.com/axionaxprotocol/axionax-core)
