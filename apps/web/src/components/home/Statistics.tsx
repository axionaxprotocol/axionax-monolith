'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MockBadge from '@/components/ui/MockBadge';

interface LiveStats {
  blocks: number;
  services: number;
  uptime: number;
  deployment: number;
  validators: number;
  nodes?: {
    eu: boolean;
    au: boolean;
  };
}

interface StatsApiResponse {
  blockNumber: number;
  services: {
    healthy: number;
  };
  uptime: {
    hours: number;
  };
  deployment: number;
  validators: {
    online: number;
  };
  nodes?: {
    eu: boolean;
    au: boolean;
  };
  isMock?: boolean;
}

// Fetch real-time stats from Server API
const fetchStats = async (): Promise<LiveStats & { isMock?: boolean }> => {
  const response = await fetch('/api/stats');
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  const data = (await response.json()) as StatsApiResponse;

  return {
    blocks: data.blockNumber,
    services: data.services.healthy,
    uptime: data.uptime.hours,
    deployment: data.deployment,
    validators: data.validators.online,
    nodes: data.nodes,
    isMock: data.isMock ?? false,
  };
};

// Statistics component - Live metrics from testnet
export default function Statistics(): React.JSX.Element {
  const { data: stats, isLoading } = useQuery<LiveStats & { isMock?: boolean }>(
    {
      queryKey: ['live-stats'],
      queryFn: fetchStats,
      refetchInterval: 2000,
      initialData: {
        blocks: 0,
        services: 9,
        uptime: 48,
        deployment: 100,
        validators: 2,
        nodes: { eu: false, au: false },
        isMock: true,
      },
    }
  );

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const statItems = [
    {
      label: 'Live Block Height',
      value: isLoading ? '...' : formatNumber(stats.blocks),
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      subtitle: 'From Validators (5s blocks)',
    },
    {
      label: 'Active Validators',
      value: isLoading ? '...' : `${stats.validators}/2`,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      ),
      subtitle: 'EU + AU regions',
    },
    {
      label: 'Services Operational',
      value: `${stats.services}/9`,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      subtitle: 'Infrastructure 100%',
    },
    {
      label: 'Infrastructure Uptime',
      value: isLoading
        ? '...'
        : stats.uptime > 0
          ? stats.uptime >= 24
            ? `${Math.floor(stats.uptime / 24)}d+`
            : `${stats.uptime}h+`
          : '—',
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      subtitle: stats.uptime > 0 ? 'Explorer API uptime' : 'Testnet',
    },
    {
      label: 'Testnet Deployment',
      value: `${stats.deployment}%`,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      subtitle: 'Protocol v1.9.0 Active',
    },
  ];

  return (
    <section className="section bg-black-hole/20 border-y border-white/5">
      <div className="container-custom">
        <div className="section-heading mb-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-content">
              Live Testnet Metrics
            </h2>
            <MockBadge show={stats.isMock ?? false} label="Stats" />
          </div>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Real-time status from our global infrastructure
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((stat, index) => (
            <div
              key={stat.label}
              className="relative p-6 rounded-lg border border-white/10 bg-black-hole/60 hover:border-tech-cyan/30 transition-all duration-300 text-center animate-fade-in-up group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-center mb-4 text-tech-cyan group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-content mb-2 font-mono">
                {stat.value}
              </div>
              <div className="text-muted text-sm font-medium mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-muted/60">{stat.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Service Status Bar */}
        <div className="mt-12 p-6 rounded-lg bg-black-hole/60 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content">
              Service Health
            </h3>
            <span
              className={`text-sm font-medium ${stats.services === 9 ? 'text-tech-success' : 'text-tech-warning'}`}
            >
              {stats.services === 9
                ? '✅ All systems operational'
                : '⚠️ Systems degraded'}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className={`${stats.services === 9 ? 'bg-tech-success' : 'bg-tech-warning'} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${(stats.services / 9) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-muted whitespace-nowrap font-mono">
                {Math.round((stats.services / 9) * 100)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                'RPC',
                'PostgreSQL',
                'Redis',
                'Nginx/SSL',
                'Grafana',
                'Prometheus',
                'Web',
                'Explorer API',
                'Faucet API',
              ].map((svc, idx) => {
                const isHealthy = idx < stats.services;
                return (
                <span
                  key={svc}
                  className={`px-2 py-1 rounded border ${
                    isHealthy
                      ? 'bg-tech-success/10 text-tech-success border-tech-success/20'
                      : 'bg-tech-warning/10 text-tech-warning border-tech-warning/20'
                  }`}
                >
                  {isHealthy ? '✅' : '⚠️'} {svc}
                </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Validator Nodes Status */}
        <div className="mt-6 p-6 rounded-lg bg-black-hole/60 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content">
              Validator Nodes
            </h3>
            <span
              className={`text-sm font-medium ${stats.validators === 2 ? 'text-tech-success' : 'text-tech-warning'}`}
            >
              {stats.validators === 2 ? '✅' : '⚠️'} {stats.validators}/2 nodes
              online
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-content">
                  🇪🇺 Validator EU
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded border ${stats.nodes?.eu ? 'bg-tech-success/10 text-tech-success border-tech-success/20' : 'bg-tech-error/10 text-tech-error border-tech-error/20'}`}
                >
                  {stats.nodes?.eu ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="text-xs text-muted space-y-1 font-mono">
                <div>IP: 217.76.***.***</div>
                <div>RPC: 8545</div>
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-content">
                  🇦🇺 Validator AU
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded border ${stats.nodes?.au ? 'bg-tech-success/10 text-tech-success border-tech-success/20' : 'bg-tech-error/10 text-tech-error border-tech-error/20'}`}
                >
                  {stats.nodes?.au ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="text-xs text-muted space-y-1 font-mono">
                <div>IP: 46.250.***.***</div>
                <div>RPC: 8545</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
