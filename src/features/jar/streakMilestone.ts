/**
 * streakMilestone — payout math for daily-streak century / millennium hits.
 *
 * Rules:
 *   • Every 100 days: 10 random regular clips + 1 gold clip
 *   • Every 1000 days: 25 random regular clips + 10 gold clips
 *   • The 1000-day rule fires INSTEAD OF the 100-day rule, not on top
 *     (so day 1000 = 25 + 10, not 35 + 11).
 *
 * Hard reset: if the streak breaks, the counter zeroes. There is no
 * "restore from backup" — the next milestone is reached only by
 * accumulating fresh days.
 */

import type { ClipColor } from '../../types/clip.ts';
import { DEFAULT_CLIP_COLORS } from '../../types/clip.ts';
import type { Rng } from '../../lib/rng.ts';

export type StreakMilestoneTier = 'century' | 'millennium';

export interface StreakMilestonePayout {
  tier: StreakMilestoneTier;
  regularChips: number;
  goldChips: number;
}

/**
 * Returns the payout for a given streak value, or null if the value
 * isn't a milestone.
 */
export function streakMilestonePayout(
  streakValue: number,
): StreakMilestonePayout | null {
  if (streakValue <= 0 || !Number.isInteger(streakValue)) return null;
  if (streakValue % 1000 === 0) {
    return { tier: 'millennium', regularChips: 25, goldChips: 10 };
  }
  if (streakValue % 100 === 0) {
    return { tier: 'century', regularChips: 10, goldChips: 1 };
  }
  return null;
}

/**
 * Pick `n` random regular-clip colors using the provided RNG. Uses the
 * default 6-color palette; user-customized palettes (settings) aren't
 * surfaced here yet because the milestone reward is meant to feel
 * generously stocked rather than tuned.
 */
export function pickRandomClipColors(n: number, rng: Rng): ClipColor[] {
  const palette = DEFAULT_CLIP_COLORS;
  const out: ClipColor[] = [];
  for (let i = 0; i < n; i++) {
    out.push(palette[rng.nextInt(palette.length)]!);
  }
  return out;
}
