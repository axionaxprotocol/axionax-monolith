//! Staking RPC Endpoints
//!
//! JSON-RPC methods for staking operations

use jsonrpsee::{
    core::{async_trait, RpcResult},
    proc_macros::rpc,
    types::ErrorObjectOwned,
};
use serde::{Deserialize, Serialize};
use staking::{Staking, StakingConfig, ValidatorInfo};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

/// Staking RPC Error
#[derive(Debug, thiserror::Error)]
pub enum StakingRpcError {
    #[error("Staking error: {0}")]
    StakingError(String),
    
    #[error("Invalid parameters: {0}")]
    InvalidParams(String),

    #[error("Authentication failed: {0}")]
    AuthError(String),
}

impl From<StakingRpcError> for ErrorObjectOwned {
    fn from(error: StakingRpcError) -> Self {
        match error {
            StakingRpcError::StakingError(msg) => ErrorObjectOwned::owned(-32000, msg, None::<()>),
            StakingRpcError::InvalidParams(msg) => ErrorObjectOwned::owned(-32602, msg, None::<()>),
            StakingRpcError::AuthError(msg) => ErrorObjectOwned::owned(-32003, msg, None::<()>),
        }
    }
}

/// Validator response format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatorResponse {
    pub address: String,
    pub stake: String,
    pub delegated: String,
    pub voting_power: String,
    pub is_active: bool,
    pub commission_bps: u16,
    pub total_rewards: String,
    pub unclaimed_rewards: String,
}

impl From<ValidatorInfo> for ValidatorResponse {
    fn from(v: ValidatorInfo) -> Self {
        let voting_power = format!("0x{:x}", v.voting_power());
        Self {
            address: v.address,
            stake: format!("0x{:x}", v.stake),
            delegated: format!("0x{:x}", v.delegated),
            voting_power,
            is_active: v.is_active,
            commission_bps: v.commission_bps,
            total_rewards: format!("0x{:x}", v.total_rewards),
            unclaimed_rewards: format!("0x{:x}", v.unclaimed_rewards),
        }
    }
}

/// Staking stats response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingStatsResponse {
    pub total_staked: String,
    pub total_validators: u64,
    pub active_validators: u64,
    pub min_stake: String,
}

/// Staking JSON-RPC API
#[rpc(server)]
pub trait StakingRpc {
    /// Get validator info by address
    #[method(name = "staking_getValidator")]
    async fn get_validator(&self, address: String) -> RpcResult<Option<ValidatorResponse>>;

    /// Get all active validators
    #[method(name = "staking_getActiveValidators")]
    async fn get_active_validators(&self) -> RpcResult<Vec<ValidatorResponse>>;

    /// Get total staked amount
    #[method(name = "staking_getTotalStaked")]
    async fn get_total_staked(&self) -> RpcResult<String>;

    /// Get staking statistics
    #[method(name = "staking_getStats")]
    async fn get_stats(&self) -> RpcResult<StakingStatsResponse>;

    /// Stake tokens. Requires `signature` and `public_key` for authentication.
    /// The server derives the caller address from the public key and verifies the signature.
    #[method(name = "staking_stake")]
    async fn stake(&self, address: String, amount: String, signature: String, public_key: String) -> RpcResult<bool>;

    /// Initiate unstaking. Requires signature authentication.
    #[method(name = "staking_unstake")]
    async fn unstake(&self, address: String, amount: String, signature: String, public_key: String) -> RpcResult<bool>;

    /// Delegate to validator. Requires signature authentication.
    #[method(name = "staking_delegate")]
    async fn delegate(&self, delegator: String, validator: String, amount: String, signature: String, public_key: String) -> RpcResult<bool>;

    /// Claim staking rewards. Requires signature authentication.
    #[method(name = "staking_claimRewards")]
    async fn claim_rewards(&self, address: String, signature: String, public_key: String) -> RpcResult<String>;
}

/// Staking RPC Server Implementation
pub struct StakingRpcServerImpl {
    staking: Arc<RwLock<Staking>>,
    config: StakingConfig,
}

impl StakingRpcServerImpl {
    pub fn new(staking: Arc<RwLock<Staking>>, config: StakingConfig) -> Self {
        Self { staking, config }
    }
}

#[async_trait]
impl StakingRpcServer for StakingRpcServerImpl {
    async fn get_validator(&self, address: String) -> RpcResult<Option<ValidatorResponse>> {
        let staking = self.staking.read().await;
        let validator = staking.get_validator(&address).await;
        Ok(validator.map(ValidatorResponse::from))
    }

    async fn get_active_validators(&self) -> RpcResult<Vec<ValidatorResponse>> {
        let staking = self.staking.read().await;
        let validators = staking.get_active_validators().await;
        Ok(validators.into_iter().map(ValidatorResponse::from).collect())
    }

    async fn get_total_staked(&self) -> RpcResult<String> {
        let staking = self.staking.read().await;
        let total = staking.get_total_staked().await;
        Ok(format!("0x{:x}", total))
    }

