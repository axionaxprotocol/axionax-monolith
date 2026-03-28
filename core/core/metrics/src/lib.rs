//! Metrics Module - Prometheus-compatible metrics
//!
//! Self-contained implementation using std atomics. Outputs Prometheus text
//! exposition format without depending on protobuf (removes RUSTSEC-2024-0437).

use std::collections::BTreeMap;
use std::fmt::Write;
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::{Arc, RwLock};

use lazy_static::lazy_static;

const ORD: Ordering = Ordering::Relaxed;

// =========================================================================
// Metric types
// =========================================================================

pub struct IntGauge(AtomicI64);

impl IntGauge {
    pub fn new() -> Self {
        Self(AtomicI64::new(0))
    }
    pub fn set(&self, v: i64) {
        self.0.store(v, ORD);
    }
    pub fn get(&self) -> i64 {
        self.0.load(ORD)
    }
}

pub struct IntCounter(AtomicU64);

impl IntCounter {
    pub fn new() -> Self {
        Self(AtomicU64::new(0))
    }
    pub fn inc(&self) {
        self.0.fetch_add(1, ORD);
    }
    pub fn inc_by(&self, v: u64) {
        self.0.fetch_add(v, ORD);
    }
    pub fn get(&self) -> u64 {
        self.0.load(ORD)
    }
}

/// f64 gauge stored as AtomicU64 via to_bits/from_bits.
pub struct Gauge(AtomicU64);

impl Gauge {
    pub fn new() -> Self {
        Self(AtomicU64::new(0f64.to_bits()))
    }
    pub fn set(&self, v: f64) {
        self.0.store(v.to_bits(), ORD);
    }
    pub fn get(&self) -> f64 {
        f64::from_bits(self.0.load(ORD))
    }
}

pub struct Histogram {
    upper_bounds: Vec<f64>,
    bucket_counts: Vec<AtomicU64>,
    sum_bits: AtomicU64,
    total: AtomicU64,
}

impl Histogram {
    pub fn new(buckets: Vec<f64>) -> Self {
        let bucket_counts = buckets.iter().map(|_| AtomicU64::new(0)).collect();
        Self {
            upper_bounds: buckets,
            bucket_counts,
            sum_bits: AtomicU64::new(0f64.to_bits()),
            total: AtomicU64::new(0),
        }
    }

    pub fn observe(&self, v: f64) {
        for (i, ub) in self.upper_bounds.iter().enumerate() {
            if v <= *ub {
                self.bucket_counts[i].fetch_add(1, ORD);
            }
        }
        self.total.fetch_add(1, ORD);
        atomic_f64_add(&self.sum_bits, v);
    }

    fn snapshot(&self) -> HistSnapshot {
        HistSnapshot {
            upper_bounds: self.upper_bounds.clone(),
            bucket_counts: self.bucket_counts.iter().map(|c| c.load(ORD)).collect(),
            sum: f64::from_bits(self.sum_bits.load(ORD)),
            count: self.total.load(ORD),
        }
    }
}

fn atomic_f64_add(bits: &AtomicU64, v: f64) {
    loop {
        let cur = bits.load(ORD);
        let new_val = (f64::from_bits(cur) + v).to_bits();
        if bits
            .compare_exchange_weak(cur, new_val, ORD, ORD)
            .is_ok()
        {
            break;
        }
    }
}

struct HistSnapshot {
    upper_bounds: Vec<f64>,
    bucket_counts: Vec<u64>,
    sum: f64,
    count: u64,
}

// =========================================================================
// Labeled metric types (Vec equivalents)
// =========================================================================

pub struct IntCounterVec {
    label_names: &'static [&'static str],
    entries: RwLock<BTreeMap<String, Arc<AtomicU64>>>,
}

pub struct LabeledIntCounter(Arc<AtomicU64>);

impl LabeledIntCounter {
    pub fn inc(&self) {
        self.0.fetch_add(1, ORD);
    }
}

