/**
 * Activity Calculator Service
 *
 * Calculates activity scores and airdrop eligibility
 * based on testnet participation.
 */

import { db } from '../db/index.js';
import {
  addresses,
  transactions,
  tokenTransfers,
  stakingEvents,
  governanceEvents,
  addressActivitySummary,
} from '../db/schema.js';
import { eq, sql, count, sum } from 'drizzle-orm';

// ============================================
// Configuration - Scoring Weights
// ============================================

const SCORING_WEIGHTS = {
  // Transaction-based scoring
  transactionBase: 1, // Points per transaction
  transactionCap: 1000, // Max points from transactions

  // Gas spending
  gasMultiplier: 0.0001, // Points per gas unit spent
  gasCap: 500, // Max points from gas

  // Token interactions
  tokenTransferBase: 2, // Points per token transfer
  tokenTransferCap: 500, // Max points from token transfers
  uniqueTokenBonus: 10, // Bonus per unique token interacted

  // Staking participation
  stakingEventBase: 10, // Points per staking event
  stakingAmountMultiplier: 0.00001, // Points per AXX staked
  stakingCap: 2000, // Max points from staking

  // Governance participation
  governanceVoteBase: 50, // Points per governance vote
  proposalCreationBonus: 200, // Bonus for creating proposals
  governanceCap: 1000, // Max points from governance

  // Early adopter bonus
  earlyBlockThreshold: 10000, // Block number threshold for early adopter
  earlyAdopterBonus: 100, // Bonus points for early adopters

  // Consistency bonus
  dayActiveBonus: 5, // Points per unique day active
  weekStreakBonus: 50, // Bonus per week streak
};

// Airdrop tiers
const AIRDROP_TIERS = {
  bronze: { minScore: 100, percentage: 0.001 }, // 0.1% of allocation
  silver: { minScore: 500, percentage: 0.005 }, // 0.5% of allocation
  gold: { minScore: 1000, percentage: 0.01 }, // 1% of allocation
  platinum: { minScore: 5000, percentage: 0.05 }, // 5% of allocation
};

// Total airdrop pool (in AXX wei)
const TOTAL_AIRDROP_POOL = BigInt('50000000000000000000000000000'); // 50B AXX

// ============================================
// Activity Calculation
// ============================================

