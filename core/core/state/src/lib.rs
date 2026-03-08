//! axionax State Module
//!
//! Persistent storage layer using redb (pure Rust) for:
//! - Blocks and transactions
//! - Chain state and metadata
//! - Account balances and nonces

use redb::{Database, ReadableTable, TableDefinition};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use thiserror::Error;
use tracing::{debug, info};

use blockchain::{Block, Transaction};

/// State database errors
#[derive(Error, Debug)]
pub enum StateError {
    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Block not found: {0}")]
    BlockNotFound(String),

    #[error("Transaction not found: {0}")]
    TransactionNotFound(String),

    #[error("Invalid block number: {0}")]
    InvalidBlockNumber(u64),

    #[error("Key not found: {0}")]
    KeyNotFound(String),
}

pub type Result<T> = std::result::Result<T, StateError>;

impl From<redb::Error> for StateError {
    fn from(e: redb::Error) -> Self {
        StateError::DatabaseError(e.to_string())
    }
}
impl From<redb::DatabaseError> for StateError {
    fn from(e: redb::DatabaseError) -> Self {
        StateError::DatabaseError(e.to_string())
    }
}
impl From<redb::TableError> for StateError {
    fn from(e: redb::TableError) -> Self {
        StateError::DatabaseError(e.to_string())
    }
}
impl From<redb::TransactionError> for StateError {
    fn from(e: redb::TransactionError) -> Self {
        StateError::DatabaseError(e.to_string())
    }
}
impl From<redb::StorageError> for StateError {
    fn from(e: redb::StorageError) -> Self {
        StateError::DatabaseError(e.to_string())
    }
}
impl From<redb::CommitError> for StateError {
    fn from(e: redb::CommitError) -> Self {
        StateError::DatabaseError(e.to_string())
    }
}

const BLOCKS: TableDefinition<&str, &[u8]> = TableDefinition::new("blocks");
const BLOCK_HASH_TO_NUMBER: TableDefinition<&[u8], u64> = TableDefinition::new("block_hash_to_number");
const TRANSACTIONS: TableDefinition<&[u8], &[u8]> = TableDefinition::new("transactions");
const TX_TO_BLOCK: TableDefinition<&[u8], &[u8]> = TableDefinition::new("tx_to_block");
const CHAIN_STATE: TableDefinition<&str, &[u8]> = TableDefinition::new("chain_state");

/// State database wrapper for redb
pub struct StateDB {
    db: Arc<Database>,
}

