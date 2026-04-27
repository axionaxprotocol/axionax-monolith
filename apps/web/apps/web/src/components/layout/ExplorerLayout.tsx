'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ConnectButton from '@/components/wallet/ConnectButton';
import VisitorCounter from '@/components/layout/VisitorCounter';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { AXIONAX_NETWORK } from '@/lib/web3';

const mainNav = [
  { name: 'Home', href: '/' },
  { name: 'Pitch', href: '/pitch' },
  { name: 'Marketplace', href: '/marketplace' },
  { name: 'Explorer', href: '/explorer' },
  { name: 'Faucet', href: '/faucet' },
  { name: 'Validators', href: '/validators' },
  { name: 'Wallet', href: '/wallet' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Join', href: '/join' },
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
  const { theme } = useTheme();
  const isLight = theme === 'light';

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
            chainId: AXIONAX_NETWORK.chainId,
            chainName: AXIONAX_NETWORK.chainName,
            nativeCurrency: AXIONAX_NETWORK.nativeCurrency,
            rpcUrls: AXIONAX_NETWORK.rpcUrls,
            blockExplorerUrls: AXIONAX_NETWORK.blockExplorerUrls,
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
        isLight ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#05050A] text-gray-100'
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-50 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 border-b backdrop-blur-xl transition-all duration-200 ${
          isLight
            ? 'bg-white/90 border-slate-200'
            : 'bg-[#05050A]/90 border-white/5'
        }`}
      >
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <img
            src="/assets/img/axionax-logo-new.png"
            alt="Axionax"
            className="w-8 h-8 rounded-full object-cover border border-white/10"
          />
          <span className="font-semibold text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors duration-200">
            Axionax
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          <Link
            href="/docs"
            className={`text-sm font-medium transition-colors ${
              isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Docs
          </Link>
          <button
            type="button"
            onClick={addNetwork}
            className={`text-sm font-medium transition-colors ${
              isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Add Network
          </button>
          <div className="pl-4 border-l border-white/10 flex items-center gap-2">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`lg:hidden p-2 rounded-md transition-colors ${
            isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          aria-label="Menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* Navigation Bar */}
      <nav
        className={`sticky top-16 z-40 flex items-center gap-1 px-4 sm:px-6 lg:px-8 h-12 border-b backdrop-blur-md transition-all duration-200 overflow-x-auto ${
          isLight 
            ? 'bg-[#F8FAFC]/90 border-slate-200' 
            : 'bg-[#05050A]/90 border-white/5'
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
              className={`relative flex items-center h-full px-3 text-sm font-medium transition-colors whitespace-nowrap rounded-md ${
                isActive
                  ? isLight
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-white bg-white/5'
                  : isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div
            className={`fixed top-16 left-0 right-0 z-40 lg:hidden border-b border-white/10 p-4 max-h-[70vh] overflow-y-auto shadow-2xl ${
              isLight ? 'bg-white' : 'bg-[#0A0A0F]/95 backdrop-blur-xl'
            }`}
          >
            <div className="flex flex-col gap-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    pathname === item.href
                      ? isLight
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-white/5 text-white'
                      : isLight 
                        ? 'text-slate-600 hover:bg-slate-50' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <div className="border-t border-white/10 mt-3 pt-3 flex flex-wrap gap-2">
                <Link
                  href="/docs"
                  className={`px-4 py-2 text-sm hover:text-blue-400 ${
                    isLight
                      ? 'text-slate-700'
                      : 'text-gray-400 hover:text-blue-400'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Docs
                </Link>
                <button
                  type="button"
                  onClick={addNetwork}
                  className={`px-4 py-2 text-sm hover:text-blue-400 ${
                    isLight
                      ? 'text-slate-700'
                      : 'text-gray-400 hover:text-blue-400'
                  }`}
                >
                  Add Network
                </button>
                <div className="w-full mt-2">
                  <ConnectButton />
                </div>
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
