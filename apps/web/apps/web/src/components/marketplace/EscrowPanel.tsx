'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  createClient,
  EscrowStatus,
  EscrowTransaction,
  DEFAULT_CONFIG,
  type AxionaxClient,
} from '@axionax/sdk';
import { ethers } from 'ethers';
import { RefreshCw, Loader2 } from 'lucide-react';

const EXPLORER_BASE = DEFAULT_CONFIG.blockExplorerUrls[0] ?? '';

/** Format escrow completed date (handles Date or ISO string from API). */
function formatCompletedDate(updatedAt: Date | string | undefined): string {
  if (updatedAt == null) return '—';
  const d = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    dateStyle: 'medium',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

interface EscrowPanelProps {
  jobId: string;
  client?: AxionaxClient;
  className?: string;
}

export default function EscrowPanel({
  jobId,
  client: propClient,
  className = '',
}: EscrowPanelProps): React.JSX.Element {
  const [client, setClient] = useState<AxionaxClient>(
    () =>
      propClient ||
      createClient({
        ...DEFAULT_CONFIG,
        rpcUrl: DEFAULT_CONFIG.rpcUrls[0],
        rpcUrls: [...DEFAULT_CONFIG.rpcUrls],
        chainId: DEFAULT_CONFIG.chainIdDecimal,
      })
  );
  const [escrowState, setEscrowState] = useState<EscrowTransaction | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('0');

  useEffect(() => {
    if (propClient) {
      setClient(propClient);
      return;
    }
    const initClient = async () => {
      if (
        typeof window !== 'undefined' &&
        (window as Window & { ethereum?: unknown }).ethereum
      ) {
        try {
          const provider = new ethers.BrowserProvider(
            (window as Window & { ethereum?: unknown }).ethereum as never
          );
          const signer = await provider.getSigner();
          const newClient = createClient({
            ...DEFAULT_CONFIG,
            rpcUrl: DEFAULT_CONFIG.rpcUrls[0],
            rpcUrls: [...DEFAULT_CONFIG.rpcUrls],
            chainId: DEFAULT_CONFIG.chainIdDecimal,
            provider,
            signer,
          });
          setClient(newClient);
        } catch (e) {
          console.error('Failed to initialize wallet client', e);
        }
      }
    };
    initClient();
  }, [propClient]);

  const fetchEscrowStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await client.getEscrowStatus(jobId);
      setEscrowState(status);
      setError(null);
    } catch {
      // No data yet is ok
    } finally {
      setLoading(false);
    }
  }, [client, jobId]);

  useEffect(() => {
    fetchEscrowStatus();
  }, [fetchEscrowStatus]);

  const handleDeposit = async () => {
    try {
      setLoading(true);
      setError(null);
      const value = BigInt(parseFloat(amount) * 1e18);
      const tx = await client.depositEscrow(jobId, value);
      setEscrowState(tx);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    try {
      setLoading(true);
      setError(null);
      const tx = await client.releaseEscrow(jobId);
      setEscrowState(tx);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Release failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    try {
      setLoading(true);
      setError(null);
      const tx = await client.refundEscrow(jobId);
      setEscrowState(tx);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClasses = (status?: EscrowStatus) => {
    switch (status) {
      case EscrowStatus.Pending:
        return 'bg-tech-warning/20 text-tech-warning border-tech-warning/50';
      case EscrowStatus.Deposited:
        return 'bg-tech-cyan/20 text-tech-cyan border-tech-cyan/50';
      case EscrowStatus.Released:
        return 'bg-tech-success/20 text-tech-success border-tech-success/50';
      case EscrowStatus.Refunded:
        return 'bg-white/10 text-muted border-white/20';
      case EscrowStatus.Disputed:
        return 'bg-tech-error/20 text-tech-error border-tech-error/50';
      default:
        return 'bg-white/5 text-muted border-white/10';
    }
  };

  const getDisplayStatus = (status?: EscrowStatus) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatAmount = (value?: bigint) => {
    if (value === undefined) return '0.00';
    return (Number(value) / 1e18).toFixed(4);
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="rounded-lg border border-white/10 bg-black-hole/90 backdrop-blur-sm shadow-panel overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <h2
              className="text-xl font-bold text-content font-display"
              id="escrow-title"
            >
              Escrow Contract
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchEscrowStatus()}
                disabled={loading}
                aria-label="Refresh escrow status"
                aria-busy={loading}
                className="p-2 rounded-lg text-muted hover:text-tech-cyan hover:bg-tech-cyan/10 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2
                    className="w-5 h-5 animate-spin"
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : (
                  <RefreshCw className="w-5 h-5" strokeWidth={2} aria-hidden />
                )}
              </button>
              <span
                role="status"
                aria-live="polite"
                className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusClasses(escrowState?.status)}`}
              >
                {getDisplayStatus(escrowState?.status)}
              </span>
            </div>
          </div>
          <p
            className="text-muted text-sm font-mono tabular-nums truncate"
            title={jobId}
          >
            ID: {jobId}
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="rounded-lg p-4 sm:p-5 border border-white/10 bg-white/[0.02]">
            <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
              Locked Amount
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-content tracking-tight font-mono tabular-nums">
                {formatAmount(escrowState?.amount)}
              </span>
              <span className="text-muted font-medium text-sm">AXX</span>
            </div>
          </div>

          <div className="space-y-3">
            {(!escrowState || escrowState.status === EscrowStatus.Pending) && (
              <div className="mb-4">
                <label
                  className="block text-muted text-xs mb-2 uppercase tracking-wider font-semibold"
                  id="deposit-desc"
                  htmlFor="escrow-deposit-amount"
                >
                  Deposit Amount (AXX)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input font-mono"
                  placeholder="0.00"
                  min={0}
                  step="any"
                  aria-describedby="deposit-desc"
                  id="escrow-deposit-amount"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {(!escrowState ||
                escrowState.status === EscrowStatus.Pending) && (
                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={loading}
                  aria-busy={loading}
                  aria-label={
                    loading ? 'Processing deposit' : 'Deposit funds to escrow'
                  }
                  className="col-span-2 w-full py-3 px-4 bg-tech-cyan/20 text-tech-cyan hover:bg-tech-cyan/30 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : 'Deposit Funds'}
                </button>
              )}

              {escrowState?.status === EscrowStatus.Deposited && (
                <>
                  <button
                    type="button"
                    onClick={handleRelease}
                    disabled={loading}
                    aria-label="Release escrow to worker"
                    aria-busy={loading}
                    className="w-full py-3 px-4 bg-tech-success/20 text-tech-success hover:bg-tech-success/30 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Release
                  </button>
                  <button
                    type="button"
                    onClick={handleRefund}
                    disabled={loading}
                    aria-label="Refund escrow to payer"
                    aria-busy={loading}
                    className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Refund
                  </button>
                </>
              )}
            </div>

            {(escrowState?.status === EscrowStatus.Released ||
              escrowState?.status === EscrowStatus.Refunded) && (
              <div className="text-center p-4 bg-black-hole/40 rounded-lg border border-white/10">
                <p className="text-content">
                  Completed {formatCompletedDate(escrowState?.updatedAt)}
                </p>
                {escrowState.txHash && EXPLORER_BASE && (
                  <a
                    href={`${EXPLORER_BASE.replace(/\/$/, '')}/tx/${escrowState.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-tech-cyan hover:opacity-90 mt-1 inline-flex items-center gap-1 break-all justify-center"
                    title="View transaction on block explorer"
                  >
                    {escrowState.txHash.slice(0, 10)}…
                    {escrowState.txHash.slice(-8)}
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
                {escrowState.txHash && !EXPLORER_BASE && (
                  <span
                    className="text-xs text-muted mt-1 block font-mono truncate"
                    title={escrowState.txHash}
                  >
                    {escrowState.txHash}
                  </span>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
