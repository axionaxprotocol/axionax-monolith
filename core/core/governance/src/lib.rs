//! On-chain Governance Module for Axionax Protocol
//!
//! Provides decentralized governance without external voting services:
//! - Proposal creation and management
//! - Stake-weighted voting
//! - Automatic proposal execution
//! - Parameter upgrades

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, info};

/// Governance errors
#[derive(Error, Debug)]
pub enum GovernanceError {
    #[error("Proposal not found: {0}")]
    ProposalNotFound(u64),

    #[error("Insufficient stake to create proposal: required {required}, have {available}")]
    InsufficientStake { required: u128, available: u128 },

    #[error("Already voted on proposal {0}")]
    AlreadyVoted(u64),

    #[error("Voting period ended")]
    VotingEnded,

    #[error("Voting period not ended yet")]
    VotingNotEnded,

    #[error("Proposal not passed")]
    ProposalNotPassed,

    #[error("Proposal already executed")]
    AlreadyExecuted,

    #[error("Execution delay not met: wait until block {0}")]
    ExecutionDelayNotMet(u64),

    #[error("Only proposer can cancel")]
    NotProposer,

    #[error("Proposal already cancelled")]
    AlreadyCancelled,

    #[error("Quorum not reached: required {required}%, got {actual}%")]
    QuorumNotReached { required: u64, actual: u64 },

    #[error("Title too long: {len} chars (max: {max})")]
    TitleTooLong { len: usize, max: usize },

    #[error("Description too long: {len} chars (max: {max})")]
    DescriptionTooLong { len: usize, max: usize },
}

pub type Result<T> = std::result::Result<T, GovernanceError>;

/// Governance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceConfig {
    /// Minimum stake to create a proposal
    pub min_proposal_stake: u128,
    
    /// Voting period in blocks (~7 days @ 2.5s/block)
    pub voting_period_blocks: u64,
    
    /// Execution delay after voting ends (blocks)
    pub execution_delay_blocks: u64,
    
    /// Quorum percentage (basis points, e.g., 3000 = 30%)
    pub quorum_bps: u16,
    
    /// Pass threshold percentage (basis points, e.g., 5000 = 50%)
    pub pass_threshold_bps: u16,
}

impl Default for GovernanceConfig {
    fn default() -> Self {
        Self {
            min_proposal_stake: 100_000 * 10_u128.pow(18), // 100,000 AXX
            voting_period_blocks: 241_920,                  // ~7 days @ 2.5s/block
            execution_delay_blocks: 69_120,                 // ~2 days @ 2.5s/block
            quorum_bps: 3000,                               // 30% quorum
            pass_threshold_bps: 5000,                       // 50%+1 to pass
        }
    }
}

/// Vote options
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VoteOption {
    For,
    Against,
    Abstain,
}

/// Proposal status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProposalStatus {
    /// Voting is active
    Active,
    /// Voting ended, passed
    Passed,
    /// Voting ended, failed
    Failed,
    /// Proposal executed
    Executed,
    /// Proposal cancelled by proposer
    Cancelled,
}

/// Proposal type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalType {
    /// Text proposal (no on-chain effect)
    Text,
    /// Parameter change
    ParameterChange { key: String, value: String },
    /// Treasury spend
    TreasurySpend { recipient: String, amount: u128 },
    /// Protocol upgrade
    ProtocolUpgrade { version: String, data: Vec<u8> },
}

/// Governance proposal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    /// Unique proposal ID
    pub id: u64,
    
    /// Proposer address
    pub proposer: String,
    
    /// Proposal title
    pub title: String,
    
    /// Proposal description
    pub description: String,
    
    /// Proposal type
    pub proposal_type: ProposalType,
    
    /// Block when voting started
    pub start_block: u64,
    
    /// Block when voting ends
    pub end_block: u64,
    
    /// Current status
    pub status: ProposalStatus,
    
    /// Total votes FOR
    pub votes_for: u128,
    
    /// Total votes AGAINST
    pub votes_against: u128,
    
    /// Total votes ABSTAIN  
    pub votes_abstain: u128,
    
    /// Proposer's stake snapshot
    pub proposer_stake: u128,
}

impl Proposal {
    /// Calculate total votes cast
    pub fn total_votes(&self) -> u128 {
        self.votes_for
            .saturating_add(self.votes_against)
            .saturating_add(self.votes_abstain)
    }
    
    /// Check if proposal passed
    pub fn is_passed(&self, total_staked: u128, quorum_bps: u16, pass_threshold_bps: u16) -> bool {
        // Check quorum
        let quorum_required = total_staked
            .saturating_mul(quorum_bps as u128)
            .saturating_div(10_000);
        
        if self.total_votes() < quorum_required {
            return false;
        }
        
        // Check threshold (FOR > threshold of FOR + AGAINST)
        let votes_counted = self.votes_for.saturating_add(self.votes_against);
        if votes_counted == 0 {
            return false;
        }
        
        let threshold = votes_counted
            .saturating_mul(pass_threshold_bps as u128)
            .saturating_div(10_000);
        
        self.votes_for > threshold
    }
}

