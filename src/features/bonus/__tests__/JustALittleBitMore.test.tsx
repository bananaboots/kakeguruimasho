// JustALittleBitMore tests (3H). A18 copy + delta math.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { JustALittleBitMore } from '../JustALittleBitMore.tsx';
import { discountTarget, unitWord } from '../JustALittleBitMore.util.ts';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
  setStoreRng,
} from '../../../state/store.ts';
import { seedInitialAppState, DEFAULT_HABIT_IDS } from '../../../data/defaults.ts';
import { seededRng } from '../../../test/seeded-rng.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';
import type { BonusTimer } from '../../../types/bonus.ts';
import type { Habit } from '../../../types/habit.ts';

function spawnTimer(percent: 25 | 50 | 75): BonusTimer {
  const store = getAppStore();
  if (percent === 75) {
    store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_75',
      percent: 75,
    });
  } else if (percent === 50) {
    store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_50',
      percent: 50,
    });
  } else {
    store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_25',
      percent: 25,
    });
  }
  const timers = store.getState().bonusTimerState[DEFAULT_JAR_ID]!.timers;
  return timers[timers.length - 1]!;
}

function getHabit(id: Habit['id']): Habit {
  return getAppStore().getState().habits.find((h) => h.id === id)!;
}

describe('discountTarget', () => {
  it('computes ceil(target × percent / 100)', () => {
    const walk = { unit: { kind: 'count', target: 2500, unit: 'steps' } } as Habit;
    expect(discountTarget(walk, 75)).toBe(1875);
    expect(discountTarget(walk, 50)).toBe(1250);
    expect(discountTarget(walk, 25)).toBe(625);

    const workout = { unit: { kind: 'sets', target: 4 } } as Habit;
    // 4 × 25% = 1
    expect(discountTarget(workout, 25)).toBe(1);
    // 4 × 75% = 3
    expect(discountTarget(workout, 75)).toBe(3);
  });

  it('returns 0 for a bundle habit (A4 guard)', () => {
    const bundle = {
      unit: { kind: 'bundle', subItems: [], cutoffLocal: '01:00' },
    } as unknown as Habit;
    expect(discountTarget(bundle, 50)).toBe(0);
  });
});

describe('unitWord', () => {
  it('returns the stored unit for count habits', () => {
    const walk = { unit: { kind: 'count', target: 2500, unit: 'steps' } } as Habit;
    expect(unitWord(walk)).toBe('steps');
  });
  it('maps minutes habits to "min"', () => {
    const work = { unit: { kind: 'minutes', target: 30 } } as Habit;
    expect(unitWord(work)).toBe('min');
  });
  it('maps sets habits to "sets"', () => {
    const workout = { unit: { kind: 'sets', target: 4 } } as Habit;
    expect(unitWord(workout)).toBe('sets');
  });
});

describe('JustALittleBitMore copy (A18)', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders the A18 delta framing when the habit was recently completed', () => {
    // Simulate a "just did 15 burpees" history event on the Workout habit.
    // Workout unit is 4 sets → 50% = 2. Using unitsCompleted=15 puts us in
    // the A18 flavor, even though sets ≠ burpees — the test is structural.
    const workoutId = DEFAULT_HABIT_IDS.workout;
    getAppStore().getState().actions.appendHistory({
      kind: 'habit_completed',
      jarId: DEFAULT_JAR_ID,
      habitId: workoutId,
      unitsCompleted: 15,
      clipsEarned: 15,
    });
    const timer = spawnTimer(50);
    render(<JustALittleBitMore timer={timer} habit={getHabit(workoutId)} />);
    // 4 × 50% = 2. Copy = "2 more sets — you just did 15"
    expect(screen.getByText(/2 more sets/i)).toBeInTheDocument();
    expect(screen.getByText(/you just did 15/i)).toBeInTheDocument();
  });

  it('falls back to "Do {delta} {unit}" with no prior completion', () => {
    const workoutId = DEFAULT_HABIT_IDS.workout;
    const timer = spawnTimer(50);
    render(<JustALittleBitMore timer={timer} habit={getHabit(workoutId)} />);
    // History is empty for this habit — expect fallback.
    expect(screen.getByText(/^Do 2 sets$/i)).toBeInTheDocument();
  });

  it('"I did it" fires completeBonusTimer with the picked habit', () => {
    const workoutId = DEFAULT_HABIT_IDS.workout;
    const timer = spawnTimer(75);
    render(<JustALittleBitMore timer={timer} habit={getHabit(workoutId)} />);

    fireEvent.click(screen.getByTestId('bonus-complete-button'));

    const after = getAppStore().getState();
    const stored = after.bonusTimerState[DEFAULT_JAR_ID]!.timers.find(
      (t) => t.id === timer.id,
    )!;
    expect(stored.status).toBe('completed');
    expect(stored.originHabitId).toBe(workoutId);
  });
});
