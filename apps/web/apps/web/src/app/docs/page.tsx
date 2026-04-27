import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function Docs(): React.JSX.Element {
  const docSections = [
    {
      title: 'Getting Started',
      items: [
        {
          name: 'Quick Start',
          href: '/docs/quick-start',
          external: false,
        },
        {
          name: 'Developer Guide',
          href: '/docs/quick-start',
          external: false,
        },
      ],
    },
    {
      title: 'Core Concepts',
      items: [
        {
          name: 'Architecture',
          href: '/docs/architecture',
          external: false,
        },
        {
          name: 'API Reference',
          href: '/docs/api',
          external: false,
        },
        {
          name: 'DeAI Layer',
          href: '/docs/deai',
          external: false,
        },
      ],
    },
    {
      title: 'Development',
      items: [
        {
          name: 'SDK (TypeScript)',
          href: '/docs/sdk',
          external: false,
        },
        {
          name: 'Testing Guide',
          href: '/docs/sdk',
          external: false,
        },
      ],
    },
    {
      title: 'Deployment',
      items: [
        {
          name: 'Node Integration',
          href: '/docs/deployment',
          external: false,
        },
        {
          name: 'VPS Validator Setup',
          href: '/docs/deployment',
          external: false,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <main className="container-custom py-10">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Documentation v1.9.0
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Everything you need to build on axionax - Protocol v1.9.0 Testnet
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {docSections.map((section) => (
            <Card key={section.title} hover>
              <CardHeader>
                <CardTitle className="text-content">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.name}>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-tech-cyan transition-colors text-sm flex items-center gap-1"
                        >
                          {item.name}
                          <svg
                            className="w-3 h-3"
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
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="text-muted hover:text-tech-cyan transition-colors text-sm"
                        >
                          {item.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-primary p-6 text-white border-none">
            <div className="mb-4 text-white">
              <svg
                className="w-12 h-12"
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
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Quick Start</h3>
            <p className="text-white/80 mb-4">
              Get started with axionax in under 5 minutes
            </p>
            <a
              href="/docs/quick-start"
              className="text-white font-semibold hover:underline inline-flex items-center gap-1"
            >
              Start Building →
            </a>
          </Card>

          <Card className="bg-tech-cyan/10 border-tech-cyan/20 p-6">
            <div className="mb-4 text-tech-cyan">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-tech-cyan">SDK & API</h3>
            <p className="text-muted mb-4">
              Comprehensive SDK for TypeScript, Python, and Rust
            </p>
            <a
              href="/docs/api"
              className="text-tech-cyan font-semibold hover:underline inline-flex items-center gap-1"
            >
              View API Docs →
            </a>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6">
            <div className="mb-4 text-content">
              <svg
                className="w-12 h-12"
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
            </div>
            <h3 className="text-xl font-bold mb-2 text-content">Tutorials</h3>
            <p className="text-muted mb-4">
              Learn from step-by-step tutorials and examples
            </p>
            <a
              href="/docs/sdk"
              className="text-content font-semibold hover:underline inline-flex items-center gap-1"
            >
              Browse Tutorials →
            </a>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-content">Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none text-muted">
              <h3 className="text-xl font-semibold mb-4 text-content">
                1. Install the SDK
              </h3>
              <div className="bg-black-hole p-4 rounded-lg border border-white/10 font-mono text-sm mb-6 text-content">
                <code>npm install @axionax/sdk</code>
              </div>

              <h3 className="text-xl font-semibold mb-4 text-content">
                2. Connect to Testnet
              </h3>
              <div className="bg-black-hole p-4 rounded-lg border border-white/10 font-mono text-sm mb-6 text-content">
                <pre>{`import { axionaxClient } from '@axionax/sdk';

const client = new axionaxClient({
  network: 'testnet',
  endpoint: 'https://rpc.axionax.org'
});

// Get network status
const status = await client.getNetworkStatus();
console.log(status);`}</pre>
              </div>

              <h3 className="text-xl font-semibold mb-4 text-content">
                3. Create a Wallet
              </h3>
              <div className="bg-black-hole p-4 rounded-lg border border-white/10 font-mono text-sm mb-6 text-content">
                <pre>{`// Create new wallet
const wallet = client.createWallet();

// Or import existing
const imported = client.importWallet(privateKey);

// Get balance
const balance = await client.getBalance(wallet.address);`}</pre>
              </div>

              <div className="mt-8 p-4 bg-tech-cyan/10 border border-tech-cyan/20 rounded-lg">
                <p className="text-tech-cyan font-semibold mb-2">
                  Complete Documentation Available
                </p>
                <p className="text-muted text-sm mb-3">
                  Access our comprehensive documentation site with detailed
                  guides, tutorials, and API references:
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/docs"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-tech-cyan hover:bg-tech-cyan-hover text-white font-semibold rounded-lg transition-colors"
                  >
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
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    View Full Docs
                  </a>
                  <a
                    href="https://github.com/axionaxprotocol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub Repos
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-content">
                Community & Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://github.com/axionaxprotocol/axionax-core/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-tech-cyan transition-colors flex items-center gap-2"
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
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Report Issues
                  </a>
                </li>
                <li>
                  <a
                    href="/docs/deployment"
                    className="text-muted hover:text-tech-cyan transition-colors flex items-center gap-2"
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
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Contributing Guide
                  </a>
                </li>
                <li>
                  <a
                    href="/docs/architecture"
                    className="text-muted hover:text-tech-cyan transition-colors flex items-center gap-2"
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
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Security Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/docs/quick-start"
                    className="text-muted hover:text-tech-cyan transition-colors flex items-center gap-2"
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
                        strokeWidth={2}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    Project Roadmap
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-content">Network Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-tech-success/10 border border-tech-success/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-content">
                      Testnet
                    </span>
                    <span className="px-2 py-1 bg-tech-success/20 text-tech-success text-xs rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-tech-success rounded-full animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-muted">Chain ID: 86137</p>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-content">
                      Mainnet
                    </span>
                    <span className="px-2 py-1 bg-tech-cyan/20 text-tech-cyan text-xs rounded-full">
                      Planned
                    </span>
                  </div>
                  <p className="text-xs text-muted">Chain ID: 86150</p>
                </div>
                <div className="p-3 bg-tech-success/10 border border-tech-success/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-content">
                      Local Dev
                    </span>
                    <span className="px-2 py-1 bg-tech-success/20 text-tech-success text-xs rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-tech-success rounded-full animate-pulse"></span>
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted">Chain ID: 31337</p>
                  <a
                    href="/docs/deployment"
                    className="text-xs text-tech-warning hover:underline mt-2 inline-block"
                  >
                    Setup Guide →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
