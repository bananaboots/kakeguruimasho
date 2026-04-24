// Branded IDs for nominal typing.
// ARCHITECTURE §3 — ids.ts.

export type JarId = string & { readonly __brand: 'JarId' };
export type HabitId = string & { readonly __brand: 'HabitId' };
export type RewardId = string & { readonly __brand: 'RewardId' };
export type ClipId = string & { readonly __brand: 'ClipId' };
export type EventId = string & { readonly __brand: 'EventId' };
export type BonusTimerId = string & { readonly __brand: 'BonusTimerId' };

// Milestone IDs used to be a fixed `'mini' | 'mid' | 'moonshot'` union.
// Since Phase 7 the three canonical IDs below still always exist on every
// jar, but users can add any number of extra intermediate milestones with
// generated IDs. Only `MOONSHOT_MILESTONE_ID` triggers the reset-on-claim
// flow; all others are checkpoint-only.
export type MilestoneId = string & { readonly __brand: 'MilestoneId' };
export const MINI_MILESTONE_ID = 'mini' as MilestoneId;
export const MID_MILESTONE_ID = 'mid' as MilestoneId;
export const MOONSHOT_MILESTONE_ID = 'moonshot' as MilestoneId;
export const DEFAULT_MILESTONE_IDS: readonly MilestoneId[] = [
  MINI_MILESTONE_ID,
  MID_MILESTONE_ID,
  MOONSHOT_MILESTONE_ID,
];
/** True for the three canonical milestones that can be edited but not removed. */
export function isDefaultMilestone(id: MilestoneId): boolean {
  return (
    id === MINI_MILESTONE_ID ||
    id === MID_MILESTONE_ID ||
    id === MOONSHOT_MILESTONE_ID
  );
}

export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };
// LocalDate: "YYYY-MM-DD" in device-local TZ (A8).
export type LocalDate = string & { readonly __brand: 'LocalDate' };

// D4: v1 seeds exactly one jar with this canonical ID.
export const DEFAULT_JAR_ID = 'default' as JarId;

// ---- Helpers for branding at trusted boundaries ----

export function asJarId(raw: string): JarId {
  return raw as JarId;
}
export function asHabitId(raw: string): HabitId {
  return raw as HabitId;
}
export function asRewardId(raw: string): RewardId {
  return raw as RewardId;
}
export function asClipId(raw: string): ClipId {
  return raw as ClipId;
}
export function asEventId(raw: string): EventId {
  return raw as EventId;
}
export function asBonusTimerId(raw: string): BonusTimerId {
  return raw as BonusTimerId;
}
export function asMilestoneId(raw: string): MilestoneId {
  return raw as MilestoneId;
}
export function asISO(raw: string): ISOTimestamp {
  return raw as ISOTimestamp;
}
export function asLocalDate(raw: string): LocalDate {
  return raw as LocalDate;
}
