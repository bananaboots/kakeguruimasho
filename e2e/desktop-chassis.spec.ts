/**
 * Playwright — desktop chassis assertions.
 *
 * Runs only under the desktop-chromium project (1440x900). The chromium-
 * mobile project skips this file via `testIgnore` in playwright.config.ts.
 * Asserts that:
 *   - Left rail and right rail are visible at >=1024px.
 *   - Bottom nav is hidden.
 *   - Vault renders 3 tier columns at desktop.
 *   - Onboarding renders inside the cinematic backdrop.
 *
 * Uses the same fresh-install + auto-onboard pattern as smoke.spec.ts.
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Desktop chassis', () => {
  async function clearAndOnboard(page: Page): Promise<void> {
    await page.goto('/');
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('kakeguruimasho');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.goto('/#/');

    // Walk through onboarding to land in the post-firstRun shell.
    await expect(page.getByTestId('welcome-screen')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'I Swear to the House' }).click();
    await page.getByLabel('Mini label').fill('Coffee');
    await page.getByLabel('Mini target in dollars').fill('10');
    await page.getByLabel('Mid label').fill('Book');
    await page.getByLabel('Mid target in dollars').fill('50');
    await page.getByLabel('Moonshot label').fill('Trip');
    await page.getByLabel('Moonshot target in dollars').fill('500');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByTestId('quicklog-habit_walk')).toBeVisible({
      timeout: 15_000,
    });
  }

  test('left + right rail visible, bottom nav hidden at 1440px', async ({ page }) => {
    await clearAndOnboard(page);
    await expect(page.locator('.left-rail').first()).toBeVisible();
    await expect(page.locator('.right-rail').first()).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();
  });

  test('Vault renders 3 tier columns at desktop', async ({ page }) => {
    await clearAndOnboard(page);
    await page.evaluate(() => {
      window.location.hash = '#/rewards';
    });
    const tiers = page.locator('.reward-tiers');
    await expect(tiers).toBeVisible();
    await expect(tiers).toHaveCSS('grid-template-columns', /(repeat\(3|.*\s.*\s.*)/);
  });

  test('Onboarding renders inside cinematic backdrop', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('kakeguruimasho');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.goto('/#/onboarding');
    await expect(page.getByTestId('cinematic-backdrop')).toBeVisible({
      timeout: 15_000,
    });
  });
});
