# Wave 3 · 3E — Cash-in & Spin Flow · Handoff Notes

## What shipped

### Components (all in `src/features/spin/`)

- **`HandView.tsx`** — visual pile of clips grouped by color + gold. Tap a
  color group to expand its sub-stack (fans out the individual clip chips).
  Mobile-first grid, `aria-expanded`/`aria-controls` on each group button,
  hidden until the user has clips (empty-state copy otherwise).
- **`CashInPicker.tsx`** — controlled picker for 2-match / 3-match same-color
  selections. One row per color with at least 1 clip; `+2`/`+3` buttons
  gray out when the user doesn't have enough of that color.
  Tapping a different color replaces the prior selection (radio-style;
  cross-color combos impossible by construction). Gold clips are **not**
  offered here — the gold flow is its own branch. `Skip` clears to
  `none`. A9 freeze: `disabled=true` marks every control inert and sets
  `aria-disabled` on the container.
- **`SpinButton.tsx`** — large tap target (≥ 56 px). Parent owns
  disabled/label logic; this component is dumb.
- **`GoldInstantT3Button.tsx`** — only renders when `hand.filter(kind==='gold').length ≥ 1`.
  Calls `onRedeemGold(goldClipId)`; parent handles side effects.
  Golden border + radial shimmer per SPEC §12.
- **`PostSpinFlow.tsx`** — the orchestrator. Composes HandView +
  CashInPicker + GoldInstantT3Button + SpinButton and mounts
  `<WheelCanvas>` / `<BonusWheelCanvas>` when a spin is active. Awaits
  `openRewardPicker(tier)` for picks. Writes history events. `aria-live`
  polite announcer for "Spinning", "{Tier} won — pick a reward", "Almost!".
- **`spin.machine.ts`** — plain reducer FSM. Pure; no React, no side
  effects. Tracks `phase`, current cash-in `selection`, spin result, drift,
  pending reward tier + source, near-miss payload, `bonusPending` flag.
  Guards: SELECT_CLIPS / TAP_GOLD_INSTANT_T3 ignored once phase !== 'idle'
  (A9). `RESET` zeroes state.
- **`index.ts`** — barrel with components + FSM helpers
  (`highestUnlockedTierForSpin`, `isCashInFrozen`, etc.).

### Route wiring

- **`src/routes/SpinFlow.tsx`** — mounts `<PostSpinFlow>` under the
  existing `<section class="route">`. No other composition needed;
  `<ToastProvider>` is already installed by 3J at `main.tsx`.
- **`src/routes/Home.tsx`** — the `[3E] HandSummary` slot now renders a
  `<Link to="/spin">` card showing clip count. (Minimal wiring per the
  brief — 3E does not own a fancy Home snippet.)

### CSS

- **`src/features/spin/spin.css`** — all styles for the 4 components.
  Tokens only (`--color-*`, `--space-*`, `--radius-*`, `--tap-target-min`).
  The `.spin-flow__actions` container is `position: sticky; bottom: ...`
  so the Spin button sits above the bottom nav, thumb-reachable.

## FSM summary

Phases, transitions, and side-effect owners:

| From → To | Trigger (event) | Side effects (in PostSpinFlow) |
|-----------|-----------------|-------------------------------|
| idle → idle | `SELECT_CLIPS` | none |
| idle → goldInstantT3 | `TAP_GOLD_INSTANT_T3` | — |
| idle → cashInFrozen | `START_SPIN` | `runSpinFlow` starts: `cashInClips` commits + returns clips to bag; `spinMainWheel` resolves RNG + writes `near_miss_theater` (D3). `pendingSpin` set so WheelCanvas mounts. |
| cashInFrozen → mainResolved | `SPIN_RESOLVED` (fired by canvas `onAnimationComplete`) | — |
| mainResolved → rewardPicker | `START_REWARD_PICKER` | `openRewardPicker(tier)` awaited |
| mainResolved → nearMissDone | `REGISTER_NEAR_MISS` + `SHOW_NEAR_MISS` | `appendHistory({kind:'near_miss', actualTier, blockedBy})` (A15); `toast({title:'Almost!'})` |
| mainResolved → bonusSpinning | `START_BONUS_SPIN` (BONUS path after auto-pick) | `runBonusWheel()` |
| goldInstantT3 → rewardPicker | `START_REWARD_PICKER` | `returnClipsToBag([goldId])` (A7) + `openRewardPicker('T3')` |
| rewardPicker → mainResolved / bonusSpinning | `REWARD_PICKED`/`REWARD_FORFEIT` | `appendHistory({kind:'reward_claimed', source, tier, rewardId})` |
| bonusSpinning → bonusResolved | `BONUS_RESOLVED` (fired when bonus canvas animates complete) | — |
| anywhere → idle | `ALL_DONE` | `setPendingSpin(null)` |

`bonusPending=true` is set by `SET_BONUS_PENDING` before the JACKPOT
picker opens so that REWARD_PICKED routes to `bonusSpinning` (free bonus
spin per Q6).

