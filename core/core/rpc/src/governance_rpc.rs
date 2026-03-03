//! Governance RPC Endpoints
//!
//! JSON-RPC methods for governance operations

use jsonrpsee::{
    core::{async_trait, RpcResult},
    proc_macros::rpc,
    types::ErrorObjectOwned,
};
use serde::{Deserialize, Serialize};
use governance::{Governance, GovernanceConfig, Proposal, ProposalStatus, ProposalType, VoteOption};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

/// Governance RPC Error
#[derive(Debug, thiserror::Error)]
pub enum GovernanceRpcError {
    #[error("Governance error: {0}")]
    GovernanceError(String),
    
    #[error("Invalid parameters: {0}")]
    InvalidParams(String),
}

impl From<GovernanceRpcError> for ErrorObjectOwned {
    fn from(error: GovernanceRpcError) -> Self {
        match error {
            GovernanceRpcError::GovernanceError(msg) => ErrorObjectOwned::owned(-32000, msg, None::<()>),
            GovernanceRpcError::InvalidParams(msg) => ErrorObjectOwned::owned(-32602, msg, None::<()>),
        }
    }
}

/// Proposal response format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalResponse {
    pub id: u64,
    pub proposer: String,
    pub title: String,
    pub description: String,
    pub proposal_type: String,
    pub start_block: u64,
    pub end_block: u64,
    pub status: String,
    pub votes_for: String,
    pub votes_against: String,
    pub votes_abstain: String,
    pub total_votes: String,
}

impl From<Proposal> for ProposalResponse {
    fn from(p: Proposal) -> Self {
        let proposal_type = match &p.proposal_type {
            ProposalType::Text => "text".to_string(),
            ProposalType::ParameterChange { key, value } => format!("parameter:{}={}", key, value),
            ProposalType::TreasurySpend { recipient, amount } => format!("treasury:{}:{}", recipient, amount),
            ProposalType::ProtocolUpgrade { version, .. } => format!("upgrade:{}", version),
        };

        let status = match p.status {
            ProposalStatus::Active => "active",
            ProposalStatus::Passed => "passed",
            ProposalStatus::Failed => "failed",
            ProposalStatus::Executed => "executed",
            ProposalStatus::Cancelled => "cancelled",
        };

        let total_votes = format!("0x{:x}", p.total_votes());
        Self {
            id: p.id,
            proposer: p.proposer,
            title: p.title,
            description: p.description,
            proposal_type,
            start_block: p.start_block,
            end_block: p.end_block,
            status: status.to_string(),
            votes_for: format!("0x{:x}", p.votes_for),
            votes_against: format!("0x{:x}", p.votes_against),
            votes_abstain: format!("0x{:x}", p.votes_abstain),
            total_votes,
        }
    }
}

/// Governance stats response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceStatsResponse {
    pub active_proposals: u64,
    pub total_proposals: u64,
    pub voting_period_blocks: u64,
    pub execution_delay_blocks: u64,
    pub quorum_bps: u16,
    pub pass_threshold_bps: u16,
    pub min_proposal_stake: String,
}

/// Governance JSON-RPC API
#[rpc(server)]
pub trait GovernanceRpc {
    /// Get proposal by ID
    #[method(name = "gov_getProposal")]
    async fn get_proposal(&self, proposal_id: u64) -> RpcResult<Option<ProposalResponse>>;

    /// Get all active proposals
    #[method(name = "gov_getActiveProposals")]
    async fn get_active_proposals(&self) -> RpcResult<Vec<ProposalResponse>>;

    /// Get governance stats/config
    #[method(name = "gov_getStats")]
    async fn get_stats(&self) -> RpcResult<GovernanceStatsResponse>;

    /// Create a new proposal
    #[method(name = "gov_createProposal")]
    async fn create_proposal(
        &self,
        proposer: String,
        proposer_stake: String,
        title: String,
        description: String,
        proposal_type: String,
    ) -> RpcResult<u64>;

