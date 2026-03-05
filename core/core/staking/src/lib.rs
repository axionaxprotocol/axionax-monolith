//! Native Staking Module for Axionax Protocol
//!
//! Provides self-reliant staking functionality:
//! - Validator staking and unstaking
//! - Delegation to validators
//! - Reward distribution
//! - Slashing for misbehavior

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

/// Staking errors
#[derive(Error, Debug)]
pub enum StakingError {
    #[error("Insufficient stake: required {required}, have {available}")]
    InsufficientStake { required: u128, available: u128 },

    #[error("Stake is locked until block {unlock_block}")]
    StakeLocked { unlock_block: u64 },

    #[error("Validator not found: {0}")]
    ValidatorNotFound(String),

    #[error("Already a validator")]
    AlreadyValidator,

    #[error("Delegation not found")]
    DelegationNotFound,

    #[error("Cannot unstake: active delegations exist")]
    HasActiveDelegations,

    #[error("Slashing amount exceeds stake")]
    SlashExceedsStake,

    #[error("Invalid amount: {0}")]
    InvalidAmount(String),
}

pub type Result<T> = std::result::Result<T, StakingError>;

/// Staking configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingConfig {
    /// Minimum stake to become a validator (in base units)
    pub min_validator_stake: u128,
    
    /// Minimum delegation amount
    pub min_delegation: u128,
    
    /// Unstaking lock period in blocks
    pub unstaking_lock_blocks: u64,
    
    /// Reward rate per epoch (basis points, e.g., 500 = 5%)
    pub epoch_reward_rate_bps: u16,
    
    /// Blocks per epoch
    pub blocks_per_epoch: u64,
    
    /// Maximum slash rate (basis points)
    pub max_slash_rate_bps: u16,
}

impl Default for StakingConfig {
    fn default() -> Self {
        Self {
            min_validator_stake: 10_000 * 10_u128.pow(18), // 10,000 AXX
            min_delegation: 100 * 10_u128.pow(18),          // 100 AXX
            unstaking_lock_blocks: 725_760,                  // ~21 days @ 2.5s/block
            epoch_reward_rate_bps: 50,                       // 0.5% per epoch (~6% APY)
            blocks_per_epoch: 17_280,                        // ~12 hours @ 2.5s/block
            max_slash_rate_bps: 5000,                        // 50% max slash
        }
    }
}

/// Validator information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatorInfo {
    /// Validator address
    pub address: String,
    
    /// Self-staked amount
    pub stake: u128,
    
    /// Total delegated amount
    pub delegated: u128,
    
    /// Block when stake can be withdrawn (0 if not unstaking)
    pub unlock_block: u64,
    
    /// Total rewards earned
    pub total_rewards: u128,
    
    /// Unclaimed rewards
    pub unclaimed_rewards: u128,
    
    /// Is validator active
    pub is_active: bool,
    
    /// Commission rate (basis points)
    pub commission_bps: u16,
    
    /// Total blocks produced
    pub blocks_produced: u64,
    
    /// Total slashed amount
    pub total_slashed: u128,

    /// Amount pending withdrawal after unstaking
    #[serde(default)]
    pub pending_unstake: u128,
}

impl ValidatorInfo {
    pub fn new(address: String, stake: u128) -> Self {
        Self {
            address,
            stake,
            delegated: 0,
            unlock_block: 0,
            total_rewards: 0,
            unclaimed_rewards: 0,
            is_active: true,
            commission_bps: 500,
            blocks_produced: 0,
            total_slashed: 0,
            pending_unstake: 0,
        }
    }
    
    /// Total voting power (stake + delegations)
    pub fn voting_power(&self) -> u128 {
        self.stake.saturating_add(self.delegated)
    }
}

/// Delegation information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Delegation {
    /// Delegator address
    pub delegator: String,
    
    /// Validator address
    pub validator: String,
    
    /// Delegated amount
    pub amount: u128,
    
    /// Accumulated rewards
    pub rewards: u128,
    
    /// Block when delegation can be withdrawn (0 if not undelegating)
    pub unlock_block: u64,
}

