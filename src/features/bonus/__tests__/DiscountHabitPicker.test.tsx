// DiscountHabitPicker tests (3H). A4: hygiene bundle excluded.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { DiscountHabitPicker } from '../DiscountHabitPicker.tsx';
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

function activeTimer(): BonusTimer {
  const store = getAppStore();
  store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
    segment: 'PCT_50',
    percent: 50,
  });
  const timers = store.getState().bonusTimerState[DEFAULT_JAR_ID]!.timers;
  return timers[timers.length - 1]!;
}

describe('DiscountHabitPicker', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('lists numeric habits (count/minutes/sets) but not the hygiene bundle (A4)', () => {
    const timer = activeTimer();
    render(<DiscountHabitPicker timer={timer} />);
    // 4 numeric habits: Walk (count), Workout (sets), Cleaning (minutes),
    // Focused work (minutes).
    expect(screen.getByText('Walk')).toBeInTheDocument();
    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Cleaning')).toBeInTheDocument();
    expect(screen.getByText('Focused work')).toBeInTheDocument();
    // Self care bundle excluded.
    expect(screen.queryByText('Self care bundle')).toBeNull();
  });

  it('hides archived habits', () => {
    const timer = activeTimer();
    const store = getAppStore();
    const prev = store.getState();
    const habits = prev.habits.map((h) =>
      h.id === DEFAULT_HABIT_IDS.cleaning ? { ...h, archived: true } : h,
    );
    store.setState({ ...prev, habits, actions: prev.actions }, false);

    render(<DiscountHabitPicker timer={timer} />);
    expect(screen.queryByText('Cleaning')).toBeNull();
  });

  it('picking a habit sets originHabitId and swaps to the just-a-little-bit-more UI', () => {
    const timer = activeTimer();
    render(<DiscountHabitPicker timer={timer} />);

    const pick = screen.getByTestId(`discount-pick-${DEFAULT_HABIT_IDS.walk}`);
    fireEvent.click(pick);

    const stored = getAppStore()
      .getState()
      .bonusTimerState[DEFAULT_JAR_ID]!.timers.find((t) => t.id === timer.id)!;
    expect(stored.originHabitId).toBe(DEFAULT_HABIT_IDS.walk);

    // A18 prompt visible.
    expect(screen.getByTestId('just-a-little-bit-more')).toBeInTheDocument();
  });
});
