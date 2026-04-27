/**
 * CashInPicker — Pachinko tier ladder (Wave 3, 3E + Vintage Pachinko design).
 *
 * Replaces the per-color +2/+3 grid with a 3-row tier ladder (T1 / T2 / T3),
 * matching `pachinko-screens.jsx:539` (PachinkoTierRow). The system auto-picks
 * the user's most-abundant matching color when the user selects T2 or T3 —
 * granular per-color picking is no longer surfaced.
 *
 * Rules (spec §5.5, A7):
 *   - T1 selected → empty selection (T1-only, equivalent to "skip")
 *   - T2 → auto-pick 2 of the most-abundant color with ≥ 2 clips; disabled
 *     otherwise
 *   - T3 → auto-pick 3 of the most-abundant color with ≥ 3 clips; disabled
 *     otherwise
 *   - Gold is handled SEPARATELY by <GoldInstantT3Button>; not surfaced here.
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
  hand: Clip[];
  selection: SpinSelection;
  onChange: (next: SpinSelection) => void;
  disabled?: boolean;
  className?: string;
};

const ALL_COLORS: ClipColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
];

type ColorCounts = Record<ClipColor, Clip[]>;

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

/** Most-abundant color with ≥ `n` clips. Alphabetical tiebreak. Null if none. */
function bestColorFor(groups: ColorCounts, n: number): ClipColor | null {
  let best: { color: ClipColor; count: number } | null = null;
  for (const color of ALL_COLORS) {
    const count = groups[color].length;
    if (count < n) continue;
    if (
      best === null ||
      count > best.count ||
      (count === best.count && color < best.color)
    ) {
      best = { color, count };
    }
  }
  return best?.color ?? null;
}

/** All colors with ≥ `n` clips, in palette order. */
function eligibleColorsFor(groups: ColorCounts, n: number): ClipColor[] {
  return ALL_COLORS.filter((c) => groups[c].length >= n);
}

function classifyTier(matchKind: CashInMatchKind): Tier {
  if (matchKind === 'three-match' || matchKind === 'gold-instant-T3') return 'T3';
  if (matchKind === 'two-match') return 'T2';
  return 'T1';
}

function emptySelection(): SpinSelection {
  return { selectedIds: [], matchKind: 'none', unlockedTier: 'T1' };
}

function buildSelection(
  groups: ColorCounts,
  color: ClipColor,
  n: 2 | 3,
): SpinSelection {
  const ids: ClipId[] = groups[color].slice(0, n).map((c) => c.id);
  const matchKind: CashInMatchKind = n === 3 ? 'three-match' : 'two-match';
  return { selectedIds: ids, matchKind, unlockedTier: classifyTier(matchKind) };
}

const TIER_GLYPH: Record<Tier, string> = { T1: '一', T2: '二', T3: '三' };

