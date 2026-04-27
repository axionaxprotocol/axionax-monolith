import React from 'react';
import Link from 'next/link';

export default function SdkDoc(): React.JSX.Element {
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
          Axionax SDK
        </h1>

        <div className="card-panel p-8 prose prose-invert max-w-none prose-headings:text-content prose-p:text-muted prose-a:text-tech-cyan hover:prose-a:text-tech-cyan-hover prose-pre:bg-[#0D0B14] prose-pre:border prose-pre:border-white/10 prose-code:text-tech-cyan">
          <p className="text-lg">
            The <code>@axionax/sdk</code> provides a comprehensive TypeScript
            toolkit for building decentralized applications on the Axionax
            Protocol. It handles RPC communication, wallet management, and
            complex DeAI escrow logic natively.
          </p>

          <h2>Installation</h2>
          <pre>
            <code>pnpm add @axionax/sdk # or npm install @axionax/sdk</code>
          </pre>

          <h2>Core Features</h2>

          <h3>1. Creating a Client</h3>
          <p>
            The client is the primary entry point for blockchain interactions.
          </p>
          <pre>
            <code>
              import &#123; createClient, AXIONAX_TESTNET_CONFIG &#125; from
              '@axionax/sdk'; import &#123; ethers &#125; from 'ethers'; //
              Read-only client const client =
              createClient(AXIONAX_TESTNET_CONFIG); // Client with Signer (for
              transactions) const provider = new
              ethers.BrowserProvider(window.ethereum); const signer = await
              provider.getSigner(); const activeClient = createClient(&#123;
              ...AXIONAX_TESTNET_CONFIG, provider, signer &#125;);
            </code>
          </pre>

          <h3>2. Escrow Management (Marketplace)</h3>
          <p>Interact with compute workers using built-in escrow logic.</p>
          <pre>
            <code>
              // Deposit 5 AXX for a compute job const amount = BigInt(5 *
              1e18); // 5 AXX in wei await activeClient.depositEscrow('job-123',
              amount); // Check status const status = await
              activeClient.getEscrowStatus('job-123'); console.log('Escrow
              Status:', status.status); // 'Deposited', 'Released', etc. //
              Release funds when job is done await
              activeClient.releaseEscrow('job-123');
            </code>
          </pre>

          <h3>3. Network Utils</h3>
          <pre>
            <code>
              const balance = await client.getBalance('0x...'); const chainId =
              await client.getChainId();
            </code>
          </pre>

          <h2>Integration in React/Next.js</h2>
          <p>
            We recommend initializing the SDK within a React Context or a custom
            hook (e.g., <code>useAxionax()</code>) to maintain a single instance
            of the client across your dApp.
          </p>
        </div>
      </div>
    </div>
  );
}
