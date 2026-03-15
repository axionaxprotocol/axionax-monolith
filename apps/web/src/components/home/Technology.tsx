import React from 'react';
import Badge from '@/components/ui/Badge';

// Technology component - Display tech stack information
export default function Technology(): React.JSX.Element {
  const techStack = [
    {
      category: 'Core',
      items: [
        { name: 'Rust', description: 'High-performance systems programming' },
        { name: 'Tokio', description: 'Async runtime for Rust' },
        { name: 'RocksDB', description: 'Persistent key-value store' },
      ],
    },
    {
      category: 'Networking',
      items: [
        { name: 'libp2p', description: 'P2P networking framework' },
        { name: 'Gossipsub', description: 'Pub/sub message propagation' },
        { name: 'Kademlia', description: 'DHT for peer discovery' },
      ],
    },
    {
      category: 'Cryptography',
      items: [
        { name: 'Ed25519', description: 'Digital signatures' },
        { name: 'VRF', description: 'Verifiable random functions' },
        { name: 'Blake2b', description: 'Fast cryptographic hashing' },
      ],
    },
    {
      category: 'Consensus',
      items: [
        { name: 'PoPC', description: 'Proof of Probabilistic Checking' },
        { name: 'BFT', description: 'Byzantine Fault Tolerance' },
        { name: 'Finality Gadget', description: 'Fast finality mechanism' },
      ],
    },
  ];

  return (
    <section className="section bg-dark-900/50">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="gradient-text mb-4">Technology Stack</h2>
          <p className="text-dark-400 text-lg max-w-2xl mx-auto">
            Built with industry-leading technologies for maximum performance and
            security
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {techStack.map((tech, categoryIndex) => (
            <div
              key={tech.category}
              className="animate-fade-in-up"
              style={
                {
                  animationDelay: `${categoryIndex * 100}ms`,
                } as React.CSSProperties
              }
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-primary rounded-full" />
                {tech.category}
              </h3>
              <div className="space-y-4">
                {tech.items.map((item) => (
                  <div key={item.name} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="info">{item.name}</Badge>
                    </div>
                    <p className="text-sm text-dark-500 group-hover:text-dark-400 transition-colors">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Code Example */}
        <div className="mt-16 card-hover">
          <h3 className="text-xl font-bold text-white mb-4">
            Quick Start Example
          </h3>
          <pre className="code-block">
            <code className="text-green-400">{`// Initialize axionax SDK
import { axionax, Wallet } from '@axionax/sdk';

const axion = new axionax({
        rpcUrl: 'https://rpc.axionax.org',
  networkId: 'testnet-v1',
});

// Create a wallet
const wallet = Wallet.fromMnemonic('your mnemonic here');

// Send a transaction
const tx = await axion.sendTransaction({
  from: wallet.address,
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  value: '1000000000000000000', // 1 AXX
  data: '0x',
});

console.log('Transaction hash:', tx.hash);`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
