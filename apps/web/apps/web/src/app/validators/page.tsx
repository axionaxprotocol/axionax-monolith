'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleDot, CircleOff, Loader2, RefreshCw, Server } from 'lucide-react';

interface ValidatorInfo {
  name: string;
  location: string;
  ip: string;
  rpcUrl: string;
  status: 'online' | 'offline' | 'syncing';
  blockHeight: number;
  latency: number;
  uptime: string;
  isLeader?: boolean;
}

const VALIDATORS: Omit<ValidatorInfo, 'status' | 'blockHeight' | 'latency'>[] =
  [
    {
      name: 'AU Validator AU',
      location: 'Asia-Pacific (Australia)',
      ip: '46.250.***.***',
      rpcUrl: '/api/rpc/au',
      uptime: '99.8%',
    },
    {
      name: 'NL Validator EU',
      location: 'Europe (Netherlands)',
      ip: '217.76.***.***',
      rpcUrl: '/api/rpc/eu',
      uptime: '99.9%',
    },
  ];

const checkValidator = async (
  rpcUrl: string
): Promise<{
  status: 'online' | 'offline' | 'syncing';
  blockHeight: number;
  latency: number;
}> => {
  const start = Date.now();
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    const data = await response.json();
    const blockHeight = parseInt(data.result, 16);

    return { status: 'online', blockHeight, latency };
  } catch {
    return { status: 'offline', blockHeight: 0, latency: 0 };
  }
};

const fetchAllValidators = async (): Promise<ValidatorInfo[]> => {
  const results = await Promise.all(
    VALIDATORS.map(async (v) => {
      const { status, blockHeight, latency } = await checkValidator(v.rpcUrl);
      return { ...v, status, blockHeight, latency };
    })
  );
  // Sort by block height, highest first (leader)
  const sorted = results.sort((a, b) => b.blockHeight - a.blockHeight);
  if (sorted.length > 0) sorted[0].isLeader = true;
  return sorted;
};

