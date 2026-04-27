import React from 'react';
import Badge from '@/components/ui/Badge';

// Roadmap component - Show project milestones and timeline
export default function Roadmap(): React.JSX.Element {
  const roadmapPhases = [
    {
      phase: 'Q4 2025',
      status: 'completed',
      title: 'v1.9.0 Production Ready',
      items: [
        'Rust Core (Consensus, Blockchain, Crypto)',
        'Python DeAI Layer (ASR, Fraud Detection)',
        'TypeScript SDK & PyO3 Bridge',
        'Public Testnet Launch ✓',
      ],
    },
    {
      phase: 'Q1 2026',
      status: 'active',
      title: 'Phase 2: DeAI & Expansion',
      items: [
        'DeAI Worker Integration (In Progress)',
        'RPC Infrastructure Optimization ✓',
        'Validator Network Growth',
        'Full Infrastructure Deployment ✓',
      ],
    },
    {
      phase: 'Q1-Q2 2026',
      status: 'in-progress',
      title: 'v2.0 Protocol Compliance & Testing',
      items: [
        'PoPC Parameters (s=1000, confidence=0.99) ✓',
        'ASR Configuration (K=64, max_quota=12.5%) ✓',
        'VRF Delay Implementation (k≥2) ✓',
        'Comprehensive Testing & Validation',
      ],
    },
    {
      phase: 'Q3 2026',
      status: 'upcoming',
      title: 'v2.1 Mainnet Prep',
      items: [
        'Security audits (Trail of Bits, OpenZeppelin)',
        'Permissionless validator registration',
        'Governance UI for AXX holders',
        'Emergency response system',
      ],
    },
    {
      phase: 'Q4 2026',
      status: 'planned',
      title: 'v2.0 Mainnet Genesis',
      items: [
        'Mainnet launch',
        'Complete SDK suite (Go, Rust, JS)',
        'Production marketplace',
        '100+ validator nodes',
      ],
    },
    {
      phase: '2027+',
      status: 'planned',
      title: 'Ecosystem & Beyond',
      items: [
        'Cross-chain bridges',
        '1,000+ global nodes',
        'Guardian Nodes in Space 🛰️',
        '$10M+ TVL target',
      ],
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'upcoming':
        return <Badge variant="info">Upcoming</Badge>;
      case 'active':
        return <Badge variant="success">Active</Badge>;
      default:
        return <Badge variant="default">Planned</Badge>;
    }
  };

  return (
    <section className="py-20 bg-[#0A0A0F] border-y border-white/5">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Roadmap
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Our journey to building the future of decentralized compute
          </p>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/20 via-blue-500/50 to-blue-500/20 hidden md:block" />

          <div className="space-y-8">
            {roadmapPhases.map((phase, index) => (
              <div
                key={phase.phase}
                className={`relative ${
                  index % 2 === 0 ? 'md:pr-1/2' : 'md:pl-1/2 md:ml-auto'
                }`}
              >
                {/* Timeline Dot */}
                <div className="absolute left-0 md:left-1/2 top-6 w-4 h-4 bg-blue-500 rounded-full border-4 border-[#0A0A0F] transform md:-translate-x-1/2 hidden md:block" />

                <div
                  className={`p-6 rounded-xl border border-white/10 bg-white/5 hover:border-blue-500/30 transition-all duration-200 ${
                    index % 2 === 0 ? 'md:mr-8' : 'md:ml-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-blue-400 font-medium mb-1">
                        {phase.phase}
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {phase.title}
                      </h3>
                    </div>
                    {getStatusBadge(phase.status)}
                  </div>

                  <ul className="space-y-2">
                    {phase.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="flex items-start gap-3 text-gray-400 text-sm"
                      >
                        <svg
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            phase.status === 'completed'
                              ? 'text-green-400'
                              : phase.status === 'in-progress' ||
                                  phase.status === 'active'
                                ? 'text-blue-400'
                                : 'text-gray-500'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
