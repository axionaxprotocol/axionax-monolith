'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, getDefaultNetworkConfig } from '@axionax/sdk';

/** Display model for marketplace worker (from SDK or fallback mock) */
export interface MarketplaceWorker {
  id: string;
  name: string;
  qty: number;
  specs: string;
  pricePerHour: number;
}

/** Fallback when SDK/network fails so UI still has data */
const FALLBACK_WORKERS: MarketplaceWorker[] = [
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

function mapSdkWorkerToMarketplace(w: {
  id: string;
  name: string;
  specs: string;
  pricePerHour: number;
}): MarketplaceWorker {
  return {
    id: w.id,
    name: w.name,
    qty: 1,
    specs: w.specs,
    pricePerHour: w.pricePerHour,
  };
}

const NETWORK_CONFIG = getDefaultNetworkConfig();

export interface UseMarketplaceWorkersResult {
  workers: MarketplaceWorker[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** true when data came from SDK (or future API), false when using fallback */
  fromSource: boolean;
}

/**
 * Fetches marketplace workers from @axionax/sdk (getWorkers).
 * Falls back to static list if SDK/RPC fails so the UI keeps working.
 */
export function useMarketplaceWorkers(): UseMarketplaceWorkersResult {
  const [workers, setWorkers] = useState<MarketplaceWorker[]>(FALLBACK_WORKERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromSource, setFromSource] = useState(false);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = createClient({
        ...NETWORK_CONFIG,
        rpcUrl: NETWORK_CONFIG.rpcUrls[0],
        rpcUrls: [...NETWORK_CONFIG.rpcUrls],
        chainId: NETWORK_CONFIG.chainIdDecimal,
      });
      const list = await client.getWorkers();
      const mapped = list.map(mapSdkWorkerToMarketplace);
      setWorkers(mapped.length > 0 ? mapped : FALLBACK_WORKERS);
      setFromSource(mapped.length > 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workers');
      setWorkers(FALLBACK_WORKERS);
      setFromSource(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkers();
  }, [fetchWorkers]);

  return { workers, loading, error, refetch: fetchWorkers, fromSource };
}
