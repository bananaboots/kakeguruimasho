// HygieneBundle tests (3D).
// A5: all 4 subitems done before cutoff → award immediately.
// Past-cutoff: checkboxes locked.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { HygieneBundle } from '../HygieneBundle.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
  setStoreRng,
} from '../../../state/store.ts';
import { seedInitialAppState, DEFAULT_HABIT_IDS } from '../../../data/defaults.ts';
import { seededRng } from '../../../test/seeded-rng.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';
import type { Habit } from '../../../types/habit.ts';

function hygieneHabit(): Habit {
  return getAppStore()
    .getState()
    .habits.find((h) => h.id === DEFAULT_HABIT_IDS.hygiene)!;
}

describe('HygieneBundle', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
    vi.useRealTimers();
  });

  it('awards a clip immediately when all 4 subitems are checked before cutoff', () => {
    // Pin time to 22:30 local — the hygiene-day window is open.
    vi.useFakeTimers();
    const now = new Date();
    now.setHours(22, 30, 0, 0);
    vi.setSystemTime(now);

    render(<HygieneBundle habit={hygieneHabit()} />);

    // 4 default subItems.
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(4);

    for (const box of boxes) {
      fireEvent.click(box);
    }

    const s = getAppStore().getState();
    // 1 clip earned.
    expect(s.hands[DEFAULT_JAR_ID]!.length).toBe(1);
    expect(s.jars[DEFAULT_JAR_ID]!.total).toBe(1);
    // Bundle flipped awarded.
    const bundle = s.pendingHygieneBundle[DEFAULT_JAR_ID]!;
    expect(bundle.awarded).toBe(true);
  });

  it('shows a countdown to the cutoff while the hygiene-day window is open', () => {
    vi.useFakeTimers();
    const now = new Date();
    // 22:46 local — cutoff is 01:00 next morning, so 2h 14m left.
    now.setHours(22, 46, 0, 0);
    vi.setSystemTime(now);

    render(<HygieneBundle habit={hygieneHabit()} />);
    // "Bed by 01:00 — 2h 14m left" (allow whitespace variance).
    const heading = screen.getByText(/bed by 01:00/i);
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/\d+h? ?\d*m left/i);

    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    for (const box of boxes) {
      expect(box).not.toBeDisabled();
    }
  });

  it('checking only 3 of 4 subitems does NOT award', () => {
    vi.useFakeTimers();
    const now = new Date();
    now.setHours(22, 0, 0, 0);
    vi.setSystemTime(now);

    render(<HygieneBundle habit={hygieneHabit()} />);

    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // Only check the first 3.
    for (let i = 0; i < 3; i++) {
      fireEvent.click(boxes[i]!);
    }

    const s = getAppStore().getState();
    expect(s.hands[DEFAULT_JAR_ID]!.length).toBe(0);
    const bundle = s.pendingHygieneBundle[DEFAULT_JAR_ID]!;
    expect(bundle.awarded).toBe(false);
  });
});
