import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function InfrastructurePage(): React.JSX.Element {
  const services = [
    {
      name: 'Validator EU (axionax-node)',
      port: 8545,
      status: 'healthy',
      host: 'VPS 1 · 217.76.61.116',
      details: 'Genesis validator + RPC (EU)',
    },
    {
      name: 'Validator AU (axionax-node)',
      port: 8545,
      status: 'healthy',
      host: 'VPS 2 · 46.250.244.4',
      details: 'Genesis validator + RPC (AU)',
    },
    {
      name: 'P2P (both validators)',
      port: 30303,
      status: 'healthy',
      host: 'VPS 1 & VPS 2',
      details: 'libp2p gossip, peer discovery',
    },
    {
      name: 'Nginx reverse-proxy',
      port: 443,
      status: 'healthy',
      host: 'VPS 3 · 217.216.109.5',
      details: 'rpc.axionax.org → VPS 1/2, TLS termination',
    },
    {
      name: 'Faucet',
      port: 3002,
      status: 'healthy',
      host: 'VPS 3 · 217.216.109.5',
      details: 'docker-compose.vps3-faucet.yml (v1.9.0)',
    },
    {
      name: 'PostgreSQL',
      port: 5432,
      status: 'healthy',
      host: 'VPS 3',
      details: 'Faucet / optional Explorer',
    },
    {
      name: 'Redis',
      port: 6379,
      status: 'healthy',
      host: 'VPS 3',
      details: 'Rate-limit + cache layer',
    },
    {
      name: 'Grafana',
      port: 3030,
      status: 'healthy',
      host: 'VPS 3',
      details: 'Monitoring v12.2.1',
    },
    {
      name: 'Prometheus',
      port: 9090,
      status: 'healthy',
      host: 'VPS 3',
      details: 'Metrics collection (15s scrape)',
    },
    {
      name: 'Web Interface',
      port: 3000,
      status: 'healthy',
      host: 'axionax.org',
      details: 'apps/web (Next.js 14)',
    },
    {
      name: 'Explorer (optional)',
      port: 3001,
      status: 'debugging',
      host: 'VPS 3',
      details: 'Enabled post-launch if RAM permits',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-500/20';
      case 'debugging':
        return 'text-amber-400 bg-amber-500/20';
      default:
        return 'text-red-400 bg-red-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'debugging':
        return '🔧';
      default:
        return '❌';
    }
  };

  return (
    <div className="min-h-screen">
      <main className="section pt-8">
        <div className="container-custom">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="gradient-text mb-4">Infrastructure Status v1.9.0</h1>
            <p className="text-xl text-muted mb-8">
              Three-VPS topology for the Genesis Public Testnet •
              Last Updated: April 24, 2026
            </p>

            {/* Overall Status */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/[0.02] border border-white/10 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-tech-success rounded-full animate-pulse" />
                <span className="text-tech-success font-semibold">
                  Genesis Public Testnet — Pre-launch
                </span>
              </div>
              <span className="text-muted/50">|</span>
              <span className="text-muted">Chain ID 86137 • v1.9.0</span>
            </div>
          </div>

          {/* VPS Topology */}
          <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="text-muted text-xs uppercase tracking-widest mb-2">VPS 1 — Validator (EU)</div>
              <div className="text-content font-mono mb-2">217.76.61.116</div>
              <div className="text-muted text-sm">axionax-node · RPC 8545 · P2P 30303</div>
              <div className="text-muted text-xs mt-3">4 vCPU · 8 GB RAM · 75 GB SSD</div>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="text-muted text-xs uppercase tracking-widest mb-2">VPS 2 — Validator (AU)</div>
              <div className="text-content font-mono mb-2">46.250.244.4</div>
              <div className="text-muted text-sm">axionax-node · RPC 8545 · P2P 30303</div>
              <div className="text-muted text-xs mt-3">4 vCPU · 8 GB RAM · 75 GB SSD</div>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="text-muted text-xs uppercase tracking-widest mb-2">VPS 3 — Infra hub</div>
              <div className="text-content font-mono mb-2">217.216.109.5</div>
              <div className="text-muted text-sm">Nginx · Faucet · Postgres · Redis</div>
              <div className="text-muted text-xs mt-3">No chain node — proxies to VPS 1/2</div>
            </div>
          </div>

          {/* Genesis card */}
          <div className="mb-12 p-6 rounded-xl bg-gradient-to-r from-tech-cyan/10 to-blue-900/10 border border-tech-cyan/20">
            <h2 className="text-2xl font-bold text-content mb-4">
              Genesis parameters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-muted text-sm mb-1">Chain ID</div>
                <div className="text-content font-mono">86137 (0x15079)</div>
              </div>
              <div>
                <div className="text-muted text-sm mb-1">Native token</div>
                <div className="text-content">AXX (18 decimals)</div>
              </div>
              <div>
                <div className="text-muted text-sm mb-1">Block time</div>
                <div className="text-content">2 seconds (genesis)</div>
              </div>
              <div>
                <div className="text-muted text-sm mb-1">Core ref</div>
                <div className="text-content font-mono">
                  axionax-core-universe@28f42cf
                </div>
              </div>
              <div className="md:col-span-4">
                <div className="text-muted text-sm mb-1">Genesis SHA-256</div>
                <div className="text-content font-mono text-xs break-all">
                  0xed1bdac7c278e5b4f58a1eceb7594a4238e39bb63e1018e38ec18a555c762b55
                </div>
              </div>
            </div>
          </div>

          {/* Services Table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm bg-black-hole/50">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted">
                    Service
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted">
                    Host
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted">
                    Port
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {services.map((service) => (
                  <tr
                    key={`${service.name}-${service.port}`}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4 text-content font-medium">
                      {service.name}
                    </td>
                    <td className="px-6 py-4 text-muted font-mono text-xs">
                      {service.host}
                    </td>
                    <td className="px-6 py-4 text-muted font-mono">
                      {service.port}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}
                      >
                        <span>{getStatusIcon(service.status)}</span>
                        <span>
                          {service.status === 'healthy'
                            ? 'Healthy'
                            : 'Optional'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted text-sm">
                      {service.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Service Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="card-panel p-6 border-tech-success/20">
              <h3 className="text-lg font-semibold text-tech-success mb-4">
                ✅ Validator Layer
              </h3>
              <div className="text-3xl font-bold text-tech-success mb-2">
                2/2
              </div>
              <p className="text-muted text-sm mb-4">Genesis validators online</p>
              <ul className="space-y-2 text-sm text-muted">
                <li>• Validator EU (217.76.61.116)</li>
                <li>• Validator AU (46.250.244.4)</li>
                <li>• P2P 30303, RPC 8545</li>
              </ul>
            </div>

            <div className="card-panel p-6 border-tech-success/20">
              <h3 className="text-lg font-semibold text-tech-success mb-4">
                ✅ VPS 3 Infra Hub
              </h3>
              <div className="text-3xl font-bold text-tech-success mb-2">
                4/4
              </div>
              <p className="text-muted text-sm mb-4">Nginx + Faucet + DB</p>
              <ul className="space-y-2 text-sm text-muted">
                <li>• Nginx reverse-proxy (80/443)</li>
                <li>• Faucet (3002)</li>
                <li>• Postgres + Redis</li>
              </ul>
            </div>

            <div className="card-panel p-6 border-tech-success/20">
              <h3 className="text-lg font-semibold text-tech-success mb-4">
                ✅ Monitoring
              </h3>
              <div className="text-3xl font-bold text-tech-success mb-2">
                2/2
              </div>
              <p className="text-muted text-sm mb-4">Grafana + Prometheus</p>
              <ul className="space-y-2 text-sm text-muted">
                <li>• Grafana v12.2.1 (3030)</li>
                <li>• Prometheus (9090)</li>
                <li>• 15s scrape interval</li>
              </ul>
            </div>
          </div>

          {/* Links */}
          <div className="mt-12 p-6 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-content mb-4">
              Diagnostic Tools & Documentation
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/infrastructure/nodes"
                className="px-4 py-2 bg-tech-cyan/10 border border-tech-cyan/20 rounded-lg text-tech-cyan hover:bg-tech-cyan/20 transition-colors flex items-center gap-2"
              >
                Detailed Node Health Check <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/axionaxprotocol/axionax-docs/blob/main/INFRASTRUCTURE_STATUS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-tech-warning/10 border border-tech-warning/20 rounded-lg text-tech-warning hover:bg-tech-warning/20 transition-colors"
              >
                Infrastructure Status Dashboard →
              </a>
              <a
                href="https://github.com/axionaxprotocol/axionax-docs/blob/main/HEALTH_CHECKS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-tech-cyan/10 border border-tech-cyan/20 rounded-lg text-tech-cyan hover:bg-tech-cyan/20 transition-colors"
              >
                Health Checks Guide →
              </a>
              <a
                href="https://github.com/axionaxprotocol/axionax-docs/blob/main/MONITORING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-tech-cyan/10 border border-tech-cyan/20 rounded-lg text-tech-cyan hover:bg-tech-cyan/20 transition-colors"
              >
                Monitoring Setup →
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
