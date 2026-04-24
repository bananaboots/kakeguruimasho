// Streaks slice (§5.8). Uses named action creators so no caller does raw read-modify-write.

import type { AppState } from '../../types/app-state.ts';
import type { HabitId, JarId, LocalDate } from '../../types/ids.ts';
import type { StreakKind, StreakState } from '../../types/streak.ts';
import { dayDelta } from '../../lib/time.ts';

function streaksFor(state: AppState, jarId: JarId): StreakState {
  const s = state.streaks[jarId];
  if (!s) throw new Error(`No streaks for jarId=${jarId}`);
  return s;
}

function writeStreaks(state: AppState, jarId: JarId, next: StreakState): AppState {
  return { ...state, streaks: { ...state.streaks, [jarId]: next } };
}

/**
 * Tick daily streak. Returns the new `current` value so callers can emit
 * history events with the post-tick value (and tell increment vs no-op apart).
 */
export function tickDailyStreak(
  state: AppState,
  jarId: JarId,
  today: LocalDate,
): { state: AppState; incremented: boolean; value: number } {
  const s = streaksFor(state, jarId);
  const prev = s.daily.lastClipDate;
  if (prev === null) {
    const next: StreakState = {
      ...s,
      daily: { current: 1, longest: Math.max(1, s.daily.longest), lastClipDate: today },
    };
    return { state: writeStreaks(state, jarId, next), incremented: true, value: 1 };
  }
  const delta = dayDelta(prev, today);
  if (delta === 'same' || delta === 'back') {
    return { state, incremented: false, value: s.daily.current };
  }
  if (delta === 'next') {
    const current = s.daily.current + 1;
    const next: StreakState = {
      ...s,
      daily: { current, longest: Math.max(current, s.daily.longest), lastClipDate: today },
    };
    return { state: writeStreaks(state, jarId, next), incremented: true, value: current };
  }
  // 'skip' — gap of 2+ days: streak breaks, new run of 1 starts today.
  const next: StreakState = {
    ...s,
    daily: { current: 1, longest: Math.max(1, s.daily.longest), lastClipDate: today },
  };
  return { state: writeStreaks(state, jarId, next), incremented: true, value: 1 };
}

/** Tick a per-habit streak. */
export function tickHabitStreak(
  state: AppState,
  jarId: JarId,
  habitId: HabitId,
  today: LocalDate,
): { state: AppState; incremented: boolean; value: number } {
  const s = streaksFor(state, jarId);
  const prev = s.perHabit[habitId] ?? { current: 0, longest: 0, lastCompletedDate: null };

  let nextEntry: typeof prev;
  let incremented: boolean;
  let value: number;
  if (prev.lastCompletedDate === null) {
    nextEntry = { current: 1, longest: Math.max(1, prev.longest), lastCompletedDate: today };
    incremented = true;
    value = 1;
  } else {
    const delta = dayDelta(prev.lastCompletedDate, today);
    if (delta === 'same' || delta === 'back') {
      return { state, incremented: false, value: prev.current };
    }
    if (delta === 'next') {
      value = prev.current + 1;
      nextEntry = {
        current: value,
        longest: Math.max(value, prev.longest),
        lastCompletedDate: today,
      };
      incremented = true;
    } else {
      nextEntry = { current: 1, longest: Math.max(1, prev.longest), lastCompletedDate: today };
      incremented = true;
      value = 1;
    }
  }
  const next: StreakState = {
    ...s,
    perHabit: { ...s.perHabit, [habitId]: nextEntry },
  };
  return { state: writeStreaks(state, jarId, next), incremented, value };
}

/** Tick hygiene streak (mirrors daily shape but scoped to `hygiene`). */
export function tickHygieneStreak(
  state: AppState,
  jarId: JarId,
  today: LocalDate,
): { state: AppState; incremented: boolean; value: number } {
  const s = streaksFor(state, jarId);
  const prev = s.hygiene.lastCompletedDate;
  if (prev === null) {
    const next: StreakState = {
      ...s,
      hygiene: { current: 1, longest: Math.max(1, s.hygiene.longest), lastCompletedDate: today },
    };
    return { state: writeStreaks(state, jarId, next), incremented: true, value: 1 };
  }
  const delta = dayDelta(prev, today);
  if (delta === 'same' || delta === 'back') {
    return { state, incremented: false, value: s.hygiene.current };
  }
  if (delta === 'next') {
    const current = s.hygiene.current + 1;
    const next: StreakState = {
      ...s,
      hygiene: { current, longest: Math.max(current, s.hygiene.longest), lastCompletedDate: today },
    };
    return { state: writeStreaks(state, jarId, next), incremented: true, value: current };
  }
  const next: StreakState = {
    ...s,
    hygiene: { current: 1, longest: Math.max(1, s.hygiene.longest), lastCompletedDate: today },
  };
  return { state: writeStreaks(state, jarId, next), incremented: true, value: 1 };
}

/** Break a streak (daily/hygiene/bonus-chain). Returns the last value. */
export function breakStreak(
  state: AppState,
  jarId: JarId,
  kind: StreakKind,
): { state: AppState; lastValue: number } {
  const s = streaksFor(state, jarId);
  if (kind === 'daily') {
    const lastValue = s.daily.current;
    return {
      state: writeStreaks(state, jarId, {
        ...s,
        daily: { ...s.daily, current: 0 },
      }),
      lastValue,
    };
  }
  if (kind === 'hygiene') {
    const lastValue = s.hygiene.current;
    return {
      state: writeStreaks(state, jarId, {
        ...s,
        hygiene: { ...s.hygiene, current: 0 },
      }),
      lastValue,
    };
  }
  const lastValue = s.bonusChain.current;
  return {
    state: writeStreaks(state, jarId, {
      ...s,
      bonusChain: { ...s.bonusChain, current: 0 },
    }),
    lastValue,
  };
}

/** Increment bonus chain (session-scoped per A2/A3). */
export function tickBonusChain(
  state: AppState,
  jarId: JarId,
): { state: AppState; value: number } {
  const s = streaksFor(state, jarId);
  const current = s.bonusChain.current + 1;
  const next: StreakState = {
    ...s,
    bonusChain: { current, longest: Math.max(current, s.bonusChain.longest) },
  };
  return { state: writeStreaks(state, jarId, next), value: current };
}
