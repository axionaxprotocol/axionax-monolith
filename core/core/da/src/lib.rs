//! Data Availability (DA) Module
//!
//! Ensures data is available for challenge retrieval based on ARCHITECTURE v1.5
//! - Erasure coding for redundancy
//! - Chunk storage and retrieval
//! - Live DA audits
//! - Availability window management

use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

/// DA Error types
#[derive(Error, Debug)]
pub enum DAError {
    #[error("Data not found: {0}")]
    DataNotFound(String),

    #[error("Chunk not found: {0}")]
    ChunkNotFound(String),

    #[error("Data expired: available until {0}")]
    DataExpired(u64),

    #[error("Invalid erasure coding: {0}")]
    InvalidErasureCoding(String),

    #[error("Audit failed: {0}")]
    AuditFailed(String),

    #[error("Storage full")]
    StorageFull,
}

pub type Result<T> = std::result::Result<T, DAError>;

/// DA Configuration (aligned with ARCHITECTURE v1.5)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DAConfig {
    /// Erasure coding rate
    /// Recommended: 1.5x
    pub erasure_coding_rate: f64,

    /// Chunk size in bytes
    pub chunk_size: usize,

    /// Data availability window (Δt_DA) in seconds
    pub availability_window_seconds: u64,

    /// Replication factor
    pub replication_factor: usize,

    /// Enable live DA audits
    pub live_audit_enabled: bool,

    /// Maximum storage size in bytes
    pub max_storage_bytes: u64,
}

impl Default for DAConfig {
    fn default() -> Self {
        Self {
            erasure_coding_rate: 1.5,
            chunk_size: 256 * 1024, // 256 KB
            availability_window_seconds: 300, // 5 minutes
            replication_factor: 3,
            live_audit_enabled: true,
            max_storage_bytes: 10 * 1024 * 1024 * 1024, // 10 GB
        }
    }
}

/// Data chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chunk {
    /// Chunk ID (hash of content)
    pub id: String,

    /// Chunk index in the original data
    pub index: usize,

    /// Chunk data
    pub data: Vec<u8>,

    /// Is this a parity chunk (erasure coding)
    pub is_parity: bool,

    /// Hash of the chunk data
    pub hash: [u8; 32],
}

impl Chunk {
    pub fn new(index: usize, data: Vec<u8>, is_parity: bool) -> Self {
        let hash = compute_hash(&data);
        let id = hex::encode(&hash[..16]);
        Self {
            id,
            index,
            data,
            is_parity,
            hash,
        }
    }

    /// Verify chunk integrity
    pub fn verify(&self) -> bool {
        compute_hash(&self.data) == self.hash
    }
}

/// Stored data entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataEntry {
    /// Data ID (derived from job/task)
    pub id: String,

    /// Original data size in bytes
    pub original_size: usize,

    /// Total chunks (including parity)
    pub total_chunks: usize,

    /// Data chunks required for reconstruction
    pub data_chunks: usize,

    /// Parity chunks for redundancy
    pub parity_chunks: usize,

    /// Chunk IDs
    pub chunk_ids: Vec<String>,

    /// Creation timestamp
    pub created_at: u64,

    /// Expiry timestamp
    pub expires_at: u64,

    /// Number of successful audits
    pub audit_count: u64,

    /// Last audit timestamp
    pub last_audit: u64,
}

/// Audit result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditResult {
    pub data_id: String,
    pub chunks_checked: usize,
    pub chunks_valid: usize,
    pub passed: bool,
    pub timestamp: u64,
}

/// Data Availability Layer
pub struct DA {
    config: DAConfig,
    entries: Arc<RwLock<HashMap<String, DataEntry>>>,
    chunks: Arc<RwLock<HashMap<String, Chunk>>>,
    total_storage: Arc<RwLock<u64>>,
}

impl DA {
    /// Create new DA instance
    pub fn new(config: DAConfig) -> Self {
        Self {
            config,
            entries: Arc::new(RwLock::new(HashMap::new())),
            chunks: Arc::new(RwLock::new(HashMap::new())),
            total_storage: Arc::new(RwLock::new(0)),
        }
    }

