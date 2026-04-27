'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';

interface ActivityScore {
  score: number;
  breakdown: Record<string, number>;
  tier: number;
  airdropAmount: string;
}

interface IndexerStats {
  lastIndexedBlock: number;
  lastIndexedAt: string | null;
  isRunning: boolean;
  status: string;
  stats: {
    blocks: number;
    transactions: number;
    addresses: number;
    tokenTransfers: number;
  };
}

const TIER_NAMES = [
  'Not eligible',
  'Bronze 🥉',
  'Silver 🥈',
  'Gold 🥇',
  'Platinum 💎',
];
const TIER_COLORS = [
  'text-dark-400',
  'text-amber-600',
  'text-gray-400',
  'text-yellow-400',
  'text-cyan-400',
];

export default function AirdropPage() {
  const { account } = useWeb3();
  const [activityScore, setActivityScore] = useState<ActivityScore | null>(
    null
  );
  const [indexerStats, setIndexerStats] = useState<IndexerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch indexer stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API_URL}/api/indexer/status`);
        if (res.ok) {
          const data = await res.json();
          setIndexerStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch indexer stats:', err);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [API_URL]);

  // Fetch activity score when account changes
  useEffect(() => {
    async function fetchScore() {
      if (!account) {
        setActivityScore(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_URL}/api/activity/score/${account}`);
        if (res.ok) {
          const data = await res.json();
          setActivityScore(data);
        } else {
          setError('Failed to fetch data');
        }
      } catch (err) {
        console.error('Failed to fetch activity score:', err);
        setError('API unavailable — please try again later');
      } finally {
        setLoading(false);
      }
    }
    fetchScore();
  }, [account, API_URL]);

  const formatAmount = (amount: string) => {
    const value = BigInt(amount);
    const formatted = Number(value / BigInt(10 ** 14)) / 10000;
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  return (
    <div className="min-h-screen">
      <div className="container-custom py-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-content mb-4">
            Testnet Activity & Airdrop
          </h1>
          <p className="text-lg text-muted max-w-3xl mx-auto">
            Check your Testnet activity score and airdrop eligibility for
            Mainnet
          </p>
        </div>

        {/* Indexer Status */}
        <div className="card-panel mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-content flex items-center gap-2">
              Testnet Indexer Status
              {indexerStats?.isRunning && (
                <span className="w-2 h-2 bg-tech-success rounded-full animate-pulse" />
              )}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                indexerStats?.status === 'running'
                  ? 'bg-tech-success/20 text-tech-success'
                  : 'bg-tech-warning/20 text-tech-warning'
              }`}
            >
              {indexerStats?.status || 'Unknown'}
            </span>
          </div>

          {indexerStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                <div className="text-2xl font-bold text-content font-mono">
                  {indexerStats.stats.blocks.toLocaleString()}
                </div>
                <div className="text-sm text-muted">Blocks Indexed</div>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                <div className="text-2xl font-bold text-content font-mono">
                  {indexerStats.stats.transactions.toLocaleString()}
                </div>
                <div className="text-sm text-muted">Transactions</div>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                <div className="text-2xl font-bold text-content font-mono">
                  {indexerStats.stats.addresses.toLocaleString()}
                </div>
                <div className="text-sm text-muted">Unique Addresses</div>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                <div className="text-2xl font-bold text-content font-mono">
                  {indexerStats.stats.tokenTransfers.toLocaleString()}
                </div>
                <div className="text-sm text-muted">Token Transfers</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted py-8">
              <div className="animate-pulse">Loading...</div>
            </div>
          )}
        </div>

        {/* Activity Score Card */}
        <div className="card-panel overflow-hidden mb-8">
          {/* Card Header */}
          <div className="bg-tech-cyan/10 px-6 py-4 border-b border-tech-cyan/20">
            <h2 className="text-lg font-semibold text-tech-cyan">
              🏆 Your Activity Score
            </h2>
          </div>

          <div className="p-6">
            {!account ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 grayscale opacity-50">🔗</div>
                <h3 className="text-xl font-semibold text-content mb-2">
                  Connect wallet to view score
                </h3>
                <p className="text-muted mb-6">
                  Connect your wallet to check activity score and eligibility
                  Airdrop
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="loading-spinner w-12 h-12 mx-auto mb-4" />
                <p className="text-muted">Calculating score...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-content mb-2">
                  Failed to fetch data
                </h3>
                <p className="text-tech-error">{error}</p>
                <p className="text-sm text-muted mt-4">
                  Note: API may be unavailable or this address has no data yet
                </p>
              </div>
            ) : activityScore ? (
              <div className="space-y-6">
                {/* Score Display */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <div className="text-5xl md:text-6xl font-bold text-content mb-2 font-mono">
                      {activityScore.score.toLocaleString()}
                    </div>
                    <div className="text-muted">Activity Points</div>
                  </div>

                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${TIER_COLORS[activityScore.tier]}`}
                    >
                      {TIER_NAMES[activityScore.tier]}
                    </div>
                    <div className="text-muted mt-1">Airdrop Tier</div>
                  </div>

                  <div className="text-center md:text-right">
                    <div className="text-3xl font-bold text-tech-success font-mono">
                      {formatAmount(activityScore.airdropAmount)}{' '}
                      <span className="text-lg">AXX</span>
                    </div>
                    <div className="text-muted">Estimated Airdrop</div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="bg-black-hole/50 border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-content mb-4">
                    Score Breakdown
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(activityScore.breakdown).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between items-center bg-white/[0.02] rounded-lg p-3 border border-white/5"
                        >
                          <span className="text-muted capitalize text-sm">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-content font-mono font-semibold">
                            +{value.toLocaleString()}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* How to Earn More */}
                <div className="bg-tech-warning/5 border border-tech-warning/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-tech-warning mb-3">
                    How to earn more score?
                  </h3>
                  <ul className="space-y-2 text-muted text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-tech-success">✓</span>
                      Send transactions on Testnet
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-tech-success">✓</span>
                      Transfer AXX tokens
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-tech-success">✓</span>
                      Stake tokens with Validators
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-tech-success">✓</span>
                      Participate in governance voting
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-tech-success">✓</span>
                      Be an early adopter (lower block = higher score!)
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 grayscale opacity-50">🔍</div>
                <h3 className="text-xl font-semibold text-content mb-2">
                  No activity data yet
                </h3>
                <p className="text-muted">
                  Use Testnet to earn score and airdrop eligibility!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tier Explanation */}
        <div className="card-panel p-6 mb-8">
          <h2 className="text-xl font-semibold text-content mb-6">
            🎯 Airdrop Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-amber-900/10 border border-amber-600/20 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🥉</div>
              <div className="text-amber-600 font-bold">Bronze</div>
              <div className="text-sm text-muted mt-1">100+ points</div>
              <div className="text-xs text-muted/60 mt-2">0.1% of pool</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🥈</div>
              <div className="text-gray-400 font-bold">Silver</div>
              <div className="text-sm text-muted mt-1">500+ points</div>
              <div className="text-xs text-muted/60 mt-2">0.5% of pool</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🥇</div>
              <div className="text-yellow-400 font-bold">Gold</div>
              <div className="text-sm text-muted mt-1">1,000+ points</div>
              <div className="text-xs text-muted/60 mt-2">1% of pool</div>
            </div>
            <div className="bg-tech-cyan/10 border border-tech-cyan/20 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">💎</div>
              <div className="text-tech-cyan font-bold">Platinum</div>
              <div className="text-sm text-muted mt-1">5,000+ points</div>
              <div className="text-xs text-muted/60 mt-2">5% of pool</div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-tech-cyan/5 border border-tech-cyan/20 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">ℹ️</div>
            <div>
              <h3 className="text-lg font-semibold text-tech-cyan mb-2">
                ข้อมูลสำคัญ
              </h3>
              <ul className="text-muted space-y-1 text-sm">
                <li>
                  • Score is calculated from all Testnet activity before Mainnet
                  launch
                </li>
                <li>
                  • Snapshot will be created before Mainnet and included in
                  Genesis Block
                </li>
                <li>
                  • Token บน Testnet (AXXt) ไม่มีมูลค่าจริง -
                  ใช้สำหรับทดสอบเท่านั้น
                </li>
                <li>
                  • Airdrop amount is an estimate — final amount may vary based
                  on eligible addresses
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
