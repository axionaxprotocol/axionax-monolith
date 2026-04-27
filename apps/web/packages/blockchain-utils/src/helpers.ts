/**
 * Helper utilities for Axionax blockchain operations
 */

import { FORMATTING, TIME } from './constants';

// ============================================
// Address Utilities
// ============================================

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(
  address: string,
  chars: number = FORMATTING.SHORT_ADDRESS_CHARS,
): string {
  if (!address) return '';
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Checksum an address
 */
export function checksumAddress(address: string): string {
  // Simple checksum - for production use viem's getAddress
  return address.toLowerCase();
}

/**
 * Compare addresses (case-insensitive)
 */
export function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// ============================================
// Number/BigInt Utilities
// ============================================

/**
 * Format a bigint value with decimals for display
 */
export function formatUnits(value: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === BigInt(0)) {
    return whole.toLocaleString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmedFraction = fractionStr.slice(0, FORMATTING.MAX_DECIMALS).replace(/0+$/, '');

  if (trimmedFraction === '') {
    return whole.toLocaleString();
  }

  return `${whole.toLocaleString()}.${trimmedFraction}`;
}

/**
 * Parse a string value to bigint with decimals
 */
export function parseUnits(value: string, decimals: number = 18): bigint {
  const [whole, fraction = ''] = value.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Format a value in wei to AXX
 */
export function formatAXX(value: bigint): string {
  return formatUnits(value, 18) + ' AXX';
}

/**
 * Format gas price in Gwei
 */
export function formatGwei(value: bigint): string {
  return formatUnits(value, 9) + ' Gwei';
}

/**
 * Calculate percentage
 */
export function percentage(value: bigint, total: bigint): number {
  if (total === BigInt(0)) return 0;
  return Number((value * BigInt(10000)) / total) / 100;
}

// ============================================
// Time Utilities
// ============================================

/**
 * Format a timestamp to human-readable string
 */
export function formatTimestamp(timestamp: Date | number): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : timestamp;
  return date.toLocaleString();
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 */
export function timeAgo(timestamp: Date | number): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : timestamp;
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < TIME.MINUTE) return 'just now';
  if (diff < TIME.HOUR) return `${Math.floor(diff / TIME.MINUTE)} minutes ago`;
  if (diff < TIME.DAY) return `${Math.floor(diff / TIME.HOUR)} hours ago`;
  if (diff < TIME.WEEK) return `${Math.floor(diff / TIME.DAY)} days ago`;

  return date.toLocaleDateString();
}

// ============================================
// Hash Utilities
// ============================================

/**
 * Truncate a hash for display
 */
export function truncateHash(hash: string, chars: number = 8): string {
  if (!hash) return '';
  return `${hash.substring(0, chars + 2)}...${hash.substring(hash.length - chars)}`;
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// ============================================
// Chain Utilities
// ============================================

/**
 * Convert chain ID to hex
 */
export function chainIdToHex(chainId: number): string {
  return '0x' + chainId.toString(16);
}

/**
 * Convert hex chain ID to number
 */
export function hexToChainId(hex: string): number {
  return parseInt(hex, 16);
}

// ============================================
// Error Utilities
// ============================================

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for common Web3 error patterns
    const message = error.message;

    // MetaMask rejection
    if (message.includes('user rejected')) return 'Transaction rejected by user';
    if (message.includes('insufficient funds')) return 'Insufficient funds for transaction';
    if (message.includes('nonce too low')) return 'Transaction nonce conflict';
    if (message.includes('gas too low')) return 'Gas limit too low';

    return message;
  }

  if (typeof error === 'string') return error;

  return 'An unknown error occurred';
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate a positive number
 */
export function isPositiveNumber(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
}

/**
 * Validate an integer
 */
export function isInteger(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && Number.isInteger(num);
}

// ============================================
// Async Utilities
// ============================================

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}
