# Wave 1 · 3A — Data Layer · Handoff Notes

## What was implemented

### Types (`src/types/**`)

- `ids.ts` — branded IDs (`JarId`, `HabitId`, `RewardId`, `ClipId`, `EventId`, `BonusTimerId`, `ISOTimestamp`, `LocalDate`). `DEFAULT_JAR_ID = "default"` seeded per D4. `asXxx(raw)` helpers for branding at trusted boundaries.
- `clip.ts` — `Clip` union (`regular` + `gold`), `ClipColor`, `ClipSource`, `BagComposition` (lives here because it is naturally adjacent to bag shape). `DEFAULT_CLIP_COLORS`.
- `jar.ts` — `Milestone`, `MilestoneClaim`, `JarState`. D1 compliant: `total` is not reset on mini/mid claim.
- `wheel.ts` — `MainWheelTier`, `Tier`, `BonusSegment`, `WheelConfig` (carries `mercyChance: number` default 0 per D5), `MainSpinResult`, `BonusSpinResult`.
- `bonus.ts` — `BonusTimer`, `BonusTimerState` (array of concurrent timers per A3 + `pendingBonusSpins` queue for EXTRA chains).
- `habit.ts` — `Habit`, `HabitUnit` discriminated union (count/minutes/sets/bundle), `HygieneBundleState` (jarId, per-subitem timestamps, cutoff, awarded flag).
- `reward.ts` — `Reward`. No `jarId` per OR-1.
- `streak.ts` — `StreakState` with daily/hygiene/perHabit/bonusChain (all keyed by `JarId`).
- `settings.ts` — `Settings` (bagComposition, sfx, haptics, hygieneCutoffLocal default `"01:00"`, handSoftCapNudge off by default, workTimerOptIn per habit, pwaRefreshPrompt marker, personalName).
- `history.ts` — Full `HistoryEvent` discriminated union (22 variants across 3B/3C/3D/3E/3F/3G/3H/3I). `HistoryEventInput = Omit<HistoryEvent, "id"|"at">` distributed so variants narrow correctly.
- `app-state.ts` — Root `AppState` with per-jar Records (`jars/bags/hands/wheelConfigs/streaks/bonusTimerState/pendingHygieneBundle`). `SCHEMA_VERSION = 1`, `IN_MEMORY_HISTORY_LIMIT = 500`. `CashInResult` type also here.

### Lib (`src/lib/**`)

- `rng.ts` — `Rng` interface, `cryptoRng()` (crypto.getRandomValues), `mulberry32(seed)` (deterministic), `rng()` singleton, `__setRngForTests`.
- `time.ts` — `nowISO`, `isoOf`, `localDateOf`, `todayLocal`, `parseLocalTime`, `isPastCutoff`, `dayDelta` (same/next/skip/back, DST-safe via noon anchoring), `addDaysLocal`.
- `id.ts` — UUIDv7-style monotonic IDs (`newUuid`, `newEventId`, `newClipId`, etc.) — R5 collision-proofing.

### State (`src/state/**`)

- `store.ts` — Zustand root store (`createAppStore`, `useAppStore`, `getAppStore`, `__resetAppStoreForTests`). Composes slices. Commit path: `commit()` schedules debounced 16ms IDB writes; `commitWithHistory()` bypasses debounce (sync flush via `persist.flushNow`).
- `persist.ts` — Custom IDB adapter with `schedule`, `flushNow`, `flushPending`, `dispose`. Coalesces same-window schedules; synchronous write-through on history append paths.
- `selectors.ts` — Non-mutating derived views (`selectHand`, `selectBag`, `selectBagCompositionCounts`, `selectUnlockedTierForCashIn`, `selectJarTotal`, `selectUnclaimedUnlocks`, `selectDailyStreakCompleteToday`, `selectActiveBonusTimers`, `selectRecentHistory`).
- `slices/` — one file per slice: `appMeta`, `habits`, `rewards`, `jars`, `wheelConfig`, `history`, `bonus`, `hygiene`, `streaks`, `settings`. All pure reducers; no raw array mutation leaks outside (R4).

### DB (`src/db/**`)

