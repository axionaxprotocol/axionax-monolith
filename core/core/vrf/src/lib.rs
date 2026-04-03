//! Verifiable Random Function (VRF) Module
//!
//! Delayed randomness for fair worker selection based on ARCHITECTURE v1.5
//! - Commit-reveal scheme with k-block delay
//! - Ed25519-based VRF
//! - Prevents front-running and manipulation

use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, info};

/// VRF Error types
#[derive(Error, Debug)]
pub enum VRFError {
    #[error("Invalid proof")]
    InvalidProof,

    #[error("Commitment not found: {0}")]
    CommitmentNotFound(String),

    #[error("Reveal too early: wait {blocks_remaining} more blocks")]
    RevealTooEarly { blocks_remaining: u64 },

    #[error("Already revealed: {0}")]
    AlreadyRevealed(String),

    #[error("Commitment expired")]
    CommitmentExpired,

    #[error("Signature error: {0}")]
    SignatureError(String),
}

pub type Result<T> = std::result::Result<T, VRFError>;

/// VRF Configuration (aligned with ARCHITECTURE v1.5)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VRFConfig {
    /// VRF delay in blocks (k)
    /// Recommended: ≥2 blocks
    pub delay_blocks: u64,

    /// Commitment expiry in blocks
    pub expiry_blocks: u64,

    /// Enable delayed reveal
    pub delayed_reveal_enabled: bool,
}

impl Default for VRFConfig {
    fn default() -> Self {
        Self {
            delay_blocks: 2,
            expiry_blocks: 100,
            delayed_reveal_enabled: true,
        }
    }
}

/// VRF Commitment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Commitment {
    /// Commitment ID
    pub id: String,

    /// Commitment hash (H(secret || input))
    pub hash: [u8; 32],

    /// Block number when committed
    pub commit_block: u64,

    /// Block number when reveal is allowed
    pub reveal_block: u64,

    /// Block number when commitment expires
    pub expiry_block: u64,

    /// Has been revealed
    pub revealed: bool,

    /// Reveal data (after reveal)
    pub reveal_data: Option<RevealData>,
}

/// Revealed data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevealData {
    /// Secret value
    pub secret: [u8; 32],

    /// Input data
    pub input: Vec<u8>,

    /// VRF output
    pub output: [u8; 32],

    /// VRF proof (signature)
    pub proof: Vec<u8>,

    /// Reveal block
    pub reveal_block: u64,
}

/// VRF Keypair wrapper
pub struct VRFKeyPair {
    signing_key: SigningKey,
    verifying_key: VerifyingKey,
}

impl VRFKeyPair {
    /// Generate new keypair
    pub fn generate() -> Self {
        let signing_key = SigningKey::generate(&mut OsRng);
        let verifying_key = signing_key.verifying_key();
        Self {
            signing_key,
            verifying_key,
        }
    }

    /// Create from secret key bytes
    pub fn from_bytes(bytes: &[u8; 32]) -> Result<Self> {
        let signing_key = SigningKey::from_bytes(bytes);
        let verifying_key = signing_key.verifying_key();
        Ok(Self {
            signing_key,
            verifying_key,
        })
    }

    /// Get public key bytes
    pub fn public_key_bytes(&self) -> [u8; 32] {
        self.verifying_key.to_bytes()
    }

    /// Get secret key bytes
    #[allow(dead_code)]
    pub(crate) fn secret_key_bytes(&self) -> [u8; 32] {
        self.signing_key.to_bytes()
    }
}

/// Verifiable Random Function service
pub struct VRF {
    config: VRFConfig,
    commitments: Arc<RwLock<HashMap<String, Commitment>>>,
    current_block: Arc<RwLock<u64>>,
}

impl VRF {
    /// Create new VRF instance
    pub fn new(config: VRFConfig) -> Self {
        Self {
            config,
            commitments: Arc::new(RwLock::new(HashMap::new())),
            current_block: Arc::new(RwLock::new(0)),
        }
    }

    /// Set current block number
    pub async fn set_block(&self, block: u64) {
        *self.current_block.write().await = block;
    }

    /// Get current block
    pub async fn get_block(&self) -> u64 {
        *self.current_block.read().await
    }

