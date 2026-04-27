/**
 * Merkle Tree Implementation for Genesis Proofs
 */

import { createHash } from 'crypto';

export interface MerkleTreeResult {
  root: string;
  proofs: Map<string, string[]>;
  leaves: string[];
}

export interface MerkleLeaf {
  address: string;
  amount: string;
}

/**
 * Hash two values together (sorted for consistency)
 */
function hashPair(a: string, b: string): string {
  const sorted = [a, b].sort();
  return createHash('sha256')
    .update(sorted[0] + sorted[1])
    .digest('hex');
}

/**
 * Create a leaf hash from address and amount
 */
export function hashLeaf(address: string, amount: string): string {
  return createHash('sha256')
    .update(address.toLowerCase() + amount)
    .digest('hex');
}

/**
 * Build a Merkle tree from a list of allocations
 */
export function buildMerkleTree(leaves: MerkleLeaf[]): MerkleTreeResult {
  if (leaves.length === 0) {
    return {
      root: '0x' + '0'.repeat(64),
      proofs: new Map(),
      leaves: [],
    };
  }

  // Create leaf hashes
  const leafData = leaves.map((l) => ({
    address: l.address.toLowerCase(),
    hash: hashLeaf(l.address, l.amount),
  }));

  const leafHashes = leafData.map((l) => l.hash);

  // Initialize proofs for each address
  const proofs = new Map<string, string[]>();
  leafData.forEach((l) => proofs.set(l.address, []));

  // Build tree layer by layer
  let currentLayer = [...leafHashes];

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];

    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;

      // Add sibling to proofs
      for (const leaf of leafData) {
        const idx = currentLayer.indexOf(leaf.hash);
        if (idx === i) {
          proofs.get(leaf.address)!.push(right);
        } else if (idx === i + 1) {
          proofs.get(leaf.address)!.push(left);
        }
      }

      nextLayer.push(hashPair(left, right));
    }

    // Update leaf hashes for next iteration (they become internal nodes)
    leafData.forEach((leaf) => {
      const idx = currentLayer.indexOf(leaf.hash);
      if (idx !== -1) {
        leaf.hash = nextLayer[Math.floor(idx / 2)];
      }
    });

    currentLayer = nextLayer;
  }

  return {
    root: '0x' + currentLayer[0],
    proofs,
    leaves: leafHashes,
  };
}

/**
 * Verify a Merkle proof
 */
export function verifyMerkleProof(
  address: string,
  amount: string,
  proof: string[],
  root: string,
): boolean {
  let hash = hashLeaf(address, amount);

  for (const sibling of proof) {
    hash = hashPair(hash, sibling);
  }

  return '0x' + hash === root;
}

/**
 * Generate a compact proof string for on-chain verification
 */
export function encodeProof(proof: string[]): string {
  return '0x' + proof.join('');
}

/**
 * Decode a compact proof string
 */
export function decodeProof(encodedProof: string): string[] {
  const hex = encodedProof.startsWith('0x') ? encodedProof.slice(2) : encodedProof;
  const proofs: string[] = [];

  for (let i = 0; i < hex.length; i += 64) {
    proofs.push(hex.slice(i, i + 64));
  }

  return proofs;
}
