/**
 * Axionax SDK - Staking Types
 * 
 * Copy this file to: packages/sdk/src/types/staking.ts
 * สำหรับใช้ใน @axionax/sdk
 */

// =============================================================================
// Types / ประเภทข้อมูล
// =============================================================================

/**
 * ข้อมูล Validator
 */
export interface ValidatorInfo {
  /** ที่อยู่ validator */
  address: string;
  /** จำนวนที่ stake เอง */
  stake: bigint;
  /** จำนวนที่ได้รับ delegate */
  delegated: bigint;
  /** พลังเสียงรวม (stake + delegated) */
  votingPower: bigint;
  /** สถานะ active */
  isActive: boolean;
  /** ค่าคอมมิชชั่น (basis points, 500 = 5%) */
  commissionBps: number;
  /** rewards ทั้งหมดที่เคยได้ */
  totalRewards: bigint;
  /** rewards ที่ยังไม่ได้รับ */
  unclaimedRewards: bigint;
  /** จำนวน blocks ที่ผลิต */
  blocksProduced: number;
  /** จำนวนที่โดน slash */
  totalSlashed: bigint;
}

/**
 * สถิติระบบ Staking
 */
export interface StakingStats {
  /** จำนวน token ที่ stake ทั้งหมด */
  totalStaked: bigint;
  /** จำนวน validators ทั้งหมด */
  totalValidators: number;
  /** จำนวน validators ที่ active */
  activeValidators: number;
  /** stake ขั้นต่ำเพื่อเป็น validator */
  minStake: bigint;
}

/**
 * ข้อมูล Delegation
 */
export interface Delegation {
  /** ผู้ delegate */
  delegator: string;
  /** validator ที่ได้รับ */
  validator: string;
  /** จำนวน */
  amount: bigint;
  /** rewards ที่สะสม */
  rewards: bigint;
  /** block ที่ปลดล็อก (0 = ไม่ได้ unstaking) */
  unlockBlock: number;
}

/**
 * Config ของระบบ Staking
 */
export interface StakingConfig {
  /** stake ขั้นต่ำเพื่อเป็น validator */
  minValidatorStake: bigint;
  /** จำนวนขั้นต่ำที่ delegate ได้ */
  minDelegation: bigint;
  /** จำนวน blocks ที่ต้องรอหลัง unstake */
  unstakingLockBlocks: number;
  /** อัตรา reward ต่อ epoch (basis points) */
  epochRewardRateBps: number;
  /** จำนวน blocks ต่อ epoch */
  blocksPerEpoch: number;
  /** อัตรา slash สูงสุด (basis points) */
  maxSlashRateBps: number;
}

// =============================================================================
// RPC Response Types / ประเภทการตอบกลับจาก RPC
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
// Helper Functions / ฟังก์ชันช่วย
// =============================================================================

/**
 * แปลง ValidatorResponse จาก RPC เป็น ValidatorInfo
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
 * แปลง StakingStatsResponse จาก RPC เป็น StakingStats
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
 * แปลง bigint เป็น hex string สำหรับส่ง RPC
 */
export function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

/**
 * Format จำนวน AXX ให้อ่านง่าย
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
 * คำนวณ APY จาก epoch reward rate
 */
export function calculateAPY(epochRewardRateBps: number, epochsPerYear: number): number {
  const epochRate = epochRewardRateBps / 10000;
  const apy = Math.pow(1 + epochRate, epochsPerYear) - 1;
  return apy * 100; // Return as percentage
}
