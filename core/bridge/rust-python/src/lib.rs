#![allow(non_local_definitions)]

use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;
use pyo3::types::PyModule;
use std::sync::Arc;
use tokio::sync::RwLock;

// Import axionax core modules
use blockchain::{Block, Blockchain};
use consensus::{Challenge, ConsensusEngine, Validator};
use crypto::{ECVRF, VrfResult};

mod simple_wrapper;
use simple_wrapper::{default_blockchain_config, default_consensus_config};

/// Python wrapper for ECVRF (production-grade schnorrkel VRF)
#[pyclass]
struct PyVRF {
    vrf: ECVRF,
}

#[pymethods]
impl PyVRF {
    #[new]
    fn new() -> Self {
        PyVRF { vrf: ECVRF::new() }
    }

    /// Generate VRF proof and output
    fn prove(&self, input: Vec<u8>) -> PyResult<(Vec<u8>, Vec<u8>)> {
        let result: VrfResult = self.vrf.prove(&input);
        Ok((result.proof.to_vec(), result.output.to_vec()))
    }

    /// Get the public key
    fn public_key(&self) -> PyResult<Vec<u8>> {
        Ok(self.vrf.public_key().to_vec())
    }
}

/// Python wrapper for Validator
#[pyclass]
#[derive(Clone)]
struct PyValidator {
    pub address: String,
    pub stake: u128,
    pub is_active: bool,
}

#[pymethods]
impl PyValidator {
    #[new]
    fn new(address: String, stake: u64) -> Self {
        PyValidator {
            address,
            stake: stake as u128,
            is_active: true,
        }
    }

    #[getter]
    fn address(&self) -> PyResult<String> {
        Ok(self.address.clone())
    }

    #[getter]
    fn stake(&self) -> PyResult<String> {
        Ok(self.stake.to_string())
    }

    #[getter]
    fn is_active(&self) -> PyResult<bool> {
        Ok(self.is_active)
    }
}

/// Python wrapper for Consensus Engine
#[pyclass]
struct PyConsensusEngine {
    runtime: tokio::runtime::Runtime,
    engine: Arc<RwLock<ConsensusEngine>>,
}

#[pymethods]
impl PyConsensusEngine {
    #[new]
    fn new() -> PyResult<Self> {
        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| PyValueError::new_err(format!("Failed to create runtime: {}", e)))?;

        let config = default_consensus_config();
        let engine = Arc::new(RwLock::new(ConsensusEngine::new(config)));

        Ok(PyConsensusEngine { runtime, engine })
    }

    /// Register a validator
    fn register_validator(&mut self, validator: PyValidator) -> PyResult<()> {
        let engine = self.engine.clone();
        let rust_validator = Validator {
            address: validator.address.clone(),
            stake: validator.stake,
            total_votes: 0,
            correct_votes: 0,
            false_pass: 0,
            is_active: validator.is_active,
        };

        self.runtime
            .block_on(async move {
                let eng = engine.read().await;
                eng.register_validator(rust_validator).await
            })
            .map_err(PyValueError::new_err)
    }

    /// Generate challenge
    fn generate_challenge(&self, job_id: String, output_size: usize) -> PyResult<PyChallenge> {
        use sha3::{Digest, Sha3_256};
        use std::time::{SystemTime, UNIX_EPOCH};

        // Generate VRF seed from job_id and timestamp
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();

        let mut hasher = Sha3_256::new();
        hasher.update(job_id.as_bytes());
        hasher.update(timestamp.to_le_bytes());
        let hash = hasher.finalize();

        let mut vrf_seed = [0u8; 32];
        vrf_seed.copy_from_slice(&hash);

        let engine = self.engine.clone();
        let expected_root = [0u8; 32]; // Python bridge: no prior root; consensus uses for verification
        let challenge = self.runtime.block_on(async move {
            let eng = engine.read().await;
            eng.generate_challenge(job_id, output_size, vrf_seed, expected_root)
        });

        Ok(PyChallenge { inner: challenge })
    }

    /// Calculate fraud detection probability (static method)
    #[staticmethod]
    fn fraud_probability(fraud_rate: f64, sample_size: usize) -> PyResult<f64> {
        Ok(ConsensusEngine::fraud_detection_probability(
            fraud_rate,
            sample_size,
        ))
    }
}

