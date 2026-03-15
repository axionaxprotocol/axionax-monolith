import React from 'react';
import Button from '@/components/ui/Button';
import Link from 'next/link';

// Hero component - Landing page hero section with Black Hole / Event Horizon theme
export default function Hero(): React.JSX.Element {
  return (
    <section className="section relative overflow-hidden min-h-screen flex items-center">
      {/* Stars background */}
      <div className="stars" />

      {/* Golden Atom Animation - scaled down on mobile */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Outer orbital ring */}
        <div
          className="absolute w-[320px] h-[320px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] rounded-full opacity-25 md:opacity-30"
          style={{
            animation: 'spin 30s linear infinite',
            border: '2px solid transparent',
            background:
              'linear-gradient(#0a0a0f, #0a0a0f) padding-box, linear-gradient(135deg, #ffd700, #ff8c00, #daa520) border-box',
          }}
        />

        {/* Middle orbital ring */}
        <div
          className="absolute w-[240px] h-[240px] md:w-[380px] md:h-[380px] lg:w-[450px] lg:h-[450px] rounded-full opacity-35 md:opacity-40"
          style={{
            animation: 'spin 20s linear infinite reverse',
            border: '2px solid transparent',
            background:
              'linear-gradient(#0a0a0f, #0a0a0f) padding-box, linear-gradient(45deg, #daa520, #ffd700, #ffa500) border-box',
          }}
        />

        {/* Inner orbital ring */}
        <div
          className="absolute w-[160px] h-[160px] md:w-[260px] md:h-[260px] lg:w-[300px] lg:h-[300px] rounded-full opacity-45 md:opacity-50"
          style={{
            animation: 'spin 15s linear infinite',
            border: '3px solid transparent',
            background:
              'linear-gradient(#0a0a0f, #0a0a0f) padding-box, linear-gradient(90deg, #ffa500, #ffd700, #ff8c00) border-box',
          }}
        />

        {/* Golden Atom Core with Logo */}
        <div
          className="absolute w-[100px] h-[100px] md:w-[150px] md:h-[150px] lg:w-[180px] lg:h-[180px] rounded-full flex items-center justify-center"
          style={{
            background:
              'radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,140,0,0.1) 50%, transparent 70%)',
            boxShadow:
              '0 0 60px rgba(255,215,0,0.4), 0 0 100px rgba(255,165,0,0.2), inset 0 0 40px rgba(255,215,0,0.1)',
          }}
        >
          <img
            src="/assets/img/axionax-logo-new.png"
            alt="Axionax Golden Atom"
            className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full object-cover"
            style={{ filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' }}
          />
        </div>

        {/* Floating particles - hidden on small screens */}
        <div className="absolute w-[280px] h-[280px] md:w-[500px] md:h-[500px] lg:w-[700px] lg:h-[700px]">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
              style={{
                top: `${50 + 40 * Math.cos((i * Math.PI * 2) / 12)}%`,
                left: `${50 + 40 * Math.sin((i * Math.PI * 2) / 12)}%`,
                animation: `twinkle ${2 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
                boxShadow: '0 0 10px rgba(255,215,0,0.6)',
              }}
            />
          ))}
        </div>

        {/* Outer glow rings */}
        <div className="absolute w-[200px] h-[200px] rounded-full border border-amber-500/20 animate-pulse" />
        <div
          className="absolute w-[240px] h-[240px] rounded-full border border-yellow-500/10 animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />
      </div>

      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="mb-8 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-500/60 rounded-full text-amber-100 text-sm font-medium backdrop-blur-md shadow-[0_0_15px_rgba(255,165,0,0.3)] hover:shadow-[0_0_25px_rgba(255,165,0,0.5)] transition-shadow duration-300">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_10px_rgba(255,215,0,0.8)]"></span>
              </span>
              🔥 Testnet Live • 2 Validators • Chain ID 86137
            </span>
          </div>

          {/* Main Heading - single line on md+ for cleaner look */}
          <h1 className="mb-6 animate-fade-in-up animation-delay-200 text-balance lg:whitespace-nowrap">
            <span className="text-starlight drop-shadow-lg">Welcome to the </span>
            <span
              className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent relative inline-block"
              style={{ 
                textShadow: '0 0 60px rgba(255,215,0,0.4)',
                filter: 'drop-shadow(0 0 2px rgba(255,215,0,0.2))'
              }}
            >
              Golden Era
              <div className="absolute -inset-1 blur-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 -z-10 opacity-50 animate-pulse"></div>
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl text-starlight/80 mb-10 max-w-3xl mx-auto animate-fade-in-up animation-delay-400 leading-relaxed">
            <span className="text-amber-400 font-semibold">Axionax v1.9.0</span>{' '}
            — powered by{' '}
            <span className="text-yellow-500 font-semibold">
              Proof of Probabilistic Checking
            </span>{' '}
            (PoPC) consensus. The next generation Layer-1 with{' '}
            <span className="text-amber-300 font-medium">45K+ TPS</span> and
            sub-second finality.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up animation-delay-600">
            <Link href="/faucet">
              <button className="btn-horizon text-lg px-8 py-4 flex items-center gap-2">
                Get Test Tokens
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Arrow right icon"
                  role="img"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            </Link>
            <Link href="/docs">
              <Button variant="secondary" size="lg" className="text-lg">
                Read Documentation
              </Button>
            </Link>
            <Link href="/explorer">
              <Button variant="outline" size="lg" className="text-lg">
                Explorer
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-fade-in-up animation-delay-800">
            <div className="card-cosmic text-center p-4 hover:shadow-horizon-sm transition-all duration-300 cursor-default group">
              <div className="text-2xl md:text-3xl font-bold text-horizon-gold mb-2 group-hover:scale-110 transition-transform">
                86137
              </div>
              <div className="text-sm text-starlight/60">Chain ID</div>
            </div>
            <div className="card-cosmic text-center p-4 hover:shadow-horizon-sm transition-all duration-300 cursor-default group">
              <div className="text-2xl md:text-3xl font-bold text-horizon-blue mb-2 group-hover:scale-110 transition-transform">
                2
              </div>
              <div className="text-sm text-starlight/60">Validators Live</div>
            </div>
            <div className="card-cosmic text-center p-4 hover:shadow-horizon-sm transition-all duration-300 cursor-default group">
              <div className="text-2xl md:text-3xl font-bold text-horizon-orange mb-2 group-hover:scale-110 transition-transform">
                45K+
              </div>
              <div className="text-sm text-starlight/60">Target TPS</div>
            </div>
            <div className="card-cosmic text-center p-4 hover:shadow-horizon-sm transition-all duration-300 cursor-default group">
              <div className="text-2xl md:text-3xl font-bold text-horizon-gold mb-2 group-hover:scale-110 transition-transform">
                &lt;0.5s
              </div>
              <div className="text-sm text-starlight/60">Finality</div>
            </div>
          </div>

          {/* Network Info */}
          <div className="mt-12 card-cosmic max-w-md mx-auto animate-fade-in-up animation-delay-800">
            <h3 className="text-horizon-gold font-semibold mb-3 flex items-center justify-center gap-2">
              <img
                src="/assets/img/axx-token.png"
                alt="AXX Token"
                className="w-8 h-8 rounded-full shadow-lg"
              />
              Add AXX to MetaMask
            </h3>
            <div className="space-y-2 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-starlight/60">Network:</span>
                <span className="text-starlight font-mono">
                  Axionax Testnet
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-starlight/60">RPC URL:</span>
                <span className="text-horizon-blue font-mono text-xs">
                    https://rpc.axionax.org
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-starlight/60">Chain ID:</span>
                <span className="text-horizon-gold font-mono">86137</span>
              </div>
              <div className="flex justify-between">
                <span className="text-starlight/60">Symbol:</span>
                <span className="text-horizon-gold font-mono">AXX</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-deep-space to-transparent" />
    </section>
  );
}
