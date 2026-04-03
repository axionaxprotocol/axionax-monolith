//! Integration Tests for Self-Reliance Features
//!
//! Tests interactions between Staking, Governance, and Consensus modules

use governance::{Governance, GovernanceConfig, ProposalType, VoteOption};
use staking::{Staking, StakingConfig};

/// Test that governance voting uses staking weight
#[tokio::test]
async fn test_governance_uses_stake_weight() {
    // Setup staking
    let staking = Staking::new(StakingConfig {
        min_validator_stake: 1000,
        min_delegation: 100,
        ..Default::default()
    });

    // Setup governance
    let governance = Governance::new(GovernanceConfig {
        min_proposal_stake: 1000,
        voting_period_blocks: 100,
        execution_delay_blocks: 10,
        quorum_bps: 3000,
        pass_threshold_bps: 5000,
    });

    // Stake tokens
    staking.stake("validator1".to_string(), 5000).await.unwrap();
    staking.stake("validator2".to_string(), 3000).await.unwrap();

    // Get stake for governance voting
    let v1_stake = staking.get_validator("validator1").await.unwrap().stake;
    let v2_stake = staking.get_validator("validator2").await.unwrap().stake;

    // Create proposal (needs min stake)
    let proposal_id = governance
        .create_proposal(
            "validator1".to_string(),
            v1_stake,
            "Parameter Change".to_string(),
            "Change base fee".to_string(),
            ProposalType::ParameterChange {
                key: "base_fee".to_string(),
                value: "1000000000".to_string(),
            },
        )
        .await
        .unwrap();

    // Vote with stake weights
    governance
        .vote(
            "validator1".to_string(),
            proposal_id,
            VoteOption::For,
            v1_stake,
        )
        .await
        .unwrap();
    governance
        .vote(
            "validator2".to_string(),
            proposal_id,
            VoteOption::Against,
            v2_stake,
        )
        .await
        .unwrap();

    // Check votes are weighted correctly
    let proposal = governance.get_proposal(proposal_id).await.unwrap();
    assert_eq!(proposal.votes_for, 5000);
    assert_eq!(proposal.votes_against, 3000);
}

/// Test slashing reduces voting power
#[tokio::test]
async fn test_slashing_reduces_voting_power() {
    let staking = Staking::new(StakingConfig {
        min_validator_stake: 1000,
        max_slash_rate_bps: 5000,
        ..Default::default()
    });

    // Stake
    staking
        .stake("validator1".to_string(), 10000)
        .await
        .unwrap();

    let initial_power = staking
        .get_validator("validator1")
        .await
        .unwrap()
        .voting_power();
    assert_eq!(initial_power, 10000);

    // Slash 10%
    staking.slash("validator1".to_string(), 1000).await.unwrap();

    let post_slash_power = staking.get_validator("validator1").await.unwrap().stake;
    assert_eq!(post_slash_power, 9000);
}

/// Test delegation increases validator voting power
#[tokio::test]
async fn test_delegation_increases_voting_power() {
    let staking = Staking::new(StakingConfig {
        min_validator_stake: 1000,
        min_delegation: 100,
        ..Default::default()
    });

    // Validator stakes
    staking.stake("validator1".to_string(), 5000).await.unwrap();

    // Delegator delegates
    staking
        .delegate("delegator1".to_string(), "validator1".to_string(), 2000)
        .await
        .unwrap();
    staking
        .delegate("delegator2".to_string(), "validator1".to_string(), 3000)
        .await
        .unwrap();

    // Check voting power includes delegations
    let validator = staking.get_validator("validator1").await.unwrap();
    assert_eq!(validator.stake, 5000);
    assert_eq!(validator.delegated, 5000);
    assert_eq!(validator.voting_power(), 10000);
}

/// Test proposal execution after passing
#[tokio::test]
async fn test_full_governance_flow() {
    let governance = Governance::new(GovernanceConfig {
        min_proposal_stake: 1000,
        voting_period_blocks: 10,
        execution_delay_blocks: 5,
        quorum_bps: 2000, // 20% quorum
        pass_threshold_bps: 5000,
    });

    // Create proposal
    let proposal_id = governance
        .create_proposal(
            "proposer".to_string(),
            5000,
            "Treasury Spend".to_string(),
            "Fund development".to_string(),
            ProposalType::TreasurySpend {
                recipient: "0x1234567890".to_string(),
                amount: 100000,
            },
        )
        .await
        .unwrap();

    // Vote (total staked: 10000, need 20% quorum = 2000 votes)
    governance
        .vote("voter1".to_string(), proposal_id, VoteOption::For, 3000)
        .await
        .unwrap();
    governance
        .vote("voter2".to_string(), proposal_id, VoteOption::For, 1500)
        .await
        .unwrap();
    governance
        .vote("voter3".to_string(), proposal_id, VoteOption::Against, 500)
        .await
        .unwrap();

    // Advance past voting period
    governance.set_current_block(20).await;

    // Finalize
    let status = governance
        .finalize_proposal(proposal_id, 10000)
        .await
        .unwrap();
    assert_eq!(status, governance::ProposalStatus::Passed);

    // Advance past execution delay
    governance.set_current_block(30).await;

    // Execute
    let data = governance.execute_proposal(proposal_id).await.unwrap();
    assert!(String::from_utf8_lossy(&data).contains("TREASURY_SPEND"));
}

/// Test rewards distribution is proportional to stake
#[tokio::test]
async fn test_proportional_rewards() {
    let staking = Staking::new(StakingConfig {
        min_validator_stake: 1000,
        ..Default::default()
    });

    // Stake different amounts
    staking.stake("v1".to_string(), 1000).await.unwrap(); // 10%
    staking.stake("v2".to_string(), 4000).await.unwrap(); // 40%
    staking.stake("v3".to_string(), 5000).await.unwrap(); // 50%

    // Distribute 10000 rewards
    staking.distribute_rewards(10000).await;

    // Check proportional distribution
    let v1 = staking.get_validator("v1").await.unwrap();
    let v2 = staking.get_validator("v2").await.unwrap();
    let v3 = staking.get_validator("v3").await.unwrap();

    assert_eq!(v1.unclaimed_rewards, 1000); // 10%
    assert_eq!(v2.unclaimed_rewards, 4000); // 40%
    assert_eq!(v3.unclaimed_rewards, 5000); // 50%
}

/// Test unstaking lock prevents immediate withdrawal
#[tokio::test]
async fn test_unstaking_lock_period() {
    let staking = Staking::new(StakingConfig {
        min_validator_stake: 1000,
        unstaking_lock_blocks: 100,
        ..Default::default()
    });

    staking.stake("validator".to_string(), 5000).await.unwrap();
    staking
        .unstake("validator".to_string(), 5000)
        .await
        .unwrap();

    // Should fail - locked
    let result = staking.withdraw("validator".to_string()).await;
    assert!(result.is_err());

    // Advance past lock period
    staking.set_current_block(200).await;

    // Should succeed now
    let amount = staking.withdraw("validator".to_string()).await.unwrap();
    assert_eq!(amount, 5000);
}