    async fn get_stats(&self) -> RpcResult<StakingStatsResponse> {
        let staking = self.staking.read().await;
        let total_staked = staking.get_total_staked().await;
        let validators = staking.get_active_validators().await;
        
        Ok(StakingStatsResponse {
            total_staked: format!("0x{:x}", total_staked),
            total_validators: validators.len() as u64,
            active_validators: validators.iter().filter(|v| v.is_active).count() as u64,
            min_stake: format!("0x{:x}", self.config.min_validator_stake),
        })
    }

    async fn stake(&self, address: String, amount: String, signature: String, public_key: String) -> RpcResult<bool> {
        let verified_addr = verify_signed_request(&address, "stake", &signature, &public_key)
            .map_err(StakingRpcError::AuthError)?;
        let amount = parse_hex_u128(&amount)
            .map_err(StakingRpcError::InvalidParams)?;
        
        let staking = self.staking.read().await;
        staking.stake(verified_addr.clone(), amount).await
            .map_err(|e| StakingRpcError::StakingError(e.to_string()))?;
        
        info!("RPC: Staked {} for {}", amount, verified_addr);
        Ok(true)
    }

    async fn unstake(&self, address: String, amount: String, signature: String, public_key: String) -> RpcResult<bool> {
        let verified_addr = verify_signed_request(&address, "unstake", &signature, &public_key)
            .map_err(StakingRpcError::AuthError)?;
        let amount = parse_hex_u128(&amount)
            .map_err(StakingRpcError::InvalidParams)?;
        
        let staking = self.staking.read().await;
        staking.unstake(verified_addr.clone(), amount).await
            .map_err(|e| StakingRpcError::StakingError(e.to_string()))?;
        
        info!("RPC: Unstaked {} for {}", amount, verified_addr);
        Ok(true)
    }

    async fn delegate(&self, delegator: String, validator: String, amount: String, signature: String, public_key: String) -> RpcResult<bool> {
        let verified_addr = verify_signed_request(&delegator, "delegate", &signature, &public_key)
            .map_err(StakingRpcError::AuthError)?;
        let amount = parse_hex_u128(&amount)
            .map_err(StakingRpcError::InvalidParams)?;
        
        let staking = self.staking.read().await;
        staking.delegate(verified_addr.clone(), validator.clone(), amount).await
            .map_err(|e| StakingRpcError::StakingError(e.to_string()))?;
        
        info!("RPC: Delegated {} from {} to {}", amount, verified_addr, validator);
        Ok(true)
    }

    async fn claim_rewards(&self, address: String, signature: String, public_key: String) -> RpcResult<String> {
        let verified_addr = verify_signed_request(&address, "claimRewards", &signature, &public_key)
            .map_err(StakingRpcError::AuthError)?;

        let staking = self.staking.read().await;
        let rewards = staking.claim_rewards(verified_addr.clone()).await
            .map_err(|e| StakingRpcError::StakingError(e.to_string()))?;
        
        info!("RPC: Claimed {} rewards for {}", rewards, verified_addr);
        Ok(format!("0x{:x}", rewards))
    }
}

fn parse_hex_u128(hex: &str) -> Result<u128, String> {
    let hex = hex.strip_prefix("0x").unwrap_or(hex);
    u128::from_str_radix(hex, 16).map_err(|e| format!("Invalid hex: {}", e))
}

/// Verify that the caller owns the claimed address by checking an Ed25519 signature.
///
/// `claimed_address` — the 0x address the caller claims to own.
/// `action` — a domain-separator string (e.g. "stake", "vote") to prevent cross-method replay.
/// `signature_hex` — hex-encoded 64-byte Ed25519 signature over `action`.
/// `public_key_hex` — hex-encoded 32-byte Ed25519 public key.
///
/// Returns the derived address on success, or an error string on failure.
fn verify_signed_request(
    claimed_address: &str,
    action: &str,
    signature_hex: &str,
    public_key_hex: &str,
) -> Result<String, String> {
    let pk_bytes = hex::decode(public_key_hex.strip_prefix("0x").unwrap_or(public_key_hex))
        .map_err(|e| format!("Invalid public_key hex: {}", e))?;
    let sig_bytes = hex::decode(signature_hex.strip_prefix("0x").unwrap_or(signature_hex))
        .map_err(|e| format!("Invalid signature hex: {}", e))?;

    let vk = crypto::signature::public_key_from_bytes(&pk_bytes)
        .ok_or_else(|| "Invalid public key (must be 32 bytes)".to_string())?;

    if !crypto::signature::verify(&vk, action.as_bytes(), &sig_bytes) {
        return Err("Signature verification failed".to_string());
    }

    let derived = crypto::signature::address_from_public_key(&vk);
    if derived != claimed_address {
        return Err(format!(
            "Address mismatch: claimed {} but signature proves {}",
            claimed_address, derived
        ));
    }

    Ok(derived)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_hex_u128() {
        assert_eq!(parse_hex_u128("0x64").unwrap(), 100);
        assert_eq!(parse_hex_u128("64").unwrap(), 100);
        assert_eq!(parse_hex_u128("0x3e8").unwrap(), 1000);
    }
}