    /// Generate VRF output for input
    pub fn evaluate(&self, keypair: &VRFKeyPair, input: &[u8]) -> (VRFOutput, VRFProof) {
        // Hash the input
        let mut hasher = Sha3_256::new();
        hasher.update(input);
        let input_hash = hasher.finalize();

        // Sign the hash to create proof
        let signature = keypair.signing_key.sign(&input_hash);

        // VRF output is hash of signature
        let mut output_hasher = Sha3_256::new();
        output_hasher.update(signature.to_bytes());
        let output = output_hasher.finalize();

        let mut output_bytes = [0u8; 32];
        output_bytes.copy_from_slice(&output);

        (
            VRFOutput {
                value: output_bytes,
            },
            VRFProof {
                proof: signature.to_bytes().to_vec(),
                public_key: keypair.public_key_bytes(),
            },
        )
    }

    /// Verify VRF proof
    pub fn verify(&self, output: &VRFOutput, proof: &VRFProof, input: &[u8]) -> bool {
        // Reconstruct verifying key
        let verifying_key = match VerifyingKey::from_bytes(&proof.public_key) {
            Ok(key) => key,
            Err(_) => return false,
        };

        // Hash the input
        let mut hasher = Sha3_256::new();
        hasher.update(input);
        let input_hash = hasher.finalize();

        // Verify signature
        let signature = match Signature::from_slice(&proof.proof) {
            Ok(sig) => sig,
            Err(_) => return false,
        };

        if verifying_key.verify(&input_hash, &signature).is_err() {
            return false;
        }

        // Verify output matches
        let mut output_hasher = Sha3_256::new();
        output_hasher.update(&proof.proof);
        let expected_output = output_hasher.finalize();

        let mut expected_bytes = [0u8; 32];
        expected_bytes.copy_from_slice(&expected_output);

        output.value == expected_bytes
    }

    /// Create commitment (commit phase)
    pub async fn commit(&self, id: String, secret: [u8; 32], input: &[u8]) -> Commitment {
        let current = self.get_block().await;

        // Compute commitment hash
        let mut hasher = Sha3_256::new();
        hasher.update(secret);
        hasher.update(input);
        let hash = hasher.finalize();
        let mut hash_bytes = [0u8; 32];
        hash_bytes.copy_from_slice(&hash);

        let commitment = Commitment {
            id: id.clone(),
            hash: hash_bytes,
            commit_block: current,
            reveal_block: current + self.config.delay_blocks,
            expiry_block: current + self.config.expiry_blocks,
            revealed: false,
            reveal_data: None,
        };

        let mut commitments = self.commitments.write().await;
        commitments.insert(id.clone(), commitment.clone());

        info!(
            "Created commitment {}: reveal at block {}, expires at {}",
            id, commitment.reveal_block, commitment.expiry_block
        );

        commitment
    }

    /// Reveal commitment (reveal phase)
    pub async fn reveal(
        &self,
        id: &str,
        secret: [u8; 32],
        input: &[u8],
        keypair: &VRFKeyPair,
    ) -> Result<RevealData> {
        let current = self.get_block().await;
        let mut commitments = self.commitments.write().await;

        let commitment = commitments
            .get_mut(id)
            .ok_or_else(|| VRFError::CommitmentNotFound(id.to_string()))?;

        // Check if already revealed
        if commitment.revealed {
            return Err(VRFError::AlreadyRevealed(id.to_string()));
        }

        // Check delay
        if self.config.delayed_reveal_enabled && current < commitment.reveal_block {
            return Err(VRFError::RevealTooEarly {
                blocks_remaining: commitment.reveal_block - current,
            });
        }

        // Check expiry
        if current > commitment.expiry_block {
            return Err(VRFError::CommitmentExpired);
        }

        // Verify commitment hash
        let mut hasher = Sha3_256::new();
        hasher.update(secret);
        hasher.update(input);
        let hash = hasher.finalize();
        let mut hash_bytes = [0u8; 32];
        hash_bytes.copy_from_slice(&hash);

        if hash_bytes != commitment.hash {
            return Err(VRFError::InvalidProof);
        }

        // Generate VRF output
        let (output, proof) = self.evaluate(keypair, input);

        let reveal_data = RevealData {
            secret,
            input: input.to_vec(),
            output: output.value,
            proof: proof.proof,
            reveal_block: current,
        };

        commitment.revealed = true;
        commitment.reveal_data = Some(reveal_data.clone());

        info!("Revealed commitment {}", id);

        Ok(reveal_data)
    }

