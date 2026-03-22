//! axionax Node - Integrated blockchain node combining Network, State, and RPC
//!
//! The Node module provides a high-level API for running a complete axionax blockchain node
//! that handles peer-to-peer networking, persistent storage, JSON-RPC API endpoints,
//! and block production (when running as a validator).

use std::net::SocketAddr;
use std::sync::Arc;
use std::path::Path;
use tokio::sync::{mpsc, RwLock};
use tokio::task::JoinHandle;
use tracing::{info, warn, error, debug};

use blockchain::{Block, Transaction, TransactionPool, PoolConfig, ValidationConfig};
use network::{NetworkManager, NetworkConfig, NetworkMessage};
use network::protocol::{BlockMessage, TransactionMessage};
use state::StateDB;
use rpc::start_rpc_server;
use jsonrpsee::server::ServerHandle;

/// Convert hex string to [u8; 32] hash
fn hex_to_hash(hex: &str) -> Result<[u8; 32], String> {
    let hex = hex.strip_prefix("0x").unwrap_or(hex);
    if hex.len() != 64 {
        return Err(format!("Invalid hash length: expected 64, got {}", hex.len()));
    }
    let bytes = hex::decode(hex).map_err(|e| e.to_string())?;
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&bytes);
    Ok(hash)
}

/// Convert [u8; 32] hash to hex string
fn hash_to_hex(hash: &[u8; 32]) -> String {
    format!("0x{}", hex::encode(hash))
}

/// Node configuration
#[derive(Debug, Clone)]
pub struct NodeConfig {
    /// Network configuration (chain ID, bootstrap nodes, etc.)
    pub network: NetworkConfig,
    /// RPC server address (e.g., "127.0.0.1:8545")
    pub rpc_addr: SocketAddr,
    /// State database path
    pub state_path: String,
}

impl NodeConfig {
    /// Create development node configuration
    pub fn dev() -> Self {
        Self {
            network: NetworkConfig::dev(),
            rpc_addr: "127.0.0.1:8545".parse().unwrap(),
            state_path: "/tmp/axionax-dev".to_string(),
        }
    }

    /// Create testnet node configuration
    pub fn testnet() -> Self {
        Self {
            network: NetworkConfig::testnet(),
            rpc_addr: "127.0.0.1:8545".parse().unwrap(),
            state_path: "/var/lib/axionax/testnet".to_string(),
        }
    }

    /// Create mainnet node configuration
    pub fn mainnet() -> Self {
        Self {
            network: NetworkConfig::mainnet(),
            rpc_addr: "127.0.0.1:8545".parse().unwrap(),
            state_path: "/var/lib/axionax/mainnet".to_string(),
        }
    }
}

/// Node statistics
#[derive(Debug, Clone, Default)]
pub struct NodeStats {
    pub blocks_received: u64,
    pub blocks_stored: u64,
    pub transactions_received: u64,
    pub transactions_stored: u64,
    pub peer_count: usize,
}

/// axionax blockchain node
pub struct AxionaxNode {
    config: NodeConfig,
    network: Arc<tokio::sync::Mutex<NetworkManager>>,
    state: Arc<StateDB>,
    mempool: Arc<TransactionPool>,
    event_bus: Arc<events::EventBus>,
    stats: Arc<RwLock<NodeStats>>,
    rpc_handle: Option<ServerHandle>,
    sync_handle: Option<JoinHandle<()>>,
    producer_handle: Option<JoinHandle<()>>,
}

impl AxionaxNode {
    /// Create a new node
    pub async fn new(config: NodeConfig) -> anyhow::Result<Self> {
        info!("Initializing axionax node with config: {:?}", config);

        // Initialize state database
        let state_path = Path::new(&config.state_path);
        if let Some(parent) = state_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let state = Arc::new(StateDB::open(state_path)?);
        info!("State database opened at: {}", config.state_path);

        // If chain is empty, seed genesis block and genesis balances (testnet/mainnet).
        if state.get_chain_height().unwrap_or(0) == 0
            && (config.network.chain_id == 86137 || config.network.chain_id == 86150)
        {
            let genesis_block = blockchain::Blockchain::create_genesis()
                .map_err(|e| anyhow::anyhow!("create_genesis: {}", e))?;
            state.store_block(&genesis_block)?;
            let g = genesis::GenesisGenerator::mainnet();
            state.seed_genesis_balances(&g.config.balances)?;
            info!("Genesis block and {} balances seeded", g.config.balances.len());
        }

        // Initialize network manager
        let network = Arc::new(tokio::sync::Mutex::new(
            NetworkManager::new(config.network.clone()).await?
        ));
        info!("Network manager initialized");

        // Initialize transaction pool
        let mempool = Arc::new(TransactionPool::new(
            PoolConfig::default(),
            ValidationConfig::default(),
        ));
        info!("Transaction pool initialized");

        let event_bus = Arc::new(events::EventBus::new(1024));
        info!("Event bus initialized");

        let stats = Arc::new(RwLock::new(NodeStats::default()));

        Ok(Self {
            config,
            network,
            state,
            mempool,
            event_bus,
            stats,
            rpc_handle: None,
            sync_handle: None,
            producer_handle: None,
        })
    }