/// Native Staking Module
pub struct Staking {
    config: StakingConfig,
    validators: Arc<RwLock<HashMap<String, ValidatorInfo>>>,
    delegations: Arc<RwLock<HashMap<String, Vec<Delegation>>>>,
    total_staked: Arc<RwLock<u128>>,
    current_block: Arc<RwLock<u64>>,
}

impl Staking {
    /// Create new staking module
    pub fn new(config: StakingConfig) -> Self {
        Self {
            config,
            validators: Arc::new(RwLock::new(HashMap::new())),
            delegations: Arc::new(RwLock::new(HashMap::new())),
            total_staked: Arc::new(RwLock::new(0)),
            current_block: Arc::new(RwLock::new(0)),
        }
    }

    /// Stake tokens to become a validator
    pub async fn stake(&self, address: String, amount: u128) -> Result<()> {
        if amount < self.config.min_validator_stake {
            return Err(StakingError::InsufficientStake {
                required: self.config.min_validator_stake,
                available: amount,
            });
        }

        let mut validators = self.validators.write().await;
        let mut total = self.total_staked.write().await;

        if validators.contains_key(&address) {
            // Add to existing stake
            let validator = validators.get_mut(&address).unwrap();
            if validator.unlock_block > 0 {
                let _current = *self.current_block.read().await;
                return Err(StakingError::StakeLocked {
                    unlock_block: validator.unlock_block,
                });
            }
            validator.stake = validator.stake.saturating_add(amount);
            validator.is_active = true;
        } else {
            // New validator
            validators.insert(address.clone(), ValidatorInfo::new(address.clone(), amount));
        }

        *total = total.saturating_add(amount);
        info!("Staked {} for validator {}", amount, address);
        Ok(())
    }

    /// Initiate unstaking (starts lock period). Actually subtracts the amount from stake.
    pub async fn unstake(&self, address: String, amount: u128) -> Result<()> {
        let mut validators = self.validators.write().await;
        let current_block = *self.current_block.read().await;

        let validator = validators.get_mut(&address)
            .ok_or_else(|| StakingError::ValidatorNotFound(address.clone()))?;

        if amount > validator.stake {
            return Err(StakingError::InsufficientStake {
                required: amount,
                available: validator.stake,
            });
        }

        // Check if has delegations
        let delegations = self.delegations.read().await;
        if delegations.get(&address).map(|d| !d.is_empty()).unwrap_or(false) {
            return Err(StakingError::HasActiveDelegations);
        }

        // Subtract the requested amount from stake and record as pending
        validator.stake = validator.stake.saturating_sub(amount);
        validator.pending_unstake = validator.pending_unstake.saturating_add(amount);
        validator.unlock_block = current_block + self.config.unstaking_lock_blocks;

        // Deactivate if remaining stake is below minimum
        if validator.stake < self.config.min_validator_stake {
            validator.is_active = false;
        }

        info!(
            "Initiated unstaking {} for validator {}, unlocks at block {}",
            amount, address, validator.unlock_block
        );
        Ok(())
    }

    /// Withdraw unstaked tokens after lock period
    pub async fn withdraw(&self, address: String) -> Result<u128> {
        let mut validators = self.validators.write().await;
        let mut total = self.total_staked.write().await;
        let current_block = *self.current_block.read().await;

        let validator = validators.get_mut(&address)
            .ok_or_else(|| StakingError::ValidatorNotFound(address.clone()))?;

        if validator.pending_unstake == 0 {
            return Err(StakingError::InvalidAmount("No pending unstake".to_string()));
        }

        if current_block < validator.unlock_block {
            return Err(StakingError::StakeLocked {
                unlock_block: validator.unlock_block,
            });
        }

        let amount = validator.pending_unstake;
        validator.pending_unstake = 0;
        validator.unlock_block = 0;
        *total = total.saturating_sub(amount);

        info!("Withdrawn {} for validator {}", amount, address);
        Ok(amount)
    }

