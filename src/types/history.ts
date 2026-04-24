// History event discriminated union.
// ARCHITECTURE §3 — history.ts. 3A is sole owner of this file (per §2 hard rule).

import type {
  ClipId,
  EventId,
  HabitId,
  ISOTimestamp,
  JarId,
  MilestoneId,
  RewardId,
  BonusTimerId,
} from './ids.ts';
import type { BagComposition, ClipColor, ClipSource } from './clip.ts';
import type { MainSpinResult, BonusSpinResult, MainWheelTier, Tier } from './wheel.ts';
import type { StreakKind } from './streak.ts';

export type HistoryEventBase = {
  id: EventId;
  at: ISOTimestamp;
  jarId: JarId; // D4 — every event is jar-scoped
};

// Each variant below intersects the base. Kept explicit for editor-friendly narrowing.

export type ClipEarnedEvent = HistoryEventBase & {
  kind: 'clip_earned';
  source: ClipSource;
  habitId: HabitId | null;
  clipId: ClipId;
  drawnColor: ClipColor | 'gold';
};

export type BagRefilledEvent = HistoryEventBase & {
  kind: 'bag_refilled';
  composition: BagComposition;
};

export type CashInEvent = HistoryEventBase & {
  kind: 'cash_in';
  clips: ClipId[];
  matchKind: 'none' | 'two-match' | 'three-match' | 'gold-instant-T3';
};

export type MainSpinEvent = HistoryEventBase & {
  kind: 'main_spin';
  result: MainSpinResult;
  unlockedTier: Tier | null;
  rewardSelected: RewardId | null;
};

export type NearMissEvent = HistoryEventBase & {
  kind: 'near_miss';
  actualTier: MainWheelTier;
  blockedBy: Tier;
};

export type NearMissTheaterEvent = HistoryEventBase & {
  kind: 'near_miss_theater';
  driftedPast: Tier;
};

export type BonusSpinEvent = HistoryEventBase & {
  kind: 'bonus_spin';
  result: BonusSpinResult;
  timerId: BonusTimerId | null;
};

export type BonusTimerStartedEvent = HistoryEventBase & {
  kind: 'bonus_timer_started';
  timerId: BonusTimerId;
  endTimestamp: ISOTimestamp;
  segment: 'PCT_75' | 'PCT_50' | 'PCT_25';
};

export type BonusCompletedEvent = HistoryEventBase & {
  kind: 'bonus_completed';
  timerId: BonusTimerId;
  habitId: HabitId;
};

export type BonusExpiredEvent = HistoryEventBase & {
  kind: 'bonus_expired';
  timerId: BonusTimerId;
};

export type MilestoneUnlockedEvent = HistoryEventBase & {
  kind: 'milestone_unlocked';
  milestone: MilestoneId;
  total: number;
};

export type MilestoneClaimedEvent = HistoryEventBase & {
  kind: 'milestone_claimed';
  milestone: MilestoneId;
  reset: boolean; // true only for moonshot (D1)
};

export type JarResetEvent = HistoryEventBase & {
  kind: 'jar_reset';
  from: number;
  reason: 'moonshot-claimed';
};

export type StreakIncrementedEvent = HistoryEventBase & {
  kind: 'streak_incremented';
  streak: StreakKind;
  value: number;
};

export type StreakBrokenEvent = HistoryEventBase & {
  kind: 'streak_broken';
  streak: StreakKind;
  lastValue: number;
};

export type RewardClaimedEvent = HistoryEventBase & {
  kind: 'reward_claimed';
  rewardId: RewardId | null; // OR-3: may be null if forfeit
  tier: Tier;
  source: 'wheel' | 'gold' | 'jackpot';
};

export type HabitCompletedEvent = HistoryEventBase & {
  kind: 'habit_completed';
  habitId: HabitId;
  unitsCompleted: number;
  clipsEarned: number;
};

export type HygieneSubItemCheckedEvent = HistoryEventBase & {
  kind: 'hygiene_subitem_checked';
  subItem: string;
};

export type SettingsChangedEvent = HistoryEventBase & {
  kind: 'settings_changed';
  path: string;
  before: unknown;
  after: unknown;
};

export type ImportPerformedEvent = HistoryEventBase & {
  kind: 'import_performed';
  backupId: string | null;
};

export type ExportPerformedEvent = HistoryEventBase & {
  kind: 'export_performed';
};

export type HistoryEvent =
  | ClipEarnedEvent
  | BagRefilledEvent
  | CashInEvent
  | MainSpinEvent
  | NearMissEvent
  | NearMissTheaterEvent
  | BonusSpinEvent
  | BonusTimerStartedEvent
  | BonusCompletedEvent
  | BonusExpiredEvent
  | MilestoneUnlockedEvent
  | MilestoneClaimedEvent
  | JarResetEvent
  | StreakIncrementedEvent
  | StreakBrokenEvent
  | RewardClaimedEvent
  | HabitCompletedEvent
  | HygieneSubItemCheckedEvent
  | SettingsChangedEvent
  | ImportPerformedEvent
  | ExportPerformedEvent;

export type HistoryEventKind = HistoryEvent['kind'];

// Payload shape for calls to appendHistory — strips the base fields 3A stamps.
// Uses a distributive conditional so `Omit` preserves the discriminated union.
export type HistoryEventInput = HistoryEvent extends infer E
  ? E extends HistoryEvent
    ? Omit<E, 'id' | 'at'>
    : never
  : never;
