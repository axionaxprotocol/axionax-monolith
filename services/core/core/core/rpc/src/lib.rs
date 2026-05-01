//! axionax RPC Server
//!
//! JSON-RPC 2.0 API server for blockchain queries and transaction submission

use jsonrpsee::{
    core::{async_trait, RpcResult},
    proc_macros::rpc,
    server::{Server, ServerHandle},
    types::ErrorObjectOwned,
    RpcModule,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tracing::info;

use blockchain::{Block, Transaction, TransactionPool};
use state::StateDB;

pub mod governance_rpc;
pub mod health;
pub mod http_health;
pub mod middleware;
pub mod server;
pub mod staking_rpc;
pub mod ws_logs;

pub use governance_rpc::{
    GovernanceRpcServer, GovernanceRpcServerImpl, GovernanceStatsResponse, ProposalResponse,
};
pub use health::{HealthChecker, HealthStatus, NodeStatus};
pub use http_health::{HealthState, HttpHealthConfig, HttpHealthServer};
pub use middleware::{CorsConfig, RateLimitConfig, RateLimiter, RequestValidator};
pub use staking_rpc::{
    StakingRpcServer, StakingRpcServerImpl, StakingStatsResponse, ValidatorResponse,
};

/// RPC server errors
#[derive(Debug, thiserror::Error)]
pub enum RpcError {
    #[error("Block not found: {0}")]
    BlockNotFound(String),

    #[error("Transaction not found: {0}")]
    TransactionNotFound(String),

    #[error("Invalid parameters: {0}")]
    InvalidParams(String),

    #[error("Internal error: {0}")]
    InternalError(String),

    #[error("State error: {0}")]
    StateError(#[from] state::StateError),
}

impl From<RpcError> for ErrorObjectOwned {
    fn from(error: RpcError) -> Self {
        match error {
            RpcError::BlockNotFound(msg) => ErrorObjectOwned::owned(-32001, msg, None::<()>),
            RpcError::TransactionNotFound(msg) => ErrorObjectOwned::owned(-32002, msg, None::<()>),
            RpcError::InvalidParams(msg) => ErrorObjectOwned::owned(-32602, msg, None::<()>),
            RpcError::InternalError(msg) => ErrorObjectOwned::owned(-32603, msg, None::<()>),
            RpcError::StateError(e) => ErrorObjectOwned::owned(-32603, e.to_string(), None::<()>),
        }
    }
}

/// Block response format (simplified)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockResponse {
    pub number: String,      // hex-encoded
    pub hash: String,        // hex-encoded
    pub parent_hash: String, // hex-encoded
    pub timestamp: String,   // hex-encoded
    pub proposer: String,
    pub transactions: Vec<String>, // tx hashes (hex-encoded)
    pub state_root: String,        // hex-encoded
    pub gas_used: String,          // hex-encoded
    pub gas_limit: String,         // hex-encoded
}

impl From<Block> for BlockResponse {
    fn from(block: Block) -> Self {
        BlockResponse {
            number: format!("0x{:x}", block.number),
            hash: format!("0x{}", hex::encode(block.hash)),
            parent_hash: format!("0x{}", hex::encode(block.parent_hash)),
            timestamp: format!("0x{:x}", block.timestamp),
            proposer: block.proposer,
            transactions: block
                .transactions
                .iter()
                .map(|tx| format!("0x{}", hex::encode(tx.hash)))
                .collect(),
            state_root: format!("0x{}", hex::encode(block.state_root)),
            gas_used: format!("0x{:x}", block.gas_used),
            gas_limit: format!("0x{:x}", block.gas_limit),
        }
    }
}

/// Transaction response format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResponse {
    pub hash: String, // hex-encoded
    pub from: String,
    pub to: String,
    pub value: String,     // hex-encoded
    pub gas_price: String, // hex-encoded
    pub gas_limit: String, // hex-encoded
    pub nonce: String,     // hex-encoded
    pub data: String,      // hex-encoded
}

impl From<Transaction> for TransactionResponse {
    fn from(tx: Transaction) -> Self {
        TransactionResponse {
            hash: format!("0x{}", hex::encode(tx.hash)),
            from: tx.from,
            to: tx.to,
            value: format!("0x{:x}", tx.value),
            gas_price: format!("0x{:x}", tx.gas_price),
            gas_limit: format!("0x{:x}", tx.gas_limit),
            nonce: format!("0x{:x}", tx.nonce),
            data: format!("0x{}", hex::encode(tx.data)),
        }
    }
}