impl StateDB {
    /// Open or create a new state database.
    /// Accepts either a file path (e.g. `data/state.redb`) or a directory
    /// (e.g. `data/`) — if a directory, appends `state.redb` automatically.
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let file_path = if path.extension().is_none() {
            std::fs::create_dir_all(path).ok();
            path.join("state.redb")
        } else {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).ok();
            }
            path.to_path_buf()
        };
        info!("Opening state database at {:?}", file_path);

        let db = Database::create(&file_path).map_err(|e| StateError::DatabaseError(e.to_string()))?;

        {
            let write_txn = db.begin_write()?;
            let _ = write_txn.open_table(BLOCKS)?;
            let _ = write_txn.open_table(BLOCK_HASH_TO_NUMBER)?;
            let _ = write_txn.open_table(TRANSACTIONS)?;
            let _ = write_txn.open_table(TX_TO_BLOCK)?;
            let _ = write_txn.open_table(CHAIN_STATE)?;
            write_txn.commit()?;
        }

        Ok(Self { db: Arc::new(db) })
    }

    /// Store a block in the database
    pub fn store_block(&self, block: &Block) -> Result<()> {
        debug!("Storing block #{} with hash {:?}", block.number, block.hash);

        let block_data =
            serde_json::to_vec(block).map_err(|e| StateError::SerializationError(e.to_string()))?;

        let number_key = format!("block_{}", block.number);

        let write_txn = self.db.begin_write()?;
        {
            let mut t = write_txn.open_table(BLOCKS)?;
            t.insert(number_key.as_str(), block_data.as_slice())?;
        }
        {
            let mut t = write_txn.open_table(BLOCK_HASH_TO_NUMBER)?;
            t.insert(block.hash.as_slice(), block.number)?;
        }

        let current_height = {
            let t = write_txn.open_table(CHAIN_STATE)?;
            let h = match t.get("chain_height")? {
                Some(v) => {
                    let bytes: &[u8] = v.value();
                    u64::from_be_bytes(bytes.try_into().unwrap_or([0; 8]))
                }
                None => 0,
            };
            h
        };
        if block.number > current_height {
            let mut t = write_txn.open_table(CHAIN_STATE)?;
            t.insert("chain_height", block.number.to_be_bytes().as_slice())?;
        }

        write_txn.commit()?;

        info!("Successfully stored block #{}", block.number);
        Ok(())
    }

    /// Get block by hash
    pub fn get_block_by_hash(&self, hash: &[u8; 32]) -> Result<Block> {
        debug!("Retrieving block with hash: {:?}", hash);

        let read_txn = self.db.begin_read()?;
        let t = read_txn.open_table(BLOCK_HASH_TO_NUMBER)?;
        let block_number = t
            .get(hash.as_slice())?
            .ok_or_else(|| StateError::BlockNotFound(hex::encode(hash)))?
            .value();

        drop(t);
        drop(read_txn);

        self.get_block_by_number(block_number)
    }

    /// Get block by number
    pub fn get_block_by_number(&self, number: u64) -> Result<Block> {
        debug!("Retrieving block #{}", number);

        let number_key = format!("block_{}", number);
        let read_txn = self.db.begin_read()?;
        let t = read_txn.open_table(BLOCKS)?;

        let block_data = t
            .get(number_key.as_str())?
            .ok_or_else(|| StateError::BlockNotFound(number.to_string()))?;

        let block: Block = serde_json::from_slice(block_data.value())
            .map_err(|e| StateError::SerializationError(e.to_string()))?;

        Ok(block)
    }

    /// Get the latest block
    pub fn get_latest_block(&self) -> Result<Block> {
        let height = self.get_chain_height()?;
        self.get_block_by_number(height)
    }

    /// Store a transaction
    pub fn store_transaction(&self, tx: &Transaction, block_hash: &[u8; 32]) -> Result<()> {
        debug!("Storing transaction {:?}", tx.hash);

        let tx_data =
            serde_json::to_vec(tx).map_err(|e| StateError::SerializationError(e.to_string()))?;

        let write_txn = self.db.begin_write()?;
        {
            let mut t = write_txn.open_table(TRANSACTIONS)?;
            t.insert(tx.hash.as_slice(), tx_data.as_slice())?;
        }
        {
            let mut t = write_txn.open_table(TX_TO_BLOCK)?;
            t.insert(tx.hash.as_slice(), block_hash.as_slice())?;
        }
        write_txn.commit()?;

        Ok(())
    }

    /// Get transaction by hash
    pub fn get_transaction(&self, tx_hash: &[u8; 32]) -> Result<Transaction> {
        debug!("Retrieving transaction {:?}", tx_hash);

        let read_txn = self.db.begin_read()?;
        let t = read_txn.open_table(TRANSACTIONS)?;

        let tx_data = t
            .get(tx_hash.as_slice())?
            .ok_or_else(|| StateError::TransactionNotFound(hex::encode(tx_hash)))?;

        let tx: Transaction = serde_json::from_slice(tx_data.value())
            .map_err(|e| StateError::SerializationError(e.to_string()))?;

        Ok(tx)
    }

    /// Get block hash containing a transaction
    pub fn get_transaction_block(&self, tx_hash: &[u8; 32]) -> Result<[u8; 32]> {
        let read_txn = self.db.begin_read()?;
        let t = read_txn.open_table(TX_TO_BLOCK)?;

        let block_hash_val = t
            .get(tx_hash.as_slice())?
            .ok_or_else(|| StateError::TransactionNotFound(hex::encode(tx_hash)))?;

        let bytes: &[u8] = block_hash_val.value();
        bytes
            .try_into()
            .map_err(|_| StateError::DatabaseError("Invalid block hash format".to_string()))
    }

    /// Get current chain height
    pub fn get_chain_height(&self) -> Result<u64> {
        let read_txn = self.db.begin_read()?;
        let t = read_txn.open_table(CHAIN_STATE)?;

        match t.get("chain_height")? {
            Some(v) => {
                let bytes: &[u8] = v.value();
                let height = u64::from_be_bytes(
                    bytes
                        .try_into()
                        .map_err(|_| StateError::DatabaseError("Invalid height format".to_string()))?,
                );
                Ok(height)
            }
            None => Ok(0),
        }
    }

    /// Store state root hash
    pub fn store_state_root(&self, block_number: u64, state_root: &str) -> Result<()> {
        let key = format!("state_root_{}", block_number);
        let write_txn = self.db.begin_write()?;
        {
            let mut t = write_txn.open_table(CHAIN_STATE)?;
            t.insert(key.as_str(), state_root.as_bytes())?;
        }
        write_txn.commit()?;
        Ok(())
    }

    /// Get state root hash
    pub fn get_state_root(&self, block_number: u64) -> Result<String> {
        let key = format!("state_root_{}", block_number);
        let read_txn = self.db.begin_read()?;
        let t = read_txn.open_table(CHAIN_STATE)?;

        let root_val = t
            .get(key.as_str())?
            .ok_or(StateError::KeyNotFound(key))?;

        String::from_utf8(root_val.value().to_vec())
            .map_err(|e| StateError::DatabaseError(e.to_string()))
    }

    /// Get all blocks in range
    pub fn get_blocks_range(&self, start: u64, end: u64) -> Result<Vec<Block>> {
        let mut blocks = Vec::new();
        for number in start..=end {
            match self.get_block_by_number(number) {
                Ok(block) => blocks.push(block),
                Err(StateError::BlockNotFound(_)) => break,
                Err(e) => return Err(e),
            }
        }
        Ok(blocks)
    }

    /// Normalize EVM address for storage key (lowercase 0x + 40 hex).
    fn balance_key(address: &str) -> String {
        let a = address.strip_prefix("0x").unwrap_or(address);
        format!("bal_0x{}", a.to_lowercase())
    }
    fn nonce_key(address: &str) -> String {
        let a = address.strip_prefix("0x").unwrap_or(address);
        format!("nonce_0x{}", a.to_lowercase())
    }

    /// Get account balance (0 if never set).
    pub fn get_balance(&self, address: &str) -> Result<u128> {
        let key = Self::balance_key(address);
        let read_txn = self.db.begin_read()?;
        let t = read_txn.open_table(CHAIN_STATE)?;
        Ok(match t.get(key.as_str())? {
            Some(v) => {
                let bytes: &[u8] = v.value();
                if bytes.len() >= 16 {
                    let mut arr = [0u8; 16];
                    arr.copy_from_slice(&bytes[..16]);
                    u128::from_be_bytes(arr)
                } else {
                    0
                }
            }
            None => 0,
        })
    }

    /// Set account balance.
    pub fn set_balance(&self, address: &str, balance: u128) -> Result<()> {
        let key = Self::balance_key(address);
        let write_txn = self.db.begin_write()?;
        {
            let mut t = write_txn.open_table(CHAIN_STATE)?;
            t.insert(key.as_str(), balance.to_be_bytes().as_slice())?;
        }
        write_txn.commit()?;
        Ok(())
    }

    /// Get account nonce (0 if never set).
    pub fn get_nonce(&self, address: &str) -> Result<u64> {
        let key = Self::nonce_key(address);
        let read_txn = self.db.begin_read()?;
        let t = read_txn.open_table(CHAIN_STATE)?;
        Ok(match t.get(key.as_str())? {
            Some(v) => {
                let bytes: &[u8] = v.value();
                if bytes.len() >= 8 {
                    let mut arr = [0u8; 8];
                    arr.copy_from_slice(&bytes[..8]);
                    u64::from_be_bytes(arr)
                } else {
                    0
                }
            }
            None => 0,
        })
    }

    /// Set account nonce.
    pub fn set_nonce(&self, address: &str, nonce: u64) -> Result<()> {
        let key = Self::nonce_key(address);
        let write_txn = self.db.begin_write()?;
        {
            let mut t = write_txn.open_table(CHAIN_STATE)?;
            t.insert(key.as_str(), nonce.to_be_bytes().as_slice())?;
        }
        write_txn.commit()?;
        Ok(())
    }

    /// Seed genesis balances (call once when chain height is 0).
    pub fn seed_genesis_balances(&self, balances: &HashMap<String, u128>) -> Result<()> {
        let write_txn = self.db.begin_write()?;
        {
            let mut t = write_txn.open_table(CHAIN_STATE)?;
            for (addr, balance) in balances {
                let key = Self::balance_key(addr);
                t.insert(key.as_str(), balance.to_be_bytes().as_slice())?;
            }
        }
        write_txn.commit()?;
        info!("Seeded {} genesis balances", balances.len());
        Ok(())
    }

    /// Apply a transfer transaction: deduct from sender, add to recipient, increment sender nonce.
    /// Returns error if insufficient balance or nonce mismatch.
    pub fn apply_transaction(&self, tx: &Transaction) -> Result<()> {
        let from_bal = self.get_balance(&tx.from)?;
        let to_bal = self.get_balance(&tx.to)?;
        let from_nonce = self.get_nonce(&tx.from)?;

        if from_nonce != tx.nonce {
            return Err(StateError::DatabaseError(format!(
                "Invalid nonce: expected {}, got {}",
                from_nonce, tx.nonce
            )));
        }
        let cost = tx.value; // simplified: no gas deduction for now
        if from_bal < cost {
            return Err(StateError::DatabaseError(format!(
                "Insufficient balance: have {}, need {}",
                from_bal, cost
            )));
        }

        self.set_balance(&tx.from, from_bal - cost)?;
        self.set_balance(&tx.to, to_bal + cost)?;
        self.set_nonce(&tx.from, tx.nonce + 1)?;
        Ok(())
    }

    /// Close the database
    pub fn close(self) {
        info!("Closing state database");
        drop(self.db);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_block(number: u64) -> Block {
        let hash_val = number as u8;
        let mut hash = [0u8; 32];
        hash[31] = hash_val;

        let mut parent_hash = [0u8; 32];
        if number > 0 {
            parent_hash[31] = (number - 1) as u8;
        }

        let mut state_root = [0u8; 32];
        state_root[31] = hash_val;

        Block {
            number,
            hash,
            parent_hash,
            timestamp: 1234567890 + number,
            proposer: "0xvalidator".to_string(),
            transactions: vec![],
            state_root,
            gas_used: 0,
            gas_limit: 10_000_000,
        }
    }

    fn create_test_tx(id: u8) -> Transaction {
        let mut hash = [0u8; 32];
        hash[31] = id;

        Transaction {
            hash,
            from: "0xfrom000000000000000000000000000000000000".to_string(),
            to: "0xto00000000000000000000000000000000000000".to_string(),
            value: 1000,
            gas_price: 20,
            gas_limit: 21000,
            nonce: 1,
            data: vec![],
            signature: vec![],
            signer_public_key: vec![],
        }
    }

    #[test]
    fn test_state_db_open() {
        let temp_dir = TempDir::new().unwrap();
        let db = StateDB::open(temp_dir.path().join("state.redb")).unwrap();
        assert_eq!(db.get_chain_height().unwrap(), 0);
    }

    #[test]
    fn test_store_and_get_block() {
        let temp_dir = TempDir::new().unwrap();
        let db = StateDB::open(temp_dir.path().join("state.redb")).unwrap();

        let block = create_test_block(1);
        let block_hash = block.hash;

        db.store_block(&block).unwrap();

        let retrieved = db.get_block_by_number(1).unwrap();
        assert_eq!(retrieved.hash, block_hash);
        assert_eq!(retrieved.number, block.number);

        let retrieved = db.get_block_by_hash(&block_hash).unwrap();
        assert_eq!(retrieved.number, block.number);

        assert_eq!(db.get_chain_height().unwrap(), 1);
    }

    #[test]
    fn test_store_multiple_blocks() {
        let temp_dir = TempDir::new().unwrap();
        let db = StateDB::open(temp_dir.path().join("state.redb")).unwrap();

        for i in 1..=5 {
            let block = create_test_block(i);
            db.store_block(&block).unwrap();
        }

        assert_eq!(db.get_chain_height().unwrap(), 5);

        let latest = db.get_latest_block().unwrap();
        assert_eq!(latest.number, 5);

        let blocks = db.get_blocks_range(2, 4).unwrap();
        assert_eq!(blocks.len(), 3);
        assert_eq!(blocks[0].number, 2);
        assert_eq!(blocks[2].number, 4);
    }

    #[test]
    fn test_store_and_get_transaction() {
        let temp_dir = TempDir::new().unwrap();
        let db = StateDB::open(temp_dir.path().join("state.redb")).unwrap();

        let tx = create_test_tx(1);
        let tx_hash = tx.hash;

        let mut block_hash = [0u8; 32];
        block_hash[31] = 10;

        db.store_transaction(&tx, &block_hash).unwrap();

        let retrieved = db.get_transaction(&tx_hash).unwrap();
        assert_eq!(retrieved.hash, tx_hash);
        assert_eq!(retrieved.from, tx.from);

        let retrieved_block_hash = db.get_transaction_block(&tx_hash).unwrap();
        assert_eq!(retrieved_block_hash, block_hash);
    }

    #[test]
    fn test_state_root() {
        let temp_dir = TempDir::new().unwrap();
        let db = StateDB::open(temp_dir.path().join("state.redb")).unwrap();

        let block_number = 10;
        let state_root = "0xabcdef1234567890";

        db.store_state_root(block_number, state_root).unwrap();

        let retrieved = db.get_state_root(block_number).unwrap();
        assert_eq!(retrieved, state_root);
    }

    #[test]
    fn test_block_not_found() {
        let temp_dir = TempDir::new().unwrap();
        let db = StateDB::open(temp_dir.path().join("state.redb")).unwrap();

        let result = db.get_block_by_number(999);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), StateError::BlockNotFound(_)));
    }

    #[test]
    fn test_transaction_not_found() {
        let temp_dir = TempDir::new().unwrap();
        let db = StateDB::open(temp_dir.path().join("state.redb")).unwrap();

        let mut nonexistent_hash = [0u8; 32];
        nonexistent_hash[0] = 0xff;

        let result = db.get_transaction(&nonexistent_hash);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            StateError::TransactionNotFound(_)
        ));
    }
}
