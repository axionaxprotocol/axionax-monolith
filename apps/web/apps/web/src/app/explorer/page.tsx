'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RPC_URLS } from '@axionax/blockchain-utils';
import { getHealthyRpc, AXIONAX_TESTNET_RPC_NODES } from '@axionax/sdk';
import {
  Search,
  Cuboid,
  ArrowRightLeft,
  Clock,
  Zap,
  Database,
} from 'lucide-react';

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gas: string;
  gasUsed: string;
  validator: string;
  size: number;
}

interface BlocksResponse {
  blocks: Block[];
  total: number;
  page: number;
  pageSize: number;
  latestBlock: number;
  isMock?: boolean;
}

interface AddressInfo {
  address: string;
  balance: string;
  nonce: number;
}

const fetchBlocks = async (): Promise<BlocksResponse> => {
  const response = await fetch('/api/blocks?page=1&pageSize=10');
  if (!response.ok) throw new Error('Failed to fetch blocks');
  return (await response.json()) as BlocksResponse;
};

const fetchAddressBalance = async (address: string): Promise<AddressInfo> => {
  const rpcUrlObj = process.env.NEXT_PUBLIC_RPC_URL
    ? { node: { url: process.env.NEXT_PUBLIC_RPC_URL } }
    : await getHealthyRpc(AXIONAX_TESTNET_RPC_NODES).catch(() => null);
  const rpcUrl = rpcUrlObj?.node.url ?? RPC_URLS.TESTNET[0];
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || 'RPC request failed');
  }
  const balanceWei = BigInt(data.result || '0x0');
  const balanceEth = Number(balanceWei) / 1e18;

  // Get nonce
  const nonceRes = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [address, 'latest'],
      id: 2,
    }),
  });
  const nonceData = await nonceRes.json();
  if (!nonceRes.ok || nonceData.error) {
    throw new Error(nonceData?.error?.message || 'RPC request failed');
  }

  return {
    address,
    balance: balanceEth.toFixed(4),
    nonce: parseInt(nonceData.result || '0x0', 16),
  };
};

const fetchTransaction = async (hash: string) => {
  const rpcUrlObj = process.env.NEXT_PUBLIC_RPC_URL
    ? { node: { url: process.env.NEXT_PUBLIC_RPC_URL } }
    : await getHealthyRpc(AXIONAX_TESTNET_RPC_NODES).catch(() => null);
  const rpcUrl = rpcUrlObj?.node.url ?? RPC_URLS.TESTNET[0];
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [hash],
      id: 1,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || 'RPC request failed');
  }
  return data.result;
};

const formatTimestamp = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return '—';
  // API returns timestamp in seconds (Unix)
  const timestampMs = timestamp * 1000;
  const seconds = Math.floor((Date.now() - timestampMs) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 90) return `${Math.floor(seconds / 86400)}d ago`;
  // Old blocks: show date so it's clear (not "467d ago")
  const d = new Date(timestampMs);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    day: 'numeric',
  });
};