/// Transaction receipt response format (Ethereum-compatible fields).
///
/// Since axionax tx execution is all-or-nothing (tx is applied atomically when
/// accepted via `eth_sendRawTransaction` or when included in a produced block),
/// `status` is always `0x1` for successfully indexed receipts. If a tx is not
/// found in the state DB, the RPC returns `None` (JSON `null`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceiptResponse {
    pub transaction_hash: String,
    pub transaction_index: String, // hex-encoded position in block
    pub block_hash: String,
    pub block_number: String,
    pub from: String,
    pub to: Option<String>, // None for contract creation (not yet supported)
    pub cumulative_gas_used: String,
    pub gas_used: String,
    pub contract_address: Option<String>,
    pub logs: Vec<serde_json::Value>,
    pub logs_bloom: String,
    pub status: String, // "0x1" success, "0x0" failure
    #[serde(rename = "type")]
    pub tx_type: String,
    pub effective_gas_price: String,
}

/// Ethereum-compatible JSON-RPC API
#[rpc(server)]
pub trait AxionaxRpc {
    /// Get current block number (chain height)
    #[method(name = "eth_blockNumber")]
    async fn block_number(&self) -> RpcResult<String>;

    /// Get block by number
    #[method(name = "eth_getBlockByNumber")]
    async fn get_block_by_number(
        &self,
        block_number: String,
        full_transactions: bool,
    ) -> RpcResult<Option<BlockResponse>>;

    /// Get block by hash
    #[method(name = "eth_getBlockByHash")]
    async fn get_block_by_hash(
        &self,
        block_hash: String,
        full_transactions: bool,
    ) -> RpcResult<Option<BlockResponse>>;

    /// Get transaction by hash
    #[method(name = "eth_getTransactionByHash")]
    async fn get_transaction_by_hash(
        &self,
        tx_hash: String,
    ) -> RpcResult<Option<TransactionResponse>>;

    /// Get chain ID
    #[method(name = "eth_chainId")]
    async fn chain_id(&self) -> RpcResult<String>;

    /// Net version (chain ID as string)
    #[method(name = "net_version")]
    async fn net_version(&self) -> RpcResult<String>;

    /// Get account balance (hex wei)
    #[method(name = "eth_getBalance")]
    async fn get_balance(&self, address: String, block: String) -> RpcResult<String>;

    /// Get account nonce
    #[method(name = "eth_getTransactionCount")]
    async fn get_transaction_count(&self, address: String, block: String) -> RpcResult<String>;

    /// Send raw transaction
    #[method(name = "eth_sendRawTransaction")]
    async fn send_raw_transaction(&self, tx_hex: String) -> RpcResult<String>;

    /// Get transaction receipt by hash. Returns None if tx not indexed yet.
    #[method(name = "eth_getTransactionReceipt")]
    async fn get_transaction_receipt(&self, tx_hash: String)
        -> RpcResult<Option<ReceiptResponse>>;

    /// Get current gas price (hex-encoded wei). Returns the chain's min gas price.
    #[method(name = "eth_gasPrice")]
    async fn gas_price(&self) -> RpcResult<String>;

    /// Get number of connected peers (hex-encoded).
    #[method(name = "net_peerCount")]
    async fn net_peer_count(&self) -> RpcResult<String>;
}

/// RPC server implementation
pub struct AxionaxRpcServerImpl {
    state: Arc<StateDB>,
    mempool: Option<Arc<TransactionPool>>, // Optional for now to avoid breaking tests/other uses
    chain_id: u64,
}

impl AxionaxRpcServerImpl {
    /// Create new RPC server
    pub fn new(state: Arc<StateDB>, chain_id: u64) -> Self {
        Self {
            state,
            mempool: None,
            chain_id,
        }
    }

    /// Set mempool
    pub fn with_mempool(mut self, mempool: Arc<TransactionPool>) -> Self {
        self.mempool = Some(mempool);
        self
    }
}