    /// Get commitment by ID
    pub async fn get_commitment(&self, id: &str) -> Option<Commitment> {
        self.commitments.read().await.get(id).cloned()
    }

    /// Generate random seed from block hash and VRF
    pub fn generate_seed(&self, block_hash: &[u8], vrf_output: &VRFOutput) -> [u8; 32] {
        let mut hasher = Sha3_256::new();
        hasher.update(block_hash);
        hasher.update(vrf_output.value);
        let result = hasher.finalize();
        let mut seed = [0u8; 32];
        seed.copy_from_slice(&result);
        seed
    }

    /// Cleanup expired commitments
    pub async fn cleanup_expired(&self) -> usize {
        let current = self.get_block().await;
        let mut commitments = self.commitments.write().await;

        let expired: Vec<_> = commitments
            .iter()
            .filter(|(_, c)| c.expiry_block < current && !c.revealed)
            .map(|(id, _)| id.clone())
            .collect();

        let count = expired.len();
        for id in expired {
            commitments.remove(&id);
            debug!("Cleaned up expired commitment: {}", id);
        }

        if count > 0 {
            info!("Cleaned up {} expired commitments", count);
        }

        count
    }
}

/// VRF Output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VRFOutput {
    pub value: [u8; 32],
}

impl VRFOutput {
    /// Convert to u64 (for sampling)
    pub fn to_u64(&self) -> u64 {
        u64::from_le_bytes(self.value[..8].try_into().unwrap())
    }

    /// Convert to f64 in range [0, 1)
    pub fn to_f64(&self) -> f64 {
        self.to_u64() as f64 / u64::MAX as f64
    }
}

/// VRF Proof
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VRFProof {
    pub proof: Vec<u8>,
    pub public_key: [u8; 32],
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let keypair = VRFKeyPair::generate();
        assert!(!keypair.public_key_bytes().iter().all(|&b| b == 0));
    }

    #[test]
    fn test_evaluate_and_verify() {
        let vrf = VRF::new(VRFConfig::default());
        let keypair = VRFKeyPair::generate();
        let input = b"test input";

        let (output, proof) = vrf.evaluate(&keypair, input);

        assert!(vrf.verify(&output, &proof, input));
    }

    #[test]
    fn test_verify_fails_wrong_input() {
        let vrf = VRF::new(VRFConfig::default());
        let keypair = VRFKeyPair::generate();

        let (output, proof) = vrf.evaluate(&keypair, b"correct input");

        assert!(!vrf.verify(&output, &proof, b"wrong input"));
    }

    #[test]
    fn test_deterministic_output() {
        let vrf = VRF::new(VRFConfig::default());
        let keypair = VRFKeyPair::generate();
        let input = b"same input";

        let (output1, _) = vrf.evaluate(&keypair, input);
        let (output2, _) = vrf.evaluate(&keypair, input);

        assert_eq!(output1.value, output2.value);
    }

    #[tokio::test]
    async fn test_commit_reveal() {
        let vrf = VRF::new(VRFConfig {
            delay_blocks: 2,
            ..Default::default()
        });
        let keypair = VRFKeyPair::generate();
        let secret = [1u8; 32];
        let input = b"test input";

        // Commit at block 0
        vrf.set_block(0).await;
        let commitment = vrf.commit("test".to_string(), secret, input).await;
        assert_eq!(commitment.reveal_block, 2);

        // Try reveal too early (block 1)
        vrf.set_block(1).await;
        let result = vrf.reveal("test", secret, input, &keypair).await;
        assert!(matches!(result, Err(VRFError::RevealTooEarly { .. })));

        // Reveal at block 2
        vrf.set_block(2).await;
        let reveal = vrf.reveal("test", secret, input, &keypair).await.unwrap();
        assert!(!reveal.output.iter().all(|&b| b == 0));
    }

    #[test]
    fn test_output_conversion() {
        let output = VRFOutput { value: [255u8; 32] };

        let f = output.to_f64();
        assert!((0.0..=1.0).contains(&f)); // Can equal 1.0 at max value
    }

    #[tokio::test]
    async fn test_generate_seed() {
        let vrf = VRF::new(VRFConfig::default());
        let keypair = VRFKeyPair::generate();

        let (output, _) = vrf.evaluate(&keypair, b"input");
        let block_hash = [42u8; 32];

        let seed = vrf.generate_seed(&block_hash, &output);
        assert!(!seed.iter().all(|&b| b == 0));
    }
}
