/**
 * RitualCard — Pachinko ritual card.
 *
 * Source: `pachinko-screens.jsx:348` (PachinkoRitualCard). The card replaces
 * the old name + unit text + Button row with a single tappable surface:
 *   - top-left: RitualGlyph
 *   - top-right: streak indicator (paperclip-style ball + ×N)
 *   - middle: engraved habit name + tracked unit sub
 *   - bottom-right: gold "+" lever button (visual; the whole card is the
 *     tap target so the 30px circle isn't a tap-size issue)
 *
 * Click semantics mirror QuickLogButton (3D):
 *   - count   → opens StepEntry for batched awards
 *   - minutes → single-tap earns 1 clip
 *   - sets    → single-tap earns 1 clip
 *   - bundle  → calls `onBundleTap?.(habit)` so the parent can scroll to
 *               the inline bundle UI
 *
 * Preserves the `quicklog-${habit.id}` testid + the polite SR announcer
 * so the existing E2E + RTL coverage keeps working.
 */

import { useCallback, useEffect, useState } from 'react';
import { getAppStore } from '../../state/store.ts';
import { useAppStore } from '../../state/store.ts';
import type { Habit } from '../../types/habit.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import {
  Engraved,
  Label,
  RitualGlyph,
  type RitualGlyphKind,
} from '../../ui/parlour/index.ts';
import { StepEntry } from './StepEntry.tsx';

export interface RitualCardProps {
  habit: Habit;
  /** Optional click override for bundle habits. */
  onBundleTap?: (habit: Habit) => void;
}

function unitSummary(habit: Habit): string {
  switch (habit.unit.kind) {
    case 'count':
      return `${habit.unit.target} ${habit.unit.unit}`;
    case 'minutes':
      return `${habit.unit.target} min`;
    case 'sets':
      return `${habit.unit.target} sets`;
    case 'bundle':
      return `${habit.unit.subItems.length} sub-items`;
  }
}

function glyphFor(habit: Habit): RitualGlyphKind {
  if (habit.unit.kind === 'count') return 'walk';
  if (habit.unit.kind === 'sets') return 'dumb';
  if (habit.unit.kind === 'bundle') return 'hourglass';
  const lower = habit.name.toLowerCase();
  if (lower.includes('clean') || lower.includes('tidy')) return 'broom';
  return 'hourglass';
}

export function RitualCard({ habit, onBundleTap }: RitualCardProps) {
  const [stepOpen, setStepOpen] = useState(false);
  const [lastEarned, setLastEarned] = useState<number | null>(null);

  const streak = useAppStore(
    (s) => s.streaks[DEFAULT_JAR_ID]?.perHabit[habit.id]?.current ?? 0,
  );

  useEffect(() => {
    if (lastEarned === null) return;
    const id = window.setTimeout(() => setLastEarned(null), 1500);
    return () => window.clearTimeout(id);
  }, [lastEarned]);

  const logOne = useCallback(() => {
    const { actions } = getAppStore().getState();
    const result = actions.completeHabit(habit.id, 1);
    setLastEarned(result.clipsEarned);
  }, [habit.id]);

  const handleClick = useCallback(() => {
    switch (habit.unit.kind) {
      case 'count':
        setStepOpen(true);
        return;
      case 'minutes':
      case 'sets':
        logOne();
        return;
      case 'bundle':
        onBundleTap?.(habit);
        return;
    }
  }, [habit, logOne, onBundleTap]);

  const ariaLabel = (() => {
    switch (habit.unit.kind) {
      case 'count':
        return `Log ${habit.name}`;
      case 'minutes':
        return `Log ${habit.unit.target} min ${habit.name.toLowerCase()}`;
      case 'sets':
        return `Log ${habit.unit.target} sets — ${habit.name}`;
      case 'bundle':
        return `Open ${habit.name}`;
    }
  })();

  return (
    <>
      <button
        type="button"
        className="ritual-card"
        onClick={handleClick}
        aria-label={ariaLabel}
        data-testid={`quicklog-${habit.id}`}
      >
        <span className="ritual-card__top">
          <RitualGlyph
            kind={glyphFor(habit)}
            size={22}
            color="var(--color-gold)"
          />
          {streak > 0 && (
            <span className="ritual-card__streak" aria-label={`${streak}-day streak`}>
              <span className="ritual-card__streak-ball" aria-hidden />
              <span className="ritual-card__streak-count">×{streak}</span>
            </span>
          )}
        </span>
        <Engraved
          size={17}
          align="left"
          style={{ marginTop: 8 }}
        >
          {habit.name}
        </Engraved>
        <Label size={8} style={{ marginTop: 2 }}>
          {unitSummary(habit)}
        </Label>
        <span className="ritual-card__plus" aria-hidden>
          +
        </span>
      </button>
      <span className="sr-only" aria-live="polite" role="status">
        {lastEarned !== null
          ? `Earned ${lastEarned} clip${lastEarned === 1 ? '' : 's'}.`
          : ''}
      </span>
      {habit.unit.kind === 'count' ? (
        <StepEntry
          habit={habit}
          open={stepOpen}
          onClose={() => setStepOpen(false)}
        />
      ) : null}
    </>
  );
}