#[async_trait]
impl AxionaxRpcServer for AxionaxRpcServerImpl {
    async fn block_number(&self) -> RpcResult<String> {
        let height = self.state.get_chain_height().map_err(RpcError::from)?;

        Ok(format!("0x{:x}", height))
    }

    async fn get_block_by_number(
        &self,
        block_number: String,
        _full_transactions: bool,
    ) -> RpcResult<Option<BlockResponse>> {
        // Parse block number (hex or "latest")
        let number = if block_number == "latest" {
            self.state.get_chain_height().map_err(RpcError::from)?
        } else {
            parse_hex_u64(&block_number).map_err(RpcError::InvalidParams)?
        };

        match self.state.get_block_by_number(number) {
            Ok(block) => Ok(Some(block.into())),
            Err(state::StateError::BlockNotFound(_)) => Ok(None),
            Err(e) => Err(RpcError::from(e).into()),
        }
    }

    async fn get_block_by_hash(
        &self,
        block_hash: String,
        _full_transactions: bool,
    ) -> RpcResult<Option<BlockResponse>> {
        let hash = parse_hex_hash(&block_hash).map_err(RpcError::InvalidParams)?;

        match self.state.get_block_by_hash(&hash) {
            Ok(block) => Ok(Some(block.into())),
            Err(state::StateError::BlockNotFound(_)) => Ok(None),
            Err(e) => Err(RpcError::from(e).into()),
        }
    }

    async fn get_transaction_by_hash(
        &self,
        tx_hash: String,
    ) -> RpcResult<Option<TransactionResponse>> {
        let hash = parse_hex_hash(&tx_hash).map_err(RpcError::InvalidParams)?;

        match self.state.get_transaction(&hash) {
            Ok(tx) => Ok(Some(tx.into())),
            Err(state::StateError::TransactionNotFound(_)) => Ok(None),
            Err(e) => Err(RpcError::from(e).into()),
        }
    }

    async fn chain_id(&self) -> RpcResult<String> {
        Ok(format!("0x{:x}", self.chain_id))
    }

    async fn net_version(&self) -> RpcResult<String> {
        Ok(self.chain_id.to_string())
    }

    async fn get_balance(&self, address: String, _block: String) -> RpcResult<String> {
        let balance = self
            .state
            .get_balance(address.as_str())
            .map_err(RpcError::from)?;
        Ok(format!("0x{:x}", balance))
    }

    async fn get_transaction_count(&self, address: String, _block: String) -> RpcResult<String> {
        let nonce = self
            .state
            .get_nonce(address.as_str())
            .map_err(RpcError::from)?;
        Ok(format!("0x{:x}", nonce))
    }

    async fn send_raw_transaction(&self, tx_hex: String) -> RpcResult<String> {
        let mempool = self
            .mempool
            .as_ref()
            .ok_or_else(|| RpcError::InternalError("Mempool not available".to_string()))?;

        let bytes = hex::decode(tx_hex.strip_prefix("0x").unwrap_or(&tx_hex))
            .map_err(|e| RpcError::InvalidParams(format!("Invalid hex: {}", e)))?;

        let mut tx: Transaction = serde_json::from_slice(&bytes)
            .map_err(|e| RpcError::InvalidParams(format!("Invalid transaction format: {}", e)))?;

        // Require a valid Ed25519 signature
        if !tx.is_signed() {
            return Err(RpcError::InvalidParams(
                "Transaction must include signature and signer_public_key".to_string(),
            )
            .into());
        }

        if !tx.verify_signature() {
            return Err(RpcError::InvalidParams(
                "Invalid transaction signature or signer address mismatch".to_string(),
            )
            .into());
        }

        // Nonce validation — must match the sender's current nonce to prevent replays
        let expected_nonce = self.state.get_nonce(&tx.from).unwrap_or(0);
        if tx.nonce != expected_nonce {
            return Err(RpcError::InvalidParams(format!(
                "Nonce mismatch: expected {}, got {}",
                expected_nonce, tx.nonce
            ))
            .into());
        }

        if tx.hash == [0u8; 32] {
            tx.compute_hash();
        }

        let tx_hash = format!("0x{}", hex::encode(tx.hash));

        mempool
            .add_transaction(tx.clone())
            .await
            .map_err(|e| RpcError::InternalError(e.to_string()))?;

        // Apply transfer to state so balance/nonce update immediately (single-node / testnet).
        if let Err(e) = self.state.apply_transaction(&tx) {
            tracing::warn!(
                "apply_transaction after mempool add failed (tx may still be in pool): {}",
                e
            );
        }

        Ok(tx_hash)
    }

