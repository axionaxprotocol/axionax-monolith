/**
 * Blockchain Indexer Service
 *
 * Indexes all testnet transactions, events, and state changes
 * for genesis block generation.
 */

import {
  createPublicClient,
  http,
  type Block as ViemBlock,
  type Transaction as ViemTransaction,
  parseAbiItem,
  type Log,
} from 'viem';
import { db } from '../db/index.js';
import {
  blocks,
  transactions,
  addresses,
  tokenTransfers,
  indexerState,
  type NewBlock,
  type NewTransaction,
  type NewAddress,
  type NewTokenTransfer,
} from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

// ============================================
// Configuration
// ============================================

const config = {
  rpcUrl: process.env.RPC_URL || 'https://axionax.org/rpc/',
  chainId: parseInt(process.env.CHAIN_ID || '86137'),
  startBlock: parseInt(process.env.INDEXER_START_BLOCK || '0'),
  batchSize: parseInt(process.env.INDEXER_BATCH_SIZE || '100'),
  pollInterval: parseInt(process.env.INDEXER_POLL_INTERVAL || '5000'),
};

// Define Axionax Testnet chain
const axionaxTestnet = {
  id: config.chainId,
  name: 'Axionax Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'AXX',
    symbol: 'AXX',
  },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
  },
} as const;

// Create viem client
const client = createPublicClient({
  chain: axionaxTestnet,
  transport: http(config.rpcUrl),
});

// ERC20 Transfer event signature (reserved for token transfer indexing)
const _TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

// Known contract addresses (will be populated from config)
const KNOWN_CONTRACTS = {
  axxToken: process.env.AXX_TOKEN_ADDRESS || '0x0000000000000000000000000000000000001000',
  staking: process.env.STAKING_ADDRESS,
  governance: process.env.GOVERNANCE_ADDRESS,
};

// ============================================
// Indexer State Management
// ============================================

async function getIndexerState() {
  const [state] = await db.select().from(indexerState).where(eq(indexerState.id, 'default'));
  return state;
}

async function updateIndexerState(updates: Partial<typeof indexerState.$inferInsert>) {
  await db
    .insert(indexerState)
    .values({ id: 'default', ...updates, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: indexerState.id,
      set: { ...updates, updatedAt: new Date() },
    });
}

// ============================================
// Block Processing
// ============================================