impl IntCounterVec {
    pub fn new(label_names: &'static [&'static str]) -> Self {
        Self {
            label_names,
            entries: RwLock::new(BTreeMap::new()),
        }
    }

    pub fn with_label_values(&self, values: &[&str]) -> LabeledIntCounter {
        let key = values.join("\x00");
        if let Some(val) = self.entries.read().unwrap_or_else(|e| e.into_inner()).get(&key) {
            return LabeledIntCounter(val.clone());
        }
        let mut w = self.entries.write().unwrap_or_else(|e| e.into_inner());
        let val = w
            .entry(key)
            .or_insert_with(|| Arc::new(AtomicU64::new(0)));
        LabeledIntCounter(val.clone())
    }

    fn snapshot(&self) -> Vec<(Vec<String>, u64)> {
        let r = self.entries.read().unwrap_or_else(|e| e.into_inner());
        r.iter()
            .map(|(k, v)| {
                let labels: Vec<String> = k.split('\x00').map(String::from).collect();
                (labels, v.load(ORD))
            })
            .collect()
    }
}

pub struct GaugeVec {
    label_names: &'static [&'static str],
    entries: RwLock<BTreeMap<String, Arc<AtomicU64>>>,
}

pub struct LabeledGauge(Arc<AtomicU64>);

impl LabeledGauge {
    pub fn set(&self, v: f64) {
        self.0.store(v.to_bits(), ORD);
    }
}

impl GaugeVec {
    pub fn new(label_names: &'static [&'static str]) -> Self {
        Self {
            label_names,
            entries: RwLock::new(BTreeMap::new()),
        }
    }

    pub fn with_label_values(&self, values: &[&str]) -> LabeledGauge {
        let key = values.join("\x00");
        if let Some(val) = self.entries.read().unwrap_or_else(|e| e.into_inner()).get(&key) {
            return LabeledGauge(val.clone());
        }
        let mut w = self.entries.write().unwrap_or_else(|e| e.into_inner());
        let val = w
            .entry(key)
            .or_insert_with(|| Arc::new(AtomicU64::new(0f64.to_bits())));
        LabeledGauge(val.clone())
    }

    fn snapshot(&self) -> Vec<(Vec<String>, f64)> {
        let r = self.entries.read().unwrap_or_else(|e| e.into_inner());
        r.iter()
            .map(|(k, v)| {
                let labels: Vec<String> = k.split('\x00').map(String::from).collect();
                (labels, f64::from_bits(v.load(ORD)))
            })
            .collect()
    }
}

pub struct HistogramVec {
    label_names: &'static [&'static str],
    upper_bounds: Vec<f64>,
    entries: RwLock<BTreeMap<String, Arc<Histogram>>>,
}

pub struct LabeledHistogram(Arc<Histogram>);

impl LabeledHistogram {
    pub fn observe(&self, v: f64) {
        self.0.observe(v);
    }
}

impl HistogramVec {
    pub fn new(label_names: &'static [&'static str], buckets: Vec<f64>) -> Self {
        Self {
            label_names,
            upper_bounds: buckets,
            entries: RwLock::new(BTreeMap::new()),
        }
    }

    pub fn with_label_values(&self, values: &[&str]) -> LabeledHistogram {
        let key = values.join("\x00");
        if let Some(val) = self.entries.read().unwrap_or_else(|e| e.into_inner()).get(&key) {
            return LabeledHistogram(val.clone());
        }
        let mut w = self.entries.write().unwrap_or_else(|e| e.into_inner());
        let ub = self.upper_bounds.clone();
        let val = w
            .entry(key)
            .or_insert_with(|| Arc::new(Histogram::new(ub)));
        LabeledHistogram(val.clone())
    }

    fn snapshot(&self) -> Vec<(Vec<String>, HistSnapshot)> {
        let r = self.entries.read().unwrap_or_else(|e| e.into_inner());
        r.iter()
            .map(|(k, h)| {
                let labels: Vec<String> = k.split('\x00').map(String::from).collect();
                (labels, h.snapshot())
            })
            .collect()
    }
}

// =========================================================================
// Global metric instances
// =========================================================================

