//! Metrics Module - Prometheus-compatible metrics
//!
//! Exposes blockchain metrics for monitoring and alerting

use lazy_static::lazy_static;
use prometheus::{
    Counter, CounterVec, Gauge, GaugeVec, Histogram, HistogramOpts, HistogramVec,
    IntCounter, IntCounterVec, IntGauge, IntGaugeVec, Opts, Registry,
};
use std::sync::Arc;

lazy_static! {
    /// Global metrics registry
    pub static ref REGISTRY: Registry = Registry::new();

    // =========================================================================
    // Chain Metrics
    // =========================================================================

    /// Current block height
    pub static ref BLOCK_HEIGHT: IntGauge = IntGauge::new(
        "axionax_block_height",
        "Current block height"
    ).unwrap();

    /// Total transactions processed
    pub static ref TX_TOTAL: IntCounter = IntCounter::new(
        "axionax_transactions_total",
        "Total transactions processed"
    ).unwrap();

    /// Transactions per second
    pub static ref TX_PER_SECOND: Gauge = Gauge::new(
        "axionax_tx_per_second",
        "Transactions per second"
    ).unwrap();

    /// Block time histogram (seconds)
    pub static ref BLOCK_TIME: Histogram = Histogram::with_opts(
        HistogramOpts::new("axionax_block_time_seconds", "Block time in seconds")
            .buckets(vec![0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0])
    ).unwrap();

    // =========================================================================
    // Consensus Metrics
    // =========================================================================

    /// Active validators count
    pub static ref VALIDATORS_ACTIVE: IntGauge = IntGauge::new(
        "axionax_validators_active",
        "Number of active validators"
    ).unwrap();

    /// Total staked amount
    pub static ref TOTAL_STAKED: Gauge = Gauge::new(
        "axionax_total_staked",
        "Total amount staked"
    ).unwrap();

    /// Challenges issued
    pub static ref CHALLENGES_ISSUED: IntCounter = IntCounter::new(
        "axionax_challenges_issued_total",
        "Total challenges issued"
    ).unwrap();

    /// Fraud proofs submitted
    pub static ref FRAUD_PROOFS: IntCounter = IntCounter::new(
        "axionax_fraud_proofs_total",
        "Total fraud proofs submitted"
    ).unwrap();

    // =========================================================================
    // Network Metrics
    // =========================================================================

    /// Connected peers
    pub static ref PEERS_CONNECTED: IntGauge = IntGauge::new(
        "axionax_peers_connected",
        "Number of connected peers"
    ).unwrap();

    /// Peer messages received
    pub static ref PEER_MESSAGES_IN: IntCounterVec = IntCounterVec::new(
        Opts::new("axionax_peer_messages_in_total", "Messages received from peers"),
        &["message_type"]
    ).unwrap();

    /// Peer messages sent
    pub static ref PEER_MESSAGES_OUT: IntCounterVec = IntCounterVec::new(
        Opts::new("axionax_peer_messages_out_total", "Messages sent to peers"),
        &["message_type"]
    ).unwrap();

    /// Peer reputation scores
    pub static ref PEER_REPUTATION: GaugeVec = GaugeVec::new(
        Opts::new("axionax_peer_reputation", "Peer reputation scores"),
        &["peer_id"]
    ).unwrap();

    // =========================================================================
    // RPC Metrics
    // =========================================================================

    /// RPC requests total
    pub static ref RPC_REQUESTS: IntCounterVec = IntCounterVec::new(
        Opts::new("axionax_rpc_requests_total", "Total RPC requests"),
        &["method"]
    ).unwrap();

    /// RPC request latency
    pub static ref RPC_LATENCY: HistogramVec = HistogramVec::new(
        HistogramOpts::new("axionax_rpc_latency_seconds", "RPC request latency")
            .buckets(vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]),
        &["method"]
    ).unwrap();

    /// RPC errors total
    pub static ref RPC_ERRORS: IntCounterVec = IntCounterVec::new(
        Opts::new("axionax_rpc_errors_total", "Total RPC errors"),
        &["method", "error_type"]
    ).unwrap();

    // =========================================================================
    // Mempool Metrics
    // =========================================================================

    /// Mempool size (transactions)
    pub static ref MEMPOOL_SIZE: IntGauge = IntGauge::new(
        "axionax_mempool_size",
        "Number of transactions in mempool"
    ).unwrap();

    /// Mempool bytes
    pub static ref MEMPOOL_BYTES: IntGauge = IntGauge::new(
        "axionax_mempool_bytes",
        "Total bytes in mempool"
    ).unwrap();

    // =========================================================================
    // State Metrics
    // =========================================================================

    /// State DB size
    pub static ref STATE_DB_SIZE: IntGauge = IntGauge::new(
        "axionax_state_db_bytes",
        "State database size in bytes"
    ).unwrap();

    /// State reads
    pub static ref STATE_READS: IntCounter = IntCounter::new(
        "axionax_state_reads_total",
        "Total state reads"
    ).unwrap();

    /// State writes
    pub static ref STATE_WRITES: IntCounter = IntCounter::new(
        "axionax_state_writes_total",
        "Total state writes"
    ).unwrap();

    // =========================================================================
    // Governance Metrics
    // =========================================================================

    /// Active proposals
    pub static ref GOV_ACTIVE_PROPOSALS: IntGauge = IntGauge::new(
        "axionax_gov_active_proposals",
        "Number of active governance proposals"
    ).unwrap();

    /// Total votes cast
    pub static ref GOV_VOTES_CAST: IntCounter = IntCounter::new(
        "axionax_gov_votes_total",
        "Total governance votes cast"
    ).unwrap();

    // =========================================================================
    // System Metrics
    // =========================================================================

    /// Process uptime
    pub static ref UPTIME_SECONDS: IntGauge = IntGauge::new(
        "axionax_uptime_seconds",
        "Node uptime in seconds"
    ).unwrap();

    /// Memory usage
    pub static ref MEMORY_BYTES: IntGauge = IntGauge::new(
        "axionax_memory_bytes",
        "Memory usage in bytes"
    ).unwrap();
}

