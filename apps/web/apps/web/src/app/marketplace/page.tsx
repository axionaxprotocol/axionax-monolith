'use client';

import { useMemo, useState, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import MockBadge from '@/components/ui/MockBadge';
import EscrowPanel from '@/components/marketplace/EscrowPanel';
import { useMarketplaceWorkers } from '@/hooks/useMarketplaceWorkers';

export default function MarketplacePage(): React.JSX.Element {
  const {
    workers,
    loading: workersLoading,
    error: workersError,
    refetch,
    fromSource,
  } = useMarketplaceWorkers();
  const [selected, setSelected] = useState<string | null>(null);
  const totalCost = useMemo(() => {
    if (!selected) return 0;
    const worker = workers.find((w) => w.id === selected);
    return worker ? worker.pricePerHour : 0;
  }, [selected, workers]);

  const handleSelect = useCallback((id: string) => {
    setSelected((prev) => (prev === id ? null : id));
  }, []);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(id);
      }
    },
    [handleSelect]
  );

  return (
    <div className="container-custom py-8 sm:py-10 space-y-10">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-content">
            Compute Marketplace
          </h1>
          <MockBadge show label="Workers & Escrow" />
          {fromSource && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-tech-success/20 text-tech-success border border-tech-success/40"
              title="Workers loaded from network"
            >
              Live
            </span>
          )}
        </div>
        <p className="text-muted text-sm md:text-base max-w-2xl">
          Discover ASR (Automatic Speech Recognition) workers for ML/AI tasks.
          Rent with AXX tokens via Auto-Selection Router.
        </p>
      </div>

      {/* Workers table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-content font-display" id="workers-title">
            Available Workers
          </CardTitle>
          <button
            type="button"
            onClick={refetch}
            disabled={workersLoading}
            aria-label="Refresh workers list"
            aria-busy={workersLoading}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-tech-cyan disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-tech-cyan/10 transition-colors duration-200"
          >
            {workersLoading ? (
              <Loader2
                className="w-4 h-4 animate-spin shrink-0"
                strokeWidth={2}
                aria-hidden
              />
            ) : (
              <RefreshCw
                className="w-4 h-4 shrink-0"
                strokeWidth={2}
                aria-hidden
              />
            )}
            {workersLoading ? 'Loading…' : 'Refresh'}
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {workersError && (
            <div
              className="mx-4 mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              role="alert"
            >
              {workersError}
            </div>
          )}
          <div
            className="overflow-x-auto"
            role="region"
            aria-labelledby="workers-title"
          >
            <table
              className="w-full text-left min-w-[320px]"
              role="grid"
              aria-label="Available workers"
            >
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th
                    scope="col"
                    className="px-4 py-3 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted"
                  >
                    Chip / Worker
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted text-center whitespace-nowrap"
                  >
                    QTY
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted text-right whitespace-nowrap"
                  >
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {workers.map((worker) => (
                  <tr
                    key={worker.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => handleSelect(worker.id)}
                    onKeyDown={(e) => handleRowKeyDown(e, worker.id)}
                    aria-pressed={selected === worker.id}
                    aria-label={`Select ${worker.name}, ${worker.pricePerHour} AXX per hour`}
                    className={`
                      transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-tech-cyan focus-visible:ring-inset
                      hover:bg-tech-cyan/5
                      ${selected === worker.id ? 'bg-tech-cyan/10 ring-inset ring-1 ring-tech-cyan/30' : 'bg-transparent'}
                    `}
                  >
                    <td className="px-4 py-3 sm:px-6 py-4">
                      <div className="font-medium text-content">
                        {worker.name}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {worker.specs}
                      </div>
                    </td>
                    <td className="px-4 py-3 sm:px-6 py-4 text-center text-content font-mono tabular-nums">
                      {worker.qty}
                    </td>
                    <td className="px-4 py-3 sm:px-6 py-4 text-right">
                      <span className="font-semibold font-mono tabular-nums text-content">
                        {worker.pricePerHour.toFixed(2)}
                      </span>
                      <span className="text-muted text-sm ml-1">AXX/hr</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Selection & Escrow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-content font-display">
            {selected ? 'Escrow & Payment' : 'Select a worker'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selected ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/10">
                <div>
                  <p className="text-muted text-xs font-semibold uppercase tracking-wider">
                    Selected
                  </p>
                  <p className="text-lg font-semibold text-content mt-1">
                    {workers.find((w) => w.id === selected)?.name ?? selected}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted text-xs font-semibold uppercase tracking-wider">
                    Total cost
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-content mt-1">
                    {totalCost.toFixed(2)}{' '}
                    <span className="text-muted font-normal text-base">
                      AXX/hr
                    </span>
                  </p>
                </div>
              </div>
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-content mb-4 font-display">
                  Escrow Management
                </h3>
                <EscrowPanel
                  jobId={`job-${selected}`}
                  className="w-full max-w-lg"
                />
              </div>
            </div>
          ) : (
            <p className="text-center text-muted py-8">
              Select a device above to see pricing and manage escrow.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