export async function calculateActivityScore(address: string): Promise<{
  score: number;
  breakdown: Record<string, number>;
  tier: number;
  airdropAmount: bigint;
}> {
  const addressLower = address.toLowerCase();
  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  // 1. Transaction metrics
  const txStats = await db
    .select({
      count: count(),
      totalGas: sum(transactions.gasUsed),
    })
    .from(transactions)
    .where(eq(transactions.from, addressLower));

  const txCount = txStats[0]?.count ?? 0;
  const txScore = Math.min(
    txCount * SCORING_WEIGHTS.transactionBase,
    SCORING_WEIGHTS.transactionCap,
  );
  breakdown.transactions = txScore;
  totalScore += txScore;

  const gasSpent = BigInt(txStats[0]?.totalGas ?? '0');
  const gasScore = Math.min(
    Number(gasSpent) * SCORING_WEIGHTS.gasMultiplier,
    SCORING_WEIGHTS.gasCap,
  );
  breakdown.gasSpending = gasScore;
  totalScore += gasScore;

  // 2. Token transfer metrics
  const tokenStats = await db
    .select({
      count: count(),
      uniqueTokens: sql<number>`COUNT(DISTINCT ${tokenTransfers.tokenAddress})`,
    })
    .from(tokenTransfers)
    .where(sql`${tokenTransfers.from} = ${addressLower} OR ${tokenTransfers.to} = ${addressLower}`);

  const tokenTransferCount = tokenStats[0]?.count ?? 0;
  const uniqueTokenCount = tokenStats[0]?.uniqueTokens ?? 0;

  const tokenScore = Math.min(
    tokenTransferCount * SCORING_WEIGHTS.tokenTransferBase +
      uniqueTokenCount * SCORING_WEIGHTS.uniqueTokenBonus,
    SCORING_WEIGHTS.tokenTransferCap,
  );
  breakdown.tokenTransfers = tokenScore;
  totalScore += tokenScore;

  // 3. Staking metrics
  const stakingStats = await db
    .select({
      count: count(),
      totalStaked: sum(stakingEvents.amount),
    })
    .from(stakingEvents)
    .where(eq(stakingEvents.staker, addressLower));

  const stakingEventCount = stakingStats[0]?.count ?? 0;
  const totalStaked = BigInt(stakingStats[0]?.totalStaked ?? '0');

  const stakingScore = Math.min(
    stakingEventCount * SCORING_WEIGHTS.stakingEventBase +
      Number(totalStaked / BigInt(10 ** 18)) * SCORING_WEIGHTS.stakingAmountMultiplier,
    SCORING_WEIGHTS.stakingCap,
  );
  breakdown.staking = stakingScore;
  totalScore += stakingScore;

  // 4. Governance metrics
  const govStats = await db
    .select({
      voteCount: sql<number>`COUNT(*) FILTER (WHERE ${governanceEvents.eventType} = 'voted')`,
      proposalCount: sql<number>`COUNT(*) FILTER (WHERE ${governanceEvents.eventType} = 'proposal_created')`,
    })
    .from(governanceEvents)
    .where(eq(governanceEvents.voter, addressLower));

  const voteCount = govStats[0]?.voteCount ?? 0;
  const proposalCount = govStats[0]?.proposalCount ?? 0;

  const govScore = Math.min(
    voteCount * SCORING_WEIGHTS.governanceVoteBase +
      proposalCount * SCORING_WEIGHTS.proposalCreationBonus,
    SCORING_WEIGHTS.governanceCap,
  );
  breakdown.governance = govScore;
  totalScore += govScore;

  // 5. Early adopter bonus
  const [addressRecord] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.address, addressLower));

  if (addressRecord && addressRecord.firstSeenBlock < SCORING_WEIGHTS.earlyBlockThreshold) {
    breakdown.earlyAdopter = SCORING_WEIGHTS.earlyAdopterBonus;
    totalScore += SCORING_WEIGHTS.earlyAdopterBonus;
  }

  // Determine tier and airdrop amount
  let tier = 0;
  let tierPercentage = 0;

  if (totalScore >= AIRDROP_TIERS.platinum.minScore) {
    tier = 4;
    tierPercentage = AIRDROP_TIERS.platinum.percentage;
  } else if (totalScore >= AIRDROP_TIERS.gold.minScore) {
    tier = 3;
    tierPercentage = AIRDROP_TIERS.gold.percentage;
  } else if (totalScore >= AIRDROP_TIERS.silver.minScore) {
    tier = 2;
    tierPercentage = AIRDROP_TIERS.silver.percentage;
  } else if (totalScore >= AIRDROP_TIERS.bronze.minScore) {
    tier = 1;
    tierPercentage = AIRDROP_TIERS.bronze.percentage;
  }

  // Calculate airdrop amount based on tier
  // This is a simplified calculation - actual implementation would consider
  // total eligible addresses and distribute proportionally
  const airdropAmount =
    tier > 0
      ? BigInt(Math.floor((Number(TOTAL_AIRDROP_POOL) * tierPercentage) / 10000))
      : BigInt(0);

  return {
    score: totalScore,
    breakdown,
    tier,
    airdropAmount,
  };
}

// ============================================
// Batch Processing
// ============================================