async function processBlock(blockNumber: bigint): Promise<void> {
  console.log(`📦 Processing block ${blockNumber}...`);

  // Fetch block with transactions
  const block = await client.getBlock({
    blockNumber,
    includeTransactions: true,
  });

  if (!block) {
    console.warn(`Block ${blockNumber} not found`);
    return;
  }

  // Insert block
  const newBlock: NewBlock = {
    number: Number(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: new Date(Number(block.timestamp) * 1000),
    transactionCount: block.transactions.length,
    gasUsed: Number(block.gasUsed),
    gasLimit: Number(block.gasLimit),
    baseFeePerGas: block.baseFeePerGas ? Number(block.baseFeePerGas) : null,
    miner: block.miner,
    extraData: block.extraData,
  };

  await db.insert(blocks).values(newBlock).onConflictDoNothing();

  // Process transactions
  for (const tx of block.transactions) {
    if (typeof tx === 'string') continue; // Skip if only hash

    await processTransaction(tx, block);
  }

  // Fetch and process logs (token transfers, staking events, etc.)
  await processBlockLogs(blockNumber);
}

// ============================================
// Transaction Processing
// ============================================

async function processTransaction(tx: ViemTransaction, block: ViemBlock): Promise<void> {
  // Get transaction receipt for gas used and status
  const receipt = await client.getTransactionReceipt({ hash: tx.hash });

  // Determine transaction type
  const txType = classifyTransaction(tx);

  // Insert transaction
  const newTx: NewTransaction = {
    hash: tx.hash,
    blockNumber: Number(block.number),
    blockHash: block.hash ?? '',
    transactionIndex: tx.transactionIndex ?? 0,
    from: tx.from,
    to: tx.to ?? '',
    value: tx.value.toString(),
    gasPrice: tx.gasPrice ? Number(tx.gasPrice) : null,
    gasLimit: Number(tx.gas),
    gasUsed: receipt ? Number(receipt.gasUsed) : null,
    nonce: tx.nonce,
    input: tx.input,
    status: receipt?.status === 'success' ? 'confirmed' : 'failed',
    type: txType,
    timestamp: new Date(Number(block.timestamp) * 1000),
  };

  await db.insert(transactions).values(newTx).onConflictDoNothing();

  // Update address records
  await updateAddressRecord(
    tx.from,
    Number(block.number),
    new Date(Number(block.timestamp) * 1000),
    'sent',
    tx.value,
  );

  if (tx.to) {
    await updateAddressRecord(
      tx.to,
      Number(block.number),
      new Date(Number(block.timestamp) * 1000),
      'received',
      tx.value,
    );
  }
}

function classifyTransaction(
  tx: ViemTransaction,
):
  | 'transfer'
  | 'token_transfer'
  | 'contract_deploy'
  | 'contract_call'
  | 'staking'
  | 'governance'
  | 'other' {
  // Contract deployment (no 'to' address)
  if (!tx.to) {
    return 'contract_deploy';
  }

  // Check for known contract interactions
  const toLower = tx.to.toLowerCase();

  if (toLower === KNOWN_CONTRACTS.staking?.toLowerCase()) {
    return 'staking';
  }

  if (toLower === KNOWN_CONTRACTS.governance?.toLowerCase()) {
    return 'governance';
  }

  if (toLower === KNOWN_CONTRACTS.axxToken?.toLowerCase()) {
    return 'token_transfer';
  }

  // Simple transfer (no input data or just '0x')
  if (!tx.input || tx.input === '0x') {
    return 'transfer';
  }

  // Contract call
  return 'contract_call';
}

// ============================================
// Address Record Management
// ============================================

async function updateAddressRecord(
  address: string,
  blockNumber: number,
  timestamp: Date,
  direction: 'sent' | 'received',
  value: bigint,
): Promise<void> {
  const existing = await db
    .select()
    .from(addresses)
    .where(eq(addresses.address, address.toLowerCase()));

  if (existing.length === 0) {
    // Create new address record
    const newAddress: NewAddress = {
      address: address.toLowerCase(),
      firstSeenBlock: blockNumber,
      firstSeenAt: timestamp,
      lastSeenBlock: blockNumber,
      lastSeenAt: timestamp,
      transactionCount: 1,
      sentCount: direction === 'sent' ? 1 : 0,
      receivedCount: direction === 'received' ? 1 : 0,
      totalSent: direction === 'sent' ? value.toString() : '0',
      totalReceived: direction === 'received' ? value.toString() : '0',
      isContract: false, // Will be updated later if needed
    };

    await db.insert(addresses).values(newAddress).onConflictDoNothing();
  } else {
    // Update existing record
    const updates = {
      lastSeenBlock: blockNumber,
      lastSeenAt: timestamp,
      transactionCount: sql`${addresses.transactionCount} + 1`,
      updatedAt: new Date(),
    };

    if (direction === 'sent') {
      await db
        .update(addresses)
        .set({
          ...updates,
          sentCount: sql`${addresses.sentCount} + 1`,
          totalSent: sql`${addresses.totalSent}::numeric + ${value.toString()}::numeric`,
        })
        .where(eq(addresses.address, address.toLowerCase()));
    } else {
      await db
        .update(addresses)
        .set({
          ...updates,
          receivedCount: sql`${addresses.receivedCount} + 1`,
          totalReceived: sql`${addresses.totalReceived}::numeric + ${value.toString()}::numeric`,
        })
        .where(eq(addresses.address, address.toLowerCase()));
    }
  }
}

// ============================================
// Event Log Processing
// ============================================

async function processBlockLogs(blockNumber: bigint): Promise<void> {
  try {
    // Get all logs for this block
    const logs = await client.getLogs({
      fromBlock: blockNumber,
      toBlock: blockNumber,
    });

    for (const log of logs) {
      await processLog(log);
    }
  } catch (error) {
    console.warn(`Error fetching logs for block ${blockNumber}:`, error);
  }
}

async function processLog(log: Log): Promise<void> {
  // Check if it's a Transfer event (ERC20)
  if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
    await processTransferEvent(log);
  }

  // Add more event handlers as needed (staking, governance, etc.)
}

