import React from 'react';
import Link from 'next/link';
import { AXIONAX_NETWORK_CONFIG } from '@/lib/web3';

// QuickAccess component - Quick links to main services
export default function QuickAccess(): React.JSX.Element {
  const explorerBase = AXIONAX_NETWORK_CONFIG.blockExplorerUrls[0] || '/explorer';

  const services = [
    {
      title: 'RPC Endpoint',
      description: 'Connect your dApp to axionax testnet',
      href: 'https://rpc.axionax.org',
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      ),
      badge: 'HTTPS',
      code: 'https://rpc.axionax.org',
    },
    {
      title: 'Block Explorer',
      description: 'View transactions, blocks, and accounts',
      href: '/explorer',
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
      badge: 'Live',
    },
    {
      title: 'Faucet',
      description: 'Get free testnet AXX tokens',
      href: '/faucet',
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      badge: '100 AXX/day',
    },
    {
      title: 'Marketplace',
      description: 'Trade compute resources and AI models',
      href: '/marketplace',
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      badge: 'Beta',
    },
    {
      title: 'Monitoring',
      description: 'Real-time infrastructure metrics',
      href: '/infrastructure/nodes',
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      badge: 'Grafana',
    },
    {
      title: 'Documentation',
      description: 'Guides, API reference, and tutorials',
      href: '/docs',
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      badge: '2,300+ lines',
    },
  ];

  return (
    <section className="py-20 bg-[#0A0A0F] border-y border-white/5">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Quick Access
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to start building on{' '}
            <span className="text-blue-400 font-medium">Axionax</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              target={service.href.startsWith('http') ? '_blank' : undefined}
              rel={
                service.href.startsWith('http')
                  ? 'noopener noreferrer'
                  : undefined
              }
              className="group p-6 bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 rounded-xl transition-all duration-200 block h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                  {service.icon}
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {service.badge}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {service.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">{service.description}</p>
              {service.code && (
                <code className="block p-2 rounded bg-black/30 border border-white/10 text-xs text-blue-400 font-mono truncate">
                  {service.code}
                </code>
              )}
              <div className="flex items-center text-blue-400 text-sm mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open</span>
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Network Config Box */}
        <div className="mt-12 p-6 rounded-xl border border-white/10 bg-white/5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Add Axionax Testnet to MetaMask
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Network Name:</span>
              <p className="text-white font-mono bg-black/30 px-3 py-2 rounded">
                Axionax Testnet
              </p>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">RPC URL:</span>
              <p className="text-blue-400 font-mono bg-black/30 px-3 py-2 rounded truncate">
                https://rpc.axionax.org
              </p>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Chain ID:</span>
              <p className="text-green-400 font-mono bg-black/30 px-3 py-2 rounded">
                {AXIONAX_NETWORK_CONFIG.chainIdDecimal}
              </p>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Currency Symbol:</span>
              <p className="text-yellow-400 font-mono bg-black/30 px-3 py-2 rounded">
                {AXIONAX_NETWORK_CONFIG.nativeCurrency?.symbol ?? 'AXX'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Explorer: <span className="font-mono text-gray-400">{explorerBase}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
