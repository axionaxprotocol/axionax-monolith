import { NextRequest, NextResponse } from 'next/server';

const RPC_EU_URL = process.env.RPC_EU_URL;

export async function POST(request: NextRequest) {
  if (!RPC_EU_URL) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'RPC_EU_URL is not configured',
        },
        id: null,
      },
      { status: 503 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error' },
          id: null,
        },
        { status: 400 }
      );
    }

    const response = await fetch(RPC_EU_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('RPC EU proxy error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'EU Validator unreachable',
        },
        id: null,
      },
      { status: 503 }
    );
  }
}

// Health check
export async function GET() {
  if (!RPC_EU_URL) {
    return NextResponse.json(
      { status: 'unconfigured', endpoint: 'EU Validator' },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(RPC_EU_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return NextResponse.json({ status: 'healthy', endpoint: 'EU Validator' });
    }
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  } catch {
    return NextResponse.json({ status: 'unreachable' }, { status: 503 });
  }
}