    /// Vote on a proposal
    #[method(name = "gov_vote")]
    async fn vote(
        &self,
        voter: String,
        proposal_id: u64,
        vote: String,
        vote_weight: String,
    ) -> RpcResult<bool>;

    /// Get vote status for a voter on a proposal
    #[method(name = "gov_getVote")]
    async fn get_vote(&self, proposal_id: u64, voter: String) -> RpcResult<Option<String>>;

    /// Finalize a proposal (after voting ends)
    #[method(name = "gov_finalizeProposal")]
    async fn finalize_proposal(&self, proposal_id: u64, total_staked: String) -> RpcResult<String>;

    /// Execute a passed proposal
    #[method(name = "gov_executeProposal")]
    async fn execute_proposal(&self, proposal_id: u64) -> RpcResult<String>;
}

/// Governance RPC Server Implementation
pub struct GovernanceRpcServerImpl {
    governance: Arc<RwLock<Governance>>,
    config: GovernanceConfig,
}

impl GovernanceRpcServerImpl {
    pub fn new(governance: Arc<RwLock<Governance>>, config: GovernanceConfig) -> Self {
        Self { governance, config }
    }
}

#[async_trait]
impl GovernanceRpcServer for GovernanceRpcServerImpl {
    async fn get_proposal(&self, proposal_id: u64) -> RpcResult<Option<ProposalResponse>> {
        let gov = self.governance.read().await;
        let proposal = gov.get_proposal(proposal_id).await;
        Ok(proposal.map(ProposalResponse::from))
    }

    async fn get_active_proposals(&self) -> RpcResult<Vec<ProposalResponse>> {
        let gov = self.governance.read().await;
        let proposals = gov.get_active_proposals().await;
        Ok(proposals.into_iter().map(ProposalResponse::from).collect())
    }

    async fn get_stats(&self) -> RpcResult<GovernanceStatsResponse> {
        let gov = self.governance.read().await;
        let active = gov.get_active_proposals().await.len() as u64;
        
        Ok(GovernanceStatsResponse {
            active_proposals: active,
            total_proposals: active, // Simplified
            voting_period_blocks: self.config.voting_period_blocks,
            execution_delay_blocks: self.config.execution_delay_blocks,
            quorum_bps: self.config.quorum_bps,
            pass_threshold_bps: self.config.pass_threshold_bps,
            min_proposal_stake: format!("0x{:x}", self.config.min_proposal_stake),
        })
    }

    async fn create_proposal(
        &self,
        proposer: String,
        proposer_stake: String,
        title: String,
        description: String,
        proposal_type: String,
    ) -> RpcResult<u64> {
        let stake = parse_hex_u128(&proposer_stake)
            .map_err(|e| GovernanceRpcError::InvalidParams(e))?;

        let ptype = parse_proposal_type(&proposal_type)
            .map_err(|e| GovernanceRpcError::InvalidParams(e))?;

        let gov = self.governance.read().await;
        let id = gov.create_proposal(proposer.clone(), stake, title.clone(), description, ptype)
            .await
            .map_err(|e| GovernanceRpcError::GovernanceError(e.to_string()))?;

        info!("RPC: Created proposal {} by {}: {}", id, proposer, title);
        Ok(id)
    }

    async fn vote(
        &self,
        voter: String,
        proposal_id: u64,
        vote: String,
        vote_weight: String,
    ) -> RpcResult<bool> {
        let weight = parse_hex_u128(&vote_weight)
            .map_err(|e| GovernanceRpcError::InvalidParams(e))?;

        let vote_option = match vote.to_lowercase().as_str() {
            "for" | "yes" | "1" => VoteOption::For,
            "against" | "no" | "0" => VoteOption::Against,
            "abstain" | "2" => VoteOption::Abstain,
            _ => return Err(GovernanceRpcError::InvalidParams(
                format!("Invalid vote option: {}", vote)
            ).into()),
        };

        let gov = self.governance.read().await;
        gov.vote(voter.clone(), proposal_id, vote_option, weight)
            .await
            .map_err(|e| GovernanceRpcError::GovernanceError(e.to_string()))?;

        info!("RPC: Vote {:?} by {} on proposal {} with weight {}", vote_option, voter, proposal_id, weight);
        Ok(true)
    }

