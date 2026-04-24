# Wave 3 · 3G — Jar & Streak Display · Handoff Notes

## Components shipped

All under `src/features/jar/`:

- **`JarVisual.tsx`** — Cylindrical SVG jar with animated fill (Framer Motion
  lazy-loaded via `React.lazy(() => import('./JarFillMotion.tsx'))`). Mini /
  Mid / Moonshot tick marks drawn along the fill at their proportional heights
  (D1: one cumulative jar). Moonshot tick is gold-accented. `role="progressbar"`
  with `aria-valuenow / aria-valuemax / aria-valuetext`. Unclaimed-unlock
  pills render below the jar as real buttons; tapping one opens
  `<MilestoneClaimModal>`. Supports a `condensed` prop for the Home snippet.
- **`JarFillMotion.tsx`** — Isolated Framer Motion rect animator; its own
  chunk (`JarFillMotion-*.js`, ~0.3 KB gz). Respects `useReducedMotion`.
- **`MilestoneEditor.tsx`** — Labels + $ targets for mini/mid/moonshot.
  Validates strictly increasing targets and positive integer dollars. Writes
  via `actions.hydrate` (same pattern 3F uses for rewards, since milestone
  CRUD isn't on the typed `Actions` surface).
- **`MilestoneClaimModal.tsx`** — D1 flow. Mini/Mid: single "Claim" →
  `claimMilestone(jarId, id)`, jar total untouched. Moonshot: two-step —
  step 1 "Claim" (`claimMilestone(jarId, 'moonshot')`), step 2 confirm
  "Reset jar" (`resetJar(jarId)`). After reset, dispatches
  `jar:reset-complete` CustomEvent so `/jar` can re-open the editor.
- **`ActivityFeed.tsx`** — Groups history events by local day (newest first).
  Renders `clip_earned`, `milestone_unlocked`, `milestone_claimed`,
  `main_spin`, `bonus_completed`, `streak_broken`, `near_miss` (subtle),
  `jar_reset`. Uses per-icon lucide-react imports. Accepts `days`, `limit`,
  `jarId`. Subscribes to `s.history` directly (not via selector) to avoid
  snapshot-identity thrash.
- **`StreakDisplay.tsx`** — Three chips (daily / hygiene / bonus chain) with
  current + longest. Daily chip flags `--active-today` when
  `selectDailyStreakCompleteToday` is true. Horizontally scrolls on narrow
  viewports (iOS-safe, scrollbar hidden).
- **`format.ts`** — `formatDollars(n)` using Intl.NumberFormat, no added dep.
- **`jar.css`** — Uses 3J design tokens exclusively.
- **`index.ts`** — Public barrel.

## Route wiring (files I touched)

- **`src/routes/Jar.tsx`** — Mounts `<StreakDisplay>` → `<JarVisual>` →
  `<MilestoneEditor>` (or an "Edit milestones" button) → `<ActivityFeed>`.
  Auto-opens the editor when milestones are unconfigured (targets === 0)
  AND after a Moonshot reset (via the `jar:reset-complete` event).
- **`src/routes/History.tsx`** — Mounts `<ActivityFeed limit={500}>` with a
  7/30/All date-range toggle.
- **`src/routes/Home.tsx`** — The `[3G] StreakHeader` slot is replaced with
  `<StreakDisplay>`; the `[3G] JarSnippet` slot is replaced with
  `<JarVisual condensed>`; the `[3G] ActivityFeed limit=7` slot is replaced
  with `<ActivityFeed days={7} limit={50}>`. Note: Home.tsx was concurrently
  edited by another agent (3E) which added a `<HandSummary>` placeholder —
  I left a minimal inline `HandSummary` that renders a link to `/spin` with
  the current hand size so Home doesn't crash. 3E can replace this when the
  richer component lands.

## Tests (`src/features/jar/__tests__/`)

13 tests total, all passing:

- `MilestoneClaimModal.test.tsx` — **D1 guards**: mini claim leaves total
  intact; mid claim leaves total intact; moonshot "claim → confirm → reset"
  zeros total & clears claims; moonshot abandon-after-claim also preserves
  total.
- `MilestoneEditor.test.tsx` — Rejects non-increasing targets (shows alert);
  accepts valid input and writes through to `state.jars[jarId].milestones`;
  required labels (HTML5 `required` gate, asserted via state non-mutation).
- `ActivityFeed.test.tsx` — Empty state; grouping by day with correct
  `Today` / `Yesterday` headings; day-cutoff filter excludes events older
  than `days`; non-rendered kinds (e.g. `settings_changed`) are silently
  dropped.
- `StreakDisplay.test.tsx` — Three chips render; live re-render when
  `actions.tickDailyStreak` runs; `--active-today` modifier applied after
  the tick.

## Verification

- **`npx vitest run`**: 26 files, 204 tests, all pass.
- **`npx vite build`**: passes cleanly. Output split as expected —
  `JarFillMotion` lives in its own 0.3 KB gz chunk, Framer Motion remains
  isolated at 43 KB gz, `Jar` route is 1.6 KB gz, `ActivityFeed` is 4 KB gz.
- **`npm run build` (tsc + vite)**: vite builds clean; tsc reports two
  errors in files I do not own:
    - `src/features/bonus/DiscountHabitPicker.tsx:112` (3H)
    - `src/features/spin/PostSpinFlow.tsx:465` (3E)
  Both are pre-existing before my changes and unrelated to this feature.

## Selectors / actions consumed from 3A

- `actions.claimMilestone(jarId, milestone)` — used by MilestoneClaimModal.
- `actions.resetJar(jarId)` — used by MilestoneClaimModal.
- `actions.hydrate(state)` — used by MilestoneEditor to persist the pure
  `jars[jarId].milestones` update (same pattern 3F uses for rewards).
- `selectJarTotal`, `selectUnclaimedUnlocks`, `selectDailyStreakCompleteToday`,
  `selectRecentHistory` — all used; ActivityFeed subscribes to `s.history`
  directly because `selectRecentHistory` returns a fresh array each call
  and tripped Zustand 5's snapshot guard.

## Missing selectors / actions (request back to 3A)

None strictly missing. Soft suggestions for future iterations:

1. A memoized `selectRecentHistory` (cached on `state.history` identity) so
   consumers can subscribe without manual `s.history` indexing.
2. A `milestone_unlocked` emission path inside `earnClipToHand` — currently
   `selectUnclaimedUnlocks` computes the crossing at read time, but no
   `milestone_unlocked` history event is emitted. ActivityFeed renders the
   kind when present, but it never fires in v1. Low priority: the feed
   already shows `milestone_claimed`, which is the user-facing signal.

## Accessibility checklist

- Jar SVG: `role="progressbar"` + `aria-valuenow / aria-valuemin /
  aria-valuemax / aria-valuetext` ("$42 of $100 toward Mini").
- Claim modal: uses 3J `<Dialog>` which handles focus trap + Escape + portal.
- Unclaimed-unlock buttons below the jar are real `<button>` elements with
  test IDs; keyboard users don't have to rely on SVG click hit-boxes.
- Streak chips use `role="list" / role="listitem"`, 44pt min-height, icons
  marked `aria-hidden` with readable text labels.
- ActivityFeed items carry `data-kind` for styling/testing; day headings
  are real `<h3>` tags inside `<section aria-label>`.

## Mobile-first notes

- Jar SVG has `max-width: 280px` on `/jar` and `max-width: 96px` + row-form
  in condensed mode on Home.
- Streak row uses `overflow-x: auto` with hidden scrollbars; chips size via
  `flex: 0 0 auto` and `white-space: nowrap`.
- Activity feed items are flex rows with truncation-friendly body spans.
