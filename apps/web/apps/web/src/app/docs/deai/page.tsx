import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function DeAIDocsPage() {
  return (
    <div className="container-custom py-24 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium uppercase tracking-wider">
            Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
            DeAI Architecture
          </h1>
          <p className="text-xl text-starlight/70 max-w-2xl mx-auto">
            Learn how Axionax integrates Python-based AI models directly into
            the consensus layer.
          </p>
        </div>

        {/* Core Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors">
            <h3 className="text-2xl font-bold text-starlight mb-4">
              Python DeAI Layer
            </h3>
            <p className="text-starlight/70 mb-6 leading-relaxed">
              Validators run a dedicated Python sidecar process that executes AI
              models. This allows for seamless integration with PyTorch,
              TensorFlow, and Hugging Face libraries.
            </p>
            <div className="p-4 rounded-lg bg-black/40 font-mono text-sm text-blue-300 border border-white/5">
              from axionax.deai import Validator
              <br />
              class MyWorker(Validator): ...
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
            <h3 className="text-2xl font-bold text-starlight mb-4">
              Proof of Probabilistic Checking
            </h3>
            <p className="text-starlight/70 mb-6 leading-relaxed">
              Unlike traditional PoS, PoPC verifies AI outputs using statistical
              sampling. Validators are scored based on the accuracy and latency
              of their inference results.
            </p>
            <ul className="space-y-2 text-starlight/60 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Confidence Score &gt; 99.9%
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Slashing for malicious results
              </li>
            </ul>
          </div>
        </div>

        {/* Implementation Steps */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-starlight">Getting Started</h2>

          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'Install the SDK',
                code: 'pip install axionax-deai',
              },
              {
                step: '02',
                title: 'Initialize Worker',
                code: 'axionax-cli init --worker my-ai-node',
              },
              {
                step: '03',
                title: 'Deploy Model',
                code: 'axionax-cli deploy ./model.pt --network testnet',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-6 p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="text-4xl font-bold text-white/10 font-mono">
                  {item.step}
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-semibold text-starlight">
                    {item.title}
                  </h3>
                  <div className="p-3 rounded-lg bg-black/60 font-mono text-sm text-green-400 border border-white/5">
                    $ {item.code}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-12 border-t border-white/10">
          <h3 className="text-2xl font-bold text-starlight mb-6">
            Ready to build?
          </h3>
          <div className="flex justify-center gap-4">
            <Link href="/docs">
              <Button variant="primary" size="lg">
                View Full Documentation
              </Button>
            </Link>
            <Link href="https://github.com/axionaxprotocol" target="_blank">
              <Button variant="outline" size="lg">
                GitHub Repository
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
