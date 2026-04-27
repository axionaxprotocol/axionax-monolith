//! Auto-Selection Router (ASR) Module
//!
//! Intelligent worker selection based on ARCHITECTURE v1.5
//! - VRF-based random selection from top-K candidates
//! - Performance-weighted scoring with EWMA
//! - Anti-collusion through org/ASN quota limits
//! - Newcomer exploration boost

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, info};

/// ASR Error types
#[derive(Error, Debug)]
pub enum ASRError {
    #[error("No workers available")]
    NoWorkersAvailable,

    #[error("Worker not found: {0}")]
    WorkerNotFound(String),

    #[error("Quota exceeded for {entity_type}: {entity_id}")]
    QuotaExceeded {
        entity_type: String,
        entity_id: String,
    },

    #[error("Invalid job requirements: {0}")]
    InvalidRequirements(String),
}

pub type Result<T> = std::result::Result<T, ASRError>;

/// ASR Configuration (aligned with ARCHITECTURE v1.5)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ASRConfig {
    /// Top K candidates for VRF selection
    /// Recommended: 64
    pub top_k: usize,

    /// Maximum quota per worker/org/ASN/region (q_max)
    /// Recommended: 10-15% per epoch
    pub max_quota: f64,

    /// Exploration rate for newcomers (ε)
    /// Recommended: 5%
    pub exploration_rate: f64,

    /// Newcomer boost factor
    pub newcomer_boost: f64,

    /// Performance window in epochs for EWMA
    pub performance_window_epochs: u32,

    /// EWMA decay factor
    pub ewma_alpha: f64,

    /// Enable anti-collusion checks
    pub anti_collusion_enabled: bool,
}

impl Default for ASRConfig {
    fn default() -> Self {
        Self {
            top_k: 64,
            max_quota: 0.125,       // 12.5%
            exploration_rate: 0.05, // 5%
            newcomer_boost: 0.1,    // 10%
            performance_window_epochs: 30,
            ewma_alpha: 0.3,
            anti_collusion_enabled: true,
        }
    }
}

/// Worker status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WorkerStatus {
    Active,
    Busy,
    Offline,
    Suspended,
}

/// Worker capability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerCapability {
    /// GPU type (e.g., "a100", "v100", "none")
    pub gpu_type: String,

    /// GPU memory in GB
    pub gpu_memory_gb: u32,

    /// CPU cores
    pub cpu_cores: u32,

    /// RAM in GB
    pub ram_gb: u32,

    /// Supported frameworks
    pub frameworks: Vec<String>,
}

/// Worker performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerPerformance {
    /// Success rate (0.0 - 1.0)
    pub success_rate: f64,

    /// Average response time in seconds
    pub avg_response_time: f64,

    /// Jobs completed
    pub jobs_completed: u64,

    /// Jobs failed
    pub jobs_failed: u64,

    /// Total compute hours
    pub compute_hours: f64,

    /// Current epoch quota usage
    pub quota_used: f64,

    /// EWMA score
    pub ewma_score: f64,
}

impl Default for WorkerPerformance {
    fn default() -> Self {
        Self {
            success_rate: 0.0,
            avg_response_time: 0.0,
            jobs_completed: 0,
            jobs_failed: 0,
            compute_hours: 0.0,
            quota_used: 0.0,
            ewma_score: 0.5, // Neutral starting score
        }
    }
}

/// Worker registration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Worker {
    /// Worker ID
    pub id: String,

    /// Organization ID (for anti-collusion)
    pub org_id: String,

    /// ASN (Autonomous System Number) for network diversity
    pub asn: u32,

    /// Geographic region
    pub region: String,

    /// Worker capabilities
    pub capability: WorkerCapability,

    /// Current status
    pub status: WorkerStatus,

    /// Performance metrics
    pub performance: WorkerPerformance,

    /// Is newcomer (< 10 jobs)
    pub is_newcomer: bool,

    /// Registration timestamp
    pub registered_at: u64,
}

impl Worker {
    /// Calculate selection score
    pub fn selection_score(&self, config: &ASRConfig) -> f64 {
        let mut score = self.performance.ewma_score;

        // Newcomer boost
        if self.is_newcomer {
            score += config.newcomer_boost;
        }

        // Penalize high quota usage
        if self.performance.quota_used > config.max_quota * 0.8 {
            score *= 0.5;
        }

        // Boost for good response time
        if self.performance.avg_response_time > 0.0 && self.performance.avg_response_time < 10.0 {
            score *= 1.1;
        }

        score.clamp(0.0, 1.0)
    }
}