// Stat Card Component (Phase 3: panel style)
function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon?: React.ReactNode | null;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black-hole/90 backdrop-blur-sm shadow-panel p-4 sm:p-5 flex items-center gap-4">
      {icon != null && <div className="text-2xl text-muted">{icon}</div>}
      <div className="min-w-0">
        <div className="text-muted text-xs font-semibold uppercase tracking-wider">
          {label}
        </div>
        <div className="text-content text-xl sm:text-2xl font-bold font-mono tabular-nums mt-0.5">
          {value}
        </div>
        {sublabel && (
          <div className="text-muted text-xs mt-0.5">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

// Status Badge Component (Phase 4: icon + color + text)
function StatusBadge({ status }: { status: 'online' | 'offline' | 'syncing' }) {
  const styles = {
    online: 'bg-tech-success/20 text-tech-success border-tech-success/30',
    offline: 'bg-tech-error/20 text-tech-error border-tech-error/30',
    syncing: 'bg-tech-warning/20 text-tech-warning border-tech-warning/30',
  };
  const Icon =
    status === 'online'
      ? CircleDot
      : status === 'syncing'
        ? Loader2
        : CircleOff;

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${styles[status]} ${status === 'syncing' ? '[&_svg]:animate-spin' : ''}`}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Leader Badge Component (Phase 4: Lucide icon)
function LeaderBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-tech-cyan/20 text-tech-cyan border border-tech-cyan/30 rounded text-xs font-medium">
      <Server className="w-3.5 h-3.5" strokeWidth={2} />
      Leader
    </span>
  );
}

export default function ValidatorsPage(): React.JSX.Element {
  const {
    data: validators,
    isLoading,
    refetch,
  } = useQuery<ValidatorInfo[]>({
    queryKey: ['validators'],
    queryFn: fetchAllValidators,
    refetchInterval: 10000,
  });

  const onlineCount =
    validators?.filter((v) => v.status === 'online').length || 0;
  const totalCount = validators?.length || VALIDATORS.length;
  const avgLatency = Math.round(
    (validators
      ?.filter((v) => v.status === 'online')
      .reduce((acc, v) => acc + v.latency, 0) || 0) / (onlineCount || 1)
  );
  const highestBlock = validators?.[0]?.blockHeight || 0;

  return (
    <div className="min-h-screen">
      <main className="container-custom py-10">
        {/* Network Status Header */}
        <h1 className="text-3xl font-bold text-content mb-2">Network Status</h1>
        <p className="text-muted text-sm mb-8">
          Live validator and block metrics
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <StatCard
            icon={null}
            label="Online Validators"
            value={`${onlineCount}/${totalCount}`}
          />
          <StatCard
            icon={null}
            label="Highest Block"
            value={`#${highestBlock.toLocaleString()}`}
          />
          <StatCard icon={null} label="Avg Latency" value={`${avgLatency}ms`} />
          <StatCard
            icon={null}
            label="Network"
            value="Testnet v1.9.0"
            sublabel="Chain ID: 86137"
          />
        </div>

        {/* Validators Section */}
        <div className="rounded-lg border border-white/10 bg-black-hole/90 backdrop-blur-sm shadow-panel overflow-hidden mb-10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-4">
            <h2 className="text-lg font-semibold text-content flex items-center gap-2">
              <Server
                className="w-5 h-5 text-tech-cyan shrink-0"
                strokeWidth={2}
              />
              Validators
            </h2>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-tech-cyan hover:bg-tech-cyan/10 rounded-lg transition-colors duration-200"
              aria-label="Refresh validators"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={2} />
              Refresh
            </button>
          </div>

          {/* Validator List */}
          <div className="divide-y divide-white/5">
            {isLoading ? (
              <div
                className="p-8 text-center text-muted"
                role="status"
                aria-live="polite"
              >
                <Loader2
                  className="w-8 h-8 animate-spin mx-auto mb-2 text-tech-cyan"
                  strokeWidth={2}
                  aria-hidden
                />
                <p>Loading validators...</p>
              </div>
            ) : (
              validators?.map((validator) => (
                <div
                  key={validator.ip}
                  className="px-4 py-4 sm:px-6 sm:py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Validator Info */}
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-content">
                            {validator.name}
                          </span>
                          {validator.isLeader && <LeaderBadge />}
                        </div>
                        <div className="text-muted text-sm">
                          {validator.location}
                        </div>
                      </div>
                    </div>

                    {/* Status & Stats */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                      <StatusBadge status={validator.status} />

                      <div>
                        <span className="text-muted">Block: </span>
                        <span className="text-content font-mono tabular-nums">
                          #{validator.blockHeight.toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted">Latency: </span>
                        <span
                          className={`font-mono tabular-nums ${
                            validator.latency < 200
                              ? 'text-tech-success'
                              : validator.latency < 500
                                ? 'text-tech-warning'
                                : 'text-tech-error'
                          }`}
                        >
                          {validator.status === 'online'
                            ? `${validator.latency}ms`
                            : '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted">Uptime: </span>
                        <span className="text-tech-success font-mono tabular-nums">
                          {validator.uptime}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted">RPC: </span>
                        <span className="text-content font-mono text-xs">
                          {validator.ip}:8545
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Join Section */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <h3 className="font-semibold text-content mb-2">
            📡 Want to become a validator?
          </h3>
          <p className="text-muted text-sm mb-4 max-w-xl">
            Join the Axionax testnet as a Validator, Worker, or RPC Node! Earn
            rewards for securing the network and processing transactions.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/join"
              className="px-6 py-3 bg-tech-cyan/20 text-tech-cyan font-semibold rounded-lg hover:bg-tech-cyan/30 transition-colors"
            >
              Join Network
            </a>
            <a
              href="/docs"
              className="px-6 py-3 border border-white/20 text-content hover:bg-white/5 rounded-lg transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
