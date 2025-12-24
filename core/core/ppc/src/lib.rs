//! Posted Price Controller (PPC) Module
//!
//! Dynamic pricing mechanism for compute resources based on ARCHITECTURE v1.5
//! - Adjusts prices based on utilization and queue time
//! - Prevents price manipulation
//! - Ensures fair pricing for workers and requesters

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, info};

/// PPC Error types
#[derive(Error, Debug)]
pub enum PPCError {
    #[error("Invalid price: {0}")]
    InvalidPrice(String),

    #[error("Resource class not found: {0}")]
    ClassNotFound(String),

    #[error("Price out of bounds: min={min}, max={max}, got={value}")]
    PriceOutOfBounds { min: f64, max: f64, value: f64 },
}

pub type Result<T> = std::result::Result<T, PPCError>;

/// PPC Configuration (aligned with ARCHITECTURE v1.5)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PPCConfig {
    /// Target utilization (util*)
    /// Recommended: 0.7 (70%)
    pub target_utilization: f64,

    /// Target queue time in seconds (q*)
    /// Recommended: 60s
    pub target_queue_time_seconds: u64,

    /// Price adjustment rate (α)
    pub alpha: f64,

    /// Queue weight factor (β)
    pub beta: f64,

    /// Adjustment interval in seconds
    pub adjustment_interval_seconds: u64,
}

impl Default for PPCConfig {
    fn default() -> Self {
        Self {
            target_utilization: 0.7,
            target_queue_time_seconds: 60,
            alpha: 0.1,
            beta: 0.05,
            adjustment_interval_seconds: 300, // 5 minutes
        }
    }
}

/// Resource class definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceClass {
    /// Class identifier (e.g., "gpu-a100", "cpu-standard")
    pub id: String,

    /// Human-readable name
    pub name: String,

    /// Current price per unit (in base tokens)
    pub current_price: f64,

    /// Minimum price floor
    pub min_price: f64,

    /// Maximum price ceiling
    pub max_price: f64,

    /// Current utilization (0.0 - 1.0)
    pub utilization: f64,

    /// Average queue time in seconds
    pub avg_queue_time: f64,

    /// Total capacity units
    pub total_capacity: u64,

    /// Used capacity units
    pub used_capacity: u64,

    /// Last price adjustment timestamp
    pub last_adjustment: u64,
}

impl ResourceClass {
    pub fn new(id: String, name: String, base_price: f64, min: f64, max: f64, capacity: u64) -> Self {
        Self {
            id,
            name,
            current_price: base_price,
            min_price: min,
            max_price: max,
            utilization: 0.0,
            avg_queue_time: 0.0,
            total_capacity: capacity,
            used_capacity: 0,
            last_adjustment: 0,
        }
    }

    /// Calculate utilization
    pub fn calculate_utilization(&self) -> f64 {
        if self.total_capacity == 0 {
            return 0.0;
        }
        self.used_capacity as f64 / self.total_capacity as f64
    }
}

/// Price update record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceUpdate {
    pub class_id: String,
    pub old_price: f64,
    pub new_price: f64,
    pub utilization: f64,
    pub queue_time: f64,
    pub timestamp: u64,
}

/// Posted Price Controller
pub struct PPC {
    config: PPCConfig,
    classes: Arc<RwLock<HashMap<String, ResourceClass>>>,
    price_history: Arc<RwLock<Vec<PriceUpdate>>>,
}

