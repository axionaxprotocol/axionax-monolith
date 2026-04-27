'use client';

import React, { useState, useEffect } from 'react';
import { CircleDot, CircleOff, Loader2 } from 'lucide-react';
import type { RpcHealthResult } from '@axionax/sdk';
import { getHealthyRpc, AXIONAX_TESTNET_RPC_NODES } from '@axionax/sdk';
import MockBadge from '@/components/ui/MockBadge';

interface ValidatorInfo {
  name: string;
  location: string;
  ip: string;
  blockHeight: number | null;
  peerCount: number | null;
  status: 'online' | 'offline' | 'checking';
  statusDetails?: string;
  latency: number | null;
}

const VALIDATORS = [
  {
    name: 'Alpha Core (EU)',
    location: 'Frankfurt, Germany',
    ip: '217.76.***.***',
    rpcUrl: '/api/rpc/eu',
  },
  {
    name: 'Beta Core (AU)',
    location: 'Sydney, Australia',
    ip: '46.250.***.***',
    rpcUrl: '/api/rpc/au',
  },
];

async function fetchValidatorInfo(rpcUrl: string): Promise<{
  blockHeight: number | null;
  peerCount: number | null;
  latency: number;
  statusDetails?: string;
}> {
  const startTime = Date.now();
  try {
    // Check if the node supports the new system_health RPC method
    const response = await fetch(rpcUrl, {
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

    if (response.ok) {
      const data = await response.json();
      if (data.result && data.result.status) {
        return {
          blockHeight: data.result.block_height,
          peerCount: data.result.peers,
          statusDetails: data.result.status,
          latency: Date.now() - startTime,
        };
      }
    }
  } catch {
    // Fall back to standard eth methods if system_health fails or timeout
  }

  // Fallback to legacy eth_blockNumber / net_peerCount
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
    const data = await response.json();
    const blockHeight = data.result ? parseInt(data.result, 16) : null;

    // Get peer count
    const peerResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'net_peerCount',
        params: [],
        id: 2,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const peerData = await peerResponse.json();
    const peerCount = peerData.result ? parseInt(peerData.result, 16) : null;

    return {
      blockHeight,
      peerCount,
      latency: Date.now() - startTime,
    };
  } catch {
    return {
      blockHeight: null,
      peerCount: null,
      latency: Date.now() - startTime,
    };
  }
}

function formatSdkRpcStatus(health: RpcHealthResult | null): string {
  if (!health) {
    return 'SDK: no healthy RPC in fallback list';
  }
  if (health.index === 0) {
    return `SDK: Connected to ${health.node.label}`;
  }
  return `SDK: Fallback to ${health.node.label} (${health.latencyMs}ms)`;
}

export default function ValidatorStatus(): React.JSX.Element {
  const [validators, setValidators] = useState<ValidatorInfo[]>(
    VALIDATORS.map((v) => ({
      name: v.name,
      location: v.location,
      ip: v.ip,
      blockHeight: null,
      peerCount: null,
      status: 'checking' as const,
      latency: null,
    }))
  );
  const [sdkRpcLine, setSdkRpcLine] = useState<string>(
    'SDK: checking multi-RPC…'
  );

  useEffect(() => {
    const pollSdkRpc = async () => {
      try {
        const health = await getHealthyRpc(AXIONAX_TESTNET_RPC_NODES, {
          timeoutMs: 5_000,
        });
        setSdkRpcLine(formatSdkRpcStatus(health));
      } catch {
        setSdkRpcLine('SDK: RPC check failed');
      }
    };
    void pollSdkRpc();
    const sdkInterval = setInterval(pollSdkRpc, 10_000);
    return () => clearInterval(sdkInterval);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.all(
        VALIDATORS.map(async (v) => {
          const info = await fetchValidatorInfo(v.rpcUrl);
          return {
            name: v.name,
            location: v.location,
            ip: v.ip,
            blockHeight: info.blockHeight,
            peerCount: info.peerCount,
            status:
              info.blockHeight !== null || info.statusDetails === 'healthy'
                ? 'online'
                : 'offline',
            statusDetails: info.statusDetails,
            latency: info.latency,
          } as ValidatorInfo;
        })
      );
      setValidators(results);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getLocationFlag = (location: string) => {
    switch (location) {
      case 'Europe':
        return '🇪🇺';
      case 'Australia':
        return '🇦🇺';
      default:
        return '🌍';
    }
  };

  const onlineCount = validators.filter((v) => v.status === 'online').length;
  const allOffline = validators.every((v) => v.status === 'offline');
  const isChecking = validators.some((v) => v.status === 'checking');

  return (
    <section
      className="py-20 bg-[#0A0A0F] border-y border-white/5"
      data-testid="network-status"
      aria-label={onlineCount > 0 ? 'Connected' : 'Checking'}
    >
      <div className="container-custom">
        <div className="text-center mb-12">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Validator Network
            </h2>
            <MockBadge show={!isChecking && allOffline} label="Unavailable" />
          </div>
          <p className="text-gray-400 text-lg">
            Real-time status of axionax validators running PoPC consensus
          </p>
          <p
            className="mt-3 text-sm font-mono text-blue-400 bg-black/30 border border-blue-500/20 rounded-lg px-4 py-2 inline-block max-w-2xl"
            data-testid="sdk-rpc-status"
            aria-live="polite"
          >
            {sdkRpcLine}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {validators.map((validator, index) => (
            <div
              key={index}
              className="group relative bg-[#0A0A0A] border border-white/5 p-6 rounded-xl transition-all duration-300 hover:border-white/10 hover:bg-[#111111] overflow-hidden"
            >
              <div className="relative z-10 flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-2xl grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300">
                    {getLocationFlag(validator.location)}
                  </span>
                  <div>
                    <h3 className="font-medium text-lg text-white/90 tracking-tight">{validator.name}</h3>
                    <p className="text-white/40 text-[10px] tracking-wider uppercase mt-0.5">
                      {validator.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  {validator.status === 'online' ? (
                    <CircleDot
                      className="w-3 h-3 text-green-500 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : validator.status === 'checking' ? (
                    <Loader2
                      className="w-3 h-3 text-yellow-500 shrink-0 animate-spin"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : (
                    <CircleOff
                      className="w-3 h-3 text-red-500 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                  <span
                    className={`text-[10px] uppercase tracking-widest font-semibold ${validator.status === 'online' ? 'text-green-500' : 'text-white/40'}`}
                  >
                    {validator.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 border border-white/5 rounded-lg p-4 transition-colors duration-300 group-hover:border-white/10">
                  <div className="text-2xl font-medium text-white font-mono tabular-nums tracking-tight">
                    {validator.blockHeight !== null
                      ? validator.blockHeight.toLocaleString()
                      : '---'}
                  </div>
                  <div className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-semibold">Block Height</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-lg p-4 transition-colors duration-300 group-hover:border-white/10">
                  <div className="text-2xl font-medium text-white/80 font-mono tabular-nums tracking-tight">
                    {validator.peerCount !== null ? validator.peerCount : '---'}
                  </div>
                  <div className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-semibold">Active Peers</div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-sm">
                <code className="text-white/50 font-mono text-[11px] tracking-wider">
                  {validator.ip}:8545
                </code>
                {validator.latency !== null && (
                  <span className="text-white/50 font-mono tabular-nums text-[11px] tracking-wider">
                    {validator.latency}ms
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 text-[11px] uppercase tracking-[0.2em] font-medium flex items-center justify-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/50 inline-block"></span>
            Secured by PoPC Consensus
            <span className="text-gray-600 mx-2">|</span> 
            Chain ID: <span className="text-gray-400 font-mono ml-1">86137</span>
          </p>
        </div>
      </div>
    </section>
  );
}
