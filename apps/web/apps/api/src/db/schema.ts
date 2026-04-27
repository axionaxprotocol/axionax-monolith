/**
 * Database Schema for Axionax Testnet Indexer
 *
 * This schema stores all relevant testnet data that will be
 * used to generate the mainnet genesis block.
 */

import {
  pgTable,
  text,
  timestamp,
  bigint,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  decimal,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ============================================
// Enums
// ============================================

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'confirmed',
  'failed',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'transfer', // Native AXX transfer
  'token_transfer', // ERC20 token transfer
  'contract_deploy', // Contract deployment
  'contract_call', // Contract interaction
  'staking', // Staking operation
  'governance', // Governance vote
  'other',
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'transaction',
  'staking',
  'governance',
  'validator',
  'faucet_claim',
]);

export const nodeTypeEnum = pgEnum('node_type', ['validator', 'worker', 'rpc']);

export const nodeStatusEnum = pgEnum('node_status', [
  'pending', // รอ verification
  'active', // ทำงานปกติ
  'inactive', // offline
  'suspended', // ถูกระงับ
  'slashed', // ถูกลงโทษ
]);

// ============================================
// Core Tables
// ============================================

/**
 * Blocks - Store block information
 */
export const blocks = pgTable(
  'blocks',
  {
    number: bigint('number', { mode: 'number' }).primaryKey(),
    hash: text('hash').notNull().unique(),
    parentHash: text('parent_hash').notNull(),
    timestamp: timestamp('timestamp').notNull(),
    transactionCount: integer('transaction_count').notNull().default(0),
    gasUsed: bigint('gas_used', { mode: 'number' }).notNull(),
    gasLimit: bigint('gas_limit', { mode: 'number' }).notNull(),
    baseFeePerGas: bigint('base_fee_per_gas', { mode: 'number' }),
    miner: text('miner').notNull(),
    extraData: text('extra_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    hashIdx: uniqueIndex('blocks_hash_idx').on(table.hash),
    timestampIdx: index('blocks_timestamp_idx').on(table.timestamp),
  }),
);

/**
 * Transactions - Store all testnet transactions
 */
export const transactions = pgTable(
  'transactions',
  {
    hash: text('hash').primaryKey(),
    blockNumber: bigint('block_number', { mode: 'number' })
      .notNull()
      .references(() => blocks.number),
    blockHash: text('block_hash').notNull(),
    transactionIndex: integer('transaction_index').notNull(),
    from: text('from').notNull(),
    to: text('to'),
    value: decimal('value', { precision: 78, scale: 0 }).notNull(),
    gasPrice: bigint('gas_price', { mode: 'number' }),
    gasLimit: bigint('gas_limit', { mode: 'number' }).notNull(),
    gasUsed: bigint('gas_used', { mode: 'number' }),
    nonce: integer('nonce').notNull(),
    input: text('input'),
    status: transactionStatusEnum('status').notNull().default('confirmed'),
    type: transactionTypeEnum('type').notNull().default('transfer'),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    blockNumberIdx: index('transactions_block_number_idx').on(table.blockNumber),
    fromIdx: index('transactions_from_idx').on(table.from),
    toIdx: index('transactions_to_idx').on(table.to),
    timestampIdx: index('transactions_timestamp_idx').on(table.timestamp),
    typeIdx: index('transactions_type_idx').on(table.type),
  }),
);

/**
 * Addresses - Track unique addresses and their activity
 */
export const addresses = pgTable(
  'addresses',
  {
    address: text('address').primaryKey(),
    firstSeenBlock: bigint('first_seen_block', { mode: 'number' }).notNull(),
    firstSeenAt: timestamp('first_seen_at').notNull(),
    lastSeenBlock: bigint('last_seen_block', { mode: 'number' }).notNull(),
    lastSeenAt: timestamp('last_seen_at').notNull(),
    transactionCount: integer('transaction_count').notNull().default(0),
    sentCount: integer('sent_count').notNull().default(0),
    receivedCount: integer('received_count').notNull().default(0),
    totalSent: decimal('total_sent', { precision: 78, scale: 0 }).notNull().default('0'),
    totalReceived: decimal('total_received', { precision: 78, scale: 0 }).notNull().default('0'),
    isContract: boolean('is_contract').notNull().default(false),
    isValidator: boolean('is_validator').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    firstSeenIdx: index('addresses_first_seen_idx').on(table.firstSeenAt),
    txCountIdx: index('addresses_tx_count_idx').on(table.transactionCount),
    isValidatorIdx: index('addresses_is_validator_idx').on(table.isValidator),
  }),
);