lazy_static! {
    // Chain
    pub static ref BLOCK_HEIGHT: IntGauge = IntGauge::new();
    pub static ref TX_TOTAL: IntCounter = IntCounter::new();
    pub static ref TX_PER_SECOND: Gauge = Gauge::new();
    pub static ref BLOCK_TIME: Histogram = Histogram::new(
        vec![0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0]
    );

    // Consensus
    pub static ref VALIDATORS_ACTIVE: IntGauge = IntGauge::new();
    pub static ref TOTAL_STAKED: Gauge = Gauge::new();
    pub static ref CHALLENGES_ISSUED: IntCounter = IntCounter::new();
    pub static ref FRAUD_PROOFS: IntCounter = IntCounter::new();

    // Network
    pub static ref PEERS_CONNECTED: IntGauge = IntGauge::new();
    pub static ref PEER_MESSAGES_IN: IntCounterVec =
        IntCounterVec::new(&["message_type"]);
    pub static ref PEER_MESSAGES_OUT: IntCounterVec =
        IntCounterVec::new(&["message_type"]);
    pub static ref PEER_REPUTATION: GaugeVec =
        GaugeVec::new(&["peer_id"]);

    // RPC
    pub static ref RPC_REQUESTS: IntCounterVec =
        IntCounterVec::new(&["method"]);
    pub static ref RPC_LATENCY: HistogramVec = HistogramVec::new(
        &["method"],
        vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
    );
    pub static ref RPC_ERRORS: IntCounterVec =
        IntCounterVec::new(&["method", "error_type"]);

    // Mempool
    pub static ref MEMPOOL_SIZE: IntGauge = IntGauge::new();
    pub static ref MEMPOOL_BYTES: IntGauge = IntGauge::new();

    // State
    pub static ref STATE_DB_SIZE: IntGauge = IntGauge::new();
    pub static ref STATE_READS: IntCounter = IntCounter::new();
    pub static ref STATE_WRITES: IntCounter = IntCounter::new();

    // Governance
    pub static ref GOV_ACTIVE_PROPOSALS: IntGauge = IntGauge::new();
    pub static ref GOV_VOTES_CAST: IntCounter = IntCounter::new();

    // System
    pub static ref UPTIME_SECONDS: IntGauge = IntGauge::new();
    pub static ref MEMORY_BYTES: IntGauge = IntGauge::new();
}

/// Force-initialize all metrics (idempotent).
pub fn init() {
    lazy_static::initialize(&BLOCK_HEIGHT);
    lazy_static::initialize(&TX_TOTAL);
    lazy_static::initialize(&TX_PER_SECOND);
    lazy_static::initialize(&BLOCK_TIME);
    lazy_static::initialize(&VALIDATORS_ACTIVE);
    lazy_static::initialize(&TOTAL_STAKED);
    lazy_static::initialize(&CHALLENGES_ISSUED);
    lazy_static::initialize(&FRAUD_PROOFS);
    lazy_static::initialize(&PEERS_CONNECTED);
    lazy_static::initialize(&PEER_MESSAGES_IN);
    lazy_static::initialize(&PEER_MESSAGES_OUT);
    lazy_static::initialize(&PEER_REPUTATION);
    lazy_static::initialize(&RPC_REQUESTS);
    lazy_static::initialize(&RPC_LATENCY);
    lazy_static::initialize(&RPC_ERRORS);
    lazy_static::initialize(&MEMPOOL_SIZE);
    lazy_static::initialize(&MEMPOOL_BYTES);
    lazy_static::initialize(&STATE_DB_SIZE);
    lazy_static::initialize(&STATE_READS);
    lazy_static::initialize(&STATE_WRITES);
    lazy_static::initialize(&GOV_ACTIVE_PROPOSALS);
    lazy_static::initialize(&GOV_VOTES_CAST);
    lazy_static::initialize(&UPTIME_SECONDS);
    lazy_static::initialize(&MEMORY_BYTES);
}

