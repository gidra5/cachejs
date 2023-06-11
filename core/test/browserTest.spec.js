import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8000;

test('has 0 failures', async ({ page }) => {
  const app = express();
  app.use(express.static(path.resolve(dir, '..')));
  app.listen(PORT);

  await page.goto(`http://localhost:${PORT}/test/test.esm.html`);

  const failures = page.locator('li.failures em');
  await expect(failures).toHaveText('0');
});
