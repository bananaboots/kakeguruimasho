// BonusTimerBanner tests (3H). A3 concurrency + banner shape.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { BonusTimerBanner } from '../BonusTimerBanner.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
  setStoreRng,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { seededRng } from '../../../test/seeded-rng.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';

describe('BonusTimerBanner', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
    __resetAppStoreForTests(seedInitialAppState());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
    vi.useRealTimers();
  });

  it('renders nothing when no active timers', () => {
    render(
      <MemoryRouter>
        <BonusTimerBanner />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('bonus-banner')).toBeNull();
  });

  it('shows the single active timer with countdown and percent badge', () => {
    getAppStore().getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_50',
      percent: 50,
    });
    render(
      <MemoryRouter>
        <BonusTimerBanner />
      </MemoryRouter>,
    );
    const banner = screen.getByTestId('bonus-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain('50%');
    // Countdown at 10:00 exactly.
    expect(banner.textContent).toMatch(/10:00/);
    // No +N more chip with only one active.
    expect(screen.queryByTestId('bonus-banner-more')).toBeNull();
  });

  it('shows +N more chip when multiple timers are active (A3)', () => {
    const store = getAppStore();
    store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_75',
      percent: 75,
    });
    // Advance 1 second so spawnedAt differs.
    vi.setSystemTime(new Date('2026-04-23T12:00:01Z'));
    store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_50',
      percent: 50,
    });
    vi.setSystemTime(new Date('2026-04-23T12:00:02Z'));
    store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_25',
      percent: 25,
    });

    render(
      <MemoryRouter>
        <BonusTimerBanner />
      </MemoryRouter>,
    );
    const banner = screen.getByTestId('bonus-banner');
    // Oldest-spawned timer is the 75% one.
    expect(banner.textContent).toContain('75%');
    expect(screen.getByTestId('bonus-banner-more').textContent).toMatch(
      /\+2 more/,
    );
  });

  it('aria-label exposes segment + habit prompt for screen readers', () => {
    getAppStore().getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_25',
      percent: 25,
    });
    render(
      <MemoryRouter>
        <BonusTimerBanner />
      </MemoryRouter>,
    );
    const banner = screen.getByTestId('bonus-banner');
    const label = banner.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/25%/);
    expect(label).toMatch(/pick a habit|any habit/i);
  });
});