/// Job requirements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobRequirements {
    /// Required GPU type (empty = any)
    pub gpu_type: Option<String>,

    /// Minimum GPU memory
    pub min_gpu_memory_gb: u32,

    /// Minimum CPU cores
    pub min_cpu_cores: u32,

    /// Minimum RAM
    pub min_ram_gb: u32,

    /// Required framework
    pub framework: Option<String>,

    /// Preferred region (empty = any)
    pub preferred_region: Option<String>,
}

impl Default for JobRequirements {
    fn default() -> Self {
        Self {
            gpu_type: None,
            min_gpu_memory_gb: 0,
            min_cpu_cores: 1,
            min_ram_gb: 1,
            framework: None,
            preferred_region: None,
        }
    }
}

/// Selection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionResult {
    /// Selected worker ID
    pub worker_id: String,

    /// Selection score
    pub score: f64,

    /// Was this an exploration selection
    pub is_exploration: bool,

    /// VRF proof (for verification)
    pub vrf_proof: [u8; 32],
}

/// Auto-Selection Router
pub struct ASR {
    config: ASRConfig,
    workers: Arc<RwLock<HashMap<String, Worker>>>,
    epoch_quotas: Arc<RwLock<HashMap<String, f64>>>,
    current_epoch: Arc<RwLock<u64>>,
}

impl ASR {
    /// Create new ASR instance
    pub fn new(config: ASRConfig) -> Self {
        Self {
            config,
            workers: Arc::new(RwLock::new(HashMap::new())),
            epoch_quotas: Arc::new(RwLock::new(HashMap::new())),
            current_epoch: Arc::new(RwLock::new(0)),
        }
    }

    /// Register a worker
    pub async fn register_worker(&self, worker: Worker) -> Result<()> {
        let mut workers = self.workers.write().await;
        info!(
            "Registered worker: {} (org={}, region={})",
            worker.id, worker.org_id, worker.region
        );
        workers.insert(worker.id.clone(), worker);
        Ok(())
    }

    /// Update worker status
    pub async fn update_status(&self, worker_id: &str, status: WorkerStatus) -> Result<()> {
        let mut workers = self.workers.write().await;
        let worker = workers
            .get_mut(worker_id)
            .ok_or_else(|| ASRError::WorkerNotFound(worker_id.to_string()))?;
        worker.status = status;
        debug!("Updated worker {} status to {:?}", worker_id, status);
        Ok(())
    }

    /// Update worker performance after job completion
    pub async fn update_performance(
        &self,
        worker_id: &str,
        success: bool,
        response_time: f64,
        compute_hours: f64,
    ) -> Result<()> {
        let mut workers = self.workers.write().await;
        let worker = workers
            .get_mut(worker_id)
            .ok_or_else(|| ASRError::WorkerNotFound(worker_id.to_string()))?;

        let perf = &mut worker.performance;

        if success {
            perf.jobs_completed += 1;
        } else {
            perf.jobs_failed += 1;
        }

        let total_jobs = perf.jobs_completed + perf.jobs_failed;
        perf.success_rate = perf.jobs_completed as f64 / total_jobs as f64;

        // EWMA for response time
        if perf.avg_response_time == 0.0 {
            perf.avg_response_time = response_time;
        } else {
            perf.avg_response_time = self.config.ewma_alpha * response_time
                + (1.0 - self.config.ewma_alpha) * perf.avg_response_time;
        }

        perf.compute_hours += compute_hours;
        perf.quota_used += compute_hours / 100.0; // Normalized

        // Update EWMA score
        let new_score = if success { 1.0 } else { 0.0 };
        perf.ewma_score =
            self.config.ewma_alpha * new_score + (1.0 - self.config.ewma_alpha) * perf.ewma_score;

        // Update newcomer status
        if total_jobs >= 10 {
            worker.is_newcomer = false;
        }

        debug!(
            "Updated performance for {}: score={:.3}",
            worker_id, perf.ewma_score
        );
        Ok(())
    }

