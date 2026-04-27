'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import MockBadge from '@/components/ui/MockBadge';
import { AXIONAX_NETWORK_CONFIG } from '@/lib/web3';

interface FaucetResponse {
  success: boolean;
  message: string;
  txHash?: string;
  amount?: string;
  blockNumber?: number;
  isMock?: boolean;
}

interface FaucetInfo {
  address: string;
  balance: string;
  symbol: string;
  isMock?: boolean;
}

interface RecentTx {
  txHash: string;
  to: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'confirmed';
}

const FAUCET_AMOUNT = '10,000'; // 10,000 AXXt per request for validator testing

// Validate Ethereum address format
const isValidAddress = (addr: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

// Fetch faucet wallet balance
const fetchFaucetInfo = async (): Promise<FaucetInfo> => {
  const response = await fetch('/api/faucet/balance');
  const data = (await response.json().catch(() => ({}))) as FaucetInfo & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(
      data.error ||
        (data as { message?: string }).message ||
        'Failed to fetch faucet info'
    );
  return data;
};

// Request tokens from faucet
const requestTokens = async (address: string): Promise<FaucetResponse> => {
  const response = await fetch('/api/faucet/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });

  const data = (await response.json()) as FaucetResponse;

  if (!response.ok) {
    throw new Error(data.message || 'Faucet request failed');
  }

  return data;
};

// Inner component that uses searchParams
function FaucetContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState('');
  const [lastSuccess, setLastSuccess] = useState<FaucetResponse | null>(null);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);

  // Pre-fill address from URL parameter
  useEffect(() => {
    const urlAddress = searchParams.get('address');
    if (urlAddress && isValidAddress(urlAddress)) {
      setAddress(urlAddress);
    }
  }, [searchParams]);

  // Fetch faucet balance
  const { data: faucetInfo, isLoading: isLoadingInfo } = useQuery({
    queryKey: ['faucetInfo'],
    queryFn: fetchFaucetInfo,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const mutation = useMutation({
    mutationFn: requestTokens,
    onSuccess: (data) => {
      setLastSuccess(data);
      setAddress(''); // Clear input on success
      // Add to recent transactions
      if (data.txHash) {
        setRecentTxs((prev) => [
          {
            txHash: data.txHash!,
            to: address,
            amount: data.amount || FAUCET_AMOUNT,
            timestamp: Date.now(),
            status: 'confirmed',
          },
          ...prev.slice(0, 4),
        ]);
      }
    },
  });

  const handleClaim = (): void => {
    if (!address.trim()) {
      return;
    }

    if (!isValidAddress(address)) {
      return;
    }

    mutation.mutate(address);
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="min-h-screen">
      <main className="container-custom py-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-content">
                Testnet Faucet
              </h1>
              <span className="px-2.5 py-1 bg-tech-success/20 text-tech-success text-xs rounded-full border border-tech-success/30 font-medium">
                Testnet
              </span>
              <MockBadge show={faucetInfo?.isMock ?? false} label="Balance" />
            </div>
            <p className="text-muted text-lg">
              Get free testnet{' '}
              <span className="text-tech-cyan font-semibold">AXX</span> tokens
              for development and testing
            </p>
          </div>

          {/* Faucet Balance Card */}
          <div className="rounded-lg border border-tech-cyan/20 bg-tech-cyan/5 backdrop-blur-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tech-cyan/70 text-xs font-semibold uppercase tracking-wider mb-1">
                  🏦 Faucet Balance
                </p>
                <p className="text-3xl font-bold text-tech-cyan font-mono">
                  {isLoadingInfo
                    ? '...'
                    : formatBalance(faucetInfo?.balance || '0')}{' '}
                  <span className="text-lg">AXX</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                  Per Request
                </p>
                <p className="text-2xl font-bold text-content font-mono">
                  {FAUCET_AMOUNT}{' '}
                  <span className="text-lg text-muted">AXX</span>
                </p>
              </div>
            </div>
          </div>

          <div className="card-panel mb-6">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-content">
                Claim Testnet Tokens
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Quick Link to Create Wallet */}
                {!address && (
                  <div className="p-4 rounded-lg bg-tech-warning/10 border border-tech-warning/20 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-tech-warning font-medium">
                          No wallet yet?
                        </p>
                        <p className="text-sm text-muted">
                          Create a new wallet for free!
                        </p>
                      </div>
                      <Link
                        href="/wallet"
                        className="px-4 py-2 bg-tech-warning/20 hover:bg-tech-warning/30 text-tech-warning border border-tech-warning/30 rounded-lg text-sm transition-colors"
                      >
                        Create Wallet
                      </Link>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Your Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4"
                    value={address}
                    onChange={(e) => setAddress(e.target.value.trim())}
                    className="w-full px-4 py-3 bg-black-hole border border-white/10 rounded-lg text-content placeholder-muted/50 focus:outline-none focus:border-tech-cyan focus:ring-1 focus:ring-tech-cyan/20 font-mono transition-all"
                    disabled={mutation.isPending}
                  />
                  {address && !isValidAddress(address) && (
                    <p className="text-tech-error text-sm mt-2 flex items-center gap-1">
                      ⚠️ Invalid Ethereum address format
                    </p>
                  )}
                </div>

                <button
                  className="w-full py-3.5 bg-tech-cyan/20 hover:bg-tech-cyan/30 text-tech-cyan font-semibold rounded-lg border border-tech-cyan/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  onClick={handleClaim}
                  disabled={
                    mutation.isPending || !address || !isValidAddress(address)
                  }
                >
                  {mutation.isPending
                    ? '⏳ Processing...'
                    : `Claim ${FAUCET_AMOUNT} AXX`}
                </button>

                {mutation.isError && (
                  <div
                    className="p-4 rounded-lg bg-tech-error/10 border border-tech-error/20 text-tech-error"
                    data-testid="faucet-message"
                  >
                    ❌{' '}
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : 'Failed to claim tokens. Please try again.'}
                  </div>
                )}

                {lastSuccess && (
                  <div
                    className="p-4 rounded-lg bg-tech-success/10 border border-tech-success/20 text-tech-success space-y-2"
                    data-testid="faucet-message"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        ✅ {lastSuccess.message}
                      </span>
                      <MockBadge
                        show={lastSuccess.isMock ?? false}
                        label="Claim"
                      />
                    </div>
                    {lastSuccess.txHash && (
                      <div className="text-sm font-mono break-all opacity-80">
                        TX: {lastSuccess.txHash}
                      </div>
                    )}
                    <div className="text-xs opacity-60">
                      Check your wallet in a few seconds
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          {recentTxs.length > 0 && (
            <div className="card-panel mb-6">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-semibold text-content">
                  📋 Recent Transactions
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {recentTxs.map((tx, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${tx.status === 'confirmed' ? 'bg-tech-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-tech-warning animate-pulse'}`}
                        />
                        <div>
                          <p className="text-sm font-mono text-content">
                            {tx.to.slice(0, 10)}...{tx.to.slice(-8)}
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-tech-cyan">
                          +{tx.amount} AXX
                        </p>
                        <a
                          href={`${AXIONAX_NETWORK_CONFIG.blockExplorerUrls[0]}/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted hover:text-tech-cyan transition-colors"
                        >
                          View TX →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card-panel">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-content">
                Faucet Information
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="text-tech-warning mt-0.5">💰</div>
                  <div>
                    <strong className="text-content">Amount:</strong>{' '}
                    <span className="text-muted">
                      {FAUCET_AMOUNT} AXXt per request (for validator testing)
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-tech-cyan mt-0.5">⏰</div>
                  <div>
                    <strong className="text-content">Cooldown:</strong>{' '}
                    <span className="text-muted">
                      24 hours between requests per address
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-content mt-0.5">🔗</div>
                  <div>
                    <strong className="text-content">Network:</strong>{' '}
                    <span className="text-muted">
                      Axionax Testnet (Chain ID: 86137)
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-tech-success mt-0.5">✨</div>
                  <div>
                    <strong className="text-content">Mode:</strong>{' '}
                    <span className="text-muted">
                      Simulation - Claims are recorded and will be allocated
                      when Mainnet launches
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-muted text-sm">
              🌌 Need more tokens? Join our{' '}
              <a
                href="https://discord.gg/axionax"
                className="text-tech-cyan hover:underline transition-colors"
              >
                Discord
              </a>{' '}
              for developer support.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Loading fallback for Suspense
function FaucetLoading(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-deep-space relative">
      <div className="stars" aria-hidden />
      <div className="container-custom py-8 sm:py-10 relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-horizon">Testnet Faucet</span>
            </h1>
            <p className="text-starlight/70 text-lg">Loading...</p>
          </div>
          <div className="animate-pulse">
            <div className="h-32 bg-amber-500/20 rounded-lg mb-6"></div>
            <div className="h-64 bg-amber-500/20 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function Faucet(): React.JSX.Element {
  return (
    <Suspense fallback={<FaucetLoading />}>
      <FaucetContent />
    </Suspense>
  );
}