const TIER_DESC: Record<Tier, string> = {
  T1: 'Quick wins only',
  T2: 'Mid rewards in play',
  T3: 'Big game unlocked',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nearestColor(groups: ColorCounts, n: number): {
  color: ClipColor;
  have: number;
} | null {
  let nearest: { color: ClipColor; have: number } | null = null;
  for (const color of ALL_COLORS) {
    const have = groups[color].length;
    if (have === 0) continue;
    if (
      nearest === null ||
      have > nearest.have ||
      (have === nearest.have && color < nearest.color)
    ) {
      nearest = { color, have };
    }
  }
  if (nearest === null || nearest.have >= n) return nearest;
  return nearest;
}

function costCopyFor(
  tier: Tier,
  groups: ColorCounts,
  bestForTwo: ClipColor | null,
  bestForThree: ClipColor | null,
): string {
  if (tier === 'T1') return 'Nothing';
  if (tier === 'T2') {
    if (bestForTwo) return `2 matching · ${capitalize(bestForTwo)} ×2 ready`;
    const near = nearestColor(groups, 2);
    if (!near) return '2 matching · need 2 of any color';
    return `2 matching · need ${2 - near.have} more ${capitalize(near.color)}`;
  }
  // T3
  if (bestForThree) return `3 matching · ${capitalize(bestForThree)} ×3 ready`;
  const near = nearestColor(groups, 3);
  if (!near) return '3 matching · need 3 of any color';
  return `3 matching · need ${3 - near.have} more ${capitalize(near.color)}`;
}

export function CashInPicker({
  hand,
  selection,
  onChange,
  disabled = false,
  className,
}: CashInPickerProps): ReactElement {
  const groups = useMemo(() => groupRegular(hand), [hand]);
  const bestForTwo = useMemo(() => bestColorFor(groups, 2), [groups]);
  const bestForThree = useMemo(() => bestColorFor(groups, 3), [groups]);
  const eligibleForTwo = useMemo(() => eligibleColorsFor(groups, 2), [groups]);
  const eligibleForThree = useMemo(() => eligibleColorsFor(groups, 3), [groups]);

  const selectedTier = classifyTier(selection.matchKind);
  // The color the user has currently committed (derived from the first
  // selected clip). null when nothing is staked or the stake is gold.
  const currentSelectedColor = useMemo<ClipColor | null>(() => {
    const firstId = selection.selectedIds[0];
    if (!firstId) return null;
    const clip = hand.find((c) => c.id === firstId);
    if (!clip || clip.kind !== 'regular') return null;
    return clip.color;
  }, [hand, selection.selectedIds]);

  const handlePickTier = (tier: Tier): void => {
    if (disabled) return;
    if (tier === 'T1') {
      onChange(emptySelection());
      return;
    }
    if (tier === selectedTier) {
      // Re-tap → toggle back to T1.
      onChange(emptySelection());
      return;
    }
    if (tier === 'T2' && bestForTwo) {
      onChange(buildSelection(groups, bestForTwo, 2));
      return;
    }
    if (tier === 'T3' && bestForThree) {
      onChange(buildSelection(groups, bestForThree, 3));
      return;
    }
  };

  const handlePickColor = (color: ClipColor): void => {
    if (disabled) return;
    if (selectedTier === 'T1') return;
    const n = selectedTier === 'T2' ? 2 : 3;
    onChange(buildSelection(groups, color, n));
  };

  const tierStatus = (tier: Tier): {
    enabled: boolean;
    selected: boolean;
    glyph: '●' | '○' | '✕';
  } => {
    const enabled =
      tier === 'T1' ||
      (tier === 'T2' && bestForTwo !== null) ||
      (tier === 'T3' && bestForThree !== null);
    const selected = tier === selectedTier;
    const glyph: '●' | '○' | '✕' = selected ? '●' : enabled ? '○' : '✕';
    return { enabled, selected, glyph };
  };

  const tiers: Tier[] = ['T1', 'T2', 'T3'];

  return (
    <section
      className={cn('cash-in-picker', className)}
      aria-labelledby="cash-in-picker-title"
      aria-disabled={disabled || undefined}
      data-testid="cash-in-picker"
    >
      <header className="cash-in-picker__header">
        <h3 id="cash-in-picker-title" className="cash-in-picker__title">
          段 · Unlock the Tiers
        </h3>
        <p className="cash-in-picker__subtitle">
          Pick a tier — then pick which colour to stake.
        </p>
      </header>

      <ul className="tier-ladder" role="list">
        {tiers.map((tier) => {
          const { enabled, selected, glyph } = tierStatus(tier);
          const cost = costCopyFor(tier, groups, bestForTwo, bestForThree);
          const desc = TIER_DESC[tier];
          return (
            <li key={tier}>
              <button
                type="button"
                className={cn(
                  'tier-row',
                  selected && 'tier-row--selected',
                  !enabled && 'tier-row--locked',
                )}
                onClick={() => handlePickTier(tier)}
                disabled={disabled || !enabled}
                aria-pressed={selected}
                aria-label={`${tier} — ${desc}. ${cost}.`}
                data-testid={`cash-in-tier-${tier}`}
              >
                <span
                  className="tier-row__badge"
                  aria-hidden
                >
                  {TIER_GLYPH[tier]}
                </span>
                <span className="tier-row__body">
                  <span className="tier-row__desc">{desc}</span>
                  <span className="tier-row__cost">{cost}</span>
                </span>
                <span
                  className="tier-row__status"
                  aria-hidden
                  data-state={selected ? 'selected' : enabled ? 'unlocked' : 'locked'}
                >
                  {glyph}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Color picker — visible once a tier above T1 is selected. Lists
          all eligible colors as chip buttons; user can override the auto-
          pick by tapping a different color. */}
      {selectedTier !== 'T1' ? (
        <div
          className="cash-in-picker__colors"
          role="radiogroup"
          aria-label="Stake colour"
        >
          <span className="cash-in-picker__colors-label">
            色 · Choose a Colour
          </span>
          <div className="cash-in-picker__colors-row">
            {(selectedTier === 'T2' ? eligibleForTwo : eligibleForThree).map(
              (color) => {
                const count = groups[color].length;
                const isSelected = currentSelectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${capitalize(color)} (${count} in hand)`}
                    className={cn(
                      'cash-in-color-chip',
                      isSelected && 'cash-in-color-chip--selected',
                    )}
                    onClick={() => handlePickColor(color)}
                    disabled={disabled}
                    data-testid={`cash-in-color-${color}`}
                  >
                    <Chip color={CLIP_HEX[color]} size={28} />
                    <span className="cash-in-color-chip__count">×{count}</span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      ) : null}

      <p
        className="cash-in-picker__status"
        aria-live="polite"
        data-testid="cash-in-picker__status"
      >
        {selection.matchKind === 'none'
          ? 'No stake — Tier I only'
          : `Stake locked · ${selection.unlockedTier} · ${currentSelectedColor ? capitalize(currentSelectedColor) : '—'}`}
      </p>
    </section>
  );
}

function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export default CashInPicker;