    /// Delegate tokens to a validator
    pub async fn delegate(
        &self,
        delegator: String,
        validator_addr: String,
        amount: u128,
    ) -> Result<()> {
        if amount < self.config.min_delegation {
            return Err(StakingError::InsufficientStake {
                required: self.config.min_delegation,
                available: amount,
            });
        }

        let mut validators = self.validators.write().await;
        let mut delegations = self.delegations.write().await;
        let mut total = self.total_staked.write().await;

        let validator = validators.get_mut(&validator_addr)
            .ok_or_else(|| StakingError::ValidatorNotFound(validator_addr.clone()))?;

        if !validator.is_active {
            return Err(StakingError::ValidatorNotFound(validator_addr.clone()));
        }

        // Add delegation
        let delegation = Delegation {
            delegator: delegator.clone(),
            validator: validator_addr.clone(),
            amount,
            rewards: 0,
            unlock_block: 0,
        };

        delegations
            .entry(validator_addr.clone())
            .or_insert_with(Vec::new)
            .push(delegation);

        validator.delegated = validator.delegated.saturating_add(amount);
        *total = total.saturating_add(amount);

        info!(
            "Delegated {} from {} to validator {}",
            amount, delegator, validator_addr
        );
        Ok(())
    }

    /// Claim staking rewards
    pub async fn claim_rewards(&self, address: String) -> Result<u128> {
        let mut validators = self.validators.write().await;

        let validator = validators.get_mut(&address)
            .ok_or_else(|| StakingError::ValidatorNotFound(address.clone()))?;

        let rewards = validator.unclaimed_rewards;
        validator.unclaimed_rewards = 0;

        info!("Claimed {} rewards for validator {}", rewards, address);
        Ok(rewards)
    }

    /// Slash a validator for misbehavior
    pub async fn slash(&self, address: String, penalty_bps: u16) -> Result<u128> {
        if penalty_bps > self.config.max_slash_rate_bps {
            return Err(StakingError::InvalidAmount(format!(
                "Slash rate {} exceeds max {}",
                penalty_bps, self.config.max_slash_rate_bps
            )));
        }

        let mut validators = self.validators.write().await;
        let mut total = self.total_staked.write().await;

        let validator = validators.get_mut(&address)
            .ok_or_else(|| StakingError::ValidatorNotFound(address.clone()))?;

        let slash_amount = validator.stake
            .saturating_mul(penalty_bps as u128)
            .saturating_div(10_000);

        if slash_amount > validator.stake {
            return Err(StakingError::SlashExceedsStake);
        }

        validator.stake = validator.stake.saturating_sub(slash_amount);
        validator.total_slashed = validator.total_slashed.saturating_add(slash_amount);
        validator.is_active = false;
        *total = total.saturating_sub(slash_amount);

        warn!(
            "Slashed {} ({} bps) from validator {}",
            slash_amount, penalty_bps, address
        );
        Ok(slash_amount)
    }

    /// Get validator info
    pub async fn get_validator(&self, address: &str) -> Option<ValidatorInfo> {
        self.validators.read().await.get(address).cloned()
    }

    /// Get all active validators
    pub async fn get_active_validators(&self) -> Vec<ValidatorInfo> {
        self.validators
            .read()
            .await
            .values()
            .filter(|v| v.is_active)
            .cloned()
            .collect()
    }

    /// Get total staked amount
    pub async fn get_total_staked(&self) -> u128 {
        *self.total_staked.read().await
    }

    /// Update current block (called by node)
    pub async fn set_current_block(&self, block: u64) {
        *self.current_block.write().await = block;
    }

