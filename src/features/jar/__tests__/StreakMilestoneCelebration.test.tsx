/**
 * StreakMilestoneCelebration mount/dismiss test.
 *
 * Renders null when there's no pending celebration; renders the modal
 * with the streak value + chip counts when one is set; firing the
 * acknowledge action clears the modal.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { StreakMilestoneCelebration } from '../StreakMilestoneCelebration.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';

describe('<StreakMilestoneCelebration />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders null when there is no pending celebration', () => {
    const { container } = render(<StreakMilestoneCelebration />);
    // Nothing portaled to body either.
    expect(container.querySelector('.streak-celebration')).toBeNull();
    expect(document.body.querySelector('.streak-celebration')).toBeNull();
  });

  it('renders the celebration when pending; clicking Claim clears it', () => {
    // Manually seed a pending celebration into the store. (Real path is
    // tickDailyStreak; we shortcut here for component-level coverage.)
    const store = getAppStore();
    store.setState((s) => ({
      ...s,
      pendingStreakCelebration: {
        jarId: DEFAULT_JAR_ID,
        streakValue: 100,
        tier: 'century',
        regularChips: 10,
        goldChips: 1,
      },
    }));

    render(<StreakMilestoneCelebration />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('DAYS')).toBeInTheDocument();
    expect(screen.getByText(/10 clips and 1 gold/i)).toBeInTheDocument();

    const claim = screen.getByRole('button', { name: /claim & continue/i });
    fireEvent.click(claim);

    expect(getAppStore().getState().pendingStreakCelebration).toBeNull();
  });

  it('shows the JACKPOT overstamp on millennium tier', () => {
    const store = getAppStore();
    store.setState((s) => ({
      ...s,
      pendingStreakCelebration: {
        jarId: DEFAULT_JAR_ID,
        streakValue: 1000,
        tier: 'millennium',
        regularChips: 25,
        goldChips: 10,
      },
    }));

    render(<StreakMilestoneCelebration />);
    expect(screen.getByText('JACKPOT')).toBeInTheDocument();
    expect(screen.getByText(/25 clips and 10 gold/i)).toBeInTheDocument();
  });
});
