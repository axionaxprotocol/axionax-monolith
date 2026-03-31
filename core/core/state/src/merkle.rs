//! Binary Merkle Tree for Axionax state root computation.
//!
//! # Design
//! - Leaf  = blake2s_256(address_bytes || balance_be || nonce_be)
//! - Node  = blake2s_256(left_child || right_child)
//! - Empty tree  → `[0u8; 32]`
//! - Odd number of leaves → last leaf is duplicated (standard Bitcoin-style padding)
//!
//! Blake2s-256 is used throughout because it is the recommended function for
//! Merkle-tree nodes in `crypto::hash` ("2-3x faster than SHA3, use for Merkle tree nodes").

use crypto::hash::blake2s_256;

/// Compute the Merkle root from a list of pre-hashed 32-byte leaves.
///
/// Leaves MUST already be sorted by the caller (deterministic ordering).
/// If `leaves` is empty, returns the all-zeros hash.
pub fn merkle_root(leaves: Vec<[u8; 32]>) -> [u8; 32] {
    if leaves.is_empty() {
        return [0u8; 32];
    }

    let mut level = leaves;

    while level.len() > 1 {
        if level.len() % 2 == 1 {
            let last = *level.last().expect("level is non-empty");
            level.push(last);
        }

        level = level
            .chunks_exact(2)
            .map(|pair| {
                let mut combined = [0u8; 64];
                combined[..32].copy_from_slice(&pair[0]);
                combined[32..].copy_from_slice(&pair[1]);
                blake2s_256(&combined)
            })
            .collect();
    }

    level[0]
}

/// Compute the leaf hash for a single account state entry.
///
/// Layout: blake2s_256(address_utf8 || balance_be_16 || nonce_be_8)
pub fn account_leaf(address: &str, balance: u128, nonce: u64) -> [u8; 32] {
    let addr_bytes = address.as_bytes();
    let mut input = Vec::with_capacity(addr_bytes.len() + 16 + 8);
    input.extend_from_slice(addr_bytes);
    input.extend_from_slice(&balance.to_be_bytes());
    input.extend_from_slice(&nonce.to_be_bytes());
    blake2s_256(&input)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_tree_returns_zero_hash() {
        assert_eq!(merkle_root(vec![]), [0u8; 32]);
    }

    #[test]
    fn test_single_leaf_returns_that_leaf() {
        let leaf = account_leaf("0xabc", 1000, 0);
        assert_eq!(merkle_root(vec![leaf]), leaf);
    }

    #[test]
    fn test_two_leaves_deterministic() {
        let l1 = account_leaf("0xaaa", 100, 0);
        let l2 = account_leaf("0xbbb", 200, 1);
        let root_a = merkle_root(vec![l1, l2]);
        let root_b = merkle_root(vec![l1, l2]);
        assert_eq!(root_a, root_b);
        assert_ne!(root_a, [0u8; 32]);
    }

    #[test]
    fn test_order_matters() {
        let l1 = account_leaf("0xaaa", 100, 0);
        let l2 = account_leaf("0xbbb", 200, 1);
        let root_ab = merkle_root(vec![l1, l2]);
        let root_ba = merkle_root(vec![l2, l1]);
        assert_ne!(root_ab, root_ba);
    }

    #[test]
    fn test_odd_number_of_leaves_stable() {
        let leaves: Vec<[u8; 32]> = (0u8..3)
            .map(|i| account_leaf(&format!("0x{:040x}", i), i as u128 * 1000, i as u64))
            .collect();
        let root = merkle_root(leaves.clone());
        let root2 = merkle_root(leaves);
        assert_eq!(root, root2);
        assert_ne!(root, [0u8; 32]);
    }

    #[test]
    fn test_large_tree_deterministic() {
        let leaves: Vec<[u8; 32]> = (0u64..100)
            .map(|i| account_leaf(&format!("0x{:040x}", i), (i as u128) * 1_000_000_000_000_000_000, i))
            .collect();
        let root1 = merkle_root(leaves.clone());
        let root2 = merkle_root(leaves);
        assert_eq!(root1, root2);
        assert_ne!(root1, [0u8; 32]);
    }

    #[test]
    fn test_account_leaf_different_balances() {
        let l1 = account_leaf("0xabc", 0, 0);
        let l2 = account_leaf("0xabc", 1, 0);
        assert_ne!(l1, l2);
    }

    #[test]
    fn test_account_leaf_different_nonces() {
        let l1 = account_leaf("0xabc", 1000, 0);
        let l2 = account_leaf("0xabc", 1000, 1);
        assert_ne!(l1, l2);
    }

    #[test]
    fn test_four_leaves_power_of_two() {
        let leaves: Vec<[u8; 32]> = (0u8..4)
            .map(|i| account_leaf(&format!("0x{:040x}", i), i as u128 * 500, i as u64))
            .collect();
        let root = merkle_root(leaves);
        assert_ne!(root, [0u8; 32]);
    }
}
