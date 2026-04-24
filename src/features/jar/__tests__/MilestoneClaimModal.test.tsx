// MilestoneClaimModal tests — D1 behavior.
//
//   - Mini/Mid claim stamps `claimed[id]` but does NOT touch `jar.total`.
//   - Moonshot claim requires two taps: first stamps `claimed.moonshot`,
//     second confirms and calls `resetJar` (zeros total, clears claims).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MilestoneClaimModal } from '../MilestoneClaimModal.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { selectJarTotal } from '../../../state/selectors.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';
import type { AppState } from '../../../types/app-state.ts';

function seedWithMilestonesAndTotal(total: number): void {
  const store = getAppStore();
  const prev = store.getState();
  const jar = prev.jars[DEFAULT_JAR_ID]!;
  const next: AppState = {
    ...(() => {
      const { actions: _a, ...rest } = prev;
      void _a;
      return rest as AppState;
    })(),
    jars: {
      ...prev.jars,
      [DEFAULT_JAR_ID]: {
        ...jar,
        total,
        milestones: {
          mini: { id: 'mini', label: 'Small treat', target: 10 },
          mid: { id: 'mid', label: 'Nice dinner', target: 50 },
          moonshot: { id: 'moonshot', label: 'Hawaii', target: 100 },
        },
      },
    },
  };
  prev.actions.hydrate(next);
}

describe('<MilestoneClaimModal />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('D1: claiming mini does NOT change jar.total', async () => {
    const user = userEvent.setup();
    seedWithMilestonesAndTotal(42);

    const onClose = vi.fn();
    render(
      <MilestoneClaimModal
        jarId={DEFAULT_JAR_ID}
        milestone="mini"
        open={true}
        onClose={onClose}
      />,
    );

    // Pre-condition: no claim stamp, total is 42.
    const before = getAppStore().getState();
    expect(before.jars[DEFAULT_JAR_ID]!.claimed.mini).toBeNull();
    expect(selectJarTotal(before, DEFAULT_JAR_ID)).toBe(42);

    await user.click(screen.getByTestId('milestone-claim-claim'));

    const after = getAppStore().getState();
    expect(after.jars[DEFAULT_JAR_ID]!.claimed.mini).not.toBeNull();
    // D1: total unchanged.
    expect(selectJarTotal(after, DEFAULT_JAR_ID)).toBe(42);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('D1: claiming mid does NOT change jar.total', async () => {
    const user = userEvent.setup();
    seedWithMilestonesAndTotal(75);

    render(
      <MilestoneClaimModal
        jarId={DEFAULT_JAR_ID}
        milestone="mid"
        open={true}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByTestId('milestone-claim-claim'));

    const after = getAppStore().getState();
    expect(after.jars[DEFAULT_JAR_ID]!.claimed.mid).not.toBeNull();
    expect(selectJarTotal(after, DEFAULT_JAR_ID)).toBe(75);
  });

  it('D1: moonshot flow — claim marks claimed.moonshot, then confirm resets jar', async () => {
    const user = userEvent.setup();
    seedWithMilestonesAndTotal(120);
    const onReset = vi.fn();
    const onClose = vi.fn();

    render(
      <MilestoneClaimModal
        jarId={DEFAULT_JAR_ID}
        milestone="moonshot"
        open={true}
        onClose={onClose}
        onMoonshotReset={onReset}
      />,
    );

    // Step 1: first tap stamps claimed.moonshot but does NOT reset.
    await user.click(screen.getByTestId('milestone-claim-claim'));
    const afterClaim = getAppStore().getState();
    expect(afterClaim.jars[DEFAULT_JAR_ID]!.claimed.moonshot).not.toBeNull();
    expect(selectJarTotal(afterClaim, DEFAULT_JAR_ID)).toBe(120);
    expect(onClose).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();

    // The UI now shows the confirm step.
    expect(screen.getByRole('heading', { name: /reset jar/i })).toBeInTheDocument();

    // Step 2: confirm reset zeros total, clears claims, fires callbacks.
    await user.click(screen.getByTestId('milestone-claim-reset'));
    const afterReset = getAppStore().getState();
    expect(selectJarTotal(afterReset, DEFAULT_JAR_ID)).toBe(0);
    expect(afterReset.jars[DEFAULT_JAR_ID]!.claimed.mini).toBeNull();
    expect(afterReset.jars[DEFAULT_JAR_ID]!.claimed.mid).toBeNull();
    expect(afterReset.jars[DEFAULT_JAR_ID]!.claimed.moonshot).toBeNull();
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('D1: moonshot claim without confirm leaves total intact', async () => {
    const user = userEvent.setup();
    seedWithMilestonesAndTotal(110);

    render(
      <MilestoneClaimModal
        jarId={DEFAULT_JAR_ID}
        milestone="moonshot"
        open={true}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByTestId('milestone-claim-claim'));
    // User abandons before confirming reset.
    const after = getAppStore().getState();
    expect(selectJarTotal(after, DEFAULT_JAR_ID)).toBe(110);
    expect(after.jars[DEFAULT_JAR_ID]!.claimed.moonshot).not.toBeNull();
  });
});