/// Initialize and register all metrics
pub fn init() {
    // Chain
    REGISTRY.register(Box::new(BLOCK_HEIGHT.clone())).ok();
    REGISTRY.register(Box::new(TX_TOTAL.clone())).ok();
    REGISTRY.register(Box::new(TX_PER_SECOND.clone())).ok();
    REGISTRY.register(Box::new(BLOCK_TIME.clone())).ok();

    // Consensus
    REGISTRY.register(Box::new(VALIDATORS_ACTIVE.clone())).ok();
    REGISTRY.register(Box::new(TOTAL_STAKED.clone())).ok();
    REGISTRY.register(Box::new(CHALLENGES_ISSUED.clone())).ok();
    REGISTRY.register(Box::new(FRAUD_PROOFS.clone())).ok();

    // Network
    REGISTRY.register(Box::new(PEERS_CONNECTED.clone())).ok();
    REGISTRY.register(Box::new(PEER_MESSAGES_IN.clone())).ok();
    REGISTRY.register(Box::new(PEER_MESSAGES_OUT.clone())).ok();
    REGISTRY.register(Box::new(PEER_REPUTATION.clone())).ok();

    // RPC
    REGISTRY.register(Box::new(RPC_REQUESTS.clone())).ok();
    REGISTRY.register(Box::new(RPC_LATENCY.clone())).ok();
    REGISTRY.register(Box::new(RPC_ERRORS.clone())).ok();

    // Mempool
    REGISTRY.register(Box::new(MEMPOOL_SIZE.clone())).ok();
    REGISTRY.register(Box::new(MEMPOOL_BYTES.clone())).ok();

    // State
    REGISTRY.register(Box::new(STATE_DB_SIZE.clone())).ok();
    REGISTRY.register(Box::new(STATE_READS.clone())).ok();
    REGISTRY.register(Box::new(STATE_WRITES.clone())).ok();

    // Governance
    REGISTRY.register(Box::new(GOV_ACTIVE_PROPOSALS.clone())).ok();
    REGISTRY.register(Box::new(GOV_VOTES_CAST.clone())).ok();

    // System
    REGISTRY.register(Box::new(UPTIME_SECONDS.clone())).ok();
    REGISTRY.register(Box::new(MEMORY_BYTES.clone())).ok();
}

/// Export metrics in Prometheus format
pub fn export() -> String {
    use prometheus::Encoder;
    let encoder = prometheus::TextEncoder::new();
    let metric_families = REGISTRY.gather();
    let mut buffer = Vec::new();
    encoder.encode(&metric_families, &mut buffer).unwrap();
    String::from_utf8(buffer).unwrap()
}

/// Metrics update helper
pub struct MetricsUpdater;

impl MetricsUpdater {
    /// Record new block
    pub fn record_block(block_number: u64, tx_count: u64, block_time_secs: f64) {
        BLOCK_HEIGHT.set(block_number as i64);
        TX_TOTAL.inc_by(tx_count);
        BLOCK_TIME.observe(block_time_secs);
    }

    /// Update validator count
    pub fn set_validators(active: usize, total_staked: f64) {
        VALIDATORS_ACTIVE.set(active as i64);
        TOTAL_STAKED.set(total_staked);
    }

    /// Update peer count
    pub fn set_peers(connected: usize) {
        PEERS_CONNECTED.set(connected as i64);
    }

    /// Record RPC request
    pub fn record_rpc(method: &str, latency_secs: f64, is_error: bool) {
        RPC_REQUESTS.with_label_values(&[method]).inc();
        RPC_LATENCY.with_label_values(&[method]).observe(latency_secs);
        if is_error {
            RPC_ERRORS.with_label_values(&[method, "unknown"]).inc();
        }
    }

    /// Update mempool stats
    pub fn set_mempool(size: usize, bytes: usize) {
        MEMPOOL_SIZE.set(size as i64);
        MEMPOOL_BYTES.set(bytes as i64);
    }

    /// Update governance stats
    pub fn set_governance(active_proposals: usize) {
        GOV_ACTIVE_PROPOSALS.set(active_proposals as i64);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_init() {
        init();
        // Should not panic
    }

    #[test]
    fn test_record_block() {
        init();
        MetricsUpdater::record_block(100, 50, 2.5);
        assert_eq!(BLOCK_HEIGHT.get(), 100);
    }

    #[test]
    fn test_export() {
        init();
        BLOCK_HEIGHT.set(42);
        let output = export();
        assert!(output.contains("axionax_block_height"));
        assert!(output.contains("42"));
    }
}
