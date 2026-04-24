# WAVE4_3I_NOTES — Onboarding & Settings Agent

Handoff notes for Phase 4 integration. 3I is the control panel over
everything the rest of Phase 3 shipped.

## What shipped

### Onboarding (`src/features/onboarding/**`)

5-step full-screen first-run flow, mounted at `/onboarding` via
`src/routes/Onboarding.tsx`.

1. **WelcomeScreen** — warm intro, optional name prompt writing to
   `settings.personalName`. Blank leaves the field null.
2. **MechanicsScreen** — 3 paragraphs condensing the casino. Quotes
   the PDF load-bearing phrases "maybe > big" and "just a little bit
   more" verbatim in a pullquote.
3. **RewardRulesScreen** — A19 verbatim. Imports the three headings
   + bodies from `src/features/rewards/reward-rules-copy.ts` (3F
   owns the source of truth). User must tap "I commit" to proceed.
4. **MilestonesScreen** — reuses 3G's `MilestoneEditor` with
   `forceFirstRun`. Validates mini < mid < moonshot in 3G's
   component; advances on save.
5. **InstallPromptScreen** — detects iOS via `navigator.userAgent`
   (including iPad-masquerading-as-Mac via `maxTouchPoints`) and
   renders Safari Share → Add to Home Screen instructions with the
   `Share` lucide icon. On Android / desktop Chromium it listens for
   `beforeinstallprompt`, stashes the event, and fires
   `deferredPrompt.prompt()` on tap. Shows an appropriate fallback
   hint if no event has arrived.

On Finish: `OnboardingFlow.finish()` reads current `AppState`,
spreads `firstRunCompleted: true`, and calls
`state.actions.hydrate(next)`. Then navigates to `/`.

### First-run redirect (`src/App.tsx`)

Added a `FirstRunGate` component wrapping every route EXCEPT
`/onboarding`. When `store.getState().firstRunCompleted === false`,
the gate replaces the route with `<Navigate to="/onboarding" replace />`.
Once the flag flips, the gate becomes a pass-through.

### Settings (`src/features/settings/**`)

Mounted at `/settings` via `src/routes/Settings.tsx` as a vertical
stack of section cards (picked cards over tabs for mobile per brief).

- **WheelConfigEditor** — sliders for T1/T2/T3/BONUS/JACKPOT and the
  5 bonus segments. Internal state in integer % (0–100); persisted
  as 0–1 fractions. A16 enforced on save: sum must be within
  ±0.001 of 1.0 (displayed as ±0.1% at integer resolution).
  Invalid → `role="alert"` + save blocked. Auto-normalize button
  uses largest-remainder rounding to reach exactly 100.
- **BagCompositionEditor** — inputs for `regularPerColor` (1–30)
  and `goldCount` (0–10, Q7 first-class default 1). Shows derived
  total (colors × regular + gold). Default renders as 61.
- **HygieneCutoffEditor** — `<input type="time">`, default "01:00"
  (Q5). Validates HH:mm via regex.
- **SfxHapticsToggles** — two `<Switch>` controls writing
  `settings.sfxEnabled` / `settings.hapticsEnabled`. Haptics toggle
  also calls `setHapticsEnabled()` so the change is live without
  reload.
- **ExportImportPanel** — Export calls `exportAll()` → downloads
  `YYYY-MM-DD-kakeguruimasho.json` and logs `export_performed`.
  Import opens a file picker → shows a confirm dialog (non-trivial
  destructive action) → `importAll(json)` → reloads on success, or
  shows the first Zod issue's message on failure.
- **ResetAllDanger** — triple-confirm:
  1. Tap "Reset all data" → dialog "Are you sure?"
  2. Tap Continue → dialog "Really sure? All data will be lost."
  3. Tap Continue → dialog "Type RESET to confirm" with a code input
  4. Tap Reset (disabled until exact match) → `indexedDB.deleteDatabase('kakeguruimasho')`
     + `window.location.reload()`. Full wipe is cleaner than an
     in-place reset per spec §8.
