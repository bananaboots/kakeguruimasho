/**
 * JustALittleBitMore — A18 completion prompt (3H).
 *
 * A18 framing: "Your brain evaluates effort relative to what you JUST did.
 * Right after 15 burpees, 6 more feels like a steal." When the most-recent
 * completion of the picked habit is available, we render:
 *     "6 more burpees — you just did 15"
 * otherwise we fall back to:
 *     "Do 6 burpees"
 *
 * Delta = `ceil(habit.unit.target × percent / 100)`.
 *
 * Tap "I did it" → `actions.completeBonusTimer(jarId, timerId, habitId)`.
 * The store emits `bonus_completed` and spawns a clip via the existing
 * completion flow (A17 recursion — 3A `completeBonusTimer` handles clip
 * spawn + `earnClipToHand` + re-spin chain invariants).
 */

import { useCallback, useMemo } from 'react';
import { Button } from '../../ui/button.tsx';
import { getAppStore, useAppStore } from '../../state/store.ts';
import type { Habit } from '../../types/habit.ts';
import type { BonusTimer } from '../../types/bonus.ts';
import type { HistoryEvent } from '../../types/history.ts';
import { discountTarget, unitWord } from './JustALittleBitMore.util.ts';

export interface JustALittleBitMoreProps {
  timer: BonusTimer;
  habit: Habit; // numeric: count / minutes / sets
}

/**
 * Look back through in-memory history for the most recent `habit_completed`
 * event for the given habit. Returns that event's `unitsCompleted`, or null
 * if none is available in the window.
 */
function lastCompletedUnits(history: HistoryEvent[], habitId: Habit['id']): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const evt = history[i];
    if (!evt) continue;
    if (evt.kind === 'habit_completed' && evt.habitId === habitId) {
      return evt.unitsCompleted;
    }
  }
  return null;
}

export function JustALittleBitMore({ timer, habit }: JustALittleBitMoreProps) {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const history = useAppStore((s) => s.history);

  const delta = useMemo(
    () => discountTarget(habit, timer.percent),
    [habit, timer.percent],
  );
  const recentUnits = useMemo(
    () => lastCompletedUnits(history, habit.id),
    [history, habit.id],
  );
  const unit = unitWord(habit);

  const onComplete = useCallback(() => {
    getAppStore()
      .getState()
      .actions.completeBonusTimer(activeJarId, timer.id, habit.id);
  }, [activeJarId, timer.id, habit.id]);

  const primary =
    recentUnits != null
      ? `${delta} more ${unit} — you just did ${recentUnits}`
      : `Do ${delta} ${unit}`;

  return (
    <div
      className="bonus-littlemore"
      data-testid="just-a-little-bit-more"
    >
      <p className="bonus-littlemore__prompt">{primary}</p>
      <p className="bonus-littlemore__sub">
        Discounted habit: {habit.name} · {timer.percent}% off
      </p>
      <Button
        variant="primary"
        size="lg"
        onClick={onComplete}
        className="bonus-littlemore__cta"
        data-testid="bonus-complete-button"
      >
        I did it
      </Button>
    </div>
  );
}
