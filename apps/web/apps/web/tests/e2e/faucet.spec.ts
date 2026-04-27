import { test, expect } from '@playwright/test';

test.describe('Faucet E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faucet');
  });

  test('should display faucet page correctly', async ({ page }) => {
    // Check title
    await expect(page.locator('h1')).toContainText('Testnet Faucet');

    // Check description
    await expect(page.getByText('Get free testnet')).toBeVisible();

    // Check input field
    await expect(page.getByPlaceholder(/0x/)).toBeVisible();

    // Check claim button
    await expect(page.getByRole('button', { name: /Claim/ })).toBeVisible();
  });

  test('should show validation error for empty address', async ({ page }) => {
    const claimButton = page.getByRole('button', { name: /Claim/ });

    // Button should be disabled when input is empty
    await expect(claimButton).toBeDisabled();
  });

  test('should show validation error for invalid address', async ({ page }) => {
    const addressInput = page.getByPlaceholder(/0x/);

    // Type invalid address
    await addressInput.fill('invalid-address');

    // Check for error message
    await expect(page.getByText(/Invalid Ethereum address/)).toBeVisible();

    // Button should be disabled
    const claimButton = page.getByRole('button', { name: /Claim/ });
    await expect(claimButton).toBeDisabled();
  });

  test('should accept valid Ethereum address', async ({ page }) => {
    const addressInput = page.getByPlaceholder(/0x/);
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4';

    // Type valid address
    await addressInput.fill(validAddress);

    // No error message should be shown
    await expect(page.getByText(/Invalid Ethereum address/)).not.toBeVisible();

    // Button should be enabled
    const claimButton = page.getByRole('button', { name: /Claim/ });
    await expect(claimButton).toBeEnabled();
  });

  test('should submit claim request successfully', async ({ page }) => {
    const addressInput = page.getByPlaceholder(/0x/);
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4';

    // Fill address
    await addressInput.fill(validAddress);

    // Click claim button
    const claimButton = page.getByRole('button', { name: /Claim/ });
    await claimButton.click();

    // Wait for loading state
    await expect(page.getByText(/Processing/)).toBeVisible();

    // Wait for success message
    await expect(page.getByText(/Successfully sent/)).toBeVisible({
      timeout: 5000,
    });

    // Check for transaction hash
    await expect(page.getByText(/TX:/)).toBeVisible();

    // Input should be cleared
    await expect(addressInput).toHaveValue('');
  });

  test('should display faucet information', async ({ page }) => {
    // Check amount info
    await expect(page.getByText(/10 AXX per request/)).toBeVisible();

    // Check cooldown info
    await expect(page.getByText(/24 hours/)).toBeVisible();

    // Check network info
    await expect(page.getByText(/Axionax Testnet/)).toBeVisible();
    await expect(page.getByText(/Chain ID: 86137/)).toBeVisible();
  });

  test('should show loading state during claim', async ({ page }) => {
    const addressInput = page.getByPlaceholder(/0x/);
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4';

    await addressInput.fill(validAddress);

    const claimButton = page.getByRole('button', { name: /Claim/ });
    await claimButton.click();

    // Button should be disabled during processing
    await expect(claimButton).toBeDisabled();

    // Processing text should be visible
    await expect(page.getByText(/Processing/)).toBeVisible();
  });

  test('should be mobile responsive', async ({ page, viewport }) => {
    // Test will run with different viewport sizes defined in playwright.config.ts
    const card = page.locator('[class*="Card"]').first();
    await expect(card).toBeVisible();

    // Check input is full width on mobile
    const addressInput = page.getByPlaceholder(/0x/);
    const inputBox = await addressInput.boundingBox();

    if (viewport && viewport.width < 768) {
      // On mobile, input should be close to full width
      expect(inputBox?.width).toBeGreaterThan(viewport.width * 0.8);
    }
  });
});
