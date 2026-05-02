//! Genesis Block Generator
//!
//! Creates Block #0 for the Axionax network.
//!
//! Total Supply : 1,000,000,000,000 AXX  (1 trillion, 18 decimals)
//! Creator alias: axionaxius

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

pub const CHAIN_ID: u64 = 86137;
pub const CHAIN_NAME: &str = "Axionax Mainnet";
pub const SYMBOL: &str = "AXX";
pub const DECIMALS: u32 = 18;

/// 1 AXX in wei
const ONE_AXX: u128 = 10_u128.pow(18);

/// Total supply: 1 trillion AXX
pub const TOTAL_SUPPLY: u128 = 1_000_000_000_000 * ONE_AXX;

/// Genesis timestamp — Q2 2026 Mainnet: 2026-04-01 00:00:00 UTC
pub const GENESIS_TIMESTAMP: u64 = 1_775_001_600;

// ---------------------------------------------------------------------------
// Allocation percentages (basis points, 10_000 = 100%)
// ---------------------------------------------------------------------------

pub const ALLOC_CREATOR_BPS: u16 = 1_000; // 10%
pub const ALLOC_ECOSYSTEM_BPS: u16 = 3_000; // 30%
pub const ALLOC_FOUNDATION_BPS: u16 = 2_000; // 20%
pub const ALLOC_COMMUNITY_BPS: u16 = 1_500; // 15%
pub const ALLOC_TEAM_BPS: u16 = 1_000; // 10%
pub const ALLOC_VALIDATORS_BPS: u16 = 500; //  5%
pub const ALLOC_PUBLIC_SALE_BPS: u16 = 500; //  5%
pub const ALLOC_FAUCET_BPS: u16 = 300; //  3%
pub const ALLOC_RESERVE_BPS: u16 = 200; //  2%

// ---------------------------------------------------------------------------
// Well-known addresses
// ---------------------------------------------------------------------------

// EVM-compatible addresses (deterministic from sha256 seeds, matches core/tools/create_genesis.py)
pub const ADDR_CREATOR: &str = "0xb9e3968de4ec06c75ecb3c8ca151b446939aec7f";
pub const ADDR_ECOSYSTEM: &str = "0x866740f77e808b381bcb8622015b4a31cc3ca935";
pub const ADDR_FOUNDATION: &str = "0xa77f117ff23b672cf484b1d05cc48b5e7c03909d";
pub const ADDR_COMMUNITY: &str = "0x776b0130e806cb70003744a4691238052c0b972a";
pub const ADDR_TEAM: &str = "0x6af7d73fdcc0bf711ccada1422774ab1fdff9ae4";
pub const ADDR_PUBLIC_SALE: &str = "0x58abb3d4e75f232b4177bfd6061972a210f4c9e6";
pub const ADDR_FAUCET: &str = "0x9dd7e28ccd04cfb6547adc7be2a8cf2beb434a1c";
pub const ADDR_RESERVE: &str = "0xa61e8cb3ec1e6246a852ca0493f7e8c9c44006cd";

pub const ADDR_VALIDATOR_EU: &str = "0xca0e4e60f8ce825dbb820c72a7e28e28cdae3326";
pub const ADDR_VALIDATOR_AU: &str = "0x26e714016c6a91b791bb440ca8db6cd7c4d1e6cb";

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

/// Genesis configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisConfig {
    pub chain_id: u64,
    pub chain_name: String,
    pub timestamp: u64,
    pub validators: Vec<GenesisValidator>,
    pub balances: HashMap<String, u128>,
    pub config: ProtocolConfig,
    pub extra_data: String,
    pub total_supply: u128,
    pub creator_alias: String,
}

impl Default for GenesisConfig {
    fn default() -> Self {
        Self {
            chain_id: CHAIN_ID,
            chain_name: CHAIN_NAME.to_string(),
            timestamp: Utc::now().timestamp() as u64,
            validators: vec![],
            balances: HashMap::new(),
            config: ProtocolConfig::default(),
            extra_data: "axionaxius - Genesis Block #0 - Axionax Core Universe".to_string(),
            total_supply: TOTAL_SUPPLY,
            creator_alias: "axionaxius".to_string(),
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
            voting_period_blocks: 241_920,  // ~7 days
            execution_delay_blocks: 69_120, // ~2 days
            quorum_bps: 3000,               // 30%
            pass_threshold_bps: 5000,       // 50%
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
            hasher.update(balance.to_le_bytes());
        }

        // Hash validators
        for validator in &config.validators {
            hasher.update(validator.address.as_bytes());
            hasher.update(validator.stake.to_le_bytes());
        }

        let result = hasher.finalize();
        format!("0x{}", hex::encode(result))
    }

    /// Compute block hash
    fn compute_block_hash(config: &GenesisConfig, state_root: &str) -> String {
        let mut hasher = Sha3_256::new();
        hasher.update(config.chain_id.to_le_bytes());
        hasher.update(config.timestamp.to_le_bytes());
        hasher.update(state_root.as_bytes());
        hasher.update(config.extra_data.as_bytes());

        let result = hasher.finalize();
        format!("0x{}", hex::encode(result))
    }

    /// Helper: compute allocation from basis points
    fn alloc(bps: u16) -> u128 {
        TOTAL_SUPPLY / 10_000 * (bps as u128)
    }

