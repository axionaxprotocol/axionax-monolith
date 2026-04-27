import React from 'react';
import Link from 'next/link';

export default function DeploymentDoc(): React.JSX.Element {
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
          Deployment & Node Setup
        </h1>

        <div className="card-panel p-8 prose prose-invert max-w-none prose-headings:text-content prose-p:text-muted prose-a:text-tech-cyan hover:prose-a:text-tech-cyan-hover prose-pre:bg-[#0D0B14] prose-pre:border prose-pre:border-white/10 prose-code:text-tech-cyan">
          <p className="text-lg">
            This guide explains how to deploy an Axionax Validator Node or a
            dedicated RPC Node on a Linux VPS.
          </p>

          <h2>Hardware Requirements</h2>
          <ul>
            <li>
              <strong>CPU:</strong> 4+ cores (8+ cores recommended for
              Validator)
            </li>
            <li>
              <strong>RAM:</strong> 16GB+ (32GB+ for DeAI workloads)
            </li>
            <li>
              <strong>Storage:</strong> 500GB+ NVMe SSD
            </li>
            <li>
              <strong>OS:</strong> Ubuntu 22.04 LTS or Debian 12
            </li>
          </ul>

          <h2>1. RPC Node Deployment</h2>
          <p>
            Running your own RPC node is the best way to ensure reliable,
            high-performance connectivity for your dApp without rate limits.
          </p>
          <pre>
            <code>
              # Clone the core repository git clone
              https://github.com/axionaxprotocol/axionax-core.git cd
              axionax-core # Start the node in RPC mode via Docker
              docker-compose -f docker-compose.rpc.yml up -d
            </code>
          </pre>
          <p>
            Your node will begin syncing. It exposes port <code>8545</code> for
            JSON-RPC and <code>8546</code> for WebSocket.
          </p>

          <h2>2. Validator Node Setup (Testnet)</h2>
          <p>
            Validators participate in the PoPC consensus mechanism and process
            DeAI tasks.
          </p>
          <pre>
            <code>
              # Generate new validator keys ./scripts/generate_keys.sh # Start
              the validator node VALIDATOR_PRIVATE_KEY="your_key" docker-compose
              up -d
            </code>
          </pre>

          <h3>Network Ports</h3>
          <p>Ensure the following ports are open in your firewall:</p>
          <ul>
            <li>
              <strong>30303 (TCP/UDP):</strong> P2P Networking
            </li>
            <li>
              <strong>8545 (TCP):</strong> JSON-RPC (Limit access to localhost
              or specific IPs)
            </li>
          </ul>

          <h2>3. Web Interface Deployment</h2>
          <p>
            To self-host the Axionax Web Universe (this website, including the
            Explorer and Marketplace):
          </p>
          <pre>
            <code>
              # Clone the web repository git clone
              https://github.com/axionaxprotocol/axionax-web-universe.git cd
              axionax-web-universe # Run the deployment script bash
              scripts/vps-setup-from-git.sh
            </code>
          </pre>
          <p>
            This script automatically installs Node.js, pnpm, builds the
            monorepo, and configures PM2 for process management.
          </p>
        </div>
      </div>
    </div>
  );
}
