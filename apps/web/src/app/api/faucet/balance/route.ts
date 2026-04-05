import { NextResponse } from 'next/server';
import { CHAIN_IDS } from '@axionax/blockchain-utils';

const FAUCET_API_URL = process.env.FAUCET_API_URL || 'http://localhost:3002';
const NETWORK = (
  process.env.NEXT_PUBLIC_NETWORK ||
  process.env.RPC_NETWORK ||
  'testnet'
)
  .trim()
  .toLowerCase();
const IS_MAINNET = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 0) === CHAIN_IDS.MAINNET || NETWORK === 'mainnet';

const isRealFaucet = (): boolean =>
  !!FAUCET_API_URL && !FAUCET_API_URL.includes('localhost');

export async function GET() {
  if (IS_MAINNET) {
    return NextResponse.json(
      {
        address: '0x0000000000000000000000000000000000000000',
        balance: '0',
        symbol: 'AXX',
        isMock: false,
        disabled: true,
        message: 'Faucet is disabled on mainnet.',
      },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(`${FAUCET_API_URL}/balance`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        address: data.address || '0x0',
        balance: String(data.balance ?? data.balanceWei ?? '0'),
        symbol: data.symbol || 'AXX',
        isMock: false,
      });
    }
  } catch {
    // Real faucet: do not return mock data
    if (isRealFaucet()) {
      return NextResponse.json(
        {
          address: '0x0',
          balance: '0',
          symbol: 'AXX',
          isMock: false,
          error: 'Faucet service temporarily unavailable',
        },
        { status: 503 }
      );
    }
  }
  // Local/dev only: mock balance when faucet-api is not running
  return NextResponse.json({
    address: '0x0000000000000000000000000000000000000000',
    balance: '1000000',
    symbol: 'AXX',
    isMock: true,
  });
}
