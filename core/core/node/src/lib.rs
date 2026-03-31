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

use blockchain::{Block, Transaction, TransactionPool, PoolConfig, PoolError, ValidationConfig};
use network::{NetworkManager, NetworkConfig, NetworkMessage};
use network::protocol::{BlockMessage, TransactionMessage, BlockConfirmationMessage};
use state::StateDB;
use rpc::start_rpc_server_full;
use staking::Staking;
use governance::Governance;
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

/// Block reward per block (1 AXX in base units)
pub const BLOCK_REWARD: u128 = 1_000_000_000_000_000_000;

/// Node configuration
#[derive(Debug, Clone)]
pub struct NodeConfig {
    /// Network configuration (chain ID, bootstrap nodes, etc.)
    pub network: NetworkConfig,
    /// RPC server address (e.g., "127.0.0.1:8545")
    pub rpc_addr: SocketAddr,
    /// State database path
    pub state_path: String,
    /// Staking address of this validator (hex string). None = not a registered validator.
    pub validator_address: Option<String>,
}

impl NodeConfig {
    /// Create development node configuration
    pub fn dev() -> Self {
        Self {
            network: NetworkConfig::dev(),
            rpc_addr: "127.0.0.1:8545".parse().unwrap(),
            state_path: "/tmp/axionax-dev".to_string(),
            validator_address: None,
        }
    }

    /// Create testnet node configuration
    pub fn testnet() -> Self {
        Self {
            network: NetworkConfig::testnet(),
            rpc_addr: "127.0.0.1:8545".parse().unwrap(),
            state_path: "/var/lib/axionax/testnet".to_string(),
            validator_address: None,
        }
    }

    /// Create mainnet node configuration
    pub fn mainnet() -> Self {
        Self {
            network: NetworkConfig::mainnet(),
            rpc_addr: "127.0.0.1:8545".parse().unwrap(),
            state_path: "/var/lib/axionax/mainnet".to_string(),
            validator_address: None,
        }
    }
}

/// Tracks block finality votes: block_hash → set of confirming validator addresses.
/// A block is finalized once votes ≥ ⌈2/3 * active_validator_count⌉.
#[derive(Debug, Default)]
pub struct FinalityTracker {
    /// votes[block_hash] = set of validator addresses that confirmed this block
    votes: std::collections::HashMap<String, std::collections::HashSet<String>>,
    /// block_hash → block_number (for logging)
    block_numbers: std::collections::HashMap<String, u64>,
    /// Already-finalized block hashes (to avoid double-logging)
    finalized: std::collections::HashSet<String>,
}