    /// Store data with erasure coding
    pub async fn store(&self, id: String, data: &[u8]) -> Result<DataEntry> {
        let data_size = data.len();
        let chunk_size = self.config.chunk_size;

        // Calculate chunks needed
        let data_chunks = (data_size + chunk_size - 1) / chunk_size;
        let parity_chunks = ((data_chunks as f64 * (self.config.erasure_coding_rate - 1.0)).ceil()) as usize;
        let total_chunks = data_chunks + parity_chunks;

        // Check storage capacity
        let required_storage = (total_chunks * chunk_size) as u64;
        let mut storage = self.total_storage.write().await;
        if *storage + required_storage > self.config.max_storage_bytes {
            return Err(DAError::StorageFull);
        }

        let mut chunks_storage = self.chunks.write().await;
        let mut chunk_ids = Vec::with_capacity(total_chunks);

        // Create data chunks
        for i in 0..data_chunks {
            let start = i * chunk_size;
            let end = std::cmp::min(start + chunk_size, data_size);
            let chunk_data = data[start..end].to_vec();

            let chunk = Chunk::new(i, chunk_data, false);
            chunk_ids.push(chunk.id.clone());
            chunks_storage.insert(chunk.id.clone(), chunk);
        }

        // Create parity chunks (simplified XOR parity for demo)
        for i in 0..parity_chunks {
            let parity_data = self.compute_parity(&chunks_storage, &chunk_ids, i, chunk_size);
            let chunk = Chunk::new(data_chunks + i, parity_data, true);
            chunk_ids.push(chunk.id.clone());
            chunks_storage.insert(chunk.id.clone(), chunk);
        }
        drop(chunks_storage);

        let now = current_timestamp();
        let entry = DataEntry {
            id: id.clone(),
            original_size: data_size,
            total_chunks,
            data_chunks,
            parity_chunks,
            chunk_ids,
            created_at: now,
            expires_at: now + self.config.availability_window_seconds,
            audit_count: 0,
            last_audit: 0,
        };

        *storage += required_storage;

        let mut entries = self.entries.write().await;
        entries.insert(id.clone(), entry.clone());

        info!(
            "Stored data {}: {} bytes, {} data + {} parity chunks",
            id, data_size, data_chunks, parity_chunks
        );

        Ok(entry)
    }

    /// Compute simple XOR parity (simplified erasure coding)
    fn compute_parity(
        &self,
        chunks: &HashMap<String, Chunk>,
        chunk_ids: &[String],
        parity_index: usize,
        chunk_size: usize,
    ) -> Vec<u8> {
        let mut parity = vec![0u8; chunk_size];
        
        // XOR all data chunks together (simplified)
        for (i, chunk_id) in chunk_ids.iter().enumerate() {
            if let Some(chunk) = chunks.get(chunk_id) {
                if !chunk.is_parity {
                    // Rotate based on parity index for variety
                    let offset = (parity_index * 7 + i) % 256;
                    for (j, byte) in chunk.data.iter().enumerate() {
                        if j < parity.len() {
                            parity[j] ^= byte.wrapping_add(offset as u8);
                        }
                    }
                }
            }
        }
        
        parity
    }

    /// Retrieve data
    pub async fn retrieve(&self, id: &str) -> Result<Vec<u8>> {
        let entries = self.entries.read().await;
        let entry = entries
            .get(id)
            .ok_or_else(|| DAError::DataNotFound(id.to_string()))?;

        // Check expiry
        if current_timestamp() > entry.expires_at {
            return Err(DAError::DataExpired(entry.expires_at));
        }

        let chunks = self.chunks.read().await;
        let mut data = Vec::with_capacity(entry.original_size);

        // Retrieve data chunks in order
        for i in 0..entry.data_chunks {
            let chunk_id = &entry.chunk_ids[i];
            let chunk = chunks
                .get(chunk_id)
                .ok_or_else(|| DAError::ChunkNotFound(chunk_id.clone()))?;

            if !chunk.verify() {
                return Err(DAError::AuditFailed(format!("Chunk {} corrupted", chunk_id)));
            }

            data.extend_from_slice(&chunk.data);
        }

        // Trim to original size
        data.truncate(entry.original_size);

        debug!("Retrieved data {}: {} bytes", id, data.len());
        Ok(data)
    }

    /// Retrieve specific chunk
    pub async fn get_chunk(&self, chunk_id: &str) -> Result<Chunk> {
        let chunks = self.chunks.read().await;
        chunks
            .get(chunk_id)
            .cloned()
            .ok_or_else(|| DAError::ChunkNotFound(chunk_id.to_string()))
    }

    /// Get data entry info
    pub async fn get_entry(&self, id: &str) -> Option<DataEntry> {
        self.entries.read().await.get(id).cloned()
    }

