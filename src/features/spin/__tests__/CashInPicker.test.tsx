/**
 * <CashInPicker /> — RTL coverage for the Pachinko tier ladder
 * (Wave 3, 3E + Vintage Pachinko design).
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

describe('<CashInPicker /> tier ladder', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders T1, T2, T3 rows regardless of hand contents', () => {
    render(
      <CashInPicker hand={[]} selection={emptySelection()} onChange={() => {}} />,
    );
    expect(screen.getByTestId('cash-in-tier-T1')).toBeInTheDocument();
    expect(screen.getByTestId('cash-in-tier-T2')).toBeInTheDocument();
    expect(screen.getByTestId('cash-in-tier-T3')).toBeInTheDocument();
  });

  it('T1 is always enabled; T2/T3 are disabled when no matching color exists', () => {
    const hand: Clip[] = [mkClip('r1', 'red'), mkClip('b1', 'blue')];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={() => {}} />,
    );
    expect(screen.getByTestId('cash-in-tier-T1')).toBeEnabled();
    expect(screen.getByTestId('cash-in-tier-T2')).toBeDisabled();
    expect(screen.getByTestId('cash-in-tier-T3')).toBeDisabled();
  });

  it('T2 enables when ≥ 2 of any color exist; T3 stays locked at < 3', () => {
    const hand: Clip[] = [mkClip('r1', 'red'), mkClip('r2', 'red'), mkClip('b1', 'blue')];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={() => {}} />,
    );
    expect(screen.getByTestId('cash-in-tier-T2')).toBeEnabled();
    expect(screen.getByTestId('cash-in-tier-T3')).toBeDisabled();
  });

  it('tapping T2 auto-picks 2 of the most-abundant color (alphabetical tiebreak)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const hand: Clip[] = [
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      mkClip('b1', 'blue'),
      mkClip('b2', 'blue'),
    ];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={onChange} />,
    );
    await user.click(screen.getByTestId('cash-in-tier-T2'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next: SpinSelection = onChange.mock.calls[0]![0]!;
    expect(next.matchKind).toBe('two-match');
    expect(next.unlockedTier).toBe('T2');
    // Tied counts → blue wins on alphabetical tiebreak (b < r).
    expect(next.selectedIds).toEqual([asClipId('b1'), asClipId('b2')]);
  });

  it('tapping T3 picks 3 of the most-abundant color; ties broken alphabetically', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const hand: Clip[] = [
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      mkClip('r3', 'red'),
      mkClip('r4', 'red'),
      mkClip('b1', 'blue'),
      mkClip('b2', 'blue'),
      mkClip('b3', 'blue'),
    ];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={onChange} />,
    );
    await user.click(screen.getByTestId('cash-in-tier-T3'));
    const next: SpinSelection = onChange.mock.calls[0]![0]!;
    expect(next.matchKind).toBe('three-match');
    expect(next.unlockedTier).toBe('T3');
    // Red has more, so T3 picks 3 reds.
    expect(next.selectedIds).toEqual([
      asClipId('r1'),
      asClipId('r2'),
      asClipId('r3'),
    ]);
  });

  it('tapping T1 resets the selection to none / T1', async () => {
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
    await user.click(screen.getByTestId('cash-in-tier-T1'));
    const next: SpinSelection = onChange.mock.calls[0]![0]!;
    expect(next.matchKind).toBe('none');
    expect(next.unlockedTier).toBe('T1');
    expect(next.selectedIds).toHaveLength(0);
  });

  it('re-tapping the active tier toggles back to T1', async () => {
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
    await user.click(screen.getByTestId('cash-in-tier-T2'));
    const next: SpinSelection = onChange.mock.calls[0]![0]!;
    expect(next.matchKind).toBe('none');
    expect(next.unlockedTier).toBe('T1');
  });

  it('gold clips are NOT surfaced on the tier ladder (handled by GoldInstantT3Button)', () => {
    const hand: Clip[] = [mkGold('g1'), mkClip('r1', 'red'), mkClip('r2', 'red')];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={() => {}} />,
    );
    // No gold tier row in the ladder.
    expect(screen.queryByTestId('cash-in-tier-Gold')).not.toBeInTheDocument();
    // Gold doesn't unlock T2 unless paired with same-color regulars; only red.
    expect(screen.getByTestId('cash-in-tier-T2')).toBeEnabled();
  });

  it('A9 disabled: every tier row is inert when disabled=true', async () => {
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
    expect(screen.getByTestId('cash-in-tier-T1')).toBeDisabled();
    expect(screen.getByTestId('cash-in-tier-T2')).toBeDisabled();
    expect(screen.getByTestId('cash-in-tier-T3')).toBeDisabled();
    await user.click(screen.getByTestId('cash-in-tier-T2'));
    await user.click(screen.getByTestId('cash-in-tier-T1'));
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
    expect(screen.getByTestId('cash-in-tier-T2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('cash-in-tier-T1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('status text reflects the locked stake', () => {
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
    expect(screen.getByTestId('cash-in-picker__status')).toHaveTextContent(/T3/);
  });

  it('cost copy surfaces the auto-picked color when ready', () => {
    const hand: Clip[] = [
      mkClip('r1', 'red'),
      mkClip('r2', 'red'),
      mkClip('r3', 'red'),
      mkClip('r4', 'red'),
    ];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={() => {}} />,
    );
    expect(screen.getByTestId('cash-in-tier-T2')).toHaveTextContent(/Red/);
    expect(screen.getByTestId('cash-in-tier-T3')).toHaveTextContent(/Red/);
  });

  it("cost copy shows what's needed when not yet matchable", () => {
    const hand: Clip[] = [mkClip('y1', 'yellow')];
    render(
      <CashInPicker hand={hand} selection={emptySelection()} onChange={() => {}} />,
    );
    expect(screen.getByTestId('cash-in-tier-T2')).toHaveTextContent(/need 1 more Yellow/);
    expect(screen.getByTestId('cash-in-tier-T3')).toHaveTextContent(/need 2 more Yellow/);
  });
});
