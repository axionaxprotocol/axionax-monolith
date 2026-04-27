
import { test, expect } from '@playwright/test';

test('take a screenshot of the homepage with new design', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible(); // Wait for hero to be visible
  await page.screenshot({ path: 'apps/web/public/design_preview_v2.png', fullPage: true });
});