export async function calculateAllActivityScores(): Promise<{
  processed: number;
  eligible: number;
  totalAirdrop: bigint;
}> {
  console.log('📊 Calculating activity scores for all addresses...');

  // Get all addresses
  const allAddresses = await db.select({ address: addresses.address }).from(addresses);

  let processed = 0;
  let eligible = 0;
  let totalAirdrop = BigInt(0);

  for (const { address } of allAddresses) {
    const result = await calculateActivityScore(address);

    // Upsert activity summary
    await db
      .insert(addressActivitySummary)
      .values({
        address,
        totalTransactions: result.breakdown.transactions
          ? Math.floor(result.breakdown.transactions / SCORING_WEIGHTS.transactionBase)
          : 0,
        totalGasSpent: '0', // Would need to recalculate
        totalTokenTransfers: result.breakdown.tokenTransfers
          ? Math.floor(result.breakdown.tokenTransfers / SCORING_WEIGHTS.tokenTransferBase)
          : 0,
        uniqueTokensInteracted: 0,
        totalStakingEvents: result.breakdown.staking
          ? Math.floor(result.breakdown.staking / SCORING_WEIGHTS.stakingEventBase)
          : 0,
        totalStaked: '0',
        totalGovernanceVotes: result.breakdown.governance
          ? Math.floor(result.breakdown.governance / SCORING_WEIGHTS.governanceVoteBase)
          : 0,
        proposalsCreated: 0,
        activityScore: result.score.toFixed(4),
        airdropEligible: result.tier > 0,
        airdropAmount: result.airdropAmount.toString(),
        airdropTier: result.tier,
        calculatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: addressActivitySummary.address,
        set: {
          activityScore: result.score.toFixed(4),
          airdropEligible: result.tier > 0,
          airdropAmount: result.airdropAmount.toString(),
          airdropTier: result.tier,
          calculatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    processed++;
    if (result.tier > 0) {
      eligible++;
      totalAirdrop += result.airdropAmount;
    }

    if (processed % 100 === 0) {
      console.log(`  Processed ${processed}/${allAddresses.length} addresses...`);
    }
  }

  console.log(`✅ Activity calculation complete!`);
  console.log(`   Processed: ${processed} addresses`);
  console.log(`   Eligible: ${eligible} addresses`);
  console.log(`   Total Airdrop: ${totalAirdrop.toString()} wei`);

  return { processed, eligible, totalAirdrop };
}

// ============================================
// Query Functions
// ============================================

export async function getEligibleAddresses(tier?: number) {
  let query = db
    .select()
    .from(addressActivitySummary)
    .where(eq(addressActivitySummary.airdropEligible, true));

  if (tier !== undefined) {
    query = db
      .select()
      .from(addressActivitySummary)
      .where(
        sql`${addressActivitySummary.airdropEligible} = true AND ${addressActivitySummary.airdropTier} = ${tier}`,
      );
  }

  return query.orderBy(sql`${addressActivitySummary.activityScore} DESC`);
}

export async function getAirdropStats() {
  const stats = await db
    .select({
      totalEligible: sql<number>`COUNT(*) FILTER (WHERE ${addressActivitySummary.airdropEligible} = true)`,
      totalAirdrop: sql<string>`SUM(${addressActivitySummary.airdropAmount}::numeric) FILTER (WHERE ${addressActivitySummary.airdropEligible} = true)`,
      tier1Count: sql<number>`COUNT(*) FILTER (WHERE ${addressActivitySummary.airdropTier} = 1)`,
      tier2Count: sql<number>`COUNT(*) FILTER (WHERE ${addressActivitySummary.airdropTier} = 2)`,
      tier3Count: sql<number>`COUNT(*) FILTER (WHERE ${addressActivitySummary.airdropTier} = 3)`,
      tier4Count: sql<number>`COUNT(*) FILTER (WHERE ${addressActivitySummary.airdropTier} = 4)`,
      avgScore: sql<number>`AVG(${addressActivitySummary.activityScore}::numeric)`,
      maxScore: sql<number>`MAX(${addressActivitySummary.activityScore}::numeric)`,
    })
    .from(addressActivitySummary);

  return stats[0];
}
