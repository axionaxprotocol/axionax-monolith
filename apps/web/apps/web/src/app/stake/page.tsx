'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function StakeContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const nodeId = searchParams.get('node');

  return (
    <div className="min-h-screen">
      <main className="container-custom py-12 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold gradient-text mb-2">Stake AXX</h1>
        <p className="text-muted mb-8">
          Stake AXX tokens to activate your validator or worker node on Axionax
          Testnet.
        </p>

        {nodeId && (
          <div className="rounded-xl border border-white/10 bg-black-hole/60 p-4 mb-8">
            <span className="text-muted text-sm">Node ID</span>
            <p className="font-mono text-content mt-1">{nodeId}</p>
          </div>
        )}

        <div className="space-y-4 mb-10">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-content mb-2">
              1. Get testnet AXX
            </h2>
            <p className="text-muted text-sm mb-4">
              Use the faucet to receive 100 AXX per day for testing.
            </p>
            <Link
              href="/faucet"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tech-cyan/20 text-tech-cyan hover:bg-tech-cyan/30 transition-colors text-sm font-medium"
            >
              Open Faucet
            </Link>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-content mb-2">
              2. Join as validator or worker
            </h2>
            <p className="text-muted text-sm mb-4">
              Register your node and stake the required AXX via the Join Network
              flow.
            </p>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tech-cyan/20 text-tech-cyan hover:bg-tech-cyan/30 transition-colors text-sm font-medium"
            >
              Join Network
            </Link>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-content mb-2">
              3. View validators & leaderboard
            </h2>
            <p className="text-muted text-sm mb-4">
              See live validators and network status.
            </p>
            <Link
              href="/validators"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tech-cyan/20 text-tech-cyan hover:bg-tech-cyan/30 transition-colors text-sm font-medium"
            >
              Validators
            </Link>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="text-muted hover:text-tech-cyan transition-colors text-sm"
        >
          ← Back to Dashboard
        </Link>
      </main>
    </div>
  );
}

export default function StakePage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading-spinner w-10 h-10" />
        </div>
      }
    >
      <StakeContent />
    </Suspense>
  );
}
