//! Verifiable Random Function (VRF) Implementation
//! 
//! Uses schnorrkel library for industry-standard ECVRF (Elliptic Curve VRF).
//! This is the same VRF implementation used by Polkadot and Substrate.
//!
//! # Features
//! - Deterministic random output from input + secret key
//! - Publicly verifiable proofs
//! - Unpredictable outputs without the secret key

use schnorrkel::{
    vrf::{VRFInOut, VRFPreOut, VRFProof},
    Keypair, PublicKey, SecretKey,
    signing_context,
};
use rand::rngs::OsRng;

/// VRF output type (32 bytes)
pub type VrfOutput = [u8; 32];

/// VRF proof type - contains both preout and proof
/// Format: [PreOut (32 bytes)] + [Proof (64 bytes)] = 96 bytes total
pub type VrfProofBytes = [u8; 96];

/// Context for VRF operations
const VRF_CONTEXT: &[u8] = b"AxionaxVRF";

/// ECVRF - Elliptic Curve Verifiable Random Function
/// 
/// Production-ready VRF implementation using schnorrkel (sr25519).
/// Used for consensus random sampling in PoPC.
pub struct ECVRF {
    keypair: Keypair,
}

/// VRF output with proof
#[derive(Debug, Clone)]
pub struct VrfResult {
    /// 32-byte random output
    pub output: VrfOutput,
    /// 96-byte proof (preout + proof)
    pub proof: VrfProofBytes,
}

impl ECVRF {
    /// Creates a new ECVRF with a random keypair
    pub fn new() -> Self {
        let keypair = Keypair::generate_with(OsRng);
        Self { keypair }
    }

    /// Creates ECVRF from existing secret key bytes
    pub fn from_secret_bytes(secret: &[u8; 32]) -> Result<Self, String> {
        let secret_key = SecretKey::from_bytes(secret)
            .map_err(|e| format!("Invalid secret key: {}", e))?;
        let keypair = Keypair::from(secret_key);
        Ok(Self { keypair })
    }

    /// Gets the public key bytes
    pub fn public_key(&self) -> [u8; 32] {
        self.keypair.public.to_bytes()
    }

    /// Generates VRF output and proof for the given input
    /// 
    /// The output is deterministic: same input + secret key = same output.
    /// The proof allows anyone with the public key to verify the output.
    pub fn prove(&self, input: &[u8]) -> VrfResult {
        let ctx = signing_context(VRF_CONTEXT);
        let (inout, proof, _) = self.keypair.vrf_sign(ctx.bytes(input));
        
        let output = self.output_to_bytes(&inout);
        
        // Serialize preout (32 bytes) + proof (64 bytes) = 96 bytes
        let preout_bytes = inout.to_preout().to_bytes();
        let proof_bytes = proof.to_bytes();
        
        let mut full_proof = [0u8; 96];
        full_proof[..32].copy_from_slice(&preout_bytes);
        full_proof[32..].copy_from_slice(&proof_bytes);
        
        VrfResult {
            output,
            proof: full_proof,
        }
    }

    /// Verifies a VRF proof and returns the output if valid
    pub fn verify(
        public_key: &[u8; 32],
        input: &[u8],
        proof_bytes: &VrfProofBytes,
    ) -> Result<VrfOutput, String> {
        let public = PublicKey::from_bytes(public_key)
            .map_err(|e| format!("Invalid public key: {}", e))?;
        
        // Extract preout (32 bytes) and proof (64 bytes)
        let mut preout_bytes = [0u8; 32];
        preout_bytes.copy_from_slice(&proof_bytes[..32]);
        let preout = VRFPreOut::from_bytes(&preout_bytes)
            .map_err(|e| format!("Invalid preout: {}", e))?;
        
        let mut raw_proof = [0u8; 64];
        raw_proof.copy_from_slice(&proof_bytes[32..]);
        let proof = VRFProof::from_bytes(&raw_proof)
            .map_err(|e| format!("Invalid proof: {}", e))?;
        
        let ctx = signing_context(VRF_CONTEXT);
        
        let (inout, _) = public.vrf_verify(ctx.bytes(input), &preout, &proof)
            .map_err(|e| format!("Verification failed: {}", e))?;
        
        Ok(Self::inout_to_bytes(&inout))
    }

