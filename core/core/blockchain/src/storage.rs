//! Persistent Storage Module for Axionax Blockchain
//!
//! Uses `redb` (pure-Rust embedded database) for block storage.
//! Blocks are serialized with `postcard` for efficient storage.

use std::path::Path;
use thiserror::Error;
use redb::{Database, TableDefinition};

use crate::Block;

/// Blocks table: block_number (u64) → postcard-encoded Block bytes
const BLOCKS: TableDefinition<u64, &[u8]> = TableDefinition::new("blocks");
/// Metadata table: key (&str) → value bytes
const META: TableDefinition<&str, &[u8]> = TableDefinition::new("meta");

/// Storage error types
#[derive(Error, Debug)]
pub enum StorageError {
    /// Database error
    #[error("Database error: {0}")]
    Database(String),

    /// Encode error (postcard)
    #[error("Encode error: {0}")]
    EncodeError(String),

    /// Decode error (postcard)
    #[error("Decode error: {0}")]
    DecodeError(String),

    /// Block not found
    #[error("Block {0} not found")]
    BlockNotFound(u64),

    /// Block already exists
    #[error("Block {0} already exists")]
    BlockExists(u64),
}

impl From<redb::Error> for StorageError {
    fn from(e: redb::Error) -> Self {
        StorageError::Database(e.to_string())
    }
}

impl From<redb::DatabaseError> for StorageError {
    fn from(e: redb::DatabaseError) -> Self {
        StorageError::Database(e.to_string())
    }
}

impl From<redb::TransactionError> for StorageError {
    fn from(e: redb::TransactionError) -> Self {
        StorageError::Database(e.to_string())
    }
}

impl From<redb::TableError> for StorageError {
    fn from(e: redb::TableError) -> Self {
        StorageError::Database(e.to_string())
    }
}

impl From<redb::CommitError> for StorageError {
    fn from(e: redb::CommitError) -> Self {
        StorageError::Database(e.to_string())
    }
}

impl From<redb::StorageError> for StorageError {
    fn from(e: redb::StorageError) -> Self {
        StorageError::Database(e.to_string())
    }
}

impl From<postcard::Error> for StorageError {
    fn from(e: postcard::Error) -> Self {
        StorageError::EncodeError(e.to_string())
    }
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

/// Redb-based persistent block store
pub struct RedbBlockStore {
    db: Database,
}

/// Backward-compatibility alias — the previous implementation was named `SledBlockStore`
pub type SledBlockStore = RedbBlockStore;

impl RedbBlockStore {
    /// Opens or creates a block store at the given path
    pub fn open<P: AsRef<Path>>(path: P) -> StorageResult<Self> {
        let db = Database::create(path)?;
        // Ensure both tables exist so later reads never fail with "table not found"
        let tx = db.begin_write()?;
        tx.open_table(BLOCKS)?;
        tx.open_table(META)?;
        tx.commit()?;
        Ok(Self { db })
    }

    /// Creates a temporary in-memory store (for testing)
    pub fn open_temp() -> StorageResult<Self> {
        let db = Database::builder()
            .create_with_backend(redb::backends::InMemoryBackend::new())?;
        let tx = db.begin_write()?;
        tx.open_table(BLOCKS)?;
        tx.open_table(META)?;
        tx.commit()?;
        Ok(Self { db })
    }
}

impl BlockStore for RedbBlockStore {
    fn put_block(&self, block: &Block) -> StorageResult<()> {
        // Read the current latest block number first (separate read transaction).
        // This avoids having two table handles open at the same time inside a single
        // write transaction, which redb does not allow.
        let current_latest = self.get_latest_block_number()?;

        let value = postcard::to_allocvec(block).map_err(StorageError::from)?;

        let tx = self.db.begin_write()?;
        {
            let mut blocks = tx.open_table(BLOCKS)?;
            blocks.insert(block.number, value.as_slice())?;
        }
        if block.number > current_latest {
            let mut meta = tx.open_table(META)?;
            meta.insert("latest_block", block.number.to_be_bytes().as_slice())?;
        }
        tx.commit()?;
        Ok(())
    }

