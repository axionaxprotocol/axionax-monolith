/**
 * Explorer Service - Real Blockchain Data
 *
 * Fetches real block and transaction data from RPC nodes
 */

import { createPublicClient, http, formatEther, type Block } from 'viem';

// ============================================
// Configuration
// ============================================

const RPC_URLS = {
  eu: process.env.RPC_URL_EU || 'http://217.76.61.116:8545',
  au: process.env.RPC_URL_AU || 'http://46.250.244.4:8545',
};

const config = {
  rpcUrl: process.env.RPC_URL || RPC_URLS.eu,
  chainId: parseInt(process.env.CHAIN_ID || '86137'),
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

// Create public client
const publicClient = createPublicClient({
  chain: axionaxTestnet,
  transport: http(config.rpcUrl),
});

// Create clients for each validator
const euClient = createPublicClient({
  chain: axionaxTestnet,
  transport: http(RPC_URLS.eu),
});

const auClient = createPublicClient({
  chain: axionaxTestnet,
  transport: http(RPC_URLS.au),
});

// ============================================
// Types
// ============================================

export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gas: string;
  gasUsed: string;
  validator: string;
  size: number;
}

export interface BlocksResponse {
  blocks: BlockInfo[];
  total: number;
  page: number;
  pageSize: number;
  latestBlock: number;
}

export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  timestamp: number;
}

export interface TransactionsResponse {
  transactions: TransactionInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NetworkStats {
  latestBlock: number;
  totalTransactions: number;
  validators: {
    eu: { blockHeight: number; status: string; latency: number };
    au: { blockHeight: number; status: string; latency: number };
  };
  chainId: number;
  gasPrice: string;
}

// ============================================
// Helper Functions
// ============================================

function determineValidator(blockNumber: number): string {
  // Simple round-robin logic for demo
  // In reality, this would be based on block miner/validator field
  return blockNumber % 2 === 0 ? 'EU' : 'AU';
}

async function checkValidatorStatus(
  client: typeof publicClient,
  _name: string,
): Promise<{
  blockHeight: number;
  status: string;
  latency: number;
}> {
  const start = Date.now();
  try {
    const blockNumber = await client.getBlockNumber();
    return {
      blockHeight: Number(blockNumber),
      status: 'online',
      latency: Date.now() - start,
    };
  } catch {
    return {
      blockHeight: 0,
      status: 'offline',
      latency: Date.now() - start,
    };
  }
}

// ============================================
// Service Functions
// ============================================

/**
 * Get recent blocks from the blockchain
 */
export async function getBlocks(page: number = 1, pageSize: number = 10): Promise<BlocksResponse> {
  try {
    const latestBlockNumber = await publicClient.getBlockNumber();
    const latestBlock = Number(latestBlockNumber);

    // Calculate block range for pagination
    const startBlock = latestBlock - (page - 1) * pageSize;
    const endBlock = Math.max(startBlock - pageSize + 1, 0);

    const blocks: BlockInfo[] = [];

    // Fetch blocks in parallel (limit to prevent overload)
    const blockPromises = [];
    for (let i = startBlock; i >= endBlock && i >= 0; i--) {
      blockPromises.push(
        publicClient
          .getBlock({ blockNumber: BigInt(i) })
          .then((block): BlockInfo | null => ({
            number: Number(block.number),
            hash: block.hash || '0x0',
            timestamp: Number(block.timestamp),
            txCount: block.transactions.length,
            gas: block.gasLimit.toString(),
            gasUsed: block.gasUsed.toString(),
            validator: determineValidator(Number(block.number)),
            size: Number(block.size || 0),
          }))
          .catch(() => null),
      );
    }

    const results = await Promise.all(blockPromises);
    blocks.push(...results.filter((b): b is BlockInfo => b !== null));

    return {
      blocks,
      total: latestBlock,
      page,
      pageSize,
      latestBlock,
    };
  } catch (error) {
    console.error('Failed to fetch blocks:', error);
    // Return empty response on error
    return {
      blocks: [],
      total: 0,
      page,
      pageSize,
      latestBlock: 0,
    };
  }
}

/**
 * Get a single block by number or hash
 */
export async function getBlock(blockId: string | number): Promise<BlockInfo | null> {
  try {
    let block: Block;

    if (typeof blockId === 'number' || /^\d+$/.test(blockId.toString())) {
      block = await publicClient.getBlock({
        blockNumber: BigInt(blockId),
      });
    } else {
      block = await publicClient.getBlock({
        blockHash: blockId as `0x${string}`,
      });
    }

    return {
      number: Number(block.number),
      hash: block.hash || '0x0',
      timestamp: Number(block.timestamp),
      txCount: block.transactions.length,
      gas: block.gasLimit.toString(),
      gasUsed: block.gasUsed.toString(),
      validator: determineValidator(Number(block.number)),
      size: Number(block.size || 0),
    };
  } catch (error) {
    console.error('Failed to fetch block:', error);
    return null;
  }
}

/**
 * Get transactions from recent blocks
 */
export async function getTransactions(
  page: number = 1,
  pageSize: number = 20,
): Promise<TransactionsResponse> {
  try {
    const latestBlockNumber = await publicClient.getBlockNumber();
    const transactions: TransactionInfo[] = [];
    let blocksChecked = 0;
    let currentBlock = Number(latestBlockNumber);

    // Fetch transactions from recent blocks until we have enough
    while (transactions.length < pageSize * page && blocksChecked < 50 && currentBlock >= 0) {
      try {
        const block = await publicClient.getBlock({
          blockNumber: BigInt(currentBlock),
          includeTransactions: true,
        });

        for (const tx of block.transactions) {
          if (typeof tx === 'object') {
            transactions.push({
              hash: tx.hash,
              blockNumber: Number(block.number),
              from: tx.from,
              to: tx.to,
              value: formatEther(tx.value),
              gas: tx.gas.toString(),
              timestamp: Number(block.timestamp),
            });
          }
        }
      } catch {
        // Skip blocks that fail to fetch
      }

      currentBlock--;
      blocksChecked++;
    }

    // Paginate results
    const startIndex = (page - 1) * pageSize;
    const paginatedTxs = transactions.slice(startIndex, startIndex + pageSize);

    return {
      transactions: paginatedTxs,
      total: transactions.length,
      page,
      pageSize,
    };
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return {
      transactions: [],
      total: 0,
      page,
      pageSize,
    };
  }
}

/**
 * Get transaction by hash
 */
export async function getTransaction(txHash: string): Promise<TransactionInfo | null> {
  try {
    const tx = await publicClient.getTransaction({
      hash: txHash as `0x${string}`,
    });

    const block = await publicClient.getBlock({
      blockNumber: tx.blockNumber!,
    });

    return {
      hash: tx.hash,
      blockNumber: Number(tx.blockNumber),
      from: tx.from,
      to: tx.to,
      value: formatEther(tx.value),
      gas: tx.gas.toString(),
      timestamp: Number(block.timestamp),
    };
  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    return null;
  }
}

/**
 * Get network statistics
 */
export async function getNetworkStats(): Promise<NetworkStats> {
  try {
    const [latestBlock, gasPrice, euStatus, auStatus] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getGasPrice().catch(() => BigInt(0)),
      checkValidatorStatus(euClient, 'EU'),
      checkValidatorStatus(auClient, 'AU'),
    ]);

