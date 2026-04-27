/**
 * Snapshot Generator Service
 *
 * Generates snapshots of testnet state for mainnet genesis block.
 * Includes Merkle tree generation for airdrop proofs.
 */

import { db } from '../db/index.js';
import { addressActivitySummary, genesisSnapshots, blocks, indexerState } from '../db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';
import { createHash } from 'crypto';

// ============================================
// Types
// ============================================

export interface GenesisAllocation {
  address: string;
  amount: string;
  tier: number;
  score: string;
  proof: string[];
}

export interface GenesisSnapshotData {
  id: string;
  snapshotBlock: number;
  snapshotTimestamp: Date;
  chainId: number;
  totalAddresses: number;
  eligibleAddresses: number;
  totalAirdropAmount: string;
  merkleRoot: string;
  allocations: GenesisAllocation[];
  metadata: {
    generatedAt: string;
    version: string;
    network: string;
    criteria: {
      minScore: number;
      tiers: Record<string, { minScore: number; percentage: number }>;
    };
  };
}

// ============================================
// Merkle Tree Implementation
// ============================================

function hashPair(a: string, b: string): string {
  const sorted = [a, b].sort();
  return createHash('sha256')
    .update(sorted[0] + sorted[1])
    .digest('hex');
}

function hashLeaf(address: string, amount: string): string {
  return createHash('sha256')
    .update(address.toLowerCase() + amount)
    .digest('hex');
}

interface MerkleTreeResult {
  root: string;
  proofs: Map<string, string[]>;
}

function buildMerkleTree(leaves: { address: string; amount: string }[]): MerkleTreeResult {
  if (leaves.length === 0) {
    return { root: '0x' + '0'.repeat(64), proofs: new Map() };
  }

  // Create leaf hashes
  const leafHashes = leaves.map((l) => ({
    address: l.address.toLowerCase(),
    hash: hashLeaf(l.address, l.amount),
  }));

  // Store proofs for each leaf
  const proofs = new Map<string, string[]>();
  leafHashes.forEach((l) => proofs.set(l.address, []));

  // Build tree layer by layer
  let currentLayer = leafHashes.map((l) => l.hash);
  const _previousLayer = leafHashes;

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];

    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1] || currentLayer[i]; // Duplicate last if odd

      const parent = hashPair(left, right);
      nextLayer.push(parent);

      // Update proofs
      for (const leaf of leafHashes) {
        const proofArray = proofs.get(leaf.address)!;
        const leafIndex = currentLayer.indexOf(leaf.hash);

        if (leafIndex !== -1) {
          const siblingIndex = leafIndex % 2 === 0 ? leafIndex + 1 : leafIndex - 1;
          if (siblingIndex < currentLayer.length) {
            proofArray.push(currentLayer[siblingIndex]);
          }
        }
      }
    }

    currentLayer = nextLayer;
  }

  return {
    root: '0x' + currentLayer[0],
    proofs,
  };
}

function verifyProof(address: string, amount: string, proof: string[], root: string): boolean {
  let hash = hashLeaf(address, amount);

  for (const sibling of proof) {
    hash = hashPair(hash, sibling);
  }

  return '0x' + hash === root;
}

// ============================================
// Snapshot Generation
// ============================================