/// Python wrapper for Challenge
#[pyclass]
struct PyChallenge {
    inner: Challenge,
}

#[pymethods]
impl PyChallenge {
    #[getter]
    fn job_id(&self) -> PyResult<String> {
        Ok(self.inner.job_id.clone())
    }

    #[getter]
    fn sample_size(&self) -> PyResult<usize> {
        Ok(self.inner.sample_size)
    }

    #[getter]
    fn samples(&self) -> PyResult<Vec<usize>> {
        Ok(self.inner.samples.clone())
    }
}

/// Python wrapper for Transaction
#[pyclass]
#[derive(Clone)]
struct PyTransaction {
    pub from: String,
    pub to: String,
    pub value: u128,
    pub _data: Vec<u8>,
}

#[pymethods]
impl PyTransaction {
    #[new]
    fn new(from: String, to: String, value: u64, data: Vec<u8>) -> Self {
        PyTransaction {
            from,
            to,
            value: value as u128,
            _data: data,
        }
    }

    #[getter]
    fn get_from_address(&self) -> PyResult<String> {
        Ok(self.from.clone())
    }

    #[getter]
    fn to_address(&self) -> PyResult<String> {
        Ok(self.to.clone())
    }

    #[getter]
    fn value(&self) -> PyResult<String> {
        Ok(self.value.to_string())
    }
}

/// Python wrapper for Block
#[pyclass]
struct PyBlock {
    inner: Block,
}

#[pymethods]
impl PyBlock {
    #[getter]
    fn number(&self) -> PyResult<u64> {
        Ok(self.inner.number)
    }

    #[getter]
    fn timestamp(&self) -> PyResult<u64> {
        Ok(self.inner.timestamp)
    }

    #[getter]
    fn proposer(&self) -> PyResult<String> {
        Ok(self.inner.proposer.clone())
    }

    #[getter]
    fn transactions_count(&self) -> PyResult<usize> {
        Ok(self.inner.transactions.len())
    }

    #[getter]
    fn gas_used(&self) -> PyResult<u64> {
        Ok(self.inner.gas_used)
    }
}

/// Python wrapper for Blockchain
#[pyclass]
struct PyBlockchain {
    runtime: tokio::runtime::Runtime,
    chain: Arc<RwLock<Blockchain>>,
}

#[pymethods]
impl PyBlockchain {
    #[new]
    fn new() -> PyResult<Self> {
        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| PyValueError::new_err(format!("Failed to create runtime: {}", e)))?;

        let config = default_blockchain_config();
        let chain = Arc::new(RwLock::new(Blockchain::new(config)));

        // Initialize with genesis block
        let chain_clone = chain.clone();
        runtime.block_on(async move {
            let bc = chain_clone.read().await;
            bc.init_with_genesis().await
                .map_err(|e| PyValueError::new_err(format!("Genesis init failed: {}", e)))
        })?;

        Ok(PyBlockchain { runtime, chain })
    }

    /// Get the latest block number
    fn latest_block_number(&self) -> PyResult<u64> {
        let chain = self.chain.clone();
        let num = self.runtime.block_on(async move {
            let bc = chain.read().await;
            bc.get_latest_block_number().await
        });

        Ok(num)
    }

    /// Get block by number
    fn get_block(&self, number: u64) -> PyResult<Option<PyBlock>> {
        let chain = self.chain.clone();
        let block = self.runtime.block_on(async move {
            let bc = chain.read().await;
            bc.get_block(number).await
        });

        Ok(block.map(|b| PyBlock { inner: b }))
    }
}

