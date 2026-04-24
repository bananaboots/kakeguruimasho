// <RewardPickerModal /> tests.
//   - Archived rewards are hidden from the picker list.
//   - OR-3 empty-state forfeit flow: when the tier has zero non-archived
//     rewards, the "Skip (forfeit)" button calls onDismiss; "Add reward"
//     opens the editor.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RewardPickerModal } from '../RewardPickerModal.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { applyRewardMutation } from '../reward-actions.ts';
import { archiveReward } from '../../../state/slices/rewards.ts';
import type { AppState } from '../../../types/app-state.ts';

describe('<RewardPickerModal />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('archived rewards are not offered to the user', async () => {
    // Archive one T2 reward.
    const victim = getAppStore().getState().rewards.T2[0]!;
    applyRewardMutation((s: AppState) => archiveReward(s, 'T2', victim.id));

    render(
      <RewardPickerModal tier="T2" open={true} onPick={() => {}} onDismiss={() => {}} />,
    );

    const options = screen.getAllByRole('option');
    expect(options.length).toBe(getAppStore().getState().rewards.T2.length - 1);
    for (const opt of options) {
      expect(opt.textContent).not.toBe(victim.label);
    }
  });

  it('picking an option fires onPick with that rewardId', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <RewardPickerModal tier="T1" open={true} onPick={onPick} onDismiss={() => {}} />,
    );

    const first = screen.getAllByRole('option')[0]!;
    await user.click(first);
    expect(onPick).toHaveBeenCalledTimes(1);
    const firstReward = getAppStore().getState().rewards.T1.find((r) => !r.archived)!;
    expect(onPick).toHaveBeenCalledWith(firstReward.id);
  });

  it('OR-3 empty-state: archived-only tier shows forfeit UI and Skip calls onDismiss', async () => {
    const user = userEvent.setup();
    // Archive every T3 reward.
    applyRewardMutation((s: AppState) => ({
      ...s,
      rewards: {
        ...s.rewards,
        T3: s.rewards.T3.map((r) => ({ ...r, archived: true })),
      },
    }));
    const onDismiss = vi.fn();
    render(
      <RewardPickerModal tier="T3" open={true} onPick={() => {}} onDismiss={onDismiss} />,
    );

    // Empty-state copy matches the brief verbatim.
    expect(
      screen.getByText('No rewards in this tier. Add one now or skip.'),
    ).toBeInTheDocument();
    // No option rows.
    expect(screen.queryAllByRole('option').length).toBe(0);

    // Skip calls onDismiss.
    await user.click(screen.getByRole('button', { name: /skip \(forfeit\)/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('OR-3 empty-state: "Add reward" opens the editor inline', async () => {
    const user = userEvent.setup();
    applyRewardMutation((s: AppState) => ({
      ...s,
      rewards: { ...s.rewards, T3: [] },
    }));
    render(
      <RewardPickerModal tier="T3" open={true} onPick={() => {}} onDismiss={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: /add reward/i }));
    // Editor heading renders.
    expect(await screen.findByText(/add t3 reward/i)).toBeInTheDocument();

    const input = await screen.findByPlaceholderText(/YouTube/i);
    await user.type(input, 'Home theater double feature');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    // After save, the new reward is in state.
    const stored = getAppStore().getState().rewards.T3;
    expect(stored.some((r) => r.label === 'Home theater double feature')).toBe(true);
  });
});
