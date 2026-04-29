/**
 * Playwright config (Phase 4).
 *
 * Runs a single smoke test against the production build served via
 * `vite preview`. Vite's `base` is `/kakeguruimasho/` (GH Pages project
 * site) so the baseURL includes that prefix; routing is HashRouter, so
 * everything after the base is expressed with `#` in test navigation.
 */

import { defineConfig } from '@playwright/test';

const PORT = 4174;
const BASE = '/kakeguruimasho/';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  // Fail fast: any console error in the page is a test failure (asserted
  // inside the spec).
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
    // Mobile-first: emulate an iPhone-ish viewport in Chromium (WebKit
    // isn't available in this environment; Chromium mobile emulation is
    // sufficient for a smoke test against a responsive layout).
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  projects: [
    {
      name: 'chromium-mobile',
      // Desktop-chassis assertions only make sense at >=1024px viewports.
      // The chromium-mobile project ignores them; chassis spec runs in the
      // desktop-chromium project below.
      testIgnore: ['**/desktop-chassis.spec.ts'],
    },
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        isMobile: false,
        hasTouch: false,
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
