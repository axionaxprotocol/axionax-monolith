/**
 * Genesis Generator Library
 *
 * Core functions for generating mainnet genesis blocks
 * from testnet snapshot data.
 */

export { generateGenesis, type GenesisConfig, type GenesisBlock } from './generator.js';
export { buildMerkleTree, verifyMerkleProof, type MerkleTreeResult } from './merkle.js';
export { calculateAllocations, type AllocationConfig, type Allocation } from './allocations.js';
