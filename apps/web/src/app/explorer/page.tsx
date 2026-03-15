'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RPC_URLS } from '@axionax/blockchain-utils';

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

// RPC from centralized config or env
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || RPC_URLS.TESTNET[0];

const fetchBlocks = async (): Promise<BlocksResponse> => {
  const response = await fetch('/api/blocks?page=1&pageSize=10');
  if (!response.ok) throw new Error('Failed to fetch blocks');
  return (await response.json()) as BlocksResponse;
};

const fetchAddressBalance = async (address: string): Promise<AddressInfo> => {
  const response = await fetch(RPC_URL, {
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
  const balanceWei = BigInt(data.result || '0x0');
  const balanceEth = Number(balanceWei) / 1e18;

  // Get nonce
  const nonceRes = await fetch(RPC_URL, {
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

  return {
    address,
    balance: balanceEth.toFixed(4),
    nonce: parseInt(nonceData.result || '0x0', 16),
  };
};

const fetchTransaction = async (hash: string) => {
  const response = await fetch(RPC_URL, {
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
  return data.result;
};

const formatTimestamp = (timestamp: number): string => {
  // API returns timestamp in seconds, Date.now() returns milliseconds
  const timestampMs = timestamp * 1000;
  const seconds = Math.floor((Date.now() - timestampMs) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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
    refetchInterval: 5000, // Refresh every 5 seconds
  });

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
    } catch (err) {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  return (
    <div className="min-h-screen">
      <main className="container-custom py-10">
        <div className="mb-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-content">
              Block Explorer
            </h1>
          </div>
          <p className="text-muted text-lg">
            Explore blocks, transactions, and addresses on the{' '}
            <span className="text-tech-cyan">Axionax</span> testnet
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className="rounded-lg border border-white/10 bg-black-hole/90 backdrop-blur-sm shadow-panel p-6"
            data-testid="latest-block"
          >
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Latest Block
            </div>
            <div
              className="text-2xl font-bold text-content font-mono mb-1"
              data-testid="block-number"
            >
              {isLoading
                ? '...'
                : `#${blocksData?.blocks[0]?.number.toLocaleString() || '0'}`}
            </div>
            <div className="text-xs text-muted">
              {isLoading
                ? 'Loading...'
                : blocksData?.blocks[0]
                  ? formatTimestamp(blocksData.blocks[0].timestamp)
                  : 'N/A'}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black-hole/90 backdrop-blur-sm shadow-panel p-6">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Total Blocks</div>
            <div className="text-2xl font-bold text-content font-mono mb-1">
              {isLoading ? '...' : blocksData?.total.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-muted">
              Since testnet launch
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black-hole/90 backdrop-blur-sm shadow-panel p-6">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Active Validators
            </div>
            <div className="text-2xl font-bold text-tech-success font-mono mb-1">2/2</div>
            <div className="text-xs text-muted">EU + AU regions</div>
          </div>
        </div>

        {/* Search Section */}
        <div className="card-panel mb-8">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-content">
              🔍 Search the Cosmos
            </h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by address (0x...) or transaction hash..."
                className="flex-1 px-4 py-3 bg-black-hole border border-white/10 rounded-lg text-content placeholder-muted focus:outline-none focus:border-tech-cyan focus:ring-1 focus:ring-tech-cyan/20 font-mono text-sm transition-all"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-3 bg-tech-cyan/20 hover:bg-tech-cyan/30 text-tech-cyan font-semibold rounded-lg border border-tech-cyan/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchError && (
              <div className="mt-4 p-4 bg-tech-error/10 border border-tech-error/20 rounded-lg text-tech-error">
                ❌ {searchError}
              </div>
            )}

            {searchResult && searchType === 'address' && (
              <div className="mt-4 p-6 bg-white/[0.02] rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold text-content mb-4">
                  📍 Address Details
                </h3>
                <div className="space-y-3 font-mono text-sm">
                  <div>
                    <span className="text-muted">Address:</span>
                    <span className="ml-2 text-content break-all">
                      {searchResult.address}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Balance:</span>
                    <span className="ml-2 font-bold text-tech-cyan">
                      {searchResult.balance} AXX
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Nonce:</span>
                    <span className="ml-2 text-content">
                      {searchResult.nonce}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {searchResult && searchType === 'tx' && (
              <div className="mt-4 p-6 bg-white/[0.02] rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold text-content mb-4">
                  📜 Transaction Details
                </h3>
                <div className="space-y-3 text-sm font-mono">
                  <div>
                    <span className="text-muted">Hash:</span>
                    <span className="ml-2 text-content break-all">
                      {searchResult.hash}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Block:</span>
                    <span className="ml-2 text-tech-cyan">
                      #{parseInt(searchResult.blockNumber, 16).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">From:</span>
                    <span className="ml-2 text-content break-all">
                      {searchResult.from}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">To:</span>
                    <span className="ml-2 text-content break-all">
                      {searchResult.to || 'Contract Creation'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Value:</span>
                    <span className="ml-2 font-bold text-tech-cyan">
                      {(parseInt(searchResult.value, 16) / 1e18).toFixed(4)} AXX
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Gas:</span>
                    <span className="ml-2 text-content">
                      {parseInt(searchResult.gas, 16).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card-panel">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-content">⬡ Recent Blocks</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted">
                <div className="loading-spinner w-8 h-8 mx-auto mb-2 border-tech-cyan border-t-transparent"></div>
                Loading blocks from the cosmos...
              </div>
            ) : blocksData?.blocks && blocksData.blocks.length > 0 ? (
              <div className="space-y-3">
                {blocksData.blocks.map((block) => (
                  <div
                    key={block.number}
                    className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-white/[0.02] rounded-lg border border-white/5 hover:border-white/10 transition-all duration-300 gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-tech-cyan font-mono text-lg">
                        #{block.number.toLocaleString()}
                      </div>
                      <div className="text-muted text-sm">
                        {formatTimestamp(block.timestamp)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted">Txs:</span>{' '}
                        <span className="text-content">
                          {block.txCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Gas:</span>{' '}
                        <span className="text-tech-warning">
                          {(parseInt(block.gasUsed) / 1_000_000).toFixed(2)}M
                        </span>
                      </div>
                      <div className="hidden md:block font-mono text-xs text-muted/50">
                        {block.hash.slice(0, 10)}...{block.hash.slice(-8)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted">
                No blocks found in this dimension
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted text-sm">
            🌌 Explorer connected to live validators (EU + AU). Search for
            addresses or transactions above.
          </p>
        </div>
      </main>
    </div>
  );
}