/// Python module definition (pyo3 0.24: use Bound<PyModule>, no Python param)
#[pymodule]
fn axionax_python(m: &pyo3::Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<PyVRF>()?;
    m.add_class::<PyValidator>()?;
    m.add_class::<PyConsensusEngine>()?;
    m.add_class::<PyChallenge>()?;
    m.add_class::<PyTransaction>()?;
    m.add_class::<PyBlock>()?;
    m.add_class::<PyBlockchain>()?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use super::simple_wrapper::{default_blockchain_config, default_consensus_config};

    // ── Config helpers ────────────────────────────────────────────────────────

    #[test]
    fn test_default_consensus_config() {
        let cfg = default_consensus_config();
        assert_eq!(cfg.sample_size, 1000);
        assert!(cfg.min_confidence > 0.98);
        assert_eq!(cfg.fraud_window_blocks, 720);
        assert!(cfg.min_validator_stake > 0);
        assert_eq!(cfg.false_pass_penalty_bps, 500);
    }

    #[test]
    fn test_default_blockchain_config() {
        let cfg = default_blockchain_config();
        assert_eq!(cfg.block_time_secs, 12);
        assert_eq!(cfg.max_block_size, 1_000_000);
        assert_eq!(cfg.gas_limit, 30_000_000);
        assert!(cfg.db_path.is_none());
    }

    // ── PyValidator ───────────────────────────────────────────────────────────

    #[test]
    fn test_py_validator_construction() {
        let v = PyValidator::new("0xabc123".to_string(), 5000);
        assert_eq!(v.address, "0xabc123");
        assert_eq!(v.stake, 5000u128);
        assert!(v.is_active);
    }

    #[test]
    fn test_py_validator_stake_widened_to_u128() {
        let v = PyValidator::new("0x0".to_string(), u64::MAX);
        assert_eq!(v.stake, u64::MAX as u128);
    }

    #[test]
    fn test_py_validator_clone() {
        let v = PyValidator::new("0xabc".to_string(), 1000);
        let v2 = v.clone();
        assert_eq!(v.address, v2.address);
        assert_eq!(v.stake, v2.stake);
        assert_eq!(v.is_active, v2.is_active);
    }

    #[test]
    fn test_py_validator_zero_stake() {
        let v = PyValidator::new("0x0000000000000000000000000000000000000001".to_string(), 0);
        assert_eq!(v.stake, 0);
        assert!(v.is_active);
    }

    // ── PyTransaction ─────────────────────────────────────────────────────────

    #[test]
    fn test_py_transaction_construction() {
        let tx = PyTransaction::new(
            "0xfrom".to_string(),
            "0xto".to_string(),
            1000,
            vec![0x12, 0x34],
        );
        assert_eq!(tx.from, "0xfrom");
        assert_eq!(tx.to, "0xto");
        assert_eq!(tx.value, 1000u128);
        assert_eq!(tx._data, vec![0x12, 0x34]);
    }

    #[test]
    fn test_py_transaction_value_widened_to_u128() {
        let tx = PyTransaction::new("0x1".to_string(), "0x2".to_string(), u64::MAX, vec![]);
        assert_eq!(tx.value, u64::MAX as u128);
    }

    #[test]
    fn test_py_transaction_empty_data() {
        let tx = PyTransaction::new("0x1".to_string(), "0x2".to_string(), 0, vec![]);
        assert!(tx._data.is_empty());
        assert_eq!(tx.value, 0);
    }

    #[test]
    fn test_py_transaction_clone() {
        let tx = PyTransaction::new("0xA".to_string(), "0xB".to_string(), 42, vec![1, 2]);
        let tx2 = tx.clone();
        assert_eq!(tx.from, tx2.from);
        assert_eq!(tx.value, tx2.value);
        assert_eq!(tx._data, tx2._data);
    }
}
