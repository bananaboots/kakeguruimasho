// Habit types (§5.2, §6.1).
// ARCHITECTURE §3 — habit.ts.

import type { HabitId, ISOTimestamp, JarId, LocalDate } from './ids.ts';

export type HabitUnit =
  | { kind: 'count'; target: number; unit: string } // e.g. steps: 2500 / "steps"
  | { kind: 'minutes'; target: number } // cleaning 20 min, work 30 min
  | { kind: 'sets'; target: number } // workout 4 sets
  | { kind: 'bundle'; subItems: string[]; cutoffLocal: string }; // hygiene bundle

export type Habit = {
  id: HabitId;
  name: string;
  unit: HabitUnit;
  createdAt: ISOTimestamp;
  archived: boolean;
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
