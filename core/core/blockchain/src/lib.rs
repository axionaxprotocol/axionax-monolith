//! axionax Blockchain Core
//!
//! Block production, chain management, and transaction processing
//!
//! # Example
//! ```ignore
//! use blockchain::{Blockchain, BlockchainConfig, Block};
//!
//! let blockchain = Blockchain::new(BlockchainConfig::default());
//! blockchain.init_with_genesis().await;
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;

pub mod mempool;
pub mod validation;

pub use mempool::{PoolConfig, PoolError, PoolStats, TransactionPool};
pub use validation::{BlockValidator, TransactionValidator, ValidationConfig, ValidationError};

/// Blockchain error types
#[derive(Error, Debug)]
pub enum BlockchainError {
    /// Block number doesn't match expected sequence
    #[error("Invalid block number: expected {expected}, got {actual}")]
    InvalidBlockNumber { expected: u64, actual: u64 },

    /// Block hash doesn't match parent
    #[error("Invalid parent hash: block {block_number} parent doesn't match")]
    InvalidParentHash { block_number: u64 },

    /// Block already exists
    #[error("Block {0} already exists")]
    BlockExists(u64),

    /// Block not found
    #[error("Block {0} not found")]
    BlockNotFound(u64),

    /// Transaction validation failed
    #[error("Transaction validation failed: {0}")]
    TransactionValidation(String),

    /// Gas limit exceeded
    #[error("Block gas limit exceeded: used {used}, limit {limit}")]
    GasLimitExceeded { used: u64, limit: u64 },

    /// Internal lock error
    #[error("Internal lock error")]
    LockError,
}

/// Result type for blockchain operations
pub type Result<T> = std::result::Result<T, BlockchainError>;

/// Block represents a block in the chain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub number: u64,
    pub hash: [u8; 32],
    pub parent_hash: [u8; 32],
    pub timestamp: u64,
    pub proposer: String,
    pub transactions: Vec<Transaction>,
    pub state_root: [u8; 32],
    pub gas_used: u64,
    pub gas_limit: u64,
}

/// Transaction represents a transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub hash: [u8; 32],
    pub from: String,
    pub to: String,
    pub value: u128,
    pub gas_price: u128,
    pub gas_limit: u64,
    pub nonce: u64,
    pub data: Vec<u8>,
}

/// Blockchain manages the chain state
pub struct Blockchain {
    blocks: Arc<RwLock<HashMap<u64, Block>>>,
    latest_block: Arc<RwLock<u64>>,
    _config: BlockchainConfig,
}

/// Blockchain configuration
#[derive(Debug, Clone)]
pub struct BlockchainConfig {
    pub block_time_secs: u64,
    pub max_block_size: usize,
    pub gas_limit: u64,
}


impl Blockchain {
    /// Creates a new blockchain
    pub fn new(config: BlockchainConfig) -> Self {
        Self {
            blocks: Arc::new(RwLock::new(HashMap::new())),
            latest_block: Arc::new(RwLock::new(0)),
            _config: config,
        }
    }

    /// Adds a new block to the chain
    ///
    /// # Errors
    /// Returns `BlockchainError::InvalidBlockNumber` if block number doesn't match expected sequence
    pub async fn add_block(&self, block: Block) -> Result<()> {
        let mut blocks = self.blocks.write().await;
        let mut latest = self.latest_block.write().await;

        let expected = *latest + 1;
        if block.number != expected {
            return Err(BlockchainError::InvalidBlockNumber {
                expected,
                actual: block.number,
            });
        }

        blocks.insert(block.number, block);
        *latest += 1;
        Ok(())
    }


    /// Gets a block by number
    pub async fn get_block(&self, number: u64) -> Option<Block> {
        let blocks = self.blocks.read().await;
        blocks.get(&number).cloned()
    }

    /// Gets the latest block number
    pub async fn get_latest_block_number(&self) -> u64 {
        *self.latest_block.read().await
    }

    /// Initialize blockchain with genesis block
    pub async fn init_with_genesis(&self) {
        let mut blocks = self.blocks.write().await;
        if blocks.is_empty() {
            let genesis = Self::create_genesis();
            blocks.insert(0, genesis);
        }
    }

    /// Creates genesis block
    pub fn create_genesis() -> Block {
        Block {
            number: 0,
            hash: [0u8; 32],
            parent_hash: [0u8; 32],
            timestamp: 0,
            proposer: "genesis".to_string(),
            transactions: vec![],
            state_root: [0u8; 32],
            gas_used: 0,
            gas_limit: 30_000_000,
        }
    }
}

