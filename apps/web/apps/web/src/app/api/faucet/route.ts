import { NextRequest, NextResponse } from 'next/server';
import { CHAIN_IDS } from '@axionax/blockchain-utils';

const FAUCET_API_URL = process.env.FAUCET_API_URL || 'http://localhost:3002';
const VALID_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const NETWORK = (
  process.env.NEXT_PUBLIC_NETWORK ||
  process.env.RPC_NETWORK ||
  'testnet'
)
  .trim()
  .toLowerCase();
const CHAIN_ID = NETWORK === 'mainnet' ? CHAIN_IDS.MAINNET : CHAIN_IDS.TESTNET;
const NETWORK_LABEL =
  NETWORK === 'mainnet' ? 'Axionax Mainnet' : 'Axionax Testnet';
const IS_MAINNET = CHAIN_ID === CHAIN_IDS.MAINNET;

const resolveFaucetEndpoints = () => ({
  status: `${FAUCET_API_URL}/status`,
  claim: `${FAUCET_API_URL}/faucet`,
  fallbackClaim: `${FAUCET_API_URL}/request`,
});

const extractMessage = (
  data: Record<string, unknown>,
  fallback: string
): string => {
  const candidate = data.message ?? data.error;
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate
    : fallback;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const endpoints = resolveFaucetEndpoints();

  if (address) {
    if (IS_MAINNET) {
      return NextResponse.json({
        address,
        canClaim: false,
        cooldownRemaining: 0,
        message: 'Faucet is disabled on mainnet.',
      });
    }

    try {
      const res = await fetch(
        `${endpoints.status}?address=${encodeURIComponent(address)}`,
        {
          signal: AbortSignal.timeout(5000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          address: data.address ?? address,
          canClaim: data.canClaim ?? true,
          cooldownRemaining: data.cooldownRemaining ?? 0,
        });
      }
    } catch {
      // fallback
    }
    return NextResponse.json({
      address,
      canClaim: true,
      cooldownRemaining: 0,
    });
  }

  return NextResponse.json({
    status: IS_MAINNET ? 'disabled' : 'active',
    amount: '10',
    network: NETWORK_LABEL,
    chainId: CHAIN_ID,
  });
}

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

  const endpoints = resolveFaucetEndpoints();
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
    const data = (await res
      .json()
      .catch(() => ({}))) as Record<string, unknown>;

    if (res.ok && data.success !== false) {
      return NextResponse.json({
        success: true,
        message: extractMessage(data, 'Successfully sent.'),
        txHash: data.txHash || data.tx_hash,
        amount:
          typeof data.amount === 'string' && data.amount.trim().length > 0
            ? data.amount
            : '10',
      });
    }
    if (res.status === 429) {
      return NextResponse.json(
        {
          success: false,
          message: extractMessage(data, 'Cooldown. Try again later.'),
          cooldown: data.cooldown,
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { success: false, message: extractMessage(data, 'Faucet failed') },
      { status: res.status >= 400 ? res.status : 500 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          'Faucet service temporarily unavailable. Please try again later.',
      },
      { status: 503 }
    );
  }
}
