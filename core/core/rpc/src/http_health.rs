//! HTTP Health Endpoints
//!
//! Standalone HTTP endpoints for health checks (separate from JSON-RPC)
//! Used by load balancers and monitoring systems

use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tracing::{debug, info, warn};

/// HTTP Health Server Configuration
#[derive(Debug, Clone)]
pub struct HttpHealthConfig {
    /// Health endpoint address (e.g., "0.0.0.0:8080")
    pub addr: SocketAddr,

    /// Readiness probe path
    pub ready_path: String,

    /// Liveness probe path
    pub live_path: String,

    /// Metrics path
    pub metrics_path: String,

    /// Version info path
    pub version_path: String,
}

impl Default for HttpHealthConfig {
    fn default() -> Self {
        Self {
            addr: "127.0.0.1:8080"
                .parse()
                .unwrap_or_else(|_| std::net::SocketAddr::from(([127, 0, 0, 1], 8080))),
            ready_path: "/ready".to_string(),
            live_path: "/health".to_string(),
            metrics_path: "/metrics".to_string(),
            version_path: "/version".to_string(),
        }
    }
}

/// Simple health response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleHealthResponse {
    pub status: String,
    pub timestamp: u64,
}

/// Version response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionResponse {
    pub version: String,
    pub commit: String,
    pub build_time: String,
    pub rust_version: String,
    pub chain_id: String,
}

/// Detailed health response for /ready
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessResponse {
    pub ready: bool,
    pub checks: ReadinessChecks,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessChecks {
    pub database: bool,
    pub sync: bool,
    pub peers: bool,
}

/// Health state shared between components
pub struct HealthState {
    pub database_ok: bool,
    pub sync_ok: bool,
    pub peers_connected: usize,
    pub min_peers: usize,
    pub block_height: u64,
    pub uptime_seconds: u64,
    pub start_time: u64,
}

impl Default for HealthState {
    fn default() -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        Self {
            database_ok: true,
            sync_ok: true,
            peers_connected: 0,
            min_peers: 1,
            block_height: 0,
            uptime_seconds: 0,
            start_time: now,
        }
    }
}

impl HealthState {
    /// Update uptime
    pub fn update(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(self.start_time);
        self.uptime_seconds = now.saturating_sub(self.start_time);
    }

    /// Check if node is ready to serve traffic
    pub fn is_ready(&self) -> bool {
        self.database_ok && self.sync_ok && self.peers_connected >= self.min_peers
    }

    /// Check if node is alive
    pub fn is_alive(&self) -> bool {
        self.database_ok
    }
}

/// HTTP Health Server
pub struct HttpHealthServer {
    config: HttpHealthConfig,
    state: Arc<tokio::sync::RwLock<HealthState>>,
}

impl HttpHealthServer {
    /// Create new HTTP health server
    pub fn new(config: HttpHealthConfig) -> Self {
        Self {
            config,
            state: Arc::new(tokio::sync::RwLock::new(HealthState::default())),
        }
    }

    /// Get shared state handle
    pub fn state(&self) -> Arc<tokio::sync::RwLock<HealthState>> {
        self.state.clone()
    }

    /// Start HTTP health server
    pub async fn start(&self) -> anyhow::Result<()> {
        let listener = TcpListener::bind(self.config.addr).await?;
        info!(
            "HTTP Health server listening on http://{}",
            self.config.addr
        );
        info!(
            "  Liveness:  http://{}{}",
            self.config.addr, self.config.live_path
        );
        info!(
            "  Readiness: http://{}{}",
            self.config.addr, self.config.ready_path
        );
        info!(
            "  Metrics:   http://{}{}",
            self.config.addr, self.config.metrics_path
        );

        let state = self.state.clone();
        let ready_path = self.config.ready_path.clone();
        let live_path = self.config.live_path.clone();
        let metrics_path = self.config.metrics_path.clone();
        let version_path = self.config.version_path.clone();

        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((socket, _addr)) => {
                        let state = state.clone();
                        let ready_path = ready_path.clone();
                        let live_path = live_path.clone();
                        let metrics_path = metrics_path.clone();
                        let version_path = version_path.clone();

                        tokio::spawn(async move {
                            if let Err(e) = handle_request(
                                socket,
                                state,
                                &ready_path,
                                &live_path,
                                &metrics_path,
                                &version_path,
                            )
                            .await
                            {
                                warn!("Health request error: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        warn!("Health server accept error: {}", e);
                    }
                }
            }
        });

        Ok(())
    }
}