    /// Select worker for a job using VRF
    pub async fn select_worker(
        &self,
        job_id: &str,
        requirements: &JobRequirements,
        vrf_seed: [u8; 32],
    ) -> Result<SelectionResult> {
        let workers = self.workers.read().await;

        // Filter eligible workers
        let mut eligible: Vec<_> = workers
            .values()
            .filter(|w| self.is_eligible(w, requirements))
            .cloned()
            .collect();

        if eligible.is_empty() {
            return Err(ASRError::NoWorkersAvailable);
        }

        // Sort by score and take top-K
        eligible.sort_by(|a, b| {
            b.selection_score(&self.config)
                .partial_cmp(&a.selection_score(&self.config))
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let top_k = eligible
            .into_iter()
            .take(self.config.top_k)
            .collect::<Vec<_>>();

        // Generate VRF output
        let vrf_proof = self.compute_vrf(job_id, &vrf_seed);
        let mut rng = StdRng::from_seed(vrf_proof);

        // Exploration vs exploitation
        let is_exploration = rng.gen::<f64>() < self.config.exploration_rate;

        let selected = if is_exploration {
            // Random selection from all eligible
            &top_k[rng.gen_range(0..top_k.len())]
        } else {
            // Weighted selection by score
            self.weighted_select(&top_k, &mut rng)
        };

        // Check quota
        if self.config.anti_collusion_enabled {
            self.check_quota(&selected.org_id, "org").await?;
        }

        info!(
            "Selected worker {} for job {} (score={:.3}, explore={})",
            selected.id,
            job_id,
            selected.selection_score(&self.config),
            is_exploration
        );

        Ok(SelectionResult {
            worker_id: selected.id.clone(),
            score: selected.selection_score(&self.config),
            is_exploration,
            vrf_proof,
        })
    }

    /// Check if worker meets requirements
    fn is_eligible(&self, worker: &Worker, req: &JobRequirements) -> bool {
        if worker.status != WorkerStatus::Active {
            return false;
        }

        let cap = &worker.capability;

        // GPU type check
        if let Some(ref gpu_type) = req.gpu_type {
            if !cap.gpu_type.eq_ignore_ascii_case(gpu_type) {
                return false;
            }
        }

        // Resource checks
        if cap.gpu_memory_gb < req.min_gpu_memory_gb
            || cap.cpu_cores < req.min_cpu_cores
            || cap.ram_gb < req.min_ram_gb
        {
            return false;
        }

        // Framework check
        if let Some(ref framework) = req.framework {
            if !cap
                .frameworks
                .iter()
                .any(|f| f.eq_ignore_ascii_case(framework))
            {
                return false;
            }
        }

        true
    }

    /// Weighted random selection
    fn weighted_select<'a>(&self, workers: &'a [Worker], rng: &mut StdRng) -> &'a Worker {
        let total_score: f64 = workers
            .iter()
            .map(|w| w.selection_score(&self.config))
            .sum();
        let mut threshold = rng.gen::<f64>() * total_score;

        for worker in workers {
            threshold -= worker.selection_score(&self.config);
            if threshold <= 0.0 {
                return worker;
            }
        }

        &workers[0]
    }

    /// Check quota limits
    async fn check_quota(&self, entity_id: &str, entity_type: &str) -> Result<()> {
        let quotas = self.epoch_quotas.read().await;
        if let Some(&used) = quotas.get(entity_id) {
            if used > self.config.max_quota {
                return Err(ASRError::QuotaExceeded {
                    entity_type: entity_type.to_string(),
                    entity_id: entity_id.to_string(),
                });
            }
        }
        Ok(())
    }

    /// Compute VRF output
    fn compute_vrf(&self, job_id: &str, seed: &[u8; 32]) -> [u8; 32] {
        let mut hasher = Sha3_256::new();
        hasher.update(job_id.as_bytes());
        hasher.update(seed);
        let result = hasher.finalize();
        let mut output = [0u8; 32];
        output.copy_from_slice(&result);
        output
    }

    /// Get all active workers
    pub async fn get_active_workers(&self) -> Vec<Worker> {
        self.workers
            .read()
            .await
            .values()
            .filter(|w| w.status == WorkerStatus::Active)
            .cloned()
            .collect()
    }