impl FinalityTracker {
    /// Record a confirmation vote. Returns true if this vote caused finalization.
    pub fn record_vote(
        &mut self,
        block_hash: &str,
        block_number: u64,
        validator: &str,
        active_count: usize,
    ) -> bool {
        if self.finalized.contains(block_hash) {
            return false;
        }
        self.block_numbers.insert(block_hash.to_string(), block_number);
        let votes = self.votes.entry(block_hash.to_string()).or_default();
        votes.insert(validator.to_string());
        let threshold = (active_count * 2).div_ceil(3).max(1);
        if votes.len() >= threshold {
            self.finalized.insert(block_hash.to_string());
            return true;
        }
        false
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
    staking: Arc<RwLock<Staking>>,
    governance: Arc<RwLock<Governance>>,
    stats: Arc<RwLock<NodeStats>>,
    rpc_handle: Option<ServerHandle>,
    sync_handle: Option<JoinHandle<()>>,
    producer_handle: Option<JoinHandle<()>>,
    local_peer_id: libp2p::PeerId,
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
        let network_manager = NetworkManager::new(config.network.clone()).await?;
        let local_peer_id = *network_manager.local_peer_id();
        let network = Arc::new(tokio::sync::Mutex::new(network_manager));
        info!("Network manager initialized (peer_id: {:?})", local_peer_id);

        // Initialize transaction pool
        let mempool = Arc::new(TransactionPool::new(
            PoolConfig::default(),
            ValidationConfig::default(),
        ));
        info!("Transaction pool initialized");

        let event_bus = Arc::new(events::EventBus::new(1024));
        info!("Event bus initialized");

        // Initialize staking and governance modules
        let staking = Arc::new(RwLock::new(Staking::new(staking::StakingConfig::default())));
        let governance = Arc::new(RwLock::new(Governance::new(governance::GovernanceConfig::default())));
        info!("Staking and governance modules initialized");

        let stats = Arc::new(RwLock::new(NodeStats::default()));

        Ok(Self {
            config,
            network,
            state,
            mempool,
            event_bus,
            staking,
            governance,
            stats,
            rpc_handle: None,
            sync_handle: None,
            producer_handle: None,
            local_peer_id,
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

        // Start sync task (network → state) — take the inbound event receiver
        // so the sync loop processes real gossipsub messages from the network.
        let event_rx = {
            let mut network = self.network.lock().await;
            network.take_event_receiver()
        };
        let sync_handle = self.start_sync_task(event_rx).await;
        self.sync_handle = Some(sync_handle);
        info!("Sync task started");

        let rpc_handle = start_rpc_server_full(
            self.config.rpc_addr,
            self.state.clone(),
            self.config.network.chain_id,
            Some(self.mempool.clone()),
            Some(self.event_bus.clone()),
            Some(self.staking.clone()),
            Some((self.governance.clone(), self.staking.clone())),
        ).await?;
        self.rpc_handle = Some(rpc_handle);
        info!("RPC server started on {}", self.config.rpc_addr);

        // Start HTTP health server (/health, /ready, /metrics)
        let health_server = rpc::HttpHealthServer::new(rpc::HttpHealthConfig::default());
        let health_state = health_server.state();
        health_server.start().await?;
        info!("HTTP health server started");

        // Background task: sync HealthState from real metrics every 5s
        let state_for_health = self.state.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
            loop {
                interval.tick().await;
                let mut hs = health_state.write().await;
                hs.peers_connected = metrics::PEERS_CONNECTED.get() as usize;
                hs.block_height = metrics::BLOCK_HEIGHT.get() as u64;
                hs.database_ok = state_for_health.get_chain_height().is_ok();
                hs.sync_ok = hs.block_height > 0 || hs.peers_connected > 0;
                hs.update(); // refresh uptime
            }
        });

        // Start block producer for validator role
        if role == "validator" {
            let block_time = self.config.network.block_time_seconds;
            let handle = self.start_block_producer(
                block_time,
                self.staking.clone(),
                self.config.validator_address.clone(),
            ).await;
            self.producer_handle = Some(handle);
            info!("Block producer started (interval={}s, address={:?})",
                block_time, self.config.validator_address);
        }

        info!("✅ axionax node fully operational!");
        Ok(())
    }

    /// Start the block production loop (validator only)
    async fn start_block_producer(
        &self,
        block_time_secs: u64,
        staking: Arc<RwLock<staking::Staking>>,
        validator_address: Option<String>,
    ) -> JoinHandle<()> {
        let state = self.state.clone();
        let stats = self.stats.clone();
        let network = self.network.clone();
        let mempool = self.mempool.clone();
        let local_peer_id = self.local_peer_id;

        tokio::spawn(async move {
            info!("Block producer running (every {}s, validator={:?})...",
                block_time_secs, validator_address);

            let interval = tokio::time::Duration::from_secs(block_time_secs);
            let mut round_count = 0u64;

            loop {
                tokio::time::sleep(interval).await;
                round_count += 1;

                // Validator selection: round-robin over SORTED active validator addresses.
                // This is deterministic and consistent across all peers.
                let active_validators = {
                    let s = staking.read().await;
                    let mut v: Vec<String> = s.get_active_validators().await
                        .into_iter().map(|vi| vi.address).collect();
                    v.sort();
                    v
                };

                let validator_count = active_validators.len().max(1) as u64;

                // Determine slot based on our validator_address position, or fallback to peer_id hash
                let my_slot = if let Some(ref addr) = validator_address {
                    active_validators.iter().position(|a| a == addr).map(|i| i as u64)
                } else {
                    None
                };

                let should_produce = match my_slot {
                    Some(slot) => round_count % validator_count == slot % validator_count,
                    None => {
                        // Not in staking registry — fallback to peer_id hash
                        use std::hash::{Hash, Hasher};
                        let mut hasher = std::collections::hash_map::DefaultHasher::new();
                        local_peer_id.hash(&mut hasher);
                        let peer_hash = hasher.finish();
                        (peer_hash + round_count) % validator_count == 0
                    }
                };

                if !should_produce {
                    debug!("Skipping block production (not my turn, round={}, validators={})",
                        round_count, validator_count);
                    continue;
                }

                debug!("My turn to produce block (round={}, slot={:?})", round_count, my_slot);

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

                    // Compute Merkle state root over all account balances and nonces.
                    // Transactions from the mempool were already applied to state when
                    // they were accepted via eth_sendRawTransaction, so the current
                    // state already reflects the post-transaction account snapshot.
                    let state_root = state.compute_state_root().unwrap_or_else(|e| {
                        tracing::warn!("compute_state_root failed, falling back to zero: {}", e);
                        [0u8; 32]
                    });

                    let proposer = validator_address.clone()
                        .unwrap_or_else(|| "unknown".to_string());

                    let gas_used: u64 = pending_txs.iter()
                        .map(|tx| tx.gas_limit)
                        .fold(0u64, |acc, g| acc.saturating_add(g));

                    let block = Block {
                        number: new_number,
                        hash: block_hash,
                        parent_hash,
                        timestamp,
                        proposer,
                        transactions: pending_txs,
                        state_root,
                        gas_used,
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

                    // Credit block reward to proposer in staking module
                    if let Some(ref addr) = validator_address {
                        let s = staking.read().await;
                        s.record_block_produced(addr, BLOCK_REWARD).await;
                    }

                    // Broadcast our own finality confirmation
                    if let Some(ref addr) = validator_address {
                        let conf = NetworkMessage::BlockConfirmation(
                            BlockConfirmationMessage {
                                block_hash: hash_to_hex(&block_hash),
                                block_number: new_number,
                                validator_address: addr.clone(),
                            }
                        );
                        if let Ok(mut net) = network.try_lock() {
                            let _ = net.publish(conf);
                        }
                    }
                }
            }
        })
    }

