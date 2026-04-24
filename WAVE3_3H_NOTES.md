# Wave 3 · 3H — Bonus Timer Agent · Handoff Notes

## What was implemented

### Components (`src/features/bonus/**`)

- `BonusTimerBanner.tsx` — sticky cross-route banner (replaces `BonusTimerBannerStub`). Subscribes to the stable `bonusTimerState[jarId].timers` array reference and derives `active` via `useMemo` (avoids Zustand re-render loop from fresh filter results). Shows the oldest-spawned active timer's countdown, percent badge, and origin-habit label; `+N more` chip when ≥ 2 timers active. Tap navigates to `/bonus`.
- `BonusTimerCountdown.tsx` — `endTimestamp - Date.now()` is the only authority. `requestAnimationFrame` loop ticks while visible; `visibilitychange` listener triggers immediate re-sync. `onExpire` is fired from a reactive `useEffect` on the `remainingMs` state (not from inside the rAF callback) so it still works under vitest fake timers. `aria-live="off"` prevents screen-reader spam; `aria-label` exposes minutes remaining.
- `DiscountHabitPicker.tsx` — per-timer picker. Filters habits by `unit.kind === 'count' | 'minutes' | 'sets'` (A4 — hygiene bundle excluded). Live-reads the timer from the store so that `originHabitId` updates propagate even if the parent holds a stale ref. Once a habit is picked, swaps to `<JustALittleBitMore>`.
- `JustALittleBitMore.tsx` — A18 copy. `delta = ceil(target × percent / 100)`. Scans in-memory `history` for the most recent `habit_completed` event on the picked habit; if present, renders `"${delta} more ${unit} — you just did ${recentUnits}"`; otherwise falls back to `"Do ${delta} ${unit}"`. "I did it" calls `actions.completeBonusTimer(jarId, timerId, habitId)`.
- `bonus.machine.ts` — pure reducer `classifyBonusState({ timers, pendingBonusSpins })` → `idle | pendingSpin | activeSingle | activeMultiple | allExpired | completedRecently`. Plus `oldestActiveTimer(timers)` helper. Exhaustively tested across 3⁴ = 81 depth-4 status permutations (R6).
- `expireCheck.ts` — on-app-open + on-`visibilitychange` sweep. Walks `bonusTimerState[jarId].timers`, expires any `active` whose `endTimestamp < now` via `actions.expireBonusTimer`, then (if ≥ 1 expired) calls `actions.breakStreak(jarId, 'bonus-chain')` once per jar per sweep (A2). Returns `{ expiredCount, streakBroken }`.
- `bonus.css` — sticky banner, countdown, picker, detail cards. Tokens only.
- `index.ts` — barrel.

### App wiring

- `src/App.tsx` — swapped `BonusTimerBannerStub` for real `<BonusTimerBanner />`. Added a second `useEffect` that runs `expireCheck()` on mount and registers a `visibilitychange` listener that re-runs it. Errors from the sweep are swallowed so the shell never crashes on boot.
- `src/routes/BonusTimerDetail.tsx` — renders one `<TimerCard>` per active timer (each with its own `<BonusTimerCountdown>` + `<DiscountHabitPicker>`). Empty state "No active bonuses" with back-home link when `timers.length === 0`.

## Bonus FSM sketch

```
                   spawnBonusTimer
                        │
              ┌─────────▼─────────┐
              │   activeSingle    │──── spawn another ──► activeMultiple
              │                   │◄──── one completes/expires ──┐
              └──┬─────────┬──────┘                              │
                 │         │                                     │
       complete  │         │  expire (endTs < now)               │
                 ▼         ▼                                     │
        completedRecently  allExpired                            │
                 │                                               │
                 └─────── spawn another ─────────────────────────┘

  pendingBonusSpins > 0 && no active → pendingSpin
  (queued EXTRA spins waiting to resolve — 3C spawns timers when they do)
```

`classifyBonusState` is purely a UI classifier; store-level truth is `timers` + `pendingBonusSpins`. A3: any number of timers may be active concurrently. R6-exhaustive permutation test covers depth 4 × {active, completed, expired} × {0, 1, 2} pending spins.

## expireCheck lifecycle wiring

