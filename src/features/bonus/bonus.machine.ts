/**
 * bonus.machine — Bonus-timer FSM (3H).
 *
 * Small, pure reducer that classifies the current bonus-timer state for UI
 * purposes. Per R6 in ARCHITECTURE §10: timers can stack (A3 concurrent
 * timers via EXTRA chains up to depth 4 in practice — see A2). Rather than
 * track the cross-product of timer statuses directly, we summarise the
 * current picture into a handful of UI-relevant states.
 *
 * States:
 *   - `idle`                     — no active timers, no pending bonus spins.
 *   - `pendingSpin`              — an EXTRA chain has queued bonus spins but
 *                                  nothing is counting down yet (timers for
 *                                  the spins will spawn when they resolve).
 *   - `activeSingle`             — exactly one active timer.
 *   - `activeMultiple`           — ≥ 2 active timers (EXTRA chain concurrency).
 *   - `allExpired`               — no active timers, but the most recent
 *                                  activity was an expiration — used for
 *                                  toast-like "you missed it" UI.
 *   - `completedRecently`        — no active timers; most recent activity was
 *                                  a completion.
 *
 * The reducer is pure and does not touch the store directly. Callers pass a
 * summary derived from `selectActiveBonusTimers` plus the full timers array
 * and `pendingBonusSpins` so we can reason about chain state.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { BonusTimer } from '../../types/bonus.ts';

export type BonusMachineState =
  | 'idle'
  | 'pendingSpin'
  | 'activeSingle'
  | 'activeMultiple'
  | 'allExpired'
  | 'completedRecently';

export interface BonusMachineInput {
  timers: readonly BonusTimer[];
  pendingBonusSpins: number;
}

export function classifyBonusState(input: BonusMachineInput): BonusMachineState {
  const active = input.timers.filter((t) => t.status === 'active');
  if (active.length >= 2) return 'activeMultiple';
  if (active.length === 1) return 'activeSingle';
  if (input.pendingBonusSpins > 0) return 'pendingSpin';

  // No active timers, nothing pending. Peek the latest resolved timer.
  const last = [...input.timers]
    .filter((t) => t.status === 'expired' || t.status === 'completed')
    .sort((a, b) => Date.parse(b.spawnedAt) - Date.parse(a.spawnedAt))[0];

  if (!last) return 'idle';
  if (last.status === 'completed') return 'completedRecently';
  return 'allExpired';
}

/**
 * Oldest-spawned currently-active timer, used by the banner when ≥ 1 active.
 * Returns `null` when none active.
 */
export function oldestActiveTimer(timers: readonly BonusTimer[]): BonusTimer | null {
  const active = timers.filter((t) => t.status === 'active');
  if (active.length === 0) return null;
  return active.reduce((oldest, t) =>
    Date.parse(t.spawnedAt) < Date.parse(oldest.spawnedAt) ? t : oldest,
  );
}
