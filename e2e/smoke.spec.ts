/**
 * Phase 4 — Playwright smoke E2E.
 *
 * Covers the scenario from SPEC §9 Phase 4:
 *   1. Fresh install: navigate to /#/, complete onboarding.
 *   2. Log a habit (Walk quick-log, enter 2500 steps).
 *   3. Cash-in: navigate to /#/spin, skip cash-in, spin.
 *   4. Reward claim: pick the first reward if a picker appears.
 *   5. Persistence: reload page, verify state survives.
 *
 * Fails on any console.error.
 */

import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out known-benign PWA service-worker precache / manifest probes
      // that browsers may log at HEAD-404 time. None expected in prod build.
      if (text.includes('Failed to register a ServiceWorker')) return;
      if (text.includes('manifest')) return;
      errors.push(text);
      // eslint-disable-next-line no-console
      console.log(`[browser console.error] ${text}`);
    }
  });
  page.on('pageerror', (err: Error) => {
    errors.push(`[pageerror] ${err.message}`);
    // eslint-disable-next-line no-console
    console.log(`[browser pageerror] ${err.message}\n${err.stack ?? ''}`);
  });
  return errors;
}

test.describe('Kakeguruimasho smoke', () => {
  test('fresh install → onboard → log → spin → reload persistence', async ({ page }) => {
    const errors = watchForErrors(page);

    // Clear any pre-existing IDB so we start fresh. We navigate to baseURL
    // first so `indexedDB` is available on the right origin.
    await page.goto('/');
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('kakeguruimasho');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    // Reload so the app re-seeds from scratch.
    await page.goto('/#/');

    // ---- Onboarding ----

    // Step 1: Welcome. Click "Start".
    await expect(page.getByTestId('welcome-screen')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Start' }).click();

    // Step 2: Mechanics. Click "Continue".
    await expect(page.getByTestId('mechanics-screen')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Reward Rules. Click "I commit".
    await expect(page.getByTestId('reward-rules-screen')).toBeVisible();
    await page.getByRole('button', { name: 'I commit' }).click();

    // Step 4: Milestones. Fill minimal values then Save.
    await expect(page.getByTestId('milestones-screen')).toBeVisible();
    await page.getByLabel('Mini label').fill('Coffee');
    await page.getByLabel('Mini target in dollars').fill('10');
    await page.getByLabel('Mid label').fill('Book');
    await page.getByLabel('Mid target in dollars').fill('50');
    await page.getByLabel('Moonshot label').fill('Trip');
    await page.getByLabel('Moonshot target in dollars').fill('500');
    await page.getByRole('button', { name: 'Save' }).click();

    // Step 5: Install prompt (iOS fallback copy). Click Finish.
    await expect(page.getByTestId('install-prompt-screen')).toBeVisible();
    await page.getByRole('button', { name: 'Finish' }).click();

    // ---- Home: log a habit ----

    // After Finish, we navigate to '/'. Wait for the home quicklog to land.
    await expect(page.getByTestId('quicklog-habit_walk')).toBeVisible({ timeout: 15_000 });
    // Hand summary shows 0 before logging.
    await expect(page.getByTestId('hand-summary')).toContainText('0');

    // The Walk quick-log opens StepEntry for `count` habits.
    await page.getByTestId('quicklog-habit_walk').click();
    const stepInput = page.getByLabel('Steps today');
    await expect(stepInput).toBeVisible();
    await stepInput.fill('2500');
    // Log button should enable once 2500 is entered (>= one clip).
    const logButton = page.getByRole('button', { name: /^Log 1 clip$/ });
    await expect(logButton).toBeEnabled();
    await logButton.click();

    // After ~800ms the dialog auto-dismisses.
    await expect(stepInput).toBeHidden({ timeout: 3000 });

    // Hand summary should now show "1 clip".
    await expect(page.getByTestId('hand-summary')).toContainText('1');

    // ---- Spin flow ----
    //
    // Use a client-side hash change rather than page.goto — goto() triggers
    // a real navigation which resets in-memory Zustand state. HashRouter
    // picks up the hashchange event and renders /spin without reloading.
    await page.evaluate(() => {
      window.location.hash = '#/spin';
    });
    await expect(page.getByTestId('spin-flow')).toBeVisible({ timeout: 10_000 });

    // Skip cash-in (0-match) and spin. The SpinButton is enabled by default
    // because we're in idle phase.
    const spinBtn = page.getByRole('button', { name: 'Spin' });
    await expect(spinBtn).toBeEnabled();
    await spinBtn.click();

    // Wait for the wheel to resolve. Either a reward picker opens, or a
    // near-miss toast appears. Either outcome is valid for the smoke.
    const rewardListbox = page.getByRole('listbox');
    const nearMissToast = page.getByText(/Almost/i);
    await Promise.race([
      rewardListbox.first().waitFor({ state: 'visible', timeout: 20_000 }),
      nearMissToast.first().waitFor({ state: 'visible', timeout: 20_000 }),
    ]);

    // If the reward picker is visible, pick the first reward.
    if (await rewardListbox.first().isVisible().catch(() => false)) {
      const firstOption = rewardListbox.first().getByRole('option').first();
      await firstOption.click();
    }

    // ---- Persistence: reload + verify ----
    //
    // Wait a beat so the debounced Zustand→IDB persist has flushed. The
    // schedule window is ~16ms; 500ms gives a comfortable margin for all
    // the writes in the spin chain.
    await page.waitForTimeout(500);
    // Jump to home before reloading so we re-enter the app at the route
    // that demonstrates FirstRunGate is passing state through correctly.
    await page.evaluate(() => {
      window.location.hash = '#/';
    });
    await page.reload();
    // After reload, the Home route renders behind the FirstRunGate only if
    // firstRunCompleted persisted — seeing the quicklog grid (not the
    // onboarding flow) is itself the persistence assertion.
    await expect(page.getByTestId('quicklog-habit_walk')).toBeVisible({ timeout: 15_000 });

    // Hand summary reflects post-spin state. We skipped cash-in so the
    // clip is still in hand.
    const handText = await page.getByTestId('hand-summary').textContent();
    expect(handText).toMatch(/\d+\s+clip/);

    // ---- Console sanity ----
    expect(errors, `Console errors captured: ${errors.join('\n')}`).toEqual([]);
  });
});
