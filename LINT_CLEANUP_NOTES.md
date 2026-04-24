# Lint cleanup notes

Cleanup pass that took `npm run lint` from **21 errors + 14 warnings** to
**0 errors + 13 warnings**. All 284 unit tests and both Playwright scenarios
still pass.

## Fixes by rule

### `react-refresh/only-export-components`

Moved non-component exports into sibling modules so each `.tsx` exports only
components (matches the pre-existing `reward-rules-copy.ts` pattern).

- `src/features/bonus/BonusTimerCountdown.tsx`
  - `formatRemaining` → new `src/features/bonus/BonusTimerCountdown.util.ts`
  - Updated `src/features/bonus/index.ts` and the colocated test.
- `src/features/bonus/JustALittleBitMore.tsx`
  - `discountTarget`, `unitWord` → new
    `src/features/bonus/JustALittleBitMore.util.ts`
  - Updated `src/features/bonus/index.ts` and the colocated test.
- `src/features/jar/JarVisual.tsx`
  - Removed the dead `export { getAppStore }` re-export (no callers use it;
    they import from `state/store.ts` directly).
- `src/ui/toast.tsx`
  - `useToast`, context, and related types → new
    `src/ui/toast-context.ts`. Consumers (`PwaUpdatePrompt.tsx`,
    `features/spin/PostSpinFlow.tsx`) now import the hook from the new file.
  - `ToastProvider` / `ToastViewport` remain in the `.tsx`.

### `react-hooks/set-state-in-effect`

Replaced "setState inside `useEffect`" with the official React "adjust state
during render" pattern (`useState` + previous-value marker) wherever state
was merely synced from props/derived values. See
<https://react.dev/reference/react/useState#storing-information-from-previous-renders>.

- `src/features/bonus/BonusTimerCountdown.tsx` — dropped the `setRemainingMs`
  reset effect (the rAF effect re-runs on `endTimestamp` change and re-syncs
  via its own `tick()` call). Also swapped the initial-tick `tick()` inside
  the rAF effect for a `queueMicrotask(tick)` on the tab-hidden branch to
  avoid a synchronous setState inside the effect body. `tick` now uses a
  functional setter with an equality check.
- `src/features/habits/HabitEditor.tsx` — previous-key marker on
  `habit.id` + `open`.
- `src/features/jar/MilestoneClaimModal.tsx` — previous-value marker on
  `open`.
- `src/features/jar/MilestoneEditor.tsx` — previous-value marker on
  `initial` (reference-equality on the memoized draft).
- `src/routes/Jar.tsx` — previous-value marker on `firstRun`.

### `react-hooks/purity` — `Date.now` during render

- `src/features/jar/ActivityFeed.tsx` — hoisted `Date.now()` into a lazy
  `useState` initializer so the mount-time snapshot isn't computed inside the
  render body. Added `nowMs` to the `useMemo` deps for completeness.

### `react-hooks/refs` — ref writes during render

- `src/ui/dialog.tsx` — moved the per-render `onOpenChangeRef.current = ...`
  and `disableEscapeRef.current = ...` assignments into a trailing
  `useEffect(() => { ... })` (no deps array — runs every commit, matching
  prior semantics).

### `react-hooks/immutability` — access before declaration

- `src/features/spin/PostSpinFlow.tsx` — reordered `spinBonusOnce` and
  `runBonusWheel` above `handleMainSpinAnimationComplete`, and added
  `runBonusWheel` to the deps of `handleMainSpinAnimationComplete`. This
  fixes the "accessed before it is declared" error without introducing a
  ref-indirection.

### `react-hooks/preserve-manual-memoization`

- `src/features/jar/StreakDisplay.tsx` — dropped the manual `useMemo` and
  let React Compiler handle memoization. The compiler flagged the declared
  deps `[streakState, dailyComplete]` as stricter than its inferred
  property-level deps.

### `no-useless-assignment`

- `src/state/slices/streaks.ts` — the `let nextEntry = prev; let
  incremented = false; let value = prev.current;` initial assignments were
  always overwritten before use. Switched to declarations without
  initializers so TypeScript still flow-checks the assignments in all
  branches.

## Things left as warnings (intentionally)

- Various `Unused eslint-disable directive (no-console)` — cosmetic; the
  `no-console` rule isn't actually configured on these paths, so the
  disables are no-ops. Not an error, not regression-risk. Left alone.
- `react-hooks/exhaustive-deps` on `MilestoneEditor.validate` and
  `toast.tsx` cleanup effect — pre-existing, already understood by the
  authors (explicit comments or stable closures). Only errors were required
  to be zero.

## Gates verified

- `npm run lint` — 0 errors, 13 warnings.
- `npx tsc --noEmit` — clean.
- `npm run build` — green (Vite + PWA).
- `npx vitest run` — 284/284.
- `npx playwright test` — 2/2 (smoke + a11y).
