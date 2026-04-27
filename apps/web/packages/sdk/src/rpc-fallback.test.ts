/**
 * Multi-RPC fallback unit tests (mock fetch).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getHealthyRpc, withRpcFallback } from './rpc-fallback';
import { MOCK_RPC_NODES } from './config';

describe('MOCK_RPC_NODES', () => {
  it('exports three labeled mock endpoints', () => {
    expect(MOCK_RPC_NODES).toHaveLength(3);
    expect(MOCK_RPC_NODES.map((n) => n.id)).toEqual(
      expect.arrayContaining(['gcp', 'hetzner', 'local'])
    );
  });
});

describe('getHealthyRpc', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns first healthy node in order', async () => {
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === 'https://a.test') {
        return {
          ok: true,
          json: async () => ({ jsonrpc: '2.0', result: '0x1', id: 1 }),
        } as Response;
      }
      return {
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const nodes = [
      { id: 'a', label: 'Node A', url: 'https://a.test' },
      { id: 'b', label: 'Node B', url: 'https://b.test' },
    ] as const;

    const h = await getHealthyRpc(nodes);
    expect(h).not.toBeNull();
    expect(h?.node.id).toBe('a');
    expect(h?.index).toBe(0);
  });

  it('falls back to second node when first returns HTTP error', async () => {
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === 'https://a.test') {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: { message: 'unavailable' } }),
        } as Response;
      }
      if (u === 'https://b.test') {
        return {
          ok: true,
          json: async () => ({ jsonrpc: '2.0', result: '0xabc', id: 1 }),
        } as Response;
      }
      throw new Error('unexpected url');
    }) as typeof fetch;

    const nodes = [
      { id: 'a', label: 'Node A', url: 'https://a.test' },
      { id: 'b', label: 'Node B', url: 'https://b.test' },
    ] as const;

    const h = await getHealthyRpc(nodes);
    expect(h?.node.id).toBe('b');
    expect(h?.index).toBe(1);
  });
});

describe('withRpcFallback', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retries until eth_getBalance succeeds', async () => {
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === 'https://a.test') {
        return {
          ok: false,
          status: 500,
          json: async () => ({}),
        } as Response;
      }
      if (u === 'https://b.test') {
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            result: '0x0',
            id: 1,
          }),
        } as Response;
      }
      throw new Error('unexpected');
    }) as typeof fetch;

    const nodes = [
      { id: 'a', label: 'A', url: 'https://a.test' },
      { id: 'b', label: 'B', url: 'https://b.test' },
    ] as const;

    const out = await withRpcFallback<string>(nodes, 'eth_getBalance', [
      '0x0000000000000000000000000000000000000000',
      'latest',
    ]);

    expect(out.node.id).toBe('b');
    expect(out.index).toBe(1);
    expect(out.result).toBe('0x0');
  });
});
