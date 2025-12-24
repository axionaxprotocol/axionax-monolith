//! Genesis Block Generator
//!
//! Creates genesis blocks for new Axionax chains

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};
use std::collections::HashMap;

/// Genesis configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisConfig {
    /// Chain ID
    pub chain_id: u64,

    /// Chain name
    pub chain_name: String,

    /// Genesis timestamp (Unix seconds)
    pub timestamp: u64,

    /// Initial validators
    pub validators: Vec<GenesisValidator>,

    /// Initial account balances
    pub balances: HashMap<String, u128>,

    /// Protocol configuration
    pub config: ProtocolConfig,

    /// Extra data (arbitrary)
    pub extra_data: String,
}

impl Default for GenesisConfig {
    fn default() -> Self {
        Self {
            chain_id: 86137,
            chain_name: "Axionax Testnet".to_string(),
            timestamp: Utc::now().timestamp() as u64,
            validators: vec![],
            balances: HashMap::new(),
            config: ProtocolConfig::default(),
            extra_data: "Axionax Genesis".to_string(),
        }
    }
}

/// Genesis validator entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisValidator {
    /// Validator address
    pub address: String,

    /// Initial stake
    pub stake: u128,

    /// Public key (hex)
    pub public_key: String,

    /// Node URL
    pub node_url: String,
}

/// Protocol configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolConfig {
    /// Block time in milliseconds
    pub block_time_ms: u64,

    /// Maximum block size in bytes
    pub max_block_size: u64,

    /// Maximum transactions per block
    pub max_txs_per_block: u64,

    /// Minimum validator stake
    pub min_validator_stake: u128,

    /// Base gas price
    pub base_gas_price: u64,

    /// Staking configuration
    pub staking: StakingGenesisConfig,

    /// Governance configuration
    pub governance: GovernanceGenesisConfig,
}

impl Default for ProtocolConfig {
    fn default() -> Self {
        Self {
            block_time_ms: 2500,
            max_block_size: 5 * 1024 * 1024, // 5 MB
            max_txs_per_block: 10000,
            min_validator_stake: 10_000 * 10_u128.pow(18),
            base_gas_price: 1_000_000_000, // 1 Gwei
            staking: StakingGenesisConfig::default(),
            governance: GovernanceGenesisConfig::default(),
        }
    }
}

/// Staking configuration for genesis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingGenesisConfig {
    /// Minimum delegation amount
    pub min_delegation: u128,

    /// Unstaking lock period in blocks
    pub unstaking_lock_blocks: u64,

    /// Epoch reward rate (basis points)
    pub epoch_reward_rate_bps: u16,

    /// Max slash rate (basis points)
    pub max_slash_rate_bps: u16,
}

impl Default for StakingGenesisConfig {
    fn default() -> Self {
        Self {
            min_delegation: 100 * 10_u128.pow(18),
            unstaking_lock_blocks: 725_760, // ~21 days
            epoch_reward_rate_bps: 50,      // 0.5%
            max_slash_rate_bps: 5000,       // 50%
        }
    }
}

/// Governance configuration for genesis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceGenesisConfig {
    /// Minimum stake to create proposal
    pub min_proposal_stake: u128,

    /// Voting period in blocks
    pub voting_period_blocks: u64,

    /// Execution delay in blocks
    pub execution_delay_blocks: u64,

    /// Quorum (basis points)
    pub quorum_bps: u16,

    /// Pass threshold (basis points)
    pub pass_threshold_bps: u16,
}

impl Default for GovernanceGenesisConfig {
    fn default() -> Self {
        Self {
            min_proposal_stake: 100_000 * 10_u128.pow(18),
            voting_period_blocks: 241_920, // ~7 days
            execution_delay_blocks: 69_120, // ~2 days
            quorum_bps: 3000,              // 30%
            pass_threshold_bps: 5000,      // 50%
        }
    }
}

/// Generated genesis block
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisBlock {
    /// Block number (always 0)
    pub number: u64,

    /// Block hash
    pub hash: String,

    /// Parent hash (zeroes for genesis)
    pub parent_hash: String,

    /// State root
    pub state_root: String,

    /// Transactions root (empty for genesis)
    pub transactions_root: String,

    /// Receipts root (empty for genesis)
    pub receipts_root: String,

    /// Timestamp
    pub timestamp: u64,

    /// Chain ID
    pub chain_id: u64,

    /// Chain name
    pub chain_name: String,

    /// Extra data
    pub extra_data: String,

    /// Genesis configuration
    pub config: GenesisConfig,
}

/// Genesis generator
pub struct GenesisGenerator;

impl GenesisGenerator {
    /// Generate genesis block from configuration
    pub fn generate(config: GenesisConfig) -> GenesisBlock {
        let state_root = Self::compute_state_root(&config);
        let hash = Self::compute_block_hash(&config, &state_root);

        GenesisBlock {
            number: 0,
            hash,
            parent_hash: "0x".to_string() + &"0".repeat(64),
            state_root,
            transactions_root: "0x".to_string() + &"0".repeat(64),
            receipts_root: "0x".to_string() + &"0".repeat(64),
            timestamp: config.timestamp,
            chain_id: config.chain_id,
            chain_name: config.chain_name.clone(),
            extra_data: config.extra_data.clone(),
            config,
        }
    }

