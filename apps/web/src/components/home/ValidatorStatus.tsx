'use client';

import React, { useState, useEffect } from 'react';
import { CircleDot, CircleOff, Loader2 } from 'lucide-react';
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
    name: 'Validator EU',
    location: 'Europe',
    ip: '217.76.***.***',
    rpcUrl: '/api/rpc/eu',
  },
  {
    name: 'Validator AU',
    location: 'Australia',
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
  } catch (err) {
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
            status: info.blockHeight !== null || info.statusDetails === 'healthy' ? 'online' : 'offline',
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
      className="section bg-dark-900/50"
      data-testid="network-status"
      aria-label={onlineCount > 0 ? 'Connected' : 'Checking'}
    >
      <div className="container-custom">
        <div className="text-center mb-12">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="gradient-text">Validator Network</span>
            </h2>
            <MockBadge show={!isChecking && allOffline} label="Unavailable" />
          </div>
          <p className="text-dark-300 text-lg">
            Real-time status of axionax validators running PoPC consensus
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {validators.map((validator, index) => (
            <div
              key={index}
              className="bg-dark-800/50 border border-dark-700 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {getLocationFlag(validator.location)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-lg">{validator.name}</h3>
                    <p className="text-dark-400 text-sm">
                      {validator.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {validator.status === 'online' ? (
                    <CircleDot
                      className="w-4 h-4 text-tech-success shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : validator.status === 'checking' ? (
                    <Loader2
                      className="w-4 h-4 text-tech-warning shrink-0 animate-spin"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : (
                    <CircleOff
                      className="w-4 h-4 text-tech-error shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                  <span
                    className={`text-sm capitalize ${validator.status === 'online' ? 'text-tech-success' : 'text-dark-300'}`}
                  >
                    {validator.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-900/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
                    {validator.blockHeight !== null
                      ? validator.blockHeight.toLocaleString()
                      : '---'}
                  </div>
                  <div className="text-dark-400 text-sm">Block Height</div>
                </div>
                <div className="bg-dark-900/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-secondary-400 font-mono tabular-nums">
                    {validator.peerCount !== null ? validator.peerCount : '---'}
                  </div>
                  <div className="text-dark-400 text-sm">Peers</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700 flex justify-between items-center text-sm">
                <code className="text-dark-400 bg-dark-900/50 px-2 py-1 rounded font-mono text-xs">
                  {validator.ip}:8545
                </code>
                {validator.latency !== null && (
                  <span className="text-dark-400 font-mono tabular-nums">
                    {validator.latency}ms latency
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-dark-400 text-sm">
            ✓ Connected via PoPC Consensus • Chain ID:{' '}
            <span className="font-mono tabular-nums">86137</span> • Updates
            every 10s
          </p>
        </div>
      </div>
    </section>
  );
}
