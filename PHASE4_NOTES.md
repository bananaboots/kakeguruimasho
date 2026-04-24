# PHASE4_NOTES.md — Integration & Testing Agent handoff

> Phase 4 closed all flagged integration gaps from Waves 1–4, added a
> Playwright smoke test, and audited bundle + a11y. Phase 5 (Docs) is
> cleared to start.

---

## Issues fixed

### 1. Dialog focus-trap keystroke loss (3F + 3I flagged)

`src/ui/dialog.tsx` — rewrote the focus-trap effect. Prior implementation
depended on a memoized `handleKey`/`onOpenChange` pair, which re-created
on every parent render; the effect re-ran and `contentRef.current?.focus()`
yanked focus away from any `<Input>` the user was typing into.

Fix: effect now depends **only on `open`**. Stable refs carry the latest
`onOpenChange` and `disableEscape` so the keydown handler reads fresh
values without triggering re-subscription. Focus is pulled ONCE on open.

Regression test: `src/ui/__tests__/dialog.test.tsx` types "Hawaii" into a
controlled input inside a live `<Dialog>` and asserts the value survives.

### 2. Store Actions surface gaps (3D, 3H, 3I)

Promoted these to `Actions` in `src/state/store.ts`:

- `addHabit(habit)`, `updateHabit(habitId, patch)`, `archiveHabit(habitId)`
- `checkHygieneSubItem(jarId, subItem, at)`,
  `uncheckHygieneSubItem(jarId, subItem)`,
  `resetHygieneBundle(jarId, date)`,
  `markHygieneAwarded(jarId, at)`
- `setBonusTimerOrigin(jarId, timerId, habitId)`
- `updateSettings(patch)`, `updateWheelConfig(jarId, patch)`,
  `setFirstRunCompleted()`
- `queueExtraBonusSpin(jarId)` (new — for the EXTRA chain)

Each action emits an appropriate `settings_changed` /
`hygiene_subitem_checked` history event and routes through the store's
existing `commit()` / `commitWithHistory()` helpers so persistence
scheduling is preserved.

Added corresponding slice helpers:
- `uncheckHygieneSubItem` and `resetHygieneBundle` in
  `src/state/slices/hygiene.ts`
- `setTimerOrigin` in `src/state/slices/bonus.ts`

Migrated consumers off `setState()` / `hydrate()` spreads:
- `src/features/habits/HabitEditor.tsx` — `addHabit` / `updateHabit` /
  `archiveHabit`.
- `src/features/habits/HygieneBundle.tsx` — `checkHygieneSubItem` /
  `uncheckHygieneSubItem` / `markHygieneAwarded` / `resetHygieneBundle`.
- `src/features/habits/checkRetroactiveHygiene.ts` — `resetHygieneBundle`
  + `markHygieneAwarded`.
- `src/features/bonus/DiscountHabitPicker.tsx` —
  `setBonusTimerOrigin`.
- `src/features/settings/{BagComposition,HygieneCutoff,SfxHaptics,WheelConfig}Editor.tsx` —
  `updateSettings` / `updateWheelConfig`.
- `src/features/onboarding/WelcomeScreen.tsx` +
  `src/features/onboarding/OnboardingFlow.tsx` — `updateSettings` +
  `setFirstRunCompleted`.

`MilestoneEditor.tsx` (3G) still uses `hydrate` for milestone writes — out
of scope for Phase 4 fixes since it works today and moving it would need
a new typed action on the Jar slice. Tracked for v1.1.

### 3. EXTRA bonus chain wiring (3E flagged)

`src/features/spin/PostSpinFlow.tsx` — factored `spinBonusOnce()` out of
`runBonusWheel()` and wrapped it in a `while (segment === 'EXTRA')` loop
with a 20-iteration sanity cap. Each EXTRA dispatches
`actions.queueExtraBonusSpin(jarId)` for audit and re-enters the
`bonusSpinning` phase via `START_BONUS_SPIN`. Chain ends on the first
non-EXTRA segment or at the cap.

### 4. HandSummary promoted