    async fn get_transaction_receipt(
        &self,
        tx_hash: String,
    ) -> RpcResult<Option<ReceiptResponse>> {
        let hash = parse_hex_hash(&tx_hash).map_err(RpcError::InvalidParams)?;

        // Look up the transaction first; if it's not indexed we return None.
        let tx = match self.state.get_transaction(&hash) {
            Ok(t) => t,
            Err(state::StateError::TransactionNotFound(_)) => return Ok(None),
            Err(e) => return Err(RpcError::from(e).into()),
        };

        // Look up which block contains it; also returns None gracefully.
        let block_hash = match self.state.get_transaction_block(&hash) {
            Ok(h) => h,
            Err(state::StateError::TransactionNotFound(_)) => return Ok(None),
            Err(e) => return Err(RpcError::from(e).into()),
        };

        let block = match self.state.get_block_by_hash(&block_hash) {
            Ok(b) => b,
            Err(state::StateError::BlockNotFound(_)) => return Ok(None),
            Err(e) => return Err(RpcError::from(e).into()),
        };

        let tx_index = block
            .transactions
            .iter()
            .position(|t| t.hash == tx.hash)
            .unwrap_or(0);

        let to = if tx.to.is_empty() {
            None
        } else {
            Some(tx.to.clone())
        };

        Ok(Some(ReceiptResponse {
            transaction_hash: format!("0x{}", hex::encode(tx.hash)),
            transaction_index: format!("0x{:x}", tx_index),
            block_hash: format!("0x{}", hex::encode(block.hash)),
            block_number: format!("0x{:x}", block.number),
            from: tx.from,
            to,
            cumulative_gas_used: format!("0x{:x}", tx.gas_limit),
            gas_used: format!("0x{:x}", tx.gas_limit),
            contract_address: None,
            logs: vec![],
            logs_bloom: format!("0x{}", "0".repeat(512)),
            status: "0x1".to_string(),
            tx_type: "0x0".to_string(),
            effective_gas_price: format!("0x{:x}", tx.gas_price),
        }))
    }

    async fn gas_price(&self) -> RpcResult<String> {
        // Chain's configured minimum gas price (1 Gwei). Dynamic pricing could
        // be wired through PPC later.
        Ok(format!("0x{:x}", 1_000_000_000u64))
    }

    async fn net_peer_count(&self) -> RpcResult<String> {
        Ok(format!("0x{:x}", metrics::PEERS_CONNECTED.get() as u64))
    }
}

/// Start RPC server (eth_* + staking_* + gov_* + system_* + metrics_* + events WS)
pub async fn start_rpc_server(
    addr: SocketAddr,
    state: Arc<StateDB>,
    chain_id: u64,
    mempool: Option<Arc<TransactionPool>>,
    event_bus: Option<Arc<events::EventBus>>,
) -> anyhow::Result<ServerHandle> {
    info!("Starting RPC server on {}", addr);

    // Build CORS layer — restrict origins in production, allow all in dev.
    let cors = {
        use http::Method;
        use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};

        let allowed_origins = std::env::var("AXIONAX_RPC_CORS_ORIGINS").unwrap_or_default();

        if allowed_origins.is_empty() || allowed_origins == "*" {
            CorsLayer::permissive()
        } else {
            let origins: Vec<http::HeaderValue> = allowed_origins
                .split(',')
                .filter_map(|s| s.trim().parse().ok())
                .collect();
            CorsLayer::new()
                .allow_origin(AllowOrigin::list(origins))
                .allow_methods(AllowMethods::list([Method::POST, Method::OPTIONS]))
                .allow_headers(AllowHeaders::list([http::header::CONTENT_TYPE]))
        }
    };

    let rate_limit_rps: u64 = std::env::var("AXIONAX_RPC_RATE_LIMIT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(100);

    let middleware = tower::ServiceBuilder::new()
        .layer(tower::buffer::BufferLayer::new(1024))
        .layer(tower::limit::RateLimitLayer::new(
            rate_limit_rps,
            std::time::Duration::from_secs(1),
        ))
        .layer(cors);

    let server = Server::builder()
        .set_http_middleware(middleware)
        .max_request_body_size(1_048_576) // 1 MB max request
        .max_response_body_size(10_485_760) // 10 MB max response
        .max_connections(1_000)
        .build(addr)
        .await?;

    let mut rpc_impl = AxionaxRpcServerImpl::new(state.clone(), chain_id);
    if let Some(pool) = mempool {
        rpc_impl = rpc_impl.with_mempool(pool);
    }

    let mut module = rpc_impl.into_rpc();

    module.merge(build_system_module(state, chain_id)?)?;

    if let Some(bus) = event_bus {
        module.merge(build_events_module(bus)?)?;
    }

    let handle = server.start(module);
    info!(
        "RPC server started (eth_* + system_* + events WS, rate_limit={}/s)",
        rate_limit_rps
    );
    Ok(handle)
}

