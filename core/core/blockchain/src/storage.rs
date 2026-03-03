//! Persistent Storage Module for Axionax Blockchain
//!
//! Uses `sled` for high-performance embedded database storage.
//! Blocks are serialized with `bincode` for efficient storage.

use std::path::Path;
use thiserror::Error;

use crate::Block;

/// Storage error types
#[derive(Error, Debug)]
pub enum StorageError {
    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] sled::Error),

    /// Encode error (bincode)
    #[error("Encode error: {0}")]
    EncodeError(#[from] bincode::error::EncodeError),

    /// Decode error (bincode)
    #[error("Decode error: {0}")]
    DecodeError(#[from] bincode::error::DecodeError),

    /// Block not found
    #[error("Block {0} not found")]
    BlockNotFound(u64),

    /// Block already exists
    #[error("Block {0} already exists")]
    BlockExists(u64),
}

/// Result type for storage operations
pub type StorageResult<T> = Result<T, StorageError>;

/// Trait for block storage backends
pub trait BlockStore: Send + Sync {
    /// Store a block
    fn put_block(&self, block: &Block) -> StorageResult<()>;
    
    /// Get a block by number
    fn get_block(&self, number: u64) -> StorageResult<Option<Block>>;
    
    /// Get the latest block number
    fn get_latest_block_number(&self) -> StorageResult<u64>;
    
    /// Set the latest block number
    fn set_latest_block_number(&self, number: u64) -> StorageResult<()>;
    
    /// Check if block exists
    fn block_exists(&self, number: u64) -> StorageResult<bool>;
    
    /// Flush to disk
    fn flush(&self) -> StorageResult<()>;
}

/// Sled-based persistent block store
pub struct SledBlockStore {
    db: sled::Db,
    blocks_tree: sled::Tree,
    meta_tree: sled::Tree,
}

impl SledBlockStore {
    /// Opens or creates a new block store at the given path
    pub fn open<P: AsRef<Path>>(path: P) -> StorageResult<Self> {
        let db = sled::open(path)?;
        let blocks_tree = db.open_tree("blocks")?;
        let meta_tree = db.open_tree("meta")?;
        
        Ok(Self {
            db,
            blocks_tree,
            meta_tree,
        })
    }

    /// Creates a temporary in-memory store (for testing)
    pub fn open_temp() -> StorageResult<Self> {
        let config = sled::Config::new().temporary(true);
        let db = config.open()?;
        let blocks_tree = db.open_tree("blocks")?;
        let meta_tree = db.open_tree("meta")?;
        
        Ok(Self {
            db,
            blocks_tree,
            meta_tree,
        })
    }

    fn block_key(number: u64) -> [u8; 8] {
        number.to_be_bytes()
    }
}

impl BlockStore for SledBlockStore {
    fn put_block(&self, block: &Block) -> StorageResult<()> {
        let key = Self::block_key(block.number);
        let value = bincode::serde::encode_to_vec(block, bincode::config::standard())?;
        
        self.blocks_tree.insert(key, value)?;
        
        // Update latest block number if this is newer
        let current_latest = self.get_latest_block_number()?;
        if block.number > current_latest {
            self.set_latest_block_number(block.number)?;
        }
        
        Ok(())
    }

    fn get_block(&self, number: u64) -> StorageResult<Option<Block>> {
        let key = Self::block_key(number);
        
        match self.blocks_tree.get(key)? {
            Some(data) => {
                let (block, _): (Block, usize) =
                    bincode::serde::decode_from_slice(&data, bincode::config::standard())?;
                Ok(Some(block))
            }
            None => Ok(None),
        }
    }

    fn get_latest_block_number(&self) -> StorageResult<u64> {
        match self.meta_tree.get(b"latest_block")? {
            Some(data) => {
                let bytes: [u8; 8] = data.as_ref().try_into().unwrap_or([0; 8]);
                Ok(u64::from_be_bytes(bytes))
            }
            None => Ok(0),
        }
    }

    fn set_latest_block_number(&self, number: u64) -> StorageResult<()> {
        self.meta_tree.insert(b"latest_block", &number.to_be_bytes())?;
        Ok(())
    }

    fn block_exists(&self, number: u64) -> StorageResult<bool> {
        let key = Self::block_key(number);
        Ok(self.blocks_tree.contains_key(key)?)
    }

    fn flush(&self) -> StorageResult<()> {
        self.db.flush()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Block;

    fn create_test_block(number: u64) -> Block {
        Block {
            number,
            hash: [number as u8; 32],
            parent_hash: [(number.saturating_sub(1)) as u8; 32],
            timestamp: 1000 + number,
            proposer: format!("validator{}", number % 3),
            transactions: vec![],
            state_root: [number as u8; 32],
            gas_used: 0,
            gas_limit: 30_000_000,
        }
    }

    #[test]
    fn test_put_and_get_block() {
        let store = SledBlockStore::open_temp().unwrap();
        let block = create_test_block(1);
        
        store.put_block(&block).unwrap();
        
        let retrieved = store.get_block(1).unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().number, 1);
    }

    #[test]
    fn test_get_nonexistent_block() {
        let store = SledBlockStore::open_temp().unwrap();
        let result = store.get_block(999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_latest_block_number() {
        let store = SledBlockStore::open_temp().unwrap();
        
        // Initially 0
        assert_eq!(store.get_latest_block_number().unwrap(), 0);
        
        // Add blocks
        store.put_block(&create_test_block(1)).unwrap();
        assert_eq!(store.get_latest_block_number().unwrap(), 1);
        
        store.put_block(&create_test_block(2)).unwrap();
        assert_eq!(store.get_latest_block_number().unwrap(), 2);
        
        store.put_block(&create_test_block(3)).unwrap();
        assert_eq!(store.get_latest_block_number().unwrap(), 3);
    }

    #[test]
    fn test_block_exists() {
        let store = SledBlockStore::open_temp().unwrap();
        
        assert!(!store.block_exists(1).unwrap());
        
        store.put_block(&create_test_block(1)).unwrap();
        
        assert!(store.block_exists(1).unwrap());
        assert!(!store.block_exists(2).unwrap());
    }

    #[test]
    fn test_persistence() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test_db");
        
        // Create store, add block, drop
        {
            let store = SledBlockStore::open(&path).unwrap();
            store.put_block(&create_test_block(1)).unwrap();
            store.put_block(&create_test_block(2)).unwrap();
            store.flush().unwrap();
        }
        
        // Reopen and verify data persists
        {
            let store = SledBlockStore::open(&path).unwrap();
            
            let block1 = store.get_block(1).unwrap();
            assert!(block1.is_some());
            assert_eq!(block1.unwrap().number, 1);
            
            let block2 = store.get_block(2).unwrap();
            assert!(block2.is_some());
            assert_eq!(block2.unwrap().number, 2);
            
            assert_eq!(store.get_latest_block_number().unwrap(), 2);
        }
    }

    #[test]
    fn test_many_blocks() {
        let store = SledBlockStore::open_temp().unwrap();
        
        // Add 100 blocks
        for i in 1..=100 {
            store.put_block(&create_test_block(i)).unwrap();
        }
        
        // Verify all exist
        for i in 1..=100 {
            assert!(store.block_exists(i).unwrap());
            let block = store.get_block(i).unwrap().unwrap();
            assert_eq!(block.number, i);
        }
        
        assert_eq!(store.get_latest_block_number().unwrap(), 100);
    }
}