export async function generateSnapshot(snapshotBlockNumber?: number): Promise<GenesisSnapshotData> {
  console.log('📸 Generating genesis snapshot...');

  // Determine snapshot block
  let snapshotBlock: number;
  let snapshotTimestamp: Date;

  if (snapshotBlockNumber !== undefined) {
    const [block] = await db.select().from(blocks).where(eq(blocks.number, snapshotBlockNumber));
    if (!block) {
      throw new Error(`Block ${snapshotBlockNumber} not found in database`);
    }
    snapshotBlock = block.number;
    snapshotTimestamp = block.timestamp;
  } else {
    // Use latest indexed block
    const [state] = await db.select().from(indexerState).where(eq(indexerState.id, 'default'));
    if (!state || !state.lastIndexedBlock) {
      throw new Error('No blocks indexed yet');
    }
    snapshotBlock = state.lastIndexedBlock;

    const [latestBlock] = await db.select().from(blocks).where(eq(blocks.number, snapshotBlock));
    snapshotTimestamp = latestBlock?.timestamp ?? new Date();
  }

  console.log(`  Snapshot block: ${snapshotBlock}`);
  console.log(`  Snapshot time: ${snapshotTimestamp.toISOString()}`);

  // Get all eligible addresses
  const eligibleAddresses = await db
    .select()
    .from(addressActivitySummary)
    .where(eq(addressActivitySummary.airdropEligible, true))
    .orderBy(desc(addressActivitySummary.activityScore));

  console.log(`  Eligible addresses: ${eligibleAddresses.length}`);

  // Prepare leaves for Merkle tree
  const leaves = eligibleAddresses.map((addr) => ({
    address: addr.address,
    amount: addr.airdropAmount,
  }));

  // Build Merkle tree
  console.log('  Building Merkle tree...');
  const { root: merkleRoot, proofs } = buildMerkleTree(leaves);
  console.log(`  Merkle root: ${merkleRoot}`);

  // Calculate total airdrop
  const totalAirdrop = eligibleAddresses.reduce(
    (sum, addr) => sum + BigInt(addr.airdropAmount),
    BigInt(0),
  );

  // Get total address count
  const [totalAddressCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(addressActivitySummary);

  // Build allocations with proofs
  const allocations: GenesisAllocation[] = eligibleAddresses.map((addr) => ({
    address: addr.address,
    amount: addr.airdropAmount,
    tier: addr.airdropTier,
    score: addr.activityScore,
    proof: proofs.get(addr.address.toLowerCase()) || [],
  }));

  // Generate snapshot ID
  const snapshotId = `genesis-${snapshotBlock}-${Date.now()}`;

  // Build snapshot data
  const snapshotData: GenesisSnapshotData = {
    id: snapshotId,
    snapshotBlock,
    snapshotTimestamp,
    chainId: parseInt(process.env.CHAIN_ID || '86137'),
    totalAddresses: totalAddressCount?.count ?? 0,
    eligibleAddresses: eligibleAddresses.length,
    totalAirdropAmount: totalAirdrop.toString(),
    merkleRoot,
    allocations,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      network: 'axionax-testnet',
      criteria: {
        minScore: 100,
        tiers: {
          bronze: { minScore: 100, percentage: 0.001 },
          silver: { minScore: 500, percentage: 0.005 },
          gold: { minScore: 1000, percentage: 0.01 },
          platinum: { minScore: 5000, percentage: 0.05 },
        },
      },
    },
  };

  // Save to database
  await db.insert(genesisSnapshots).values({
    id: snapshotId,
    snapshotBlock,
    snapshotTimestamp,
    totalAddresses: totalAddressCount?.count ?? 0,
    eligibleAddresses: eligibleAddresses.length,
    totalAirdropAmount: totalAirdrop.toString(),
    merkleRoot,
    allocations: allocations,
    metadata: snapshotData.metadata,
    isFinalized: false,
  });

  console.log('✅ Snapshot generated successfully!');
  console.log(`   ID: ${snapshotId}`);
  console.log(`   Total airdrop: ${totalAirdrop.toString()} wei`);

  return snapshotData;
}

// ============================================
// Genesis Config Generation
// ============================================

export interface GenesisConfig {
  chainId: string;
  homesteadBlock: string;
  eip150Block: string;
  eip155Block: string;
  eip158Block: string;
  byzantiumBlock: string;
  constantinopleBlock: string;
  petersburgBlock: string;
  istanbulBlock: string;
  berlinBlock: string;
  londonBlock: string;
  clique?: {
    period: number;
    epoch: number;
  };
}

export interface GenesisBlock {
  config: GenesisConfig;
  difficulty: string;
  gasLimit: string;
  extradata: string;
  alloc: Record<string, { balance: string }>;
  testnetData?: {
    merkleRoot: string;
    snapshotBlock: number;
    eligibleAddresses: number;
    totalAirdrop: string;
  };
}