impl Default for BlockchainConfig {
    fn default() -> Self {
        Self {
            block_time_secs: 5,
            max_block_size: 1_000_000,
            gas_limit: 30_000_000,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_tx(id: u8) -> Transaction {
        let mut hash = [0u8; 32];
        hash[0] = id;
        Transaction {
            hash,
            from: "0x1234567890123456789012345678901234567890".to_string(),
            to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd".to_string(),
            value: 1000,
            gas_price: 20_000_000_000,
            gas_limit: 21_000,
            nonce: id as u64,
            data: vec![],
        }
    }

    #[tokio::test]
    async fn test_add_block() {
        let blockchain = Blockchain::new(BlockchainConfig::default());

        let genesis = Blockchain::create_genesis();
        let result = blockchain.add_block(genesis).await;

        // Genesis block number is 0, so after adding it, latest should be 0
        // But we expect block number 0 to be the first block
        assert!(result.is_err()); // Should fail because genesis.number = 0, but latest = 0

        // Let's add a proper block 1
        let block1 = Block {
            number: 1,
            hash: [1u8; 32],
            parent_hash: [0u8; 32],
            timestamp: 100,
            proposer: "validator1".to_string(),
            transactions: vec![],
            state_root: [1u8; 32],
            gas_used: 0,
            gas_limit: 30_000_000,
        };

        let result = blockchain.add_block(block1).await;
        assert!(result.is_ok());
        assert_eq!(blockchain.get_latest_block_number().await, 1);
    }

    #[test]
    fn test_create_genesis() {
        let genesis = Blockchain::create_genesis();
        assert_eq!(genesis.number, 0);
        assert_eq!(genesis.transactions.len(), 0);
    }

    #[tokio::test]
    async fn test_block_with_transactions() {
        let blockchain = Blockchain::new(BlockchainConfig::default());

        let transactions = vec![
            create_test_tx(1),
            create_test_tx(2),
            create_test_tx(3),
        ];

        let block = Block {
            number: 1,
            hash: [1u8; 32],
            parent_hash: [0u8; 32],
            timestamp: 100,
            proposer: "validator1".to_string(),
            transactions,
            state_root: [1u8; 32],
            gas_used: 63_000, // 3 transactions * 21_000
            gas_limit: 30_000_000,
        };

        let result = blockchain.add_block(block.clone()).await;
        assert!(result.is_ok());

        let retrieved = blockchain.get_block(1).await;
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().transactions.len(), 3);
    }

    #[tokio::test]
    async fn test_init_with_genesis() {
        let blockchain = Blockchain::new(BlockchainConfig::default());
        blockchain.init_with_genesis().await;

        let genesis = blockchain.get_block(0).await;
        assert!(genesis.is_some());
        assert_eq!(genesis.unwrap().number, 0);

        // Calling again should not change anything
        blockchain.init_with_genesis().await;
        let genesis2 = blockchain.get_block(0).await;
        assert!(genesis2.is_some());
    }

    #[tokio::test]
    async fn test_get_nonexistent_block() {
        let blockchain = Blockchain::new(BlockchainConfig::default());
        let block = blockchain.get_block(999).await;
        assert!(block.is_none());
    }

    #[tokio::test]
    async fn test_sequential_block_addition() {
        let blockchain = Blockchain::new(BlockchainConfig::default());

        // Add blocks 1-5 sequentially
        for i in 1..=5 {
            let block = Block {
                number: i,
                hash: [i as u8; 32],
                parent_hash: [(i - 1) as u8; 32],
                timestamp: 100 + i,
                proposer: format!("validator{}", i % 3),
                transactions: vec![],
                state_root: [i as u8; 32],
                gas_used: 0,
                gas_limit: 30_000_000,
            };
            let result = blockchain.add_block(block).await;
            assert!(result.is_ok(), "Failed to add block {}", i);
        }

        assert_eq!(blockchain.get_latest_block_number().await, 5);

        // Verify all blocks are retrievable
        for i in 1..=5 {
            let block = blockchain.get_block(i).await;
            assert!(block.is_some());
            assert_eq!(block.unwrap().number, i);
        }
    }

    #[tokio::test]
    async fn test_skip_block_number_fails() {
        let blockchain = Blockchain::new(BlockchainConfig::default());

        // Try to add block 3 without adding 1 and 2
        let block = Block {
            number: 3,
            hash: [3u8; 32],
            parent_hash: [2u8; 32],
            timestamp: 100,
            proposer: "validator1".to_string(),
            transactions: vec![],
            state_root: [3u8; 32],
            gas_used: 0,
            gas_limit: 30_000_000,
        };

        let result = blockchain.add_block(block).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_concurrent_read_access() {
        let blockchain = Arc::new(Blockchain::new(BlockchainConfig::default()));

        // Add a block first
        blockchain.add_block(Block {
            number: 1,
            hash: [1u8; 32],
            parent_hash: [0u8; 32],
            timestamp: 100,
            proposer: "validator1".to_string(),
            transactions: vec![],
            state_root: [1u8; 32],
            gas_used: 0,
            gas_limit: 30_000_000,
        }).await.unwrap();

        // Spawn multiple concurrent read tasks
        let mut handles = vec![];
        for _ in 0..10 {
            let bc = Arc::clone(&blockchain);
            handles.push(tokio::spawn(async move {
                bc.get_block(1).await
            }));
        }

        // All reads should succeed
        for handle in handles {
            let result = handle.await.unwrap();
            assert!(result.is_some());
        }
    }
}
