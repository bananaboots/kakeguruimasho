// Streak types (§5.8).
// ARCHITECTURE §3 — streak.ts.

import type { HabitId, JarId, LocalDate } from './ids.ts';

export type StreakKind = 'daily' | 'hygiene' | 'bonus-chain';

export type StreakState = {
  jarId: JarId; // D4
  daily: {
    current: number;
    longest: number;
    lastClipDate: LocalDate | null; // for rollover detection (A8)
  };
  hygiene: {
    current: number;
    longest: number;
    lastCompletedDate: LocalDate | null;
  };
  perHabit: Record<
    HabitId,
    {
      current: number;
      longest: number;
      lastCompletedDate: LocalDate | null;
    }
  >;
  bonusChain: {
    // Session-scoped per A2/A3.
    current: number;
    longest: number;
  };
};
