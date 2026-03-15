'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';

interface NodeInfo {
  id: string;
  nodeType: 'validator' | 'worker' | 'rpc';
  nodeName: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'slashed';
  serverIp: string;
  walletAddress: string;
  uptime: number;
  stakeAmount: string;
  totalRewards: string;
  registeredAt: string;
  lastSeenAt: string | null;
}

interface NodeStats {
  total: number;
  byType: { validator: number; worker: number; rpc: number };
  byStatus: {
    pending: number;
    active: number;
    inactive: number;
    suspended: number;
    slashed: number;
  };
  totalStaked: string;
}

interface HealthCheck {
  id: string;
  isOnline: boolean;
  latencyMs: number;
  blockHeight: number;
  peerCount: number;
  checkedAt: string;
}

export default function NodeDashboardPage() {
  const { account } = useWeb3();
  const [myNode, setMyNode] = useState<NodeInfo | null>(null);
  const [stats, setStats] = useState<NodeStats | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API_URL}/api/nodes/stats/overview`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    fetchStats();
  }, [API_URL]);

  // Fetch my node (if connected)
  useEffect(() => {
    async function fetchMyNode() {
      if (!account) {
        setMyNode(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/nodes?wallet=${account}`);
        if (res.ok) {
          const data = await res.json();
          if (data.nodes && data.nodes.length > 0) {
            setMyNode(data.nodes[0]);
            // Fetch health history
            const healthRes = await fetch(
              `${API_URL}/api/nodes/${data.nodes[0].id}/health`
            );
            if (healthRes.ok) {
              const healthData = await healthRes.json();
              setHealthHistory(healthData.healthChecks || []);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch node:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyNode();
  }, [account, API_URL]);

  const formatAmount = (amount: string) => {
    const value = BigInt(amount);
    const formatted = Number(value / BigInt(10 ** 14)) / 10000;
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-tech-warning/20 text-tech-warning border-tech-warning/30',
    active: 'bg-tech-success/20 text-tech-success border-tech-success/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    suspended: 'bg-tech-warning/20 text-tech-warning border-tech-warning/30',
    slashed: 'bg-tech-error/20 text-tech-error border-tech-error/30',
  };

  const NODE_ICONS: Record<string, string> = {
    validator: '🛡️',
    worker: '⚙️',
    rpc: '📡',
  };

  return (
    <div className="min-h-screen">
      <main className="py-10 pb-16">
        <div className="container-custom">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-content mb-1">
                Node Dashboard
              </h1>
              <p className="text-muted text-sm">
                Manage and monitor your node status
              </p>
            </div>
            <Link
              href="/join"
              className="px-6 py-3 bg-tech-cyan/20 text-tech-cyan font-semibold rounded-lg hover:bg-tech-cyan/30 transition-colors"
            >
              Register New Node
            </Link>
          </div>

          {/* Network Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-10">
            <div className="card-panel p-4">
              <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                Total Nodes
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-content">
                {stats?.total || 0}
              </div>
            </div>
            <div className="card-panel p-4">
              <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                Active Validators
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-tech-success">
                {stats?.byStatus.active || 0}
              </div>
            </div>
            <div className="card-panel p-4">
              <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                Total Staked
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-content">
                {stats ? formatAmount(stats.totalStaked) : '0'}{' '}
                <span className="text-muted text-sm font-normal">AXX</span>
              </div>
            </div>
            <div className="card-panel p-4">
              <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                Pending Registration
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-tech-warning">
                {stats?.byStatus.pending || 0}
              </div>
            </div>
          </div>

          {/* My Node Section */}
          {!account ? (
            <div className="card-panel p-8 text-center mb-10">
              <div className="text-6xl mb-4 grayscale opacity-50">🔗</div>
              <h2 className="text-xl font-semibold text-content mb-2">
                Connect wallet to view your node
              </h2>
              <p className="text-muted mb-4">
                Connect the wallet used to register your node to view status and
                manage
              </p>
            </div>
          ) : loading ? (
            <div
              className="card-panel p-8 text-center mb-10"
              role="status"
              aria-live="polite"
            >
              <div className="loading-spinner w-12 h-12 mx-auto mb-4" />
              <p className="text-muted">Loading node data...</p>
            </div>
          ) : myNode ? (
            <div className="card-panel overflow-hidden mb-10">
              <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">
                      {NODE_ICONS[myNode.nodeType]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-content">
                        {myNode.nodeName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-3 py-1 rounded-full text-sm border ${STATUS_COLORS[myNode.status]}`}
                        >
                          {myNode.status.charAt(0).toUpperCase() +
                            myNode.status.slice(1)}
                        </span>
                        <span className="text-muted text-sm capitalize">
                          {myNode.nodeType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted text-xs font-semibold uppercase tracking-wider">
                      Uptime
                    </div>
                    <div
                      className={`text-2xl font-bold font-mono tabular-nums ${myNode.uptime >= 95 ? 'text-tech-success' : myNode.uptime >= 80 ? 'text-tech-warning' : 'text-tech-error'}`}
                    >
                      {myNode.uptime.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                      💰 Stake Amount
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-content">
                      {formatAmount(myNode.stakeAmount)}{' '}
                      <span className="text-muted text-sm font-normal">
                        AXX
                      </span>
                    </div>
                    {myNode.status === 'pending' && (
                      <Link
                        href={`/stake?node=${myNode.id}`}
                        className="text-sm text-tech-cyan hover:underline mt-2 inline-block"
                      >
                        → Stake tokens to activate
                      </Link>
                    )}
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                      Total Rewards
                    </div>
                    <div className="text-lg font-mono tabular-nums text-muted">
                      — <span className="text-muted text-sm font-normal">(Testnet)</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                      🌐 Server IP
                    </div>
                    <div className="text-lg font-mono text-content">
                      {myNode.serverIp}
                    </div>
                  </div>
                </div>

                {/* Health History Chart (simplified) */}
                {healthHistory.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="text-lg font-semibold text-content mb-4">
                      📈 Health History (Last 24h)
                    </h3>
                    <div className="flex items-end gap-1 h-20">
                      {healthHistory.slice(0, 48).map((check, i) => (
                        <div
                          key={check.id || i}
                          className={`flex-1 rounded-t ${check.isOnline ? 'bg-tech-success' : 'bg-tech-error'}`}
                          style={{
                            height: check.isOnline
                              ? `${Math.min(100, (1000 - check.latencyMs) / 10)}%`
                              : '10%',
                          }}
                          title={`${check.isOnline ? 'Online' : 'Offline'} - ${check.latencyMs}ms`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted mt-2">
                      <span>24h ago</span>
                      <span>Now</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-white/10 bg-white/[0.02]">
                <div className="flex flex-wrap gap-3">
                  {myNode.status === 'pending' && (
                    <Link
                      href={`/stake?node=${myNode.id}`}
                      className="px-4 py-2 bg-tech-warning hover:bg-tech-warning/80 text-black font-semibold rounded-lg transition-colors"
                    >
                      💰 Stake to Activate
                    </Link>
                  )}
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                    🔄 Refresh Status
                  </button>
                  <Link
                    href="/validators"
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                  >
                    View Leaderboard
                  </Link>
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                    📋 Copy Node Config
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-panel p-8 text-center mb-10">
              <div className="text-6xl mb-4 grayscale opacity-50">🔍</div>
              <h2 className="text-xl font-semibold text-content mb-2">
                No node registered yet
              </h2>
              <p className="text-muted mb-6">
                This wallet has no registered node
              </p>
              <Link
                href="/join"
                className="px-6 py-3 bg-tech-cyan hover:bg-tech-cyan-hover text-white font-semibold rounded-lg transition-colors inline-block shadow-glow"
              >
                Register Node
              </Link>
            </div>
          )}

          {/* Node Type Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="card-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">🛡️</div>
                <div>
                  <h3 className="text-xl font-bold text-content">Validators</h3>
                  <p className="text-muted text-sm">Block producers</p>
                </div>
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-content mb-1">
                {stats?.byType.validator || 0}
              </div>
              <div className="text-sm text-muted">
                Stake required: 10,000 AXX
              </div>
            </div>

            <div className="card-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">⚙️</div>
                <div>
                  <h3 className="text-xl font-bold text-content">Workers</h3>
                  <p className="text-muted text-sm">Computation nodes</p>
                </div>
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-tech-cyan mb-1">
                {stats?.byType.worker || 0}
              </div>
              <div className="text-sm text-muted">
                Stake required: 1,000 AXX
              </div>
            </div>

            <div className="card-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">📡</div>
                <div>
                  <h3 className="text-xl font-bold text-content">RPC Nodes</h3>
                  <p className="text-muted text-sm">API providers</p>
                </div>
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-content mb-1">
                {stats?.byType.rpc || 0}
              </div>
              <div className="text-sm text-muted">No stake required</div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-lg border border-tech-cyan/20 bg-tech-cyan/5 p-6">
            <h3 className="text-lg font-semibold text-tech-cyan mb-4">
              Resources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link
                href="/docs"
                className="p-4 rounded-lg border border-white/10 bg-black/50 hover:bg-white/5 transition-colors"
              >
                <div className="text-2xl mb-2">📖</div>
                <div className="text-content font-medium">Documentation</div>
                <div className="text-muted text-sm">
                  Setup guides & tutorials
                </div>
              </Link>
              <Link
                href="/validators"
                className="p-4 rounded-lg border border-white/10 bg-black/50 hover:bg-white/5 transition-colors"
              >
                <div className="text-2xl mb-2">🏆</div>
                <div className="text-content font-medium">Leaderboard</div>
                <div className="text-muted text-sm">Top validators</div>
              </Link>
              <Link
                href="/faucet"
                className="p-4 rounded-lg border border-white/10 bg-black/50 hover:bg-white/5 transition-colors"
              >
                <div className="text-2xl mb-2" aria-hidden />
                <div className="text-content font-medium">Faucet</div>
                <div className="text-muted text-sm">Get testnet tokens</div>
              </Link>
              <a
                href="https://discord.gg/axionax"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border border-white/10 bg-black/50 hover:bg-white/5 transition-colors"
              >
                <div className="text-2xl mb-2">💬</div>
                <div className="text-content font-medium">Discord</div>
                <div className="text-muted text-sm">Community support</div>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