/// Extended version that also wires staking_* and gov_* endpoints.
pub async fn start_rpc_server_full(
    addr: SocketAddr,
    state: Arc<StateDB>,
    chain_id: u64,
    mempool: Option<Arc<TransactionPool>>,
    event_bus: Option<Arc<events::EventBus>>,
    staking: Option<Arc<tokio::sync::RwLock<staking::Staking>>>,
    governance: Option<(
        Arc<tokio::sync::RwLock<governance::Governance>>,
        Arc<tokio::sync::RwLock<staking::Staking>>,
    )>,
) -> anyhow::Result<ServerHandle> {
    info!("Starting full RPC server on {}", addr);

    // Build CORS layer
    let cors = {
        use http::Method;
        use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
        let allowed_origins = std::env::var("AXIONAX_RPC_CORS_ORIGINS").unwrap_or_default();
        if allowed_origins.is_empty() || allowed_origins == "*" {
            CorsLayer::permissive()
        } else {
            let origins: Vec<http::HeaderValue> = allowed_origins
                .split(',')
                .filter_map(|s| s.trim().parse().ok())
                .collect();
            CorsLayer::new()
                .allow_origin(AllowOrigin::list(origins))
                .allow_methods(AllowMethods::list([Method::POST, Method::OPTIONS]))
                .allow_headers(AllowHeaders::list([http::header::CONTENT_TYPE]))
        }
    };
    let rate_limit_rps: u64 = std::env::var("AXIONAX_RPC_RATE_LIMIT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(100);

    let middleware = tower::ServiceBuilder::new()
        .layer(tower::buffer::BufferLayer::new(1024))
        .layer(tower::limit::RateLimitLayer::new(
            rate_limit_rps,
            std::time::Duration::from_secs(1),
        ))
        .layer(cors);

    let server = Server::builder()
        .set_http_middleware(middleware)
        .max_request_body_size(1_048_576)
        .max_response_body_size(10_485_760)
        .max_connections(1_000)
        .build(addr)
        .await?;

    info!("RPC middleware: CORS + rate_limit={}/s", rate_limit_rps);

    let mut rpc_impl = AxionaxRpcServerImpl::new(state.clone(), chain_id);
    if let Some(pool) = mempool {
        rpc_impl = rpc_impl.with_mempool(pool);
    }
    let mut module = rpc_impl.into_rpc();

    module.merge(build_system_module(state, chain_id)?)?;

    if let Some(bus) = event_bus {
        module.merge(build_events_module(bus)?)?;
    }

    // Merge staking RPC (staking_*)
    if let Some(staking_ref) = staking {
        let staking_rpc = StakingRpcServerImpl::new(staking_ref, staking::StakingConfig::default());
        module.merge(staking_rpc.into_rpc())?;
        info!("Staking RPC methods registered");
    }

    // Merge governance RPC (gov_*)
    if let Some((gov_ref, staking_for_gov)) = governance {
        let gov_rpc = GovernanceRpcServerImpl::new(
            gov_ref,
            staking_for_gov,
            governance::GovernanceConfig::default(),
        );
        module.merge(gov_rpc.into_rpc())?;
        info!("Governance RPC methods registered");
    }

    let handle = server.start(module);
    info!("Full RPC server started (eth_* + staking_* + gov_* + system_* + metrics_* + events WS)");
    Ok(handle)
}

fn build_system_module(state: Arc<StateDB>, chain_id: u64) -> anyhow::Result<RpcModule<()>> {
    let mut module = RpcModule::new(());
    let state_for_status = state.clone();
    module.register_method("system_status", move |_, _, _| {
        let block_height = state_for_status
            .get_chain_height()
            .unwrap_or(0);
        Ok::<_, ErrorObjectOwned>(serde_json::json!({
            "chain_id": chain_id,
            "chain_name": if chain_id == 86137 { "Axionax Testnet" } else if chain_id == 86150 { "Axionax Mainnet" } else { "Axionax Dev" },
            "block_height": block_height,
            "peers": metrics::PEERS_CONNECTED.get(),
            "sync_status": "synced",
            "version": env!("CARGO_PKG_VERSION"),
            "uptime_seconds": metrics::UPTIME_SECONDS.get(),
        }))
    })?;

    let state_for_health = state.clone();
    module.register_method("system_health", move |_, _, _| {
        let db_ok = state_for_health.get_chain_height().is_ok();
        let block_height = state_for_health.get_chain_height().unwrap_or(0);
        let peers = metrics::PEERS_CONNECTED.get();
        let network_ok = peers > 0;
        let consensus_ok = block_height > 0;
        let healthy = db_ok && (network_ok || consensus_ok);
        Ok::<_, ErrorObjectOwned>(serde_json::json!({
            "status": if healthy { "healthy" } else { "starting" },
            "block_height": block_height,
            "peers": peers,
            "sync_status": if block_height > 0 { "synced" } else { "syncing" },
            "checks": {
                "database": db_ok,
                "network": network_ok,
                "consensus": consensus_ok,
            },
        }))
    })?;

    module.register_method("system_version", |_, _, _| {
        Ok::<_, ErrorObjectOwned>(serde_json::json!({
            "version": env!("CARGO_PKG_VERSION"),
            "name": "axionax-core",
            "build": "release",
        }))
    })?;

    module.register_method("metrics_prometheus", |_, _, _| {
        Ok::<_, ErrorObjectOwned>(metrics::export())
    })?;

    module.register_method("metrics_json", |_, _, _| {
        Ok::<_, ErrorObjectOwned>(serde_json::json!({
            "block_height": metrics::BLOCK_HEIGHT.get(),
            "tx_total": metrics::TX_TOTAL.get(),
            "tx_per_second": metrics::TX_PER_SECOND.get(),
            "peers_connected": metrics::PEERS_CONNECTED.get(),
            "validators_active": metrics::VALIDATORS_ACTIVE.get(),
            "mempool_size": metrics::MEMPOOL_SIZE.get(),
            "uptime_seconds": metrics::UPTIME_SECONDS.get(),
        }))
    })?;

    Ok(module)
}

/// Build the WebSocket events subscription module.
fn build_events_module(bus: Arc<events::EventBus>) -> anyhow::Result<RpcModule<()>> {
    use jsonrpsee::SubscriptionMessage;

    let mut module = RpcModule::new(());

    let bus_for_sub = bus.clone();
    module.register_subscription(
        "events_subscribe",
        "events_notification",
        "events_unsubscribe",
        move |params: jsonrpsee::types::Params<'static>,
              pending: jsonrpsee::PendingSubscriptionSink,
              _ctx: std::sync::Arc<()>,
              _ext: jsonrpsee::Extensions| {
            let bus = bus_for_sub.clone();
            async move {
                let event_types: Vec<String> = params.parse()?;

                let types: Vec<events::EventType> = event_types
                    .iter()
                    .map(|s| match s.as_str() {
                        "newBlock" | "NewBlock" => events::EventType::NewBlock,
                        "newTransaction" | "NewTransaction" => events::EventType::NewTransaction,
                        "stake" | "Stake" => events::EventType::Stake,
                        "vote" | "Vote" => events::EventType::Vote,
                        "peerConnected" | "PeerConnected" => events::EventType::PeerConnected,
                        _ => events::EventType::All,
                    })
                    .collect();

                let mut sub = match bus.subscribe(types).await {
                    Some(s) => s,
                    None => {
                        return Err(ErrorObjectOwned::owned(
                            -32000,
                            "Max subscriptions reached",
                            None::<()>,
                        )
                        .into());
                    }
                };
                let sink = pending.accept().await?;

                tokio::spawn(async move {
                    loop {
                        match sub.recv().await {
                            Ok(event) => {
                                if let Ok(msg) = SubscriptionMessage::from_json(&event) {
                                    if sink.send(msg).await.is_err() {
                                        break;
                                    }
                                }
                            }
                            Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                        }
                    }
                });

                Ok(())
            }
        },
    )?;

    let bus_for_history = bus.clone();
    module.register_method("events_getRecent", move |params, _, _| {
        let (count,): (usize,) = params.parse()?;
        let bus = bus_for_history.clone();
        let rt = tokio::runtime::Handle::current();
        let events = rt.block_on(bus.get_history(count.min(100)));
        Ok::<_, ErrorObjectOwned>(serde_json::json!({
            "events": events,
            "count": events.len(),
        }))
    })?;

    Ok(module)
}

/// Parse hex string to u64
fn parse_hex_u64(hex: &str) -> Result<u64, String> {
    let hex = hex.strip_prefix("0x").unwrap_or(hex);
    u64::from_str_radix(hex, 16).map_err(|e| format!("Invalid hex number: {}", e))
}

/// Parse hex string to 32-byte hash
fn parse_hex_hash(hex: &str) -> Result<[u8; 32], String> {
    let hex = hex.strip_prefix("0x").unwrap_or(hex);

    if hex.len() != 64 {
        return Err(format!(
            "Invalid hash length: expected 64 hex chars, got {}",
            hex.len()
        ));
    }

    let bytes = hex::decode(hex).map_err(|e| format!("Invalid hex string: {}", e))?;

    let mut hash = [0u8; 32];
    hash.copy_from_slice(&bytes);
    Ok(hash)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_state() -> Arc<StateDB> {
        let temp_dir = TempDir::new().unwrap();
        Arc::new(StateDB::open(temp_dir.path()).unwrap())
    }

    #[tokio::test]
    async fn test_rpc_block_number() {
        let state = create_test_state();
        let rpc = AxionaxRpcServerImpl::new(state, 86137);

        let result = rpc.block_number().await.unwrap();
        assert_eq!(result, "0x0"); // Genesis state
    }

    #[tokio::test]
    async fn test_rpc_chain_id() {
        let state = create_test_state();
        let rpc = AxionaxRpcServerImpl::new(state, 86137);

        let result = rpc.chain_id().await.unwrap();
        assert_eq!(result, "0x15079"); // 86137 in hex
    }

    #[tokio::test]
    async fn test_rpc_net_version() {
        let state = create_test_state();
        let rpc = AxionaxRpcServerImpl::new(state, 86137);

        let result = rpc.net_version().await.unwrap();
        assert_eq!(result, "86137");
    }

    #[test]
    fn test_parse_hex_u64() {
        assert_eq!(parse_hex_u64("0x10").unwrap(), 16);
        assert_eq!(parse_hex_u64("10").unwrap(), 16);
        assert_eq!(parse_hex_u64("0xff").unwrap(), 255);
        assert!(parse_hex_u64("invalid").is_err());
    }

    #[test]
    fn test_parse_hex_hash() {
        let hash_str = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        let result = parse_hex_hash(hash_str).unwrap();
        assert_eq!(result.len(), 32);
        assert_eq!(result[0], 0x12);
        assert_eq!(result[31], 0xef);

        // Invalid length
        assert!(parse_hex_hash("0x1234").is_err());

        // Invalid hex
        assert!(parse_hex_hash(
            "0xZZZZ567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        .is_err());
    }

    #[tokio::test]
    async fn test_rpc_get_block_not_found() {
        let state = create_test_state();
        let rpc = AxionaxRpcServerImpl::new(state, 86137);

        let result = rpc
            .get_block_by_number("0x999".to_string(), false)
            .await
            .unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_rpc_get_transaction_not_found() {
        let state = create_test_state();
        let rpc = AxionaxRpcServerImpl::new(state, 86137);

        let hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        let result = rpc.get_transaction_by_hash(hash.to_string()).await.unwrap();
        assert!(result.is_none());
    }
}
