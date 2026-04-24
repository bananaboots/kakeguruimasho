/**
 * <CashInPicker /> — RTL coverage for matching detection + disabled states
 * (Wave 3, 3E).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CashInPicker } from '../CashInPicker.tsx';
import type { SpinSelection } from '../spin.machine.ts';
import type { Clip, ClipColor } from '../../../types/clip.ts';
import type { ClipId, JarId } from '../../../types/ids.ts';
import { asClipId, DEFAULT_JAR_ID } from '../../../types/ids.ts';

function mkClip(id: string, color: ClipColor, jarId: JarId = DEFAULT_JAR_ID): Clip {
  return {
    id: asClipId(id),
    jarId,
    kind: 'regular',
    color,
  };
}

function mkGold(id: string, jarId: JarId = DEFAULT_JAR_ID): Clip {
  return { id: asClipId(id), jarId, kind: 'gold' };
}

function emptySelection(): SpinSelection {
  return { selectedIds: [] as ReadonlyArray<ClipId>, matchKind: 'none', unlockedTier: 'T1' };
}

describe('<CashInPicker />', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders one row per color present in hand (skips colors with 0)', () => {
    const hand: Clip[] = [
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      mkClip('b1', 'blue'),
    ];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={() => {}} />,
    );
    expect(screen.getByTestId('cash-in-pick-red-2')).toBeInTheDocument();
    expect(screen.getByTestId('cash-in-pick-blue-2')).toBeInTheDocument();
    // green has 0 clips → row hidden
    expect(screen.queryByTestId('cash-in-pick-green-2')).not.toBeInTheDocument();
  });

  it('grays out +2 when user has 1, and +3 when user has 2', () => {
    const hand: Clip[] = [
      mkClip('b1', 'blue'),
      // only 1 blue
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      // 2 red, not 3
    ];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={() => {}} />,
    );
    expect(screen.getByTestId('cash-in-pick-blue-2')).toBeDisabled();
    expect(screen.getByTestId('cash-in-pick-blue-3')).toBeDisabled();
    expect(screen.getByTestId('cash-in-pick-red-2')).toBeEnabled();
    expect(screen.getByTestId('cash-in-pick-red-3')).toBeDisabled();
  });

  it('tapping +2 on red calls onChange with a two-match red selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const hand: Clip[] = [
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      mkClip('r3', 'red'),
    ];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={onChange} />,
    );
    await user.click(screen.getByTestId('cash-in-pick-red-2'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next: SpinSelection = onChange.mock.calls[0]![0]!;
    expect(next.matchKind).toBe('two-match');
    expect(next.unlockedTier).toBe('T2');
    expect(next.selectedIds.length).toBe(2);
  });

  it('tapping +3 on red calls onChange with a three-match red selection (T3 unlock)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const hand: Clip[] = [
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      mkClip('r3', 'red'),
    ];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={onChange} />,
    );
    await user.click(screen.getByTestId('cash-in-pick-red-3'));
    const next: SpinSelection = onChange.mock.calls[0]![0]!;
    expect(next.matchKind).toBe('three-match');
    expect(next.unlockedTier).toBe('T3');
    expect(next.selectedIds.length).toBe(3);
  });

  it('tapping a different color REPLACES the selection (no cross-color combos)', async () => {
    const user = userEvent.setup();
    const hand: Clip[] = [
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      mkClip('b1', 'blue'),
      mkClip('b2', 'blue'),
    ];
    const onChange = vi.fn();
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={onChange} />,
    );
    await user.click(screen.getByTestId('cash-in-pick-red-2'));
    await user.click(screen.getByTestId('cash-in-pick-blue-2'));
    expect(onChange).toHaveBeenCalledTimes(2);
    const last: SpinSelection = onChange.mock.calls[1]![0]!;
    expect(last.matchKind).toBe('two-match');
    // The replacement must contain only blue IDs.
    expect(last.selectedIds).toEqual([asClipId('b1'), asClipId('b2')]);
  });

  it('tapping Skip resets the selection to none / T1', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const hand: Clip[] = [mkClip('r1', 'red'), mkClip('r2', 'red')];
    render(
      <CashInPicker
        hand={hand}
        selection={{
          selectedIds: [asClipId('r1'), asClipId('r2')],
          matchKind: 'two-match',
          unlockedTier: 'T2',
        }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByTestId('cash-in-picker__skip'));
    const next: SpinSelection = onChange.mock.calls[0]![0]!;
    expect(next.matchKind).toBe('none');
    expect(next.unlockedTier).toBe('T1');
    expect(next.selectedIds).toHaveLength(0);
  });

  it('gold clips are NOT offered as a cash-in option (A5 / spec §5.5)', () => {
    const hand: Clip[] = [mkGold('g1'), mkClip('r1', 'red'), mkClip('r2', 'red')];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={() => {}} />,
    );
    // There is no gold row/pick button inside the picker.
    expect(screen.queryByTestId('cash-in-pick-gold-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cash-in-pick-gold-3')).not.toBeInTheDocument();
  });

  it('A9 disabled: every pick + the skip button are inert when disabled=true', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const hand: Clip[] = [
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      mkClip('r3', 'red'),
    ];
    render(
      <CashInPicker
        hand={hand}
        selection={emptySelection()}
        onChange={onChange}
        disabled={true}
      />,
    );
    expect(screen.getByTestId('cash-in-picker')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('cash-in-pick-red-2')).toBeDisabled();
    expect(screen.getByTestId('cash-in-pick-red-3')).toBeDisabled();
    expect(screen.getByTestId('cash-in-picker__skip')).toBeDisabled();
    // userEvent respects disabled — no onChange fires.
    await user.click(screen.getByTestId('cash-in-pick-red-2'));
    await user.click(screen.getByTestId('cash-in-picker__skip'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('aria-pressed reflects active selection state', () => {
    const hand: Clip[] = [mkClip('r1', 'red'), mkClip('r2', 'red')];
    render(
      <CashInPicker
        hand={hand}
        selection={{
          selectedIds: [asClipId('r1'), asClipId('r2')],
          matchKind: 'two-match',
          unlockedTier: 'T2',
        }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('cash-in-pick-red-2')).toHaveAttribute('aria-pressed', 'true');
  });

  it('status text describes the current unlock', () => {
    const hand: Clip[] = [mkClip('b1', 'blue'), mkClip('b2', 'blue'), mkClip('b3', 'blue')];
    render(
      <CashInPicker
        hand={hand}
        selection={{
          selectedIds: [asClipId('b1'), asClipId('b2'), asClipId('b3')],
          matchKind: 'three-match',
          unlockedTier: 'T3',
        }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('cash-in-picker__status')).toHaveTextContent(/Unlocks up to T3/);
  });
});