async fn handle_request(
    mut socket: TcpStream,
    state: Arc<tokio::sync::RwLock<HealthState>>,
    ready_path: &str,
    live_path: &str,
    metrics_path: &str,
    version_path: &str,
) -> anyhow::Result<()> {
    let mut buffer = [0; 1024];
    let n = socket.read(&mut buffer).await?;
    let request = String::from_utf8_lossy(&buffer[..n]);

    // Parse request path
    let path = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .unwrap_or("/");

    debug!("Health request: {}", path);

    let (status, body) = {
        let mut state = state.write().await;
        state.update();

        if path == live_path || path == "/healthz" {
            // Liveness probe
            if state.is_alive() {
                let response = SimpleHealthResponse {
                    status: "ok".to_string(),
                    timestamp: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                };
                (
                    "200 OK",
                    serde_json::to_string(&response)
                        .unwrap_or_else(|_| r#"{"status":"ok"}"#.to_string()),
                )
            } else {
                (
                    "503 Service Unavailable",
                    r#"{"status":"unhealthy"}"#.to_string(),
                )
            }
        } else if path == ready_path || path == "/readyz" {
            // Readiness probe
            let response = ReadinessResponse {
                ready: state.is_ready(),
                checks: ReadinessChecks {
                    database: state.database_ok,
                    sync: state.sync_ok,
                    peers: state.peers_connected >= state.min_peers,
                },
                timestamp: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0),
            };
            let status_code = if state.is_ready() {
                "200 OK"
            } else {
                "503 Service Unavailable"
            };
            (
                status_code,
                serde_json::to_string(&response)
                    .unwrap_or_else(|_| r#"{"ready":false}"#.to_string()),
            )
        } else if path == metrics_path {
            let mut body = metrics::export();

            // Basic metrics
            body.push_str("# HELP axionax_up Node is up\n");
            body.push_str("# TYPE axionax_up gauge\n");
            body.push_str(&format!(
                "axionax_up {}\n",
                if state.is_alive() { 1 } else { 0 }
            ));

            // Network metrics
            body.push_str("# HELP axionax_peers_connected Number of connected peers\n");
            body.push_str("# TYPE axionax_peers_connected gauge\n");
            body.push_str(&format!(
                "axionax_peers_connected {}\n",
                state.peers_connected
            ));

            // Blockchain metrics
            body.push_str("# HELP axionax_block_height Current block height\n");
            body.push_str("# TYPE axionax_block_height counter\n");
            body.push_str(&format!("axionax_block_height {}\n", state.block_height));

            // Health check metrics
            body.push_str("# HELP axionax_database_ok Database connectivity status\n");
            body.push_str("# TYPE axionax_database_ok gauge\n");
            body.push_str(&format!(
                "axionax_database_ok {}\n",
                if state.database_ok { 1 } else { 0 }
            ));

            body.push_str("# HELP axionax_sync_ok Blockchain sync status\n");
            body.push_str("# TYPE axionax_sync_ok gauge\n");
            body.push_str(&format!(
                "axionax_sync_ok {}\n",
                if state.sync_ok { 1 } else { 0 }
            ));

            // Performance metrics
            body.push_str("# HELP axionax_min_peers Minimum required peers\n");
            body.push_str("# TYPE axionax_min_peers gauge\n");
            body.push_str(&format!("axionax_min_peers {}\n", state.min_peers));

            ("200 OK", body)
        } else if path == version_path {
            let response = VersionResponse {
                version: env!("CARGO_PKG_VERSION").to_string(),
                commit: option_env!("GIT_COMMIT").unwrap_or("unknown").to_string(),
                build_time: option_env!("BUILD_TIME").unwrap_or("unknown").to_string(),
                rust_version: option_env!("RUSTC_VERSION")
                    .unwrap_or("unknown")
                    .to_string(),
                chain_id: "86137".to_string(),
            };
            (
                "200 OK",
                serde_json::to_string(&response)
                    .unwrap_or_else(|_| r#"{"version":"unknown"}"#.to_string()),
            )
        } else {
            ("404 Not Found", r#"{"error":"Not found"}"#.to_string())
        }
    };

    let content_type = if path == metrics_path {
        "text/plain; version=0.0.4; charset=utf-8"
    } else {
        "application/json"
    };

    let response = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status,
        content_type,
        body.len(),
        body
    );

    socket.write_all(response.as_bytes()).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_state_default() {
        let state = HealthState::default();
        assert!(state.database_ok);
        assert!(state.sync_ok);
        assert_eq!(state.peers_connected, 0);
    }

    #[test]
    fn test_is_ready() {
        let mut state = HealthState {
            min_peers: 1,
            peers_connected: 0,
            ..Default::default()
        };

        // Not ready - no peers
        assert!(!state.is_ready());

        // Ready with peers
        state.peers_connected = 2;
        assert!(state.is_ready());

        // Not ready - database down
        state.database_ok = false;
        assert!(!state.is_ready());
    }

    #[test]
    fn test_is_alive() {
        let mut state = HealthState::default();
        assert!(state.is_alive());

        state.database_ok = false;
        assert!(!state.is_alive());
    }

    #[test]
    fn test_default_config() {
        let config = HttpHealthConfig::default();
        assert_eq!(config.live_path, "/health");
        assert_eq!(config.ready_path, "/ready");
        assert_eq!(config.metrics_path, "/metrics");
    }
}
