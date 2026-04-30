// Minimal JSON-RPC client for Axionax nodes (browser/server safe).

export type NodeEndpoint = {
  id: string;
  name: string;
  url: string;
};

export const DEFAULT_NODES: NodeEndpoint[] = [
  { id: "node-1", name: "Node 1 (EU)", url: "http://46.250.244.4:8545" },
  { id: "node-2", name: "Node 2 (ES)", url: "http://217.216.109.5:8545" },
];

export type RpcResult<T> =
  | { ok: true; data: T; latencyMs: number }
  | { ok: false; error: string; latencyMs: number };

export async function rpcCall<T = unknown>(
  url: string,
  method: string,
  params: unknown[] = [],
  timeoutMs = 5000
): Promise<RpcResult<T>> {
  const start = performance.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const latencyMs = Math.round(performance.now() - start);
    const json = (await r.json()) as { result?: T; error?: { message: string } };
    if (json.error) return { ok: false, error: json.error.message, latencyMs };
    return { ok: true, data: json.result as T, latencyMs };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "request failed",
      latencyMs: Math.round(performance.now() - start),
    };
  } finally {
    clearTimeout(t);
  }
}

export type NodeStatus = {
  endpoint: NodeEndpoint;
  online: boolean;
  blockNumber: number | null;
  peerCount: number | null;
  chainId: string | null;
  latencyMs: number;
  error?: string;
};

export async function getNodeStatus(ep: NodeEndpoint): Promise<NodeStatus> {
  const [bn, peers, chain] = await Promise.all([
    rpcCall<string>(ep.url, "eth_blockNumber"),
    rpcCall<string>(ep.url, "net_peerCount"),
    rpcCall<string>(ep.url, "eth_chainId"),
  ]);
  const online = bn.ok;
  return {
    endpoint: ep,
    online,
    blockNumber: bn.ok ? parseInt(bn.data, 16) : null,
    peerCount: peers.ok ? parseInt(peers.data, 16) : null,
    chainId: chain.ok ? chain.data : null,
    latencyMs: bn.latencyMs,
    error: bn.ok ? undefined : bn.error,
  };
}
