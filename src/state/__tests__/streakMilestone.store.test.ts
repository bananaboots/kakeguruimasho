/**
 * tickDailyStreak milestone payout — store-level integration.
 *
 * The pure math is covered by features/jar/__tests__/streakMilestone.test.ts.
 * Here we exercise the action chain: streak ticks to N, payout fires,
 * clips land in hand, history logs the milestone event, and
 * pendingStreakCelebration is set for the modal.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createAppStore,
  setPersistenceEnabled,
  setStoreRng,
} from '../store.ts';
import { seedInitialAppState } from '../../data/defaults.ts';
import { seededRng } from '../../test/seeded-rng.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import type { AppState } from '../../types/app-state.ts';
import type { LocalDate } from '../../types/ids.ts';

function withDailyStreakAt(value: number): AppState {
  const state = seedInitialAppState();
  state.streaks[DEFAULT_JAR_ID]!.daily = {
    current: value,
    longest: value,
    lastClipDate: '1970-01-01' as LocalDate,
  };
  return state;
}

describe('tickDailyStreak — milestone payout', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(7));
  });
  afterEach(() => {
    setPersistenceEnabled(true);
  });

  it('does NOT award on a non-milestone tick', () => {
    const store = createAppStore(withDailyStreakAt(50));
    store.getState().actions.tickDailyStreak(DEFAULT_JAR_ID, '1970-01-02' as LocalDate);
    const s = store.getState();
    expect(s.streaks[DEFAULT_JAR_ID]!.daily.current).toBe(51);
    expect(s.pendingStreakCelebration).toBeNull();
    // No streak_milestone_awarded event in history.
    expect(s.history.some((e) => e.kind === 'streak_milestone_awarded')).toBe(false);
  });

  it('awards 10 regular + 1 gold and sets pending celebration on the 100-day tick', () => {
    const store = createAppStore(withDailyStreakAt(99));
    const handBefore = store.getState().hands[DEFAULT_JAR_ID]!.length;
    store.getState().actions.tickDailyStreak(DEFAULT_JAR_ID, '1970-01-02' as LocalDate);
    const s = store.getState();
    expect(s.streaks[DEFAULT_JAR_ID]!.daily.current).toBe(100);
    expect(s.hands[DEFAULT_JAR_ID]!.length).toBe(handBefore + 11);
    // 10 regular + 1 gold
    const newClips = s.hands[DEFAULT_JAR_ID]!.slice(handBefore);
    expect(newClips.filter((c) => c.kind === 'regular')).toHaveLength(10);
    expect(newClips.filter((c) => c.kind === 'gold')).toHaveLength(1);
    // Pending celebration set with the right shape.
    expect(s.pendingStreakCelebration).toEqual({
      jarId: DEFAULT_JAR_ID,
      streakValue: 100,
      tier: 'century',
      regularChips: 10,
      goldChips: 1,
    });
    // History logs the milestone event.
    const milestone = s.history.find((e) => e.kind === 'streak_milestone_awarded');
    expect(milestone).toBeDefined();
  });

  it('awards 25 regular + 10 gold on the 1000-day tick (millennium replaces century)', () => {
    const store = createAppStore(withDailyStreakAt(999));
    store.getState().actions.tickDailyStreak(DEFAULT_JAR_ID, '1970-01-02' as LocalDate);
    const s = store.getState();
    expect(s.streaks[DEFAULT_JAR_ID]!.daily.current).toBe(1000);
    expect(s.pendingStreakCelebration).toEqual({
      jarId: DEFAULT_JAR_ID,
      streakValue: 1000,
      tier: 'millennium',
      regularChips: 25,
      goldChips: 10,
    });
    // 25 + 10 = 35 new clips in hand (no extra 100-day overlay).
    const handLen = s.hands[DEFAULT_JAR_ID]!.length;
    expect(handLen).toBe(35);
  });

  it('acknowledgeStreakMilestone clears the pending celebration', () => {
    const store = createAppStore(withDailyStreakAt(99));
    store.getState().actions.tickDailyStreak(DEFAULT_JAR_ID, '1970-01-02' as LocalDate);
    expect(store.getState().pendingStreakCelebration).not.toBeNull();
    store.getState().actions.acknowledgeStreakMilestone();
    expect(store.getState().pendingStreakCelebration).toBeNull();
  });

  it('no payout on a same-day re-tick', () => {
    const store = createAppStore(withDailyStreakAt(99));
    store.getState().actions.tickDailyStreak(DEFAULT_JAR_ID, '1970-01-02' as LocalDate);
    // First tick: payout fires.
    expect(store.getState().pendingStreakCelebration).not.toBeNull();
    store.getState().actions.acknowledgeStreakMilestone();
    // Re-tick same date: streak slice returns incremented:false; no second payout.
    const handBefore = store.getState().hands[DEFAULT_JAR_ID]!.length;
    store.getState().actions.tickDailyStreak(DEFAULT_JAR_ID, '1970-01-02' as LocalDate);
    expect(store.getState().pendingStreakCelebration).toBeNull();
    expect(store.getState().hands[DEFAULT_JAR_ID]!.length).toBe(handBefore);
  });
});