    /// Audit data availability
    pub async fn audit(&self, id: &str) -> Result<AuditResult> {
        if !self.config.live_audit_enabled {
            return Err(DAError::AuditFailed("Audits disabled".to_string()));
        }

        let mut entries = self.entries.write().await;
        let entry = entries
            .get_mut(id)
            .ok_or_else(|| DAError::DataNotFound(id.to_string()))?;

        let chunks = self.chunks.read().await;
        let mut chunks_valid = 0;

        for chunk_id in &entry.chunk_ids {
            if let Some(chunk) = chunks.get(chunk_id) {
                if chunk.verify() {
                    chunks_valid += 1;
                }
            }
        }

        let passed = chunks_valid >= entry.data_chunks; // Can reconstruct
        let now = current_timestamp();

        entry.audit_count += 1;
        entry.last_audit = now;

        let result = AuditResult {
            data_id: id.to_string(),
            chunks_checked: entry.total_chunks,
            chunks_valid,
            passed,
            timestamp: now,
        };

        if passed {
            info!("Audit passed for {}: {}/{} chunks valid", id, chunks_valid, entry.total_chunks);
        } else {
            warn!("Audit FAILED for {}: {}/{} chunks valid", id, chunks_valid, entry.total_chunks);
        }

        Ok(result)
    }

    /// Cleanup expired data
    pub async fn cleanup_expired(&self) -> usize {
        let now = current_timestamp();
        let mut entries = self.entries.write().await;
        let mut chunks = self.chunks.write().await;
        let mut storage = self.total_storage.write().await;

        let expired: Vec<_> = entries
            .iter()
            .filter(|(_, e)| e.expires_at < now)
            .map(|(id, e)| (id.clone(), e.chunk_ids.clone(), e.total_chunks))
            .collect();

        let mut removed = 0;
        for (id, chunk_ids, total_chunks) in expired {
            for chunk_id in &chunk_ids {
                if let Some(chunk) = chunks.remove(chunk_id) {
                    *storage = storage.saturating_sub(chunk.data.len() as u64);
                }
            }
            entries.remove(&id);
            removed += 1;
            info!("Cleaned up expired data: {} ({} chunks)", id, total_chunks);
        }

        removed
    }

    /// Get storage stats
    pub async fn get_stats(&self) -> DAStats {
        let entries = self.entries.read().await;
        let storage = *self.total_storage.read().await;

        DAStats {
            total_entries: entries.len(),
            total_storage_bytes: storage,
            max_storage_bytes: self.config.max_storage_bytes,
            utilization: storage as f64 / self.config.max_storage_bytes as f64,
        }
    }

    /// Extend data availability window
    pub async fn extend_expiry(&self, id: &str, additional_seconds: u64) -> Result<()> {
        let mut entries = self.entries.write().await;
        let entry = entries
            .get_mut(id)
            .ok_or_else(|| DAError::DataNotFound(id.to_string()))?;

        entry.expires_at += additional_seconds;
        info!("Extended expiry for {} to {}", id, entry.expires_at);
        Ok(())
    }
}

/// DA Statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DAStats {
    pub total_entries: usize,
    pub total_storage_bytes: u64,
    pub max_storage_bytes: u64,
    pub utilization: f64,
}

fn compute_hash(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha3_256::new();
    hasher.update(data);
    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    hash
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_store_and_retrieve() {
        let da = DA::new(DAConfig {
            chunk_size: 1024,
            ..Default::default()
        });

        let data = b"Hello, Axionax DA Layer! This is test data.";
        let entry = da.store("test-1".to_string(), data).await.unwrap();

        assert_eq!(entry.original_size, data.len());
        assert!(entry.data_chunks >= 1);

        let retrieved = da.retrieve("test-1").await.unwrap();
        assert_eq!(retrieved, data.to_vec());
    }

    #[tokio::test]
    async fn test_chunking() {
        let da = DA::new(DAConfig {
            chunk_size: 10, // Small chunks for testing
            erasure_coding_rate: 1.5,
            ..Default::default()
        });

        let data = b"This is a longer test message that will be split into multiple chunks.";
        let entry = da.store("test-2".to_string(), data).await.unwrap();

        assert!(entry.data_chunks > 1);
        assert!(entry.parity_chunks > 0);
        assert_eq!(entry.total_chunks, entry.data_chunks + entry.parity_chunks);
    }

    #[tokio::test]
    async fn test_audit() {
        let da = DA::new(DAConfig::default());
        let data = b"Audit test data";

        da.store("audit-test".to_string(), data).await.unwrap();
        let result = da.audit("audit-test").await.unwrap();

        assert!(result.passed);
        assert_eq!(result.chunks_valid, result.chunks_checked);
    }

    #[tokio::test]
    async fn test_chunk_integrity() {
        let chunk = Chunk::new(0, vec![1, 2, 3, 4, 5], false);
        assert!(chunk.verify());
    }

    #[tokio::test]
    async fn test_stats() {
        let da = DA::new(DAConfig {
            chunk_size: 100,
            ..Default::default()
        });

        da.store("stats-1".to_string(), &[1u8; 500]).await.unwrap();

        let stats = da.get_stats().await;
        assert_eq!(stats.total_entries, 1);
        assert!(stats.total_storage_bytes > 0);
    }
}
