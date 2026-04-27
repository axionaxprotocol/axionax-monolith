'use client';

import React, { useState, useEffect } from 'react';

interface GenesisSnapshot {
  id: number;
  snapshotBlock: string;
  totalAddresses: number;
  totalAllocation: string;
  merkleRoot: string;
  createdAt: string;
  isFinalized: boolean;
}

interface AddressAllocation {
  address: string;
  score: number;
  tier: number;
  allocation: string;
  merkleProof: string[];
}

export default function GenesisPage() {
  const [snapshots, setSnapshots] = useState<GenesisSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<GenesisSnapshot | null>(null);
  const [allocations, setAllocations] = useState<AddressAllocation[]>([]);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchResult, setSearchResult] = useState<AddressAllocation | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch snapshots
  useEffect(() => {
    async function fetchSnapshots() {
      try {
        const res = await fetch(`${API_URL}/api/genesis/snapshots`);
        if (res.ok) {
          const data = await res.json();
          setSnapshots(data);
          if (data.length > 0) {
            setSelectedSnapshot(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch snapshots:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSnapshots();
  }, [API_URL]);

  // Fetch allocations when snapshot changes
  useEffect(() => {
    async function fetchAllocations() {
      if (!selectedSnapshot) return;

      try {
        const res = await fetch(
          `${API_URL}/api/genesis/snapshots/${selectedSnapshot.id}/allocations?limit=20`
        );
        if (res.ok) {
          const data = await res.json();
          setAllocations(data);
        }
      } catch (err) {
        console.error('Failed to fetch allocations:', err);
      }
    }
    fetchAllocations();
  }, [selectedSnapshot, API_URL]);

  // Search for address
  const handleSearch = async () => {
    if (!searchAddress || !selectedSnapshot) return;

    try {
      const res = await fetch(
        `${API_URL}/api/genesis/snapshots/${selectedSnapshot.id}/allocation/${searchAddress}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
      } else {
        setSearchResult(null);
      }
    } catch (err) {
      console.error('Failed to search address:', err);
      setSearchResult(null);
    }
  };

  // Download genesis.json
  const handleDownloadGenesis = async () => {
    if (!selectedSnapshot) return;

    setDownloading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/genesis/snapshots/${selectedSnapshot.id}/genesis.json`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genesis-${selectedSnapshot.snapshotBlock}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download genesis:', err);
    } finally {
      setDownloading(false);
    }
  };

  const formatAmount = (amount: string) => {
    const value = BigInt(amount);
    const formatted = Number(value / BigInt(10 ** 14)) / 10000;
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const TIER_NAMES = ['N/A', 'Bronze', 'Silver', 'Gold', 'Platinum'];
  const TIER_EMOJIS = ['❌', '🥉', '🥈', '🥇', '💎'];

  return (
    <div className="min-h-screen">
      <div className="container-custom py-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-content mb-4">
            🌟 Genesis Block & Snapshots
          </h1>
          <p className="text-lg text-muted max-w-3xl mx-auto">
            View Genesis snapshots and token allocation for Mainnet
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="loading-spinner w-12 h-12 mx-auto mb-4" />
            <p className="text-muted">Loading...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 grayscale opacity-50">📦</div>
            <h3 className="text-xl font-semibold text-content mb-2">
              No snapshot yet
            </h3>
            <p className="text-muted">
              Genesis snapshot will be created before Mainnet launch
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Snapshot Selector */}
            <div className="card-panel p-6">
              <h2 className="text-lg font-semibold text-content mb-4">
                📋 Select Snapshot
              </h2>
              <div className="flex flex-wrap gap-2">
                {snapshots.map((snap) => (
                  <button
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      selectedSnapshot?.id === snap.id
                        ? 'bg-tech-cyan text-white shadow-glow'
                        : 'bg-white/5 text-muted hover:bg-white/10'
                    }`}
                  >
                    Block #{snap.snapshotBlock}
                    {snap.isFinalized && <span className="ml-2">✅</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Snapshot Details */}
            {selectedSnapshot && (
              <div className="card-panel p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h2 className="text-lg font-semibold text-content">
                    Snapshot Details
                    {selectedSnapshot.isFinalized && (
                      <span className="ml-2 text-sm bg-tech-success/20 text-tech-success px-2 py-1 rounded">
                        Finalized
                      </span>
                    )}
                  </h2>
                  <button
                    onClick={handleDownloadGenesis}
                    disabled={downloading || !selectedSnapshot.isFinalized}
                    className="px-4 py-2 bg-tech-cyan hover:bg-tech-cyan-hover disabled:bg-white/5 disabled:text-muted/50 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {downloading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Downloading...
                      </>
                    ) : (
                      <>📥 Download genesis.json</>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-content font-mono">
                      #{selectedSnapshot.snapshotBlock}
                    </div>
                    <div className="text-sm text-muted">Snapshot Block</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-content font-mono">
                      {selectedSnapshot.totalAddresses.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted">Total Addresses</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-tech-success font-mono">
                      {formatAmount(selectedSnapshot.totalAllocation)} AXX
                    </div>
                    <div className="text-sm text-muted">Total Allocation</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                    <div className="text-xs font-mono text-content break-all">
                      {selectedSnapshot.merkleRoot.slice(0, 20)}...
                    </div>
                    <div className="text-sm text-muted mt-1">Merkle Root</div>
                  </div>
                </div>

                {/* Full Merkle Root */}
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted">Full Merkle Root</span>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          selectedSnapshot.merkleRoot
                        )
                      }
                      className="text-tech-cyan hover:text-tech-cyan-hover text-sm"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="font-mono text-xs text-content break-all bg-black/50 rounded p-2 border border-white/5">
                    {selectedSnapshot.merkleRoot}
                  </div>
                </div>

                {/* Search Address */}
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-content mb-4">
                    🔍 Search Address
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 input-primary font-mono"
                    />
                    <button onClick={handleSearch} className="btn-primary">
                      Search
                    </button>
                  </div>

                  {searchResult && (
                    <div className="mt-4 bg-black/50 rounded-lg p-4 border border-white/5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-muted">Score</div>
                          <div className="text-lg font-bold text-content font-mono">
                            {searchResult.score}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted">Tier</div>
                          <div className="text-lg font-bold text-content">
                            {TIER_EMOJIS[searchResult.tier]}{' '}
                            {TIER_NAMES[searchResult.tier]}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted">Allocation</div>
                          <div className="text-lg font-bold text-tech-success font-mono">
                            {formatAmount(searchResult.allocation)} AXX
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted">Merkle Proof</div>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(
                                JSON.stringify(searchResult.merkleProof)
                              )
                            }
                            className="text-tech-cyan hover:text-tech-cyan-hover text-sm"
                          >
                            📋 Copy Proof ({searchResult.merkleProof.length}{' '}
                            items)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top Allocations */}
            {allocations.length > 0 && (
              <div className="card-panel p-6">
                <h2 className="text-lg font-semibold text-content mb-4">
                  🏆 Top Allocations
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-muted font-medium">
                          Rank
                        </th>
                        <th className="text-left py-3 px-4 text-muted font-medium">
                          Address
                        </th>
                        <th className="text-right py-3 px-4 text-muted font-medium">
                          Score
                        </th>
                        <th className="text-center py-3 px-4 text-muted font-medium">
                          Tier
                        </th>
                        <th className="text-right py-3 px-4 text-muted font-medium">
                          Allocation
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((alloc, idx) => (
                        <tr
                          key={alloc.address}
                          className="border-b border-white/5 hover:bg-white/[0.02]"
                        >
                          <td className="py-3 px-4 text-content">#{idx + 1}</td>
                          <td className="py-3 px-4 font-mono text-sm">
                            <a
                              href={`https://explorer.axionax.xyz/address/${alloc.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-tech-cyan hover:text-tech-cyan-hover"
                            >
                              {formatAddress(alloc.address)}
                            </a>
                          </td>
                          <td className="py-3 px-4 text-right text-content font-mono">
                            {alloc.score.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {TIER_EMOJIS[alloc.tier]} {TIER_NAMES[alloc.tier]}
                          </td>
                          <td className="py-3 px-4 text-right text-tech-success font-medium font-mono">
                            {formatAmount(alloc.allocation)} AXX
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Genesis Info */}
            <div className="bg-tech-cyan/5 border border-tech-cyan/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📜</div>
                <div>
                  <h3 className="text-lg font-semibold text-tech-cyan mb-2">
                    What is the Genesis Block?
                  </h3>
                  <p className="text-muted mb-4">
                    The Genesis Block is the first block of Mainnet, containing
                    token allocation data for Testnet users via a Merkle Tree
                    for transparency and verification.
                  </p>
                  <ul className="text-muted space-y-1 text-sm">
                    <li>
                      • <strong>Merkle Root</strong> — Hash of all data used to
                      verify integrity
                    </li>
                    <li>
                      • <strong>Merkle Proof</strong> — Proof that an address is
                      in the snapshot
                    </li>
                    <li>
                      • <strong>Snapshot</strong> — State record at a given
                      block
                    </li>
                    <li>
                      • <strong>Finalized</strong> — Approved snapshot that will
                      not change
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
