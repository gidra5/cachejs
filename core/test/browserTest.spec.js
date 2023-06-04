import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const esmHtmlPath = path.resolve(dir, '../test/test.esm.html');
const cjsHtmlPath = path.resolve(dir, '../test/test.cjs.html');

test('esm has 0 failures', async ({ page }) => {
  await page.goto('file://' + esmHtmlPath);

  const failures = page.locator('li.failures em');
  await expect(failures).toHaveText('0');
});

test('cjs has 0 failures', async ({ page }) => {
  await page.goto('file://' + cjsHtmlPath);

  const failures = page.locator('li.failures em');
  await expect(failures).toHaveText('0');
});
