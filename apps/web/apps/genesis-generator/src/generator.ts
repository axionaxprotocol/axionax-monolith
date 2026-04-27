/**
 * Genesis Block Generator
 *
 * Generates Ethereum-compatible genesis.json files for mainnet launch.
 */

import { buildMerkleTree, type MerkleLeaf } from './merkle.js';
import { calculateAllocations, type AllocationConfig, type AddressScore } from './allocations.js';

// ============================================
// Types
// ============================================

export interface GenesisConfig {
  chainId: number;
  homesteadBlock: number;
  eip150Block: number;
  eip155Block: number;
  eip158Block: number;
  byzantiumBlock: number;
  constantinopleBlock: number;
  petersburgBlock: number;
  istanbulBlock: number;
  berlinBlock: number;
  londonBlock: number;
  shanghaiTime?: number;
  clique?: {
    period: number;
    epoch: number;
  };
}

export interface GenesisAlloc {
  [address: string]: {
    balance: string;
    code?: string;
    storage?: Record<string, string>;
    nonce?: string;
  };
}

export interface GenesisBlock {
  config: GenesisConfig;
  difficulty: string;
  gasLimit: string;
  extradata: string;
  alloc: GenesisAlloc;
  coinbase?: string;
  mixHash?: string;
  nonce?: string;
  number?: string;
  parentHash?: string;
  timestamp?: string;
}

export interface GenesisMetadata {
  version: string;
  network: string;
  generatedAt: string;
  testnetSnapshot: {
    block: number;
    timestamp: string;
    merkleRoot: string;
  };
  allocations: {
    total: number;
    totalAmount: string;
    tiers: Record<string, number>;
  };
}

export interface GenerateGenesisOptions {
  // Chain configuration
  chainId: number;
  chainName?: string;

  // Consensus
  consensusType: 'clique' | 'ethash';
  cliqueSigners?: string[];
  cliquePeriod?: number;
  cliqueEpoch?: number;

  // Gas settings
  gasLimit?: string;

  // Testnet snapshot data
  testnetSnapshot: {
    block: number;
    timestamp: Date;
    scores: AddressScore[];
  };

  // Allocation config
  allocationConfig?: AllocationConfig;

  // Pre-fund addresses (team, foundation, etc.)
  preFundAddresses?: Array<{
    address: string;
    balance: string;
    label?: string;
  }>;

  // System contracts to deploy
  systemContracts?: Array<{
    address: string;
    code: string;
    storage?: Record<string, string>;
  }>;
}

// ============================================
// Default Values
// ============================================

const DEFAULT_GAS_LIMIT = '0x1c9c380'; // 30,000,000
const DEFAULT_CLIQUE_PERIOD = 5;
const DEFAULT_CLIQUE_EPOCH = 30000;

// ============================================
// Generator Functions
// ============================================

/**
 * Generate mainnet genesis block from testnet data
 */
