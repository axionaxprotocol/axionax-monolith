//! Peer Reputation System for P2P Discovery
//!
//! Tracks peer reliability to reduce bootstrap dependency:
//! - Score peers by message success rate
//! - Auto-connect to high-reputation peers
//! - Decay scores over time

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

/// Reputation score bounds
pub const MIN_REPUTATION: i32 = -100;
pub const MAX_REPUTATION: i32 = 100;
pub const DEFAULT_REPUTATION: i32 = 0;

/// Peer reputation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationConfig {
    /// Score gain for successful message
    pub success_gain: i32,

    /// Score loss for failed message
    pub failure_penalty: i32,

    /// Score decay per hour
    pub decay_per_hour: i32,

    /// Minimum score to remain connected
    pub min_connection_score: i32,

    /// Score threshold for priority connection
    pub priority_threshold: i32,

    /// Ban threshold (disconnect if below)
    pub ban_threshold: i32,

    /// Ban duration in seconds
    pub ban_duration_secs: u64,
}

impl Default for ReputationConfig {
    fn default() -> Self {
        Self {
            success_gain: 1,
            failure_penalty: 5,
            decay_per_hour: 1,
            min_connection_score: -50,
            priority_threshold: 50,
            ban_threshold: -80,
            ban_duration_secs: 3600, // 1 hour ban
        }
    }
}

/// Individual peer reputation score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerScore {
    /// Current reputation score
    pub score: i32,

    /// Total successful messages
    pub successful_msgs: u64,

    /// Total failed messages
    pub failed_msgs: u64,

    /// Last activity timestamp
    pub last_seen: u64,

    /// First seen timestamp
    pub first_seen: u64,

    /// Is peer currently banned
    pub is_banned: bool,

    /// Ban expiry timestamp
    pub ban_until: u64,

    /// Peer address/multiaddr
    pub address: String,
}

impl PeerScore {
    pub fn new(_peer_id: &str, address: String) -> Self {
        let now = current_timestamp();
        Self {
            score: DEFAULT_REPUTATION,
            successful_msgs: 0,
            failed_msgs: 0,
            last_seen: now,
            first_seen: now,
            is_banned: false,
            ban_until: 0,
            address,
        }
    }

    /// Success rate (0.0 - 1.0)
    pub fn success_rate(&self) -> f64 {
        let total = self.successful_msgs + self.failed_msgs;
        if total == 0 {
            return 0.5; // Neutral for new peers
        }
        self.successful_msgs as f64 / total as f64
    }

    /// Uptime hours
    pub fn uptime_hours(&self) -> u64 {
        let now = current_timestamp();
        (now - self.first_seen) / 3600
    }
}

/// Peer Reputation Manager
pub struct ReputationManager {
    config: ReputationConfig,
    scores: Arc<RwLock<HashMap<String, PeerScore>>>,
}

