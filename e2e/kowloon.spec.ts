/**
 * Phase 4 — Kowloon Electric theme e2e regression.
 *
 * Asserts that:
 *   1. Flipping `kakegurui:theme` → 'kowloon' surfaces the Kowloon-only
 *      bespoke variants on Home (masthead, streak).
 *   2. Flipping back to 'pachinko' fully clears the Kowloon-only DOM.
 *
 * The spec uses the same onboarding bypass pattern as smoke.spec.ts:
 * we walk through the minimal onboarding flow once per test so the
 * `FirstRunGate` lets us land on Home where the bespoke surfaces mount.
 */

import { test, expect, type Page } from '@playwright/test';

async function clearStorage(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('kakeguruimasho');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    window.localStorage.clear();
  });
}

async function completeOnboarding(page: Page) {
  await page.goto('/#/');
  await expect(page.getByTestId('welcome-screen')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('mechanics-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('reward-rules-screen')).toBeVisible();
  await page.getByRole('button', { name: 'I Swear to the House' }).click();
  await expect(page.getByTestId('milestones-screen')).toBeVisible();
  await page.getByLabel('Mini label').fill('Coffee');
  await page.getByLabel('Mini target in dollars').fill('10');
  await page.getByLabel('Mid label').fill('Book');
  await page.getByLabel('Mid target in dollars').fill('50');
  await page.getByLabel('Moonshot label').fill('Trip');
  await page.getByLabel('Moonshot target in dollars').fill('500');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('install-prompt-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();
  // Wait for Home to land so the masthead has mounted.
  await expect(page.getByTestId('quicklog-habit_walk')).toBeVisible({ timeout: 15_000 });
}

test.describe('Kowloon Electric theme', () => {
  test('flip to kowloon via localStorage, walk Home, see Kowloon variants', async ({ page }) => {
    await clearStorage(page);
    await completeOnboarding(page);

    // Set theme via localStorage and reload so it's active on first paint.
    await page.evaluate(() => {
      window.localStorage.setItem('kakegurui:theme', 'kowloon');
    });
    await page.reload();

    // data-theme attribute reflects the theme.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'kowloon');

    // Confirm Kowloon streak is mounted.
    await expect(page.locator('[data-testid="kowloon-streak"]').first()).toBeVisible();

    // PotMini dispatcher should resolve to Kowloon variant.
    // Note: at desktop both Home's inline pot-mini AND the right-rail copy
    // mount with this testid; the inline is hidden by CSS at >=1024px.
    // At mobile only the inline copy mounts. Filter to visible so either
    // mount counts.
    await expect(
      page.locator('[data-testid="kowloon-pot-mini"]:visible').first(),
    ).toBeVisible();
  });

  test('flip back to pachinko clears Kowloon-only elements', async ({ page }) => {
    await clearStorage(page);
    await completeOnboarding(page);

    await page.evaluate(() => {
      window.localStorage.setItem('kakegurui:theme', 'kowloon');
    });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'kowloon');

    // Flip back to pachinko via localStorage.
    await page.evaluate(() => {
      window.localStorage.setItem('kakegurui:theme', 'pachinko');
    });
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'pachinko');

    // No Kowloon-only elements.
    await expect(page.locator('[data-testid="kowloon-masthead"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="kowloon-streak"]')).toHaveCount(0);
  });
});