/**
 * Token Transfers - ERC20 token transfer events
 */
export const tokenTransfers = pgTable(
  'token_transfers',
  {
    id: text('id').primaryKey(), // txHash-logIndex
    transactionHash: text('transaction_hash')
      .notNull()
      .references(() => transactions.hash),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
    logIndex: integer('log_index').notNull(),
    tokenAddress: text('token_address').notNull(),
    from: text('from').notNull(),
    to: text('to').notNull(),
    value: decimal('value', { precision: 78, scale: 0 }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    txHashIdx: index('token_transfers_tx_hash_idx').on(table.transactionHash),
    tokenAddressIdx: index('token_transfers_token_address_idx').on(table.tokenAddress),
    fromIdx: index('token_transfers_from_idx').on(table.from),
    toIdx: index('token_transfers_to_idx').on(table.to),
    blockNumberIdx: index('token_transfers_block_number_idx').on(table.blockNumber),
  }),
);

/**
 * Staking Events - Track staking activity
 */
export const stakingEvents = pgTable(
  'staking_events',
  {
    id: text('id').primaryKey(), // txHash-logIndex
    transactionHash: text('transaction_hash')
      .notNull()
      .references(() => transactions.hash),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
    eventType: text('event_type').notNull(), // stake, unstake, claim
    staker: text('staker').notNull(),
    validator: text('validator'),
    amount: decimal('amount', { precision: 78, scale: 0 }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    stakerIdx: index('staking_events_staker_idx').on(table.staker),
    validatorIdx: index('staking_events_validator_idx').on(table.validator),
    blockNumberIdx: index('staking_events_block_number_idx').on(table.blockNumber),
  }),
);

/**
 * Governance Events - Track governance participation
 */
export const governanceEvents = pgTable(
  'governance_events',
  {
    id: text('id').primaryKey(), // txHash-logIndex
    transactionHash: text('transaction_hash')
      .notNull()
      .references(() => transactions.hash),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
    eventType: text('event_type').notNull(), // proposal_created, voted, executed
    proposalId: bigint('proposal_id', { mode: 'number' }),
    voter: text('voter'),
    support: boolean('support'),
    votingPower: decimal('voting_power', { precision: 78, scale: 0 }),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    voterIdx: index('governance_events_voter_idx').on(table.voter),
    proposalIdx: index('governance_events_proposal_idx').on(table.proposalId),
    blockNumberIdx: index('governance_events_block_number_idx').on(table.blockNumber),
  }),
);

// ============================================
// Aggregation Tables (for Genesis Generation)
// ============================================

/**
 * Address Activity Summary - Pre-calculated activity scores
 */
export const addressActivitySummary = pgTable(
  'address_activity_summary',
  {
    address: text('address')
      .primaryKey()
      .references(() => addresses.address),

    // Transaction metrics
    totalTransactions: integer('total_transactions').notNull().default(0),
    totalGasSpent: decimal('total_gas_spent', { precision: 78, scale: 0 }).notNull().default('0'),

    // Token metrics
    totalTokenTransfers: integer('total_token_transfers').notNull().default(0),
    uniqueTokensInteracted: integer('unique_tokens_interacted').notNull().default(0),

    // Staking metrics
    totalStakingEvents: integer('total_staking_events').notNull().default(0),
    totalStaked: decimal('total_staked', { precision: 78, scale: 0 }).notNull().default('0'),

    // Governance metrics
    totalGovernanceVotes: integer('total_governance_votes').notNull().default(0),
    proposalsCreated: integer('proposals_created').notNull().default(0),

    // Calculated scores
    activityScore: decimal('activity_score', { precision: 20, scale: 4 }).notNull().default('0'),
    airdropEligible: boolean('airdrop_eligible').notNull().default(false),
    airdropAmount: decimal('airdrop_amount', { precision: 78, scale: 0 }).notNull().default('0'),
    airdropTier: integer('airdrop_tier').notNull().default(0), // 0=none, 1=bronze, 2=silver, 3=gold

    // Timestamps
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    activityScoreIdx: index('address_activity_score_idx').on(table.activityScore),
    airdropEligibleIdx: index('address_airdrop_eligible_idx').on(table.airdropEligible),
    airdropTierIdx: index('address_airdrop_tier_idx').on(table.airdropTier),
  }),
);