/// Export all metrics in Prometheus text exposition format.
pub fn export() -> String {
    let mut buf = String::with_capacity(4096);

    // Chain
    fmt_int_gauge(&mut buf, "axionax_block_height", "Current block height", &BLOCK_HEIGHT);
    fmt_counter(&mut buf, "axionax_transactions_total", "Total transactions processed", &TX_TOTAL);
    fmt_f64_gauge(&mut buf, "axionax_tx_per_second", "Transactions per second", &TX_PER_SECOND);
    fmt_histogram(&mut buf, "axionax_block_time_seconds", "Block time in seconds", &BLOCK_TIME);

    // Consensus
    fmt_int_gauge(&mut buf, "axionax_validators_active", "Number of active validators", &VALIDATORS_ACTIVE);
    fmt_f64_gauge(&mut buf, "axionax_total_staked", "Total amount staked", &TOTAL_STAKED);
    fmt_counter(&mut buf, "axionax_challenges_issued_total", "Total challenges issued", &CHALLENGES_ISSUED);
    fmt_counter(&mut buf, "axionax_fraud_proofs_total", "Total fraud proofs submitted", &FRAUD_PROOFS);

    // Network
    fmt_int_gauge(&mut buf, "axionax_peers_connected", "Number of connected peers", &PEERS_CONNECTED);
    fmt_counter_vec(&mut buf, "axionax_peer_messages_in_total", "Messages received from peers", &PEER_MESSAGES_IN);
    fmt_counter_vec(&mut buf, "axionax_peer_messages_out_total", "Messages sent to peers", &PEER_MESSAGES_OUT);
    fmt_gauge_vec(&mut buf, "axionax_peer_reputation", "Peer reputation scores", &PEER_REPUTATION);

    // RPC
    fmt_counter_vec(&mut buf, "axionax_rpc_requests_total", "Total RPC requests", &RPC_REQUESTS);
    fmt_histogram_vec(&mut buf, "axionax_rpc_latency_seconds", "RPC request latency", &RPC_LATENCY);
    fmt_counter_vec(&mut buf, "axionax_rpc_errors_total", "Total RPC errors", &RPC_ERRORS);

    // Mempool
    fmt_int_gauge(&mut buf, "axionax_mempool_size", "Number of transactions in mempool", &MEMPOOL_SIZE);
    fmt_int_gauge(&mut buf, "axionax_mempool_bytes", "Total bytes in mempool", &MEMPOOL_BYTES);

    // State
    fmt_int_gauge(&mut buf, "axionax_state_db_bytes", "State database size in bytes", &STATE_DB_SIZE);
    fmt_counter(&mut buf, "axionax_state_reads_total", "Total state reads", &STATE_READS);
    fmt_counter(&mut buf, "axionax_state_writes_total", "Total state writes", &STATE_WRITES);

    // Governance
    fmt_int_gauge(&mut buf, "axionax_gov_active_proposals", "Number of active governance proposals", &GOV_ACTIVE_PROPOSALS);
    fmt_counter(&mut buf, "axionax_gov_votes_total", "Total governance votes cast", &GOV_VOTES_CAST);

    // System
    fmt_int_gauge(&mut buf, "axionax_uptime_seconds", "Node uptime in seconds", &UPTIME_SECONDS);
    fmt_int_gauge(&mut buf, "axionax_memory_bytes", "Memory usage in bytes", &MEMORY_BYTES);

    buf
}

// =========================================================================
// Prometheus text format helpers
// =========================================================================

fn fmt_int_gauge(buf: &mut String, name: &str, help: &str, m: &IntGauge) {
    let _ = writeln!(buf, "# HELP {name} {help}");
    let _ = writeln!(buf, "# TYPE {name} gauge");
    let _ = writeln!(buf, "{name} {}", m.get());
}

fn fmt_f64_gauge(buf: &mut String, name: &str, help: &str, m: &Gauge) {
    let _ = writeln!(buf, "# HELP {name} {help}");
    let _ = writeln!(buf, "# TYPE {name} gauge");
    let _ = writeln!(buf, "{name} {}", m.get());
}

fn fmt_counter(buf: &mut String, name: &str, help: &str, m: &IntCounter) {
    let _ = writeln!(buf, "# HELP {name} {help}");
    let _ = writeln!(buf, "# TYPE {name} counter");
    let _ = writeln!(buf, "{name} {}", m.get());
}

fn fmt_histogram(buf: &mut String, name: &str, help: &str, h: &Histogram) {
    let snap = h.snapshot();
    let _ = writeln!(buf, "# HELP {name} {help}");
    let _ = writeln!(buf, "# TYPE {name} histogram");
    for (i, ub) in snap.upper_bounds.iter().enumerate() {
        let _ = writeln!(buf, "{name}_bucket{{le=\"{ub}\"}} {}", snap.bucket_counts[i]);
    }
    let _ = writeln!(buf, "{name}_bucket{{le=\"+Inf\"}} {}", snap.count);
    let _ = writeln!(buf, "{name}_sum {}", snap.sum);
    let _ = writeln!(buf, "{name}_count {}", snap.count);
}

fn fmt_counter_vec(buf: &mut String, name: &str, help: &str, cv: &IntCounterVec) {
    let entries = cv.snapshot();
    if entries.is_empty() {
        return;
    }
    let _ = writeln!(buf, "# HELP {name} {help}");
    let _ = writeln!(buf, "# TYPE {name} counter");
    for (labels, value) in &entries {
        let lstr = format_labels(cv.label_names, labels);
        let _ = writeln!(buf, "{name}{{{lstr}}} {value}");
    }
}

