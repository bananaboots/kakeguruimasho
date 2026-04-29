/**
 * RitualCard — tappable habit card.
 *
 * Two layouts share the same component:
 *   - default: vertical card with a glyph row, name, unit, gold "+"
 *   - compact: single-line row [icon · name + unit · streak · edit · +]
 *     used in the Vault to keep many habits visible without scrolling.
 *
 * Click semantics:
 *   - count   → opens StepEntry for batched awards
 *   - binary  → single-tap earns 1 clip
 *   - bundle  → calls `onBundleTap?.(habit)` so the parent can open the
 *               sub-item checklist
 *   - minutes/sets (legacy, migrated at boot) → single-tap earns 1 clip
 *
 * Preserves the `quicklog-${habit.id}` testid + the polite SR announcer
 * so the existing E2E + RTL coverage keeps working.
 */

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { getAppStore, useAppStore } from '../../state/store.ts';
import type { Habit } from '../../types/habit.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import {
  Engraved,
  Label,
  RitualGlyph,
  type RitualGlyphKind,
} from '../../ui/parlour/index.ts';
import { StepEntry } from './StepEntry.tsx';
import { RitualIcon } from './icon-bank.tsx';
import { isIconKey } from './icon-keys.ts';
import { cn } from '../../ui/utils.ts';

export interface RitualCardProps {
  habit: Habit;
  /** Optional click override for bundle habits. */
  onBundleTap?: (habit: Habit) => void;
  /** When set, an in-card pencil button surfaces the editor. */
  onEdit?: (habit: Habit) => void;
  /** Single-line layout for dense lists (e.g. Vault). */
  compact?: boolean;
  /** Show the leading habit icon. Default true. */
  showIcon?: boolean;
}

function unitSummary(habit: Habit): string | null {
  switch (habit.unit.kind) {
    case 'count':
      return `${habit.unit.target} ${habit.unit.unit}`;
    case 'minutes':
      return `${habit.unit.target} min`;
    case 'sets':
      return `${habit.unit.target} sets`;
    case 'bundle':
      return `${habit.unit.subItems.length} sub-items`;
    case 'binary':
      return null;
  }
}

function fallbackGlyph(habit: Habit): RitualGlyphKind {
  if (habit.unit.kind === 'count') return 'walk';
  if (habit.unit.kind === 'sets') return 'dumb';
  if (habit.unit.kind === 'bundle') return 'hourglass';
  const lower = habit.name.toLowerCase();
  if (lower.includes('clean') || lower.includes('tidy')) return 'broom';
  return 'hourglass';
}

function HabitIcon({ habit, size }: { habit: Habit; size: number }) {
  if (isIconKey(habit.iconKey)) {
    return <RitualIcon iconKey={habit.iconKey} size={size} />;
  }
  return <RitualGlyph kind={fallbackGlyph(habit)} size={size} color="var(--color-gold)" />;
}

export function RitualCard({
  habit,
  onBundleTap,
  onEdit,
  compact = false,
  showIcon = true,
}: RitualCardProps) {
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
      case 'binary':
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
      case 'binary':
        return `Log ${habit.name}`;
    }
  })();

  const handleEditClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onEdit?.(habit);
    },
    [habit, onEdit],
  );

  const summary = unitSummary(habit);

  return (
    <div className={cn('ritual-card-wrap', compact && 'ritual-card-wrap--compact')}>
      <button
        type="button"
        className={cn('ritual-card', compact && 'ritual-card--compact')}
        onClick={handleClick}
        aria-label={ariaLabel}
        data-testid={`quicklog-${habit.id}`}
      >
        {compact ? (
          <>
            {showIcon ? (
              <span className="ritual-card__glyph">
                <HabitIcon habit={habit} size={20} />
              </span>
            ) : null}
            <span className="ritual-card__body">
              <span className="ritual-card__name-row">
                <span className="ritual-card__name">{habit.name}</span>
                {streak > 0 && (
                  <span
                    className="ritual-card__streak"
                    aria-label={`${streak}-day streak`}
                  >
                    <span className="ritual-card__streak-ball" aria-hidden />
                    <span className="ritual-card__streak-count">×{streak}</span>
                  </span>
                )}
              </span>
              {summary !== null ? (
                <span className="ritual-card__summary">{summary}</span>
              ) : null}
            </span>
            <span className="ritual-card__plus" aria-hidden>
              <Plus size={18} strokeWidth={2.5} />
            </span>
          </>
        ) : (
          <>
            <span className="ritual-card__top">
              {showIcon ? (
                <HabitIcon habit={habit} size={22} />
              ) : (
                <span aria-hidden />
              )}
              {streak > 0 && (
                <span
                  className="ritual-card__streak"
                  aria-label={`${streak}-day streak`}
                >
                  <span className="ritual-card__streak-ball" aria-hidden />
                  <span className="ritual-card__streak-count">×{streak}</span>
                </span>
              )}
            </span>
            <Engraved size={17} align="left" style={{ marginTop: 8 }}>
              {habit.name}
            </Engraved>
            {summary !== null ? (
              <Label size={8} style={{ marginTop: 2 }}>
                {summary}
              </Label>
            ) : null}
            <span className="ritual-card__plus" aria-hidden>
              <Plus size={20} strokeWidth={2.5} />
            </span>
          </>
        )}
      </button>
      {onEdit ? (
        <button
          type="button"
          className="ritual-card__edit"
          onClick={handleEditClick}
          aria-label={`Edit ${habit.name}`}
        >
          <Pencil size={14} aria-hidden="true" />
        </button>
      ) : null}
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
    </div>
  );
}