export async function generateGenesisConfig(snapshotId: string): Promise<GenesisBlock> {
  console.log(`📜 Generating genesis config from snapshot: ${snapshotId}`);

  // Get snapshot
  const [snapshot] = await db
    .select()
    .from(genesisSnapshots)
    .where(eq(genesisSnapshots.id, snapshotId));

  if (!snapshot) {
    throw new Error(`Snapshot ${snapshotId} not found`);
  }

  // Build alloc from allocations
  const alloc: Record<string, { balance: string }> = {};
  const allocations = snapshot.allocations as GenesisAllocation[];

  for (const allocation of allocations) {
    // Convert to hex balance (wei)
    const balanceHex = '0x' + BigInt(allocation.amount).toString(16);
    alloc[allocation.address] = { balance: balanceHex };
  }

  // Mainnet chain config (different from testnet)
  const mainnetChainId = 86150; // Match axionax-core-universe mainnet chain ID

  const genesis: GenesisBlock = {
    config: {
      chainId: mainnetChainId.toString(),
      homesteadBlock: '0',
      eip150Block: '0',
      eip155Block: '0',
      eip158Block: '0',
      byzantiumBlock: '0',
      constantinopleBlock: '0',
      petersburgBlock: '0',
      istanbulBlock: '0',
      berlinBlock: '0',
      londonBlock: '0',
    },
    difficulty: '0x1',
    gasLimit: '0x1c9c380', // 30M gas
    extradata: '0x' + '00'.repeat(32) + '00'.repeat(20) + '00'.repeat(65), // Clique extradata placeholder
    alloc,
    testnetData: {
      merkleRoot: snapshot.merkleRoot,
      snapshotBlock: snapshot.snapshotBlock,
      eligibleAddresses: snapshot.eligibleAddresses,
      totalAirdrop: snapshot.totalAirdropAmount,
    },
  };

  console.log('✅ Genesis config generated!');
  console.log(`   Chain ID: ${mainnetChainId}`);
  console.log(`   Allocations: ${Object.keys(alloc).length}`);

  return genesis;
}

// ============================================
// Finalization
// ============================================

export async function finalizeSnapshot(snapshotId: string): Promise<void> {
  console.log(`🔒 Finalizing snapshot: ${snapshotId}`);

  await db
    .update(genesisSnapshots)
    .set({
      isFinalized: true,
      finalizedAt: new Date(),
    })
    .where(eq(genesisSnapshots.id, snapshotId));

  console.log('✅ Snapshot finalized!');
}

// ============================================
// Query Functions
// ============================================

export async function getSnapshot(snapshotId: string) {
  const [snapshot] = await db
    .select()
    .from(genesisSnapshots)
    .where(eq(genesisSnapshots.id, snapshotId));
  return snapshot;
}

export async function getLatestSnapshot() {
  const [snapshot] = await db
    .select()
    .from(genesisSnapshots)
    .orderBy(desc(genesisSnapshots.createdAt))
    .limit(1);
  return snapshot;
}

export async function getAllSnapshots() {
  return db
    .select({
      id: genesisSnapshots.id,
      snapshotBlock: genesisSnapshots.snapshotBlock,
      snapshotTimestamp: genesisSnapshots.snapshotTimestamp,
      totalAddresses: genesisSnapshots.totalAddresses,
      eligibleAddresses: genesisSnapshots.eligibleAddresses,
      totalAirdropAmount: genesisSnapshots.totalAirdropAmount,
      merkleRoot: genesisSnapshots.merkleRoot,
      isFinalized: genesisSnapshots.isFinalized,
      finalizedAt: genesisSnapshots.finalizedAt,
      createdAt: genesisSnapshots.createdAt,
    })
    .from(genesisSnapshots)
    .orderBy(desc(genesisSnapshots.createdAt));
}

export { verifyProof };
