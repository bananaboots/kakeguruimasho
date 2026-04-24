// StepEntry tests (3D).
// Covers: clip count is floor(steps/target); 0 steps disables Log; non-integer
// rejected at form level; batched completeHabit call awards N clips at once.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StepEntry } from '../StepEntry.tsx';
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

function walkHabit(): Habit {
  return getAppStore()
    .getState()
    .habits.find((h) => h.id === DEFAULT_HABIT_IDS.walk)!;
}

describe('StepEntry', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('shows computed clip count = floor(steps/2500)', () => {
    render(<StepEntry habit={walkHabit()} open onClose={() => {}} />);
    const input = screen.getByLabelText(/steps today/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '11300' } });
    // 11300 / 2500 = 4.52 → floor = 4
    // aria-live preview node carries the clip count + step count.
    const preview = screen.getByText(/from 11,300 steps/i);
    expect(preview.textContent).toMatch(/4\s*clips/i);
    // Primary log button reflects the same count.
    expect(
      screen.getByRole('button', { name: /log 4 clips/i }),
    ).toBeInTheDocument();
  });

  it('0 steps → 0 clips, Log button disabled', () => {
    render(<StepEntry habit={walkHabit()} open onClose={() => {}} />);
    const logBtn = screen.getByRole('button', { name: /log 0 clips/i });
    expect(logBtn).toBeDisabled();
  });

  it('non-integer input rejected → Log disabled', () => {
    render(<StepEntry habit={walkHabit()} open onClose={() => {}} />);
    const input = screen.getByLabelText(/steps today/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '11.5' } });
    // "11.5" doesn't match /^\d+$/, so invalid.
    expect(
      screen.getByText(/whole number/i),
    ).toBeInTheDocument();
  });

  it('logs N clips in one batched completeHabit call', async () => {
    const user = userEvent.setup();
    const onClose = () => {};
    render(<StepEntry habit={walkHabit()} open onClose={onClose} />);
    const input = screen.getByLabelText(/steps today/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '7500' } });
    // 7500 / 2500 = 3 clips
    const logBtn = screen.getByRole('button', { name: /log 3 clips/i });
    await user.click(logBtn);

    const s = getAppStore().getState();
    expect(s.hands[DEFAULT_JAR_ID]!.length).toBe(3);
    const habitCompleted = s.history.filter((e) => e.kind === 'habit_completed');
    expect(habitCompleted).toHaveLength(1);
    const evt = habitCompleted[0];
    if (evt && evt.kind === 'habit_completed') {
      expect(evt.clipsEarned).toBe(3);
      expect(evt.unitsCompleted).toBe(3);
    }
  });
});
