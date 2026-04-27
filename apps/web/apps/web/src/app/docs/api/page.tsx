import React from 'react';
import Link from 'next/link';

export default function ApiReferenceDoc(): React.JSX.Element {
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
          API Reference
        </h1>

        <div className="card-panel p-8 prose prose-invert max-w-none prose-headings:text-content prose-p:text-muted prose-a:text-tech-cyan hover:prose-a:text-tech-cyan-hover prose-pre:bg-[#0D0B14] prose-pre:border prose-pre:border-white/10 prose-code:text-tech-cyan">
          <p className="text-lg">
            The Axionax RPC API is fully compatible with standard Ethereum
            JSON-RPC specifications, allowing you to use existing tools like
            ethers.js, viem, or web3.js seamlessly.
          </p>

          <h2>RPC Endpoints</h2>
          <ul>
            <li>
              <strong>Global Gateway:</strong>{' '}
              <code>https://rpc.axionax.org</code>
            </li>
            <li>
              <strong>EU Region:</strong> <code>http://217.76.61.116:8545</code>
            </li>
            <li>
              <strong>AU Region:</strong> <code>http://46.250.244.4:8545</code>
            </li>
          </ul>

          <h2>Standard Methods</h2>
          <p>
            All standard <code>eth_*</code> methods are supported. Below are
            common examples.
          </p>

          <h3>eth_blockNumber</h3>
          <p>Returns the number of the most recent block.</p>
          <pre>
            <code>
              {`curl -X POST https://rpc.axionax.org \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`}
            </code>
          </pre>

          <h3>eth_getBalance</h3>
          <p>Returns the balance of the account of given address.</p>
          <pre>
            <code>
              {`curl -X POST https://rpc.axionax.org \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xYourAddress","latest"],"id":1}'`}
            </code>
          </pre>

          <h2>DeAI Custom Methods</h2>
          <p>
            Axionax introduces custom RPC methods for interacting with the
            Decentralized AI (DeAI) layer. These will be available in Protocol
            v2.0.
          </p>

          <h3>deai_submitTask</h3>
          <p>
            Submit an AI task (e.g., ASR inference) to the validator network.
          </p>
          <pre>
            <code>
              {`// Coming in v2.0
// Requires PoPC (Proof of Probabilistic Checking) validation`}
            </code>
          </pre>

          <h2>Rate Limits</h2>
          <p>
            The public RPC endpoint (<code>https://rpc.axionax.org</code>) is
            rate-limited to <strong>100 requests per second</strong> per IP. For
            production applications, we recommend running your own RPC node. See
            the <Link href="/docs/deployment">Deployment Guide</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
