/**
 * DiscountHabitPicker — pick which habit to complete for the discount (3H).
 *
 * Per A4 (DECISIONS / PLANNING): tiered discounts apply only to *measurable
 * numeric* habits — `count`, `minutes`, or `sets`. The hygiene bundle
 * (`unit.kind === 'bundle'`) is excluded. Archived habits are filtered out.
 *
 * This component is per-timer: one picker per active timer. On selection it
 * updates `timer.originHabitId` via a direct slice write (the store's
 * `completeBonusTimer` is the only exposed writer, so we patch state directly
 * here — tracked in WAVE3 notes for a future Phase 4 action). Once a habit is
 * picked, the UI switches to <JustALittleBitMore> for that habit.
 *
 * We read the *live* timer from the store (keyed by `timer.id` in the prop)
 * so that updates to `originHabitId` trigger a re-render even when the
 * parent does not.
 */

import { useCallback } from 'react';
import { getAppStore, useAppStore } from '../../state/store.ts';
import type { Habit } from '../../types/habit.ts';
import type { BonusTimer } from '../../types/bonus.ts';
import type { HabitId } from '../../types/ids.ts';
import { RitualGlyph } from '../../ui/parlour/index.ts';
import type { RitualGlyphKind } from '../../ui/parlour/index.ts';
import { JustALittleBitMore } from './JustALittleBitMore.tsx';

export interface DiscountHabitPickerProps {
  timer: BonusTimer;
}

function isNumericHabit(h: Habit): boolean {
  return (
    h.unit.kind === 'count' ||
    h.unit.kind === 'minutes' ||
    h.unit.kind === 'sets'
  );
}

function glyphFor(habit: Habit): RitualGlyphKind {
  if (habit.unit.kind === 'count') return 'walk';
  if (habit.unit.kind === 'sets') return 'dumb';
  // minutes — distinguish broom (cleaning) from hourglass (focused work)
  // by name when possible.
  const lower = habit.name.toLowerCase();
  if (lower.includes('clean') || lower.includes('tidy')) return 'broom';
  return 'hourglass';
}

function unitLabel(habit: Habit): string {
  if (habit.unit.kind === 'count') {
    return `${habit.unit.target} ${habit.unit.unit}`;
  }
  if (habit.unit.kind === 'minutes') return `${habit.unit.target} min`;
  if (habit.unit.kind === 'sets') return `${habit.unit.target} sets`;
  return '';
}

export function DiscountHabitPicker({ timer: initialTimer }: DiscountHabitPickerProps) {
  // Live-read the timer so `originHabitId` updates propagate even if the
  // parent holds a stale reference.
  const liveTimer = useAppStore((s) => {
    const bs = s.bonusTimerState[s.activeJarId];
    if (!bs) return initialTimer;
    return bs.timers.find((t) => t.id === initialTimer.id) ?? initialTimer;
  });
  const habits = useAppStore((s) => s.habits);
  const eligible = habits.filter((h) => !h.archived && isNumericHabit(h));

  const chosen = habits.find((h) => h.id === liveTimer.originHabitId) ?? null;

  const onPick = useCallback(
    (habitId: HabitId) => {
      const { actions, activeJarId } = getAppStore().getState();
      actions.setBonusTimerOrigin(activeJarId, liveTimer.id, habitId);
    },
    [liveTimer.id],
  );

  if (chosen) {
    return <JustALittleBitMore timer={liveTimer} habit={chosen} />;
  }

  if (eligible.length === 0) {
    return (
      <p className="bonus-picker__empty">
        No eligible habits. Add a numeric habit (steps, minutes, or sets) to
        use bonus discounts.
      </p>
    );
  }

  return (
    <div className="bonus-picker" data-testid="discount-habit-picker">
      <p className="bonus-picker__prompt">
        Pick a ritual for your {liveTimer.percent}% discount.
      </p>
      <ul className="bonus-picker__grid" role="list">
        {eligible.map((h) => (
          <li key={h.id} className="bonus-picker__cell">
            <button
              type="button"
              onClick={() => onPick(h.id)}
              data-testid={`discount-pick-${h.id}`}
              className="bonus-picker__btn"
            >
              <RitualGlyph
                kind={glyphFor(h)}
                size={20}
                color="var(--color-ink-muted)"
              />
              <span className="bonus-picker__cell-body">
                <span className="bonus-picker__name">{h.name}</span>
                <span className="bonus-picker__unit">{unitLabel(h)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
