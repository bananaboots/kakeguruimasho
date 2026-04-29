// Phase 4 — new action surface tests.
//
// Covers the actions added to the store in Phase 4 integration:
// addHabit / updateHabit / archiveHabit, the hygiene suite
// (check/uncheck/reset/markAwarded), setBonusTimerOrigin, updateSettings,
// updateWheelConfig, setFirstRunCompleted, queueExtraBonusSpin.
//
// Each action must (a) mutate state via its slice reducer and (b) emit a
// history event appropriate to the change.

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
  asHabitId,
  asLocalDate,
  asISO,
} from '../../types/ids.ts';
import { newBonusTimerId } from '../../lib/id.ts';
import type { Habit } from '../../types/habit.ts';
import type { BonusTimer } from '../../types/bonus.ts';

describe('store — Phase 4 action surface', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
  });
  afterEach(() => {
    setPersistenceEnabled(true);
  });

  it('addHabit pushes a new habit and logs settings_changed', () => {
    const store = createAppStore(seedInitialAppState());
    const newHabit: Habit = {
      id: asHabitId('test_habit_1'),
      name: 'Stretch',
      unit: { kind: 'minutes', target: 10 },
      createdAt: asISO(new Date().toISOString()),
      archived: false,
    };
    store.getState().actions.addHabit(newHabit);
    const s = store.getState();
    expect(s.habits.map((h) => h.id)).toContain(asHabitId('test_habit_1'));
    const last = s.history.at(-1);
    expect(last?.kind).toBe('settings_changed');
  });

  it('updateHabit patches the target habit and logs settings_changed', () => {
    const store = createAppStore(seedInitialAppState());
    store.getState().actions.updateHabit(DEFAULT_HABIT_IDS.walk, { name: 'Hike' });
    const s = store.getState();
    const walk = s.habits.find((h) => h.id === DEFAULT_HABIT_IDS.walk);
    expect(walk?.name).toBe('Hike');
    expect(s.history.at(-1)?.kind).toBe('settings_changed');
  });

  it('archiveHabit flips archived=true', () => {
    const store = createAppStore(seedInitialAppState());
    store.getState().actions.archiveHabit(DEFAULT_HABIT_IDS.focusedWork);
    const s = store.getState();
    expect(
      s.habits.find((h) => h.id === DEFAULT_HABIT_IDS.focusedWork)?.archived,
    ).toBe(true);
  });

  it('resetHygieneBundle creates a fresh bundle for the given date', () => {
    const store = createAppStore(seedInitialAppState());
    const today = asLocalDate('2026-04-23');
    store.getState().actions.resetHygieneBundle(DEFAULT_JAR_ID, today);
    const bundle = store.getState().pendingHygieneBundle[DEFAULT_JAR_ID];
    expect(bundle).not.toBeNull();
    expect(bundle!.date).toBe(today);
    expect(bundle!.awarded).toBe(false);
    expect(Object.values(bundle!.subItemsCompleted).every((v) => v === null)).toBe(true);
  });

  it('checkHygieneSubItem writes a timestamp; uncheck clears it', () => {
    const store = createAppStore(seedInitialAppState());
    const today = asLocalDate('2026-04-23');
    store.getState().actions.resetHygieneBundle(DEFAULT_JAR_ID, today);

    const at = asISO('2026-04-23T22:00:00.000Z');
    store.getState().actions.checkHygieneSubItem(DEFAULT_JAR_ID, 'shower', at);
    expect(
      store.getState().pendingHygieneBundle[DEFAULT_JAR_ID]!.subItemsCompleted['shower'],
    ).toBe(at);

    store.getState().actions.uncheckHygieneSubItem(DEFAULT_JAR_ID, 'shower');
    expect(
      store.getState().pendingHygieneBundle[DEFAULT_JAR_ID]!.subItemsCompleted['shower'],
    ).toBeNull();

    // hygiene_subitem_checked logged on check.
    const kinds = store.getState().history.map((e) => e.kind);
    expect(kinds).toContain('hygiene_subitem_checked');
  });

  it('markHygieneAwarded flips awarded=true with timestamp', () => {
    const store = createAppStore(seedInitialAppState());
    const today = asLocalDate('2026-04-23');
    store.getState().actions.resetHygieneBundle(DEFAULT_JAR_ID, today);
    store.getState().actions.markHygieneAwarded(DEFAULT_JAR_ID, asISO('2026-04-23T23:00:00.000Z'));
    const bundle = store.getState().pendingHygieneBundle[DEFAULT_JAR_ID];
    expect(bundle?.awarded).toBe(true);
    expect(bundle?.awardedAt).toBe('2026-04-23T23:00:00.000Z');
  });

  it('setBonusTimerOrigin sets originHabitId on the target timer', () => {
    const store = createAppStore(seedInitialAppState());
    const timerId = newBonusTimerId();
    const timer: BonusTimer = {
      id: timerId,
      jarId: DEFAULT_JAR_ID,
      spawnedAt: asISO('2026-04-23T10:00:00.000Z'),
      endTimestamp: asISO('2026-04-23T10:10:00.000Z'),
      segment: 'PCT_50',
      percent: 50,
      originHabitId: null,
      status: 'active',
    };
    // Seed the timer directly via commit for this unit test.
    const prev = store.getState();
    const bs = prev.bonusTimerState[DEFAULT_JAR_ID]!;
    store.setState(
      {
        ...prev,
        bonusTimerState: {
          ...prev.bonusTimerState,
          [DEFAULT_JAR_ID]: { ...bs, timers: [timer] },
        },
        actions: prev.actions,
      },
      false,
    );

    store
      .getState()
      .actions.setBonusTimerOrigin(DEFAULT_JAR_ID, timerId, DEFAULT_HABIT_IDS.walk);

    const t = store.getState().bonusTimerState[DEFAULT_JAR_ID]!.timers.find(
      (x) => x.id === timerId,
    );
    expect(t?.originHabitId).toBe(DEFAULT_HABIT_IDS.walk);
  });

  it('updateSettings merges the patch and logs settings_changed', () => {
    const store = createAppStore(seedInitialAppState());
    store.getState().actions.updateSettings({ personalName: 'Grace' });
    const s = store.getState();
    expect(s.settings.personalName).toBe('Grace');
    expect(s.history.at(-1)?.kind).toBe('settings_changed');
  });

  it('updateWheelConfig patches the jar`s wheel config and logs', () => {
    const store = createAppStore(seedInitialAppState());
    const newWeights = { T1: 0.5, T2: 0.25, T3: 0.15, BONUS: 0.08, JACKPOT: 0.02 };
    store.getState().actions.updateWheelConfig(DEFAULT_JAR_ID, { weights: newWeights });
    const s = store.getState();
    expect(s.wheelConfigs[DEFAULT_JAR_ID]!.weights).toEqual(newWeights);
    expect(s.history.at(-1)?.kind).toBe('settings_changed');
  });

  it('setFirstRunCompleted flips the flag', () => {
    const store = createAppStore(seedInitialAppState());
    expect(store.getState().firstRunCompleted).toBe(false);
    store.getState().actions.setFirstRunCompleted();
    expect(store.getState().firstRunCompleted).toBe(true);
    // Idempotent second call.
    store.getState().actions.setFirstRunCompleted();
    expect(store.getState().firstRunCompleted).toBe(true);
  });

  it('queueExtraBonusSpin increments pendingBonusSpins', () => {
    const store = createAppStore(seedInitialAppState());
    expect(store.getState().bonusTimerState[DEFAULT_JAR_ID]!.pendingBonusSpins).toBe(0);
    store.getState().actions.queueExtraBonusSpin(DEFAULT_JAR_ID);
    store.getState().actions.queueExtraBonusSpin(DEFAULT_JAR_ID);
    expect(store.getState().bonusTimerState[DEFAULT_JAR_ID]!.pendingBonusSpins).toBe(2);
  });
});
