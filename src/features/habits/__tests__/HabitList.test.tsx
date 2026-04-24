// HabitList tests (3D).
// Covers: quick-log earns clip (minutes/sets habits); archived habits are
// filtered out of the list rendered on Home + /habits.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HabitList } from '../HabitList.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
  setStoreRng,
} from '../../../state/store.ts';
import { seedInitialAppState, DEFAULT_HABIT_IDS } from '../../../data/defaults.ts';
import { seededRng } from '../../../test/seeded-rng.ts';
import { archiveHabit } from '../../../state/slices/habits.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';

describe('HabitList', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders the 5 default habits', () => {
    render(<HabitList />);
    expect(screen.getByText('Walk')).toBeInTheDocument();
    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Cleaning')).toBeInTheDocument();
    expect(screen.getByText('Focused work')).toBeInTheDocument();
    expect(screen.getByText('Hygiene bundle')).toBeInTheDocument();
  });

  it('hides archived habits', () => {
    const store = getAppStore();
    const prev = store.getState();
    const next = archiveHabit(prev, DEFAULT_HABIT_IDS.cleaning);
    store.setState({ ...next, actions: prev.actions }, false);

    render(<HabitList />);
    expect(screen.queryByText('Cleaning')).toBeNull();
    // Other 4 still present.
    expect(screen.getByText('Walk')).toBeInTheDocument();
  });

  it('quick-log on a minutes-unit habit (Cleaning) earns 1 clip', async () => {
    const user = userEvent.setup();
    render(<HabitList />);

    const logBtn = screen.getByTestId(`quicklog-${DEFAULT_HABIT_IDS.cleaning}`);
    await user.click(logBtn);

    const s = getAppStore().getState();
    expect(s.hands[DEFAULT_JAR_ID]!.length).toBe(1);
    expect(s.jars[DEFAULT_JAR_ID]!.total).toBe(1);
    const kinds = s.history.map((e) => e.kind);
    expect(kinds).toContain('habit_completed');
    expect(kinds).toContain('clip_earned');
  });

  it('quick-log on a sets-unit habit (Workout) earns 1 clip', async () => {
    const user = userEvent.setup();
    render(<HabitList />);

    const logBtn = screen.getByTestId(`quicklog-${DEFAULT_HABIT_IDS.workout}`);
    await user.click(logBtn);

    const s = getAppStore().getState();
    expect(s.hands[DEFAULT_JAR_ID]!.length).toBe(1);
  });
});
