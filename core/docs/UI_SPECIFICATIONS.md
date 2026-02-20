# Staking & Governance UI Specifications
# Specifications for Web Universe UI

## Overview

This document specifies the UI components to build in `axionax-web-universe` for Staking and Governance

---

## Staking UI

### Main Page: `/staking`

```
┌─────────────────────────────────────────────────────────────┐
│  Staking Dashboard                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Total Staked │  │ Your Stake  │  │ APY         │          │
│  │ 45.2M AXX    │  │ 10,000 AXX  │  │ ~6.0%       │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Your Position                                         │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │ Staked:    10,000 AXX                           │   │  │
│  │ │ Delegated: 5,000 AXX (to validator1)            │   │  │
│  │ │ Rewards:   125.5 AXX (unclaimed)                │   │  │
│  │ │ [Claim Rewards]  [Stake More]  [Unstake]        │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Active Validators                          [Search]   │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │ Validator          Stake        APY    Action   │   │  │
│  │ │─────────────────────────────────────────────────│   │  │
│  │ │ validator1.axn    5M AXX       6.2%   [Delegate]│   │  │
│  │ │ validator2.axn    3.2M AXX     5.8%   [Delegate]│   │  │
│  │ │ validator3.axn    2.1M AXX     6.0%   [Delegate]│   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Components to Build

#### 1. `StakingStats.tsx`
```typescript
interface StakingStatsProps {
  totalStaked: bigint;
  yourStake: bigint;
  apy: number;
  pendingRewards: bigint;
}
```

#### 2. `ValidatorList.tsx`
```typescript
interface Validator {
  address: string;
  stake: bigint;
  delegated: bigint;
  votingPower: bigint;
  isActive: boolean;
  commissionBps: number;
  apy: number;
}

interface ValidatorListProps {
  validators: Validator[];
  onDelegate: (validatorAddress: string, amount: bigint) => void;
}
```

#### 3. `StakeForm.tsx`
```typescript
interface StakeFormProps {
  balance: bigint;
  minStake: bigint;
  onStake: (amount: bigint) => Promise<void>;
  onUnstake: (amount: bigint) => Promise<void>;
}
```

#### 4. `DelegateModal.tsx`
```typescript
interface DelegateModalProps {
  validator: Validator;
  balance: bigint;
  minDelegation: bigint;
  onDelegate: (amount: bigint) => Promise<void>;
  onClose: () => void;
}
```

### RPC Calls Used
```typescript
// Fetch data
await rpc.call('staking_getActiveValidators', []);
await rpc.call('staking_getValidator', [address]);
await rpc.call('staking_getStats', []);
await rpc.call('staking_getTotalStaked', []);

// Perform actions
await rpc.call('staking_stake', [address, amountHex]);
await rpc.call('staking_unstake', [address, amountHex]);
await rpc.call('staking_delegate', [delegator, validator, amountHex]);
await rpc.call('staking_claimRewards', [address]);
```

---

## Governance UI

### Main Page: `/governance`

```
┌─────────────────────────────────────────────────────────────┐
│  Governance                              [Create Proposal]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Active      │  │ Your Voting │  │ Quorum      │          │
│  │ 3 Proposals │  │ Power: 15K  │  │ 30%         │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Active Proposals                                      │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │ #1: Increase Base Fee                           │   │  │
│  │ │ Type: Parameter Change                          │   │  │
│  │ │ Status: Active • Ends in 3 days                 │   │  │
│  │ │ ████████████░░░░░░░░ For: 65% Against: 20%      │   │  │
│  │ │ [Vote For] [Vote Against] [Abstain] [Details]   │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  │                                                        │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │ #2: Treasury Spend - Marketing                  │   │  │
│  │ │ Type: Treasury • Amount: 500,000 AXX            │   │  │
│  │ │ Status: Active • Ends in 5 days                 │   │  │
│  │ │ ████░░░░░░░░░░░░░░░░ For: 25% Against: 5%       │   │  │
│  │ │ [Vote For] [Vote Against] [Abstain] [Details]   │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Past Proposals                                        │  │
│  │ #0: Initial Parameters ✅ Passed & Executed           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Components to Build

#### 1. `ProposalCard.tsx`
```typescript
interface Proposal {
  id: number;
  proposer: string;
  title: string;
  description: string;
  proposalType: 'text' | 'parameter' | 'treasury' | 'upgrade';
  startBlock: number;
  endBlock: number;
  status: 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  totalVotes: bigint;
}

interface ProposalCardProps {
  proposal: Proposal;
  currentBlock: number;
  onVote: (proposalId: number, vote: 'for' | 'against' | 'abstain') => void;
  onViewDetails: (proposalId: number) => void;
}
```

#### 2. `VotingProgress.tsx`
```typescript
interface VotingProgressProps {
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  quorumBps: number;
  totalStaked: bigint;
}
```

#### 3. `CreateProposalForm.tsx`
```typescript
interface CreateProposalFormProps {
  userStake: bigint;
  minProposalStake: bigint;
  onSubmit: (proposal: NewProposal) => Promise<void>;
}

interface NewProposal {
  title: string;
  description: string;
  type: 'text' | 'parameter' | 'treasury' | 'upgrade';
  // For parameter change
  paramKey?: string;
  paramValue?: string;
  // For treasury spend
  recipient?: string;
  amount?: bigint;
  // For upgrade
  version?: string;
}
```

