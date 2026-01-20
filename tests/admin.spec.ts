import { test, expect } from '@playwright/test';

test('admin can create and delete a resource (dev)', async ({ page }) => {
  await page.goto('/');
  await page.click('text=All set');

  // open admin
  await page.click('button:has-text("Admin")');
  await page.waitForSelector('text=Admin — Content manager');

  const title = `admin-test-${Date.now()}`;
  await page.selectOption('select', 'video');
  await page.fill('input[placeholder="Title"]', title);
  await page.fill('input[placeholder="tags (comma)"]', 'admin-test');

  // create -> ensure appears in list
  await page.click('button:has-text("Create")');
  await page.waitForSelector(`text=${title}`);
  expect(await page.isVisible(`text=${title}`)).toBeTruthy();

  // delete
  await page.click(`li:has-text("${title}") button:has-text("Delete")`);
  // confirm dialog handling
  await page.waitForTimeout(200); // small wait for deletion
  const still = await page.locator(`text=${title}`).count();
  expect(still).toBeLessThan(1);
});