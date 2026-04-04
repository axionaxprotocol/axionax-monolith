/**
 * Constants for Axionax blockchain.
 * Synced with axionax-core-universe (core/.env.example, core/DEPLOYMENT_GUIDE.md).
 * @see https://github.com/axionaxprotocol/axionax-core-universe
 */

// ============================================
// Chain IDs (must match core-universe)
// ============================================

export const CHAIN_IDS = {
  TESTNET: 86137,
  MAINNET: 86150, // Reserved; core: 86137 testnet, 86150 mainnet
} as const;

// ============================================
// Contract Addresses
// ============================================

export const TESTNET_CONTRACTS = {
  AXX_TOKEN: '0x0000000000000000000000000000000000001000',
  STAKING: '0x0000000000000000000000000000000000001001',
  GOVERNANCE: '0x0000000000000000000000000000000000001002',
  TREASURY: '0x0000000000000000000000000000000000001003',
} as const;

export const MAINNET_CONTRACTS = {
  AXX_TOKEN: '0x0000000000000000000000000000000000001000',
  STAKING: '0x0000000000000000000000000000000000001001',
  GOVERNANCE: '0x0000000000000000000000000000000000001002',
  TREASURY: '0x0000000000000000000000000000000000001003',
} as const;

// ============================================
// Token Constants
// ============================================

export const AXX_TOKEN = {
  symbol: 'AXX',
  name: 'Axionax Token',
  decimals: 18,
} as const;

export const AXXT_TOKEN = {
  symbol: 'AXXt',
  name: 'Axionax Testnet Token',
  decimals: 18,
} as const;

// ============================================
// Supply Constants
// ============================================

export const TESTNET_SUPPLY = {
  MAX_SUPPLY: BigInt('1000000000000000000000000000'), // 1 Billion AXXt
  INITIAL_SUPPLY: BigInt('100000000000000000000000000'), // 100 Million AXXt
  YEARLY_MINT_CAP: BigInt('100000000000000000000000000'), // 100 Million AXXt
} as const;

export const MAINNET_SUPPLY = {
  MAX_SUPPLY: BigInt('1000000000000000000000000000000'), // 1 Trillion AXX
  YEARLY_MINT_CAP: BigInt('100000000000000000000000000000'), // 100 Billion AXX
} as const;

// ============================================
// Staking Constants (match core DEPLOYMENT_GUIDE: min_validator_stake 10,000)
// ============================================

export const STAKING_CONSTANTS = {
  MIN_VALIDATOR_STAKE: BigInt('10000000000000000000000'), // 10,000 AXX (core: 10,000 tokens)
  MIN_DELEGATION: BigInt('100000000000000000000'), // 100 AXX
  UNBONDING_PERIOD: 14 * 24 * 60 * 60, // 14 days in seconds
  MAX_VALIDATORS: 100,
  TARGET_APY: 0.0225, // 2.25%
} as const;

// ============================================
// Governance Constants
// ============================================

export const GOVERNANCE_CONSTANTS = {
  PROPOSAL_THRESHOLD: BigInt('1000000000000000000000000'), // 1,000,000 AXX
  VOTING_PERIOD: 7 * 24 * 60 * 60, // 7 days in seconds
  VOTING_DELAY: 1 * 24 * 60 * 60, // 1 day in seconds
  QUORUM_PERCENTAGE: 4, // 4%
  EXECUTION_DELAY: 2 * 24 * 60 * 60, // 2 days in seconds
} as const;

// ============================================
// RPC URLs
// ============================================

export const RPC_URLS = {
  TESTNET: ['https://rpc.axionax.org', 'http://217.76.61.116:8545', 'http://46.250.244.4:8545'],
  MAINNET: [
    // Will be populated at mainnet launch
  ],
} as const;

// ============================================
// Explorer URLs
// ============================================

export const EXPLORER_URLS = {
  TESTNET: 'https://explorer.axionax.org',
  MAINNET: 'https://mainnet.explorer.axionax.org', // Planned
} as const;

// ============================================
// API URLs
// ============================================

export const API_URLS = {
  TESTNET: 'https://api.axionax.org',
  MAINNET: 'https://mainnet.api.axionax.org', // Planned
} as const;

// ============================================
// Event Signatures
// ============================================

export const EVENT_SIGNATURES = {
  // ERC20 Transfer
  TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',

  // ERC20 Approval
  APPROVAL: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',

  // Staking
  STAKED: '0x9e71bc8eea02a63969f509818f2dafb9254532904319f9dbda79b67bd34a5f3d',
  UNSTAKED: '0x0f5bb82176feb1b5e747e28471aa92156a04d9f3ab9f45f28e2d704232b93f75',

  // Governance
  PROPOSAL_CREATED: '0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0',
  VOTE_CAST: '0xb8e138887d0aa13bab447e82de9d5c1777041ecd21ca36ba824ff1e6c07ddda4',
} as const;

// ============================================
// Chain / Node Params (from core-universe .env.example + DEPLOYMENT_GUIDE)
// ============================================

export const CHAIN_PARAMS = {
  RPC_PORT: 8545,
  WS_PORT: 8546,
  P2P_PORT: 30303,
  RATE_LIMIT_RPS: 100,
  MAX_PEERS: 50,
  BLOCK_TIME_SECS: 5,
  MAX_BLOCK_SIZE_BYTES: 1_048_576,
  GAS_LIMIT: 30_000_000,
  TX_POOL_SIZE: 10_000,
  CACHE_SIZE_MB: 2048,
  MIN_GAS_PRICE_WEI: BigInt('1000000000'), // 1 Gwei
} as const;

/** PoPC consensus (core: sample_size 1000, min_confidence 0.999, fraud_window_blocks 720) */
export const POPC_PARAMS = {
  SAMPLE_SIZE: 1000,
  MIN_CONFIDENCE: 0.999,
  FRAUD_WINDOW_BLOCKS: 720,
} as const;

// ============================================
// Time Constants
// ============================================

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// ============================================
// Formatting Constants
// ============================================

export const FORMATTING = {
  MAX_DECIMALS: 4,
  SHORT_ADDRESS_CHARS: 4,
  GAS_PRICE_DECIMALS: 9, // Gwei
} as const;
