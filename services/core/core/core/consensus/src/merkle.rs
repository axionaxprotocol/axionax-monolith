//! Merkle Tree Implementation for PoPC Consensus
//!
//! Provides Merkle tree construction and proof verification for the
//! Proof-of-Probabilistic-Checking (PoPC) consensus mechanism.

use sha3::{Digest, Sha3_256};

/// Merkle tree node hash type (32 bytes)
pub type Hash = [u8; 32];

/// A Merkle proof for verifying a leaf is in the tree
#[derive(Debug, Clone)]
pub struct MerkleProof {
    /// The leaf hash being proven
    pub leaf_hash: Hash,
    /// The index of the leaf in the tree
    pub leaf_index: usize,
    /// Sibling hashes along the path to root
    pub siblings: Vec<Hash>,
    /// Whether each sibling is on the left (true) or right (false)
    pub positions: Vec<bool>,
}

/// Merkle tree for data integrity verification
pub struct MerkleTree {
    /// All nodes in the tree (bottom to top, left to right)
    nodes: Vec<Hash>,
    /// Number of leaves
    leaf_count: usize,
}

impl MerkleTree {
    /// Builds a Merkle tree from leaf data
    pub fn from_leaves(leaves: &[&[u8]]) -> Self {
        if leaves.is_empty() {
            return Self {
                nodes: vec![[0u8; 32]],
                leaf_count: 0,
            };
        }

        // Hash all leaves
        let mut leaf_hashes: Vec<Hash> = leaves.iter().map(|l| hash_data(l)).collect();

        // Pad to power of 2 if necessary
        let leaf_count = leaf_hashes.len();
        let padded_count = leaf_count.next_power_of_two();
        while leaf_hashes.len() < padded_count {
            leaf_hashes.push([0u8; 32]); // Pad with zero hashes
        }

        // Build the tree bottom-up
        let mut nodes = leaf_hashes.clone();
        let mut level = leaf_hashes;

        while level.len() > 1 {
            let mut next_level = Vec::new();
            for chunk in level.chunks(2) {
                let parent = hash_pair(&chunk[0], &chunk[1]);
                next_level.push(parent);
            }
            nodes.extend(next_level.clone());
            level = next_level;
        }

        Self { nodes, leaf_count }
    }

    /// Returns the Merkle root
    pub fn root(&self) -> Hash {
        *self.nodes.last().unwrap_or(&[0u8; 32])
    }

    /// Generates a proof for a leaf at the given index
    pub fn prove(&self, leaf_index: usize) -> Option<MerkleProof> {
        if leaf_index >= self.leaf_count {
            return None;
        }

        let padded_count = self.leaf_count.next_power_of_two();
        let mut siblings = Vec::new();
        let mut positions = Vec::new();
        let mut idx = leaf_index;
        let mut level_start = 0;
        let mut level_size = padded_count;

        while level_size > 1 {
            let sibling_idx = if idx.is_multiple_of(2) {
                idx + 1
            } else {
                idx - 1
            };
            let is_left = !idx.is_multiple_of(2);

            if level_start + sibling_idx < level_start + level_size {
                siblings.push(self.nodes[level_start + sibling_idx]);
            } else {
                siblings.push([0u8; 32]);
            }
            positions.push(is_left);

            level_start += level_size;
            level_size /= 2;
            idx /= 2;
        }

        Some(MerkleProof {
            leaf_hash: self.nodes[leaf_index],
            leaf_index,
            siblings,
            positions,
        })
    }
}

/// Verifies a Merkle proof against an expected root
pub fn verify_merkle_proof(proof: &MerkleProof, expected_root: &Hash) -> bool {
    let mut current = proof.leaf_hash;

    for (sibling, is_left) in proof.siblings.iter().zip(proof.positions.iter()) {
        current = if *is_left {
            hash_pair(sibling, &current)
        } else {
            hash_pair(&current, sibling)
        };
    }

    current == *expected_root
}

/// Verifies multiple proofs (for PoPC sample verification)
pub fn verify_sample_proofs(proofs: &[MerkleProof], expected_root: &Hash) -> bool {
    proofs.iter().all(|p| verify_merkle_proof(p, expected_root))
}

/// Hash data using SHA3-256
pub fn hash_data(data: &[u8]) -> Hash {
    let mut hasher = Sha3_256::new();
    hasher.update(data);
    let result = hasher.finalize();
    let mut output = [0u8; 32];
    output.copy_from_slice(&result);
    output
}

/// Hash two nodes together
pub fn hash_pair(left: &Hash, right: &Hash) -> Hash {
    let mut hasher = Sha3_256::new();
    hasher.update(left);
    hasher.update(right);
    let result = hasher.finalize();
    let mut output = [0u8; 32];
    output.copy_from_slice(&result);
    output
}

/// Serialize multiple proofs for transmission
pub fn serialize_proofs(proofs: &[MerkleProof]) -> Vec<u8> {
    let mut data = Vec::new();

    // Number of proofs (4 bytes)
    data.extend_from_slice(&(proofs.len() as u32).to_le_bytes());

    for proof in proofs {
        // Leaf hash (32 bytes)
        data.extend_from_slice(&proof.leaf_hash);
        // Leaf index (8 bytes)
        data.extend_from_slice(&(proof.leaf_index as u64).to_le_bytes());
        // Number of siblings (4 bytes)
        data.extend_from_slice(&(proof.siblings.len() as u32).to_le_bytes());
        // Siblings (32 bytes each)
        for sibling in &proof.siblings {
            data.extend_from_slice(sibling);
        }
        // Positions (1 byte each, packed)
        for pos in &proof.positions {
            data.push(if *pos { 1 } else { 0 });
        }
    }

    data
}

