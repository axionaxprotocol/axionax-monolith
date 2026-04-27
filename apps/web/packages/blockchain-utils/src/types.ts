/**
 * Type definitions for Axionax blockchain utilities
 */

// ============================================
// Network Types
// ============================================

export interface NetworkConfig {
  chainId: number;
  chainIdHex: string;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  isTestnet: boolean;
}

// ============================================
// Token Types
// ============================================

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: bigint;
  balanceFormatted: string;
}

// ============================================
// Transaction Types
// ============================================

export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string | null;
  value: bigint;
  gasUsed: bigint;
  gasPrice: bigint;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  type: TransactionType;
}

export type TransactionType =
  | 'transfer'
  | 'token_transfer'
  | 'contract_deploy'
  | 'contract_call'
  | 'staking'
  | 'governance'
  | 'other';

// ============================================
// Address Types
// ============================================

export interface AddressInfo {
  address: string;
  isContract: boolean;
  isValidator: boolean;
  balance: bigint;
  transactionCount: number;
  firstSeen?: Date;
  lastSeen?: Date;
}

// ============================================
// Block Types
// ============================================

export interface BlockInfo {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: Date;
  transactionCount: number;
  gasUsed: bigint;
  gasLimit: bigint;
  baseFeePerGas?: bigint;
  miner: string;
}

// ============================================
// Staking Types
// ============================================

export interface ValidatorInfo {
  address: string;
  stake: bigint;
  isActive: boolean;
  commission: number;
  delegators: number;
  uptime: number;
}

export interface StakingPosition {
  staker: string;
  validator: string;
  amount: bigint;
  rewards: bigint;
  startTime: Date;
  unlockTime?: Date;
}

// ============================================
// Governance Types
// ============================================

export interface Proposal {
  id: number;
  proposer: string;
  title: string;
  description: string;
  status: ProposalStatus;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  startTime: Date;
  endTime: Date;
  executionTime?: Date;
}

export type ProposalStatus =
  | 'pending'
  | 'active'
  | 'succeeded'
  | 'defeated'
  | 'queued'
  | 'executed'
  | 'cancelled'
  | 'expired';

// ============================================
// Genesis Types
// ============================================

export interface GenesisAllocation {
  address: string;
  amount: string;
  tier: number;
  score: number;
  proof: string[];
}

export interface GenesisSnapshot {
  id: string;
  block: number;
  timestamp: Date;
  merkleRoot: string;
  totalAddresses: number;
  eligibleAddresses: number;
  totalAmount: string;
  allocations: GenesisAllocation[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
