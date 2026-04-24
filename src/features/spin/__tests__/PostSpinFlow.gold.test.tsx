/**
 * Integration test: gold short-circuit (Wave 3, 3E).
 *
 * Asserts that tapping <GoldInstantT3Button> in the full <PostSpinFlow> tree:
 *   1. Does NOT mount <WheelCanvas>.
 *   2. Opens the T3 reward picker (via 3F's openRewardPicker portal).
 *   3. Returns the gold clip to the bag (A7).
 *   4. Logs `reward_claimed { source: 'gold', tier: 'T3' }` when the user
 *      picks a reward (A6).
 *   5. After the pick, the flow returns to idle (A9 frozen released).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PostSpinFlow } from '../PostSpinFlow.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { ToastProvider } from '../../../ui/toast.tsx';
import { __resetRewardPickerForTests } from '../../../features/rewards/openRewardPicker.tsx';
import { DEFAULT_JAR_ID, asClipId, type ClipId } from '../../../types/ids.ts';
import type { AppState } from '../../../types/app-state.ts';
import type { Clip } from '../../../types/clip.ts';

function seedWithGold(): AppState {
  const s = seedInitialAppState();
  const goldClip: Clip = {
    id: asClipId('goldtest') as ClipId,
    jarId: DEFAULT_JAR_ID,
    kind: 'gold',
  };
  return {
    ...s,
    hands: {
      ...s.hands,
      [DEFAULT_JAR_ID]: [goldClip],
    },
  };
}

describe('<PostSpinFlow /> — gold short-circuit', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedWithGold());
  });

  afterEach(() => {
    __resetRewardPickerForTests();
    cleanup();
    setPersistenceEnabled(true);
  });

  it('tapping Use gold: skips the wheel, opens T3 picker, logs source=gold, returns clip', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <PostSpinFlow jarId={DEFAULT_JAR_ID} />
      </ToastProvider>,
    );

    // Sanity: gold button visible; wheel not rendered.
    const goldBtn = screen.getByTestId('gold-instant-t3');
    expect(goldBtn).toBeInTheDocument();
    expect(screen.queryByTestId('spin-flow__wheel')).not.toBeInTheDocument();

    // Tap the gold button.
    await user.click(goldBtn);

    // Reward picker (portal) should open with T3.
    await waitFor(() => {
      const title = document.querySelector('[role="dialog"]');
      expect(title).not.toBeNull();
    });
    // Should not have mounted the main wheel at any point.
    expect(screen.queryByTestId('spin-flow__wheel')).not.toBeInTheDocument();

    // The gold clip should already be returned to the bag (A7).
    await waitFor(() => {
      const s = getAppStore().getState();
      const hand = s.hands[DEFAULT_JAR_ID] ?? [];
      const bag = s.bags[DEFAULT_JAR_ID] ?? [];
      expect(hand.find((c) => c.id === asClipId('goldtest'))).toBeUndefined();
      expect(bag.find((c) => c.id === asClipId('goldtest'))).toBeDefined();
    });

    // Pick the first T3 reward from the portal.
    const firstOption = document.querySelector<HTMLElement>(
      '[role="listbox"] [role="option"]',
    );
    expect(firstOption).not.toBeNull();
    await user.click(firstOption!);

    await act(async () => {});

    // Flow returns to idle: gold button gone (no gold clips left).
    await waitFor(() => {
      expect(screen.queryByTestId('gold-instant-t3')).not.toBeInTheDocument();
    });

    // History must carry a `reward_claimed` with tier=T3 and source=gold.
    const history = getAppStore().getState().history;
    const rewardClaimed = history.filter((e) => e.kind === 'reward_claimed');
    expect(rewardClaimed.length).toBeGreaterThanOrEqual(1);
    const evt = rewardClaimed[rewardClaimed.length - 1]!;
    if (evt.kind === 'reward_claimed') {
      expect(evt.tier).toBe('T3');
      expect(evt.source).toBe('gold');
      expect(evt.rewardId).not.toBeNull();
    }

    // No `main_spin` or `near_miss` events should exist — wheel was skipped.
    const mainSpins = history.filter((e) => e.kind === 'main_spin');
    expect(mainSpins).toHaveLength(0);
    const nearMisses = history.filter((e) => e.kind === 'near_miss');
    expect(nearMisses).toHaveLength(0);
  });

  it('gold button is hidden when hand has no gold clips', () => {
    __resetAppStoreForTests(seedInitialAppState()); // default seed: empty hand
    render(
      <ToastProvider>
        <PostSpinFlow jarId={DEFAULT_JAR_ID} />
      </ToastProvider>,
    );
    expect(screen.queryByTestId('gold-instant-t3')).not.toBeInTheDocument();
  });
});
