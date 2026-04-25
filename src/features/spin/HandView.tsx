/**
 * HandView — visual pile of clips grouped by color + gold (Wave 3, 3E).
 *
 * Tap a color group to show the sub-stack underneath (the individual clip
 * chips for that color, so the user can see "I have 7 red"). Mobile-first:
 * thumb-reachable grid of color groups; the "expanded" sub-stack fans out
 * below the tapped group.
 *
 * Decoupled from CashInPicker: this view is purely visual. CashInPicker
 * owns selection state. On /spin we render HandView ABOVE the picker so
 * the user can see what's in hand while they tap to cash in.
 *
 * Data source: `useAppStore` + `selectHand(jarId)` from 3A.
 */

import { useMemo, useState, type ReactElement } from 'react';

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

export function HandView({ jarId, className }: HandViewProps): ReactElement {
  const hand = useAppStore((s) => selectHand(s, jarId));
  const groups = useMemo(() => groupHandByColor(hand), [hand]);
  const [expanded, setExpanded] = useState<GroupKey | null>(null);

  const total = hand.length;
  const colorGroups: GroupKey[] = [...DEFAULT_CLIP_COLORS, 'gold' as const];
  // Only show groups with at least one clip — keeps mobile grid tight.
  const visibleGroups = colorGroups.filter((k) => groups[k].length > 0);

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

      {total === 0 ? (
        <p className="hand-view__empty">
          No clips yet. Log a habit to earn one.
        </p>
      ) : (
        <>
          <ul
            className="hand-view__groups"
            role="list"
            aria-label="Clip groups by color"
          >
            {visibleGroups.map((key) => {
              const count = groups[key].length;
              const isExpanded = expanded === key;
              const isGold = key === 'gold';
              return (
                <li key={key} className="hand-view__group-item">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`hand-view-substack-${jarId}-${key}`}
                    onClick={() =>
                      setExpanded((prev) => (prev === key ? null : key))
                    }
                    className={cn(
                      'hand-view__group',
                      isGold && 'hand-view__group--gold',
                      isExpanded && 'hand-view__group--expanded',
                    )}
                    data-color={key}
                    data-testid={`hand-view__group-${key}`}
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

          {expanded !== null && groups[expanded].length > 0 ? (
            <div
              id={`hand-view-substack-${jarId}-${expanded}`}
              className="hand-view__substack"
              role="region"
              aria-label={`${expanded} clips in hand`}
              data-testid="hand-view__substack"
              data-color={expanded}
            >
              {groups[expanded].map((clip) => (
                <span
                  key={clip.id}
                  className="hand-view__substack-item"
                  aria-hidden="true"
                >
                  {expanded === 'gold' ? (
                    <GoldChip size={20} />
                  ) : (
                    <Chip color={CLIP_HEX[expanded as ClipColor]} size={20} />
                  )}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export default HandView;
