// Shared chain primitives. Keep this file dependency-free so it can be
// imported from the browser, the node, the OS dashboard, and Edge runtimes.

/** Chain identifier of the network the client is connected to. */
export const TESTNET_CHAIN_ID = 86137;
export const MAINNET_CHAIN_ID = 86150;
export const DEV_CHAIN_ID = 31337;

/** A node operator can label endpoints however they like. */
export interface NodeEndpoint {
  id: string;
  name: string;
  /** HTTP JSON-RPC URL, e.g. `http://127.0.0.1:8545` */
  url: string;
  /** Optional WebSocket URL, e.g. `ws://127.0.0.1:8546` */
  wsUrl?: string;
}

/**
 * Result wrapper used everywhere instead of throwing.
 *
 * Callers should pattern-match on the discriminator instead of relying on
 * try/catch — exceptions only fire for truly unrecoverable bugs.
 */
export type Result<T, E = RpcError> =
  | { ok: true; data: T; latencyMs: number }
  | { ok: false; error: E; latencyMs: number };

export interface RpcError {
  /** Human-readable summary. */
  message: string;
  /** EIP-1474 error code if returned by the node, otherwise a synthetic kind. */
  code: number | "timeout" | "offline" | "malformed" | "unknown";
  /** Optional structured payload from the JSON-RPC response. */
  data?: unknown;
}

/** Lightweight summary of a node — what the dashboard widgets render. */
export interface NodeStatus {
  endpoint: NodeEndpoint;
  online: boolean;
  blockNumber: number | null;
  peerCount: number | null;
  /** Hex chain ID exactly as returned by `eth_chainId`. */
  chainId: string | null;
  latencyMs: number;
  error?: string;
}
