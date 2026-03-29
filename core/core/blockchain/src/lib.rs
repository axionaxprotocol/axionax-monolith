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

use genesis::GenesisGenerator;

pub mod mempool;
pub mod storage;
pub mod validation;

pub use mempool::{PoolConfig, PoolError, PoolStats, TransactionPool};
pub use storage::{BlockStore, RedbBlockStore, SledBlockStore, StorageError};
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

    /// Storage error
    #[error("Storage error: {0}")]
    Storage(#[from] StorageError),
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
    /// Ed25519 signature over signing_payload (64 bytes). Empty = unsigned.
    #[serde(default)]
    pub signature: Vec<u8>,
    /// Ed25519 public key of the signer (32 bytes). Empty = unsigned.
    #[serde(default)]
    pub signer_public_key: Vec<u8>,
}

impl Transaction {
    /// Canonical bytes that get signed. Excludes hash/signature/signer_public_key.
    pub fn signing_payload(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(256);
        buf.extend_from_slice(self.from.as_bytes());
        buf.extend_from_slice(self.to.as_bytes());
        buf.extend_from_slice(&self.value.to_le_bytes());
        buf.extend_from_slice(&self.gas_price.to_le_bytes());
        buf.extend_from_slice(&self.gas_limit.to_le_bytes());
        buf.extend_from_slice(&self.nonce.to_le_bytes());
        buf.extend_from_slice(&self.data);
        buf
    }

    /// Compute and set the transaction hash from the signing payload.
    pub fn compute_hash(&mut self) {
        self.hash = crypto::hash::blake2s_256(&self.signing_payload());
    }

    /// Returns true if the transaction carries a signature.
    pub fn is_signed(&self) -> bool {
        self.signature.len() == 64 && self.signer_public_key.len() == 32
    }

    /// Verify the Ed25519 signature and check that the derived address matches `from`.
    pub fn verify_signature(&self) -> bool {
        let Some(vk) = crypto::signature::public_key_from_bytes(&self.signer_public_key) else {
            return false;
        };
        let payload = self.signing_payload();
        if !crypto::signature::verify(&vk, &payload, &self.signature) {
            return false;
        }
        let derived = crypto::signature::address_from_public_key(&vk);
        derived == self.from
    }
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
    /// Path to database directory (None for in-memory)
    pub db_path: Option<String>,
}

/// Persistent Blockchain with disk-based storage
///
/// Uses `redb` database for all block storage. Data persists across restarts.
///
/// # Example
/// ```ignore
/// use blockchain::{PersistentBlockchain, BlockchainConfig};
///
/// let config = BlockchainConfig { db_path: Some("./data".to_string()), ..Default::default() };
/// let blockchain = PersistentBlockchain::open(config)?;
/// blockchain.init_with_genesis().await;
/// ```
pub struct PersistentBlockchain {
    store: SledBlockStore,
    config: BlockchainConfig,
}

impl PersistentBlockchain {
    /// Opens a persistent blockchain at the configured path
    pub fn open(config: BlockchainConfig) -> Result<Self> {
        let path = config.db_path.as_ref()
            .map(|p| p.as_str())
            .unwrap_or("./axionax_data");

        let store = SledBlockStore::open(path)?;
        Ok(Self { store, config })
    }

    /// Opens a temporary in-memory store (for testing)
    pub fn open_temp(config: BlockchainConfig) -> Result<Self> {
        let store = SledBlockStore::open_temp()?;
        Ok(Self { store, config })
    }

    /// Adds a new block to the chain
    pub async fn add_block(&self, block: Block) -> Result<()> {
        let expected = self.store.get_latest_block_number()? + 1;
        if block.number != expected {
            return Err(BlockchainError::InvalidBlockNumber {
                expected,
                actual: block.number,
            });
        }

        if self.store.block_exists(block.number)? {
            return Err(BlockchainError::BlockExists(block.number));
        }

        self.store.put_block(&block)?;
        Ok(())
    }

    /// Gets a block by number
    pub async fn get_block(&self, number: u64) -> Option<Block> {
        self.store.get_block(number).ok().flatten()
    }

    /// Gets the latest block number
    pub async fn get_latest_block_number(&self) -> u64 {
        self.store.get_latest_block_number().unwrap_or(0)
    }

    /// Initialize blockchain with genesis block
    pub async fn init_with_genesis(&self) -> Result<()> {
        if !self.store.block_exists(0).unwrap_or(false) {
            let genesis = Blockchain::create_genesis()?;
            self.store.put_block(&genesis)?;
        }
        Ok(())
    }

    /// Flush all pending writes to disk
    pub fn flush(&self) -> Result<()> {
        self.store.flush()?;
        Ok(())
    }

    /// Get the configuration
    pub fn config(&self) -> &BlockchainConfig {
        &self.config
    }
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

