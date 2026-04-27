import { NextRequest, NextResponse } from 'next/server';

const RPC_AU_URL = process.env.RPC_AU_URL;

export async function POST(request: NextRequest) {
  if (!RPC_AU_URL) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'RPC_AU_URL is not configured',
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

    const response = await fetch(RPC_AU_URL, {
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
    console.error('RPC AU proxy error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'AU Validator unreachable',
        },
        id: null,
      },
      { status: 503 }
    );
  }
}

// Health check
export async function GET() {
  if (!RPC_AU_URL) {
    return NextResponse.json(
      { status: 'unconfigured', endpoint: 'AU Validator' },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(RPC_AU_URL, {
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
      return NextResponse.json({ status: 'healthy', endpoint: 'AU Validator' });
    }
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  } catch {
    return NextResponse.json({ status: 'unreachable' }, { status: 503 });
  }
}