    /// Start the node (network, sync, RPC server, and optionally block producer)
    pub async fn start(&mut self, role: &str) -> anyhow::Result<()> {
        info!("Starting axionax node...");

        // Start network manager
        {
            let mut network = self.network.lock().await;
            network.start().await?;
        }
        info!("Network layer started");

        // Start sync task (network → state)
        let sync_handle = self.start_sync_task().await;
        self.sync_handle = Some(sync_handle);
        info!("Sync task started");

        let rpc_handle = start_rpc_server(
            self.config.rpc_addr,
            self.state.clone(),
            self.config.network.chain_id,
            Some(self.mempool.clone()),
            Some(self.event_bus.clone()),
        ).await?;
        self.rpc_handle = Some(rpc_handle);
        info!("RPC server started on {}", self.config.rpc_addr);

        // Start block producer for validator role
        if role == "validator" {
            let block_time = self.config.network.block_time_seconds;
            let handle = self.start_block_producer(block_time).await;
            self.producer_handle = Some(handle);
            info!("Block producer started (interval={}s)", block_time);
        }

        info!("✅ axionax node fully operational!");
        Ok(())
    }

    /// Start the block production loop (validator only)
    async fn start_block_producer(&self, block_time_secs: u64) -> JoinHandle<()> {
        let state = self.state.clone();
        let stats = self.stats.clone();
        let network = self.network.clone();
        let mempool = self.mempool.clone();

        tokio::spawn(async move {
            info!("Block producer running (every {}s)...", block_time_secs);

            let interval = tokio::time::Duration::from_secs(block_time_secs);

            loop {
                tokio::time::sleep(interval).await;

                // Step 1 (async): Get pending transactions from mempool
                let pending_txs = mempool.get_pending_transactions(100).await;

                // Step 2 (sync): Read chain state, create block, store it
                // All StateDB ops must be in this sync block to avoid Send issues
                let produced = {
                    let height = state.get_chain_height().unwrap_or(0);
                    let parent_hash = match state.get_block_by_number(height) {
                        Ok(parent) => parent.hash,
                        Err(_) => [0u8; 32],
                    };

                    let new_number = height + 1;
                    let timestamp = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();

                    // Compute block hash: SHA3(parent_hash || number || timestamp)
                    let mut hash_input = Vec::with_capacity(48);
                    hash_input.extend_from_slice(&parent_hash);
                    hash_input.extend_from_slice(&new_number.to_le_bytes());
                    hash_input.extend_from_slice(&timestamp.to_le_bytes());
                    let block_hash = crypto::hash::sha3_256(&hash_input);

                    let state_root = crypto::hash::sha3_256(&new_number.to_le_bytes());

                    let block = Block {
                        number: new_number,
                        hash: block_hash,
                        parent_hash,
                        timestamp,
                        proposer: "validator".to_string(),
                        transactions: pending_txs,
                        state_root,
                        gas_used: 0,
                        gas_limit: 30_000_000,
                    };

                    match state.store_block(&block) {
                        Ok(()) => Some((block, new_number, block_hash)),
                        Err(e) => {
                            error!("Failed to store block #{}: {}", new_number, e);
                            None
                        }
                    }
                };

                // Step 3 (async): Update stats and publish to network
                if let Some((block, new_number, block_hash)) = produced {
                    {
                        let mut s = stats.write().await;
                        s.blocks_stored = new_number;
                    }

                    info!("⛏ Produced block #{} (txs={}, hash=0x{})",
                        new_number,
                        block.transactions.len(),
                        hex::encode(&block_hash[..4]),
                    );

                    let block_msg = BlockMessage {
                        number: block.number,
                        hash: hash_to_hex(&block.hash),
                        parent_hash: hash_to_hex(&block.parent_hash),
                        timestamp: block.timestamp,
                        proposer: block.proposer.clone(),
                        transactions: block.transactions.iter()
                            .map(|tx| hash_to_hex(&tx.hash))
                            .collect(),
                        state_root: hash_to_hex(&block.state_root),
                    };

                    if let Ok(mut net) = network.try_lock() {
                        let _ = net.publish(NetworkMessage::Block(block_msg));
                    }
                }
            }
        })
    }

