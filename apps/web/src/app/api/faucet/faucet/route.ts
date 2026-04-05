import { NextRequest, NextResponse } from 'next/server';

const FAUCET_API_URL = process.env.FAUCET_API_URL || 'http://localhost:3002';
const VALID_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const NETWORK = (
  process.env.NEXT_PUBLIC_NETWORK ||
  process.env.RPC_NETWORK ||
  'testnet'
).toLowerCase();
const IS_MAINNET = NETWORK === 'mainnet';

const isRealFaucet = (): boolean =>
  !!FAUCET_API_URL && !FAUCET_API_URL.includes('localhost');

const resolveFaucetEndpoints = () => ({
  claim: `${FAUCET_API_URL}/faucet`,
  fallbackClaim: `${FAUCET_API_URL}/request`,
});

export async function POST(request: NextRequest) {
  if (IS_MAINNET) {
    return NextResponse.json(
      {
        success: false,
        message: 'Faucet is disabled on mainnet.',
      },
      { status: 403 }
    );
  }

  let body: { address?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  if (!address) {
    return NextResponse.json(
      { success: false, message: 'Address is required' },
      { status: 400 }
    );
  }
  if (!VALID_ADDRESS.test(address)) {
    return NextResponse.json(
      { success: false, message: 'Invalid Ethereum address format' },
      { status: 400 }
    );
  }

  const endpoints = resolveFaucetEndpoints();

  try {
    let res = await fetch(endpoints.claim, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 404) {
      // Backward compatibility for existing faucet service (/request endpoint).
      res = await fetch(endpoints.fallbackClaim, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
        signal: AbortSignal.timeout(15000),
      });
    }

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success !== false) {
      return NextResponse.json({
        success: true,
        message: data.message || 'Successfully sent testnet tokens.',
        txHash: data.txHash || data.tx_hash,
        amount: data.amount || '10000',
        blockNumber: data.blockNumber,
      });
    }

    if (res.status === 429) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'Rate limit. Please try again later.',
          cooldown: data.cooldown,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, message: data.message || 'Faucet request failed' },
      { status: res.status >= 400 ? res.status : 500 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: isRealFaucet()
          ? 'Faucet service temporarily unavailable. Please try again later.'
          : 'Faucet backend is not configured.',
      },
      { status: 503 }
    );
  }
}