        // Enforce parent hash linkage for all blocks after genesis
        if block.number > 0 {
            if let Some(prev_block) = blocks.get(&(*latest)) {
                if block.parent_hash != prev_block.hash {
                    return Err(BlockchainError::InvalidParentHash {
                        block_number: block.number,
                    });
                }
            }
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
    pub async fn init_with_genesis(&self) -> Result<()> {
        let mut blocks = self.blocks.write().await;
        if blocks.is_empty() {
            let genesis = Self::create_genesis()?;
            blocks.insert(0, genesis);
        }
        Ok(())
    }

    /// Creates genesis block from canonical mainnet config (1T AXX, axionaxius, validators).
    /// Uses the genesis crate so block hash, state_root, and timestamp match genesis.json.
    pub fn create_genesis() -> Result<Block> {
        let g = GenesisGenerator::mainnet();
        Ok(Block {
            number: g.number,
            hash: parse_hex_hash(&g.hash).map_err(|e| BlockchainError::TransactionValidation(e))?,
            parent_hash: parse_hex_hash(&g.parent_hash).map_err(|e| BlockchainError::TransactionValidation(e))?,
            timestamp: g.timestamp,
            proposer: g
                .config
                .validators
                .first()
                .map(|v| v.address.clone())
                .unwrap_or_else(|| "axionaxius".to_string()),
            transactions: vec![],
            state_root: parse_hex_hash(&g.state_root).map_err(|e| BlockchainError::TransactionValidation(e))?,
            gas_used: 0,
            gas_limit: 30_000_000,
        })
    }
}

/// Parse a 0x-prefixed 32-byte hex string into [u8; 32]. Fails on wrong length or invalid hex.
fn parse_hex_hash(s: &str) -> std::result::Result<[u8; 32], String> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    if s.len() != 64 {
        return Err(format!("genesis hash must be 64 hex chars, got {}", s.len()));
    }
    let bytes = hex::decode(s).map_err(|e| e.to_string())?;
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes[..32]);
    Ok(arr)
}

impl Default for BlockchainConfig {
    fn default() -> Self {
        Self {
            block_time_secs: 5,
            max_block_size: 1_000_000,
            gas_limit: 30_000_000,
            db_path: None, // In-memory by default for backward compatibility
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
            signature: vec![],
            signer_public_key: vec![],
        }
    }

    #[tokio::test]
    async fn test_add_block() {
        let blockchain = Blockchain::new(BlockchainConfig::default());

        let genesis = Blockchain::create_genesis().unwrap();
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
        let genesis = Blockchain::create_genesis().unwrap();
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
        blockchain.init_with_genesis().await.unwrap();

        let genesis = blockchain.get_block(0).await;
        assert!(genesis.is_some());
        assert_eq!(genesis.unwrap().number, 0);

        // Calling again should not change anything
        blockchain.init_with_genesis().await.unwrap();
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

    #[test]
    fn test_transaction_signing_and_verification() {
        let signing_key = crypto::signature::generate_keypair();
        let verifying_key = signing_key.verifying_key();
        let address = crypto::signature::address_from_public_key(&verifying_key);

        let mut tx = Transaction {
            hash: [0u8; 32],
            from: address.clone(),
            to: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef".to_string(),
            value: 1000,
            gas_price: 20_000_000_000,
            gas_limit: 21_000,
            nonce: 0,
            data: vec![],
            signature: vec![],
            signer_public_key: vec![],
        };

        // Unsigned tx should not verify
        assert!(!tx.is_signed());
        assert!(!tx.verify_signature());

        // Sign the transaction
        let payload = tx.signing_payload();
        tx.signature = crypto::signature::sign(&signing_key, &payload);
        tx.signer_public_key = verifying_key.to_bytes().to_vec();

        // Now it should verify
        assert!(tx.is_signed());
        assert!(tx.verify_signature());

        // Tamper with from address — should fail verification
        let mut tampered = tx.clone();
        tampered.from = "0x0000000000000000000000000000000000000000".to_string();
        assert!(!tampered.verify_signature());

        // Tamper with signature — should fail
        let mut bad_sig = tx.clone();
        bad_sig.signature[0] ^= 0xFF;
        assert!(!bad_sig.verify_signature());
    }

    #[tokio::test]
    async fn test_parent_hash_validation() {
        let blockchain = Blockchain::new(BlockchainConfig::default());

        // Init with genesis first
        blockchain.init_with_genesis().await.unwrap();

        // Get genesis hash
        let genesis = blockchain.get_block(0).await.unwrap();
        let genesis_hash = genesis.hash;

        // Block with correct parent hash should succeed
        let good_block = Block {
            number: 1,
            hash: [1u8; 32],
            parent_hash: genesis_hash,
            timestamp: 100,
            proposer: "v1".to_string(),
            transactions: vec![],
            state_root: [1u8; 32],
            gas_used: 0,
            gas_limit: 30_000_000,
        };
        assert!(blockchain.add_block(good_block).await.is_ok());

        // Block with wrong parent hash should fail
        let bad_block = Block {
            number: 2,
            hash: [2u8; 32],
            parent_hash: [99u8; 32],
            timestamp: 200,
            proposer: "v1".to_string(),
            transactions: vec![],
            state_root: [2u8; 32],
            gas_used: 0,
            gas_limit: 30_000_000,
        };
        assert!(blockchain.add_block(bad_block).await.is_err());
    }
}
