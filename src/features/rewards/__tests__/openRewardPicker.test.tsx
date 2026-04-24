// openRewardPicker — imperative API tests.
//   - picks resolve with RewardId
//   - dismiss resolves with null (OR-3 forfeit path)
//   - idempotent-safe: calling while open forfeits the prior promise

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  openRewardPicker,
  __resetRewardPickerForTests,
} from '../openRewardPicker.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { applyRewardMutation } from '../reward-actions.ts';
import type { AppState } from '../../../types/app-state.ts';

describe('openRewardPicker', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    __resetRewardPickerForTests();
    cleanup();
    setPersistenceEnabled(true);
  });

  it('resolves with the picked RewardId', async () => {
    const user = userEvent.setup();
    let resolved: unknown = 'UNSET';
    act(() => {
      void openRewardPicker('T1').then((v) => {
        resolved = v;
      });
    });

    // Wait for portal to mount.
    await act(async () => {});
    const firstOption = document.querySelector<HTMLElement>(
      '[role="listbox"] [role="option"]',
    );
    expect(firstOption).not.toBeNull();
    await user.click(firstOption!);

    // Let the promise microtask flush.
    await act(async () => {});
    const firstReward = getAppStore().getState().rewards.T1.find((r) => !r.archived)!;
    expect(resolved).toBe(firstReward.id);
  });

  it('forfeit (Skip) resolves with null', async () => {
    const user = userEvent.setup();
    // Empty T3 so Skip is the only path.
    applyRewardMutation((s: AppState) => ({
      ...s,
      rewards: { ...s.rewards, T3: [] },
    }));

    let resolved: unknown = 'UNSET';
    act(() => {
      void openRewardPicker('T3').then((v) => {
        resolved = v;
      });
    });
    await act(async () => {});

    const skipBtn = Array.from(document.querySelectorAll<HTMLElement>('button')).find(
      (b) => /skip \(forfeit\)/i.test(b.textContent ?? ''),
    );
    expect(skipBtn).not.toBeUndefined();
    await user.click(skipBtn!);

    await act(async () => {});
    expect(resolved).toBeNull();
  });

  it('idempotent-safe: second call forfeits the first (null) before opening', async () => {
    let first: unknown = 'UNSET';
    let second: unknown = 'UNSET';
    act(() => {
      void openRewardPicker('T1').then((v) => {
        first = v;
      });
    });
    await act(async () => {});

    // Open a second picker while the first is still in flight.
    act(() => {
      void openRewardPicker('T2').then((v) => {
        second = v;
      });
    });
    await act(async () => {});

    // The first promise should have resolved as null (forfeit).
    expect(first).toBeNull();
    expect(second).toBe('UNSET');

    // Cleanly close the second one via reset to avoid leaking state.
    __resetRewardPickerForTests();
    await act(async () => {});
    expect(second).toBeNull();
  });
});
