/**
 * Web3 utilities for axionax frontend
 *
 * Re-exports wallet utilities from @axionax/blockchain-utils
 * for backward compatibility.
 *
 * @deprecated Import directly from '@axionax/blockchain-utils' instead
 */

import {
  getProvider,
  isMetaMaskInstalled,
  isWalletAvailable,
  connectWallet,
  getAccounts,
  getCurrentAccount,
  getChainId,
  switchChain,
  addChain,
  connectToAxionax,
  getBalance,
  getTransactionCount,
  addToken,
  onAccountsChanged,
  onChainChanged,
  axionaxTestnet,
  axionaxMainnet,
  getMetaMaskNetworkParams,
  CHAIN_IDS,
  RPC_URLS,
  EXPLORER_URLS,
  formatAddress,
  formatUnits,
} from '@axionax/blockchain-utils';

export type {
  EIP1193Provider,
  WalletError,
  AddTokenParams,
} from '@axionax/blockchain-utils';
export { WALLET_ERROR_CODES } from '@axionax/blockchain-utils';

export {
  getProvider,
  isMetaMaskInstalled,
  isWalletAvailable,
  connectWallet,
  getAccounts,
  getCurrentAccount,
  getChainId as getCurrentChainId,
  switchChain,
  addChain,
  connectToAxionax,
  getBalance,
  getTransactionCount,
  addToken as addTokenToMetaMask,
  onAccountsChanged,
  onChainChanged,
  getMetaMaskNetworkParams,
  CHAIN_IDS,
  RPC_URLS,
  EXPLORER_URLS,
  formatAddress,
  formatUnits,
};
export { axionaxTestnet as AXIONAX_TESTNET_CONFIG };
export { axionaxMainnet as AXIONAX_MAINNET_CONFIG };

export const AXIONAX_TESTNET = {
  chainId: '0x' + CHAIN_IDS.TESTNET.toString(16),
  chainIdDecimal: CHAIN_IDS.TESTNET,
  chainName: axionaxTestnet.name,
  nativeCurrency: axionaxTestnet.nativeCurrency,
  rpcUrls: RPC_URLS.TESTNET,
  blockExplorerUrls: [EXPLORER_URLS.TESTNET],
};

export const AXIONAX_MAINNET = {
  chainId: '0x' + CHAIN_IDS.MAINNET.toString(16),
  chainIdDecimal: CHAIN_IDS.MAINNET,
  chainName: axionaxMainnet.name,
  nativeCurrency: axionaxMainnet.nativeCurrency,
  rpcUrls:
    RPC_URLS.MAINNET.length > 0
      ? RPC_URLS.MAINNET
      : ['https://mainnet.rpc.axionax.org'],
  blockExplorerUrls: [EXPLORER_URLS.MAINNET],
};

export function getActiveNetworkConfig() {
  const raw = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase();
  const chainIdFromEnv = Number.parseInt(
    process.env.NEXT_PUBLIC_CHAIN_ID ?? '',
    10
  );
  if (raw === 'mainnet' || chainIdFromEnv === CHAIN_IDS.MAINNET) {
    return AXIONAX_MAINNET;
  }
  return AXIONAX_TESTNET;
}

export const ACTIVE_NETWORK_CONFIG = getActiveNetworkConfig();
export const AXIONAX_NETWORK = ACTIVE_NETWORK_CONFIG;
export const AXIONAX_NETWORK_CONFIG = ACTIVE_NETWORK_CONFIG;

// Legacy error type
export interface MetaMaskError extends Error {
  code: number;
  message: string;
}

// Legacy addAXXToken function
export async function addAXXToken(tokenAddress: string): Promise<boolean> {
  const { addToken } = await import('@axionax/blockchain-utils');
  return addToken({
    address: tokenAddress,
    symbol: 'AXX',
    decimals: 18,
  });
}
