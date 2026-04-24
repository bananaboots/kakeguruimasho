// Branded IDs for nominal typing.
// ARCHITECTURE §3 — ids.ts.

export type JarId = string & { readonly __brand: 'JarId' };
export type HabitId = string & { readonly __brand: 'HabitId' };
export type RewardId = string & { readonly __brand: 'RewardId' };
export type ClipId = string & { readonly __brand: 'ClipId' };
export type EventId = string & { readonly __brand: 'EventId' };
export type BonusTimerId = string & { readonly __brand: 'BonusTimerId' };

export type MilestoneId = 'mini' | 'mid' | 'moonshot';

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
export function asISO(raw: string): ISOTimestamp {
  return raw as ISOTimestamp;
}
export function asLocalDate(raw: string): LocalDate {
  return raw as LocalDate;
}
