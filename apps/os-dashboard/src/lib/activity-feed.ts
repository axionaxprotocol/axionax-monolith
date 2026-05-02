import { DEFAULT_NODES, getBlockByNumber, getNodeStatus } from "@axionax/sdk";
import type { NodeEndpoint } from "@axionax/sdk";

export interface ChainActivityRow {
  id: string;
  kind: "block" | "tx";
  blockNumber: number;
  txHash?: string;
  txCount: number;
  at: Date | null;
  detail: string;
}

async function pickOnlineEndpoint(): Promise<{ ep: NodeEndpoint; latest: number } | null> {
  for (const ep of DEFAULT_NODES) {
    const s = await getNodeStatus(ep);
    if (s.online && s.blockNumber != null) {
      return { ep, latest: s.blockNumber };
    }
  }
  return null;
}

/**
 * Recent blocks and tx hashes from the first reachable validator RPC.
 */
export async function fetchChainActivity(options?: {
  maxBlocks?: number;
  maxTxRows?: number;
}): Promise<{
  rows: ChainActivityRow[];
  rpcLabel: string | null;
  rpcUrl: string | null;
  error?: string;
}> {
  const maxBlocks = options?.maxBlocks ?? 14;
  const maxTxRows = options?.maxTxRows ?? 32;

  const head = await pickOnlineEndpoint();
  if (!head) {
    return {
      rows: [],
      rpcLabel: null,
      rpcUrl: null,
      error: "No validator RPC reachable. Check network or defaults in @axionax/sdk.",
    };
  }

  const { ep, latest } = head;
  const rows: ChainActivityRow[] = [];
  let txRows = 0;

  for (let h = latest; h > latest - maxBlocks && h >= 0; h--) {
    const r = await getBlockByNumber(ep.url, h, false);
    if (!r.ok || !r.data) continue;

    const b = r.data;
    const ts = parseInt(String(b.timestamp), 16);
    const at = Number.isFinite(ts) ? new Date(ts * 1000) : null;
    const txs = Array.isArray(b.transactions) ? b.transactions : [];
    const hashes = txs.filter((t): t is string => typeof t === "string");

    rows.push({
      id: `b-${h}`,
      kind: "block",
      blockNumber: h,
      txCount: hashes.length,
      at,
      detail: `${hashes.length} transaction${hashes.length === 1 ? "" : "s"}`,
    });

    for (const hash of hashes) {
      if (txRows >= maxTxRows) break;
      rows.push({
        id: hash,
        kind: "tx",
        blockNumber: h,
        txHash: hash,
        txCount: 0,
        at,
        detail: "Observed in canonical block",
      });
      txRows += 1;
    }
    if (txRows >= maxTxRows) break;
  }

  return { rows, rpcLabel: ep.name, rpcUrl: ep.url };
}
