/**
 * Chain definitions for Axionax networks
 */

import { defineChain } from 'viem';
import { CHAIN_IDS, RPC_URLS, EXPLORER_URLS, AXXT_TOKEN, AXX_TOKEN } from './constants';

// ============================================
// Axionax Testnet
// ============================================

export const axionaxTestnet = defineChain({
  id: CHAIN_IDS.TESTNET,
  name: 'Axionax Testnet',
  nativeCurrency: {
    decimals: AXXT_TOKEN.decimals,
    name: AXXT_TOKEN.name,
    symbol: AXXT_TOKEN.symbol,
  },
  rpcUrls: {
    default: {
      http: RPC_URLS.TESTNET,
    },
  },
  blockExplorers: {
    default: {
      name: 'Axionax Explorer',
      url: EXPLORER_URLS.TESTNET,
    },
  },
  testnet: true,
});

// ============================================
// Axionax Mainnet (Planned)
// ============================================

export const axionaxMainnet = defineChain({
  id: CHAIN_IDS.MAINNET,
  name: 'Axionax Mainnet',
  nativeCurrency: {
    decimals: AXX_TOKEN.decimals,
    name: AXX_TOKEN.name,
    symbol: AXX_TOKEN.symbol,
  },
  rpcUrls: {
    default: {
      http: RPC_URLS.MAINNET.length > 0 ? RPC_URLS.MAINNET : ['https://mainnet.rpc.axionax.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Axionax Explorer',
      url: EXPLORER_URLS.MAINNET,
    },
  },
  testnet: false,
});

// ============================================
// Chain Configuration Helpers
// ============================================

/**
 * Get network configuration by chain ID
 */
export function getChainById(chainId: number) {
  switch (chainId) {
    case CHAIN_IDS.TESTNET:
      return axionaxTestnet;
    case CHAIN_IDS.MAINNET:
      return axionaxMainnet;
    default:
      return null;
  }
}

/**
 * Check if chain ID is a supported Axionax network
 */
export function isAxionaxChain(chainId: number): boolean {
  return chainId === CHAIN_IDS.TESTNET || chainId === CHAIN_IDS.MAINNET;
}

/**
 * Check if chain ID is testnet
 */
export function isTestnet(chainId: number): boolean {
  return chainId === CHAIN_IDS.TESTNET;
}

/**
 * Check if chain ID is mainnet
 */
export function isMainnet(chainId: number): boolean {
  return chainId === CHAIN_IDS.MAINNET;
}

/**
 * Get all supported chains
 */
export function getSupportedChains() {
  return [axionaxTestnet, axionaxMainnet];
}

// ============================================
// MetaMask Network Addition
// ============================================

/**
 * Get network parameters for adding to MetaMask
 */
export function getMetaMaskNetworkParams(chainId: number) {
  const chain = getChainById(chainId);
  if (!chain) return null;

  return {
    chainId: '0x' + chainId.toString(16),
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls.default.http,
    blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
  };
}
