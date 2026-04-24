# Developer Guide

This is the "you want to fork this and change something" doc. The deep detail lives in [`ARCHITECTURE.md`](ARCHITECTURE.md); this file is a map + a set of starting points.

---

## Architecture overview

Three layers; one-way data flow.

```
┌─────────────────────────┐
│  UI (React + Framer)    │  src/routes/**, src/features/**/*.tsx
│    reads via selectors  │
│    writes via actions   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Zustand store          │  src/state/store.ts
│    slices: jars, habits,│  src/state/slices/*.ts
│    wheel, bonus, etc.   │
│    action surface       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  IndexedDB (`idb`)      │  src/db/**
│    app_state  (1 blob)  │
│    history_events       │
│    snapshots (30 days)  │
│    kv                   │
└─────────────────────────┘
```

- Every mutation goes through a named action creator on the store.
- The store's persist adapter (`src/state/persist.ts`) writes the blob to IDB on debounce; `appendHistory` bypasses debounce to meet the 100ms durability SLA (SPEC §8.1).
- Boot calls `loadPersistedAppState()` → `actions.hydrate(persisted)` before mounting (see `src/main.tsx`). First run seeds defaults from `src/data/defaults.ts`.
- Pure engines (`bag.engine`, `wheel.engine`) are RNG-driven and state-free — all randomness flows through `src/lib/rng.ts`, which tests swap for a seeded Mulberry32.

---

## Folder map

Summary of [`ARCHITECTURE.md`](ARCHITECTURE.md) §2:

```
src/
├── main.tsx                  React root + boot rehydrate
├── App.tsx                   Route tree + error boundary + bonus banner slot
├── routes/                   Top-level screens (Home, Habits, Spin, ...)
├── features/
│   ├── bag/                  Bag engine (pure) + composition view
│   ├── wheel/                Wheel engine + WheelCanvas + sfx + near-miss
│   ├── habits/               Habit list/editor, quick-log, step entry, hygiene bundle
│   ├── spin/                 Hand view, cash-in picker, spin FSM, post-spin flow
│   ├── rewards/              Tier menus, reward picker modal, 3-rules sidebar
│   ├── jar/                  Jar visual, milestones, claim modal, streak display, activity feed
│   ├── bonus/                Timer banner + countdown, discount picker, expire sweep
│   ├── onboarding/           Welcome + mechanics + rules + milestones + install
│   └── settings/             Wheel / bag / cutoff / sfx / export-import / reset-all
├── state/
│   ├── store.ts              Zustand root + action surface (THE public API)
│   ├── slices/               One slice per AppState subtree
│   ├── selectors.ts          Derived values
│   └── persist.ts            IDB storage adapter
├── db/                       idb-v8 wrapper: open, schema, export, import, snapshots
├── types/                    All shared TypeScript types (owned by 3A)
├── lib/                      rng, time, id, haptics, storage-persist
├── ui/                       shadcn-style primitives (button, dialog, tabs, ...)
├── data/defaults.ts          First-run seed data (habits, rewards, bag, wheel)
└── styles/                   Tailwind + design tokens
e2e/                          Playwright smoke + a11y specs
```

Paths under `src/types/**` and `src/state/**` are the single source of truth for data shape and actions. Touch them with intent.

---

## Running locally

```bash
npm install
npm run dev        # Vite dev server with HMR, http://localhost:5173
npm run build      # tsc --build + vite build → dist/
npm run preview    # serve dist/ locally to smoke-test the production bundle
npm run lint       # ESLint flat config (src + e2e)
npm test           # Vitest (unit + component)
npm run e2e        # Playwright (smoke + axe-core a11y)
```

> **Note:** `npm test` maps to Vitest via the default `vitest` binary if not defined explicitly in `package.json` scripts. The scripts block currently ships `dev`, `build`, `lint`, `preview`, `e2e` — add a `"test": "vitest"` entry if you want one-word access. Vitest config lives in `vite.config.ts` (same config as the dev server).

---

## How to modify defaults

All seed data is in `src/data/defaults.ts`. Edit in place; the next time you either:
- run a fresh install (no IDB state), or
- hit Settings → Reset All,