/// Vote record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteRecord {
    pub voter: String,
    pub proposal_id: u64,
    pub vote: VoteOption,
    pub weight: u128,
    pub block: u64,
}

/// On-chain Governance Module
pub struct Governance {
    config: GovernanceConfig,
    proposals: Arc<RwLock<HashMap<u64, Proposal>>>,
    votes: Arc<RwLock<HashMap<(u64, String), VoteRecord>>>,
    next_proposal_id: Arc<RwLock<u64>>,
    current_block: Arc<RwLock<u64>>,
}

impl Governance {
    /// Create new governance module
    pub fn new(config: GovernanceConfig) -> Self {
        Self {
            config,
            proposals: Arc::new(RwLock::new(HashMap::new())),
            votes: Arc::new(RwLock::new(HashMap::new())),
            next_proposal_id: Arc::new(RwLock::new(1)),
            current_block: Arc::new(RwLock::new(0)),
        }
    }

    /// Create a new proposal
    pub async fn create_proposal(
        &self,
        proposer: String,
        proposer_stake: u128,
        title: String,
        description: String,
        proposal_type: ProposalType,
    ) -> Result<u64> {
        if title.len() > 256 {
            return Err(GovernanceError::TitleTooLong { len: title.len(), max: 256 });
        }

        if description.len() > 10_000 {
            return Err(GovernanceError::DescriptionTooLong { len: description.len(), max: 10_000 });
        }

        if proposer_stake < self.config.min_proposal_stake {
            return Err(GovernanceError::InsufficientStake {
                required: self.config.min_proposal_stake,
                available: proposer_stake,
            });
        }

        let mut proposals = self.proposals.write().await;
        let mut next_id = self.next_proposal_id.write().await;
        let current_block = *self.current_block.read().await;

        let proposal = Proposal {
            id: *next_id,
            proposer: proposer.clone(),
            title,
            description,
            proposal_type,
            start_block: current_block,
            end_block: current_block + self.config.voting_period_blocks,
            status: ProposalStatus::Active,
            votes_for: 0,
            votes_against: 0,
            votes_abstain: 0,
            proposer_stake,
        };

        let proposal_id = *next_id;
        proposals.insert(proposal_id, proposal);
        *next_id += 1;

        info!("Created proposal {} by {}", proposal_id, proposer);
        Ok(proposal_id)
    }

    /// Vote on a proposal
    pub async fn vote(
        &self,
        voter: String,
        proposal_id: u64,
        vote: VoteOption,
        vote_weight: u128,
    ) -> Result<()> {
        let mut proposals = self.proposals.write().await;
        let mut votes = self.votes.write().await;
        let current_block = *self.current_block.read().await;

        let proposal = proposals.get_mut(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound(proposal_id))?;

        // Check voting period
        if current_block > proposal.end_block {
            return Err(GovernanceError::VotingEnded);
        }

        if proposal.status != ProposalStatus::Active {
            return Err(GovernanceError::VotingEnded);
        }

        // Check if already voted
        let vote_key = (proposal_id, voter.clone());
        if votes.contains_key(&vote_key) {
            return Err(GovernanceError::AlreadyVoted(proposal_id));
        }

        // Record vote
        match vote {
            VoteOption::For => proposal.votes_for = proposal.votes_for.saturating_add(vote_weight),
            VoteOption::Against => proposal.votes_against = proposal.votes_against.saturating_add(vote_weight),
            VoteOption::Abstain => proposal.votes_abstain = proposal.votes_abstain.saturating_add(vote_weight),
        }

        votes.insert(vote_key, VoteRecord {
            voter: voter.clone(),
            proposal_id,
            vote,
            weight: vote_weight,
            block: current_block,
        });

        debug!("Vote {:?} by {} on proposal {} with weight {}", vote, voter, proposal_id, vote_weight);
        Ok(())
    }

    /// Finalize voting and determine outcome
    pub async fn finalize_proposal(&self, proposal_id: u64, total_staked: u128) -> Result<ProposalStatus> {
        let mut proposals = self.proposals.write().await;
        let current_block = *self.current_block.read().await;

        let proposal = proposals.get_mut(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound(proposal_id))?;

        if proposal.status != ProposalStatus::Active {
            return Ok(proposal.status);
        }

        if current_block <= proposal.end_block {
            return Err(GovernanceError::VotingNotEnded);
        }

        // Determine outcome
        if proposal.is_passed(total_staked, self.config.quorum_bps, self.config.pass_threshold_bps) {
            proposal.status = ProposalStatus::Passed;
            info!("Proposal {} passed", proposal_id);
        } else {
            proposal.status = ProposalStatus::Failed;
            info!("Proposal {} failed", proposal_id);
        }

        Ok(proposal.status)
    }

