/**
 * Network configuration for Axionax SDK
 */

import {
  CHAIN_IDS,
  RPC_URLS,
  EXPLORER_URLS,
  AXX_TOKEN,
  AXXT_TOKEN,
} from '@axionax/blockchain-utils';
import type { RpcNodeEndpoint } from './types';

// ============================================
// Multi-RPC: mock placeholders (swap for real infra in production)
// ============================================

export const MOCK_RPC_NODES: readonly RpcNodeEndpoint[] = [
  {
    id: 'gcp',
    label: 'GCP Node',
    url: 'https://gcp-rpc.mock.axionax.network',
  },
  {
    id: 'hetzner',
    label: 'Hetzner Node',
    url: 'https://hetzner-rpc.mock.axionax.network',
  },
  {
    id: 'local',
    label: 'Local Node',
    url: 'http://127.0.0.1:8545',
  },
] as const;

// ============================================
// Testnet: labeled endpoints (aligned with @axionax/blockchain-utils RPC_URLS.TESTNET)
// ============================================

const T = RPC_URLS.TESTNET;

export const AXIONAX_TESTNET_RPC_NODES: readonly RpcNodeEndpoint[] = [
  {
    id: 'gcp',
    label: 'GCP Node',
    url: T[0] ?? 'https://rpc.axionax.org',
  },
  {
    id: 'hetzner_eu',
    label: 'Hetzner EU',
    url: T[1] ?? 'http://217.76.61.116:8545',
  },
  {
    id: 'australia',
    label: 'Australia Node',
    url: T[2] ?? 'http://46.250.244.4:8545',
  },
] as const;

// ============================================
// Testnet Configuration
// ============================================

export const AXIONAX_TESTNET_CONFIG = {
  chainId: `0x${CHAIN_IDS.TESTNET.toString(16)}`,
  chainIdDecimal: CHAIN_IDS.TESTNET,
  chainName: 'Axionax Testnet',
  nativeCurrency: {
    name: AXXT_TOKEN.name,
    symbol: AXXT_TOKEN.symbol,
    decimals: AXXT_TOKEN.decimals,
  },
  /** Ordered RPC URLs for fallback (same order as rpcNodes). */
  rpcUrls: [...AXIONAX_TESTNET_RPC_NODES.map((n) => n.url)] as readonly string[],
  /** Labeled nodes for UI + getHealthyRpc. */
  rpcNodes: AXIONAX_TESTNET_RPC_NODES,
  /** Example mock-only endpoints (tests / docs). */
  mockRpcNodes: MOCK_RPC_NODES,
  blockExplorerUrls: [EXPLORER_URLS.TESTNET],
} as const;

// ============================================
// Mainnet Configuration (Planned)
// ============================================

export const AXIONAX_MAINNET_CONFIG = {
  chainId: `0x${CHAIN_IDS.MAINNET.toString(16)}`,
  chainIdDecimal: CHAIN_IDS.MAINNET,
  chainName: 'Axionax Mainnet',
  nativeCurrency: {
    name: AXX_TOKEN.name,
    symbol: AXX_TOKEN.symbol,
    decimals: AXX_TOKEN.decimals,
  },
  rpcUrls: RPC_URLS.MAINNET.length > 0 ? RPC_URLS.MAINNET : ['https://mainnet.rpc.axionax.org'],
  blockExplorerUrls: [EXPLORER_URLS.MAINNET],
} as const;

// ============================================
// Default Configuration
// ============================================

function resolveConfiguredChainId(): number {
  const envChainId =
    process.env.AXIONAX_SDK_CHAIN_ID ??
    process.env.AXIONAX_CHAIN_ID ??
    process.env.NEXT_PUBLIC_CHAIN_ID;

  if (envChainId) {
    const parsed = Number(envChainId);
    if (parsed === CHAIN_IDS.MAINNET || parsed === CHAIN_IDS.TESTNET) {
      return parsed;
    }
  }

  const envNetwork =
    process.env.AXIONAX_SDK_NETWORK ??
    process.env.AXIONAX_NETWORK ??
    process.env.RPC_NETWORK;

  if (envNetwork?.toLowerCase() === 'mainnet') {
    return CHAIN_IDS.MAINNET;
  }

  return CHAIN_IDS.TESTNET;
}

export const DEFAULT_CHAIN_ID = resolveConfiguredChainId();

export const DEFAULT_CONFIG =
  DEFAULT_CHAIN_ID === CHAIN_IDS.MAINNET
    ? AXIONAX_MAINNET_CONFIG
    : AXIONAX_TESTNET_CONFIG;

export const ACTIVE_NETWORK_CONFIG = DEFAULT_CONFIG;
export const getDefaultNetworkConfig = () => DEFAULT_CONFIG;
export const getDefaultConfig = () => DEFAULT_CONFIG;

// ============================================
// Contract Addresses
// ============================================

export const CONTRACTS = {
  TESTNET: {
    ESCROW: '0x0000000000000000000000000000000000002000',
    JOB_REGISTRY: '0x0000000000000000000000000000000000002001',
    WORKER_REGISTRY: '0x0000000000000000000000000000000000002002',
  },
  MAINNET: {
    ESCROW: '0x0000000000000000000000000000000000002000',
    JOB_REGISTRY: '0x0000000000000000000000000000000000002001',
    WORKER_REGISTRY: '0x0000000000000000000000000000000000002002',
  },
} as const;
