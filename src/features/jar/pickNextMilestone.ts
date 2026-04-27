/**
 * pickNextMilestoneId — select the next-up milestone for a jar.
 *
 * Used by both PachinkoPotMini (lantern jar) and KowloonPotMini
 * (token tray) to display the same "next milestone" indicator
 * regardless of theme. Deterministic ordering: sort milestones by
 * target ascending, return the first whose target exceeds the
 * current total; falls back to the highest milestone if all are
 * already cleared.
 */

import type { MilestoneId } from '../../types/ids.ts';

export function pickNextMilestoneId(
  jar:
    | {
        milestones: Record<MilestoneId, { target: number } | undefined>;
        claimed: Record<MilestoneId, unknown>;
      }
    | undefined,
  total: number,
): MilestoneId | null {
  if (!jar) return null;
  const ids = Object.keys(jar.milestones) as MilestoneId[];
  const unclaimed = ids
    .filter((id) => {
      const m = jar.milestones[id];
      return !!m && m.target > 0 && jar.claimed[id] == null;
    })
    .sort((a, b) => jar.milestones[a]!.target - jar.milestones[b]!.target);
  if (unclaimed.length === 0) return null;
  const ahead = unclaimed.find((id) => jar.milestones[id]!.target > total);
  return ahead ?? unclaimed[unclaimed.length - 1] ?? null;
}
