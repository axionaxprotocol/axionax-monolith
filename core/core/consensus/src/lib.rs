//! axionax Consensus Engine (PoPC)
//!
//! Implements Proof-of-Probabilistic-Checking consensus mechanism

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// PoPC Validator represents a network validator
#[derive(Debug, Clone)]
pub struct Validator {
    pub address: String,
    pub stake: u128,
    pub total_votes: u64,
    pub correct_votes: u64,
    pub false_pass: u64,
    pub is_active: bool,
}

/// Challenge represents a PoPC verification challenge
#[derive(Debug, Clone)]
pub struct Challenge {
    pub job_id: String,
    pub samples: Vec<usize>,
    pub vrf_seed: [u8; 32],
    pub sample_size: usize,
}

/// ConsensusEngine manages the PoPC consensus
pub struct ConsensusEngine {
    validators: Arc<RwLock<HashMap<String, Validator>>>,
    config: ConsensusConfig,
}

/// Configuration for consensus engine
#[derive(Debug, Clone)]
pub struct ConsensusConfig {
    pub sample_size: usize,
    pub min_confidence: f64,
    pub fraud_window_blocks: u64,
    pub min_validator_stake: u128,
    pub false_pass_penalty_bps: u16, // basis points
}

impl ConsensusEngine {
    /// Creates a new consensus engine
    pub fn new(config: ConsensusConfig) -> Self {
        Self {
            validators: Arc::new(RwLock::new(HashMap::new())),
            config,
        }
    }

    /// Registers a new validator
    pub async fn register_validator(&self, validator: Validator) -> Result<(), String> {
        if validator.stake < self.config.min_validator_stake {
            return Err("Insufficient stake".to_string());
        }

        let mut validators = self.validators.write().await;
        validators.insert(validator.address.clone(), validator);
        Ok(())
    }

    /// Generates a PoPC challenge
    pub fn generate_challenge(
        &self,
        job_id: String,
        output_size: usize,
        vrf_seed: [u8; 32],
    ) -> Challenge {
        let sample_size = self.config.sample_size.min(output_size);

        // Generate deterministic samples using VRF seed
        let samples = self.generate_samples(output_size, sample_size, &vrf_seed);

        Challenge {
            job_id,
            samples,
            vrf_seed,
            sample_size,
        }
    }

    /// Verifies a proof against a challenge
    pub fn verify_proof(&self, challenge: &Challenge, proof_data: &[u8]) -> bool {
        // Merkle proof verification:
        // 1. Verify proof_data length matches sample_size
        // 2. Reconstruct Merkle root from samples
        // 3. Compare with expected root

        if proof_data.len() < challenge.sample_size * 32 {
            return false; // Invalid proof size
        }

        // For now, basic length validation
        // Full implementation would verify Merkle tree structure
        true
    }

    /// Calculates fraud detection probability
    pub fn fraud_detection_probability(fraud_rate: f64, sample_size: usize) -> f64 {
        1.0 - (1.0 - fraud_rate).powi(sample_size as i32)
    }

    fn generate_samples(
        &self,
        output_size: usize,
        sample_size: usize,
        seed: &[u8; 32],
    ) -> Vec<usize> {
        use sha3::{Digest, Sha3_256};

        let mut samples = Vec::with_capacity(sample_size);
        let mut hasher = Sha3_256::new();

        for i in 0..sample_size {
            hasher.update(seed);
            hasher.update(i.to_le_bytes());
            let hash = hasher.finalize_reset();

            let index = u64::from_le_bytes(hash[0..8].try_into().unwrap()) as usize % output_size;
            samples.push(index);
        }

        samples
    }
}