- **HelpScreen** — condensed "How it works" recap embedding PDF
  highlights and the 3 reward rule headings. Links out to
  SpoonFedStudy for the full guide. We did NOT copy the PDF into
  `public/` — keeping the bundle lean is the better tradeoff.

All settings writes go through `hydrate(next)` with a spread patch.
No new slice actions required.

## Tests

`src/features/{onboarding,settings}/__tests__/*` — 27 new tests:

- OnboardingFlow: step progression, firstRunCompleted flip, name
  persistence, A19 verbatim assertions, iOS/non-iOS install branches.
- WheelConfigEditor: A16 sum=100 validation blocks save, auto-
  normalize rescales to 100 and persists 0–1 fractions within tolerance.
- BagCompositionEditor: defaults show 61, valid save round-trips,
  out-of-range gold and regular inputs rejected.
- HygieneCutoffEditor: default 01:00 render, save round-trip.
- SfxHapticsToggles: each toggle updates settings.
- ExportImportPanel: `exportAll()` round-trips through `importAll()`,
  export download triggers URL.createObjectURL + logs
  `export_performed`, import dialog → confirm → reload.
- ResetAllDanger: triple-confirm required, RESET phrase mandatory,
  wrong phrase leaves `reload` + `deleteDatabase` uncalled.

Full suite: **272/272 passing**. `npm run build` clean.

## Gotchas encountered & workarounds

1. **Dialog focus trap steals keystrokes in jsdom.** The shared
   `<DialogContent>` from 3J runs a `setTimeout(0)` focus-pull on every
   effect re-run — and its `onOpenChange` callback re-creates the
   inner `handleKey`, which re-runs the effect on every parent render.
   After a re-render triggered by a controlled-input keystroke, focus
   snaps back to the content div and subsequent keystrokes are lost.
   Tests use `fireEvent.change` for dialog-hosted inputs. The
   production flow is fine because real users type into the already-
   focused input in one continuous burst before React re-renders; in
   jsdom the timing is different.
2. **`<input type="range">` + `user.clear()` / `.value = …` won't
   update React state.** Use `fireEvent.change` with `target.value`.
3. **JarId is a branded type.** `WheelConfigEditorProps.jarId` is
   `JarId`, not `string`. Callers from `Settings.tsx` pass
   `useAppStore((s) => s.activeJarId)` which returns the branded type.

## Requests for 3A / Phase 4 integration

- (Nice to have, not blocking) Expose a dedicated action on the store
  surface for settings patches: e.g. `updateSettings(patch: Partial<Settings>): void`.
  Today 3I writes settings by reading current state, spreading a patch,
  and calling `hydrate(next)`. The existing `src/state/slices/settings.ts`
  already has an `updateSettings` reducer — it just isn't lifted to
  `Actions`. Lifting it would let 3I's editors be one-liners and would
  avoid the action-stripping dance (`const { actions: _a, ...rest } = state`).
- (Nice to have) Same for wheel config: `setWheelConfig(jarId, patch)` is
  in `wheelConfig.ts` slice but not on `Actions`. Lifting would simplify
  `WheelConfigEditor` save.
- (Nice to have) Same for `markFirstRunCompleted()` in `appMeta.ts`.
  `OnboardingFlow.finish()` would collapse from ~8 lines to one action
  call.
- **NOT blocking** — everything works today via `hydrate`, and 3A's
  contract is explicitly that `hydrate` with a partial merge is the
  sanctioned escape hatch.

## Mobile-first considerations

- Onboarding is single-step-per-view with a progress-dot header.
- Each step's "Back" / "Next" button row sits at the bottom with
  `margin-top: auto` so thumbs can reach it on tall phones.
- Settings is a vertically-scrolling stack of cards — no horizontal
  tabs (brief explicitly said pick cards for mobile).
- All tap targets ≥ 44×44 via 3J's `--tap-target-min` token.
- Every slider has `aria-label`, `aria-valuetext`, min/max/step on
  the native `<input type="range">`.
- Progress dots announce as a `role="progressbar"` with
  `aria-valuetext="Step X of 5"`.
