/**
 * InlineTimer — button-only logger for minutes-unit habits (3D).
 *
 * Q3 (DECISIONS) / PLANNING: v1 ships as a plain "Log X min" button. No
 * running countdown, no enforced timer — that's v1.1, gated by
 * `settings.workTimerOptIn[habitId]`. The stub below shows the intended
 * shape without wiring it up.
 *
 * Tap → `actions.completeHabit(habitId, 1)` → earns a single clip.
 */

import { useCallback } from 'react';
import { Button } from '../../ui/button.tsx';
import { getAppStore, useAppStore } from '../../state/store.ts';
import type { Habit } from '../../types/habit.ts';

export interface InlineTimerProps {
  habit: Habit; // unit.kind === 'minutes'
}

export function InlineTimer({ habit }: InlineTimerProps) {
  const optIn = useAppStore(
    (s) => s.settings.workTimerOptIn[habit.id] === true,
  );

  const handleLog = useCallback(() => {
    getAppStore().getState().actions.completeHabit(habit.id, 1);
  }, [habit.id]);

  if (habit.unit.kind !== 'minutes') return null;
  const minutes = habit.unit.target;

  // v1.1: optional enforced countdown — when `optIn` is true, render a
  // running countdown that only awards the clip if not cancelled. Stubbed
  // for now; fall through to the v1 button so the feature is still usable.
  if (optIn) {
    // v1.1: optional enforced countdown — not implemented in v1.
    // Intentional fall-through to the button below.
  }

  return (
    <Button
      variant="primary"
      size="lg"
      onClick={handleLog}
      className="habit-inline-timer"
      aria-label={`Log ${minutes} minutes of ${habit.name}`}
    >
      Log {minutes} min {habit.name.toLowerCase()}
    </Button>
  );
}
