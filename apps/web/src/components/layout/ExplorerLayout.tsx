'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ConnectButton from '@/components/wallet/ConnectButton';
import VisitorCounter from '@/components/layout/VisitorCounter';
import { AXIONAX_TESTNET } from '@/lib/web3';

const mainNav = [
  { name: 'Home', href: '/' },
  { name: 'Pitch Deck', href: '/pitch' },
  { name: 'Workers', href: '/marketplace' },
  { name: 'Explorer', href: '/explorer' },
  { name: 'Faucet', href: '/faucet' },
  { name: 'Validators', href: '/validators' },
  { name: 'Wallet', href: '/wallet' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Join Network', href: '/join' },
  { name: 'Infrastructure', href: '/infrastructure' },
  { name: 'Airdrop', href: '/airdrop' },
  { name: 'Docs', href: '/docs' },
];

export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLight = false; // Dark theme only

  const addNetwork = async () => {
    if (typeof window === 'undefined') return;
    const win = window as Window & {
      ethereum?: {
        request: (args: {
          method: string;
          params?: unknown[];
        }) => Promise<unknown>;
      };
    };
    if (!win.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    try {
      await win.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: AXIONAX_TESTNET.chainId,
            chainName: AXIONAX_TESTNET.chainName,
            nativeCurrency: AXIONAX_TESTNET.nativeCurrency,
            rpcUrls: AXIONAX_TESTNET.rpcUrls,
            blockExplorerUrls: AXIONAX_TESTNET.blockExplorerUrls,
          },
        ],
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isLight ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#0a0a0f] text-starlight'
      }`}
    >
      {/* Top bar – io.net style */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 border-b border-amber-500/20 backdrop-blur ${
          isLight ? 'bg-[#F8FAFC]/95' : 'bg-[#0a0a0f]/95'
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/assets/img/axionax-logo-new.png"
            alt="Axionax"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-bold text-lg bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
            Axionax
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          <Link
            href="/docs"
            className={`text-sm transition-colors hover:text-amber-500 ${
              isLight
                ? 'text-slate-600'
                : 'text-starlight/70 hover:text-amber-400'
            }`}
          >
            Docs
          </Link>
          <button
            type="button"
            onClick={addNetwork}
            className={`text-sm transition-colors hover:text-amber-500 ${
              isLight
                ? 'text-slate-600'
                : 'text-starlight/70 hover:text-amber-400'
            }`}
          >
            Add Network
          </button>
          <ConnectButton />
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`lg:hidden p-2 rounded-lg transition-colors hover:bg-amber-500/10 hover:text-amber-500 ${
            isLight
              ? 'text-slate-600'
              : 'text-starlight/70 hover:text-amber-400'
          }`}
          aria-label="Menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* Horizontal nav */}
      <nav
        className={`sticky top-14 z-20 flex items-center gap-1 px-4 sm:px-6 lg:px-8 py-2 border-b border-amber-500/15 overflow-x-auto ${
          isLight ? 'bg-[#F1F5F9]/95' : 'bg-[#0d0d12]/90'
        }`}
      >
        {mainNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500/20 text-amber-600'
                  : isLight
                    ? 'text-slate-600 hover:text-amber-600 hover:bg-amber-500/10'
                    : 'text-starlight/60 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div
            className={`fixed top-14 left-0 right-0 z-50 lg:hidden border-b border-amber-500/20 p-4 max-h-[70vh] overflow-y-auto ${
              isLight ? 'bg-[#F1F5F9]' : 'bg-[#0d0d12]'
            }`}
          >
            <div className="flex flex-col gap-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg hover:bg-amber-500/10 ${
                    isLight ? 'text-slate-900' : 'text-starlight'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <div className="border-t border-amber-500/20 mt-3 pt-3 flex flex-wrap gap-2">
                <Link
                  href="/docs"
                  className={`px-4 py-2 text-sm hover:text-amber-500 ${
                    isLight
                      ? 'text-slate-700'
                      : 'text-starlight/80 hover:text-amber-400'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Docs
                </Link>
                <button
                  type="button"
                  onClick={addNetwork}
                  className={`px-4 py-2 text-sm hover:text-amber-500 ${
                    isLight
                      ? 'text-slate-700'
                      : 'text-starlight/80 hover:text-amber-400'
                  }`}
                >
                  Add Network
                </button>
                <ConnectButton />
              </div>
            </div>
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <VisitorCounter />
    </div>
  );
}
