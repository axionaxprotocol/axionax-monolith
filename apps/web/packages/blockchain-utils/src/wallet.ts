/**
 * Wallet utilities for browser-based wallet interactions
 * Compatible with MetaMask and other EIP-1193 providers
 */

import { CHAIN_IDS } from './constants';
import { getMetaMaskNetworkParams } from './chains';

// ============================================
// Type Definitions
// ============================================

export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] | unknown }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

export interface WalletError extends Error {
  code: number;
}

type RuntimeNetwork = 'testnet' | 'mainnet';

function getRuntimeNetwork(): RuntimeNetwork {
  if (typeof process === 'undefined') return 'testnet';
  const value =
    process.env.NEXT_PUBLIC_NETWORK ??
    process.env.NEXT_PUBLIC_AXIONAX_NETWORK ??
    process.env.AXIONAX_NETWORK ??
    'testnet';
  return value.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
}

function getTargetChainId(): number {
  return getRuntimeNetwork() === 'mainnet' ? CHAIN_IDS.MAINNET : CHAIN_IDS.TESTNET;
}

// Common error codes
export const WALLET_ERROR_CODES = {
  USER_REJECTED: 4001,
  CHAIN_NOT_ADDED: 4902,
  RESOURCE_UNAVAILABLE: -32002,
} as const;

// ============================================
// Provider Detection
// ============================================

/**
 * Get the injected ethereum provider
 */
export function getProvider(): EIP1193Provider | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as { ethereum?: EIP1193Provider };
  return win.ethereum ?? null;
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  const provider = getProvider();
  return Boolean(provider?.isMetaMask);
}

/**
 * Check if any wallet is available
 */
export function isWalletAvailable(): boolean {
  return getProvider() !== null;
}

// ============================================
// Account Management
// ============================================

/**
 * Request wallet connection and return accounts
 */
export async function connectWallet(): Promise<string[]> {
  const provider = getProvider();
  if (!provider) {
    throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
  }

  try {
    const accounts = (await provider.request({
      method: 'eth_requestAccounts',
    })) as string[];
    return accounts;
  } catch (error) {
    const walletError = error as WalletError;
    if (walletError.code === WALLET_ERROR_CODES.USER_REJECTED) {
      throw new Error('User rejected the connection request');
    }
    throw error;
  }
}

/**
 * Get currently connected accounts (without prompting)
 */
export async function getAccounts(): Promise<string[]> {
  const provider = getProvider();
  if (!provider) return [];

  try {
    const accounts = (await provider.request({
      method: 'eth_accounts',
    })) as string[];
    return accounts;
  } catch {
    return [];
  }
}

/**
 * Get the current connected account
 */
export async function getCurrentAccount(): Promise<string | null> {
  const accounts = await getAccounts();
  return accounts[0] ?? null;
}

// ============================================
// Chain/Network Management
// ============================================

/**
 * Get the current chain ID
 */
export async function getChainId(): Promise<number | null> {
  const provider = getProvider();
  if (!provider) return null;

  try {
    const chainIdHex = (await provider.request({
      method: 'eth_chainId',
    })) as string;
    return parseInt(chainIdHex, 16);
  } catch {
    return null;
  }
}

/**
 * Switch to a specific chain
 */
export async function switchChain(chainId: number): Promise<boolean> {
  const provider = getProvider();
  if (!provider) return false;

  const chainIdHex = '0x' + chainId.toString(16);

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (error) {
    const walletError = error as WalletError;
    if (walletError.code === WALLET_ERROR_CODES.CHAIN_NOT_ADDED) {
      // Chain not added, try to add it
      return await addChain(chainId);
    }
    throw error;
  }
}

/**
 * Add a chain to the wallet
 */
export async function addChain(chainId: number): Promise<boolean> {
  const provider = getProvider();
  if (!provider) return false;

  const networkParams = getMetaMaskNetworkParams(chainId);
  if (!networkParams) {
    throw new Error(`Unknown chain ID: ${chainId}`);
  }

  try {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [networkParams],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Connect wallet and switch to configured Axionax network.
 */
export async function connectToAxionax(): Promise<string[]> {
  const accounts = await connectWallet();
  await switchChain(getTargetChainId());
  return accounts;
}

// ============================================
// Balance & Transaction
// ============================================

/**
 * Get balance of an address
 */
export async function getBalance(address: string): Promise<bigint> {
  const provider = getProvider();
  if (!provider) {
    throw new Error('No wallet detected');
  }

  try {
    const balanceHex = (await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    })) as string;
    return BigInt(balanceHex);
  } catch (error) {
    console.error('Error getting balance:', error);
    return BigInt(0);
  }
}

/**
 * Get transaction count (nonce)
 */
export async function getTransactionCount(address: string): Promise<number> {
  const provider = getProvider();
  if (!provider) return 0;

  try {
    const countHex = (await provider.request({
      method: 'eth_getTransactionCount',
      params: [address, 'latest'],
    })) as string;
    return parseInt(countHex, 16);
  } catch {
    return 0;
  }
}

// ============================================
// Token Management
// ============================================

export interface AddTokenParams {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
}

/**
 * Add a token to MetaMask
 */
export async function addToken(params: AddTokenParams): Promise<boolean> {
  const provider = getProvider();
  if (!provider) {
    throw new Error('No wallet detected');
  }

  try {
    const success = (await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: params.address,
          symbol: params.symbol,
          decimals: params.decimals,
          image: params.image,
        },
      },
    })) as boolean;
    return success;
  } catch {
    return false;
  }
}

// ============================================
// Event Listeners
// ============================================

/**
 * Subscribe to account changes
 */
export function onAccountsChanged(handler: (accounts: string[]) => void): () => void {
  const provider = getProvider();
  if (!provider?.on) return () => {};

  provider.on('accountsChanged', handler as (...args: unknown[]) => void);

  return () => {
    provider.removeListener?.('accountsChanged', handler as (...args: unknown[]) => void);
  };
}

/**
 * Subscribe to chain changes
 */
export function onChainChanged(handler: (chainId: string) => void): () => void {
  const provider = getProvider();
  if (!provider?.on) return () => {};

  provider.on('chainChanged', handler as (...args: unknown[]) => void);

  return () => {
    provider.removeListener?.('chainChanged', handler as (...args: unknown[]) => void);
  };
}
