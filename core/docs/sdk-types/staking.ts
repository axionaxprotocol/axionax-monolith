/**
 * Axionax SDK - Staking Types
 * 
 * Copy this file to: packages/sdk/src/types/staking.ts
 * For use in @axionax/sdk
 */

// =============================================================================
// Types / Data Types
// =============================================================================

/**
 * Validator Information
 */
export interface ValidatorInfo {
  /** Validator address */
  address: string;
  /** Self-staked amount */
  stake: bigint;
  /** Amount received from delegation */
  delegated: bigint;
  /** Total voting power (stake + delegated) */
  votingPower: bigint;
  /** Active status */
  isActive: boolean;
  /** Commission rate (basis points, 500 = 5%) */
  commissionBps: number;
  /** Total rewards ever earned */
  totalRewards: bigint;
  /** Unclaimed rewards */
  unclaimedRewards: bigint;
  /** Number of blocks produced */
  blocksProduced: number;
  /** Total amount slashed */
  totalSlashed: bigint;
}

/**
 * Staking System Statistics
 */
export interface StakingStats {
  /** Total tokens staked */
  totalStaked: bigint;
  /** Total number of validators */
  totalValidators: number;
  /** Number of active validators */
  activeValidators: number;
  /** Minimum stake to become a validator */
  minStake: bigint;
}

/**
 * Delegation Information
 */
export interface Delegation {
  /** Delegator */
  delegator: string;
  /** Receiving validator */
  validator: string;
  /** Amount */
  amount: bigint;
  /** Accumulated rewards */
  rewards: bigint;
  /** Unlock block (0 = not unstaking) */
  unlockBlock: number;
}

/**
 * Staking System Configuration
 */
export interface StakingConfig {
  /** Minimum stake to become a validator */
  minValidatorStake: bigint;
  /** Minimum delegation amount */
  minDelegation: bigint;
  /** Number of blocks to wait after unstaking */
  unstakingLockBlocks: number;
  /** Reward rate per epoch (basis points) */
  epochRewardRateBps: number;
  /** Number of blocks per epoch */
  blocksPerEpoch: number;
  /** Maximum slash rate (basis points) */
  maxSlashRateBps: number;
}

// =============================================================================
// RPC Response Types
// =============================================================================

export interface ValidatorResponse {
  address: string;
  stake: string;           // hex
  delegated: string;       // hex
  voting_power: string;    // hex
  is_active: boolean;
  commission_bps: number;
  total_rewards: string;   // hex
  unclaimed_rewards: string; // hex
}

export interface StakingStatsResponse {
  total_staked: string;    // hex
  total_validators: number;
  active_validators: number;
  min_stake: string;       // hex
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert ValidatorResponse from RPC to ValidatorInfo
 */
export function parseValidatorInfo(response: ValidatorResponse): ValidatorInfo {
  return {
    address: response.address,
    stake: BigInt(response.stake),
    delegated: BigInt(response.delegated),
    votingPower: BigInt(response.voting_power),
    isActive: response.is_active,
    commissionBps: response.commission_bps,
    totalRewards: BigInt(response.total_rewards),
    unclaimedRewards: BigInt(response.unclaimed_rewards),
    blocksProduced: 0, // Not in response yet
    totalSlashed: 0n,  // Not in response yet
  };
}

/**
 * Convert StakingStatsResponse from RPC to StakingStats
 */
export function parseStakingStats(response: StakingStatsResponse): StakingStats {
  return {
    totalStaked: BigInt(response.total_staked),
    totalValidators: response.total_validators,
    activeValidators: response.active_validators,
    minStake: BigInt(response.min_stake),
  };
}

/**
 * Convert bigint to hex string for RPC calls
 */
export function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

/**
 * Format AXX amount for readability
 */
export function formatAXX(value: bigint, decimals = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  
  if (fraction === 0n) {
    return `${whole.toLocaleString()} AXX`;
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 2);
  return `${whole.toLocaleString()}.${fractionStr} AXX`;
}

/**
 * Calculate APY from epoch reward rate
 */
export function calculateAPY(epochRewardRateBps: number, epochsPerYear: number): number {
  const epochRate = epochRewardRateBps / 10000;
  const apy = Math.pow(1 + epochRate, epochsPerYear) - 1;
  return apy * 100; // Return as percentage
}
