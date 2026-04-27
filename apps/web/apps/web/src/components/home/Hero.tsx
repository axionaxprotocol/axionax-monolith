import React from 'react';
import Link from 'next/link';

// Hero component - Professional landing page hero section
export default function Hero(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden min-h-screen flex items-center justify-center pt-20 bg-gradient-to-b from-[#05050A] via-[#0A0A0F] to-[#05050A]">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-transparent to-purple-900/5 pointer-events-none"></div>
      
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 blur-[120px] pointer-events-none"></div>

      <div className="container-custom relative z-10 w-full">
        <div className="max-w-5xl mx-auto text-center">
          {/* Status Badge */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              <span className="tracking-wide text-xs uppercase font-semibold">Testnet Live • Chain ID 86137</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6">
            <span className="block text-white/90 mb-3 text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
              Trusted World Computer
            </span>
            <span className="block text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Axionax Protocol
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed font-normal">
            Layer-1 blockchain for decentralized AI compute. Math-based trust,{' '}
            <span className="text-white font-medium">PoPC consensus</span>, and the path to{' '}
            <span className="text-white font-medium">Project Monolith</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/join">
              <button className="group relative px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40">
                <span>Deploy Node</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </button>
            </Link>
            <Link href="/marketplace">
              <button className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-lg transition-all duration-200 w-full sm:w-auto flex items-center justify-center gap-2">
                <span>Access Network</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </Link>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors duration-200">
              <div className="text-3xl font-bold text-white mb-1 font-mono">
                86137
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Chain ID</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors duration-200">
              <div className="text-3xl font-bold text-white mb-1 font-mono">
                2
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Validators</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors duration-200">
              <div className="text-3xl font-bold text-white mb-1 font-mono">
                45K+
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Target TPS</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors duration-200">
              <div className="text-3xl font-bold text-white mb-1 font-mono">
                &lt;0.5s
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Finality</div>
            </div>
          </div>

          {/* Network Info Card */}
          <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6 max-w-lg mx-auto text-left hover:bg-white/10 transition-colors duration-200">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-3 text-sm uppercase tracking-wider">
              Network Details
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Network</span>
                <span className="text-white font-medium">Axionax Testnet</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">RPC Endpoint</span>
                <span className="text-white font-mono text-xs bg-white/5 px-2 py-1 rounded">https://rpc.axionax.org</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Chain ID</span>
                <span className="text-white font-mono">86137</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Symbol</span>
                <span className="text-white font-mono">AXX</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#05050A] to-transparent pointer-events-none" />
    </section>
  );
}
