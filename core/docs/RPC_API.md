# Axionax RPC API Reference
# API Guide for Axionax Protocol

## Overview

Axionax Protocol uses **JSON-RPC 2.0** as the primary API for connecting to the blockchain

**URL:** `http://your-node:8545`

---

## Ethereum-Compatible (eth_*)
## Methods compatible with Ethereum

| Method | Description | Params |
|--------|-------------|--------|
| `eth_blockNumber` | Get the latest block number | None |
| `eth_getBlockByNumber` | Get block data by number | `blockNumber`, `fullTx` |
| `eth_getBlockByHash` | Get block data by hash | `blockHash`, `fullTx` |
| `eth_getTransactionByHash` | Get transaction data | `txHash` |
| `eth_chainId` | Chain ID (hex) | None |
| `net_version` | Chain ID (decimal) | None |
| `eth_sendRawTransaction` | Send a transaction | `txHex` |

---

## Staking (staking_*)
## Staking System - Stake tokens to become a Validator

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

### Example: Get Validator Information

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "staking_getValidator",
  "params": ["0x1234567890123456789012345678901234567890"],
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "address": "0x1234...",
    "stake": "0x8ac7230489e80000",       // Self-staked amount
    "delegated": "0x0",                   // Amount received from delegation
    "voting_power": "0x8ac7230489e80000", // Total voting power (stake + delegated)
    "is_active": true,                    // Active status
    "commission_bps": 500,                // 5% commission
    "total_rewards": "0x0",               // Total rewards ever earned
    "unclaimed_rewards": "0x0"            // Unclaimed rewards
  },
  "id": 1
}
```

---

## Governance (gov_*)
## Governance System - On-chain voting

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

### Vote Options

| Vote | Accepted values |
|------|-----------------|
| In favor | `for`, `yes`, `1` |
| Against | `against`, `no`, `0` |
| Abstain | `abstain`, `2` |

### Example: Create Proposal

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "gov_createProposal",
  "params": [
    "0x1234...proposer_address",          // Proposer address
    "0x152d02c7e14af6800000",             // Minimum stake (100,000 AXX)
    "Increase Base Fee",                   // Title
    "Propose to increase base fee to reduce spam", // Description
    "parameter:base_fee=2000000000"        // Type: parameter change
  ],
  "id": 1
}
```

### Example: Cast Vote

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "gov_vote",
  "params": [
    "0xvoter_address",        // Voter address
    1,                        // Proposal ID
    "for",                    // In favor
    "0x8ac7230489e80000"      // Vote weight = staked amount
  ],
  "id": 1
}
```

---

## Configuration

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

---

## Usage Examples

### JavaScript (ethers.js style)

```javascript
// Get validator information
const response = await fetch('http://localhost:8545', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'staking_getActiveValidators',
    params: [],
    id: 1
  })
});

const { result } = await response.json();
console.log('Active validators:', result.length);
```

### cURL

```bash
# Get active proposals
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"gov_getActiveProposals","params":[],"id":1}'
```
