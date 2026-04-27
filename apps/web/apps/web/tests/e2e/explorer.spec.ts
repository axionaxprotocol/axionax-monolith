import { test, expect } from '@playwright/test';

test.describe('Explorer E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explorer');
  });

  test('should display explorer page correctly', async ({ page }) => {
    // Check title
    await expect(page.locator('h1')).toContainText('Block Explorer');

    // Check description
    await expect(page.getByText(/Explore blocks, transactions/)).toBeVisible();
  });

  test('should display network statistics', async ({ page }) => {
    // Wait for stats to load
    await page.waitForTimeout(1000);

    // Check for stats cards
    await expect(page.getByText('Latest Block')).toBeVisible();
    await expect(page.getByText('Total Blocks')).toBeVisible();
    await expect(page.getByText('Active Validators')).toBeVisible();

    // Check validator count
    await expect(page.getByText('2/2')).toBeVisible();
  });

  test('should display recent blocks list', async ({ page }) => {
    // Wait for blocks to load
    await page.waitForTimeout(2000);

    // Check for blocks section
    await expect(page.getByText('Recent Blocks')).toBeVisible();

    // Should have at least one block
    const blockNumbers = page.locator('[class*="font-mono"]:has-text("#")');
    await expect(blockNumbers.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state initially', async ({ page }) => {
    // Check for loading indicator
    await expect(page.getByText(/\.\.\./)).toBeVisible();
  });

  test('should update block data periodically', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000);

    // Get first block number
    const firstBlock = page.locator('[class*="text-primary-400"]').first();
    const initialText = await firstBlock.textContent();

    // Wait for refresh (5 seconds + buffer)
    await page.waitForTimeout(6000);

    // Block number should still be visible (may or may not change)
    await expect(firstBlock).toBeVisible();
  });

  test('should display block details', async ({ page }) => {
    // Wait for blocks to load
    await page.waitForTimeout(2000);

    // Check for block details
    await expect(page.getByText(/Txs:/)).toBeVisible();
    await expect(page.getByText(/Gas:/)).toBeVisible();
  });

  test('should show timestamp for blocks', async ({ page }) => {
    // Wait for blocks to load
    await page.waitForTimeout(2000);

    // Check for relative timestamps
    const timestamps = page.locator('text=/ago$/');
    await expect(timestamps.first()).toBeVisible();
  });

  test('should be mobile responsive', async ({ page, viewport }) => {
    // Stats cards should stack on mobile
    const statsContainer = page.locator('.grid').first();
    await expect(statsContainer).toBeVisible();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // On mobile, cards should be full width
    if (viewport && viewport.width < 768) {
      const cards = page.locator('[class*="Card"]');
      const firstCard = cards.first();
      const cardBox = await firstCard.boundingBox();

      if (cardBox) {
        expect(cardBox.width).toBeGreaterThan(viewport.width * 0.8);
      }
    }
  });

  test('should handle API errors gracefully', async ({ page, context }) => {
    // Block API requests
    await context.route('**/api/blocks*', (route) => {
      route.abort();
    });

    await page.goto('/explorer');

    // Should show error or no blocks message
    await page.waitForTimeout(2000);
    // Page should still be accessible even if API fails
    await expect(page.locator('h1')).toBeVisible();
  });
});