    /// Generates random bytes from VRF output (for sampling)
    pub fn random_bytes(&self, input: &[u8], length: usize) -> Vec<u8> {
        let result = self.prove(input);
        
        // Use output as seed for deterministic expansion
        let mut output = Vec::with_capacity(length);
        let mut counter = 0u64;
        
        while output.len() < length {
            let mut hasher = sha3::Sha3_256::new();
            use sha3::Digest;
            hasher.update(&result.output);
            hasher.update(&counter.to_le_bytes());
            let hash = hasher.finalize();
            output.extend_from_slice(&hash);
            counter += 1;
        }
        
        output.truncate(length);
        output
    }

    fn output_to_bytes(&self, inout: &VRFInOut) -> VrfOutput {
        let hash = inout.make_bytes::<[u8; 32]>(b"VRFOutput");
        hash
    }

    fn inout_to_bytes(inout: &VRFInOut) -> VrfOutput {
        inout.make_bytes::<[u8; 32]>(b"VRFOutput")
    }
}

impl Default for ECVRF {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prove_verify() {
        let vrf = ECVRF::new();
        let input = b"test input data";
        
        let result = vrf.prove(input);
        
        // Verify with public key
        let public_key = vrf.public_key();
        let verified_output = ECVRF::verify(&public_key, input, &result.proof).unwrap();
        
        assert_eq!(result.output, verified_output);
    }

    #[test]
    fn test_deterministic_output() {
        // Create VRF from fixed secret
        let secret = [42u8; 32];
        let vrf = ECVRF::from_secret_bytes(&secret).unwrap();
        
        let input = b"deterministic test";
        
        let result1 = vrf.prove(input);
        let result2 = vrf.prove(input);
        
        // Same input = same output
        assert_eq!(result1.output, result2.output);
    }

    #[test]
    fn test_different_inputs_different_outputs() {
        let vrf = ECVRF::new();
        
        let result1 = vrf.prove(b"input1");
        let result2 = vrf.prove(b"input2");
        
        assert_ne!(result1.output, result2.output);
    }

    #[test]
    fn test_different_keys_different_outputs() {
        let vrf1 = ECVRF::new();
        let vrf2 = ECVRF::new();
        
        let input = b"same input";
        
        let result1 = vrf1.prove(input);
        let result2 = vrf2.prove(input);
        
        assert_ne!(result1.output, result2.output);
    }

    #[test]
    fn test_invalid_proof_fails() {
        let vrf = ECVRF::new();
        let input = b"test input";
        
        let result = vrf.prove(input);
        
        // Tamper with proof
        let mut bad_proof = result.proof;
        bad_proof[0] ^= 0xFF;
        
        let public_key = vrf.public_key();
        let verification = ECVRF::verify(&public_key, input, &bad_proof);
        
        assert!(verification.is_err());
    }

    #[test]
    fn test_wrong_input_fails() {
        let vrf = ECVRF::new();
        let input = b"original input";
        
        let result = vrf.prove(input);
        
        let public_key = vrf.public_key();
        let verification = ECVRF::verify(&public_key, b"different input", &result.proof);
        
        assert!(verification.is_err());
    }

    #[test]
    fn test_wrong_public_key_fails() {
        let vrf1 = ECVRF::new();
        let vrf2 = ECVRF::new();
        
        let input = b"test input";
        let result = vrf1.prove(input);
        
        // Try to verify with different public key
        let wrong_key = vrf2.public_key();
        let verification = ECVRF::verify(&wrong_key, input, &result.proof);
        
        assert!(verification.is_err());
    }

    #[test]
    fn test_random_bytes() {
        let vrf = ECVRF::new();
        
        let bytes1 = vrf.random_bytes(b"seed1", 64);
        let bytes2 = vrf.random_bytes(b"seed2", 64);
        
        assert_eq!(bytes1.len(), 64);
        assert_eq!(bytes2.len(), 64);
        assert_ne!(bytes1, bytes2);
    }

    #[test]
    fn test_random_bytes_deterministic() {
        let secret = [123u8; 32];
        let vrf = ECVRF::from_secret_bytes(&secret).unwrap();
        
        let bytes1 = vrf.random_bytes(b"same seed", 128);
        let bytes2 = vrf.random_bytes(b"same seed", 128);
        
        assert_eq!(bytes1, bytes2);
    }
}