impl ReputationManager {
    /// Create new reputation manager
    pub fn new(config: ReputationConfig) -> Self {
        Self {
            config,
            scores: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Record successful message from peer
    pub async fn record_success(&self, peer_id: &str) {
        let mut scores = self.scores.write().await;

        if let Some(peer) = scores.get_mut(peer_id) {
            peer.successful_msgs += 1;
            peer.score = (peer.score + self.config.success_gain).min(MAX_REPUTATION);
            peer.last_seen = current_timestamp();
            debug!("Peer {} success, score: {}", peer_id, peer.score);
        }
    }

    /// Record failed message from peer
    pub async fn record_failure(&self, peer_id: &str) {
        let mut scores = self.scores.write().await;
        let config = &self.config;

        if let Some(peer) = scores.get_mut(peer_id) {
            peer.failed_msgs += 1;
            peer.score = (peer.score - config.failure_penalty).max(MIN_REPUTATION);
            peer.last_seen = current_timestamp();

            // Check if should ban
            if peer.score <= config.ban_threshold {
                peer.is_banned = true;
                peer.ban_until = current_timestamp() + config.ban_duration_secs;
                warn!("Peer {} banned until {}", peer_id, peer.ban_until);
            }

            debug!("Peer {} failure, score: {}", peer_id, peer.score);
        }
    }

    /// Register new peer
    pub async fn register_peer(&self, peer_id: &str, address: String) {
        let mut scores = self.scores.write().await;

        if !scores.contains_key(peer_id) {
            scores.insert(peer_id.to_string(), PeerScore::new(peer_id, address));
            info!("Registered new peer: {}", peer_id);
        }
    }

    /// Check if peer is banned
    pub async fn is_banned(&self, peer_id: &str) -> bool {
        let scores = self.scores.read().await;

        if let Some(peer) = scores.get(peer_id) {
            if peer.is_banned {
                return current_timestamp() < peer.ban_until;
            }
        }
        false
    }

    /// Get peer score
    pub async fn get_score(&self, peer_id: &str) -> Option<i32> {
        self.scores.read().await.get(peer_id).map(|p| p.score)
    }

    /// Get all peers sorted by score (highest first)
    pub async fn get_peers_by_score(&self) -> Vec<(String, PeerScore)> {
        let scores = self.scores.read().await;
        let mut peers: Vec<_> = scores
            .iter()
            .filter(|(_, p)| !p.is_banned || current_timestamp() >= p.ban_until)
            .map(|(id, score)| (id.clone(), score.clone()))
            .collect();

        peers.sort_by(|a, b| b.1.score.cmp(&a.1.score));
        peers
    }

    /// Get priority peers (high reputation)
    pub async fn get_priority_peers(&self) -> Vec<String> {
        let scores = self.scores.read().await;
        scores
            .iter()
            .filter(|(_, p)| p.score >= self.config.priority_threshold && !p.is_banned)
            .map(|(id, _)| id.clone())
            .collect()
    }

    /// Get peers to disconnect (low reputation)
    pub async fn get_low_score_peers(&self) -> Vec<String> {
        let scores = self.scores.read().await;
        scores
            .iter()
            .filter(|(_, p)| p.score < self.config.min_connection_score)
            .map(|(id, _)| id.clone())
            .collect()
    }

    /// Apply time-based decay to all scores
    pub async fn apply_decay(&self) {
        let mut scores = self.scores.write().await;
        let now = current_timestamp();

        for peer in scores.values_mut() {
            let hours_since_seen = (now - peer.last_seen) / 3600;
            if hours_since_seen > 0 {
                let decay = (hours_since_seen as i32).saturating_mul(self.config.decay_per_hour);
                peer.score = peer.score.saturating_sub(decay).max(MIN_REPUTATION);
            }

            // Unban if ban expired
            if peer.is_banned && now >= peer.ban_until {
                peer.is_banned = false;
                peer.score = DEFAULT_REPUTATION; // Reset score
                info!("Peer {} unbanned", peer.address);
            }
        }
    }

    /// Remove inactive peers older than max_age_hours
    pub async fn cleanup_old_peers(&self, max_age_hours: u64) {
        let mut scores = self.scores.write().await;
        let now = current_timestamp();
        let cutoff = now - (max_age_hours * 3600);

        scores.retain(|id, peer| {
            let keep = peer.last_seen > cutoff;
            if !keep {
                info!("Removing inactive peer: {}", id);
            }
            keep
        });
    }

    /// Get statistics
    pub async fn stats(&self) -> ReputationStats {
        let scores = self.scores.read().await;
        let total = scores.len();
        let banned = scores.values().filter(|p| p.is_banned).count();
        let priority = scores.values().filter(|p| p.score >= self.config.priority_threshold).count();
        let avg_score = if total > 0 {
            scores.values().map(|p| p.score as i64).sum::<i64>() / total as i64
        } else {
            0
        };

        ReputationStats {
            total_peers: total,
            banned_peers: banned,
            priority_peers: priority,
            average_score: avg_score as i32,
        }
    }
}

/// Reputation statistics
#[derive(Debug, Clone)]
pub struct ReputationStats {
    pub total_peers: usize,
    pub banned_peers: usize,
    pub priority_peers: usize,
    pub average_score: i32,
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> ReputationConfig {
        ReputationConfig {
            success_gain: 10,
            failure_penalty: 20,
            decay_per_hour: 5,
            min_connection_score: -50,
            priority_threshold: 50,
            ban_threshold: -80,
            ban_duration_secs: 60,
        }
    }

    #[tokio::test]
    async fn test_register_peer() {
        let mgr = ReputationManager::new(test_config());
        mgr.register_peer("peer1", "/ip4/1.2.3.4/tcp/30303".to_string()).await;

        let score = mgr.get_score("peer1").await;
        assert_eq!(score, Some(DEFAULT_REPUTATION));
    }

    #[tokio::test]
    async fn test_success_increases_score() {
        let mgr = ReputationManager::new(test_config());
        mgr.register_peer("peer1", "addr".to_string()).await;

        mgr.record_success("peer1").await;
        mgr.record_success("peer1").await;

        let score = mgr.get_score("peer1").await.unwrap();
        assert_eq!(score, 20); // 2 * 10 success gain
    }

    #[tokio::test]
    async fn test_failure_decreases_score() {
        let mgr = ReputationManager::new(test_config());
        mgr.register_peer("peer1", "addr".to_string()).await;

        mgr.record_failure("peer1").await;

        let score = mgr.get_score("peer1").await.unwrap();
        assert_eq!(score, -20); // 20 failure penalty
    }

    #[tokio::test]
    async fn test_ban_on_low_score() {
        let mgr = ReputationManager::new(test_config());
        mgr.register_peer("peer1", "addr".to_string()).await;

        // 5 failures = -100, should be banned at -80
        for _ in 0..5 {
            mgr.record_failure("peer1").await;
        }

        assert!(mgr.is_banned("peer1").await);
    }

    #[tokio::test]
    async fn test_priority_peers() {
        let mgr = ReputationManager::new(test_config());
        mgr.register_peer("peer1", "addr1".to_string()).await;
        mgr.register_peer("peer2", "addr2".to_string()).await;

        // Make peer1 priority (50+ score)
        for _ in 0..6 {
            mgr.record_success("peer1").await;
        }

        let priority = mgr.get_priority_peers().await;
        assert!(priority.contains(&"peer1".to_string()));
        assert!(!priority.contains(&"peer2".to_string()));
    }
}
