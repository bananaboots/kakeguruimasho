// Jar types (§5.9, D1).
// ARCHITECTURE §3 — jar.ts.

import type { ISOTimestamp, JarId, MilestoneId } from './ids.ts';

export type Milestone = {
  id: MilestoneId;
  label: string; // user-entered ("Hawaii upgrade")
  target: number; // dollar threshold; $1 per clip (spec §5.9, A10)
};

// null = not yet claimed. Non-null means user has redeemed the milestone IRL.
export type MilestoneClaim = {
  claimedAt: ISOTimestamp;
} | null;

export type JarState = {
  jarId: JarId;
  total: number; // running $, never resets on mini/mid claim (D1)
  milestones: Record<MilestoneId, Milestone>; // all three are always present, edited by user
  claimed: Record<MilestoneId, MilestoneClaim>; // D1: set non-null on user claim action
  // Moonshot claim triggers full-jar-reset flow (`resetJar`).
};
