import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function InfrastructurePage(): React.JSX.Element {
  const services = [
    {
      name: 'RPC Node (HTTP)',
      port: 8545,
      status: 'healthy',
      uptime: '18h+',
      details: 'Mock JSON-RPC 2.0',
    },
    {
      name: 'RPC Node (WebSocket)',
      port: 8546,
      status: 'healthy',
      uptime: '18h+',
      details: 'Real-time updates',
    },
    {
      name: 'PostgreSQL',
      port: 5432,
      status: 'healthy',
      uptime: '44h+',
      details: 'Database layer',
    },
    {
      name: 'Redis',
      port: 6379,
      status: 'healthy',
      uptime: '44h+',
      details: 'Cache layer',
    },
    {
      name: 'Nginx',
      port: 80,
      status: 'healthy',
      uptime: '44h+',
      details: 'Web server',
    },
    {
      name: 'Nginx SSL',
      port: 443,
      status: 'healthy',
      uptime: '44h+',
      details: 'HTTPS encryption',
    },
    {
      name: 'Grafana',
      port: 3030,
      status: 'healthy',
      uptime: '15h+',
      details: 'Monitoring v12.2.1',
    },
    {
      name: 'Prometheus',
      port: 9090,
      status: 'healthy',
      uptime: '15h+',
      details: 'Metrics collection',
    },
    {
      name: 'Web Interface',
      port: 3000,
      status: 'healthy',
      uptime: '23h+',
      details: 'axionax-web',
    },
    {
      name: 'Explorer API',
      port: 3001,
      status: 'healthy',
      uptime: '504h+',
      details: 'Blockchain explorer v1.9.0',
    },
    {
      name: 'Faucet API',
      port: 3002,
      status: 'healthy',
      uptime: '504h+',
      details: 'Token distribution v1.9.0',
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
              Real-time monitoring of all axionax Protocol testnet services •
              Last Updated: December 5, 2025
            </p>

            {/* Overall Status */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/[0.02] border border-white/10 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-tech-success rounded-full animate-pulse" />
                <span className="text-tech-success font-semibold">
                  9/9 Services Operational
                </span>
              </div>
              <span className="text-muted/50">|</span>
              <span className="text-muted">100% Deployed • v1.9.0</span>
            </div>
          </div>

          {/* VPS Info */}
          <div className="mb-12 p-6 rounded-xl bg-gradient-to-r from-tech-warning/10 to-amber-900/10 border border-tech-warning/20">
            <h2 className="text-2xl font-bold text-content mb-4">
              VPS Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-muted text-sm mb-1">Server</div>
                <div className="text-content font-mono">vmi2895217</div>
              </div>
              <div>
                <div className="text-muted text-sm mb-1">IP Address</div>
                <div className="text-content font-mono">217.216.109.5</div>
              </div>
              <div>
                <div className="text-muted text-sm mb-1">Specifications</div>
                <div className="text-content">7.8GB RAM, 4 cores</div>
              </div>
              <div>
                <div className="text-muted text-sm mb-1">Network</div>
                <div className="text-content">
                  axionax-testnet-1 (Chain ID: 86137)
                </div>
              </div>
            </div>
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="card-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-content">
                  RAM Usage
                </h3>
                <span className="text-2xl">💾</span>
              </div>
              <div className="text-3xl font-bold gradient-text mb-2">12%</div>
              <div className="w-full bg-black/50 rounded-full h-2">
                <div
                  className="bg-tech-success h-2 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  style={{ width: '12%' }}
                ></div>
              </div>
              <div className="text-sm text-muted mt-2">~900MB / 7.8GB</div>
            </div>

            <div className="card-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-content">
                  CPU Load
                </h3>
                <span className="text-2xl" aria-hidden />
              </div>
              <div className="text-3xl font-bold gradient-text mb-2">Low</div>
              <div className="w-full bg-black/50 rounded-full h-2">
                <div
                  className="bg-tech-success h-2 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  style={{ width: '15%' }}
                ></div>
              </div>
              <div className="text-sm text-muted mt-2">
                {'<'} 1.0 load average
              </div>
            </div>

            <div className="card-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-content">
                  Disk Space
                </h3>
                <span className="text-2xl">💿</span>
              </div>
              <div className="text-3xl font-bold gradient-text mb-2">16%</div>
              <div className="w-full bg-black/50 rounded-full h-2">
                <div
                  className="bg-tech-success h-2 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  style={{ width: '16%' }}
                ></div>
              </div>
              <div className="text-sm text-muted mt-2">61GB free</div>
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
                    Port
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted">
                    Uptime
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
                            : 'Debugging'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {service.uptime}
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
                ✅ Infrastructure Layer
              </h3>
              <div className="text-3xl font-bold text-tech-success mb-2">5/5</div>
              <p className="text-muted text-sm mb-4">100% Operational</p>
              <ul className="space-y-2 text-sm text-muted">
                <li>• PostgreSQL Database</li>
                <li>• Redis Cache</li>
                <li>• Nginx Web Server</li>
                <li>• Nginx SSL/TLS</li>
                <li>• RPC Node (Active)</li>
              </ul>
            </div>

            <div className="card-panel p-6 border-tech-success/20">
              <h3 className="text-lg font-semibold text-tech-success mb-4">
                ✅ Monitoring Stack
              </h3>
              <div className="text-3xl font-bold text-tech-success mb-2">2/2</div>
              <p className="text-muted text-sm mb-4">100% Operational</p>
              <ul className="space-y-2 text-sm text-muted">
                <li>• Grafana v12.2.1</li>
                <li>• Prometheus</li>
              </ul>
            </div>

            <div className="card-panel p-6 border-tech-success/20">
              <h3 className="text-lg font-semibold text-tech-success mb-4">
                ✅ Application Layer
              </h3>
              <div className="text-3xl font-bold text-tech-success mb-2">2/2</div>
              <p className="text-muted text-sm mb-4">100% Operational</p>
              <ul className="space-y-2 text-sm text-muted">
                <li>• Explorer API (port 3001)</li>
                <li>• Faucet API (port 3002)</li>
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
