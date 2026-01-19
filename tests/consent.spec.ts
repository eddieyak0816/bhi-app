import { test, expect } from '@playwright/test';

test('does not call save endpoint when consent not given', async ({ page }) => {
  await page.goto('/');
  await page.click('text=All set');
  const [req] = await Promise.all([
    page.waitForRequest(r => r.url().includes('/api/save-lab'), { timeout: 1000 }).catch(() => null),
    page.click('text=See resources')
  ]);
  expect(req).toBeNull();
});

test('calls save endpoint when consent given and Save clicked', async ({ page }) => {
  await page.goto('/');
  await page.click('text=All set');
  await page.check('input[type="checkbox"]');

  let saw = false
  await page.route('**/api/save-lab', route => { saw = true; route.fulfill({ status: 200, body: 'ok' }) })
  await page.click('text=Save')
  expect(saw).toBeTruthy();
});