- `schema.ts` — IDB store names + indexes + Zod schemas mirroring every persisted type (R7 — same-file/same-vicinity rule). `exportEnvelopeSchema` versioned at envelope v1.
- `open.ts` — `openKakeguruiDb()` singleton using `idb` v8, creates all 4 object stores on first run with required indexes (`by_at`, `by_jar_at`, `by_kind` on history; `by_date` on snapshots). `closeKakeguruiDb()` for tests.
- `migrations/index.ts` — empty `migrations` array (v1 baseline) + `runMigrations()` dispatcher, properly typed against idb's versionchange transaction.
- `snapshots.ts` — `maybeRunDailySnapshot()` — gzip via `CompressionStream` when available, falls through to JSON. Prunes snapshots older than 30 days. Retains the `SNAPSHOT_RETENTION_DAYS = 30` constant.
- `export.ts` — `exportAll()` returns `Blob` with full-lifetime history + app_state in a versioned envelope.
- `import.ts` — Zod-validates, checks for duplicate clip IDs (R5), full-replaces `app_state` + `history_events`. Preserves snapshots (act as pre-import backup).

### Data (`src/data/defaults.ts`)

- 5 default habits (§6.1): Walk (2500 steps), Workout (4 sets), Cleaning (20 min), Focused work (30 min), Hygiene bundle (4 subitems, cutoff `01:00`).
- T1 / T2 / T3 reward menus verbatim from §6.2–6.4.
- Default wheel config: T1 40% / T2 30% / T3 20% / BONUS 8% / JACKPOT 2%; bonus weights 35/25/15/10/15; `mercyChance: 0`.
- Default bag composition per D2: 6 colors × 10 regular + 1 gold = 61 clips.
- Default jar: empty milestones (target=0, label=''); user fills during onboarding (§6.7).
- `seedInitialAppState()` / `seedBagClips()` helpers.

### Tests (`src/**/__tests__/**` + `src/test/*`)

- RNG distribution (bucket uniformity ±3%, determinism).
- Time helpers (day boundaries, DST, cutoff edge minutes 0:59 / 1:00 / 1:01).
- Jars slice: classifyCashIn matrix, earn/return, **D1** (mini+mid claims do NOT reset total; only `resetJar` zeros).
- Store composite actions: `completeHabit`, cash-in paths, Q2 unlimited hand (100 earns accumulate), auto-refill on empty bag, Q5 hygiene cutoff default, bonus timer spawn/complete/expire lifecycle.
- Migrations: empty registry passes through; all 4 object stores created on first open.
- Export/import: round-trip seed → export → clear → import (deep-equal), rejects malformed JSON / schema mismatch / duplicate clip IDs.
- Persist adapter: debounced schedule, flushNow sync write, write coalescing.

58 tests pass. `npm run build` clean. `npx vitest run` green.

## Spec-to-implementation deviations

- **`earnClipToHand` increments `jar.total` atomically.** Spec §5.9 says "every clip earned = +$1 into jar"; linking it to the same action keeps D1's "claim doesn't touch total" tractable and removes the risk of a forgotten `jar.total += 1`. Callers never increment `total` directly.
- **Bag auto-refill is done inside `drawClipFromBag`** rather than as a separate public action. Spec §5.3 says "when bag empties → auto-refill to starting composition" — doing this inside the draw keeps it in one atomic state update and emits a `bag_refilled` history event in the same transaction.
- **`completeHabit` is a Wave 1 stub** that uses a naive random pick (`rng.nextInt`) over the current bag. Wave 2 3B will replace the picker with its pure `drawClip(bag, rng)` engine; the store-level composite will then delegate. The surface (return type `{ clipsEarned, drawnClips }`) is already what 3D expects.
- **Per-habit streak history events are silent by design** — `tickHabitStreak` updates state but does not currently emit a `streak_incremented` event (only daily + hygiene do). The discriminated union supports the event kind; 3D/3G can wire it up when they need UI.
- **Snapshots are taken on open, not on interval** (matches §4.6 and avoids iOS-background-timer issues).
- **Default milestones seed with `target: 0` and empty label.** This is intentional so `selectUnclaimedUnlocks` returns `[]` until the user actually fills them in onboarding. Onboarding (3I) must write real values.

## Contracts exposed for Wave 2 agents

Imported from `@/state/store` (path alias) or `src/state/store.ts`:

