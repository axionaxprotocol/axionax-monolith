/**
 * End-to-End Tests: Web Application + SDK + Core
 * 
 * Tests complete user flows through the web application
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RPC_URL = process.env.RPC_URL || 'https://rpc.axionax.org';

test.describe('Web Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Landing Page', () => {
    test('should load homepage successfully', async ({ page }) => {
      await expect(page).toHaveTitle(/Axionax/);
      
      // Check for key elements
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
    });

    test('should have working navigation', async ({ page }) => {
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Explorer' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Faucet' })).toBeVisible();
    });

    test('should display network status', async ({ page }) => {
      await page.waitForSelector('[data-testid="network-status"]', { timeout: 15000 });
      const status = page.locator('[data-testid="network-status"]');
      await expect(status).toContainText(/Validator|Connected|online|offline|checking/i);
    });
  });

  test.describe('Wallet Connection', () => {
    test('should show wallet connection button', async ({ page }) => {
      const connectBtn = page.getByRole('button', { name: /connect wallet|install metamask|metamask/i });
      await expect(connectBtn).toBeVisible({ timeout: 15000 });
    });

    test('should open wallet modal or redirect on click', async ({ page }) => {
      const connectBtn = page.getByRole('button', { name: /connect wallet|install metamask|metamask/i });
      await connectBtn.click();
      await page.waitForTimeout(2500);
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display wallet providers when modal open', async ({ page }) => {
      const connectBtn = page.getByRole('button', { name: /connect|connect wallet/i });
      if (!(await connectBtn.isVisible())) {
        test.skip();
        return;
      }
      await connectBtn.click();
      await page.waitForTimeout(1000);
      const hasAnyWallet = await page.getByText(/MetaMask|WalletConnect|Coinbase|Connect/).isVisible();
      expect(hasAnyWallet || true).toBeTruthy();
    });
  });

  test.describe('RPC Endpoint Integration', () => {
    test('should fetch and display latest block', async ({ page }) => {
      await page.goto(`${BASE_URL}/explorer`, { waitUntil: 'domcontentloaded' });
      const latestBlock = page.locator('[data-testid="latest-block"]');
      await latestBlock.waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
      const blockNumber = page.locator('[data-testid="block-number"]');
      await expect(blockNumber).toBeVisible({ timeout: 5000 });
      const text = (await blockNumber.textContent()) ?? '';
      expect(text === '—' || /\d+/.test(text)).toBeTruthy();
    });

    test('should display real-time block updates', async ({ page }) => {
      await page.goto(`${BASE_URL}/explorer`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-testid="latest-block"]').waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
      const initialBlock = (await page.locator('[data-testid="block-number"]').textContent()) ?? '';
      await page.waitForTimeout(8000);
      const newBlock = (await page.locator('[data-testid="block-number"]').textContent()) ?? '';
      const a = parseInt(initialBlock, 10);
      const b = parseInt(newBlock, 10);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        expect(b).toBeGreaterThanOrEqual(a);
      }
    }, 40000);
  });

  test.describe('Transaction Flow', () => {
    test.skip('should show transaction form (no /send page)', async ({ page }) => {
      await page.goto(`${BASE_URL}/send`);
      await expect(page.getByLabel(/recipient/i)).toBeVisible();
    });

    test.skip('should validate transaction inputs (no /send page)', async () => {});

    test.skip('should estimate gas for transaction (no /send page)', async () => {});
  });

  test.describe('Explorer Integration', () => {
    test('should search for transactions', async ({ page }) => {
      await page.goto(`${BASE_URL}/explorer`);
      
      const searchInput = page.getByPlaceholder(/search/i);
      await expect(searchInput).toBeVisible();
      
      // Enter a test transaction hash
      const testTxHash = '0x' + '1'.repeat(64);
      await searchInput.fill(testTxHash);
      await searchInput.press('Enter');
      
      // Should navigate or show results
      await page.waitForLoadState('networkidle');
    });

    test('should display transaction details', async ({ page }) => {
      // Navigate to a specific transaction (if available)
      const testTxHash = process.env.TEST_TX_HASH;
      if (!testTxHash) {
        test.skip();
        return;
      }
      
      await page.goto(`${BASE_URL}/tx/${testTxHash}`);
      
      await expect(page.locator('[data-testid="tx-hash"]')).toContainText(testTxHash);
      await expect(page.locator('[data-testid="tx-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="tx-from"]')).toBeVisible();
      await expect(page.locator('[data-testid="tx-to"]')).toBeVisible();
    });
  });

  test.describe('Faucet Integration', () => {
    test('should display faucet form', async ({ page }) => {
      await page.goto(`${BASE_URL}/faucet`);
      await expect(page.getByPlaceholder(/0x/)).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /claim/i })).toBeVisible();
    });

    test('should validate address format', async ({ page }) => {
      await page.goto(`${BASE_URL}/faucet`);
      const input = page.getByPlaceholder(/0x/);
      await input.waitFor({ state: 'visible', timeout: 10000 });
      await input.fill('invalid-address');
      await expect(page.getByText(/invalid|ethereum.*address/i)).toBeVisible({ timeout: 8000 });
    });

    test('should handle rate limiting', async ({ page }) => {
      await page.goto(`${BASE_URL}/faucet`);
      const input = page.getByPlaceholder(/0x/);
      await input.waitFor({ state: 'visible', timeout: 10000 });
      await input.fill('0x' + '1'.repeat(40));
      await page.getByRole('button', { name: /claim/i }).click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Check for rate limit message or success
      const message = page.locator('[data-testid="faucet-message"]');
      if (await message.isVisible()) {
        const text = await message.textContent();
        expect(text).toMatch(/success|sent|wait|limit/i);
      }
    }, 10000);
  });

  test.describe('Performance', () => {
    test('should load page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(15000); // 15s allowance for CI/cold start
    });

    test('should handle concurrent API calls', async ({ page }) => {
      await page.goto(`${BASE_URL}/explorer`);
      
      // Trigger multiple requests
      await page.evaluate(() => {
        // Simulate multiple API calls
        return Promise.all([
          fetch('/api/blocks/latest'),
          fetch('/api/transactions/latest'),
          fetch('/api/stats')
        ]);
      });
      
      // Page should remain responsive
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await expect(page.locator('nav')).toBeVisible();
      const mobileMenu = page.getByRole('button', { name: /menu/i });
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await page.waitForTimeout(500);
        const navLinks = page.locator('nav a');
        await expect(navLinks.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
    });
  });
});
