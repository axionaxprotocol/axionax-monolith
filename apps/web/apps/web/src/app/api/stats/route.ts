import { NextResponse } from 'next/server';

// RPC endpoints for validators
const RPC_ENDPOINTS = {
  eu: process.env.RPC_EU_URL || 'http://217.216.109.5:8545',
  au: process.env.RPC_AU_URL || 'http://46.250.244.4:8545',
};

interface StatsResponse {
  blockNumber: number;
  services: {
    healthy: number;
    total: number;
  };
  uptime: {
    hours: number;
  };
  deployment: number;
  validators: {
    online: number;
    total: number;
  };
  timestamp: number;
}

async function getBlockNumber(rpcUrl: string): Promise<number | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { result?: string };
    return typeof data.result === 'string' ? parseInt(data.result, 16) : null;
  } catch {
    return null;
  }
}

async function checkValidatorHealth(rpcUrl: string): Promise<boolean> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // Check validator health in parallel
    const [euHealth, auHealth] = await Promise.all([
      checkValidatorHealth(RPC_ENDPOINTS.eu),
      checkValidatorHealth(RPC_ENDPOINTS.au),
    ]);

    // Get block number from healthy validator
    let blockNumber = 0;
    if (euHealth) {
      const euBlock = await getBlockNumber(RPC_ENDPOINTS.eu);
      if (euBlock) blockNumber = euBlock;
    } else if (auHealth) {
      const auBlock = await getBlockNumber(RPC_ENDPOINTS.au);
      if (auBlock) blockNumber = auBlock;
    }

    const validatorsOnline = (euHealth ? 1 : 0) + (auHealth ? 1 : 0);

    const isMock = validatorsOnline === 0;
    const stats: StatsResponse & {
      isMock?: boolean;
      nodes?: { eu: boolean; au: boolean };
    } = {
      blockNumber,
      services: {
        healthy: validatorsOnline > 0 ? 9 : 0,
        total: 9,
      },
      uptime: {
        hours: 0, // Real uptime TBD from health endpoint; show — on UI for testnet
      },
      deployment: 100,
      validators: {
        online: validatorsOnline,
        total: 2,
      },
      nodes: {
        eu: euHealth,
        au: auHealth,
      },
      timestamp: Date.now(),
      isMock,
    };

    const res = NextResponse.json(stats);
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=5, stale-while-revalidate=10'
    );
    return res;
  } catch (error) {
    console.error('Stats API error:', error);
    const fallback = NextResponse.json({
      blockNumber: 0,
      services: { healthy: 0, total: 9 },
      uptime: { hours: 0 },
      deployment: 100,
      validators: { online: 0, total: 2 },
      nodes: { eu: false, au: false },
      timestamp: Date.now(),
      isMock: true,
    });
    fallback.headers.set('Access-Control-Allow-Origin', '*');
    fallback.headers.set('Cache-Control', 'public, s-maxage=5');
    return fallback;
  }
}