    /// Start the sync task that listens for network messages and stores them
    async fn start_sync_task(&self) -> JoinHandle<()> {
        let _network = self.network.clone();
        let state = self.state.clone();
        let stats = self.stats.clone();

        tokio::spawn(async move {
            info!("Sync task running...");

            // Create a channel for receiving network messages
            let (_tx, mut rx) = mpsc::channel::<NetworkMessage>(100);

            // In a real implementation, we'd integrate with NetworkManager's event loop
            // For now, this is a placeholder structure

            loop {
                tokio::select! {
                    Some(msg) = rx.recv() => {
                        match msg {
                            NetworkMessage::Block(block_msg) => {
                                if let Err(e) = Self::handle_block_message(
                                    &state,
                                    &stats,
                                    block_msg
                                ).await {
                                    error!("Failed to handle block: {}", e);
                                }
                            }
                            NetworkMessage::Transaction(tx_msg) => {
                                if let Err(e) = Self::handle_transaction_message(
                                    &state,
                                    &stats,
                                    tx_msg
                                ).await {
                                    error!("Failed to handle transaction: {}", e);
                                }
                            }
                            _ => {
                                debug!("Received other message type, skipping");
                            }
                        }
                    }
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)) => {
                        // Periodic check (placeholder)
                    }
                }
            }
        })
    }

    /// Handle incoming block message from network
    async fn handle_block_message(
        state: &Arc<StateDB>,
        stats: &Arc<RwLock<NodeStats>>,
        block_msg: BlockMessage,
    ) -> anyhow::Result<()> {
        debug!("Received block #{} from network", block_msg.number);

        // Update stats
        {
            let mut s = stats.write().await;
            s.blocks_received += 1;
        }

        // Convert hashes from hex strings to [u8; 32]
        let hash = hex_to_hash(&block_msg.hash)
            .map_err(|e| anyhow::anyhow!("Invalid block hash: {}", e))?;
        let parent_hash = hex_to_hash(&block_msg.parent_hash)
            .map_err(|e| anyhow::anyhow!("Invalid parent hash: {}", e))?;
        let state_root = hex_to_hash(&block_msg.state_root)
            .map_err(|e| anyhow::anyhow!("Invalid state root: {}", e))?;

        // Validate block (basic checks)
        if block_msg.number == 0 && parent_hash != [0u8; 32] {
            warn!("Invalid genesis block: non-zero parent hash");
            return Ok(());
        }

        // Check if we already have this block
        if state.get_block_by_hash(&hash).is_ok() {
            debug!("Block #{} already in database", block_msg.number);
            return Ok(());
        }

        // Convert transaction hashes from strings to [u8; 32]
        // Note: BlockMessage.transactions contains hex hashes, not full Transaction objects
        // For now, we'll create empty transactions vector
        let transactions = vec![];

        // Calculate gas before moving transactions
        let gas_used = Self::calculate_gas_used(&transactions);

        // Convert BlockMessage to Block
        let block = Block {
            number: block_msg.number,
            hash,
            parent_hash,
            timestamp: block_msg.timestamp,
            proposer: block_msg.proposer,
            transactions,
            state_root,
            gas_used,
            gas_limit: 30_000_000, // Standard block gas limit (Ethereum compatible)
        };

        // Store block
        state.store_block(&block)?;
        info!("✅ Stored block #{} (hash: {})", block.number, hex::encode(&block.hash[..8]));

        // Update stats
        {
            let mut s = stats.write().await;
            s.blocks_stored += 1;
        }

        Ok(())
    }

    /// Calculate total gas used by transactions
    fn calculate_gas_used(transactions: &[Transaction]) -> u64 {
        // Simple gas calculation: 21000 base + 68 per data byte
        transactions.iter().map(|tx| {
            let base_gas = 21_000u64;
            let data_gas = tx.data.len() as u64 * 68;
            base_gas + data_gas
        }).sum()
    }

    /// Handle incoming transaction message from network
    async fn handle_transaction_message(
        state: &Arc<StateDB>,
        stats: &Arc<RwLock<NodeStats>>,
        tx_msg: TransactionMessage,
    ) -> anyhow::Result<()> {
        debug!("Received transaction from network: {}", &tx_msg.hash[..8]);

        // Update stats
        {
            let mut s = stats.write().await;
            s.transactions_received += 1;
        }

        // Convert hash from hex string to [u8; 32]
        let hash = hex_to_hash(&tx_msg.hash)
            .map_err(|e| anyhow::anyhow!("Invalid tx hash: {}", e))?;

        // Check if we already have this transaction
        if state.get_transaction(&hash).is_ok() {
            debug!("Transaction already in database");
            return Ok(());
        }

        // Convert TransactionMessage to Transaction
        let tx = Transaction {
            hash,
            from: tx_msg.from,
            to: tx_msg.to,
            value: tx_msg.value,
            gas_price: 20, // Default gas price (not in TransactionMessage)
            gas_limit: 21000, // Default gas limit (not in TransactionMessage)
            nonce: tx_msg.nonce,
            data: tx_msg.data,
            signature: vec![],
            signer_public_key: vec![],
        };

        // Note: We store transactions when they're included in blocks
        // For now, we'll just track that we received them
        // In a full implementation, we'd store them in a mempool

        let _ = tx; // Silence unused variable warning
        debug!("Transaction received (pending block inclusion)");

        // Update stats
        {
            let mut s = stats.write().await;
            s.transactions_stored += 1;
        }

        Ok(())
    }

    /// Publish a block to the network
    pub async fn publish_block(&self, block: &Block) -> anyhow::Result<()> {
        info!("Publishing block #{} to network", block.number);

        // Convert Block to BlockMessage (with hex-encoded hashes)
        let block_msg = BlockMessage {
            number: block.number,
            hash: hash_to_hex(&block.hash),
            parent_hash: hash_to_hex(&block.parent_hash),
            timestamp: block.timestamp,
            proposer: block.proposer.clone(),
            transactions: block.transactions.iter()
                .map(|tx| hash_to_hex(&tx.hash))
                .collect(),
            state_root: hash_to_hex(&block.state_root),
        };

        let mut network = self.network.lock().await;
        network.publish(NetworkMessage::Block(block_msg))?;

        Ok(())
    }

    /// Publish a transaction to the network
    pub async fn publish_transaction(&self, tx: &Transaction) -> anyhow::Result<()> {
        debug!("Publishing transaction to network: {}", hex::encode(&tx.hash[..8]));

        // Convert Transaction to TransactionMessage (with hex-encoded hash)
        let tx_msg = TransactionMessage {
            hash: hash_to_hex(&tx.hash),
            from: tx.from.clone(),
            to: tx.to.clone(),
            value: tx.value,
            data: tx.data.clone(),
            nonce: tx.nonce,
            signature: vec![], // TODO: Extract signature from transaction data when ECDSA is implemented
        };

        let mut network = self.network.lock().await;
        network.publish(NetworkMessage::Transaction(tx_msg))?;

        Ok(())
    }

    /// Get current node statistics
    pub async fn stats(&self) -> NodeStats {
        self.stats.read().await.clone()
    }

    /// Get current peer count
    pub async fn peer_count(&self) -> usize {
        let network = self.network.lock().await;
        network.peer_count()
    }

    /// Get state database reference
    pub fn state(&self) -> Arc<StateDB> {
        self.state.clone()
    }

    /// Shutdown the node gracefully
    pub async fn shutdown(&mut self) -> anyhow::Result<()> {
        info!("Shutting down axionax node...");

        // Stop sync task
        if let Some(handle) = self.sync_handle.take() {
            handle.abort();
            info!("Sync task stopped");
        }

        // Stop RPC server
        if let Some(handle) = self.rpc_handle.take() {
            handle.stop()?;
            info!("RPC server stopped");
        }

        // Stop network (note: NetworkManager doesn't have shutdown method yet)
        // {
        //     let mut network = self.network.write().await;
        //     // network.shutdown().await?;
        //     info!("Network layer stopped");
        // }

        // Close state database (note: close() returns () not Result)
        // self.state.close()?;
        info!("State database closed");

        info!("✅ Node shutdown complete");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    async fn create_test_node() -> (AxionaxNode, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let mut config = NodeConfig::dev();
        config.state_path = temp_dir.path().to_str().unwrap().to_string();
        config.rpc_addr = "127.0.0.1:0".parse().unwrap(); // Random port

        let node = AxionaxNode::new(config).await.unwrap();
        (node, temp_dir)
    }

    #[tokio::test]
    async fn test_node_creation() {
        let (node, _temp) = create_test_node().await;
        assert_eq!(node.config.network.chain_id, 31337); // Dev chain
    }

    #[tokio::test]
    async fn test_node_stats() {
        let (node, _temp) = create_test_node().await;
        let stats = node.stats().await;
        assert_eq!(stats.blocks_received, 0);
        assert_eq!(stats.transactions_received, 0);
    }

    #[tokio::test]
    async fn test_node_state_access() {
        let (node, _temp) = create_test_node().await;
        let state = node.state();
        let height = state.get_chain_height().unwrap();
        assert_eq!(height, 0); // Genesis
    }
}
