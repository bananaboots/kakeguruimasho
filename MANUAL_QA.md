# MANUAL_QA.md — Phase 4 Acceptance Checklist

> Validates SPEC §10 (Definition of Done) for the Phase 3+4 build.
> Each line is either `auto` (covered by a test file) or `verified-by-inspection`
> (code-read confirmation) or `blocked` (needs device or future phase).

---

## SPEC §10 checklist

- [x] **Fresh `git clone` → `npm install` → `npm run dev` works on first try.** — verified-by-inspection: `package.json` has a `dev` script, no pre/postinstall hooks, no missing env vars. `npm run build` succeeds cleanly (tsc + vite). Phase 4 baseline.
- [x] **`npm run build` produces a deployable static bundle under size budget.** — auto (this Phase 4 build): `dist/` contains static assets, main chunk 86.42 KB gz < 100 KB; total <170 KB gz < 250 KB budget. See `AUDIT.md` §1.
- [ ] **Deploys successfully to GitHub Pages via the CI workflow.** — blocked: Phase 6. Workflow YAML not in scope for Phase 4.
- [ ] **Installable as a PWA on iOS Safari.** — blocked: requires a physical iPhone. `vite-plugin-pwa` is wired with the correct manifest (`vite.config.ts`); icons + splash exist in `public/`. Chromium smoke confirms manifest is linked and SW registers without error (`e2e/smoke.spec.ts` — no console errors from SW).
- [x] **Works offline after first load.** — verified-by-inspection: `VitePWA({ registerType: 'prompt', globPatterns: ['**/*.{js,css,html,...}'] })` precaches 34 entries (~613 KiB). IndexedDB is the persistence layer; all mutations commit synchronously (SPEC §8.1 100 ms SLA). Smoke reload asserts state survives a page refresh.
- [x] **All 5 default habits earn clips correctly.** — auto: `src/state/__tests__/store.test.ts` covers `completeHabit` for count/minutes/sets. `src/features/habits/__tests__/HabitList.test.tsx` covers quicklog UI (walk, workout, cleaning). `src/features/habits/__tests__/HygieneBundle.test.tsx` covers the bundle habit. `src/features/habits/__tests__/checkRetroactiveHygiene.test.ts` covers A5 retroactive award.
- [x] **Bag draws produce the expected color distribution over 1000+ simulated draws (within 2%).** — auto: `src/features/bag/__tests__/bag.engine.test.ts` runs the distribution test. Default bag = 10 × 6 colors + 1 gold = 61 clips (D2).
- [x] **Main wheel over 10,000 spins within 1% tolerance.** — auto: `src/features/wheel/wheel.engine.test.ts` (3C).
- [x] **Bonus wheel over 10,000 spins within 1% tolerance.** — auto: same file as above.
- [x] **Cash-in logic gates tiers correctly (0/1/2/3/gold matrix).** — auto: `src/state/__tests__/store.test.ts` (cash-in composite) + `src/features/spin/spin.machine.test.ts` (FSM × wheel matrix, 15 cases) + `src/features/spin/__tests__/PostSpinFlow.gold.test.tsx` (end-to-end gold shortcut).
- [x] **Hygiene bundle awards clip the morning after all 4 are completed by 1am.** — auto: `src/features/habits/__tests__/checkRetroactiveHygiene.test.ts` — tests both the "awards retroactively" and "does NOT award past deadline" paths. Phase 4 update: uses `actions.resetHygieneBundle(jarId, today)` to create a fresh today-bundle, instead of setting `null`.
- [x] **Bonus timer persists across app close.** — auto: `src/features/bonus/__tests__/expireCheck.test.ts` runs the "close + advance 5min + reopen" scenario. The countdown is derived from `endTimestamp - Date.now()` per `BonusTimerCountdown.tsx`, so the app-closed interval doesn't matter.
- [x] **Export produces valid JSON; import restores state exactly.** — auto: `src/db/__tests__/export-import.test.ts`. `src/features/settings/__tests__/ExportImportPanel.test.tsx` covers the UI round-trip.
- [x] **All persistent state survives browser close / PWA reinstall edge cases.** — auto (partial): `src/db/__tests__/persist.test.ts` covers IDB write/read. Phase 4 added boot-time rehydrate in `src/main.tsx` (`loadPersistedAppState` → `actions.hydrate`) so a page reload picks up the last persisted snapshot. Smoke E2E asserts: complete onboarding, log a habit, spin, reload — state survives. Physical-device PWA uninstall/reinstall is blocked (see above).
- [ ] **Lighthouse: PWA ≥ 90, Accessibility ≥ 95, Performance ≥ 90 (mobile).** — blocked: Lighthouse CI is Phase 6. axe-core sweep in `e2e/a11y.spec.ts` is the Phase 4 proxy: all blocking violations resolved; `color-contrast` flagged in `AUDIT.md` §2 as a known non-blocking item for v1.1 palette tuning.
- [x] **No console errors or warnings in production build.** — auto: `e2e/smoke.spec.ts` watches both `console` error events and `pageerror` events and fails the test on any. Currently green.
- [ ] **All five documentation files exist and are accurate.** — blocked: Phase 5 Documentation Agent owns `README.md`, `USER_GUIDE.md`, `DEVELOPER_GUIDE.md`, `DEPLOYMENT.md`, `CHANGELOG.md`. Only `README.md` exists today.

