import { useMemo, useState, type ReactElement } from 'react';
import { OracleChat } from '@axionax/ui/OracleChat';
import { EscrowPanel } from './components/EscrowPanel';
import { MockBadge } from './components/MockBadge';

/** Mock workers – แบบ io.net explorer (Chip / QTY / Price) */
const mockASRWorkers = [
  {
    id: 'asr-001',
    name: 'Whisper Large V3',
    qty: 8,
    specs: '32 vCPU, 128 GB RAM',
    pricePerHour: 0.39,
  },
  {
    id: 'asr-002',
    name: 'Conformer-1 H100',
    qty: 32,
    specs: '80GB HBM3',
    pricePerHour: 0.19,
  },
  {
    id: 'asr-003',
    name: 'axionax-asr-worker-1',
    qty: 16,
    specs: 'Whisper Large V3, 32 vCPU',
    pricePerHour: 0.1,
  },
  {
    id: 'asr-004',
    name: 'axionax-asr-worker-2',
    qty: 24,
    specs: 'Conformer-1, 16 vCPU',
    pricePerHour: 0.08,
  },
  {
    id: 'asr-005',
    name: 'ASR Real-time Lite',
    qty: 41,
    specs: '16 vCPU, 32 GB RAM',
    pricePerHour: 0.06,
  },
  {
    id: 'asr-006',
    name: 'ASR Batch Large',
    qty: 12,
    specs: '64 vCPU, 256 GB RAM',
    pricePerHour: 0.25,
  },
  {
    id: 'asr-007',
    name: 'Multilingual ASR',
    qty: 28,
    specs: '24 vCPU, 64 GB RAM',
    pricePerHour: 0.07,
  },
  {
    id: 'asr-008',
    name: 'Streaming ASR',
    qty: 56,
    specs: '8 vCPU, 16 GB RAM',
    pricePerHour: 0.04,
  },
];

export function App(): ReactElement {
  const [selected, setSelected] = useState<string | null>(null);
  const totalCost = useMemo(() => {
    if (!selected) return 0;
    const worker = mockASRWorkers.find((w) => w.id === selected);
    return worker ? worker.pricePerHour : 0;
  }, [selected]);

  return (
    <>
      <div className="min-h-screen mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header – แบบ io.net explorer */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Trending Devices
            </h1>
            <MockBadge show label="Workers & Escrow" />
          </div>
          <p className="text-center text-amber-200/80 text-sm sm:text-base max-w-2xl mx-auto">
            Discover ASR (Automatic Speech Recognition) workers for ML/AI tasks.
            Rent with AXX tokens via Auto-Selection Router.
          </p>
        </header>

        {/* Table – Chip | QTY | Price (สีทองเป็นหลัก) */}
        <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 overflow-hidden shadow-lg shadow-amber-500/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-amber-500/30 bg-amber-500/10">
                  <th className="px-4 py-3 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-amber-400/90">
                    Chip / Worker
                  </th>
                  <th className="px-4 py-3 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-amber-400/90 text-center whitespace-nowrap">
                    QTY
                  </th>
                  <th className="px-4 py-3 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-amber-400/90 text-right whitespace-nowrap">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/20">
                {mockASRWorkers.map((worker) => (
                  <tr
                    key={worker.id}
                    onClick={() => setSelected(worker.id)}
                    className={`
                    transition-colors cursor-pointer
                    hover:bg-amber-500/10
                    ${selected === worker.id ? 'bg-amber-500/20 ring-inset ring-1 ring-amber-400/50' : 'bg-transparent'}
                  `}
                  >
                    <td className="px-4 py-3 sm:px-6 py-4">
                      <div className="font-medium text-amber-100">
                        {worker.name}
                      </div>
                      <div className="text-xs text-amber-300/60 mt-0.5">
                        {worker.specs}
                      </div>
                    </td>
                    <td className="px-4 py-3 sm:px-6 py-4 text-center text-amber-200/80 font-mono">
                      {worker.qty}
                    </td>
                    <td className="px-4 py-3 sm:px-6 py-4 text-right">
                      <span className="font-semibold text-amber-400">
                        {worker.pricePerHour.toFixed(2)}
                      </span>
                      <span className="text-amber-400/70 text-sm ml-1">
                        AXX/hr
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Escrow / Selection – กล่องสีทอง */}
        <footer className="mt-10 rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 sm:p-8 shadow-lg shadow-amber-500/10">
          {selected ? (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-amber-200/80 text-sm uppercase tracking-wider">
                    Selected
                  </p>
                  <p className="text-xl font-semibold text-amber-100 mt-1">
                    {mockASRWorkers.find((w) => w.id === selected)?.name ??
                      selected}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-amber-200/80 text-sm uppercase tracking-wider">
                    Total cost
                  </p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    {totalCost.toFixed(2)}{' '}
                    <span className="text-amber-400/70 font-normal text-lg">
                      AXX/hr
                    </span>
                  </p>
                </div>
              </div>
              <div className="border-t border-amber-500/20 pt-6">
                <h3 className="text-lg font-semibold text-amber-200 mb-4">
                  Escrow Management
                </h3>
                <EscrowPanel
                  jobId={`job-${selected}-${Date.now().toString().slice(-4)}`}
                  className="w-full max-w-lg"
                />
              </div>
            </div>
          ) : (
            <p className="text-center text-amber-300/70 py-4">
              Select a device above to see pricing and manage escrow.
            </p>
          )}
        </footer>
      </div>
      <OracleChat />
    </>
  );
}

export default App;