impl PPC {
    /// Create new PPC instance
    pub fn new(config: PPCConfig) -> Self {
        Self {
            config,
            classes: Arc::new(RwLock::new(HashMap::new())),
            price_history: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Register a new resource class
    pub async fn register_class(&self, class: ResourceClass) -> Result<()> {
        if class.min_price > class.max_price {
            return Err(PPCError::InvalidPrice(
                "min_price cannot be greater than max_price".to_string(),
            ));
        }

        let mut classes = self.classes.write().await;
        info!("Registered resource class: {} ({})", class.id, class.name);
        classes.insert(class.id.clone(), class);
        Ok(())
    }

    /// Get current price for a resource class
    pub async fn get_price(&self, class_id: &str) -> Result<f64> {
        let classes = self.classes.read().await;
        let class = classes
            .get(class_id)
            .ok_or_else(|| PPCError::ClassNotFound(class_id.to_string()))?;
        Ok(class.current_price)
    }

    /// Get all resource classes
    pub async fn get_all_classes(&self) -> Vec<ResourceClass> {
        self.classes.read().await.values().cloned().collect()
    }

    /// Update utilization metrics for a class
    pub async fn update_metrics(
        &self,
        class_id: &str,
        used_capacity: u64,
        avg_queue_time: f64,
    ) -> Result<()> {
        let mut classes = self.classes.write().await;
        let class = classes
            .get_mut(class_id)
            .ok_or_else(|| PPCError::ClassNotFound(class_id.to_string()))?;

        class.used_capacity = used_capacity;
        class.utilization = class.calculate_utilization();
        class.avg_queue_time = avg_queue_time;

        debug!(
            "Updated metrics for {}: util={:.2}, queue={:.1}s",
            class_id, class.utilization, class.avg_queue_time
        );
        Ok(())
    }

    /// Adjust prices based on current metrics
    /// Formula: P_new = P_old * (1 + α * (util - util*) + β * (q - q*) / q*)
    pub async fn adjust_prices(&self, current_time: u64) -> Vec<PriceUpdate> {
        let mut classes = self.classes.write().await;
        let mut history = self.price_history.write().await;
        let mut updates = Vec::new();

        for class in classes.values_mut() {
            // Check if enough time has passed since last adjustment
            if current_time - class.last_adjustment < self.config.adjustment_interval_seconds {
                continue;
            }

            let old_price = class.current_price;

            // Calculate adjustment factors
            let util_factor = class.utilization - self.config.target_utilization;
            let queue_factor = if self.config.target_queue_time_seconds > 0 {
                (class.avg_queue_time - self.config.target_queue_time_seconds as f64)
                    / self.config.target_queue_time_seconds as f64
            } else {
                0.0
            };

            // Calculate price adjustment
            let adjustment = 1.0 + self.config.alpha * util_factor + self.config.beta * queue_factor;
            let mut new_price = old_price * adjustment;

            // Clamp to bounds
            new_price = new_price.clamp(class.min_price, class.max_price);

            if (new_price - old_price).abs() > 0.001 {
                let update = PriceUpdate {
                    class_id: class.id.clone(),
                    old_price,
                    new_price,
                    utilization: class.utilization,
                    queue_time: class.avg_queue_time,
                    timestamp: current_time,
                };

                class.current_price = new_price;
                class.last_adjustment = current_time;

                info!(
                    "Price adjusted for {}: {:.4} -> {:.4} (util={:.2}, queue={:.1}s)",
                    class.id, old_price, new_price, class.utilization, class.avg_queue_time
                );

                history.push(update.clone());
                updates.push(update);
            }
        }

        updates
    }

    /// Get price history for a class
    pub async fn get_price_history(&self, class_id: &str, limit: usize) -> Vec<PriceUpdate> {
        let history = self.price_history.read().await;
        history
            .iter()
            .filter(|u| u.class_id == class_id)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Calculate estimated cost for a job
    pub async fn estimate_cost(
        &self,
        class_id: &str,
        units: u64,
        duration_seconds: u64,
    ) -> Result<f64> {
        let price = self.get_price(class_id).await?;
        Ok(price * units as f64 * duration_seconds as f64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_class() -> ResourceClass {
        ResourceClass::new(
            "gpu-a100".to_string(),
            "NVIDIA A100".to_string(),
            1.0,  // base price
            0.5,  // min
            5.0,  // max
            100,  // capacity
        )
    }

    #[tokio::test]
    async fn test_register_class() {
        let ppc = PPC::new(PPCConfig::default());
        let class = create_test_class();

        ppc.register_class(class).await.unwrap();

        let price = ppc.get_price("gpu-a100").await.unwrap();
        assert_eq!(price, 1.0);
    }

    #[tokio::test]
    async fn test_price_increases_on_high_utilization() {
        let ppc = PPC::new(PPCConfig {
            target_utilization: 0.7,
            alpha: 0.5, // Higher alpha for visible change
            adjustment_interval_seconds: 0,
            target_queue_time_seconds: 0, // Disable queue factor
            ..Default::default()
        });

        let class = create_test_class();
        ppc.register_class(class).await.unwrap();

        // Set high utilization (90%)
        ppc.update_metrics("gpu-a100", 90, 0.0).await.unwrap();

        // Adjust prices
        let updates = ppc.adjust_prices(1000).await;

        assert!(!updates.is_empty());
        assert!(updates[0].new_price > updates[0].old_price);
    }



    #[tokio::test]
    async fn test_price_decreases_on_low_utilization() {
        let ppc = PPC::new(PPCConfig {
            target_utilization: 0.7,
            alpha: 0.1,
            adjustment_interval_seconds: 0,
            ..Default::default()
        });

        let class = create_test_class();
        ppc.register_class(class).await.unwrap();

        // Set low utilization (30%)
        ppc.update_metrics("gpu-a100", 30, 0.0).await.unwrap();

        let updates = ppc.adjust_prices(1000).await;

        assert!(!updates.is_empty());
        assert!(updates[0].new_price < updates[0].old_price);
    }


    #[tokio::test]
    async fn test_price_respects_bounds() {
        let ppc = PPC::new(PPCConfig {
            target_utilization: 0.7,
            alpha: 1.0, // Very aggressive
            adjustment_interval_seconds: 0,
            ..Default::default()
        });

        let class = create_test_class();
        ppc.register_class(class).await.unwrap();

        // Very high utilization
        ppc.update_metrics("gpu-a100", 100, 0.0).await.unwrap();
        ppc.adjust_prices(1000).await;

        let price = ppc.get_price("gpu-a100").await.unwrap();
        assert!(price <= 5.0); // max bound
    }


    #[tokio::test]
    async fn test_estimate_cost() {
        let ppc = PPC::new(PPCConfig::default());
        let class = create_test_class();
        ppc.register_class(class).await.unwrap();

        let cost = ppc.estimate_cost("gpu-a100", 4, 3600).await.unwrap();
        assert_eq!(cost, 1.0 * 4.0 * 3600.0); // price * units * duration
    }
}