impl Default for ConsensusConfig {
    fn default() -> Self {
        Self {
            sample_size: 1000,              // Recommended: 600-1500 (ARCHITECTURE v1.5)
            min_confidence: 0.99,           // 99%+ required detection probability
            fraud_window_blocks: 720,       // ~3600s @ 5s/block (Δt_fraud)
            min_validator_stake: 1_000_000, // Minimum stake requirement
            false_pass_penalty_bps: 500,    // 5% (≥500 bps per ARCHITECTURE v1.5)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_validator(address: &str, stake: u128) -> Validator {
        Validator {
            address: address.to_string(),
            stake,
            total_votes: 0,
            correct_votes: 0,
            false_pass: 0,
            is_active: true,
        }
    }

    #[tokio::test]
    async fn test_register_validator() {
        let engine = ConsensusEngine::new(ConsensusConfig::default());

        let validator = Validator {
            address: "0x1234".to_string(),
            stake: 10_000 * 10_u128.pow(18),
            total_votes: 0,
            correct_votes: 0,
            false_pass: 0,
            is_active: true,
        };

        let result = engine.register_validator(validator).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_fraud_detection_probability() {
        let prob = ConsensusEngine::fraud_detection_probability(0.1, 100);
        assert!(prob > 0.9999);
    }

    #[test]
    fn test_generate_challenge() {
        let engine = ConsensusEngine::new(ConsensusConfig::default());
        let challenge = engine.generate_challenge("job-123".to_string(), 10000, [1u8; 32]);

        assert_eq!(challenge.job_id, "job-123");
        assert_eq!(challenge.samples.len(), 1000);
    }

    #[tokio::test]
    async fn test_insufficient_stake_rejected() {
        let engine = ConsensusEngine::new(ConsensusConfig::default());

        // Stake below minimum (1_000_000)
        let validator = create_test_validator("0x5678", 500_000);
        let result = engine.register_validator(validator).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Insufficient stake"));
    }

    #[test]
    fn test_sample_size_capped_by_output_size() {
        let engine = ConsensusEngine::new(ConsensusConfig::default());
        
        // Output size (100) is less than sample_size (1000)
        let challenge = engine.generate_challenge("small-job".to_string(), 100, [42u8; 32]);

        // Sample size should be capped to output size
        assert_eq!(challenge.sample_size, 100);
        assert_eq!(challenge.samples.len(), 100);
    }

    #[test]
    fn test_deterministic_challenge_generation() {
        let engine = ConsensusEngine::new(ConsensusConfig::default());
        let seed = [123u8; 32];

        let challenge1 = engine.generate_challenge("job-det".to_string(), 10000, seed);
        let challenge2 = engine.generate_challenge("job-det".to_string(), 10000, seed);

        // Same seed should produce same samples
        assert_eq!(challenge1.samples, challenge2.samples);
    }

    #[test]
    fn test_different_seeds_produce_different_samples() {
        let engine = ConsensusEngine::new(ConsensusConfig::default());

        let challenge1 = engine.generate_challenge("job-1".to_string(), 10000, [1u8; 32]);
        let challenge2 = engine.generate_challenge("job-2".to_string(), 10000, [2u8; 32]);

        // Different seeds should produce different samples
        assert_ne!(challenge1.samples, challenge2.samples);
    }

    #[test]
    fn test_fraud_detection_probability_edge_cases() {
        // 0% fraud rate should have 0% detection
        let prob_zero = ConsensusEngine::fraud_detection_probability(0.0, 1000);
        assert!((prob_zero - 0.0).abs() < 0.0001);

        // 100% fraud rate should have 100% detection
        let prob_full = ConsensusEngine::fraud_detection_probability(1.0, 1);
        assert!((prob_full - 1.0).abs() < 0.0001);

        // Very low fraud rate with many samples
        let prob_low = ConsensusEngine::fraud_detection_probability(0.001, 1000);
        assert!(prob_low > 0.6); // Should still detect with reasonable probability
    }

    #[test]
    fn test_verify_proof_invalid_size() {
        let engine = ConsensusEngine::new(ConsensusConfig::default());
        let challenge = engine.generate_challenge("job-verify".to_string(), 10000, [1u8; 32]);

        // Proof data too small (needs sample_size * 32 bytes)
        let small_proof = vec![0u8; 100];
        assert!(!engine.verify_proof(&challenge, &small_proof));
    }

    #[test]
    fn test_verify_proof_valid_size() {
        let engine = ConsensusEngine::new(ConsensusConfig::default());
        let challenge = engine.generate_challenge("job-verify".to_string(), 10000, [1u8; 32]);

        // Correct size proof
        let valid_proof = vec![0u8; challenge.sample_size * 32];
        assert!(engine.verify_proof(&challenge, &valid_proof));
    }

    #[test]
    fn test_custom_config() {
        let config = ConsensusConfig {
            sample_size: 500,
            min_confidence: 0.95,
            fraud_window_blocks: 360,
            min_validator_stake: 500_000,
            false_pass_penalty_bps: 1000,
        };

        let engine = ConsensusEngine::new(config);
        let challenge = engine.generate_challenge("job-custom".to_string(), 10000, [1u8; 32]);

        assert_eq!(challenge.sample_size, 500);
    }
}
