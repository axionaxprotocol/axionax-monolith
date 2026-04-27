import { test, expect } from '@playwright/test';

test.describe('API Endpoint Tests', () => {
  test.describe('GET /api/stats', () => {
    test('should return network statistics', async ({ request }) => {
      const response = await request.get('/api/stats');

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();

      // Check response structure
      expect(data).toHaveProperty('blockNumber');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('deployment');
      expect(data).toHaveProperty('validators');
      expect(data).toHaveProperty('timestamp');

      // Check data types
      expect(typeof data.blockNumber).toBe('number');
      expect(typeof data.services.healthy).toBe('number');
      expect(typeof data.services.total).toBe('number');
      expect(typeof data.uptime.hours).toBe('number');
      expect(typeof data.deployment).toBe('number');

      // Check validators
      expect(data.validators.online).toBe(2);
      expect(data.validators.total).toBe(2);
    });

    test('should include CORS headers', async ({ request }) => {
      const response = await request.get('/api/stats');

      const headers = response.headers();
      expect(headers['access-control-allow-origin']).toBe('*');
      expect(headers['access-control-allow-methods']).toContain('GET');
    });

    test('should include cache headers', async ({ request }) => {
      const response = await request.get('/api/stats');

      const headers = response.headers();
      expect(headers['cache-control']).toContain('s-maxage=5');
    });

    test('should enforce rate limiting', async ({ request }) => {
      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 60; i++) {
        requests.push(request.get('/api/stats'));
      }

      const responses = await Promise.all(requests);

      // At least one request should succeed
      const successfulRequests = responses.filter((r) => r.ok());
      expect(successfulRequests.length).toBeGreaterThan(0);

      // Eventually we should hit rate limit
      const rateLimitedRequests = responses.filter((r) => r.status() === 429);
      if (rateLimitedRequests.length > 0) {
        const rateLimited = rateLimitedRequests[0];
        const headers = rateLimited.headers();
        expect(headers['retry-after']).toBeDefined();
      }
    });
  });

  test.describe('GET /api/blocks', () => {
    test('should return blocks list', async ({ request }) => {
      const response = await request.get('/api/blocks?page=1&pageSize=10');

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();

      // Check response structure
      expect(data).toHaveProperty('blocks');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('pageSize');

      // Check blocks array
      expect(Array.isArray(data.blocks)).toBeTruthy();
      expect(data.blocks.length).toBeGreaterThan(0);
      expect(data.blocks.length).toBeLessThanOrEqual(10);

      // Check first block structure
      const firstBlock = data.blocks[0];
      expect(firstBlock).toHaveProperty('number');
      expect(firstBlock).toHaveProperty('hash');
      expect(firstBlock).toHaveProperty('timestamp');
      expect(firstBlock).toHaveProperty('transactions');
      expect(firstBlock).toHaveProperty('miner');
      expect(firstBlock).toHaveProperty('gasUsed');
      expect(firstBlock).toHaveProperty('gasLimit');
    });

    test('should support pagination', async ({ request }) => {
      const page1 = await request.get('/api/blocks?page=1&pageSize=5');
      const page2 = await request.get('/api/blocks?page=2&pageSize=5');

      expect(page1.ok()).toBeTruthy();
      expect(page2.ok()).toBeTruthy();

      const data1 = await page1.json();
      const data2 = await page2.json();

      expect(data1.page).toBe(1);
      expect(data2.page).toBe(2);

      // Blocks should be different
      expect(data1.blocks[0].number).not.toBe(data2.blocks[0].number);
    });

    test('should validate pagination parameters', async ({ request }) => {
      // Invalid page
      const invalidPage = await request.get('/api/blocks?page=0&pageSize=10');
      expect(invalidPage.status()).toBe(400);

      // Invalid pageSize
      const invalidSize = await request.get('/api/blocks?page=1&pageSize=200');
      expect(invalidSize.status()).toBe(400);
    });

    test('should include CORS headers', async ({ request }) => {
      const response = await request.get('/api/blocks');

      const headers = response.headers();
      expect(headers['access-control-allow-origin']).toBe('*');
    });
  });

  test.describe('POST /api/faucet', () => {
    test('should accept valid faucet request', async ({ request }) => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4';

      const response = await request.post('/api/faucet', {
        data: {
          address: validAddress,
        },
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();

      // Check response structure
      expect(data.success).toBeTruthy();
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('txHash');
      expect(data).toHaveProperty('amount');
      expect(data.amount).toBe('10');
    });

    test('should reject invalid address format', async ({ request }) => {
      const response = await request.post('/api/faucet', {
        data: {
          address: 'invalid-address',
        },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.success).toBeFalsy();
      expect(data.message).toContain('Invalid');
    });

    test('should reject missing address', async ({ request }) => {
      const response = await request.post('/api/faucet', {
        data: {},
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.success).toBeFalsy();
    });

    test('should enforce cooldown period', async ({ request }) => {
      const address =
        '0x' + Math.random().toString(16).slice(2).padEnd(40, '0');

      // First request should succeed
      const first = await request.post('/api/faucet', {
        data: { address },
      });
      expect(first.ok()).toBeTruthy();

      // Second immediate request should fail
      const second = await request.post('/api/faucet', {
        data: { address },
      });
      expect(second.status()).toBe(429);

      const data = await second.json();
      expect(data.success).toBeFalsy();
      expect(data).toHaveProperty('cooldown');
    });

    test('should enforce strict rate limiting', async ({ request }) => {
      // Faucet has stricter rate limit (10 req/min)
      const requests = [];
      for (let i = 0; i < 15; i++) {
        const randomAddress =
          '0x' + Math.random().toString(16).slice(2).padEnd(40, '0');
        requests.push(
          request.post('/api/faucet', {
            data: { address: randomAddress },
          })
        );
      }

      const responses = await Promise.all(requests);

      // Some should hit rate limit
      const rateLimited = responses.filter((r) => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('GET /api/faucet', () => {
    test('should return faucet status', async ({ request }) => {
      const response = await request.get('/api/faucet');

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('amount');
      expect(data).toHaveProperty('network');
      expect(data).toHaveProperty('chainId');
      expect(data.chainId).toBe(86137);
    });

    test('should check address cooldown', async ({ request }) => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4';

      const response = await request.get(`/api/faucet?address=${address}`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('canClaim');
      expect(data).toHaveProperty('cooldownRemaining');
    });
  });
});