    async fn get_vote(&self, proposal_id: u64, voter: String) -> RpcResult<Option<String>> {
        let gov = self.governance.read().await;
        let vote = gov.get_vote(proposal_id, &voter).await;
        Ok(vote.map(|v| match v.vote {
            VoteOption::For => "for".to_string(),
            VoteOption::Against => "against".to_string(),
            VoteOption::Abstain => "abstain".to_string(),
        }))
    }

    async fn finalize_proposal(&self, proposal_id: u64, total_staked: String) -> RpcResult<String> {
        let staked = parse_hex_u128(&total_staked)
            .map_err(|e| GovernanceRpcError::InvalidParams(e))?;

        let gov = self.governance.read().await;
        let status = gov.finalize_proposal(proposal_id, staked)
            .await
            .map_err(|e| GovernanceRpcError::GovernanceError(e.to_string()))?;

        let status_str = match status {
            ProposalStatus::Passed => "passed",
            ProposalStatus::Failed => "failed",
            _ => "unknown",
        };

        info!("RPC: Finalized proposal {} - {}", proposal_id, status_str);
        Ok(status_str.to_string())
    }

    async fn execute_proposal(&self, proposal_id: u64) -> RpcResult<String> {
        let gov = self.governance.read().await;
        let data = gov.execute_proposal(proposal_id)
            .await
            .map_err(|e| GovernanceRpcError::GovernanceError(e.to_string()))?;

        info!("RPC: Executed proposal {}", proposal_id);
        Ok(format!("0x{}", hex::encode(data)))
    }
}

fn parse_hex_u128(hex: &str) -> Result<u128, String> {
    let hex = hex.strip_prefix("0x").unwrap_or(hex);
    u128::from_str_radix(hex, 16).map_err(|e| format!("Invalid hex: {}", e))
}

fn parse_proposal_type(s: &str) -> Result<ProposalType, String> {
    if s == "text" || s.is_empty() {
        return Ok(ProposalType::Text);
    }
    
    if let Some(rest) = s.strip_prefix("parameter:") {
        let parts: Vec<&str> = rest.splitn(2, '=').collect();
        if parts.len() == 2 {
            return Ok(ProposalType::ParameterChange {
                key: parts[0].to_string(),
                value: parts[1].to_string(),
            });
        }
    }
    
    if let Some(rest) = s.strip_prefix("treasury:") {
        let parts: Vec<&str> = rest.splitn(2, ':').collect();
        if parts.len() == 2 {
            let amount = parts[1].parse::<u128>()
                .map_err(|_| format!("Invalid treasury amount: {}", parts[1]))?;
            return Ok(ProposalType::TreasurySpend {
                recipient: parts[0].to_string(),
                amount,
            });
        }
    }
    
    if let Some(rest) = s.strip_prefix("upgrade:") {
        return Ok(ProposalType::ProtocolUpgrade {
            version: rest.to_string(),
            data: vec![],
        });
    }
    
    Err(format!("Unknown proposal type: {}", s))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_proposal_type() {
        assert!(matches!(parse_proposal_type("text").unwrap(), ProposalType::Text));
        
        let param = parse_proposal_type("parameter:base_fee=1000").unwrap();
        assert!(matches!(param, ProposalType::ParameterChange { .. }));
        
        let treasury = parse_proposal_type("treasury:0x1234:100000").unwrap();
        assert!(matches!(treasury, ProposalType::TreasurySpend { .. }));
        
        let upgrade = parse_proposal_type("upgrade:v2.0.0").unwrap();
        assert!(matches!(upgrade, ProposalType::ProtocolUpgrade { .. }));
    }
}
