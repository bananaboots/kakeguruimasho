/**
 * CashInPicker — select 0 or 2 or 3 of the same color from the hand (Wave 3, 3E).
 *
 * Rules (spec §5.5, A7):
 *   - "Nothing" → T1-only
 *   - 2 same-color → T1+T2
 *   - 3 same-color → T1+T2+T3
 *   - 1 gold → handled SEPARATELY by <GoldInstantT3Button>; this picker does
 *     NOT let the user combine gold with regular clips.
 *
 * UX:
 *   - Picker shows one tappable row per color present in the hand with at
 *     least 2 clips. If a color only has 1 clip, it's shown disabled (cannot
 *     unlock anything by itself).
 *   - Each color row has "+2" and "+3" buttons (the latter disabled if the
 *     user doesn't have ≥ 3 of that color).
 *   - Invalid combinations (e.g. 2 red + 1 blue) are prevented by the
 *     radio-style selection model: tapping a different color's "+2/+3"
 *     replaces the current selection.
 *   - Gold is excluded from this view entirely — the "Use gold (instant T3)"
 *     button is a sibling component.
 *   - A "Skip" button sets the selection to empty (T1-only).
 *
 * Disabled when the parent tells us (A9 — A9-freeze during spinning).
 */

import { useMemo, type ReactElement } from 'react';

import type { Clip, ClipColor } from '../../types/clip.ts';
import type { ClipId } from '../../types/ids.ts';
import type { CashInMatchKind, SpinSelection } from './spin.machine.ts';
import type { Tier } from '../../types/wheel.ts';

import { Chip } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from './clip-colors.ts';

import './spin.css';

export type CashInPickerProps = {
  /** The user's current hand (regular + gold clips). Gold is not selectable here. */
  hand: Clip[];
  /** Current selection; the picker is a controlled component. */
  selection: SpinSelection;
  /** Called with a new selection whenever the user changes their pick. */
  onChange: (next: SpinSelection) => void;
  /** When true (A9-frozen), all interactions are disabled. */
  disabled?: boolean;
  className?: string;
};

type ColorCounts = Record<ClipColor, Clip[]>;

const ALL_COLORS: ClipColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
];

function groupRegular(hand: Clip[]): ColorCounts {
  const g: ColorCounts = {
    red: [],
    blue: [],
    green: [],
    yellow: [],
    purple: [],
    pink: [],
  };
  for (const c of hand) {
    if (c.kind === 'regular') g[c.color].push(c);
  }
  return g;
}

function classifyLocal(matchKind: CashInMatchKind): Tier {
  if (matchKind === 'three-match' || matchKind === 'gold-instant-T3') return 'T3';
  if (matchKind === 'two-match') return 'T2';
  return 'T1';
}

/**
 * Build a new selection from a pick of `n` clips of `color`. Picks the
 * first `n` clips of that color from the hand (ordering is stable, so
 * repeated picks of the same size don't thrash the selection set).
 */
function buildSelection(
  groups: ColorCounts,
  color: ClipColor,
  n: 2 | 3,
): SpinSelection {
  const picks = groups[color].slice(0, n);
  const ids: ClipId[] = picks.map((c) => c.id);
  const matchKind: CashInMatchKind = n === 3 ? 'three-match' : 'two-match';
  return {
    selectedIds: ids,
    matchKind,
    unlockedTier: classifyLocal(matchKind),
  };
}

function emptySelection(): SpinSelection {
  return {
    selectedIds: [],
    matchKind: 'none',
    unlockedTier: 'T1',
  };
}

// Summarize the selection grouped by color for the "selected count" display.
function selectionSummary(
  selection: SpinSelection,
  groups: ColorCounts,
): { color: ClipColor; count: number } | null {
  if (selection.selectedIds.length === 0) return null;
  for (const color of ALL_COLORS) {
    const ids = new Set(groups[color].map((c) => c.id));
    const selectedOfColor = selection.selectedIds.filter((id) => ids.has(id));
    if (selectedOfColor.length > 0) {
      return { color, count: selectedOfColor.length };
    }
  }
  return null;
}

