// Habits slice.

import type { AppState } from '../../types/app-state.ts';
import type { Habit } from '../../types/habit.ts';
import type { HabitId } from '../../types/ids.ts';

export function addHabit(state: AppState, habit: Habit): AppState {
  return { ...state, habits: [...state.habits, habit] };
}

export function updateHabit(
  state: AppState,
  habitId: HabitId,
  patch: Partial<Omit<Habit, 'id' | 'createdAt'>>,
): AppState {
  return {
    ...state,
    habits: state.habits.map((h) => (h.id === habitId ? { ...h, ...patch } : h)),
  };
}

export function archiveHabit(state: AppState, habitId: HabitId): AppState {
  return updateHabit(state, habitId, { archived: true });
}
