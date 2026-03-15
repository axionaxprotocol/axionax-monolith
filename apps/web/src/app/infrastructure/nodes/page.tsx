'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  HardDrive,
  Wifi,
  RefreshCw,
  Server,
  Info,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface NodeHealth {
  status: 'healthy' | 'starting' | 'unhealthy' | 'offline';
  block_height: number;
  peers: number;
  sync_status: string;
  latencyMs: number;
}

const NODES = [
  {
    id: 'eu',
    name: 'EU Validator',
    ip: '217.76.61.116',
    rpcUrl: '/api/rpc/eu',
  },
  { id: 'au', name: 'AU Validator', ip: '46.250.244.4', rpcUrl: '/api/rpc/au' },
];

export default function NodesHealthPage(): React.JSX.Element {
  const [healthData, setHealthData] = useState<Record<string, NodeHealth>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = async (): Promise<void> => {
    setIsRefreshing(true);
    const newData: Record<string, NodeHealth> = {};

    await Promise.all(
      NODES.map(async (node) => {
        const start = Date.now();
        try {
          const res = await fetch(node.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'system_health',
              params: [],
              id: 1,
            }),
            signal: AbortSignal.timeout(5000),
          });

          const latencyMs = Date.now() - start;

          if (res.ok) {
            const data = (await res.json()) as {
              result?: {
                status?: 'healthy' | 'starting' | 'unhealthy' | 'offline';
                block_height?: number;
                peers?: number;
                sync_status?: string;
              };
            };
            if (data.result) {
              newData[node.id] = {
                status: data.result.status || 'unhealthy',
                block_height: data.result.block_height || 0,
                peers: data.result.peers || 0,
                sync_status: data.result.sync_status || 'unknown',
                latencyMs,
              };
              return;
            }
          }

          // Fallback if system_health not supported yet
          newData[node.id] = {
            status: 'offline',
            block_height: 0,
            peers: 0,
            sync_status: 'unreachable',
            latencyMs,
          };
        } catch {
          newData[node.id] = {
            status: 'offline',
            block_height: 0,
            peers: 0,
            sync_status: 'error',
            latencyMs: Date.now() - start,
          };
        }
      })
    );

    setHealthData(newData);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    void fetchHealth();
    const interval = setInterval(() => {
      void fetchHealth();
    }, 15000);
    return (): void => {
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = (status: string): string => {
    if (status === 'healthy')
      return 'text-tech-success bg-tech-success/10 border-tech-success/20';
    if (status === 'starting')
      return 'text-tech-cyan bg-tech-cyan/10 border-tech-cyan/20';
    if (status === 'unhealthy')
      return 'text-tech-warning bg-tech-warning/10 border-tech-warning/20';
    return 'text-tech-error bg-tech-error/10 border-tech-error/20';
  };

  const getStatusIcon = (status: string): React.JSX.Element => {
    if (status === 'healthy')
      return <CheckCircle2 className="w-5 h-5 text-tech-success" />;
    if (status === 'starting')
      return <Activity className="w-5 h-5 text-tech-cyan animate-pulse" />;
    if (status === 'unhealthy')
      return <AlertTriangle className="w-5 h-5 text-tech-warning" />;
    return <AlertTriangle className="w-5 h-5 text-tech-error" />;
  };

  return (
    <div className="min-h-screen pb-20">
      <main className="section pt-8">
        <div className="container-custom">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="gradient-text text-3xl md:text-4xl font-bold mb-2">
                Validator Health Check
              </h1>
              <p className="text-muted">
                Detailed real-time diagnostics for Axionax Core Validators
              </p>
            </div>

            <button
              onClick={() => {
                void fetchHealth();
              }}
              disabled={isRefreshing}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Checking...' : 'Refresh'}
            </button>
          </div>

          {/* Info Banner */}
          <div className="mb-8 p-4 bg-tech-cyan/5 border border-tech-cyan/20 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-tech-cyan shrink-0 mt-0.5" />
            <div className="text-sm text-content">
              <strong className="block text-tech-cyan mb-1">
                PoPC Node Diagnostics
              </strong>
              This dashboard queries the{' '}
              <code className="text-xs bg-black/30 px-1 py-0.5 rounded">
                system_health
              </code>{' '}
              RPC method directly from the validator nodes. Values like block
              height and peers indicate whether the node has successfully joined
              the network and synced the state.
            </div>
          </div>

          {/* Node Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {NODES.map((node) => {
              const data = healthData[node.id];
              const isLoaded = !!data;

              return (
                <div key={node.id} className="card-panel p-6">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <Server className="w-6 h-6 text-content" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-content">
                          {node.name}
                        </h2>
                        <code className="text-xs text-muted font-mono">
                          {node.ip}:8545
                        </code>
                      </div>
                    </div>
                    {isLoaded && (
                      <div
                        className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-semibold capitalize ${getStatusColor(data.status)}`}
                      >
                        {getStatusIcon(data.status)}
                        {data.status}
                      </div>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-muted text-sm mb-2">
                        <HardDrive className="w-4 h-4" />
                        <span>Block Height</span>
                      </div>
                      <div className="text-2xl font-mono font-bold text-amber-400">
                        {isLoaded ? data.block_height.toLocaleString() : '---'}
                      </div>
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-muted text-sm mb-2">
                        <Activity className="w-4 h-4" />
                        <span>Peers</span>
                      </div>
                      <div className="text-2xl font-mono font-bold text-secondary-400">
                        {isLoaded ? data.peers : '---'}
                      </div>
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-muted text-sm mb-2">
                        <Wifi className="w-4 h-4" />
                        <span>Latency</span>
                      </div>
                      <div className="text-2xl font-mono font-bold text-tech-cyan">
                        {isLoaded ? `${data.latencyMs}ms` : '---'}
                      </div>
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-muted text-sm mb-2">
                        <Shield className="w-4 h-4" />
                        <span>Sync Status</span>
                      </div>
                      <div className="text-lg font-mono font-bold text-content capitalize">
                        {isLoaded ? data.sync_status : '---'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center text-muted text-sm">
            {lastUpdated
              ? `Last checked: ${lastUpdated.toLocaleTimeString()}`
              : 'Initializing...'}
          </div>
        </div>
      </main>
    </div>
  );
}
