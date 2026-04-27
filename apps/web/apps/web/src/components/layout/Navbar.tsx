'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ConnectButton from '@/components/wallet/ConnectButton';
import { AXIONAX_NETWORK } from '@/lib/web3';

// Navbar component - Main navigation bar with cosmic black hole theme
export default function Navbar(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const addNetwork = async () => {
    if (typeof window === 'undefined') return;
    type WindowWithEthereum = Window & {
      ethereum?: {
        request: (args: {
          method: string;
          params?: unknown[];
        }) => Promise<unknown>;
      };
    };
    const { ethereum } = window as WindowWithEthereum;
    if (!ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      await ethereum.request({
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
    } catch (error) {
      console.error('Error adding network:', error);
    }
  };

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Wallet', href: '/wallet' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Explorer', href: '/explorer' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Faucet', href: '/faucet' },
    { name: 'Validators', href: '/validators' },
    { name: 'Join Network', href: '/join' },
    { name: 'Infrastructure', href: '/infrastructure' },
    { name: 'Airdrop', href: '/airdrop' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#05050A]/80 backdrop-blur-xl border-b border-white/5">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Golden Atom Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <img
              src="/assets/img/axionax-logo-new.png"
              alt="Axionax Logo"
              className="w-10 h-10 rounded-full object-cover shadow-horizon-sm group-hover:shadow-horizon group-hover:scale-110 transition-all duration-300"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-[#60A5FA] to-[#A855F7] bg-clip-text text-transparent">
              Axionax
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 rounded-lg text-content hover:text-tech-cyan hover:bg-tech-cyan/10 transition-all duration-200"
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={
                  item.href.startsWith('http')
                    ? 'noopener noreferrer'
                    : undefined
                }
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Connect Wallet Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={addNetwork}
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-tech-cyan/10 text-tech-cyan hover:bg-tech-cyan/20 transition-colors text-sm font-medium border border-tech-cyan/20"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.5 12c0-5.8-4.7-10.5-10.5-10.5S1.5 6.2 1.5 12 6.2 22.5 12 22.5 22.5 17.8 22.5 12zm-2.5 0c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8z" />
              </svg>
              Add to MetaMask
            </button>
            <ConnectButton />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-starlight hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-fade-in">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-starlight/70 hover:text-starlight hover:bg-white/5 transition-colors px-4 py-3 rounded-lg"
                  onClick={() => setIsOpen(false)}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={
                    item.href.startsWith('http')
                      ? 'noopener noreferrer'
                      : undefined
                  }
                >
                  {item.name}
                </Link>
              ))}
              <div className="px-4 pt-4 flex flex-col gap-3 border-t border-white/10">
                <button
                  onClick={addNetwork}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-tech-cyan/10 text-tech-cyan hover:bg-tech-cyan/20 transition-colors text-sm font-medium border border-tech-cyan/20"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.5 12c0-5.8-4.7-10.5-10.5-10.5S1.5 6.2 1.5 12 6.2 22.5 12 22.5 22.5 17.8 22.5 12zm-2.5 0c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8z" />
                  </svg>
                  Add to MetaMask
                </button>
                <ConnectButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
