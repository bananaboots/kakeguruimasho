// StreakDisplay tests — current/longest rendering + live state updates.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { StreakDisplay } from '../StreakDisplay.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';
import { todayLocal } from '../../../lib/time.ts';

describe('<StreakDisplay />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders the streak chips with initial zero values', () => {
    render(<StreakDisplay jarId={DEFAULT_JAR_ID} />);
    expect(screen.getByTestId('streak-chip-daily')).toBeInTheDocument();
    expect(screen.getByTestId('streak-chip-bonus-chain')).toBeInTheDocument();
    // Self-care streak chip removed 2026-04-26 as redundant with the daily streak.
    expect(screen.queryByTestId('streak-chip-hygiene')).not.toBeInTheDocument();
  });

  it('re-renders when the store updates the streak', () => {
    const { rerender } = render(<StreakDisplay jarId={DEFAULT_JAR_ID} />);
    const daily = screen.getByTestId('streak-chip-daily');
    expect(daily.textContent).toContain('0');

    // Tick daily streak.
    const { actions } = getAppStore().getState();
    actions.tickDailyStreak(DEFAULT_JAR_ID, todayLocal());

    rerender(<StreakDisplay jarId={DEFAULT_JAR_ID} />);
    const after = screen.getByTestId('streak-chip-daily');
    expect(after.textContent).toContain('1');
    // Once complete today, the chip should pick up the active-today class.
    expect(after.className).toContain('streak-chip--active-today');
  });
});