export function CashInPicker({
  hand,
  selection,
  onChange,
  disabled = false,
  className,
}: CashInPickerProps): ReactElement {
  const groups = useMemo(() => groupRegular(hand), [hand]);
  const summary = useMemo(() => selectionSummary(selection, groups), [selection, groups]);

  const selectedColor = summary?.color ?? null;

  const handlePick = (color: ClipColor, n: 2 | 3): void => {
    if (disabled) return;
    // Re-tapping the same picked combo clears the selection (toggle off).
    if (
      selectedColor === color &&
      selection.selectedIds.length === n &&
      selection.matchKind === (n === 3 ? 'three-match' : 'two-match')
    ) {
      onChange(emptySelection());
      return;
    }
    onChange(buildSelection(groups, color, n));
  };

  const handleSkip = (): void => {
    if (disabled) return;
    onChange(emptySelection());
  };

  return (
    <section
      className={cn('cash-in-picker', className)}
      aria-labelledby="cash-in-picker-title"
      aria-disabled={disabled || undefined}
      data-testid="cash-in-picker"
    >
      <header className="cash-in-picker__header">
        <h3 id="cash-in-picker-title" className="cash-in-picker__title">
          Cash in
        </h3>
        <p className="cash-in-picker__subtitle">
          Match 2 for T2, 3 for T3. Skip to keep it T1-only.
        </p>
      </header>

      <ul className="cash-in-picker__rows" role="list">
        {ALL_COLORS.map((color) => {
          const count = groups[color].length;
          if (count === 0) return null;
          const canTwo = count >= 2;
          const canThree = count >= 3;
          const isSelectedTwo =
            selectedColor === color &&
            selection.matchKind === 'two-match' &&
            selection.selectedIds.length === 2;
          const isSelectedThree =
            selectedColor === color &&
            selection.matchKind === 'three-match' &&
            selection.selectedIds.length === 3;
          return (
            <li
              key={color}
              className="cash-in-picker__row"
              data-color={color}
            >
              <Chip color={CLIP_HEX[color]} size={24} ariaLabel={`${color} clip`} />
              <span className="cash-in-picker__color-label">
                <span className="cash-in-picker__color-name">{color}</span>
                <span className="cash-in-picker__color-count">({count})</span>
              </span>
              <div className="cash-in-picker__actions">
                <button
                  type="button"
                  disabled={!canTwo || disabled}
                  aria-pressed={isSelectedTwo}
                  aria-label={`Cash in 2 ${color}`}
                  className={cn(
                    'cash-in-picker__pick',
                    isSelectedTwo && 'cash-in-picker__pick--active',
                  )}
                  onClick={() => handlePick(color, 2)}
                  data-testid={`cash-in-pick-${color}-2`}
                >
                  +2
                </button>
                <button
                  type="button"
                  disabled={!canThree || disabled}
                  aria-pressed={isSelectedThree}
                  aria-label={`Cash in 3 ${color}`}
                  className={cn(
                    'cash-in-picker__pick',
                    isSelectedThree && 'cash-in-picker__pick--active',
                  )}
                  onClick={() => handlePick(color, 3)}
                  data-testid={`cash-in-pick-${color}-3`}
                >
                  +3
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="cash-in-picker__footer">
        <button
          type="button"
          onClick={handleSkip}
          disabled={disabled}
          className="cash-in-picker__skip"
          aria-pressed={selection.matchKind === 'none'}
          data-testid="cash-in-picker__skip"
        >
          Skip (T1-only)
        </button>
        <span
          className="cash-in-picker__status"
          aria-live="polite"
          data-testid="cash-in-picker__status"
        >
          {selection.matchKind === 'none'
            ? 'No match selected — T1 only'
            : `Unlocks up to ${selection.unlockedTier} (${selection.selectedIds.length} ${selectedColor ?? ''})`}
        </span>
      </footer>
    </section>
  );
}

function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export default CashInPicker;