- **App mount**: `App.tsx` effect runs `expireCheck()` once after the store is ready. Catches any timers that expired while the tab/PWA was fully closed.
- **`visibilitychange`**: same effect registers a document-level listener that re-runs `expireCheck()` whenever the tab becomes visible again. This is the iOS-foreground-from-background path (R1).
- **Passive expiry during foreground**: when the banner's or detail-card's `<BonusTimerCountdown>` crosses 0 ms, it fires `onExpire` which calls `actions.expireBonusTimer` directly. `expireCheck` then treats the slot as a no-op (status already `expired`). The reactive-state expiry guard ensures `onExpire` fires at most once per timer instance.

## Missing store actions (flagged for Phase 4)

- **`setOriginHabit(timerId, habitId)`** — currently done via a direct `store.setState` patch inside `DiscountHabitPicker.tsx`. 3A exposes `completeBonusTimer(jarId, timerId, habitId)` which sets `originHabitId` as part of the completion transaction, but there's no intermediate "user picked but hasn't completed" action. Phase 4 should add `actions.setBonusTimerOrigin(jarId, timerId, habitId)` that writes `originHabitId` and emits a history event (e.g. `bonus_origin_picked`) so this state change is auditable. Current workaround is correct for R4 slice-write hygiene only because the writer is still scoped to the bonus slice shape, but it does not append a history event.

## Test coverage

- `bonus.machine.test.ts` — pure FSM; 81-combo depth-4 exhaustion + `oldestActiveTimer` selection.
- `expireCheck.test.ts` — spawn → advance clock → expire; multi-timer sweep (A3); non-stale left alone; re-run is a no-op; "close + advance 5min + reopen" asserts ≤ 5 min remaining.
- `BonusTimerCountdown.test.tsx` — `formatRemaining` rounding; initial render from `endTimestamp - Date.now()`; stale-on-mount shows 0:00 and fires `onExpire` once; `aria-live="off"` + `aria-label`; `visibilitychange` re-sync after clock advance.
- `BonusTimerBanner.test.tsx` — empty state (null render); single-timer badge + countdown; `+N more` chip at concurrency; `aria-label` shape.
- `DiscountHabitPicker.test.tsx` — A4 hygiene-bundle exclusion; archived-habit filtering; pick → originHabitId persisted + swap to `<JustALittleBitMore>`.
- `JustALittleBitMore.test.tsx` — `discountTarget` math; `unitWord`; A18 delta copy vs fallback copy; "I did it" fires `completeBonusTimer` and flips timer status to `completed`.

Totals: 40 new tests, 245 passing project-wide. `npm run build` clean.

## Spec-to-implementation notes

- `BonusTimerCountdown` expire-fire was moved from inside the rAF `tick()` to a reactive `useEffect` on `remainingMs` so it still works under `vi.useFakeTimers` where rAF may not tick synchronously. Authority is still `endTimestamp - Date.now()`; the effect is purely a dispatch trigger.
- Banner subscribes to the underlying `timers` array reference rather than calling `selectActiveBonusTimers` inside `useAppStore(...)`. Selectors that return fresh arrays cause Zustand to loop — both banner and detail route use `useMemo` to filter locally instead.
- `A17` is already handled by 3A's `completeBonusTimer` composite path: it emits `bonus_completed`, and `earnClipToHand` / main-wheel re-spin is chained by the existing flow. 3H does not special-case bonus-origin clips.
- FREE and EXTRA segments do not reach `DiscountHabitPicker` — 3C's `spawnBonusTimer` is typed to only accept `PCT_75 | PCT_50 | PCT_25`, and 3A only creates `BonusTimer` records for those.
- `src/BonusTimerBannerStub.tsx` is now unused; left in place because it's 3J-owned (per the MUST-NOT-TOUCH list). Safe to remove in a future 3J cleanup.

## Known limitations / follow-ups

1. Phase 4: add a real `setBonusTimerOrigin` action (see "Missing store actions" above).
2. If a user abandons a timer by never picking a habit, nothing breaks — it still expires on the 10-minute deadline via `expireCheck` or the banner's `onExpire`. Consider a gentler "pick now" nudge in onboarding or a push notification in v1.1.
3. `expireCheck` breaks the `bonus-chain` streak on any expiration. If the user has multiple concurrent timers and completes some but not all, the chain still breaks — matches A2's "session-scoped chain, any miss ends the run" but worth confirming with the user once multi-timer flows appear in QA.
