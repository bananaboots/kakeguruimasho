/**
 * expireCheck — sweep all active bonus timers and expire stale ones (3H).
 *
 * R1 in ARCHITECTURE §10 + A3 in PLANNING: timers are authoritative via
 * `endTimestamp`. We NEVER trust a `setInterval` to fire. Instead, on every
 * app-open AND every `visibilitychange`, we walk `bonusTimerState[jarId].timers`
 * and expire any entry where `endTimestamp < now && status === 'active'`.
 *
 * When at least one timer expires, we break the `bonus-chain` streak (A2 —
 * session-scoped chain; any miss ends the run). Multiple timers expiring in
 * the same sweep produce a single streak-break event, not one per timer.
 *
 * All mutations go through the store's existing action surface; no raw state
 * edits here (R4 slice-write hygiene).
 *
 * Call sites:
 *   - `App.tsx` on-mount (once, next to `checkRetroactiveHygiene`).
 *   - `App.tsx` `visibilitychange` listener.
 *   - Tests may call directly via `expireCheck()`.
 */

import { getAppStore } from '../../state/store.ts';

export interface ExpireCheckResult {
  /** How many timers transitioned from active → expired on this sweep. */
  expiredCount: number;
  /** true if we also broke the bonus-chain streak as a side effect. */
  streakBroken: boolean;
}

export function expireCheck(): ExpireCheckResult {
  const store = getAppStore();
  const now = Date.now();
  let expiredCount = 0;
  const state = store.getState();
  const jarIds = Object.keys(state.bonusTimerState);

  for (const jarIdKey of jarIds) {
    const jarId = jarIdKey as typeof state.activeJarId;
    const bs = state.bonusTimerState[jarId];
    if (!bs) continue;
    const stale = bs.timers.filter(
      (t) => t.status === 'active' && Date.parse(t.endTimestamp) < now,
    );
    for (const t of stale) {
      store.getState().actions.expireBonusTimer(jarId, t.id);
      expiredCount += 1;
    }
    if (stale.length > 0) {
      // A2: any missed timer ends the session chain. Only break once per
      // jar per sweep to avoid emitting N streak_broken events.
      store.getState().actions.breakStreak(jarId, 'bonus-chain');
    }
  }

  return { expiredCount, streakBroken: expiredCount > 0 };
}