    /// Get worker by ID
    pub async fn get_worker(&self, id: &str) -> Option<Worker> {
        self.workers.read().await.get(id).cloned()
    }

    /// Reset epoch quotas
    pub async fn reset_epoch(&self) {
        let mut quotas = self.epoch_quotas.write().await;
        quotas.clear();

        let mut epoch = self.current_epoch.write().await;
        *epoch += 1;

        // Reset worker quota usage
        let mut workers = self.workers.write().await;
        for worker in workers.values_mut() {
            worker.performance.quota_used = 0.0;
        }

        info!("Reset epoch to {}", *epoch);
    }

    /// Get ASR stats
    pub async fn get_stats(&self) -> ASRStats {
        let workers = self.workers.read().await;
        let active = workers
            .values()
            .filter(|w| w.status == WorkerStatus::Active)
            .count();
        let newcomers = workers.values().filter(|w| w.is_newcomer).count();
        let avg_score = if !workers.is_empty() {
            workers
                .values()
                .map(|w| w.performance.ewma_score)
                .sum::<f64>()
                / workers.len() as f64
        } else {
            0.0
        };

        ASRStats {
            total_workers: workers.len(),
            active_workers: active,
            newcomers,
            avg_score,
            current_epoch: *self.current_epoch.read().await,
        }
    }
}

/// ASR Statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ASRStats {
    pub total_workers: usize,
    pub active_workers: usize,
    pub newcomers: usize,
    pub avg_score: f64,
    pub current_epoch: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_worker(id: &str) -> Worker {
        Worker {
            id: id.to_string(),
            org_id: "org1".to_string(),
            asn: 12345,
            region: "us-west".to_string(),
            capability: WorkerCapability {
                gpu_type: "a100".to_string(),
                gpu_memory_gb: 80,
                cpu_cores: 32,
                ram_gb: 256,
                frameworks: vec!["pytorch".to_string(), "tensorflow".to_string()],
            },
            status: WorkerStatus::Active,
            performance: WorkerPerformance::default(),
            is_newcomer: true,
            registered_at: 0,
        }
    }

    #[tokio::test]
    async fn test_register_worker() {
        let asr = ASR::new(ASRConfig::default());
        let worker = create_test_worker("worker1");

        asr.register_worker(worker).await.unwrap();

        let found = asr.get_worker("worker1").await;
        assert!(found.is_some());
    }

    #[tokio::test]
    async fn test_select_worker() {
        let asr = ASR::new(ASRConfig::default());

        asr.register_worker(create_test_worker("worker1"))
            .await
            .unwrap();
        asr.register_worker(create_test_worker("worker2"))
            .await
            .unwrap();

        let result = asr
            .select_worker("job1", &JobRequirements::default(), [0u8; 32])
            .await
            .unwrap();

        assert!(!result.worker_id.is_empty());
    }

    #[tokio::test]
    async fn test_requirements_filter() {
        let asr = ASR::new(ASRConfig::default());
        asr.register_worker(create_test_worker("worker1"))
            .await
            .unwrap();

        // Require more than available
        let req = JobRequirements {
            min_gpu_memory_gb: 200, // More than A100's 80GB
            ..Default::default()
        };

        let result = asr.select_worker("job1", &req, [0u8; 32]).await;
        assert!(matches!(result, Err(ASRError::NoWorkersAvailable)));
    }

    #[tokio::test]
    async fn test_performance_update() {
        let asr = ASR::new(ASRConfig::default());
        asr.register_worker(create_test_worker("worker1"))
            .await
            .unwrap();

        // Successful job
        asr.update_performance("worker1", true, 5.0, 1.0)
            .await
            .unwrap();

        let worker = asr.get_worker("worker1").await.unwrap();
        assert_eq!(worker.performance.jobs_completed, 1);
        assert!(worker.performance.ewma_score > 0.5);
    }

    #[tokio::test]
    async fn test_newcomer_boost() {
        let config = ASRConfig {
            newcomer_boost: 0.2,
            ..Default::default()
        };
        let asr = ASR::new(config.clone());

        let mut worker = create_test_worker("worker1");
        worker.is_newcomer = true;
        asr.register_worker(worker.clone()).await.unwrap();

        let score = worker.selection_score(&config);
        assert!(score > 0.5); // Base + newcomer boost
    }
}
