/**
 * useBonusTimerSummary — shared selector for the active bonus timer state.
 *
 * Used by BonusTimerBanner (mobile) AND RailBonusWidget (desktop right rail).
 * Returns the oldest active timer + its origin habit + total active count.
 */
import { useMemo } from 'react';
import { useAppStore } from '../../state/store.ts';
import type { BonusTimer } from '../../types/bonus.ts';
import type { Habit } from '../../types/habit.ts';

export interface BonusTimerSummary {
  oldest: BonusTimer | null;
  originHabit: Habit | null;
  activeCount: number;
}

export function useBonusTimerSummary(): BonusTimerSummary {
  const rawTimers = useAppStore(
    (s) => s.bonusTimerState[s.activeJarId]?.timers,
  );
  const habits = useAppStore((s) => s.habits);

  const active = useMemo<BonusTimer[]>(
    () => (rawTimers ?? []).filter((t) => t.status === 'active'),
    [rawTimers],
  );

  const oldest = useMemo<BonusTimer | null>(() => {
    if (active.length === 0) return null;
    return active.reduce((o, t) =>
      Date.parse(t.spawnedAt) < Date.parse(o.spawnedAt) ? t : o,
    );
  }, [active]);

  const originHabit = useMemo<Habit | null>(() => {
    if (!oldest || !oldest.originHabitId) return null;
    return habits.find((h) => h.id === oldest.originHabitId) ?? null;
  }, [oldest, habits]);

  return { oldest, originHabit, activeCount: active.length };
}
