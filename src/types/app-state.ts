// Root AppState shape (§8).
// ARCHITECTURE §3 — app-state.ts.

import type { JarId } from './ids.ts';
import type { Clip } from './clip.ts';
import type { JarState } from './jar.ts';
import type { WheelConfig } from './wheel.ts';
import type { StreakState } from './streak.ts';
import type { BonusTimerState } from './bonus.ts';
import type { Habit, HygieneBundleState } from './habit.ts';
import type { Reward } from './reward.ts';
import type { HistoryEvent } from './history.ts';
import type { Settings } from './settings.ts';

// Result of a cash-in action — surfaced to callers to drive UI.
export type CashInMatchKind = 'none' | 'two-match' | 'three-match' | 'gold-instant-T3';

export type CashInResult = {
  matchKind: CashInMatchKind;
  unlockedTier: 'T1' | 'T2' | 'T3';
  instantT3: boolean; // true only when a gold clip was cashed in (§5.5)
};

// Root shape persisted to IDB. Everything jar-scoped is keyed by JarId (D4).
export type AppState = {
  schemaVersion: number; // current = 1 (D5)

  // Per-jar maps — D4 compliance.
  jars: Record<JarId, JarState>;
  bags: Record<JarId, Clip[]>;
  hands: Record<JarId, Clip[]>;
  wheelConfigs: Record<JarId, WheelConfig>;
  streaks: Record<JarId, StreakState>;
  bonusTimerState: Record<JarId, BonusTimerState>;
  pendingHygieneBundle: Record<JarId, HygieneBundleState | null>;

  // Global (non-jar-scoped) in v1 — OR-1.
  habits: Habit[];
  rewards: { T1: Reward[]; T2: Reward[]; T3: Reward[] };

  // Append-only log; truncated in-memory per §4.2 (last 500), full log in
  // history_events store.
  history: HistoryEvent[];

  settings: Settings;

  // Metadata / ephemeral-ish.
  activeJarId: JarId; // v1 always DEFAULT_JAR_ID
  installPromptShown: boolean;
  firstRunCompleted: boolean;

  // Set by tickDailyStreak when the streak hits a 100/1000-day milestone.
  // Read by <StreakMilestoneCelebration> to render the modal; cleared by
  // `acknowledgeStreakMilestone`. Persisted so a milestone hit while the
  // user is mid-task can't be lost on reload.
  pendingStreakCelebration: StreakCelebrationPayload | null;
};

export type StreakCelebrationPayload = {
  jarId: JarId;
  streakValue: number;            // post-tick value (e.g. 100, 200, 1000)
  tier: 'century' | 'millennium'; // 100-multiple vs 1000-multiple
  regularChips: number;
  goldChips: number;
};

// Constant: schema version. Bump only in migration PRs.
export const SCHEMA_VERSION = 1 as const;

// Constant: in-memory AppState.history truncation window (§4.2).
export const IN_MEMORY_HISTORY_LIMIT = 500 as const;
