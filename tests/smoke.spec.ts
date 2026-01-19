import { test, expect } from '@playwright/test';

test('onboarding → lab input → shows resource for Vitamin D = 25', async ({ page }) => {
  await page.goto('/');
  await page.click('text=All set');
  await page.selectOption('select', { index: 0 });
  await page.fill('input[placeholder="e.g., 25"]', '25');
  await page.click('text=See resources');
  await expect(page.locator('text=Understanding Low Vit D')).toBeVisible();
});
