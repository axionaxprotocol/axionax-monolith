/**
 * Multi-RPC health checks and automatic fallback for JSON-RPC requests.
 */

import type { RpcCallResult, RpcHealthResult, RpcNodeEndpoint } from './types';

const DEFAULT_TIMEOUT_MS = 5_000;

/** JSON-RPC POST with timeout; throws on network/HTTP/RPC errors. */
export async function jsonRpcCall<T = unknown>(
  url: string,
  method: string,
  params: unknown[] = [],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      result?: T;
      error?: { code?: number; message?: string };
    };

    if (data.error) {
      const msg = data.error.message ?? 'RPC error';
      throw new Error(msg);
    }

    return data.result as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lightweight health check: `eth_blockNumber` succeeds within timeout.
 */
export async function pingRpc(
  url: string,
  options?: { timeoutMs?: number }
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const result = await jsonRpcCall<string>(url, 'eth_blockNumber', [], timeoutMs);
    return typeof result === 'string' && result.startsWith('0x');
  } catch {
    return false;
  }
}

/**
 * Probe endpoints in order; return the first healthy node with latency.
 */
export async function getHealthyRpc(
  nodes: readonly RpcNodeEndpoint[],
  options?: { timeoutMs?: number }
): Promise<RpcHealthResult | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const started = Date.now();
    try {
      await jsonRpcCall<string>(node.url, 'eth_blockNumber', [], timeoutMs);
      return {
        node,
        index: i,
        latencyMs: Date.now() - started,
        healthy: true,
      };
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Execute a JSON-RPC call, trying each URL in order until one succeeds.
 * Retries on timeout, abort, HTTP 5xx, and RPC errors.
 */
export async function withRpcFallback<T>(
  nodes: readonly RpcNodeEndpoint[],
  method: string,
  params: unknown[],
  options?: { timeoutMs?: number }
): Promise<RpcCallResult<T>> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: unknown;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    try {
      const result = await jsonRpcCall<T>(node.url, method, params, timeoutMs);
      return { result, node, index: i };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All RPC endpoints failed');
}
