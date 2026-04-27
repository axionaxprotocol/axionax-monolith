/**
 * Axionax Client Implementation
 *
 * Main client for interacting with Axionax Protocol.
 * Current implementation still uses mock contract interactions.
 */

import { ethers } from 'ethers';
import type {
  ClientConfig,
  AxionaxClient,
  EscrowTransaction,
  Job,
  Worker,
  RpcNodeEndpoint,
} from './types';
import { EscrowStatus, JobStatus } from './types';
import { DEFAULT_CONFIG } from './config';
import { withRpcFallback } from './rpc-fallback';

// ============================================
// Mock Data (TODO: Replace with real contracts)
// ============================================

const mockEscrowStore = new Map<string, EscrowTransaction>();
const mockJobs: Job[] = [];
const mockWorkers: Worker[] = [
  {
    id: 'worker-001',
    name: 'axionax-asr-worker-1',
    address: '0x1234567890123456789012345678901234567890',
    specs: 'Whisper Large V3, 32 vCPU, 128 GB RAM',
    pricePerHour: 0.1,
    isActive: true,
    reputation: 95,
  },
  {
    id: 'worker-002',
    name: 'axionax-asr-worker-2',
    address: '0x2345678901234567890123456789012345678901',
    specs: 'Conformer-1, 16 vCPU, 64 GB RAM',
    pricePerHour: 0.08,
    isActive: true,
    reputation: 92,
  },
];

// ============================================
// Client Implementation
// ============================================

class AxionaxClientImpl implements AxionaxClient {
  config: ClientConfig;
  private provider?: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(config: ClientConfig) {
    this.config = config;

    if (config.provider) {
      this.provider = config.provider as ethers.Provider;
    }
    if (config.signer) {
      this.signer = config.signer as ethers.Signer;
    }
  }

  // ============================================
  // Escrow Methods
  // ============================================

  async getEscrowStatus(jobId: string): Promise<EscrowTransaction | null> {
    // TODO: Call escrow contract
    return mockEscrowStore.get(jobId) || null;
  }

  async depositEscrow(jobId: string, amount: bigint): Promise<EscrowTransaction> {
    // TODO: Call escrow contract deposit function
    const tx: EscrowTransaction = {
      id: `escrow-${Date.now()}`,
      jobId,
      buyer: (await this.getAddress()) || '0x0000000000000000000000000000000000000000',
      seller: '0x0000000000000000000000000000000000000000',
      amount,
      status: EscrowStatus.Deposited,
      txHash: `0x${Date.now().toString(16)}${'0'.repeat(48)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockEscrowStore.set(jobId, tx);
    return tx;
  }

  async releaseEscrow(jobId: string): Promise<EscrowTransaction> {
    // TODO: Call escrow contract release function
    const existing = mockEscrowStore.get(jobId);
    if (!existing) {
      throw new Error('Escrow not found');
    }
    const updated: EscrowTransaction = {
      ...existing,
      status: EscrowStatus.Released,
      updatedAt: new Date(),
    };
    mockEscrowStore.set(jobId, updated);
    return updated;
  }

  async refundEscrow(jobId: string): Promise<EscrowTransaction> {
    // TODO: Call escrow contract refund function
    const existing = mockEscrowStore.get(jobId);
    if (!existing) {
      throw new Error('Escrow not found');
    }
    const updated: EscrowTransaction = {
      ...existing,
      status: EscrowStatus.Refunded,
      updatedAt: new Date(),
    };
    mockEscrowStore.set(jobId, updated);
    return updated;
  }

  // ============================================
  // Job Methods
  // ============================================

  async getJobs(): Promise<Job[]> {
    // TODO: Fetch from job registry contract
    return mockJobs;
  }

  async getJob(jobId: string): Promise<Job | null> {
    // TODO: Fetch from job registry contract
    return mockJobs.find((j) => j.id === jobId) || null;
  }

  async createJob(jobData: Partial<Job>): Promise<Job> {
    // TODO: Create job in registry contract
    const job: Job = {
      id: `job-${Date.now()}`,
      name: jobData.name || 'Untitled Job',
      description: jobData.description || '',
      requester: (await this.getAddress()) || '0x0000000000000000000000000000000000000000',
      status: JobStatus.Open,
      payment: jobData.payment || BigInt(0),
      createdAt: new Date(),
    };
    mockJobs.push(job);
    return job;
  }

  // ============================================
  // Worker Methods
  // ============================================

  async getWorkers(): Promise<Worker[]> {
    // TODO: Fetch from worker registry contract
    return mockWorkers;
  }

  async selectWorker(workerId: string): Promise<Worker> {
    // TODO: Interact with ASR (Auto-Selection Router)
    const worker = mockWorkers.find((w) => w.id === workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }
    return worker;
  }

  // ============================================
  // Wallet Methods
  // ============================================

  async getBalance(address: string): Promise<bigint> {
    if (this.provider) {
      try {
        return await this.provider.getBalance(address);
      } catch (error) {
        console.error('Failed to get balance:', error);
        return BigInt(0);
      }
    }

    const nodes = resolveRpcNodes(this.config);
    try {
      const { result, node } = await withRpcFallback<string>(
        nodes,
        'eth_getBalance',
        [address, 'latest'],
        { timeoutMs: 5_000 }
      );
      this.config.rpcUrl = node.url;
      return BigInt(result || '0x0');
    } catch {
      return BigInt(0);
    }
  }

  async getAddress(): Promise<string | null> {
    if (this.signer) {
      try {
        return await this.signer.getAddress();
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ============================================
// Helpers
// ============================================

function resolveRpcNodes(config: Partial<ClientConfig>): readonly RpcNodeEndpoint[] {
  if (config.rpcNodes?.length) {
    return config.rpcNodes;
  }
  const urls = config.rpcUrls?.length
    ? config.rpcUrls
    : ([config.rpcUrl].filter(Boolean) as string[]);
  return urls.map((url, i) => ({
    id: `rpc-${i}`,
    label: `RPC ${i + 1}`,
    url,
  }));
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Axionax client instance
 */
export function createClient(config: Partial<ClientConfig> = {}): AxionaxClient {
  const def = DEFAULT_CONFIG;
  const defaultRpcUrls = [...def.rpcUrls];
  const defaultNodes: readonly RpcNodeEndpoint[] =
    'rpcNodes' in def && def.rpcNodes?.length
      ? [...def.rpcNodes]
      : defaultRpcUrls.map((url, i) => ({
          id: `rpc-${i}`,
          label: `RPC ${i + 1}`,
          url,
        }));

  const rpcNodes = config.rpcNodes?.length ? [...config.rpcNodes] : defaultNodes;
  const rpcUrls = config.rpcUrls?.length
    ? [...config.rpcUrls]
    : rpcNodes.map((n) => n.url);

  const fullConfig: ClientConfig = {
    ...config,
    rpcUrl: config.rpcUrl ?? rpcUrls[0] ?? defaultRpcUrls[0] ?? '',
    chainId: config.chainId ?? def.chainIdDecimal,
    rpcUrls,
    rpcNodes,
  };

  return new AxionaxClientImpl(fullConfig);
}

// Export the class as well for type usage
export { AxionaxClientImpl };