    /// Distribute epoch rewards (called at epoch boundary)
    pub async fn distribute_rewards(&self, total_rewards: u128) {
        let mut validators = self.validators.write().await;
        let total_staked = *self.total_staked.read().await;

        if total_staked == 0 {
            return;
        }

        for validator in validators.values_mut() {
            if !validator.is_active {
                continue;
            }

            // Calculate reward share based on voting power
            let share = validator.voting_power()
                .saturating_mul(total_rewards)
                .saturating_div(total_staked);

            validator.unclaimed_rewards = validator.unclaimed_rewards.saturating_add(share);
            validator.total_rewards = validator.total_rewards.saturating_add(share);

            debug!("Distributed {} rewards to validator {}", share, validator.address);
        }

        info!("Distributed {} total epoch rewards", total_rewards);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn default_config() -> StakingConfig {
        StakingConfig {
            min_validator_stake: 1000,
            min_delegation: 100,
            unstaking_lock_blocks: 100,
            epoch_reward_rate_bps: 50,
            blocks_per_epoch: 100,
            max_slash_rate_bps: 5000,
        }
    }

    #[tokio::test]
    async fn test_stake_validator() {
        let staking = Staking::new(default_config());
        let result = staking.stake("validator1".to_string(), 1000).await;
        assert!(result.is_ok());

        let validator = staking.get_validator("validator1").await;
        assert!(validator.is_some());
        assert_eq!(validator.unwrap().stake, 1000);
    }

    #[tokio::test]
    async fn test_stake_insufficient() {
        let staking = Staking::new(default_config());
        let result = staking.stake("validator1".to_string(), 500).await;
        assert!(matches!(result, Err(StakingError::InsufficientStake { .. })));
    }

    #[tokio::test]
    async fn test_delegate() {
        let staking = Staking::new(default_config());
        staking.stake("validator1".to_string(), 1000).await.unwrap();

        let result = staking.delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            100,
        ).await;
        assert!(result.is_ok());

        let validator = staking.get_validator("validator1").await.unwrap();
        assert_eq!(validator.delegated, 100);
        assert_eq!(validator.voting_power(), 1100);
    }

    #[tokio::test]
    async fn test_unstake_lock_period() {
        let staking = Staking::new(default_config());
        staking.stake("validator1".to_string(), 1000).await.unwrap();

        staking.unstake("validator1".to_string(), 1000).await.unwrap();

        // Should fail - still locked
        let result = staking.withdraw("validator1".to_string()).await;
        assert!(matches!(result, Err(StakingError::StakeLocked { .. })));

        // Advance blocks past unlock
        staking.set_current_block(200).await;
        let result = staking.withdraw("validator1".to_string()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1000);
    }

    #[tokio::test]
    async fn test_slash_validator() {
        let staking = Staking::new(default_config());
        staking.stake("validator1".to_string(), 1000).await.unwrap();

        // Slash 10% (1000 bps)
        let slashed = staking.slash("validator1".to_string(), 1000).await.unwrap();
        assert_eq!(slashed, 100);

        let validator = staking.get_validator("validator1").await.unwrap();
        assert_eq!(validator.stake, 900);
        assert!(!validator.is_active);
    }

    #[tokio::test]
    async fn test_distribute_rewards() {
        let staking = Staking::new(default_config());
        staking.stake("validator1".to_string(), 1000).await.unwrap();
        staking.stake("validator2".to_string(), 3000).await.unwrap();

        // Distribute 1000 rewards
        staking.distribute_rewards(1000).await;

        let v1 = staking.get_validator("validator1").await.unwrap();
        let v2 = staking.get_validator("validator2").await.unwrap();

        // Rewards should be proportional to stake
        assert_eq!(v1.unclaimed_rewards, 250);  // 25% of 1000
        assert_eq!(v2.unclaimed_rewards, 750);  // 75% of 1000
    }

    #[tokio::test]
    async fn test_claim_rewards() {
        let staking = Staking::new(default_config());
        staking.stake("validator1".to_string(), 1000).await.unwrap();
        staking.distribute_rewards(1000).await;

        let claimed = staking.claim_rewards("validator1".to_string()).await.unwrap();
        assert_eq!(claimed, 1000);

        let validator = staking.get_validator("validator1").await.unwrap();
        assert_eq!(validator.unclaimed_rewards, 0);
    }
}
