// Bonus timer slice (A3 concurrency).

import type { AppState } from '../../types/app-state.ts';
import type { BonusTimer, BonusTimerState } from '../../types/bonus.ts';
import type { BonusTimerId, HabitId, JarId } from '../../types/ids.ts';

function bonusFor(state: AppState, jarId: JarId): BonusTimerState {
  const bs = state.bonusTimerState[jarId];
  if (!bs) throw new Error(`No bonus state for jarId=${jarId}`);
  return bs;
}

export function spawnTimer(state: AppState, jarId: JarId, timer: BonusTimer): AppState {
  const bs = bonusFor(state, jarId);
  return {
    ...state,
    bonusTimerState: {
      ...state.bonusTimerState,
      [jarId]: { ...bs, timers: [...bs.timers, timer] },
    },
  };
}

export function completeTimer(
  state: AppState,
  jarId: JarId,
  timerId: BonusTimerId,
  habitId: HabitId,
): AppState {
  const bs = bonusFor(state, jarId);
  return {
    ...state,
    bonusTimerState: {
      ...state.bonusTimerState,
      [jarId]: {
        ...bs,
        timers: bs.timers.map((t) =>
          t.id === timerId
            ? { ...t, status: 'completed' as const, originHabitId: habitId }
            : t,
        ),
      },
    },
  };
}

export function expireTimer(state: AppState, jarId: JarId, timerId: BonusTimerId): AppState {
  const bs = bonusFor(state, jarId);
  return {
    ...state,
    bonusTimerState: {
      ...state.bonusTimerState,
      [jarId]: {
        ...bs,
        timers: bs.timers.map((t) =>
          t.id === timerId ? { ...t, status: 'expired' as const } : t,
        ),
      },
    },
  };
}

export function queueExtraSpins(state: AppState, jarId: JarId, count: number): AppState {
  const bs = bonusFor(state, jarId);
  return {
    ...state,
    bonusTimerState: {
      ...state.bonusTimerState,
      [jarId]: { ...bs, pendingBonusSpins: bs.pendingBonusSpins + count },
    },
  };
}

export function setTimerOrigin(
  state: AppState,
  jarId: JarId,
  timerId: BonusTimerId,
  habitId: HabitId,
): AppState {
  const bs = bonusFor(state, jarId);
  return {
    ...state,
    bonusTimerState: {
      ...state.bonusTimerState,
      [jarId]: {
        ...bs,
        timers: bs.timers.map((t) =>
          t.id === timerId ? { ...t, originHabitId: habitId } : t,
        ),
      },
    },
  };
}

export function dequeueExtraSpin(state: AppState, jarId: JarId): AppState {
  const bs = bonusFor(state, jarId);
  if (bs.pendingBonusSpins <= 0) return state;
  return {
    ...state,
    bonusTimerState: {
      ...state.bonusTimerState,
      [jarId]: { ...bs, pendingBonusSpins: bs.pendingBonusSpins - 1 },
    },
  };
}
