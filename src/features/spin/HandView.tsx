/**
 * HandView — visual pile of clips grouped by color + gold (Wave 3, 3E).
 *
 * In the spin flow, tap a color group to set it as the staked color.
 * The number of chips that actually get cashed in is decided by the
 * tier toggle that lives next to "Pull the Lever" — this view only
 * tracks WHICH color is staked, not how many. Tapping the staked
 * color again clears the selection (back to no-stake / T1-only).
 *
 * Without `selectedColor`/`onColorChange` (e.g. read-only contexts) the
 * groups stay informational and clicks no-op.
 */

import { useMemo, type ReactElement } from 'react';

import { useAppStore } from '../../state/store.ts';
import { selectHand } from '../../state/selectors.ts';
import type { Clip, ClipColor } from '../../types/clip.ts';
import type { JarId } from '../../types/ids.ts';
import { DEFAULT_CLIP_COLORS } from '../../types/clip.ts';
import { Chip, GoldChip } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from './clip-colors.ts';

import './spin.css';

export type HandViewProps = {
  jarId: JarId;
  className?: string;
  /** Currently-staked color (`null` = no color picked, T1 spin). */
  selectedColor?: ClipColor | null;
  /** Called when the user taps a color group to stake/unstake. */
  onColorChange?: (next: ClipColor | null) => void;
  /** A9 freeze: disable clicks while a spin is in flight. */
  disabled?: boolean;
};

type GroupKey = ClipColor | 'gold';

function groupHandByColor(hand: Clip[]): Record<GroupKey, Clip[]> {
  const out: Record<GroupKey, Clip[]> = {
    red: [],
    blue: [],
    green: [],
    yellow: [],
    purple: [],
    pink: [],
    gold: [],
  };
  for (const c of hand) {
    if (c.kind === 'gold') out.gold.push(c);
    else out[c.color].push(c);
  }
  return out;
}

export function HandView({
  jarId,
  className,
  selectedColor = null,
  onColorChange,
  disabled = false,
}: HandViewProps): ReactElement {
  const hand = useAppStore((s) => selectHand(s, jarId));
  const groups = useMemo(() => groupHandByColor(hand), [hand]);

  const total = hand.length;
  const colorGroups: GroupKey[] = [...DEFAULT_CLIP_COLORS, 'gold' as const];
  // Only show groups with at least one clip — keeps mobile grid tight.
  const visibleGroups = colorGroups.filter((k) => groups[k].length > 0);

  const interactive = onColorChange !== undefined;

  const handleColorClick = (key: GroupKey): void => {
    if (!onColorChange || disabled) return;
    if (key === 'gold') return; // gold is a separate flow.
    const color = key;
    onColorChange(selectedColor === color ? null : color);
  };

  return (
    <section
      className={cn('hand-view', className)}
      aria-labelledby={`hand-view-title-${jarId}`}
      data-testid="hand-view"
    >
      <header className="hand-view__header">
        <h3 id={`hand-view-title-${jarId}`} className="hand-view__title">
          Hand
        </h3>
        <span
          className="hand-view__total"
          aria-label={`${total} clips in hand`}
          data-testid="hand-view__total"
        >
          {total} <span className="hand-view__total-label">clips</span>
        </span>
      </header>

      {interactive ? (
        <p className="hand-view__hint" aria-live="polite">
          {selectedColor
            ? `Staking ${selectedColor} — choose a tier below.`
            : 'Tap a color to stake; pick a tier below to set the rep.'}
        </p>
      ) : null}

      {total === 0 ? (
        <p className="hand-view__empty">
          No clips yet. Log a habit to earn one.
        </p>
      ) : (
        <ul
          className="hand-view__groups"
          role="list"
          aria-label="Clip groups by color"
        >
          {visibleGroups.map((key) => {
            const count = groups[key].length;
            const isGold = key === 'gold';
            const isStaked = !isGold && key === selectedColor;
            const stakable = !isGold && count >= 1;
            const ariaLabel = isGold
              ? `${count} gold clip${count === 1 ? '' : 's'}`
              : interactive
                ? isStaked
                  ? `${key}: ${count} clip${count === 1 ? '' : 's'} — staked, tap to unstake`
                  : `${key}: ${count} clip${count === 1 ? '' : 's'}, tap to stake`
                : `${key}: ${count} clip${count === 1 ? '' : 's'}`;
            return (
              <li key={key} className="hand-view__group-item">
                <button
                  type="button"
                  onClick={() => handleColorClick(key)}
                  disabled={!interactive || disabled || !stakable}
                  className={cn(
                    'hand-view__group',
                    isGold && 'hand-view__group--gold',
                    isStaked && 'hand-view__group--staked',
                  )}
                  data-color={key}
                  data-staked={isStaked ? '1' : '0'}
                  data-testid={`hand-view__group-${key}`}
                  aria-label={ariaLabel}
                  aria-pressed={interactive ? isStaked : undefined}
                >
                  {isGold ? (
                    <GoldChip size={28} ariaLabel="Gold clip" />
                  ) : (
                    <Chip
                      color={CLIP_HEX[key as ClipColor]}
                      size={28}
                      ariaLabel={`${key} clip`}
                    />
                  )}
                  <span className="hand-view__count">{count}</span>
                  <span className="hand-view__label">{key}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export default HandView;