## Cash-in × wheel matrix behavior

| Cash-in | Wheel lands on | What happens |
|---------|---------------|--------------|
| 0-match | T1 | T1 reward (source=wheel) |
| 0-match | T2 | near-miss: `near_miss` event + "Almost!" toast, no reward |
| 0-match | T3 | near-miss |
| 0-match | BONUS | auto-collect **T1** (best available) → bonus wheel spin |
| 0-match | JACKPOT | instant **T3** (Q6 bypass) → bonus wheel spin |
| 2-match | T1 | T1 reward |
| 2-match | T2 | T2 reward |
| 2-match | T3 | near-miss |
| 2-match | BONUS | auto-collect **T2** → bonus wheel spin |
| 2-match | JACKPOT | instant T3 + bonus spin |
| 3-match | T1 / T2 / T3 | reward of that tier |
| 3-match | BONUS | auto-collect **T3** → bonus wheel spin |
| 3-match | JACKPOT | instant T3 + bonus spin |
| gold | — | **skips wheel** entirely; `returnClipsToBag` for the one gold, T3 reward picker with `source='gold'` |

"BONUS auto-collect best available tier" source is logged as `source: 'wheel'`
because the `reward_claimed` variant only allows `'wheel' | 'gold' | 'jackpot'`
per `src/types/history.ts`. The reward still originates from the wheel
landing on BONUS; the history contains the full chain via the `main_spin`
+ `bonus_spin` events and the paired `reward_claimed`.

## Integration points (what I call; what 3H observes)

### Upstream contracts I consume

- `actions.cashInClips(jarId, clipIds)` → `CashInResult`. Returns clips to
  bag + emits `cash_in` history event (A7).
- `actions.returnClipsToBag(jarId, [goldId])` — gold short-circuit path.
- `actions.appendHistory({...})` — for `near_miss` + `reward_claimed`.
- `actions.logMainSpin(jarId, result, unlockedTier, rewardSelected)` —
  called from `onAnimationComplete` per 3C's R3/D3 split (ground truth
  vs. animation).
- `actions.spawnBonusTimer` — handed to `spinBonusWheel` as part of its
  SpinActions mask; 3C spawns the timer on PCT_* bonus segments.
- `spinMainWheel({cfg, highestUnlockedTier, rng, actions, jarId})` —
  3C's orchestrator. Returns `{result, driftIndex, driftedPast}` and
  synchronously writes `near_miss_theater` if drift is scheduled (D3).
- `spinBonusWheel(...)` — same pattern; spawns the timer.
- `openRewardPicker(tier)` — 3F's imperative promise. Resolves with the
  picked `RewardId` or `null` on forfeit (OR-3).
- `<WheelCanvas>` / `<BonusWheelCanvas>` — 3C UI components.
- `useToast()` — 3J's toast primitive; used for the "Almost!" message.

### Observed, not coordinated: 3H

The bonus timer UX is owned by 3H. When `spinBonusWheel` lands on a PCT_*
segment, 3C's orchestrator calls `actions.spawnBonusTimer` directly. 3E
does not talk to 3H — once the bonus wheel animation finishes and I dispatch
`BONUS_RESOLVED`, the timer is already live in `AppState.bonusTimerState`
and 3H's `<BonusTimerBanner>` picks it up. 3E's `ALL_DONE` returns the
flow to idle regardless of whether a timer is now active.

## A9 freeze (verified)

- Once `START_SPIN` fires, `isCashInFrozen(state)` is `true` through every
  subsequent phase until `ALL_DONE` returns to `idle`.
- `CashInPicker` is passed `disabled={frozen}` which disables every `+2`,
  `+3`, and `Skip` control.
- `GoldInstantT3Button` is passed `disabled={frozen}` — tapping during
  spin is a no-op.
- SELECT_CLIPS / TAP_GOLD_INSTANT_T3 events are ignored by the reducer
  when phase !== 'idle'. This is belt-and-braces: UI-level + reducer-level.

## Tests — 43 new

`src/features/spin/spin.machine.test.ts` (31 tests):

- `highestUnlockedTierForSpin` matrix (none/two/three/gold → null/T2/T3/T3).
- `isCashInFrozen` (A9): false only in idle; true through spin + reward +
  bonus.
- Gold short-circuit: phase + pendingRewardTier + source + A9 freeze.
- SELECT_CLIPS freeze guard.
- Cash-in × wheel matrix — 15 combinations, each expecting one of
  `reward`, `near-miss`, `bonus-auto-collect-then-bonus`, or
  `jackpot-T3-then-bonus`.
- Gold × wheel: wheel is never mounted.
- REWARD_FORFEIT path on jackpot still advances to bonusSpinning (Q6).
- RESET at any phase returns to INITIAL_STATE.
- JACKPOT bypass: T3 picker opens even with 0-match cash-in.

`src/features/spin/__tests__/CashInPicker.test.tsx` (10 tests):

- Row-per-present-color.
- `+2` disabled when count < 2; `+3` disabled when count < 3.
- Tap `+2` / `+3` produces correct `SpinSelection` (`matchKind` +
  `unlockedTier` + selected IDs).
