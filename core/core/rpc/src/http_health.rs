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
}

impl Default for HttpHealthConfig {
    fn default() -> Self {
        Self {
            addr: "0.0.0.0:8080".parse().unwrap(),
            ready_path: "/ready".to_string(),
            live_path: "/health".to_string(),
            metrics_path: "/metrics".to_string(),
        }
    }
}

/// Simple health response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleHealthResponse {
    pub status: String,
    pub timestamp: u64,
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
            .unwrap()
            .as_secs();
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
            .unwrap()
            .as_secs();
        self.uptime_seconds = now - self.start_time;
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
        info!("HTTP Health server listening on http://{}", self.config.addr);
        info!("  Liveness:  http://{}{}", self.config.addr, self.config.live_path);
        info!("  Readiness: http://{}{}", self.config.addr, self.config.ready_path);
        info!("  Metrics:   http://{}{}", self.config.addr, self.config.metrics_path);

        let state = self.state.clone();
        let ready_path = self.config.ready_path.clone();
        let live_path = self.config.live_path.clone();
        let metrics_path = self.config.metrics_path.clone();

        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((socket, _addr)) => {
                        let state = state.clone();
                        let ready_path = ready_path.clone();
                        let live_path = live_path.clone();
                        let metrics_path = metrics_path.clone();

                        tokio::spawn(async move {
                            if let Err(e) = handle_request(
                                socket,
                                state,
                                &ready_path,
                                &live_path,
                                &metrics_path,
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
                        .unwrap()
                        .as_secs(),
                };
                ("200 OK", serde_json::to_string(&response).unwrap())
            } else {
                ("503 Service Unavailable", r#"{"status":"unhealthy"}"#.to_string())
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
                    .unwrap()
                    .as_secs(),
            };
            let status_code = if state.is_ready() {
                "200 OK"
            } else {
                "503 Service Unavailable"
            };
            (status_code, serde_json::to_string(&response).unwrap())
        } else if path == metrics_path {
            // Prometheus metrics
            let metrics = format!(
                "# HELP axionax_up Node is up\n\
                 # TYPE axionax_up gauge\n\
                 axionax_up {}\n\
                 # HELP axionax_block_height Current block height\n\
                 # TYPE axionax_block_height gauge\n\
                 axionax_block_height {}\n\
                 # HELP axionax_peers_connected Connected peers\n\
                 # TYPE axionax_peers_connected gauge\n\
                 axionax_peers_connected {}\n\
                 # HELP axionax_uptime_seconds Node uptime in seconds\n\
                 # TYPE axionax_uptime_seconds counter\n\
                 axionax_uptime_seconds {}\n",
                if state.is_alive() { 1 } else { 0 },
                state.block_height,
                state.peers_connected,
                state.uptime_seconds
            );
            ("200 OK", metrics)
        } else {
            ("404 Not Found", r#"{"error":"Not found"}"#.to_string())
        }
    };

    let response = format!(
        "HTTP/1.1 {}\r\n\
         Content-Type: application/json\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\
         \r\n\
         {}",
        status,
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
        let mut state = HealthState::default();
        state.min_peers = 1;
        state.peers_connected = 0;

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