#### 4. `VoteModal.tsx`
```typescript
interface VoteModalProps {
  proposal: Proposal;
  votingPower: bigint;
  onVote: (vote: 'for' | 'against' | 'abstain') => Promise<void>;
  onClose: () => void;
}
```

### RPC Calls Used
```typescript
// Fetch data
await rpc.call('gov_getActiveProposals', []);
await rpc.call('gov_getProposal', [proposalId]);
await rpc.call('gov_getStats', []);
await rpc.call('gov_getVote', [proposalId, voterAddress]);

// Perform actions
await rpc.call('gov_createProposal', [proposer, stakeHex, title, desc, type]);
await rpc.call('gov_vote', [voter, proposalId, vote, weightHex]);
await rpc.call('gov_executeProposal', [proposalId]);
```

---

## Block Explorer Enhancements

### Validator Page: `/explorer/validator/[address]`

```
┌─────────────────────────────────────────────────────────────┐
│  Validator: 0x1234...5678                                   │
├─────────────────────────────────────────────────────────────┤
│  Status: ✅ Active                                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Self Stake  │  │ Delegated   │  │ Total Power │          │
│  │ 50,000 AXX  │  │ 25,000 AXX  │  │ 75,000 AXX  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Blocks Produced                                       │  │
│  │ Block #12345 • 2 mins ago                             │  │
│  │ Block #12340 • 15 mins ago                            │  │
│  │ Block #12335 • 28 mins ago                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Delegators (5)                                        │  │
│  │ 0xabc...123  10,000 AXX                               │  │
│  │ 0xdef...456   8,000 AXX                               │  │
│  │ 0x789...abc   7,000 AXX                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Proposal Page: `/explorer/proposal/[id]`

```
┌─────────────────────────────────────────────────────────────┐
│  Proposal #1: Increase Base Fee                              │
├─────────────────────────────────────────────────────────────┤
│  Type: Parameter Change                                     │
│  Proposer: 0xabc...123                                      │
│  Status: ✅ Passed                                          │
│                                                              │
│  Parameter: base_fee                                        │
│  New Value: 2000000000 (2 Gwei)                            │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Voting Results                                        │  │
│  │ For:     65,000 AXX (65%)  ████████████░░░░░░░        │  │
│  │ Against: 20,000 AXX (20%)  ████░░░░░░░░░░░░░░░        │  │
│  │ Abstain: 15,000 AXX (15%)  ███░░░░░░░░░░░░░░░░        │  │
│  │ Quorum:  ✅ Reached (100K / 30K required)             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Timeline                                              │  │
│  │ Created:   Block #10000 (Dec 20, 2025)                │  │
│  │ Voting:    Block #10000 - #251920                     │  │
│  │ Finalized: Block #251920 (Dec 27, 2025)               │  │
│  │ Executed:  Block #321040 (Dec 29, 2025)               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Guidelines

### Colors
```css
/* Staking */
--staking-primary: #10B981;    /* Emerald Green */
--staking-secondary: #059669;

/* Governance */
--gov-primary: #8B5CF6;        /* Violet */
--gov-for: #22C55E;            /* Green - In Favor */
--gov-against: #EF4444;        /* Red - Against */
--gov-abstain: #9CA3AF;        /* Gray - Abstain */

/* Status */
--status-active: #3B82F6;      /* Blue */
--status-passed: #22C55E;      /* Green */
--status-failed: #EF4444;      /* Red */
--status-executed: #8B5CF6;    /* Violet */
```

### Typography
- Main heading: `text-2xl font-bold`
- Subheading: `text-lg font-semibold`
- Numbers: `font-mono` (for AXX amounts)

---

## SDK Types (for @axionax/sdk)

```typescript
// packages/sdk/src/types/staking.ts

export interface ValidatorInfo {
  address: string;
  stake: bigint;
  delegated: bigint;
  votingPower: bigint;
  isActive: boolean;
  commissionBps: number;
  totalRewards: bigint;
  unclaimedRewards: bigint;
}

export interface StakingStats {
  totalStaked: bigint;
  totalValidators: number;
  activeValidators: number;
  minStake: bigint;
}

// packages/sdk/src/types/governance.ts

export interface Proposal {
  id: number;
  proposer: string;
  title: string;
  description: string;
  proposalType: ProposalType;
  startBlock: number;
  endBlock: number;
  status: ProposalStatus;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
}

export type ProposalType = 'text' | 'parameter' | 'treasury' | 'upgrade';
export type ProposalStatus = 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';
export type VoteOption = 'for' | 'against' | 'abstain';

export interface GovernanceStats {
  activeProposals: number;
  totalProposals: number;
  votingPeriodBlocks: number;
  executionDelayBlocks: number;
  quorumBps: number;
  passThresholdBps: number;
  minProposalStake: bigint;
}
```

---

## Implementation Checklist

### Staking UI
- [ ] `StakingStats` component
- [ ] `ValidatorList` component
- [ ] `StakeForm` component
- [ ] `DelegateModal` component
- [ ] `/staking` page
- [ ] Connect to RPC

### Governance UI
- [ ] `ProposalCard` component
- [ ] `VotingProgress` component
- [ ] `CreateProposalForm` component
- [ ] `VoteModal` component
- [ ] `/governance` page
- [ ] Connect to RPC

### Block Explorer
- [ ] Validator detail page
- [ ] Proposal detail page
- [ ] Staking/Governance stats on home
