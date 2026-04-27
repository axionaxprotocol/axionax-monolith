/**
 * Escrow Service - Mock implementation for Axionax Marketplace
 * Handles escrow creation and status queries.
 */

import type { EscrowTransaction } from '../types';
import { EscrowStatus } from '../types';

export interface EscrowServiceResult {
  jobId: string;
  status: EscrowStatus;
  amount?: bigint;
  txHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const mockEscrowStore = new Map<string, EscrowTransaction>();

/**
 * Mock EscrowService for development and testing.
 * Replace with real contract calls when mainnet is ready.
 */
export class EscrowService {
  /**
   * Create a new escrow deposit for a job.
   * @param jobId - Unique job identifier
   * @param amount - Amount in AXX (string, e.g. "1.5" for 1.5 AXX)
   */
  async createEscrow(jobId: string, amount: string): Promise<EscrowTransaction> {
    await new Promise((resolve) => setTimeout(resolve, 1200)); // Simulate network delay

    const amountWei = BigInt(Math.floor(parseFloat(amount || '0') * 1e18));
    const tx: EscrowTransaction = {
      id: `escrow-${Date.now()}`,
      jobId,
      buyer: '0x0000000000000000000000000000000000000000',
      seller: '0x0000000000000000000000000000000000000000',
      amount: amountWei,
      status: EscrowStatus.Deposited,
      txHash: `0x${Date.now().toString(16).padStart(8, '0')}${'0'.repeat(56)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockEscrowStore.set(jobId, tx);
    return tx;
  }

  /**
   * Get the current escrow status for a job.
   * @param jobId - Unique job identifier
   */
  async getEscrowStatus(jobId: string): Promise<EscrowTransaction | null> {
    await new Promise((resolve) => setTimeout(resolve, 400)); // Simulate network delay
    return mockEscrowStore.get(jobId) ?? null;
  }

  /**
   * Release escrow funds to the seller (mock).
   */
  async releaseEscrow(jobId: string): Promise<EscrowTransaction> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const existing = mockEscrowStore.get(jobId);
    if (!existing) throw new Error('Escrow not found');
    const updated: EscrowTransaction = {
      ...existing,
      status: EscrowStatus.Released,
      updatedAt: new Date(),
    };
    mockEscrowStore.set(jobId, updated);
    return updated;
  }

  /**
   * Refund escrow funds to the buyer (mock).
   */
  async refundEscrow(jobId: string): Promise<EscrowTransaction> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const existing = mockEscrowStore.get(jobId);
    if (!existing) throw new Error('Escrow not found');
    const updated: EscrowTransaction = {
      ...existing,
      status: EscrowStatus.Refunded,
      updatedAt: new Date(),
    };
    mockEscrowStore.set(jobId, updated);
    return updated;
  }
}

/** Singleton instance for use across the app */
export const escrowService = new EscrowService();