export function generateGenesis(options: GenerateGenesisOptions): {
  genesis: GenesisBlock;
  metadata: GenesisMetadata;
  merkleRoot: string;
  proofs: Map<string, string[]>;
} {
  console.log('🔨 Generating genesis block...');

  // Calculate allocations from testnet scores
  const allocationResult = calculateAllocations(
    options.testnetSnapshot.scores,
    options.allocationConfig,
  );

  console.log(`   Eligible addresses: ${allocationResult.allocations.length}`);
  console.log(`   Total allocated: ${allocationResult.totalAllocated.toString()}`);

  // Build Merkle tree for airdrop proofs
  const merkleLeaves: MerkleLeaf[] = allocationResult.allocations.map((a) => ({
    address: a.address,
    amount: a.amount,
  }));

  const merkleTree = buildMerkleTree(merkleLeaves);
  console.log(`   Merkle root: ${merkleTree.root}`);

  // Build alloc section
  const alloc: GenesisAlloc = {};

  // Add airdrop allocations
  for (const allocation of allocationResult.allocations) {
    const address = allocation.address.toLowerCase();
    alloc[address] = {
      balance: '0x' + BigInt(allocation.amount).toString(16),
    };
  }

  // Add pre-fund addresses
  if (options.preFundAddresses) {
    for (const preFund of options.preFundAddresses) {
      const address = preFund.address.toLowerCase();
      const existing = alloc[address];
      const existingBalance = existing ? BigInt(existing.balance) : BigInt(0);
      const newBalance = existingBalance + BigInt(preFund.balance);

      alloc[address] = {
        ...existing,
        balance: '0x' + newBalance.toString(16),
      };
    }
  }

  // Add system contracts
  if (options.systemContracts) {
    for (const contract of options.systemContracts) {
      const address = contract.address.toLowerCase();
      alloc[address] = {
        ...alloc[address],
        balance: alloc[address]?.balance || '0x0',
        code: contract.code,
        storage: contract.storage,
      };
    }
  }

  // Build chain config
  const config: GenesisConfig = {
    chainId: options.chainId,
    homesteadBlock: 0,
    eip150Block: 0,
    eip155Block: 0,
    eip158Block: 0,
    byzantiumBlock: 0,
    constantinopleBlock: 0,
    petersburgBlock: 0,
    istanbulBlock: 0,
    berlinBlock: 0,
    londonBlock: 0,
  };

  // Add Clique config if using PoA
  if (options.consensusType === 'clique' && options.cliqueSigners) {
    config.clique = {
      period: options.cliquePeriod ?? DEFAULT_CLIQUE_PERIOD,
      epoch: options.cliqueEpoch ?? DEFAULT_CLIQUE_EPOCH,
    };
  }

  // Build extradata for Clique
  let extradata = '0x' + '00'.repeat(32); // 32 bytes vanity

  if (options.consensusType === 'clique' && options.cliqueSigners) {
    // Add signer addresses (20 bytes each)
    for (const signer of options.cliqueSigners) {
      extradata += signer.toLowerCase().replace('0x', '');
    }
    // Add 65 bytes for signature
    extradata += '00'.repeat(65);
  }

  // Build genesis block
  const genesis: GenesisBlock = {
    config,
    difficulty: options.consensusType === 'clique' ? '0x1' : '0x400000',
    gasLimit: options.gasLimit ?? DEFAULT_GAS_LIMIT,
    extradata,
    alloc,
    coinbase: '0x0000000000000000000000000000000000000000',
    mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    nonce: '0x0000000000000000',
    number: '0x0',
    parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
  };

  // Build metadata
  const metadata: GenesisMetadata = {
    version: '1.0.0',
    network: options.chainName ?? `axionax-${options.chainId}`,
    generatedAt: new Date().toISOString(),
    testnetSnapshot: {
      block: options.testnetSnapshot.block,
      timestamp: options.testnetSnapshot.timestamp.toISOString(),
      merkleRoot: merkleTree.root,
    },
    allocations: {
      total: allocationResult.allocations.length,
      totalAmount: allocationResult.totalAllocated.toString(),
      tiers: allocationResult.tierCounts,
    },
  };

  console.log('✅ Genesis block generated!');

  return {
    genesis,
    metadata,
    merkleRoot: merkleTree.root,
    proofs: merkleTree.proofs,
  };
}

/**
 * Validate a genesis block structure
 */
export function validateGenesis(genesis: GenesisBlock): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!genesis.config) errors.push('Missing config');
  if (!genesis.config?.chainId) errors.push('Missing chainId');
  if (!genesis.difficulty) errors.push('Missing difficulty');
  if (!genesis.gasLimit) errors.push('Missing gasLimit');
  if (!genesis.extradata) errors.push('Missing extradata');
  if (!genesis.alloc) errors.push('Missing alloc');

  // Validate chainId
  if (genesis.config?.chainId && genesis.config.chainId <= 0) {
    errors.push('Invalid chainId');
  }

  // Validate addresses in alloc
  for (const [address, data] of Object.entries(genesis.alloc || {})) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address) && !/^[a-fA-F0-9]{40}$/.test(address)) {
      errors.push(`Invalid address format: ${address}`);
    }
    if (!data.balance) {
      errors.push(`Missing balance for ${address}`);
    }
  }

  // Validate Clique extradata if configured
  if (genesis.config?.clique) {
    const extradata = genesis.extradata || '';
    // Minimum: 32 bytes vanity + 65 bytes seal = 97 bytes = 194 hex chars + 0x prefix
    if (extradata.length < 196) {
      errors.push('Clique extradata too short');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export genesis to JSON string
 */
export function exportGenesisJSON(genesis: GenesisBlock, pretty: boolean = true): string {
  return JSON.stringify(genesis, null, pretty ? 2 : undefined);
}
