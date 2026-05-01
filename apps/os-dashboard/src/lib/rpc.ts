// Re-export the canonical RPC client from @axionax/sdk so all dashboard
// pages share types with the rest of the workspace.
//
// History: this file used to contain a self-contained client; it now lives
// in `packages/sdk/src/rpc.ts`. The old `RpcResult` alias is kept here for
// any existing imports — it maps to the new `Result` discriminated union.

export {
  DEFAULT_NODES,
  rpcCall,
  getBlockNumber,
  getPeerCount,
  getChainId,
  getBalance,
  getBlockByNumber,
  getNodeStatus,
  sendRawTransaction,
  isReachable,
} from "@axionax/sdk";

export type {
  NodeEndpoint,
  NodeStatus,
  RpcError,
  Result,
  Result as RpcResult, // legacy alias
  RawBlock,
  RpcCallOptions,
} from "@axionax/sdk";
