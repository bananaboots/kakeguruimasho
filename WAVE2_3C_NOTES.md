# Wave 2 · 3C — Wheel Engine · Handoff Notes

## What shipped

### Pure engine (`src/features/wheel/wheel.engine.ts`)

- `resolveMainSpin(cfg, rng): MainSpinResult` — weighted pick over `MAIN_WHEEL_SEGMENT_ORDER`.
- `resolveBonusSpin(cfg, rng): BonusSpinResult` — weighted pick over `BONUS_WHEEL_SEGMENT_ORDER`; PCT_* carry `percent: 75|50|25`.
- `MAIN_WHEEL_SEGMENT_ORDER` = `['T1','T2','T3','BONUS','JACKPOT']` (12 o'clock → clockwise).
- `BONUS_WHEEL_SEGMENT_ORDER` = `['PCT_75','PCT_50','PCT_25','FREE','EXTRA']`.
- `mainSegmentIndex(tier)` / `bonusSegmentIndex(seg)` — stable index lookups for WheelCanvas + near-miss.
- **D5 guard (R11):** any `cfg.mercyChance !== 0` throws `"mercy unimplemented in v1"` at both entry points. Has a dedicated test block.
- **Weight normalization policy:** sum-to-1 tolerance is ±1e-6 (silent), ±1% (silent normalize for editor rounding drift), otherwise throw. Non-finite / negative / all-zero weights throw.

### Near-miss theater (`src/features/wheel/near-miss.ts`)

- `lockedTiers(highestUnlockedTier)` — `null|T1 → [T2,T3]`, `T2 → [T3]`, `T3 → []`.
- `isLosingSpin(result, highestUnlockedTier)` — BONUS/JACKPOT never count as losing; anything else that's below the unlocked top does.
- `chooseNearMissDrift({ resolved, highestUnlockedTier })` — returns `{ driftedPast: Tier, driftIndex: number } | null`.
  - Prefers the **adjacent most-desirable** locked tier (T2 adjacent to T1 → drift past T2, not T3).
  - Falls back to highest locked tier when nothing is adjacent.
  - Returns `null` for BONUS/JACKPOT (celebration moments — no theater) and when nothing is locked.
  - Guaranteed: drift index is never equal to the resolved index.

### Canvases (`WheelCanvas.tsx` + `BonusWheelCanvas.tsx`)

- SVG + Framer Motion. `transformOrigin: 50% 50%`. Pointer at 12 o'clock.
- Props `{ targetSegmentIndex, nearMissDriftIndex?, onAnimationComplete, idle? }`.
- **D3 choreography:** when `nearMissDriftIndex` is set, Phase 1 spins past the drift segment with `NEAR_MISS_OVERSHOOT_FACTOR × segment-sweep` overshoot + `MAIN_WHEEL_REVOLUTIONS=5` full revs (75% of the spin budget). Phase 2 eases back to `targetSegmentIndex` (25% of budget). Ground truth is always the target.
- Winning-segment scale pulse on settle (spec §12).
- `useReducedMotion` → 0.3s static rotation, no drift, no pulse.
- `idle={true}` suppresses animation start — used by tests. `BonusWheelCanvas` re-exports from `WheelCanvas.tsx` (shared geometry helpers).

### SFX (`src/features/wheel/sfx.ts`)

- `createSfx(isEnabled)` → `Sfx` with `spinTick`, `winForTier('T1'|'T2'|'T3'|'JACKPOT')`, `nearMiss`, `goldFanfare`, `timerTick`.
- Synthesized tones via `AudioContext` + oscillators — no audio files, no fetch, <1 KB of JS. OR-4 compliance is trivial because there's nothing to decode.
- `noopSfx` exported for tests / sfx-disabled paths.
- Silent fall-through on AudioContext failures (iOS Safari pre-unlock, sandboxed envs).
- **Haptics are in `src/lib/haptics.ts` (3J-owned, kept as-is).** 3E should call `haptics.winSmall/winMid/winBig/gold/nearMiss` via that module.

### Imperative spin API (`src/features/wheel/spin-orchestrator.ts`)

Consumed by 3E at the spin-FSM layer:

```ts
spinMainWheel(opts: {
  cfg: WheelConfig;
  highestUnlockedTier: Tier | null;
  rng: Rng;
  actions: { appendHistory, spawnBonusTimer };  // pass store.getState().actions
  jarId: JarId;
}): Promise<{ result: MainSpinResult; driftIndex: number | null; driftedPast: Tier | null }>;

spinBonusWheel(opts: {
  cfg: WheelConfig;
  rng: Rng;
  actions: { appendHistory, spawnBonusTimer };
  jarId: JarId;
}): Promise<{ result: BonusSpinResult }>;
```

**Semantics:**
- The Promise resolves **immediately after RNG + history write** — it does NOT wait for animation. 3E feeds the returned `driftIndex`/`result.tier`-index into `<WheelCanvas targetSegmentIndex=... nearMissDriftIndex=... onAnimationComplete=... />`, and 3E calls `actions.logMainSpin(...)` from `onAnimationComplete` (RNG-vs-animation split per R3 / D3).
- `spinMainWheel` emits `near_miss_theater` via `appendHistory` for every drifted spin (D3 contract). No other history events are written here.
- `spinBonusWheel` calls `actions.spawnBonusTimer` on PCT_* segments only (spec §5.7). FREE / EXTRA get no timer — 3E handles those paths.

### Tests

- `wheel.engine.test.ts` — 20 tests: 10k main & bonus distribution ±1%, determinism, mercyChance throw for any nonzero, weight normalization edge cases (slight drift normalizes, >1% throws, negative / NaN / all-zero throw).
- `near-miss.test.tsx` — 19 tests: `lockedTiers`, `isLosingSpin` matrix, `chooseNearMissDrift` across cash-in matrix + BONUS/JACKPOT exclusion + never-equals-resolved invariant + RTL render asserting the drift segment is in the DOM with a locked tier.
- `spin-orchestrator.test.ts` — 3 tests: `near_miss_theater` fires on losing spins, suppressed on top-tier wins + BONUS/JACKPOT, `spawnBonusTimer` fires only for PCT_*.

**All 42 wheel tests pass.** `npx vitest run src/features/wheel` is green.

## Animation timing constants (for 3E's spin FSM)

Exported from `src/features/wheel/animation-constants.ts`:

```ts
MAIN_WHEEL_SPIN_DURATION_SEC   = 5.0   // spec §12 "4–6 s"
BONUS_WHEEL_SPIN_DURATION_SEC  = 4.0
WIN_PULSE_DURATION_SEC         = 0.75
MAIN_WHEEL_REVOLUTIONS         = 5
BONUS_WHEEL_REVOLUTIONS        = 4
NEAR_MISS_OVERSHOOT_FACTOR     = 1.5   // × segment sweep
```

Spin FSM timeout budget (upper bound): `MAIN_WHEEL_SPIN_DURATION_SEC + WIN_PULSE_DURATION_SEC ≈ 5.75 s`. Add a small guard (say +1 s) before treating the spin as hung — Framer Motion will almost always fire `onAnimationComplete` faster than the transition duration on modern hardware.

## Public surface (for 3E)

All exported from `src/features/wheel` (barrel):

- `resolveMainSpin`, `resolveBonusSpin`, `mainSegmentIndex`, `bonusSegmentIndex`
- `MAIN_WHEEL_SEGMENT_ORDER`, `BONUS_WHEEL_SEGMENT_ORDER`
- `chooseNearMissDrift`, `isLosingSpin`, `lockedTiers`
- `spinMainWheel`, `spinBonusWheel`, plus their opts / outcome types
- `WheelCanvas`, `BonusWheelCanvas`, props types
- Animation constants (above)
- `createSfx`, `noopSfx`, `Sfx`

## Bundle hygiene

- `framer-motion` lives in its own manual chunk (already configured in `vite.config.ts`).
- `WheelCanvas` + `BonusWheelCanvas` are the only files that import from `framer-motion`.
- `/spin` route is already `lazy(() => import(...))` in `App.tsx` (3J), so the wheel chunk + framer-motion chunk are only fetched when the user navigates to `/spin`.
- Currently the framer-motion chunk shows ~3 KB gz in `npm run build` output because 3E has not wired `<WheelCanvas>` into `/spin` yet. Once wired, it'll grow to ~40 KB gz. The **split itself is stable** — no agent should import `framer-motion` from anywhere else.

## How `near-miss.ts` picks the drift target (1-pager for code review)

1. Compute locked tiers from `highestUnlockedTier` (see table above).
2. If nothing is locked → null (no drift).
3. Sort locked tiers by desirability: T3 > T2 > T1.
4. Among those, prefer the one whose wheel index is **circularly adjacent** to the resolved segment's index — "almost got the bigger prize" reads most naturally when the wheel passes through something right next to where it settled.
5. If no adjacent match, fall back to the most-desirable locked tier.
6. Safety check: if the chosen drift index equals the resolved index, return null (never happens under the current segment layout because locked tiers by construction can't include the resolved tier when the cash-in matrix forbids it).

Resulting drift choices for the common cases:

| resolved | unlocked | drift |
|---|---|---|
| T1 | null | T2 (adjacent, most desirable) |
| T1 | T2 | T3 (only locked tier) |
| T2 | null | T3 (adjacent, most desirable) |
| T3 | T2 | — (T3 is resolved but "unlocked=T2" means T3 was locked; impossible state) |
| BONUS | any | — (celebration) |
| JACKPOT | any | — (celebration) |

## Nothing outside `src/features/wheel/` was touched

Per the brief: 3A's store, slices, types, and data are untouched. 3E will wire `spinMainWheel` into its FSM; 3H will consume `actions.spawnBonusTimer` directly (3C does not coordinate with 3H). `logMainSpin` is called by 3E at `onAnimationComplete` time.

## Known caveats / future fit-and-finish

1. **`framer-motion` import path:** the Wave 1 3J notes suggest `motion/react` subpath ESLint-enforcement is coming. Current imports are `framer-motion` named imports (tree-shake OK, manual chunk in place). If 3J lands an ESLint rule for `no-restricted-imports` on the `framer-motion` barrel, flip these imports to `motion/react` — the named bindings are identical.
2. **Bonus chain (EXTRA) is 3E's state-machine responsibility.** `spinBonusWheel` returns `{ segment: 'EXTRA' }` and nothing else — 3E loops it up to 2 more times per spec §5.7.
3. **Reduced-motion spin still resolves `onAnimationComplete`.** 3E's FSM can treat reduced-motion like normal — it'll just fire earlier.
4. **No E2E "happy-path spin" test here.** That belongs in Phase 4's Playwright smoke.