    return {
      latestBlock: Number(latestBlock),
      totalTransactions: 0, // Would need indexer for accurate count
      validators: {
        eu: euStatus,
        au: auStatus,
      },
      chainId: config.chainId,
      gasPrice: formatEther(gasPrice),
    };
  } catch (error) {
    console.error('Failed to fetch network stats:', error);
    return {
      latestBlock: 0,
      totalTransactions: 0,
      validators: {
        eu: { blockHeight: 0, status: 'offline', latency: 0 },
        au: { blockHeight: 0, status: 'offline', latency: 0 },
      },
      chainId: config.chainId,
      gasPrice: '0',
    };
  }
}

/**
 * Search for address, transaction, or block
 */
export async function search(query: string): Promise<{
  type: 'address' | 'transaction' | 'block' | 'not_found';
  result: unknown;
}> {
  // Check if it's a block number
  if (/^\d+$/.test(query)) {
    const block = await getBlock(parseInt(query));
    if (block) {
      return { type: 'block', result: block };
    }
  }

  // Check if it's a transaction hash
  if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
    const tx = await getTransaction(query);
    if (tx) {
      return { type: 'transaction', result: tx };
    }

    // Could also be a block hash
    const block = await getBlock(query);
    if (block) {
      return { type: 'block', result: block };
    }
  }

  // Check if it's an address
  if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
    try {
      const balance = await publicClient.getBalance({
        address: query as `0x${string}`,
      });
      return {
        type: 'address',
        result: {
          address: query,
          balance: formatEther(balance),
          transactionCount: await publicClient.getTransactionCount({
            address: query as `0x${string}`,
          }),
        },
      };
    } catch {
      // Address doesn't exist or error
    }
  }

  return { type: 'not_found', result: null };
}