…the new defaults will be used. Existing users' data is untouched (persisted state wins on boot).

Common edits:

- **Swap the seeded habits.** Change the `DEFAULT_HABITS` array. Each entry is a `Habit` (`src/types/habit.ts`) with a `HabitUnit` (count / minutes / sets / bundle).
- **Rewrite the reward menus.** Change `DEFAULT_T1_REWARDS`, `DEFAULT_T2_REWARDS`, `DEFAULT_T3_REWARDS`. Tier labels are user-facing; make them addicting, time/money-wasting, and Naked-Rule-compliant (see [`USER_GUIDE.md`](USER_GUIDE.md) §8).
- **Change the color palette.** Edit `DEFAULT_BAG_COMPOSITION.colors`. The app uses string enum colors — extend `ClipColor` in `src/types/clip.ts` if you add new ones.

---

## How to change wheel probabilities

Two ways:

1. **Runtime.** Settings → Wheel split. The editor auto-normalizes so weights sum to 1.0, persists immediately, and applies to the next spin. No reload needed.
2. **As new defaults.** Edit `DEFAULT_WHEEL_CONFIG` in `src/data/defaults.ts`. Only takes effect for fresh installs or post-reset.

The wheel engine (`src/features/wheel/wheel.engine.ts`) consumes `WheelConfig.weights` for the main wheel and `WheelConfig.bonusWeights` for the bonus wheel. Both must sum to 1.0; the editor enforces this but a hand-edit must too or `resolveMainSpin()` will throw.

There's a `mercyChance` field in `WheelConfig` reserved for v1.1 (see `DECISIONS.md` D5). In v1 it's hardcoded to 0 and `resolveMainSpin()` throws if non-zero — don't flip it yet.

---

## How to add a new habit unit kind

All habit units are a discriminated union in `src/types/habit.ts`:

```ts
export type HabitUnit =
  | { kind: "count"; target: number; unit: string }
  | { kind: "minutes"; target: number }
  | { kind: "sets"; target: number }
  | { kind: "bundle"; subItems: string[]; cutoffLocal: string };
```

To add a new kind (say, `"distance"` for miles/km):

1. **Extend the union** in `src/types/habit.ts`. TypeScript will immediately flag every exhaustive switch that needs a new arm.
2. **Fix the switches.** At minimum:
   - `src/features/habits/QuickLogButton.tsx` — what does "one tap" mean for this unit?
   - `src/features/habits/HabitEditor.tsx` — add the form controls for the new fields.
   - Anywhere you see `habit.unit.kind ===` — add the new arm.
3. **Add a Zod mirror** in `src/db/schema.ts` so import validation accepts the new kind. The envelope is `exportEnvelopeSchema`; find the `HabitUnit` discriminated union and add the new variant there.
4. **Write tests.** Unit tests for any new math (how many clips per N miles?) live alongside the feature. The existing `step entry → floor(steps/2500)` pattern is a good reference (`src/features/habits/StepEntry.tsx` and its test).
5. **Seed a default.** If it ships as a built-in habit, add it to `DEFAULT_HABITS` in `src/data/defaults.ts`.

No schema migration is needed — existing habits are untouched, and the new kind just appears as a valid option in the editor.

---

## Data schema reference

Full schema with inline rationale lives in [`ARCHITECTURE.md`](ARCHITECTURE.md) §3 (types) + §4 (IndexedDB store design). Don't duplicate it here — bookmark those two sections.

Key facts:

- The live blob is `AppState` (see `src/types/app-state.ts`). Written to IDB object store `app_state` under key `"current"`.
- `history_events` is a separate store with the full-lifetime log; `AppState.history` is truncated to the last 500 for in-memory efficiency (iOS 50 MB concern).
- Every jar-scoped entity (bag, hand, streaks, history events, wheel config, bonus timers) carries a `jarId`. v1 hardcodes `DEFAULT_JAR_ID = "default"` everywhere; multi-jar is v2.
- Snapshots (`src/db/snapshots.ts`) run on app open: one per local day, last 30 retained, gzipped via `CompressionStream`.

