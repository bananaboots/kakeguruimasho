// Habit types (§5.2, §6.1).
// ARCHITECTURE §3 — habit.ts.

import type { HabitId, ISOTimestamp, JarId, LocalDate } from './ids.ts';

export type HabitUnit =
  | { kind: 'count'; target: number; unit: string } // e.g. 2500/"steps", 30/"minutes", 4/"sets"
  | { kind: 'minutes'; target: number } // legacy — boot migration converts to count
  | { kind: 'sets'; target: number } // legacy — boot migration converts to count
  | { kind: 'bundle'; subItems: string[]; cutoffLocal: string } // multi-step compound habit
  | { kind: 'binary' }; // binary yes/no habit — single tap = 1 clip

export type Habit = {
  id: HabitId;
  name: string;
  unit: HabitUnit;
  createdAt: ISOTimestamp;
  archived: boolean;
  /** Optional Lucide icon key used by the ritual card; falls back to a
   *  unit-derived glyph when unset. */
  iconKey?: string;
  // OR-1: no jarId in v1; v2 migration will add with DEFAULT_JAR_ID.
};

// Hygiene bundle per-day tracking (§5.8, A5).
export type HygieneBundleState = {
  jarId: JarId; // D4
  date: LocalDate; // which local day this bundle is being tracked for
  subItemsCompleted: Record<string, ISOTimestamp | null>;
  cutoffLocal: string; // snapshot-locked evaluation; default "01:00" (Q5)
  awarded: boolean;
  awardedAt: ISOTimestamp | null;
};
