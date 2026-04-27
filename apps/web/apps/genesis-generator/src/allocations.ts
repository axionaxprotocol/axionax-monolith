/**
 * Allocation Calculator
 *
 * Calculates token allocations for mainnet genesis based on
 * testnet activity and predefined distribution rules.
 */

export interface AllocationConfig {
  // Total tokens for airdrop (in wei)
  totalAirdropPool: bigint;

  // Tier configuration
  tiers: {
    bronze: { minScore: number; share: number };
    silver: { minScore: number; share: number };
    gold: { minScore: number; share: number };
    platinum: { minScore: number; share: number };
  };

  // Minimum score to be eligible
  minEligibleScore: number;

  // Maximum allocation per address (anti-whale)
  maxAllocationPerAddress?: bigint;
}

export interface AddressScore {
  address: string;
  score: number;
  breakdown?: Record<string, number>;
}

export interface Allocation {
  address: string;
  amount: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  score: number;
  percentage: number;
}

export interface AllocationResult {
  allocations: Allocation[];
  totalAllocated: bigint;
  tierCounts: Record<string, number>;
  statistics: {
    totalEligible: number;
    averageAllocation: bigint;
    medianAllocation: bigint;
    minAllocation: bigint;
    maxAllocation: bigint;
  };
}

/**
 * Default allocation configuration
 */
export const DEFAULT_CONFIG: AllocationConfig = {
  totalAirdropPool: BigInt('50000000000000000000000000000'), // 50B AXX
  tiers: {
    bronze: { minScore: 100, share: 0.1 }, // 10% of pool
    silver: { minScore: 500, share: 0.2 }, // 20% of pool
    gold: { minScore: 1000, share: 0.3 }, // 30% of pool
    platinum: { minScore: 5000, share: 0.4 }, // 40% of pool
  },
  minEligibleScore: 100,
};

/**
 * Determine tier based on score
 */
function getTier(
  score: number,
  config: AllocationConfig,
): 'bronze' | 'silver' | 'gold' | 'platinum' | null {
  if (score >= config.tiers.platinum.minScore) return 'platinum';
  if (score >= config.tiers.gold.minScore) return 'gold';
  if (score >= config.tiers.silver.minScore) return 'silver';
  if (score >= config.tiers.bronze.minScore) return 'bronze';
  return null;
}

/**
 * Calculate allocations based on scores and configuration
 */
export function calculateAllocations(
  scores: AddressScore[],
  config: AllocationConfig = DEFAULT_CONFIG,
): AllocationResult {
  // Filter eligible addresses and determine tiers
  const eligible = scores
    .filter((s) => s.score >= config.minEligibleScore)
    .map((s) => ({
      ...s,
      tier: getTier(s.score, config)!,
    }))
    .filter((s) => s.tier !== null);

  // Group by tier
  const tierGroups: Record<string, typeof eligible> = {
    bronze: [],
    silver: [],
    gold: [],
    platinum: [],
  };

  for (const addr of eligible) {
    tierGroups[addr.tier].push(addr);
  }

  // Calculate tier pools
  const tierPools: Record<string, bigint> = {
    bronze: BigInt(Math.floor(Number(config.totalAirdropPool) * config.tiers.bronze.share)),
    silver: BigInt(Math.floor(Number(config.totalAirdropPool) * config.tiers.silver.share)),
    gold: BigInt(Math.floor(Number(config.totalAirdropPool) * config.tiers.gold.share)),
    platinum: BigInt(Math.floor(Number(config.totalAirdropPool) * config.tiers.platinum.share)),
  };

  // Calculate allocations within each tier (proportional to score)
  const allocations: Allocation[] = [];

  for (const [tier, members] of Object.entries(tierGroups)) {
    if (members.length === 0) continue;

    const pool = tierPools[tier];
    const totalTierScore = members.reduce((sum, m) => sum + m.score, 0);

    for (const member of members) {
      const scoreShare = member.score / totalTierScore;
      let amount = BigInt(Math.floor(Number(pool) * scoreShare));

      // Apply max cap if configured
      if (config.maxAllocationPerAddress && amount > config.maxAllocationPerAddress) {
        amount = config.maxAllocationPerAddress;
      }

      allocations.push({
        address: member.address,
        amount: amount.toString(),
        tier: tier as 'bronze' | 'silver' | 'gold' | 'platinum',
        score: member.score,
        percentage: scoreShare * 100,
      });
    }
  }

  // Calculate statistics
  const amounts = allocations.map((a) => BigInt(a.amount));
  const totalAllocated = amounts.reduce((sum, a) => sum + a, BigInt(0));

  amounts.sort((a, b) => Number(a - b));
  const medianIndex = Math.floor(amounts.length / 2);

  const statistics = {
    totalEligible: allocations.length,
    averageAllocation:
      allocations.length > 0 ? totalAllocated / BigInt(allocations.length) : BigInt(0),
    medianAllocation: amounts.length > 0 ? amounts[medianIndex] : BigInt(0),
    minAllocation: amounts.length > 0 ? amounts[0] : BigInt(0),
    maxAllocation: amounts.length > 0 ? amounts[amounts.length - 1] : BigInt(0),
  };

  return {
    allocations,
    totalAllocated,
    tierCounts: {
      bronze: tierGroups.bronze.length,
      silver: tierGroups.silver.length,
      gold: tierGroups.gold.length,
      platinum: tierGroups.platinum.length,
    },
    statistics,
  };
}

/**
 * Format allocation amount for display
 */
export function formatAllocation(amount: string | bigint, decimals: number = 18): string {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === BigInt(0)) {
    return whole.toLocaleString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole.toLocaleString()}.${fractionStr}`;
}

/**
 * Generate CSV export of allocations
 */
export function exportAllocationsCSV(allocations: Allocation[]): string {
  const header = 'address,amount,tier,score,percentage';
  const rows = allocations.map(
    (a) => `${a.address},${a.amount},${a.tier},${a.score},${a.percentage.toFixed(6)}`,
  );
  return [header, ...rows].join('\n');
}
