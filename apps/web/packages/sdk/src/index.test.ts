/**
 * Tests for @axionax/sdk
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient, EscrowStatus, JobStatus, AXIONAX_TESTNET_CONFIG } from '../src/index';

describe('SDK Configuration', () => {
  it('should have correct testnet chain ID', () => {
    expect(AXIONAX_TESTNET_CONFIG.chainIdDecimal).toBe(86137);
    expect(AXIONAX_TESTNET_CONFIG.chainId).toBe('0x15079');
  });

  it('should have correct testnet name', () => {
    expect(AXIONAX_TESTNET_CONFIG.chainName).toBe('Axionax Testnet');
  });

  it('should have RPC URLs configured', () => {
    expect(AXIONAX_TESTNET_CONFIG.rpcUrls.length).toBeGreaterThan(0);
  });

  it('should expose rpcNodes for multi-RPC fallback', () => {
    expect(AXIONAX_TESTNET_CONFIG.rpcNodes.length).toBe(3);
    expect(AXIONAX_TESTNET_CONFIG.mockRpcNodes.length).toBe(3);
  });

  it('should have native currency configured', () => {
    expect(AXIONAX_TESTNET_CONFIG.nativeCurrency.symbol).toBe('AXXt');
    expect(AXIONAX_TESTNET_CONFIG.nativeCurrency.decimals).toBe(18);
  });
});

describe('createClient', () => {
  it('should create a client with default config', () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.config.chainId).toBe(AXIONAX_TESTNET_CONFIG.chainIdDecimal);
  });

  it('should create a client with custom config', () => {
    const client = createClient({
      rpcUrl: 'https://custom-rpc.example.com',
      chainId: 12345,
    });
    expect(client.config.rpcUrl).toBe('https://custom-rpc.example.com');
    expect(client.config.chainId).toBe(12345);
  });
});

describe('AxionaxClient', () => {
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    client = createClient();
  });

  describe('Escrow Methods', () => {
    it('should return null for non-existent escrow', async () => {
      const status = await client.getEscrowStatus('non-existent-job');
      expect(status).toBeNull();
    });

    it('should deposit escrow and return transaction', async () => {
      const jobId = 'test-job-1';
      const amount = BigInt(1000000000000000000); // 1 token

      const tx = await client.depositEscrow(jobId, amount);

      expect(tx.jobId).toBe(jobId);
      expect(tx.amount).toBe(amount);
      expect(tx.status).toBe(EscrowStatus.Deposited);
      expect(tx.txHash).toBeDefined();
    });

    it('should release deposited escrow', async () => {
      const jobId = 'test-job-release';
      const amount = BigInt(1000000000000000000);

      // First deposit
      await client.depositEscrow(jobId, amount);

      // Then release
      const tx = await client.releaseEscrow(jobId);

      expect(tx.status).toBe(EscrowStatus.Released);
    });

    it('should refund deposited escrow', async () => {
      const jobId = 'test-job-refund';
      const amount = BigInt(1000000000000000000);

      // First deposit
      await client.depositEscrow(jobId, amount);

      // Then refund
      const tx = await client.refundEscrow(jobId);

      expect(tx.status).toBe(EscrowStatus.Refunded);
    });

    it('should throw error when releasing non-existent escrow', async () => {
      await expect(client.releaseEscrow('non-existent')).rejects.toThrow('Escrow not found');
    });
  });

  describe('Job Methods', () => {
    it('should return empty array for jobs initially', async () => {
      const jobs = await client.getJobs();
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should create a new job', async () => {
      const job = await client.createJob({
        name: 'Test Job',
        description: 'A test job description',
        payment: BigInt(1000000000000000000),
      });

      expect(job.id).toBeDefined();
      expect(job.name).toBe('Test Job');
      expect(job.status).toBe(JobStatus.Open);
    });

    it('should return null for non-existent job', async () => {
      const job = await client.getJob('non-existent-job');
      expect(job).toBeNull();
    });
  });

  describe('Worker Methods', () => {
    it('should return mock workers', async () => {
      const workers = await client.getWorkers();

      expect(Array.isArray(workers)).toBe(true);
      expect(workers.length).toBeGreaterThan(0);
      expect(workers[0].id).toBeDefined();
      expect(workers[0].name).toBeDefined();
    });

    it('should select a worker by ID', async () => {
      const workers = await client.getWorkers();
      const worker = await client.selectWorker(workers[0].id);

      expect(worker.id).toBe(workers[0].id);
    });

    it('should throw error for non-existent worker', async () => {
      await expect(client.selectWorker('non-existent')).rejects.toThrow('Worker not found');
    });
  });

  describe('Wallet Methods', () => {
    it('should return null address when no signer', async () => {
      const address = await client.getAddress();
      expect(address).toBeNull();
    });

    it('should fetch balance (mock returns 0 without provider)', async () => {
      const origFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      try {
        const balance = await client.getBalance(
          '0x1234567890123456789012345678901234567890'
        );
        expect(typeof balance).toBe('bigint');
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });
});

describe('Enums', () => {
  it('should have correct EscrowStatus values', () => {
    expect(EscrowStatus.Pending).toBe('pending');
    expect(EscrowStatus.Deposited).toBe('deposited');
    expect(EscrowStatus.Released).toBe('released');
    expect(EscrowStatus.Refunded).toBe('refunded');
    expect(EscrowStatus.Disputed).toBe('disputed');
  });

  it('should have correct JobStatus values', () => {
    expect(JobStatus.Open).toBe('open');
    expect(JobStatus.Assigned).toBe('assigned');
    expect(JobStatus.InProgress).toBe('in_progress');
    expect(JobStatus.Completed).toBe('completed');
    expect(JobStatus.Cancelled).toBe('cancelled');
  });
});
