import React from 'react';
import Link from 'next/link';

export default function QuickStartDoc(): React.JSX.Element {
  return (
    <div className="container-custom py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/docs"
          className="text-tech-cyan hover:text-tech-cyan-hover mb-6 inline-block font-mono text-sm"
        >
          ← Back to Documentation
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-content mb-8">
          Quick Start Guide
        </h1>

        <div className="card-panel p-8 prose prose-invert max-w-none prose-headings:text-content prose-p:text-muted prose-a:text-tech-cyan hover:prose-a:text-tech-cyan-hover prose-pre:bg-[#0D0B14] prose-pre:border prose-pre:border-white/10 prose-code:text-tech-cyan">
          <p className="text-lg">
            Get started with the Axionax Protocol testnet in under 5 minutes.
            This guide covers the basics of connecting to the network, obtaining
            testnet tokens, and sending your first transaction.
          </p>

          <h2>1. Network Configuration</h2>
          <p>
            Add the Axionax Testnet to your wallet (e.g., MetaMask) using the
            following details:
          </p>
          <pre>
            <code>
              Network Name: Axionax Testnet RPC URL: https://rpc.axionax.org
              Chain ID: 86137 Currency Symbol: AXX
            </code>
          </pre>

          <h2>2. Get Testnet AXX</h2>
          <p>
            You need AXX tokens to pay for gas fees on the network. Visit our{' '}
            <Link href="/faucet">Faucet</Link> to receive 100 AXX per day for
            testing.
          </p>

          <h2>3. Using the SDK</h2>
          <p>
            The fastest way to interact with the Axionax blockchain
            programmatically is via our official TypeScript SDK.
          </p>
          <pre>
            <code>npm install @axionax/sdk</code>
          </pre>

          <h3>Initialize the Client</h3>
          <pre>
            <code>
              import &#123; createClient, AXIONAX_TESTNET_CONFIG &#125; from
              '@axionax/sdk'; const client =
              createClient(AXIONAX_TESTNET_CONFIG); // Get current block number
              const blockNumber = await client.getBlockNumber();
              console.log('Current block:', blockNumber);
            </code>
          </pre>

          <h2>4. Next Steps</h2>
          <ul>
            <li>
              Explore the <Link href="/docs/api">API Reference</Link> for
              advanced RPC calls.
            </li>
            <li>
              Read the <Link href="/docs/sdk">SDK Documentation</Link> to build
              full-stack dApps.
            </li>
            <li>
              Learn about{' '}
              <Link href="/docs/architecture">DeAI Architecture</Link>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
