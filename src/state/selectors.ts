// Derived-value selectors. Never mutate.

import type { AppState } from '../types/app-state.ts';
import type { Clip, ClipColor } from '../types/clip.ts';
import type { JarId, MilestoneId } from '../types/ids.ts';
import type { Tier } from '../types/wheel.ts';
import { todayLocal } from '../lib/time.ts';
import { classifyCashIn } from './slices/jars.ts';

export function selectHand(state: AppState, jarId: JarId): Clip[] {
  return state.hands[jarId] ?? [];
}

export function selectBag(state: AppState, jarId: JarId): Clip[] {
  return state.bags[jarId] ?? [];
}

export function selectBagCompositionCounts(
  state: AppState,
  jarId: JarId,
): Record<ClipColor | 'gold', number> {
  const out: Record<ClipColor | 'gold', number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
    purple: 0,
    pink: 0,
    gold: 0,
  };
  for (const clip of selectBag(state, jarId)) {
    if (clip.kind === 'gold') out.gold += 1;
    else out[clip.color] += 1;
  }
  return out;
}

/** Given a candidate cash-in selection, compute highest unlocked tier. */
export function selectUnlockedTierForCashIn(
  state: AppState,
  jarId: JarId,
  clipIds: readonly string[],
): Tier {
  const hand = selectHand(state, jarId);
  const picked = hand.filter((c) => clipIds.includes(c.id));
  const kind = classifyCashIn(picked);
  if (kind === 'three-match' || kind === 'gold-instant-T3') return 'T3';
  if (kind === 'two-match') return 'T2';
  return 'T1';
}

export function selectJarTotal(state: AppState, jarId: JarId): number {
  return state.jars[jarId]?.total ?? 0;
}

/**
 * Returns the milestone IDs whose target has been crossed but which have
 * NOT yet been claimed. Ordered mini → mid → moonshot.
 */
export function selectUnclaimedUnlocks(state: AppState, jarId: JarId): MilestoneId[] {
  const jar = state.jars[jarId];
  if (!jar) return [];
  const order: MilestoneId[] = ['mini', 'mid', 'moonshot'];
  return order.filter((id) => {
    const m = jar.milestones[id];
    const claim = jar.claimed[id];
    return m.target > 0 && jar.total >= m.target && claim === null;
  });
}

export function selectDailyStreakCompleteToday(state: AppState, jarId: JarId): boolean {
  const s = state.streaks[jarId];
  if (!s) return false;
  return s.daily.lastClipDate === todayLocal();
}

export function selectActiveBonusTimers(state: AppState, jarId: JarId) {
  const bs = state.bonusTimerState[jarId];
  if (!bs) return [];
  return bs.timers.filter((t) => t.status === 'active');
}

/**
 * Activity feed — latest N history events. Reads from in-memory AppState.history.
 * Full-lifetime feed reads from history_events store directly.
 */
export function selectRecentHistory(state: AppState, n: number) {
  if (n <= 0) return [];
  const h = state.history;
  return h.slice(Math.max(0, h.length - n)).reverse();
}