    /// Execute a passed proposal
    pub async fn execute_proposal(&self, proposal_id: u64) -> Result<Vec<u8>> {
        let mut proposals = self.proposals.write().await;
        let current_block = *self.current_block.read().await;

        let proposal = proposals.get_mut(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound(proposal_id))?;

        if proposal.status == ProposalStatus::Executed {
            return Err(GovernanceError::AlreadyExecuted);
        }

        if proposal.status != ProposalStatus::Passed {
            return Err(GovernanceError::ProposalNotPassed);
        }

        // Check execution delay
        let execution_block = proposal.end_block + self.config.execution_delay_blocks;
        if current_block < execution_block {
            return Err(GovernanceError::ExecutionDelayNotMet(execution_block));
        }

        // Execute based on proposal type
        let execution_data = match &proposal.proposal_type {
            ProposalType::Text => vec![],
            ProposalType::ParameterChange { key, value } => {
                format!("PARAM_CHANGE:{}={}", key, value).into_bytes()
            }
            ProposalType::TreasurySpend { recipient, amount } => {
                format!("TREASURY_SPEND:{}:{}", recipient, amount).into_bytes()
            }
            ProposalType::ProtocolUpgrade { version, data } => {
                let mut result = format!("UPGRADE:{}", version).into_bytes();
                result.extend_from_slice(data);
                result
            }
        };

        proposal.status = ProposalStatus::Executed;
        info!("Executed proposal {}", proposal_id);

        Ok(execution_data)
    }

    /// Cancel a proposal (only by proposer, before voting ends)
    pub async fn cancel_proposal(&self, proposal_id: u64, caller: &str) -> Result<()> {
        let mut proposals = self.proposals.write().await;

        let proposal = proposals.get_mut(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound(proposal_id))?;

        if proposal.proposer != caller {
            return Err(GovernanceError::NotProposer);
        }

        if proposal.status == ProposalStatus::Cancelled {
            return Err(GovernanceError::AlreadyCancelled);
        }

        if proposal.status == ProposalStatus::Executed {
            return Err(GovernanceError::AlreadyExecuted);
        }

        proposal.status = ProposalStatus::Cancelled;
        info!("Cancelled proposal {} by {}", proposal_id, caller);
        Ok(())
    }

    /// Get proposal by ID
    pub async fn get_proposal(&self, proposal_id: u64) -> Option<Proposal> {
        self.proposals.read().await.get(&proposal_id).cloned()
    }

    /// Get all active proposals
    pub async fn get_active_proposals(&self) -> Vec<Proposal> {
        self.proposals
            .read()
            .await
            .values()
            .filter(|p| p.status == ProposalStatus::Active)
            .cloned()
            .collect()
    }

    /// Get vote record
    pub async fn get_vote(&self, proposal_id: u64, voter: &str) -> Option<VoteRecord> {
        self.votes.read().await.get(&(proposal_id, voter.to_string())).cloned()
    }

    /// Update current block
    pub async fn set_current_block(&self, block: u64) {
        *self.current_block.write().await = block;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> GovernanceConfig {
        GovernanceConfig {
            min_proposal_stake: 1000,
            voting_period_blocks: 100,
            execution_delay_blocks: 10,
            quorum_bps: 3000,      // 30%
            pass_threshold_bps: 5000, // 50%
        }
    }

    #[tokio::test]
    async fn test_create_proposal() {
        let gov = Governance::new(test_config());
        
        let id = gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Test Proposal".to_string(),
            "This is a test".to_string(),
            ProposalType::Text,
        ).await.unwrap();

        assert_eq!(id, 1);
        let proposal = gov.get_proposal(1).await.unwrap();
        assert_eq!(proposal.status, ProposalStatus::Active);
    }

    #[tokio::test]
    async fn test_insufficient_stake() {
        let gov = Governance::new(test_config());
        
        let result = gov.create_proposal(
            "proposer1".to_string(),
            500, // Below minimum
            "Test".to_string(),
            "Test".to_string(),
            ProposalType::Text,
        ).await;

        assert!(matches!(result, Err(GovernanceError::InsufficientStake { .. })));
    }

    #[tokio::test]
    async fn test_vote() {
        let gov = Governance::new(test_config());
        
        gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Test".to_string(),
            "Test".to_string(),
            ProposalType::Text,
        ).await.unwrap();

