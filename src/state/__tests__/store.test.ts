import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createAppStore,
  setPersistenceEnabled,
  setStoreRng,
} from '../store.ts';
import { seedInitialAppState, DEFAULT_HABIT_IDS } from '../../data/defaults.ts';
import { seededRng } from '../../test/seeded-rng.ts';
import {
  DEFAULT_JAR_ID,
  DEFAULT_JAR_ID as DEFAULT_JAR,
  MINI_MILESTONE_ID,
  MID_MILESTONE_ID,
  MOONSHOT_MILESTONE_ID,
} from '../../types/ids.ts';

describe('store: composite actions', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
  });
  afterEach(() => {
    setPersistenceEnabled(true);
  });

  describe('completeHabit', () => {
    it('earns 1 clip per unit, draws from bag, logs history', () => {
      const store = createAppStore(seedInitialAppState());
      const { clipsEarned, drawnClips } = store
        .getState()
        .actions.completeHabit(DEFAULT_HABIT_IDS.walk, 1);
      expect(clipsEarned).toBe(1);
      expect(drawnClips).toHaveLength(1);
      const s = store.getState();
      expect(s.hands[DEFAULT_JAR]!.length).toBe(1);
      // Jar total increments per clip earned.
      expect(s.jars[DEFAULT_JAR]!.total).toBe(1);
      // History contains at least: clip_earned + habit_completed (streak may also log).
      const kinds = s.history.map((e) => e.kind);
      expect(kinds).toContain('clip_earned');
      expect(kinds).toContain('habit_completed');
    });

    it('Q2: hand is unlimited — 100 earns accumulate without a cap', () => {
      const store = createAppStore(seedInitialAppState());
      store.getState().actions.completeHabit(DEFAULT_HABIT_IDS.walk, 100);
      const s = store.getState();
      expect(s.hands[DEFAULT_JAR]!.length).toBe(100);
    });

    it('auto-refills bag when it empties mid-session', () => {
      const store = createAppStore(seedInitialAppState());
      // Default bag is 61 clips; earning 100 forces a refill.
      store.getState().actions.completeHabit(DEFAULT_HABIT_IDS.walk, 100);
      const s = store.getState();
      // Bag should be non-empty after a refill at ~61 earns; refill adds 61.
      expect(s.bags[DEFAULT_JAR]!.length).toBeGreaterThan(0);
      const refillEvents = s.history.filter((e) => e.kind === 'bag_refilled');
      expect(refillEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('cash-in composite', () => {
    it('T2 when 2 clips of same color cashed in', () => {
      const store = createAppStore(seedInitialAppState());
      setStoreRng(seededRng(7));
      // Earn a bunch to guarantee we hit ≥2 of some color.
      store.getState().actions.completeHabit(DEFAULT_HABIT_IDS.walk, 30);
      const s = store.getState();
      // Pick two clips of the same color from hand.
      const hand = s.hands[DEFAULT_JAR]!;
      const byColor = new Map<string, typeof hand>();
      for (const c of hand) {
        if (c.kind === 'regular') {
          const list = byColor.get(c.color) ?? [];
          list.push(c);
          byColor.set(c.color, list);
        }
      }
      const pair = [...byColor.values()].find((g) => g.length >= 2)!;
      const ids = [pair[0]!.id, pair[1]!.id];
      const result = store.getState().actions.cashInClips(DEFAULT_JAR_ID, ids);
      expect(result.matchKind).toBe('two-match');
      expect(result.unlockedTier).toBe('T2');
    });
  });

  describe('D1 via store: resetJar is the only path that zeros total', () => {
    it('claimMilestone(mini) leaves total untouched; resetJar zeros', () => {
      const initial = seedInitialAppState();
      // Preseed total.
      const withTotal = {
        ...initial,
        jars: {
          ...initial.jars,
          [DEFAULT_JAR]: {
            ...initial.jars[DEFAULT_JAR]!,
            total: 10,
            milestones: {
              [MINI_MILESTONE_ID]: { id: MINI_MILESTONE_ID, label: 'a', target: 5 },
              [MID_MILESTONE_ID]: { id: MID_MILESTONE_ID, label: 'b', target: 50 },
              [MOONSHOT_MILESTONE_ID]: { id: MOONSHOT_MILESTONE_ID, label: 'c', target: 100 },
            },
          },
        },
      };
      const store = createAppStore(withTotal);
      store.getState().actions.claimMilestone(DEFAULT_JAR_ID, MINI_MILESTONE_ID);
      expect(store.getState().jars[DEFAULT_JAR]!.total).toBe(10);
      expect(store.getState().jars[DEFAULT_JAR]!.claimed[MINI_MILESTONE_ID]).not.toBeNull();
      store.getState().actions.resetJar(DEFAULT_JAR_ID);
      expect(store.getState().jars[DEFAULT_JAR]!.total).toBe(0);
      expect(store.getState().jars[DEFAULT_JAR]!.claimed[MINI_MILESTONE_ID]).toBeNull();
    });
  });

  describe('hygiene cutoff default (Q5)', () => {
    it('defaults to "01:00"', () => {
      const store = createAppStore(seedInitialAppState());
      expect(store.getState().settings.hygieneCutoffLocal).toBe('01:00');
    });
  });

  describe('bonus timer lifecycle', () => {
    it('spawn → complete flow updates status', () => {
      const store = createAppStore(seedInitialAppState());
      const id = store
        .getState()
        .actions.spawnBonusTimer(DEFAULT_JAR_ID, { segment: 'PCT_75', percent: 75 });
      let timers = store.getState().bonusTimerState[DEFAULT_JAR]!.timers;
      expect(timers).toHaveLength(1);
      expect(timers[0]!.status).toBe('active');
      store.getState().actions.completeBonusTimer(DEFAULT_JAR_ID, id, DEFAULT_HABIT_IDS.walk);
      timers = store.getState().bonusTimerState[DEFAULT_JAR]!.timers;
      expect(timers[0]!.status).toBe('completed');
    });

    it('spawn → expire flow updates status', () => {
      const store = createAppStore(seedInitialAppState());
      const id = store
        .getState()
        .actions.spawnBonusTimer(DEFAULT_JAR_ID, { segment: 'PCT_50', percent: 50 });
      store.getState().actions.expireBonusTimer(DEFAULT_JAR_ID, id);
      const timers = store.getState().bonusTimerState[DEFAULT_JAR]!.timers;
      expect(timers[0]!.status).toBe('expired');
    });
  });
});
