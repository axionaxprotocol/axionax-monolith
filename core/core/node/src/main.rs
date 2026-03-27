//! axionax-node — Main binary for running a full blockchain node.
//!
//! Supports the same flags used in docker-compose (--role, --chain, --rpc,
//! --p2p, --telemetry, --unsafe-rpc) as well as the legacy --rpc_addr and
//! --chain_id flags. Use --help for full options.

use clap::{Parser, ValueEnum};
use node::{AxionaxNode, NodeConfig};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::Instant;
use tokio::time::{sleep, Duration};
use tracing::{info, warn, Level};
use tracing_subscriber::fmt;

#[derive(Debug, Clone, ValueEnum)]
enum NodeRole {
    Validator,
    Rpc,
    Bootnode,
    Full,
}

impl std::fmt::Display for NodeRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NodeRole::Validator => write!(f, "validator"),
            NodeRole::Rpc => write!(f, "rpc"),
            NodeRole::Bootnode => write!(f, "bootnode"),
            NodeRole::Full => write!(f, "full"),
        }
    }
}

#[derive(Parser, Debug)]
#[command(name = "axionax-node")]
#[command(author, version, about = "Axionax Protocol full node")]
struct Args {
    /// Node role (validator, rpc, bootnode, full)
    #[arg(long, value_enum, default_value_t = NodeRole::Full)]
    role: NodeRole,

    /// Path to genesis JSON file (overrides --chain_id if both provided)
    #[arg(long)]
    chain: Option<PathBuf>,

    /// Chain ID (86137=testnet, 86150=mainnet, other=dev)
    #[arg(long, default_value_t = 86137)]
    chain_id: u64,

    /// State database path
    #[arg(long, default_value = "/tmp/axionax-state")]
    state_path: PathBuf,

    /// RPC listen address (alias: --rpc_addr)
    #[arg(long, aliases = ["rpc_addr", "rpc-addr"], default_value = "127.0.0.1:8545")]
    rpc: SocketAddr,

    /// P2P listen address (e.g. 0.0.0.0:30333)
    #[arg(long)]
    p2p: Option<SocketAddr>,

    /// Path to node identity key file (libp2p keypair). If missing, creates one on first run. Omit for ephemeral key.
    #[arg(long, alias = "key-file")]
    identity_key: Option<PathBuf>,

    /// Telemetry endpoint URL (omit to run in self-sufficient mode)
    #[arg(long)]
    telemetry: Option<String>,

    /// Allow unsafe RPC methods (e.g. eth_sendRawTransaction without auth)
    #[arg(long)]
    unsafe_rpc: bool,

    /// Demo mode (simulated blocks for testing)
    #[arg(long)]
    demo_mode: bool,

    /// Block time in seconds (overrides config/genesis)
    #[arg(long)]
    block_time: Option<u64>,

    /// Staking address of this validator (0x-prefixed hex). Required for block rewards.
    /// Can also be set via AXIONAX_VALIDATOR_ADDRESS env variable.
    #[arg(long)]
    validator_address: Option<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    fmt().with_max_level(Level::INFO).init();
    let args = Args::parse();

    info!("axionax-node starting (role={})", args.role);

    let chain_id = resolve_chain_id(&args);

    let mut config = match chain_id {
        86137 => NodeConfig::testnet(),
        86150 => NodeConfig::mainnet(),
        _ => NodeConfig::dev(),
    };

    // If chain genesis is provided, try parsing blockTime from it
    if let Some(ref chain_path) = args.chain {
        if let Ok(contents) = std::fs::read_to_string(chain_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&contents) {
                if let Some(bt) = json.get("config")
                    .and_then(|c| c.get("axionax"))
                    .and_then(|a| a.get("blockTime"))
                    .and_then(|v| v.as_u64()) 
                {
                    config.network.block_time_seconds = bt;
                    info!("Adopted block_time_seconds={} from genesis.json", bt);
                }
            }
        }
    }

    // CLI --block-time overrides genesis
    if let Some(bt) = args.block_time {
        config.network.block_time_seconds = bt;
        info!("Overriding block_time_seconds={} from CLI", bt);
    }

    config.state_path = args.state_path.to_string_lossy().to_string();
    config.rpc_addr = args.rpc;
    config.network.chain_id = chain_id;

    // Validator address: CLI arg > env variable
    config.validator_address = args.validator_address
        .or_else(|| std::env::var("AXIONAX_VALIDATOR_ADDRESS").ok());
    if let Some(ref addr) = config.validator_address {
        info!("Validator address: {}", addr);
    }

    if let Some(p2p_addr) = args.p2p {
        config.network.listen_addr = p2p_addr.ip().to_string();
        config.network.port = p2p_addr.port();
    }

    if let Some(ref path) = args.identity_key {
        config.network.key_file = Some(path.clone());
    }

    // Override bootstrap nodes from env (for VPS: comma-separated multiaddrs)
    if let Ok(bootstrap) = std::env::var("AXIONAX_BOOTSTRAP_NODES") {
        let nodes: Vec<String> = bootstrap
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !nodes.is_empty() {
            config.network.bootstrap_nodes = nodes;
            info!("Bootstrap nodes from env: {} node(s)", config.network.bootstrap_nodes.len());
        }
    }

    match &args.telemetry {
        Some(url) => info!("Telemetry → {}", url),
        None => info!("Telemetry disabled (self-sufficient mode)"),
    }

    if args.unsafe_rpc {
        info!("Unsafe RPC methods enabled");
    }

    metrics::init();

    let mut node = AxionaxNode::new(config).await?;
    node.start(&args.role.to_string()).await?;

    let start = Instant::now();

    info!(
        "axionax-node running  role={} rpc={} chain_id={}",
        args.role, args.rpc, chain_id
    );

    loop {
        sleep(Duration::from_secs(10)).await;
        let stats = node.stats().await;
        let peers = node.peer_count().await;

        metrics::BLOCK_HEIGHT.set(stats.blocks_stored as i64);
        metrics::PEERS_CONNECTED.set(peers as i64);
        metrics::UPTIME_SECONDS.set(start.elapsed().as_secs() as i64);

        info!("blocks={} peers={} uptime={}s", stats.blocks_stored, peers, start.elapsed().as_secs());
    }
}

/// If --chain points to a genesis JSON file, try to extract chain_id from it;
/// otherwise fall back to --chain_id.
fn resolve_chain_id(args: &Args) -> u64 {
    let Some(ref chain_path) = args.chain else {
        return args.chain_id;
    };

    match std::fs::read_to_string(chain_path) {
        Ok(contents) => serde_json::from_str::<serde_json::Value>(&contents)
            .ok()
            .and_then(|g| g.get("chain_id").and_then(|v| v.as_u64()))
            .unwrap_or_else(|| {
                warn!(
                    "Could not extract chain_id from {}, using --chain_id={}",
                    chain_path.display(),
                    args.chain_id
                );
                args.chain_id
            }),
        Err(e) => {
            warn!(
                "Could not read {}: {}, using --chain_id={}",
                chain_path.display(),
                e,
                args.chain_id
            );
            args.chain_id
        }
    }
}