    fn get_block(&self, number: u64) -> StorageResult<Option<Block>> {
        let tx = self.db.begin_read()?;
        let table = tx.open_table(BLOCKS)?;
        match table.get(number)? {
            Some(data) => {
                let block: Block = postcard::from_bytes(data.value()).map_err(StorageError::from)?;
                Ok(Some(block))
            }
            None => Ok(None),
        }
    }

    fn get_latest_block_number(&self) -> StorageResult<u64> {
        let tx = self.db.begin_read()?;
        let table = tx.open_table(META)?;
        match table.get("latest_block")? {
            Some(data) => {
                let bytes: [u8; 8] = data.value().try_into().map_err(|_| {
                    StorageError::Database(
                        "corrupt latest_block metadata: expected 8 bytes".to_string(),
                    )
                })?;
                Ok(u64::from_be_bytes(bytes))
            }
            None => Ok(0),
        }
    }

    fn set_latest_block_number(&self, number: u64) -> StorageResult<()> {
        let tx = self.db.begin_write()?;
        {
            let mut meta = tx.open_table(META)?;
            meta.insert("latest_block", number.to_be_bytes().as_slice())?;
        }
        tx.commit()?;
        Ok(())
    }

    fn block_exists(&self, number: u64) -> StorageResult<bool> {
        let tx = self.db.begin_read()?;
        let table = tx.open_table(BLOCKS)?;
        Ok(table.get(number)?.is_some())
    }

    fn flush(&self) -> StorageResult<()> {
        // redb commits are durable on each write transaction; no separate flush needed.
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
        let store = RedbBlockStore::open_temp().unwrap();
        let block = create_test_block(1);
        store.put_block(&block).unwrap();
        let retrieved = store.get_block(1).unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().number, 1);
    }

    #[test]
    fn test_get_nonexistent_block() {
        let store = RedbBlockStore::open_temp().unwrap();
        let result = store.get_block(999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_latest_block_number() {
        let store = RedbBlockStore::open_temp().unwrap();

        // Initially 0
        assert_eq!(store.get_latest_block_number().unwrap(), 0);

        store.put_block(&create_test_block(1)).unwrap();
        assert_eq!(store.get_latest_block_number().unwrap(), 1);

        store.put_block(&create_test_block(2)).unwrap();
        assert_eq!(store.get_latest_block_number().unwrap(), 2);

        store.put_block(&create_test_block(3)).unwrap();
        assert_eq!(store.get_latest_block_number().unwrap(), 3);
    }

    #[test]
    fn test_block_exists() {
        let store = RedbBlockStore::open_temp().unwrap();

        assert!(!store.block_exists(1).unwrap());
        store.put_block(&create_test_block(1)).unwrap();
        assert!(store.block_exists(1).unwrap());
        assert!(!store.block_exists(2).unwrap());
    }

    #[test]
    fn test_set_latest_block_number_directly() {
        let store = RedbBlockStore::open_temp().unwrap();
        store.set_latest_block_number(42).unwrap();
        assert_eq!(store.get_latest_block_number().unwrap(), 42);
    }

    #[test]
    fn test_persistence() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test_db.redb");

        {
            let store = RedbBlockStore::open(&path).unwrap();
            store.put_block(&create_test_block(1)).unwrap();
            store.put_block(&create_test_block(2)).unwrap();
            store.flush().unwrap();
        }

        {
            let store = RedbBlockStore::open(&path).unwrap();

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
        let store = RedbBlockStore::open_temp().unwrap();

        for i in 1..=100 {
            store.put_block(&create_test_block(i)).unwrap();
        }

        for i in 1..=100 {
            assert!(store.block_exists(i).unwrap());
            let block = store.get_block(i).unwrap().unwrap();
            assert_eq!(block.number, i);
        }

        assert_eq!(store.get_latest_block_number().unwrap(), 100);
    }

    #[test]
    fn test_sled_alias_still_works() {
        // Ensure the backward-compat type alias compiles and behaves identically
        let store: SledBlockStore = SledBlockStore::open_temp().unwrap();
        store.put_block(&create_test_block(7)).unwrap();
        assert_eq!(store.get_latest_block_number().unwrap(), 7);
    }
}
