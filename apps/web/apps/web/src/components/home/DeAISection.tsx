import React from 'react';
import Link from 'next/link';

export default function DeAISection(): React.JSX.Element {
  return (
    <section className="py-20 bg-[#0A0A0F] border-y border-white/5">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Decentralized AI
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-white">Next-Gen </span>
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">DeAI</span>
              <span className="text-white"> Layer</span>
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-400 leading-relaxed max-w-xl">
              Axionax isn&apos;t just a blockchain—it&apos;s a decentralized
              intelligence network. Our unique{' '}
              <span className="text-blue-400">Python DeAI Layer</span> allows
              validators to perform complex AI tasks like ASR (Automated Speech
              Recognition) and Fraud Detection directly on-chain.
            </p>

            {/* Feature List */}
            <ul className="space-y-6 pt-2">
              {[
                {
                  title: 'Python Integration',
                  desc: 'Native PyO3 bindings for seamless AI model execution.',
                },
                {
                  title: 'Proof of Probabilistic Checking',
                  desc: 'Consensus mechanism optimized for non-deterministic AI outputs.',
                },
                {
                  title: 'Verifiable Inference',
                  desc: 'Cryptographically proven AI task execution.',
                },
              ].map((item, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Button */}
            <div className="pt-4">
              <Link href="/docs/deai">
                <button className="px-6 py-3 rounded-xl border-2 border-blue-500 text-white bg-transparent hover:bg-blue-500/20 transition-all duration-200 font-semibold">
                  Explore DeAI Architecture
                </button>
              </Link>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative lg:pl-8">
            <div className="relative rounded-xl border border-white/10 bg-black/30 overflow-hidden">
              {/* Top Bar */}
              <div className="flex items-center px-4 py-3 bg-white/5 border-b border-white/10 relative">
                <div className="flex gap-2 absolute left-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="w-full text-center text-xs text-gray-500 font-mono">
                  deai_worker.py
                </div>
              </div>

              {/* Code */}
              <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
                <div className="space-y-1.5 min-w-[400px]">
                  <div>
                    <span className="text-red-400">import</span>{' '}
                    <span className="text-white">torch</span>
                  </div>
                  <div>
                    <span className="text-red-400">from</span>{' '}
                    <span className="text-white">axionax.deai</span>{' '}
                    <span className="text-red-400">import</span>{' '}
                    <span className="text-blue-400">Validator</span>
                  </div>
                  <div className="h-4" />
                  <div>
                    <span className="text-red-400">class</span>{' '}
                    <span className="text-blue-400">DeAIWorker</span>
                    <span className="text-white">(Validator):</span>
                  </div>
                  <div className="pl-6">
                    <span className="text-red-400">def</span>{' '}
                    <span className="text-blue-400">process_task</span>
                    <span className="text-white">(self, data):</span>
                  </div>
                  <div className="pl-12 text-gray-500"># Load AI Model</div>
                  <div className="pl-12 text-white">
                    model = self.
                    <span className="text-blue-400">load_model</span>(
                    <span className="text-green-400">
                      &quot;whisper-v3&quot;
                    </span>
                    )
                  </div>
                  <div className="pl-12 text-white">
                    result = model.
                    <span className="text-blue-400">transcribe</span>(data)
                  </div>
                  <div className="h-4" />
                  <div className="pl-12 text-gray-500">
                    # Submit Verification Proof
                  </div>
                  <div className="pl-12 text-white">
                    proof = self.
                    <span className="text-blue-400">generate_proof</span>
                    (result)
                  </div>
                  <div className="pl-12">
                    <span className="text-red-400">return</span>{' '}
                    <span className="text-white">self.</span>
                    <span className="text-blue-400">submit_to_chain</span>
                    <span className="text-white">(proof)</span>
                  </div>
                </div>
              </div>

              {/* Subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
