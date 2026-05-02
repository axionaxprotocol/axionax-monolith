import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RPC_EU = process.env.RPC_EU_URL || 'http://217.216.109.5:8545';
const RPC_AU = process.env.RPC_AU_URL || 'http://46.250.244.4:8545';

async function rpc(
  rpcUrl: string,
  method: string,
  params: unknown[]
): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const data = (await res.json()) as {
    result?: unknown;
    error?: { message: string };
  };
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function getBlockNumber(rpcUrl: string): Promise<number> {
  const result = await rpc(rpcUrl, 'eth_blockNumber', []);
  return typeof result === 'string' ? parseInt(result, 16) : 0;
}

async function getBlockByNumber(
  rpcUrl: string,
  blockNum: number
): Promise<{
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gas: string;
  gasUsed: string;
  validator: string;
  size: number;
} | null> {
  const hex = `0x${blockNum.toString(16)}`;
  const raw = (await rpc(rpcUrl, 'eth_getBlockByNumber', [hex, false])) as {
    number?: string;
    hash?: string;
    timestamp?: string;
    transactions?: string[];
    gasLimit?: string;
    gasUsed?: string;
    miner?: string;
    size?: string;
  } | null;
  if (!raw) return null;
  return {
    number: blockNum,
    hash: raw.hash || '0x0',
    timestamp: parseInt(raw.timestamp || '0x0', 16),
    txCount: Array.isArray(raw.transactions) ? raw.transactions.length : 0,
    gas: raw.gasLimit ? parseInt(raw.gasLimit, 16).toString() : '0',
    gasUsed: raw.gasUsed ? parseInt(raw.gasUsed, 16).toString() : '0',
    validator: raw.miner || '0x0',
    size: raw.size ? parseInt(raw.size, 16) : 0,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  if (page < 1 || pageSize < 1 || pageSize > 50) {
    return NextResponse.json(
      { error: 'Invalid page or pageSize' },
      { status: 400 }
    );
  }

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));

  try {
    let rpcUrl = RPC_EU;
    let latest = await getBlockNumber(RPC_EU);
    if (latest === 0) {
      latest = await getBlockNumber(RPC_AU);
      rpcUrl = RPC_AU;
    }
    if (latest === 0) {
      const res = NextResponse.json({
        blocks: [],
        total: 0,
        page: safePage,
        pageSize: safePageSize,
        latestBlock: 0,
        isMock: false,
      });
      res.headers.set('Access-Control-Allow-Origin', '*');
      return res;
    }

    const start = latest - (safePage - 1) * safePageSize;
    const end = Math.max(0, start - safePageSize + 1);
    const blocks: Array<{
      number: number;
      hash: string;
      timestamp: number;
      txCount: number;
      gas: string;
      gasUsed: string;
      validator: string;
      size: number;
    }> = [];

    for (let num = start; num >= end && num >= 0; num--) {
      const block = await getBlockByNumber(rpcUrl, num);
      if (block) blocks.push(block);
    }

    const res = NextResponse.json({
      blocks,
      total: latest + 1,
      page: safePage,
      pageSize: safePageSize,
      latestBlock: latest,
      isMock: false,
    });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (err) {
    console.error('Blocks API error:', err);
    const fallback = NextResponse.json(
      {
        blocks: [],
        total: 0,
        page: safePage,
        pageSize: safePageSize,
        latestBlock: 0,
        isMock: false,
      },
      { status: 200 }
    );
    fallback.headers.set('Access-Control-Allow-Origin', '*');
    return fallback;
  }
}
