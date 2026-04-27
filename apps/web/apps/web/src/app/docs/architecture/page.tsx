import React from 'react';
import Link from 'next/link';

export default function ArchitectureDoc(): React.JSX.Element {
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
          Architecture & DeAI Layer
        </h1>

        <div className="card-panel p-8 prose prose-invert max-w-none prose-headings:text-content prose-p:text-muted prose-a:text-tech-cyan hover:prose-a:text-tech-cyan-hover prose-pre:bg-[#0D0B14] prose-pre:border prose-pre:border-white/10 prose-code:text-tech-cyan">
          <p className="text-lg">
            The Axionax Protocol is a Layer-1 blockchain designed specifically
            for Decentralized AI (DeAI) workloads. It combines traditional PoS
            consensus for transactions with a novel Proof of Probabilistic
            Checking (PoPC) mechanism for verifiable inference.
          </p>

          <h2>Core Blockchain</h2>
          <p>
            At its foundation, Axionax is EVM-compatible. Smart contracts are
            written in Solidity, and users interact with the network using
            standard Ethereum tooling. However, the underlying node software is
            custom-built in Rust to maximize performance and memory safety.
          </p>

          <h2>The DeAI Layer</h2>
          <p>
            Traditional blockchains cannot perform heavy AI computations (like
            Automatic Speech Recognition or Fraud Detection) because every node
            must redundantly execute every instruction to reach consensus. AI
            models are non-deterministic and computationally expensive.
          </p>
          <p>
            Axionax solves this using the <strong>DeAI Layer</strong>:
          </p>
          <ul>
            <li>
              <strong>Python Integration:</strong> Validators embed a Python
              runtime via PyO3, allowing them to load PyTorch, TensorFlow, or
              Whisper models directly into node memory.
            </li>
            <li>
              <strong>Off-Chain Execution:</strong> Heavy ML tasks are executed
              off-chain by a subset of specialized "Worker Nodes".
            </li>
            <li>
              <strong>Proof of Probabilistic Checking (PoPC):</strong> Instead
              of all nodes repeating the work, a single node generates a
              cryptographically sound "proof of execution". A random committee
              of validators checks this proof probabilistically. If the proof is
              valid with 99.99% confidence, the result is committed on-chain.
            </li>
          </ul>

          <h2>Marketplace Integration</h2>
          <p>
            Developers can lease compute resources via the{' '}
            <Link href="/marketplace">Axionax Marketplace</Link>. Transactions
            are handled by an Escrow smart contract:
          </p>
          <ol>
            <li>User deposits AXX tokens into an Escrow contract for Job X.</li>
            <li>Worker node performs the AI task.</li>
            <li>
              Worker node submits the result and PoPC proof to the network.
            </li>
            <li>Validators verify the proof.</li>
            <li>
              If verified, the Escrow contract automatically releases the AXX
              tokens to the worker.
            </li>
          </ol>

          <h2>Security & Audits</h2>
          <p>
            The protocol ensures economic finality. Malicious workers who submit
            invalid proofs face immediate slashing of their staked AXX tokens.
            The v1.9.0 testnet is actively undergoing security audits to
            validate these economic incentives.
          </p>
        </div>
      </div>
    </div>
  );
}