```ts
// Store handles
function createAppStore(initial?: AppState): UseBoundStore<StoreApi<Store>>;
function getAppStore(): UseBoundStore<StoreApi<Store>>;
function useAppStore<T>(selector: (s: Store) => T): T;
function __resetAppStoreForTests(initial?: AppState): UseBoundStore<StoreApi<Store>>;

// RNG + persistence overrides (tests)
function setStoreRng(r: Rng): void;
function setPersistenceEnabled(enabled: boolean): void;
function __resetPersistForTests(): void;

// Action surface — access via store.getState().actions
type Actions = {
  appendHistory(evt: HistoryEventInput): void;

  drawClipFromBag(jarId: JarId): Clip;
  earnClipToHand(jarId: JarId, clip: Clip, source: ClipSource, habitId: HabitId | null): void;
  returnClipsToBag(jarId: JarId, clipIds: readonly ClipId[]): void;
  cashInClips(jarId: JarId, clipIds: readonly ClipId[]): CashInResult;

  claimMilestone(jarId: JarId, milestone: MilestoneId): void;
  resetJar(jarId: JarId): void;

  spawnBonusTimer(
    jarId: JarId,
    result: Extract<BonusSpinResult, { segment: 'PCT_75'|'PCT_50'|'PCT_25' }>,
  ): BonusTimerId;
  completeBonusTimer(jarId: JarId, timerId: BonusTimerId, habitId: HabitId): void;
  expireBonusTimer(jarId: JarId, timerId: BonusTimerId): void;

  tickDailyStreak(jarId: JarId, date: LocalDate): void;
  tickHabitStreak(jarId: JarId, habitId: HabitId, date: LocalDate): void;
  tickHygieneStreak(jarId: JarId, date: LocalDate): void;
  breakStreak(jarId: JarId, kind: StreakKind): void;

  completeHabit(habitId: HabitId, unitsCompleted: number): { clipsEarned: number; drawnClips: Clip[] };

  logMainSpin(jarId: JarId, result: MainSpinResult, unlockedTier: Tier|null, rewardSelected: RewardId|null): void;
  logImportPerformed(jarId: JarId, backupId: string|null): void;
  logExportPerformed(jarId: JarId): void;

  hydrate(state: AppState): void;
};
```

From `src/db/export.ts` / `src/db/import.ts`:

```ts
function exportAll(): Promise<Blob>;
function exportAllAsText(): Promise<string>;
function importAll(json: string): Promise<{ ok: true } | { ok: false; errors: ZodIssue[] }>;
```

From `src/db/snapshots.ts`:

```ts
function maybeRunDailySnapshot(): Promise<{ taken: boolean; pruned: number }>;
```

From `src/state/persist.ts`:

```ts
function loadPersistedAppState(): Promise<AppState | null>;
```

From `src/lib/rng.ts`:

```ts
interface Rng { next(): number; nextInt(max: number): number; }
function rng(): Rng;
function mulberry32(seed: number): Rng;
```

From `src/test/seeded-rng.ts`:

```ts
function seededRng(seed: number): Rng;
```

From `src/state/selectors.ts`: all selectors listed above.

## Wave-2 stubs that are temporary

- **`drawClipFromBag` in `src/state/store.ts`** — uses `currentRng.nextInt(bag.length)` for a naive pick. 3B's `drawClip(bag, rng)` pure engine should replace the body of this action, keeping the same signature and the same auto-refill + history-event behavior.

## Notes on ambiguity resolutions (documented inline)

- **History truncation** (§4.2): 500-event in-memory window; full log mirrored into `history_events` store on every write. Matches spec.
- **v2 migration for Habit/Reward jarId** (OR-1): omitted in v1 per architect's lean. When v2 adds `jarId`, a migration populates `DEFAULT_JAR_ID` for all existing rows.
- **Per-habit streak events** (noted above): implementation ticks state but emits no history event yet. Hooks are in place for 3D/3G to wire up when needed.
- **Gold + regular cash-in mix** is classified as `none` (invalid). Spec §5.5 treats gold as an instant T3 shortcut; we don't combine.
- **Import preserves snapshots**: snapshots act as a pre-import safety net. Only `app_state` and `history_events` are cleared.