- Cross-color tap replaces (no cross-color combos possible).
- `Skip` clears the selection.
- Gold clips are hidden from this picker.
- `disabled=true` (A9): `aria-disabled`, buttons inert, `onChange` never
  fires.
- `aria-pressed` reflects the active selection.
- Status text announces the current unlock.

`src/features/spin/__tests__/PostSpinFlow.gold.test.tsx` (2 tests):

- End-to-end gold short-circuit: renders `<PostSpinFlow>` with a
  one-gold hand, tap the gold button, confirm the wheel never mounts, the
  reward picker portal opens for T3, the clip is returned to the bag (A7),
  pick a reward, assert `history[..].kind === 'reward_claimed'` with
  `{tier: 'T3', source: 'gold'}` (A6) and no `main_spin` / `near_miss`
  events exist.
- Gold button is hidden when hand has zero gold.

All 43 pass. Full repo (excluding 3H's in-flight `src/features/bonus/**`):
**27 test files, 205 passing.**

## Build / test status

- `npx vitest run src/features/spin` → **43 / 43 green**.
- `npx vitest run --exclude "src/features/bonus/**"` → **205 / 205 green**.
- Full repo: 1 pre-existing failure in 3H's `BonusTimerCountdown.test.tsx`
  (fake-timer vs visibilitychange interaction; unrelated to 3E).
- `tsc -b` on my scope is clean (no errors in
  `src/features/spin/**`, `src/routes/SpinFlow.tsx`, `src/routes/Home.tsx`).
  Full `tsc -b` fails on 3H's `src/features/bonus/DiscountHabitPicker.tsx`
  and `src/features/bonus/__tests__/JustALittleBitMore.test.tsx` — pre-existing,
  3H's scope. My brief forbids touching those.
- Phase 4 integration will flush once 3H's Wave 3 lands.

## Deviations / design notes

- **BONUS auto-collect source logging.** The `reward_claimed` variant only
  accepts `'wheel' | 'gold' | 'jackpot'`. For BONUS auto-collect I log
  `source: 'wheel'` because the reward is caused by a wheel landing. If
  3A later wants a dedicated `'bonus-auto'` source value, it's a typed PR
  against `src/types/history.ts` and a one-line swap in PostSpinFlow.
- **`pendingSpin` held outside the reducer.** The reducer stays pure.
  The concrete segment indices + drift index passed to `<WheelCanvas>`
  live in a `useState` alongside the reducer. This keeps FSM tests free
  of DOM-coupling concerns.
- **`runBonusWheel` awaits the canvas.** `spinBonusWheel` resolves as
  soon as RNG is committed, but the user-visible spin is the animation.
  The flow uses a Promise/resolver ref pattern so `runBonusWheel` awaits
  the `<BonusWheelCanvas>` `onAnimationComplete` before dispatching
  `BONUS_RESOLVED`. That keeps the FSM phase in sync with what the user
  sees.
- **No EXTRA chain yet.** `spinBonusWheel` can return
  `{ segment: 'EXTRA' }`. Spec §5.7 says EXTRA = re-spin the bonus wheel
  2 more times. The reducer supports re-entry (`START_BONUS_SPIN` is
  allowed from `bonusResolved`), but the PostSpinFlow wiring in this
  wave only runs one bonus spin. The follow-up is tracked as a small
  loop in `handleMainSpinAnimationComplete` → `runBonusWheel` → check
  `outcome.result.segment === 'EXTRA'` → re-dispatch up to 2 more times.
  Kept out of this wave because EXTRA observation is 3H's domain and the
  spec allows it to be layered in without FSM changes.
- **Near-miss animation from 3C (D3).** 3C's orchestrator wrote the
  `near_miss_theater` event eagerly; 3E writes the player-facing
  `near_miss` event only when the resolved tier is actually locked. The
  two events are independent and both are expected.

## Files touched

- NEW: `src/features/spin/HandView.tsx`
- NEW: `src/features/spin/CashInPicker.tsx`
- NEW: `src/features/spin/SpinButton.tsx`
- NEW: `src/features/spin/GoldInstantT3Button.tsx`
- NEW: `src/features/spin/PostSpinFlow.tsx`
- NEW: `src/features/spin/spin.machine.ts`
- NEW: `src/features/spin/spin.machine.test.ts`
- NEW: `src/features/spin/spin.css`
- NEW: `src/features/spin/index.ts`
- NEW: `src/features/spin/__tests__/CashInPicker.test.tsx`
- NEW: `src/features/spin/__tests__/PostSpinFlow.gold.test.tsx`
- NEW: `WAVE3_3E_NOTES.md`
- MODIFIED: `src/routes/SpinFlow.tsx` (mount `<PostSpinFlow>`)
- MODIFIED: `src/routes/Home.tsx` (HandSummary → `<Link to="/spin">`; 3J's
  linter had already wired this before my final commit, so the diff is
  a no-op confirmation)