    /// Compute state root from initial state
    fn compute_state_root(config: &GenesisConfig) -> String {
        let mut hasher = Sha3_256::new();

        // Hash balances
        let mut balances: Vec<_> = config.balances.iter().collect();
        balances.sort_by_key(|(k, _)| k.as_str());
        for (address, balance) in balances {
            hasher.update(address.as_bytes());
            hasher.update(&balance.to_le_bytes());
        }

        // Hash validators
        for validator in &config.validators {
            hasher.update(validator.address.as_bytes());
            hasher.update(&validator.stake.to_le_bytes());
        }

        let result = hasher.finalize();
        format!("0x{}", hex::encode(result))
    }

    /// Compute block hash
    fn compute_block_hash(config: &GenesisConfig, state_root: &str) -> String {
        let mut hasher = Sha3_256::new();
        hasher.update(&config.chain_id.to_le_bytes());
        hasher.update(&config.timestamp.to_le_bytes());
        hasher.update(state_root.as_bytes());
        hasher.update(config.extra_data.as_bytes());

        let result = hasher.finalize();
        format!("0x{}", hex::encode(result))
    }

    /// Generate genesis with default testnet configuration
    pub fn testnet() -> GenesisBlock {
        let mut config = GenesisConfig::default();

        // Add default testnet validators
        config.validators = vec![
            GenesisValidator {
                address: "0x1111111111111111111111111111111111111111".to_string(),
                stake: 100_000 * 10_u128.pow(18),
                public_key: "0x".to_string(),
                node_url: "http://validator1.axionax.org:30333".to_string(),
            },
            GenesisValidator {
                address: "0x2222222222222222222222222222222222222222".to_string(),
                stake: 100_000 * 10_u128.pow(18),
                public_key: "0x".to_string(),
                node_url: "http://validator2.axionax.org:30333".to_string(),
            },
            GenesisValidator {
                address: "0x3333333333333333333333333333333333333333".to_string(),
                stake: 100_000 * 10_u128.pow(18),
                public_key: "0x".to_string(),
                node_url: "http://validator3.axionax.org:30333".to_string(),
            },
        ];

        // Add faucet account with initial supply
        config.balances.insert(
            "0xFAUCET0000000000000000000000000000000001".to_string(),
            1_000_000_000 * 10_u128.pow(18), // 1 billion AXX
        );

        // Add team wallets
        config.balances.insert(
            "0xTEAM00000000000000000000000000000000001".to_string(),
            100_000_000 * 10_u128.pow(18), // 100 million AXX
        );

        Self::generate(config)
    }

    /// Generate genesis for local development
    pub fn localnet() -> GenesisBlock {
        let mut config = GenesisConfig::default();
        config.chain_id = 31337; // Local chain ID
        config.chain_name = "Axionax Localnet".to_string();

        // Single validator for local development
        config.validators = vec![GenesisValidator {
            address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".to_string(), // Hardhat default
            stake: 10_000 * 10_u128.pow(18),
            public_key: "0x".to_string(),
            node_url: "http://localhost:30333".to_string(),
        }];

        // Prefund development accounts (Hardhat defaults)
        let dev_accounts = vec![
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        ];

        for account in dev_accounts {
            config.balances.insert(
                account.to_string(),
                10_000 * 10_u128.pow(18), // 10,000 AXX each
            );
        }

        Self::generate(config)
    }

    /// Export genesis to JSON file
    pub fn export_json(genesis: &GenesisBlock) -> String {
        serde_json::to_string_pretty(genesis).unwrap()
    }
}

/// Hex encoding helper
mod hex {
    pub fn encode<T: AsRef<[u8]>>(data: T) -> String {
        data.as_ref().iter().map(|b| format!("{:02x}", b)).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_genesis() {
        let config = GenesisConfig::default();
        let genesis = GenesisGenerator::generate(config);

        assert_eq!(genesis.number, 0);
        assert!(genesis.hash.starts_with("0x"));
        assert_eq!(genesis.parent_hash.len(), 66); // 0x + 64 chars
    }

    #[test]
    fn test_testnet_genesis() {
        let genesis = GenesisGenerator::testnet();

        assert_eq!(genesis.chain_id, 86137);
        assert_eq!(genesis.config.validators.len(), 3);
        assert!(!genesis.config.balances.is_empty());
    }

    #[test]
    fn test_localnet_genesis() {
        let genesis = GenesisGenerator::localnet();

        assert_eq!(genesis.chain_id, 31337);
        assert_eq!(genesis.config.validators.len(), 1);
    }

    #[test]
    fn test_export_json() {
        let genesis = GenesisGenerator::testnet();
        let json = GenesisGenerator::export_json(&genesis);

        assert!(json.contains("chain_id"));
        assert!(json.contains("86137"));
    }

    #[test]
    fn test_deterministic_hash() {
        let config1 = GenesisConfig::default();
        let config2 = config1.clone();

        let genesis1 = GenesisGenerator::generate(config1);
        let genesis2 = GenesisGenerator::generate(config2);

        assert_eq!(genesis1.hash, genesis2.hash);
        assert_eq!(genesis1.state_root, genesis2.state_root);
    }
}