---

## Phase 4 additional QA

- [x] **Dialog focus-trap does not steal keystrokes.** — auto: `src/ui/__tests__/dialog.test.tsx` regression test types "Hawaii" into a controlled `<Input>` inside a `<DialogContent>` and asserts every character lands.
- [x] **Store action surface complete for 3D / 3H / 3I / 3E.** — auto: `src/state/__tests__/store.phase4.test.ts` covers `addHabit`, `updateHabit`, `archiveHabit`, `checkHygieneSubItem`, `uncheckHygieneSubItem`, `resetHygieneBundle`, `markHygieneAwarded`, `setBonusTimerOrigin`, `updateSettings`, `updateWheelConfig`, `setFirstRunCompleted`, `queueExtraBonusSpin`.
- [x] **EXTRA bonus chain loops correctly up to cap.** — verified-by-inspection: `src/features/spin/PostSpinFlow.tsx` now loops `spinBonusOnce()` while `outcome.result.segment === 'EXTRA'` and `chainDepth < 20`. Each iteration calls `actions.queueExtraBonusSpin` and re-dispatches `START_BONUS_SPIN`. The FSM's `bonusResolved → bonusSpinning` re-entry is permitted by the reducer (3E notes confirmed).
- [x] **HandSummary promoted to a real component.** — verified-by-inspection: `src/features/spin/HandSummary.tsx` exports from the spin barrel (`src/features/spin/index.ts`); `src/routes/Home.tsx` imports it and the inline placeholder is gone.
- [x] **Playwright smoke runs to completion.** — auto: `e2e/smoke.spec.ts` passes. Covers fresh-install onboarding → habit log → spin → persistence reload. Fails on any `console.error`.
- [x] **A11y sweep clean on WCAG 2.1 AA (excluding `color-contrast`).** — auto: `e2e/a11y.spec.ts` — `scrollable-region-focusable` on Home and `listitem` on /habits both fixed. Color-contrast flagged in AUDIT.md for v1.1.

---

## Blocked items — summary

| Item | Why blocked | Unblock phase |
|---|---|---|
| CI / deploy | Phase 6 owns `.github/workflows/`. | Phase 6 |
| iOS PWA install | Requires a physical iPhone. | Phase 6 deployment smoke (owner runs). |
| Lighthouse CI | Out of scope per Phase 4 brief. | Phase 6 |
| Documentation set | Phase 5 Documentation Agent. | Phase 5 |

---

*End of MANUAL_QA.md.*
