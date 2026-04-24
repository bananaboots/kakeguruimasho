// Bonus timer types (§5.7, A3).
// ARCHITECTURE §3 — bonus.ts.

import type { BonusTimerId, HabitId, ISOTimestamp, JarId } from './ids.ts';

export type BonusTimerStatus = 'active' | 'completed' | 'expired' | 'cancelled';

export type BonusTimer = {
  id: BonusTimerId;
  jarId: JarId;
  spawnedAt: ISOTimestamp;
  endTimestamp: ISOTimestamp; // authoritative; remaining = endTs - now
  segment: 'PCT_75' | 'PCT_50' | 'PCT_25';
  percent: 75 | 50 | 25;
  originHabitId: HabitId | null; // unset until user picks
  status: BonusTimerStatus;
};

export type BonusTimerState = {
  timers: BonusTimer[]; // spawn-ordered, multiple can be active concurrently (A3)
  // Pending bonus-wheel spins awaiting resolution (e.g. EXTRA chain re-spins).
  pendingBonusSpins: number;
};
