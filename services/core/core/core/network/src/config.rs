//! Network configuration

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;

/// Network layer configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// Listen address for P2P networking
    pub listen_addr: String,

    /// Port for P2P connections
    pub port: u16,

    /// Maximum number of peers
    pub max_peers: usize,

    /// Minimum number of peers to maintain
    pub min_peers: usize,

    /// Bootstrap nodes for initial peer discovery
    pub bootstrap_nodes: Vec<String>,

    /// Enable mDNS for local peer discovery
    pub enable_mdns: bool,

    /// Enable Kademlia DHT
    pub enable_kad: bool,

    /// Gossipsub message cache size
    pub gossipsub_cache_size: usize,

    /// Message validation mode
    pub validation_mode: ValidationMode,

    /// Connection idle timeout
    pub idle_timeout: Duration,

    /// Network protocol version
    pub protocol_version: String,

    /// Chain ID for network isolation
    pub chain_id: u64,

    /// Path to persist the node's identity keypair.
    /// If the file exists, the keypair is loaded from it; otherwise a new one
    /// is generated and saved.  `None` means generate an ephemeral keypair
    /// (suitable for tests only).
    #[serde(default)]
    pub key_file: Option<PathBuf>,

    /// Block time in seconds
    pub block_time_seconds: u64,

    /// How to advertise the node's reachable address(es) to peers.
    /// See [`ExternalAddrStrategy`] for trade-offs.
    #[serde(default)]
    pub external_addr_strategy: ExternalAddrStrategy,

    /// Operator-supplied multiaddrs to advertise when
    /// `external_addr_strategy = Manual`. Each entry must be a valid libp2p
    /// multiaddr, e.g. `/ip4/203.0.113.7/tcp/30303`.
    #[serde(default)]
    pub external_addrs: Vec<String>,
}

/// Gossipsub validation mode
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationMode {
    /// No validation (development only)
    None,
    /// Basic signature validation
    Permissive,
    /// Strict validation
    Strict,
}

/// How the node should advertise its publicly-reachable address(es).
///
/// - **`Manual`**: operator-provided list of multiaddrs (e.g. `/ip4/1.2.3.4/tcp/30303`)
///   sourced from `external_addrs` or the `AXIONAX_EXTERNAL_ADDRS` env var. Use
///   this on VPS / cloud nodes where the public IP is known.
/// - **`Auto`** (default): rely on libp2p `Identify` for peers to *report* the
///   observed address. Works once at least one peer is reached but can't help
///   bootstrap if the node is fully behind NAT.
/// - **`Disabled`**: never advertise an external address (test harnesses,
///   air-gapped runs).
///
/// > AutoNAT / STUN remain on the roadmap; Manual + Auto cover the >95% case
/// > on the testnet today.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub enum ExternalAddrStrategy {
    /// Use addresses from `NetworkConfig::external_addrs`.
    Manual,
    /// Let the Identify protocol discover the observed address.
    #[default]
    Auto,
    /// Do not advertise any external address.
    Disabled,
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            listen_addr: "0.0.0.0".to_string(),
            port: 30303,
            max_peers: 50,
            min_peers: 5,
            bootstrap_nodes: vec![],
            enable_mdns: true,
            enable_kad: true,
            gossipsub_cache_size: 1000,
            validation_mode: ValidationMode::Strict,
            idle_timeout: Duration::from_secs(60),
            protocol_version: "1.0.0".to_string(),
            chain_id: 86137, // axionax Testnet
            key_file: None,
            block_time_seconds: 5,
            external_addr_strategy: ExternalAddrStrategy::Auto,
            external_addrs: Vec::new(),
        }
    }
}