fn fmt_gauge_vec(buf: &mut String, name: &str, help: &str, gv: &GaugeVec) {
    let entries = gv.snapshot();
    if entries.is_empty() {
        return;
    }
    let _ = writeln!(buf, "# HELP {name} {help}");
    let _ = writeln!(buf, "# TYPE {name} gauge");
    for (labels, value) in &entries {
        let lstr = format_labels(gv.label_names, labels);
        let _ = writeln!(buf, "{name}{{{lstr}}} {value}");
    }
}

fn fmt_histogram_vec(buf: &mut String, name: &str, help: &str, hv: &HistogramVec) {
    let entries = hv.snapshot();
    if entries.is_empty() {
        return;
    }
    let _ = writeln!(buf, "# HELP {name} {help}");
    let _ = writeln!(buf, "# TYPE {name} histogram");
    for (labels, snap) in &entries {
        let lstr = format_labels(hv.label_names, labels);
        for (i, ub) in snap.upper_bounds.iter().enumerate() {
            let _ = writeln!(
                buf,
                "{name}_bucket{{{lstr},le=\"{ub}\"}} {}",
                snap.bucket_counts[i]
            );
        }
        let _ = writeln!(buf, "{name}_bucket{{{lstr},le=\"+Inf\"}} {}", snap.count);
        let _ = writeln!(buf, "{name}_sum{{{lstr}}} {}", snap.sum);
        let _ = writeln!(buf, "{name}_count{{{lstr}}} {}", snap.count);
    }
}

fn format_labels(names: &[&str], values: &[String]) -> String {
    names
        .iter()
        .zip(values.iter())
        .map(|(n, v)| format!("{n}=\"{v}\""))
        .collect::<Vec<_>>()
        .join(",")
}

// =========================================================================
// MetricsUpdater — convenience helpers
// =========================================================================

pub struct MetricsUpdater;

impl MetricsUpdater {
    pub fn record_block(block_number: u64, tx_count: u64, block_time_secs: f64) {
        BLOCK_HEIGHT.set(block_number as i64);
        TX_TOTAL.inc_by(tx_count);
        BLOCK_TIME.observe(block_time_secs);
    }

    pub fn set_validators(active: usize, total_staked: f64) {
        VALIDATORS_ACTIVE.set(active as i64);
        TOTAL_STAKED.set(total_staked);
    }

    pub fn set_peers(connected: usize) {
        PEERS_CONNECTED.set(connected as i64);
    }

    pub fn record_rpc(method: &str, latency_secs: f64, is_error: bool) {
        RPC_REQUESTS.with_label_values(&[method]).inc();
        RPC_LATENCY.with_label_values(&[method]).observe(latency_secs);
        if is_error {
            RPC_ERRORS.with_label_values(&[method, "unknown"]).inc();
        }
    }

    pub fn set_mempool(size: usize, bytes: usize) {
        MEMPOOL_SIZE.set(size as i64);
        MEMPOOL_BYTES.set(bytes as i64);
    }

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
        // Check that a line with the metric name and a numeric value is present.
        // We avoid checking a specific value because global metrics are shared
        // across parallel tests (e.g. test_record_block sets BLOCK_HEIGHT to 100).
        assert!(output.lines().any(|l| {
            l.starts_with("axionax_block_height ")
                && l.split_whitespace()
                    .nth(1)
                    .and_then(|v| v.parse::<i64>().ok())
                    .is_some()
        }));
    }

    #[test]
    fn test_labeled_counter() {
        let cv = IntCounterVec::new(&["method"]);
        cv.with_label_values(&["eth_call"]).inc();
        cv.with_label_values(&["eth_call"]).inc();
        cv.with_label_values(&["eth_blockNumber"]).inc();
        let snap = cv.snapshot();
        assert_eq!(snap.len(), 2);
    }

    #[test]
    fn test_histogram_observe() {
        let h = Histogram::new(vec![1.0, 5.0, 10.0]);
        h.observe(0.5);
        h.observe(3.0);
        h.observe(7.0);
        let snap = h.snapshot();
        assert_eq!(snap.count, 3);
        assert_eq!(snap.bucket_counts[0], 1); // le=1.0 → only 0.5
        assert_eq!(snap.bucket_counts[1], 2); // le=5.0 → 0.5 + 3.0
        assert_eq!(snap.bucket_counts[2], 3); // le=10.0 → all
    }

    #[test]
    fn test_f64_gauge() {
        let g = Gauge::new();
        g.set(3.14);
        assert!((g.get() - 3.14).abs() < f64::EPSILON);
    }
}