    /// Start the sync task that listens for network messages and stores them.
    /// `event_rx` is the receiver end of the channel that the NetworkManager
    /// writes incoming gossipsub messages to.  If `None` (e.g. in tests),
    /// a local dummy channel is created.
    async fn start_sync_task(
        &self,
        event_rx: Option<mpsc::Receiver<NetworkMessage>>,
    ) -> JoinHandle<()> {
        let network = self.network.clone();
        let state = self.state.clone();
        let stats = self.stats.clone();
        let staking = self.staking.clone();
        let mempool = self.mempool.clone();
        let validator_address = self.config.validator_address.clone();

        tokio::spawn(async move {
            info!("Sync task running...");

            let (_guard_tx, fallback_rx) = mpsc::channel::<NetworkMessage>(1);
            let mut rx = event_rx.unwrap_or(fallback_rx);
            let mut finality = FinalityTracker::default();

            loop {
                tokio::select! {
                    Some(msg) = rx.recv() => {
                        match msg {
                            NetworkMessage::Block(block_msg) => {
                                let block_hash = block_msg.hash.clone();
                                let block_number = block_msg.number;
                                if let Err(e) = Self::handle_block_message(
                                    &state,
                                    &stats,
                                    block_msg
                                ).await {
                                    error!("Failed to handle block: {}", e);
                                } else {
                                    // Broadcast our confirmation vote for this peer block
                                    if let Some(ref addr) = validator_address {
                                        let conf = NetworkMessage::BlockConfirmation(
                                            BlockConfirmationMessage {
                                                block_hash: block_hash.clone(),
                                                block_number,
                                                validator_address: addr.clone(),
                                            }
                                        );
                                        if let Ok(mut net) = network.try_lock() {
                                            let _ = net.publish(conf);
                                        }
                                    }
                                }
                            }
                            NetworkMessage::Transaction(tx_msg) => {
                                if let Err(e) = Self::handle_transaction_message(
                                    &state,
                                    &stats,
                                    &mempool,
                                    tx_msg
                                ).await {
                                    error!("Failed to handle transaction: {}", e);
                                }
                            }
                            NetworkMessage::BlockConfirmation(conf_msg) => {
                                // Count finality votes
                                let active_count = {
                                    let s = staking.read().await;
                                    s.get_active_validators().await.len().max(1)
                                };
                                let finalized = finality.record_vote(
                                    &conf_msg.block_hash,
                                    conf_msg.block_number,
                                    &conf_msg.validator_address,
                                    active_count,
                                );
                                if finalized {
                                    info!("✅ FINALIZED block #{} (hash={})",
                                        conf_msg.block_number,
                                        &conf_msg.block_hash[..10]);
                                } else {
                                    debug!("Confirmation for block #{} from {} (active={})",
                                        conf_msg.block_number,
                                        &conf_msg.validator_address,
                                        active_count);
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
        mempool: &Arc<TransactionPool>,
        tx_msg: TransactionMessage,
    ) -> anyhow::Result<()> {
        debug!("Received transaction from network: {}", &tx_msg.hash[..8]);

        {
            let mut s = stats.write().await;
            s.transactions_received += 1;
        }

        // Convert hash from hex string to [u8; 32]
        let hash = hex_to_hash(&tx_msg.hash)
            .map_err(|e| anyhow::anyhow!("Invalid tx hash: {}", e))?;

        // Skip if already in state DB (confirmed)
        if state.get_transaction(&hash).is_ok() {
            debug!("Transaction already confirmed in state");
            return Ok(());
        }

        // Reconstruct full Transaction from propagated message
        let mut tx = Transaction {
            hash,
            from: tx_msg.from,
            to: tx_msg.to,
            value: tx_msg.value,
            gas_price: tx_msg.gas_price,
            gas_limit: tx_msg.gas_limit,
            nonce: tx_msg.nonce,
            data: tx_msg.data,
            signature: tx_msg.signature,
            signer_public_key: tx_msg.signer_public_key,
        };
        tx.compute_hash();

        // Add to mempool — validates signature, nonce ordering, gas price
        match mempool.add_transaction(tx).await {
            Ok(()) => {
                debug!("Transaction added to mempool");
                let mut s = stats.write().await;
                s.transactions_stored += 1;
            }
            Err(PoolError::AlreadyExists) => {
                debug!("Transaction already in mempool");
            }
            Err(e) => {
                debug!("Transaction rejected by mempool: {}", e);
            }
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

        // Convert Transaction to TransactionMessage with all fields for full propagation
        let tx_msg = TransactionMessage {
            hash: hash_to_hex(&tx.hash),
            from: tx.from.clone(),
            to: tx.to.clone(),
            value: tx.value,
            data: tx.data.clone(),
            nonce: tx.nonce,
            signature: tx.signature.clone(),
            gas_price: tx.gas_price,
            gas_limit: tx.gas_limit,
            signer_public_key: tx.signer_public_key.clone(),
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

        // Stop network
        {
            let mut network = self.network.lock().await;
            network.shutdown().await;
            info!("Network layer stopped");
        }

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

    // ── FinalityTracker ───────────────────────────────────────────────────────

    #[test]
    fn test_finality_single_validator_immediately_finalizes() {
        let mut ft = FinalityTracker::default();
        // 1 active validator: threshold = ceil(2/3 * 1) = 1
        let finalized = ft.record_vote("0xhash1", 1, "val1", 1);
        assert!(finalized);
    }

    #[test]
    fn test_finality_three_validators_needs_two_votes() {
        let mut ft = FinalityTracker::default();
        // 3 active validators: threshold = ceil(2*3/3) = 2
        let r1 = ft.record_vote("0xhash1", 1, "val1", 3);
        assert!(!r1, "one vote is not enough");
        let r2 = ft.record_vote("0xhash1", 1, "val2", 3);
        assert!(r2, "two votes should finalize");
    }

    #[test]
    fn test_finality_five_validators_needs_four_votes() {
        let mut ft = FinalityTracker::default();
        // 5 validators: threshold = ceil(10/3) = 4
        assert!(!ft.record_vote("0xh", 1, "v1", 5));
        assert!(!ft.record_vote("0xh", 1, "v2", 5));
        assert!(!ft.record_vote("0xh", 1, "v3", 5));
        assert!(ft.record_vote("0xh", 1, "v4", 5));
    }

    #[test]
    fn test_finality_no_double_finalize() {
        let mut ft = FinalityTracker::default();
        let r1 = ft.record_vote("0xhash1", 1, "val1", 1);
        assert!(r1);
        // Already finalized — subsequent votes return false
        let r2 = ft.record_vote("0xhash1", 1, "val2", 1);
        assert!(!r2);
    }

    #[test]
    fn test_finality_deduplicates_votes_from_same_validator() {
        let mut ft = FinalityTracker::default();
        // Same validator voting twice must not double-count
        ft.record_vote("0xhash1", 1, "val1", 3);
        ft.record_vote("0xhash1", 1, "val1", 3); // duplicate
        // threshold=2; still needs val2
        let result = ft.record_vote("0xhash1", 1, "val2", 3);
        assert!(result);
    }

    #[test]
    fn test_finality_independent_per_block() {
        let mut ft = FinalityTracker::default();
        // Votes for different block hashes are independent
        let r1 = ft.record_vote("0xhash_a", 1, "val1", 1);
        let r2 = ft.record_vote("0xhash_b", 2, "val1", 1);
        assert!(r1);
        assert!(r2);
    }

    // ── NodeConfig.validator_address ─────────────────────────────────────────

    #[test]
    fn test_node_config_validator_address_default_none() {
        let cfg = NodeConfig::dev();
        assert!(cfg.validator_address.is_none());
    }

    #[test]
    fn test_node_config_validator_address_set() {
        let mut cfg = NodeConfig::dev();
        cfg.validator_address = Some("0xabc".to_string());
        assert_eq!(cfg.validator_address.as_deref(), Some("0xabc"));
    }
}