    /// Build the canonical mainnet / testnet genesis with full token allocation.
    ///
    /// Total supply: 1 trillion AXX (1,000,000,000,000)
    /// Creator alias: axionaxius (10 %)
    pub fn mainnet() -> GenesisBlock {
        let validator_half = Self::alloc(ALLOC_VALIDATORS_BPS) / 2;

        let mut config = GenesisConfig {
            chain_id: CHAIN_ID,
            chain_name: CHAIN_NAME.to_string(),
            timestamp: GENESIS_TIMESTAMP,
            extra_data: "axionaxius - Genesis Block #0 - Axionax Core Universe".to_string(),
            total_supply: TOTAL_SUPPLY,
            creator_alias: "axionaxius".to_string(),
            config: ProtocolConfig::default(),
            validators: vec![
                GenesisValidator {
                    address: ADDR_VALIDATOR_EU.to_string(),
                    stake: validator_half,
                    public_key: "0x".to_string(),
                    node_url: "http://217.216.109.5:30303".to_string(),
                },
                GenesisValidator {
                    address: ADDR_VALIDATOR_AU.to_string(),
                    stake: validator_half,
                    public_key: "0x".to_string(),
                    node_url: "http://46.250.244.4:30303".to_string(),
                },
            ],
            balances: HashMap::new(),
        };

        config
            .balances
            .insert(ADDR_CREATOR.to_string(), Self::alloc(ALLOC_CREATOR_BPS));
        config
            .balances
            .insert(ADDR_ECOSYSTEM.to_string(), Self::alloc(ALLOC_ECOSYSTEM_BPS));
        config.balances.insert(
            ADDR_FOUNDATION.to_string(),
            Self::alloc(ALLOC_FOUNDATION_BPS),
        );
        config
            .balances
            .insert(ADDR_COMMUNITY.to_string(), Self::alloc(ALLOC_COMMUNITY_BPS));
        config
            .balances
            .insert(ADDR_TEAM.to_string(), Self::alloc(ALLOC_TEAM_BPS));
        config
            .balances
            .insert(ADDR_VALIDATOR_EU.to_string(), validator_half);
        config
            .balances
            .insert(ADDR_VALIDATOR_AU.to_string(), validator_half);
        config.balances.insert(
            ADDR_PUBLIC_SALE.to_string(),
            Self::alloc(ALLOC_PUBLIC_SALE_BPS),
        );
        config
            .balances
            .insert(ADDR_FAUCET.to_string(), Self::alloc(ALLOC_FAUCET_BPS));
        config
            .balances
            .insert(ADDR_RESERVE.to_string(), Self::alloc(ALLOC_RESERVE_BPS));

        Self::generate(config)
    }

    /// Alias kept for backward compatibility
    pub fn testnet() -> GenesisBlock {
        Self::mainnet()
    }

    /// Generate genesis for local development (small balances, single validator)
    pub fn localnet() -> GenesisBlock {
        let mut config = GenesisConfig {
            chain_id: 31337,
            chain_name: "Axionax Localnet".to_string(),
            validators: vec![GenesisValidator {
                address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".to_string(),
                stake: 10_000 * ONE_AXX,
                public_key: "0x".to_string(),
                node_url: "http://localhost:30333".to_string(),
            }],
            ..Default::default()
        };

        let dev_accounts = vec![
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        ];

        for account in dev_accounts {
            config
                .balances
                .insert(account.to_string(), 10_000 * ONE_AXX);
        }

        Self::generate(config)
    }

    /// Export genesis to JSON file
    pub fn export_json(genesis: &GenesisBlock) -> String {
        serde_json::to_string_pretty(genesis).unwrap_or_default()
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
        assert_eq!(genesis.parent_hash.len(), 66);
    }

    #[test]
    fn test_mainnet_genesis() {
        let genesis = GenesisGenerator::mainnet();

        assert_eq!(genesis.chain_id, CHAIN_ID);
        assert_eq!(genesis.config.validators.len(), 2);
        assert_eq!(genesis.config.balances.len(), 10);
        assert_eq!(genesis.config.creator_alias, "axionaxius");
        assert_eq!(genesis.config.total_supply, TOTAL_SUPPLY);
        assert_eq!(genesis.timestamp, GENESIS_TIMESTAMP);

        let total: u128 = genesis.config.balances.values().sum();
        assert_eq!(total, TOTAL_SUPPLY, "allocations must sum to total supply");
    }

    #[test]
    fn test_creator_gets_ten_percent() {
        let genesis = GenesisGenerator::mainnet();
        let creator_balance = genesis.config.balances.get(ADDR_CREATOR).unwrap();
        let expected = TOTAL_SUPPLY / 10;
        assert_eq!(*creator_balance, expected);
    }

    #[test]
    fn test_localnet_genesis() {
        let genesis = GenesisGenerator::localnet();

        assert_eq!(genesis.chain_id, 31337);
        assert_eq!(genesis.config.validators.len(), 1);
    }

    #[test]
    fn test_export_json() {
        let genesis = GenesisGenerator::mainnet();
        let json = GenesisGenerator::export_json(&genesis);

        assert!(json.contains("chain_id"));
        assert!(json.contains("86137"));
        assert!(json.contains("axionaxius"));
    }

    #[test]
    fn test_deterministic_hash() {
        let g1 = GenesisGenerator::mainnet();
        let g2 = GenesisGenerator::mainnet();

        assert_eq!(g1.hash, g2.hash);
        assert_eq!(g1.state_root, g2.state_root);
    }
}