/// Deserialize proofs from bytes
pub fn deserialize_proofs(data: &[u8]) -> Option<Vec<MerkleProof>> {
    if data.len() < 4 {
        return None;
    }

    let mut offset = 0;
    let num_proofs = u32::from_le_bytes(data[offset..offset + 4].try_into().ok()?) as usize;
    offset += 4;

    if num_proofs > 10_000 {
        return None;
    }

    let mut proofs = Vec::with_capacity(num_proofs);

    for _ in 0..num_proofs {
        if offset + 44 > data.len() {
            return None;
        }

        // Leaf hash
        let mut leaf_hash = [0u8; 32];
        leaf_hash.copy_from_slice(&data[offset..offset + 32]);
        offset += 32;

        // Leaf index
        let leaf_index = u64::from_le_bytes(data[offset..offset + 8].try_into().ok()?) as usize;
        offset += 8;

        // Number of siblings
        let num_siblings = u32::from_le_bytes(data[offset..offset + 4].try_into().ok()?) as usize;
        offset += 4;

        if num_siblings > 64 {
            return None;
        }

        // Siblings
        let mut siblings = Vec::with_capacity(num_siblings);
        for _ in 0..num_siblings {
            if offset + 32 > data.len() {
                return None;
            }
            let mut sibling = [0u8; 32];
            sibling.copy_from_slice(&data[offset..offset + 32]);
            siblings.push(sibling);
            offset += 32;
        }

        // Positions
        if offset + num_siblings > data.len() {
            return None;
        }
        let mut positions = Vec::with_capacity(num_siblings);
        for _ in 0..num_siblings {
            positions.push(data[offset] == 1);
            offset += 1;
        }

        proofs.push(MerkleProof {
            leaf_hash,
            leaf_index,
            siblings,
            positions,
        });
    }

    Some(proofs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_leaf() {
        let leaves = [b"hello".as_slice()];
        let tree = MerkleTree::from_leaves(&leaves);

        let proof = tree.prove(0).unwrap();
        assert!(verify_merkle_proof(&proof, &tree.root()));
    }

    #[test]
    fn test_multiple_leaves() {
        let leaves: Vec<&[u8]> = vec![b"leaf0", b"leaf1", b"leaf2", b"leaf3"];
        let tree = MerkleTree::from_leaves(&leaves);

        for i in 0..4 {
            let proof = tree.prove(i).unwrap();
            assert!(
                verify_merkle_proof(&proof, &tree.root()),
                "Proof {} failed",
                i
            );
        }
    }

    #[test]
    fn test_non_power_of_two_leaves() {
        let leaves: Vec<&[u8]> = vec![b"a", b"b", b"c"];
        let tree = MerkleTree::from_leaves(&leaves);

        for i in 0..3 {
            let proof = tree.prove(i).unwrap();
            assert!(verify_merkle_proof(&proof, &tree.root()));
        }
    }

    #[test]
    fn test_wrong_root_fails() {
        let leaves: Vec<&[u8]> = vec![b"a", b"b", b"c", b"d"];
        let tree = MerkleTree::from_leaves(&leaves);

        let proof = tree.prove(0).unwrap();
        let wrong_root = [1u8; 32];

        assert!(!verify_merkle_proof(&proof, &wrong_root));
    }

    #[test]
    fn test_tampered_proof_fails() {
        let leaves: Vec<&[u8]> = vec![b"a", b"b", b"c", b"d"];
        let tree = MerkleTree::from_leaves(&leaves);

        let mut proof = tree.prove(0).unwrap();
        proof.siblings[0] = [0u8; 32]; // Tamper with sibling

        assert!(!verify_merkle_proof(&proof, &tree.root()));
    }

    #[test]
    fn test_serialization_roundtrip() {
        let leaves: Vec<&[u8]> = vec![b"a", b"b", b"c", b"d"];
        let tree = MerkleTree::from_leaves(&leaves);

        let proofs: Vec<MerkleProof> = (0..4).map(|i| tree.prove(i).unwrap()).collect();

        let serialized = serialize_proofs(&proofs);
        let deserialized = deserialize_proofs(&serialized).unwrap();

        assert_eq!(proofs.len(), deserialized.len());
        for (orig, deser) in proofs.iter().zip(deserialized.iter()) {
            assert_eq!(orig.leaf_hash, deser.leaf_hash);
            assert_eq!(orig.leaf_index, deser.leaf_index);
            assert!(verify_merkle_proof(deser, &tree.root()));
        }
    }

    #[test]
    fn test_verify_sample_proofs() {
        let leaves: Vec<&[u8]> = vec![b"a", b"b", b"c", b"d", b"e", b"f", b"g", b"h"];
        let tree = MerkleTree::from_leaves(&leaves);

        // Sample indices 0, 3, 5
        let proofs: Vec<MerkleProof> = [0, 3, 5].iter().map(|&i| tree.prove(i).unwrap()).collect();

        assert!(verify_sample_proofs(&proofs, &tree.root()));
    }

    #[test]
    fn test_deserialize_proofs_rejects_huge_num_proofs() {
        let mut data = Vec::new();
        data.extend_from_slice(&u32::MAX.to_le_bytes());
        assert!(deserialize_proofs(&data).is_none());
    }
}