---

## Export / import format

Envelope shape (abbreviated; full schema in `src/db/schema.ts`):

```jsonc
{
  "kind": "kakeguruimasho-export",
  "envelopeVersion": 1,
  "exportedAt": "2026-04-23T21:14:00.000Z",
  "appState": { /* full AppState */ },
  "historyEvents": [ /* full history_events store */ ]
}
```

- `exportAll()` (`src/db/export.ts`) reads `app_state` + all `history_events`, serializes, returns a `Blob`. The Settings → Export button downloads it as a timestamped JSON file.
- `importAll(json)` (`src/db/import.ts`) Zod-validates the envelope, runs a duplicate-clip-ID sanity check, then **fully replaces** `app_state` and `history_events`. Snapshots are preserved (so if you imported by mistake, the pre-import snapshot is still there).
- Import doesn't migrate. If `appState.schemaVersion` > the current version, the Zod parse fails first and nothing is clobbered.

---

## How to reset all state

Two ways:

- **In the app:** Settings → Reset All. Triple-confirm. Clears `app_state` + `history_events` + `snapshots` + `kv`, reseeds from `src/data/defaults.ts`, redirects to onboarding.
- **From devtools:** `indexedDB.deleteDatabase('kakeguruimasho')`, then hard-refresh. The app will boot fresh and go to onboarding.

The second form is useful when you've broken boot rehydrate (e.g., while hand-editing a schema) — the in-app Reset requires the app to boot far enough to render Settings.

---

## Testing conventions

- **Vitest + RTL** for unit and component tests. Files are colocated as `*.test.ts(x)` or under `__tests__/` folders next to the code.
- **Seeded RNG.** Production uses `crypto.getRandomValues` via `src/lib/rng.ts`. Tests call `setStoreRng(seededRng(<seed>))` to get reproducible draws/spins. The engine tests (`bag.engine.test.ts`, `wheel.engine.test.ts`) run 10k iterations with a fixed seed and assert distributions within tolerance.
- **Fake clock.** Use `vi.useFakeTimers()` for bonus-timer tests; the countdown derives from `endTimestamp - Date.now()` so fake clock lets you jump 5 minutes ahead in one call (see `src/features/bonus/__tests__/expireCheck.test.ts`).
- **Fake IndexedDB.** `fake-indexeddb` is wired in `src/test/setup.ts` — IDB round-trips work in tests without a browser.
- **Coverage target.** 95% for the pure engines (`bag/bag.engine.ts`, `wheel/wheel.engine.ts`), "reasonable" for everything else. Don't chase coverage on UI components — integration via Playwright covers the happy path.
- **Playwright** runs chromium-mobile (iPhone-class viewport) in `e2e/*.spec.ts`. The smoke (`smoke.spec.ts`) walks onboarding → log → spin → reload persistence. The a11y sweep (`a11y.spec.ts`) runs axe-core against five primary routes.

Phase 4 totals at v1.0.0: **284 vitest tests green, 2 Playwright scenarios green.**

---

## Bundle budget

Target from SPEC §4: **< 250 KB gzipped**.

Current (from [`AUDIT.md`](AUDIT.md) §1):

- **Initial load:** ~92 KB gz (main chunk + shell CSS + HTML). That's 37% of budget.
- **Worst-case full-app:** ~170 KB gz (initial + framer-motion + zod + every route). 68% of budget.
- **Main JS chunk:** 86.42 KB gz, under the informal 100 KB ceiling.

Things to watch:

- `framer-motion` (43 KB gz) is lazy-loaded behind `JarFillMotion` and `WheelCanvas` Suspense boundaries. Don't move to eager.
- `zod` (18.5 KB gz) is paid only on import/export. Fine for v1; consider hand-rolling the validator if bundle pressure grows.
- `lucide-react` tree-shakes per icon — don't `import * as Icons` under any circumstance.
- Every new dependency must declare its gz cost. Anything over ~5 KB gz that isn't lazy-loaded needs a justification.

Re-run the audit with `npm run build` and inspect `dist/assets/` — filenames include per-chunk sizes.