async function processTransferEvent(log: Log): Promise<void> {
  if (!log.topics[1] || !log.topics[2] || !log.data) return;

  const from = `0x${log.topics[1].slice(26)}`;
  const to = `0x${log.topics[2].slice(26)}`;
  const value = BigInt(log.data);

  const block = await client.getBlock({ blockNumber: log.blockNumber! });

  const transfer: NewTokenTransfer = {
    id: `${log.transactionHash}-${log.logIndex}`,
    transactionHash: log.transactionHash!,
    blockNumber: Number(log.blockNumber),
    logIndex: log.logIndex!,
    tokenAddress: log.address,
    from,
    to,
    value: value.toString(),
    timestamp: new Date(Number(block.timestamp) * 1000),
  };

  await db.insert(tokenTransfers).values(transfer).onConflictDoNothing();
}

// ============================================
// Main Indexer Loop
// ============================================

let isRunning = false;

export async function startIndexer(): Promise<void> {
  if (isRunning) {
    console.log('Indexer is already running');
    return;
  }

  isRunning = true;
  console.log('🚀 Starting Testnet Indexer...');
  console.log(`📡 RPC URL: ${config.rpcUrl}`);
  console.log(`⛓️  Chain ID: ${config.chainId}`);

  await updateIndexerState({ isRunning: true, status: 'running' });

  try {
    while (isRunning) {
      await indexNewBlocks();
      await new Promise((resolve) => setTimeout(resolve, config.pollInterval));
    }
  } catch (error) {
    console.error('Indexer error:', error);
    await updateIndexerState({
      isRunning: false,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function stopIndexer(): Promise<void> {
  console.log('🛑 Stopping Indexer...');
  isRunning = false;
  await updateIndexerState({ isRunning: false, status: 'stopped' });
}

async function indexNewBlocks(): Promise<void> {
  // Get current indexer state
  const state = await getIndexerState();
  const lastIndexed = state?.lastIndexedBlock ?? config.startBlock - 1;

  // Get latest block from chain
  const latestBlock = await client.getBlockNumber();

  if (BigInt(lastIndexed) >= latestBlock) {
    // Already up to date
    return;
  }

  // Calculate range to index
  const fromBlock = BigInt(lastIndexed + 1);
  const toBlock = BigInt(Math.min(lastIndexed + config.batchSize, Number(latestBlock)));

  console.log(`📥 Indexing blocks ${fromBlock} to ${toBlock} (latest: ${latestBlock})`);

  // Process blocks in batch
  for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
    await processBlock(blockNum);
  }

  // Update state
  await updateIndexerState({
    lastIndexedBlock: Number(toBlock),
    lastIndexedAt: new Date(),
    status: 'running',
  });
}

// ============================================
// Statistics & Queries
// ============================================

export async function getIndexerStats() {
  const state = await getIndexerState();

  const [blockCount] = await db.select({ count: sql<number>`count(*)` }).from(blocks);
  const [txCount] = await db.select({ count: sql<number>`count(*)` }).from(transactions);
  const [addressCount] = await db.select({ count: sql<number>`count(*)` }).from(addresses);
  const [transferCount] = await db.select({ count: sql<number>`count(*)` }).from(tokenTransfers);

  return {
    lastIndexedBlock: state?.lastIndexedBlock ?? 0,
    lastIndexedAt: state?.lastIndexedAt,
    isRunning: state?.isRunning ?? false,
    status: state?.status ?? 'idle',
    stats: {
      blocks: blockCount?.count ?? 0,
      transactions: txCount?.count ?? 0,
      addresses: addressCount?.count ?? 0,
      tokenTransfers: transferCount?.count ?? 0,
    },
  };
}

export async function getTopAddresses(limit = 100) {
  return db
    .select()
    .from(addresses)
    .orderBy(sql`${addresses.transactionCount} DESC`)
    .limit(limit);
}