export default function Explorer(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'address' | 'tx' | null>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { data: blocksData, isLoading } = useQuery<BlocksResponse>({
    queryKey: ['blocks'],
    queryFn: fetchBlocks,
    refetchInterval: 5000,
  });

  const [mempoolTxs, setMempoolTxs] = useState<number>(0);

  // Simulate mempool filling up
  useEffect(() => {
    const interval = setInterval(() => {
      setMempoolTxs((prev) => prev + Math.floor(Math.random() * 5));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const latestBlockNumber = blocksData?.blocks?.[0]?.number;

  // When a new block arrives, reset mempool txs (simplified simulation)
  useEffect(() => {
    if (latestBlockNumber) {
      setMempoolTxs(0);
    }
  }, [latestBlockNumber]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      // Detect search type
      if (searchQuery.startsWith('0x') && searchQuery.length === 66) {
        // Transaction hash
        setSearchType('tx');
        const tx = await fetchTransaction(searchQuery);
        if (tx) {
          setSearchResult(tx);
        } else {
          setSearchError('Transaction not found');
        }
      } else if (searchQuery.startsWith('0x') && searchQuery.length === 42) {
        // Address
        setSearchType('address');
        const info = await fetchAddressBalance(searchQuery);
        setSearchResult(info);
      } else {
        setSearchError(
          'Invalid input. Enter a transaction hash (0x... 66 chars) or address (0x... 42 chars)'
        );
      }
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <main className="container-custom py-10">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white/90">
                Network Explorer
              </h1>
              <p className="text-white/40 mt-1">
                Real-time consensus state of the Axionax Testnet
              </p>
            </div>

            {/* Compact Search */}
            <div className="relative max-w-md w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleSearch();
                  }
                }}
                disabled={isSearching}
                placeholder="Search tx / address / block..."
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono transition-all disabled:opacity-50"
              />
              <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isSearching ? 'text-blue-500 animate-spin' : 'text-white/30'}`} />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div
              className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4 flex flex-col"
              data-testid="latest-block"
            >
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">
                Latest Block
              </span>
              <span className="text-xl font-mono text-white/90" data-testid="block-number">
                {isLoading ? '...' : `#${blocksData?.blocks[0]?.number.toLocaleString() || '0'}`}
              </span>
            </div>
            <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4 flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">
                Avg Finality
              </span>
              <span className="text-xl font-mono text-green-500">~0.5s</span>
            </div>
            <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4 flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">
                Active Validators
              </span>
              <span className="text-xl font-mono text-blue-500">2 / 2</span>
            </div>
            <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4 flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">
                Mempool Size
              </span>
              <span className="text-xl font-mono text-yellow-500">{mempoolTxs} txs</span>
            </div>
          </div>
        </div>

        {/* Mempool Visualization */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white/80 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" /> Block Conveyor
            </h2>
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-semibold font-mono">
              <span className="flex items-center gap-1.5 text-yellow-500">
                <span className="w-2 h-2 rounded-full bg-yellow-500/50"></span> Unconfirmed
              </span>
              <span className="flex items-center gap-1.5 text-blue-500">
                <span className="w-2 h-2 rounded-full bg-blue-500/50"></span> Confirmed
              </span>
            </div>
          </div>

          <div className="relative bg-[#0A0A0A] border border-white/5 rounded-xl p-6 overflow-hidden flex items-center gap-4 md:gap-6 min-h-[220px]">
            {/* Dividing Line */}
            <div className="absolute left-1/3 top-0 bottom-0 border-r border-dashed border-white/20 w-[1px] z-0"></div>

            {/* Pending Block (Mempool) */}
            <div className="w-[140px] md:w-[160px] h-[160px] border-2 border-dashed border-yellow-500/40 bg-yellow-500/5 rounded-lg flex flex-col items-center justify-center p-3 relative z-10 shrink-0">
              <span className="text-yellow-500 font-mono text-sm mb-1 animate-pulse">~{blocksData?.blocks[0]?.number ? blocksData.blocks[0].number + 1 : '...'}</span>
              <span className="text-white/40 text-[10px] uppercase tracking-wider mb-3">Pending</span>
              <div className="w-full bg-black/40 rounded border border-white/10 p-2 text-center">
                <div className="text-white/90 font-mono text-lg">{mempoolTxs}</div>
                <div className="text-white/30 text-[9px] uppercase">Transactions</div>
              </div>
            </div>

            <ArrowRightLeft className="w-5 h-5 text-white/20 shrink-0 z-10" />

            {/* Confirmed Blocks */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 -mb-4 snap-x relative z-10 w-full custom-scrollbar">
              {isLoading ? (
                <div className="flex gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-[140px] md:w-[160px] h-[160px] bg-white/5 border border-white/10 rounded-lg animate-pulse shrink-0" />
                  ))}
                </div>
              ) : (
                blocksData?.blocks?.slice(0, 6).map((block, index) => (
                  <div
                    key={block.number}
                    className="w-[140px] md:w-[160px] h-[160px] border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg flex flex-col items-center justify-center p-3 shrink-0 snap-start transition-all cursor-pointer group"
                    style={{ opacity: 1 - (index * 0.15) }}
                  >
                    <span className="text-blue-400 font-mono text-sm mb-1 group-hover:text-blue-300">#{block.number}</span>
                    <span className="text-white/40 text-[10px] uppercase tracking-wider mb-3 truncate w-full text-center px-2">
                      {formatTimestamp(block.timestamp)}
                    </span>
                    <div className="w-full bg-black/40 rounded border border-white/5 p-2 text-center group-hover:border-blue-500/30 transition-colors">
                      <div className="text-white/90 font-mono text-lg group-hover:text-white">{block.txCount}</div>
                      <div className="text-white/30 text-[9px] uppercase group-hover:text-white/50">Transactions</div>
                    </div>
                    <div className="mt-2 text-[9px] text-white/20 font-mono flex items-center gap-1 group-hover:text-white/40">
                      <Zap className="w-3 h-3" /> {(parseInt(block.gasUsed) / 1000000).toFixed(1)}M gas
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Search Results Area */}
        {(searchError || searchResult) && (
          <div className="mb-12">
             {searchError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                ❌ {searchError}
              </div>
            )}

            {searchResult && searchType === 'address' && (
              <div className="p-6 bg-[#0A0A0A] rounded-xl border border-white/10">
                <h3 className="text-sm uppercase tracking-widest font-semibold text-white/40 mb-4 flex items-center gap-2">
                  <Cuboid className="w-4 h-4 text-blue-500" /> Address Details
                </h3>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">Address</span>
                    <span className="text-white/90 break-all">{searchResult.address}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">Balance</span>
                    <span className="text-blue-400 font-bold">{searchResult.balance} AXX</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">Nonce</span>
                    <span className="text-white/90">{searchResult.nonce}</span>
                  </div>
                </div>
              </div>
            )}

            {searchResult && searchType === 'tx' && (
              <div className="p-6 bg-[#0A0A0A] rounded-xl border border-white/10">
                <h3 className="text-sm uppercase tracking-widest font-semibold text-white/40 mb-4 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-500" /> Transaction Details
                </h3>
                <div className="space-y-4 text-sm font-mono">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">Tx Hash</span>
                    <span className="text-white/90 break-all">{searchResult.hash}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">Block Height</span>
                    <span className="text-blue-400">#{parseInt(searchResult.blockNumber, 16).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">From</span>
                    <span className="text-white/70 break-all">{searchResult.from}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">To</span>
                    <span className="text-white/70 break-all">{searchResult.to || 'Contract Creation'}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">Value</span>
                    <span className="text-blue-400 font-bold">{(parseInt(searchResult.value, 16) / 1e18).toFixed(4)} AXX</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-black/50 rounded border border-white/5">
                    <span className="text-white/40 uppercase tracking-widest text-[10px]">Gas Used</span>
                    <span className="text-white/90">{parseInt(searchResult.gas, 16).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabular Block List */}
        <div>
          <h2 className="text-lg font-medium text-white/80 flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-blue-500" /> Latest Blocks
          </h2>
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] uppercase tracking-widest text-white/40">
                    <th className="px-6 py-4 font-semibold">Block</th>
                    <th className="px-6 py-4 font-semibold">Age</th>
                    <th className="px-6 py-4 font-semibold">Txn</th>
                    <th className="px-6 py-4 font-semibold">Gas Used</th>
                    <th className="px-6 py-4 font-semibold text-right">Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-sm">
                  {isLoading ? (
                     <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-white/30">Loading blockchain data...</td>
                     </tr>
                  ) : blocksData?.blocks?.map((block) => (
                    <tr key={block.number} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-blue-400">#{block.number.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-white/50">{formatTimestamp(block.timestamp)}</td>
                      <td className="px-6 py-4 text-white/80">{block.txCount}</td>
                      <td className="px-6 py-4 text-white/50">
                         {parseInt(block.gasUsed).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-white/30 text-xs">
                        {block.hash.slice(0, 10)}...{block.hash.slice(-8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
