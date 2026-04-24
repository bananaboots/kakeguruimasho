/**
 * Non-component helpers for JustALittleBitMore.
 *
 * Extracted to a sibling module so the `.tsx` file exports only components
 * (satisfies react-refresh/only-export-components).
 */

import type { Habit } from '../../types/habit.ts';

export function unitWord(habit: Habit): string {
  if (habit.unit.kind === 'count') return habit.unit.unit;
  if (habit.unit.kind === 'minutes') return 'min';
  if (habit.unit.kind === 'sets') return 'sets';
  return '';
}

export function discountTarget(habit: Habit, percent: number): number {
  if (
    habit.unit.kind !== 'count' &&
    habit.unit.kind !== 'minutes' &&
    habit.unit.kind !== 'sets'
  ) {
    return 0;
  }
  return Math.ceil(habit.unit.target * (percent / 100));
}