// ============================================
// Indexer State Tables
// ============================================

/**
 * Indexer State - Track indexer progress
 */
export const indexerState = pgTable('indexer_state', {
  id: text('id').primaryKey().default('default'),
  lastIndexedBlock: bigint('last_indexed_block', { mode: 'number' }).notNull().default(0),
  lastIndexedAt: timestamp('last_indexed_at'),
  isRunning: boolean('is_running').notNull().default(false),
  status: text('status').notNull().default('idle'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// Genesis Snapshot Tables
// ============================================

/**
 * Genesis Snapshots - Store generated snapshots
 */
export const genesisSnapshots = pgTable(
  'genesis_snapshots',
  {
    id: text('id').primaryKey(),
    snapshotBlock: bigint('snapshot_block', { mode: 'number' }).notNull(),
    snapshotTimestamp: timestamp('snapshot_timestamp').notNull(),

    // Statistics
    totalAddresses: integer('total_addresses').notNull(),
    eligibleAddresses: integer('eligible_addresses').notNull(),
    totalAirdropAmount: decimal('total_airdrop_amount', { precision: 78, scale: 0 }).notNull(),

    // Merkle tree
    merkleRoot: text('merkle_root').notNull(),

    // Full data (JSONB for flexibility)
    allocations: jsonb('allocations').notNull(), // Array of { address, amount, proof }
    metadata: jsonb('metadata'), // Additional metadata

    // Status
    isFinalized: boolean('is_finalized').notNull().default(false),
    finalizedAt: timestamp('finalized_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    snapshotBlockIdx: index('genesis_snapshots_block_idx').on(table.snapshotBlock),
    isFinalizedIdx: index('genesis_snapshots_finalized_idx').on(table.isFinalized),
  }),
);

// ============================================
// Node Registration Tables
// ============================================

/**
 * Registered Nodes - Track all registered nodes (validators, workers, RPC)
 */
export const registeredNodes = pgTable(
  'registered_nodes',
  {
    id: text('id').primaryKey(), // UUID
    nodeType: nodeTypeEnum('node_type').notNull(),
    status: nodeStatusEnum('status').notNull().default('pending'),

    // Node Information
    nodeName: text('node_name').notNull(),
    operatorName: text('operator_name').notNull(),
    email: text('email').notNull(),
    website: text('website'),

    // Technical Details
    walletAddress: text('wallet_address').notNull(),
    serverIp: text('server_ip').notNull(),
    rpcPort: integer('rpc_port').notNull().default(8545),
    p2pPort: integer('p2p_port').notNull().default(30303),
    location: text('location'),

    // Verification
    emailVerified: boolean('email_verified').notNull().default(false),
    emailVerificationToken: text('email_verification_token'),
    nodeVerified: boolean('node_verified').notNull().default(false),
    verifiedAt: timestamp('verified_at'),

    // Staking (for validators and workers)
    stakeAmount: decimal('stake_amount', { precision: 78, scale: 0 }).notNull().default('0'),
    stakeTxHash: text('stake_tx_hash'),

    // Performance Metrics
    uptime: decimal('uptime', { precision: 5, scale: 2 }).notNull().default('0'), // percentage
    blocksProduced: integer('blocks_produced').notNull().default(0),
    blocksValidated: integer('blocks_validated').notNull().default(0),
    totalRewards: decimal('total_rewards', { precision: 78, scale: 0 }).notNull().default('0'),
    slashingEvents: integer('slashing_events').notNull().default(0),

    // Timestamps
    registeredAt: timestamp('registered_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nodeTypeIdx: index('registered_nodes_type_idx').on(table.nodeType),
    statusIdx: index('registered_nodes_status_idx').on(table.status),
    walletAddressIdx: uniqueIndex('registered_nodes_wallet_idx').on(table.walletAddress),
    serverIpIdx: index('registered_nodes_ip_idx').on(table.serverIp),
  }),
);

/**
 * Node Health Checks - Track node health over time
 */
export const nodeHealthChecks = pgTable(
  'node_health_checks',
  {
    id: text('id').primaryKey(), // UUID
    nodeId: text('node_id')
      .notNull()
      .references(() => registeredNodes.id),

    // Health Data
    isOnline: boolean('is_online').notNull(),
    latencyMs: integer('latency_ms'),
    blockHeight: bigint('block_height', { mode: 'number' }),
    peerCount: integer('peer_count'),
    syncStatus: text('sync_status'), // synced, syncing, not_synced

    // Error info
    errorMessage: text('error_message'),

    checkedAt: timestamp('checked_at').defaultNow().notNull(),
  },
  (table) => ({
    nodeIdIdx: index('node_health_node_id_idx').on(table.nodeId),
    checkedAtIdx: index('node_health_checked_at_idx').on(table.checkedAt),
  }),
);

/**
 * Node Rewards - Track rewards distributed to nodes
 */
export const nodeRewards = pgTable(
  'node_rewards',
  {
    id: text('id').primaryKey(), // UUID
    nodeId: text('node_id')
      .notNull()
      .references(() => registeredNodes.id),

    // Reward Details
    rewardType: text('reward_type').notNull(), // block_reward, transaction_fee, staking_reward
    amount: decimal('amount', { precision: 78, scale: 0 }).notNull(),
    blockNumber: bigint('block_number', { mode: 'number' }),
    txHash: text('tx_hash'),

    // Status
    isPaid: boolean('is_paid').notNull().default(false),
    paidAt: timestamp('paid_at'),
    paymentTxHash: text('payment_tx_hash'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    nodeIdIdx: index('node_rewards_node_id_idx').on(table.nodeId),
    rewardTypeIdx: index('node_rewards_type_idx').on(table.rewardType),
    isPaidIdx: index('node_rewards_is_paid_idx').on(table.isPaid),
  }),
);

// ============================================
// Type Exports
// ============================================

export type Block = typeof blocks.$inferSelect;
export type NewBlock = typeof blocks.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;

export type TokenTransfer = typeof tokenTransfers.$inferSelect;
export type NewTokenTransfer = typeof tokenTransfers.$inferInsert;

export type StakingEvent = typeof stakingEvents.$inferSelect;
export type NewStakingEvent = typeof stakingEvents.$inferInsert;

export type GovernanceEvent = typeof governanceEvents.$inferSelect;
export type NewGovernanceEvent = typeof governanceEvents.$inferInsert;

export type AddressActivitySummary = typeof addressActivitySummary.$inferSelect;
export type NewAddressActivitySummary = typeof addressActivitySummary.$inferInsert;

export type IndexerState = typeof indexerState.$inferSelect;
export type GenesisSnapshot = typeof genesisSnapshots.$inferSelect;

export type RegisteredNode = typeof registeredNodes.$inferSelect;
export type NewRegisteredNode = typeof registeredNodes.$inferInsert;

export type NodeHealthCheck = typeof nodeHealthChecks.$inferSelect;
export type NewNodeHealthCheck = typeof nodeHealthChecks.$inferInsert;

export type NodeReward = typeof nodeRewards.$inferSelect;
export type NewNodeReward = typeof nodeRewards.$inferInsert;

// ============================================
// Faucet Claims Table
// ============================================

export const faucetClaims = pgTable(
  'faucet_claims',
  {
    id: text('id').primaryKey(),
    address: text('address').notNull(),
    amount: decimal('amount', { precision: 78, scale: 0 }).notNull(),
    transactionHash: text('transaction_hash'),
    ipAddress: text('ip_address'),
    status: text('status').notNull().default('success'), // pending, success, failed
    errorMessage: text('error_message'),
    claimedAt: timestamp('claimed_at').defaultNow().notNull(),
  },
  (table) => ({
    addressIdx: index('faucet_claims_address_idx').on(table.address),
    claimedAtIdx: index('faucet_claims_claimed_at_idx').on(table.claimedAt),
    ipAddressIdx: index('faucet_claims_ip_idx').on(table.ipAddress),
  }),
);

export type FaucetClaim = typeof faucetClaims.$inferSelect;
export type NewFaucetClaim = typeof faucetClaims.$inferInsert;