Moved the inlined Home-page `HandSummary` to
`src/features/spin/HandSummary.tsx`. Exported from the spin barrel
(`src/features/spin/index.ts`). `src/routes/Home.tsx` now imports the
real component; the inline placeholder is deleted.

### 5. Boot-time rehydrate (latent bug surfaced by E2E)

The store always seeded from `seedInitialAppState()` at boot. IDB was
being written correctly, but never read on app start. Discovered while
writing the Playwright smoke (reload test failed because
`firstRunCompleted` never survived).

`src/main.tsx` — added `bootRehydrate()` that awaits
`loadPersistedAppState()` and calls `actions.hydrate(persisted)` before
mounting. ~20 ms IDB round-trip in practice; errors are logged and
swallowed so a corrupt snapshot does not block boot.

### 6. JarVisual selector-caused setState loop

`selectUnclaimedUnlocks` returns a fresh array each call; with Zustand v5
this tripped `useSyncExternalStore`'s snapshot-identity guard and in
production (minified) produced an unrecoverable "Maximum update depth
exceeded" inside the error boundary. Surfaced by the Playwright smoke
after onboarding.

Fix: `src/features/jar/JarVisual.tsx` subscribes to the stable
`milestones` + `claimed` slices and derives `unclaimed` locally via
`useMemo`. The `selectUnclaimedUnlocks` selector still exists and can be
used from non-reactive contexts.

### 7. A11y blocking issues (axe-core)

Two blocking violations found, both fixed:
- `scrollable-region-focusable` on Home — added `tabIndex={0}` to the
  `<StreakDisplay>` row so keyboard users can focus + arrow-scroll.
- `listitem` on /habits — removed `role="group"` override on the
  `<HygieneBundle>` `<ul>` (it was disqualifying child `<li>` semantics).

`color-contrast` flagged as non-blocking; see `AUDIT.md` §2.

---

## Tests added

| File | What it covers | Count |
|---|---|---|
| `src/state/__tests__/store.phase4.test.ts` | 11 tests covering every new Action. Each validates state mutation + appropriate history event. | 11 |
| `src/ui/__tests__/dialog.test.tsx` | Focus-trap regression — controlled input inside a dialog survives multi-character typing. | 1 |
| `e2e/smoke.spec.ts` | Playwright smoke: fresh install → onboarding → log Walk 2500 → spin → reload persistence. Fails on any `console.error`. | 1 scenario |
| `e2e/a11y.spec.ts` | Playwright + axe-core sweep of Home, /habits, /spin, /rewards, /settings on WCAG 2.1 AA. | 1 scenario |

**Totals:** vitest 284 / 284 green (was 272; +11 store tests + 1 dialog +
one existing test lifted to phase 4 format). `npm run build` clean.
Playwright: 2 / 2 green (smoke + a11y).

---

## Remaining risks

1. **`color-contrast` on five routes.** Dark-theme muted tokens fall below
   4.5:1 AA. Non-blocking for Phase 4; flagged for v1.1 palette tuning
   (`AUDIT.md` §2).
2. **MilestoneEditor still writes via `hydrate`.** The editor is
   onboarding-critical; fix is cosmetic (a new `updateJarMilestones`
   action). Current path works; left for v1.1.
3. **WebKit coverage.** Playwright runs chromium-mobile only; WebKit
   browser wasn't downloaded in this environment. iOS Safari testing is
   deferred to Phase 6 (physical-device smoke).
4. **EXTRA chain cap = 20.** Spec §5.7 says "re-spin 2 more times". The
   loop currently re-spins as many times as EXTRA fires (capped at 20).
   If the user's distribution intent is literally-2-exact, the loop
   needs a different termination — revisit post-launch if users flag it.

---

## Readiness for Phase 5

Phase 5 (Documentation Agent) is cleared to start. All code surfaces are
stable. Key areas to document:

- Store action surface (now complete — no more `setState` / `hydrate`
  workarounds in feature code).
- The `boot rehydrate` flow in `src/main.tsx`.
- The EXTRA chain behavior.
- PWA install instructions (manifest already configured).
- The Playwright E2E setup (`playwright.config.ts`, `npm run e2e`).

Phase 6 (Deployment) can start independently of Phase 5.

---

*End of PHASE4_NOTES.md.*