impl NetworkConfig {
    /// Resolve the effective list of external multiaddrs the node should
    /// advertise.
    ///
    /// Resolution order (first wins):
    ///
    /// 1. `AXIONAX_EXTERNAL_ADDRS` — comma-separated multiaddrs.
    ///    *Example:* `/ip4/46.250.244.4/tcp/30303,/ip4/46.250.244.4/udp/30303/quic-v1`
    /// 2. `AXIONAX_PUBLIC_IP` — bare IPv4/IPv6 literal. We synthesize
    ///    `/ip4/<IP>/tcp/<port>` from it. This is the convenient form for
    ///    Docker / systemd operators who don't want to write multiaddrs.
    /// 3. `self.external_addrs` from the config file.
    ///
    /// When `strategy = Auto` **and** one of the two envs is set, we treat
    /// it as an opt-in to Manual mode so operators only need to set one
    /// variable at runtime. When `strategy = Disabled`, nothing is returned
    /// no matter what the env says — Disabled is explicit.
    pub fn resolved_external_addrs(&self) -> Vec<String> {
        if self.external_addr_strategy == ExternalAddrStrategy::Disabled {
            return Vec::new();
        }

        // 1. AXIONAX_EXTERNAL_ADDRS — explicit multiaddr list
        if let Ok(raw) = std::env::var("AXIONAX_EXTERNAL_ADDRS") {
            let from_env: Vec<String> = raw
                .split(',')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect();
            if !from_env.is_empty() {
                return from_env;
            }
        }

        // 2. AXIONAX_PUBLIC_IP — bare IP, we synthesize the TCP multiaddr
        if let Ok(ip) = std::env::var("AXIONAX_PUBLIC_IP") {
            let ip = ip.trim();
            if !ip.is_empty() {
                return vec![format!("/ip4/{}/tcp/{}", ip, self.port)];
            }
        }

        // 3. Static config file list — only used when strategy is Manual
        if self.external_addr_strategy == ExternalAddrStrategy::Manual {
            return self.external_addrs.clone();
        }

        Vec::new()
    }

    /// Whether this config will actually advertise an external address after
    /// env resolution. `true` when strategy is Manual *or* when an env var
    /// promotes Auto → Manual.
    pub fn will_advertise_external(&self) -> bool {
        !self.resolved_external_addrs().is_empty()
    }
}

impl NetworkConfig {
    /// Create config for testnet (bootstrap via AXIONAX_BOOTSTRAP_NODES env or add peers manually)
    pub fn testnet() -> Self {
        Self {
            chain_id: 86137,
            bootstrap_nodes: vec![], // Set AXIONAX_BOOTSTRAP_NODES=/ip4/<IP>/tcp/30303/p2p/<PEER_ID> on VPS
            block_time_seconds: 5,
            ..Default::default()
        }
    }

    /// Create config for mainnet (bootstrap via AXIONAX_BOOTSTRAP_NODES env)
    pub fn mainnet() -> Self {
        Self {
            chain_id: 86150,
            validation_mode: ValidationMode::Strict,
            max_peers: 100,
            bootstrap_nodes: vec![],
            block_time_seconds: 5,
            ..Default::default()
        }
    }

    /// Create config for local development
    pub fn dev() -> Self {
        Self {
            chain_id: 31337,
            enable_mdns: true,
            max_peers: 10,
            validation_mode: ValidationMode::None,
            bootstrap_nodes: vec![],
            block_time_seconds: 2,
            ..Default::default()
        }
    }

    /// Get full listen multiaddr
    pub fn listen_multiaddr(&self) -> String {
        format!("/ip4/{}/tcp/{}", self.listen_addr, self.port)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = NetworkConfig::default();
        assert_eq!(config.chain_id, 86137);
        assert_eq!(config.port, 30303);
        assert!(config.enable_mdns);
    }

    #[test]
    fn test_testnet_config() {
        let config = NetworkConfig::testnet();
        assert_eq!(config.chain_id, 86137);
        // bootstrap_nodes is empty by default; operators set AXIONAX_BOOTSTRAP_NODES at runtime
        assert!(config.bootstrap_nodes.is_empty());
    }

    #[test]
    fn test_mainnet_config() {
        let config = NetworkConfig::mainnet();
        assert_eq!(config.chain_id, 86150);
        assert_eq!(config.max_peers, 100);
        assert!(matches!(config.validation_mode, ValidationMode::Strict));
    }

    #[test]
    fn test_listen_multiaddr() {
        let config = NetworkConfig::default();
        assert_eq!(config.listen_multiaddr(), "/ip4/0.0.0.0/tcp/30303");
    }

    #[test]
    fn test_default_external_addr_strategy() {
        let config = NetworkConfig::default();
        assert_eq!(config.external_addr_strategy, ExternalAddrStrategy::Auto);
        assert!(config.external_addrs.is_empty());
        assert!(config.resolved_external_addrs().is_empty());
    }

    #[test]
    fn test_manual_external_addrs_from_config() {
        let config = NetworkConfig {
            external_addr_strategy: ExternalAddrStrategy::Manual,
            external_addrs: vec!["/ip4/203.0.113.7/tcp/30303".to_string()],
            ..Default::default()
        };
        let addrs = config.resolved_external_addrs();
        assert_eq!(addrs.len(), 1);
        assert!(addrs[0].contains("203.0.113.7"));
    }
}