        gov.vote("voter1".to_string(), 1, VoteOption::For, 100).await.unwrap();
        gov.vote("voter2".to_string(), 1, VoteOption::Against, 50).await.unwrap();

        let proposal = gov.get_proposal(1).await.unwrap();
        assert_eq!(proposal.votes_for, 100);
        assert_eq!(proposal.votes_against, 50);
    }

    #[tokio::test]
    async fn test_double_vote() {
        let gov = Governance::new(test_config());
        
        gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Test".to_string(),
            "Test".to_string(),
            ProposalType::Text,
        ).await.unwrap();

        gov.vote("voter1".to_string(), 1, VoteOption::For, 100).await.unwrap();
        let result = gov.vote("voter1".to_string(), 1, VoteOption::Against, 100).await;

        assert!(matches!(result, Err(GovernanceError::AlreadyVoted(_))));
    }

    #[tokio::test]
    async fn test_proposal_passes() {
        let gov = Governance::new(test_config());
        
        gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Test".to_string(),
            "Test".to_string(),
            ProposalType::Text,
        ).await.unwrap();

        // Total staked: 1000, quorum: 30% = 300
        gov.vote("voter1".to_string(), 1, VoteOption::For, 400).await.unwrap();
        gov.vote("voter2".to_string(), 1, VoteOption::Against, 100).await.unwrap();

        // Advance past voting period
        gov.set_current_block(200).await;

        let status = gov.finalize_proposal(1, 1000).await.unwrap();
        assert_eq!(status, ProposalStatus::Passed);
    }

    #[tokio::test]
    async fn test_proposal_fails_quorum() {
        let gov = Governance::new(test_config());
        
        gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Test".to_string(),
            "Test".to_string(),
            ProposalType::Text,
        ).await.unwrap();

        // Only 100 votes, quorum needs 300 (30% of 1000)
        gov.vote("voter1".to_string(), 1, VoteOption::For, 100).await.unwrap();

        gov.set_current_block(200).await;

        let status = gov.finalize_proposal(1, 1000).await.unwrap();
        assert_eq!(status, ProposalStatus::Failed);
    }

    #[tokio::test]
    async fn test_execute_proposal() {
        let gov = Governance::new(test_config());
        
        gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Param Change".to_string(),
            "Change fee".to_string(),
            ProposalType::ParameterChange { 
                key: "base_fee".to_string(), 
                value: "1000".to_string() 
            },
        ).await.unwrap();

        gov.vote("voter1".to_string(), 1, VoteOption::For, 400).await.unwrap();
        gov.set_current_block(200).await;
        gov.finalize_proposal(1, 1000).await.unwrap();

        // Wait for execution delay
        gov.set_current_block(220).await;
        
        let data = gov.execute_proposal(1).await.unwrap();
        assert!(!data.is_empty());

        let proposal = gov.get_proposal(1).await.unwrap();
        assert_eq!(proposal.status, ProposalStatus::Executed);
    }

    #[tokio::test]
    async fn test_cancel_proposal() {
        let gov = Governance::new(test_config());
        
        gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Test".to_string(),
            "Test".to_string(),
            ProposalType::Text,
        ).await.unwrap();

        gov.cancel_proposal(1, "proposer1").await.unwrap();

        let proposal = gov.get_proposal(1).await.unwrap();
        assert_eq!(proposal.status, ProposalStatus::Cancelled);
    }

    #[tokio::test]
    async fn test_title_too_long_rejected() {
        let gov = Governance::new(test_config());
        let long_title = "A".repeat(257);

        let result = gov.create_proposal(
            "proposer1".to_string(),
            1000,
            long_title,
            "Valid description".to_string(),
            ProposalType::Text,
        ).await;

        assert!(matches!(result, Err(GovernanceError::TitleTooLong { len: 257, max: 256 })));
    }

    #[tokio::test]
    async fn test_title_at_max_length_accepted() {
        let gov = Governance::new(test_config());
        let title = "A".repeat(256);

        let result = gov.create_proposal(
            "proposer1".to_string(),
            1000,
            title,
            "Valid description".to_string(),
            ProposalType::Text,
        ).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_description_too_long_rejected() {
        let gov = Governance::new(test_config());
        let long_desc = "B".repeat(10_001);

        let result = gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Valid title".to_string(),
            long_desc,
            ProposalType::Text,
        ).await;

        assert!(matches!(result, Err(GovernanceError::DescriptionTooLong { len: 10_001, max: 10_000 })));
    }

    #[tokio::test]
    async fn test_description_at_max_length_accepted() {
        let gov = Governance::new(test_config());
        let desc = "B".repeat(10_000);

        let result = gov.create_proposal(
            "proposer1".to_string(),
            1000,
            "Valid title".to_string(),
            desc,
            ProposalType::Text,
        ).await;

        assert!(result.is_ok());
    }
}
