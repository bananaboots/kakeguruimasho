// Near-miss theater — D3 canon.
//
// Per DECISIONS D3 (superseding spec §5.6's narrow Option A):
//   "Every spin that does NOT land on the user's highest-unlocked tier
//    must visually drift past at least one *locked* tier before settling
//    on its actual segment."
//
// Rules we encode:
// 1. Ground truth is `resolvedSegment`. Animation always ends there.
// 2. A "losing spin" = resolved tier !== the user's highest unlocked reward tier.
//    (BONUS and JACKPOT are not losses; JACKPOT is always a win by D-Q6,
//    BONUS auto-collects current best tier.)
// 3. Pick a *locked* tier (T1/T2/T3 the user could not have cashed in for)
//    to drift PAST. If nothing is locked (3-match cash-in AND resolved the
//    top tier), no drift.
// 4. Winning spins on a sub-top tier ALSO drift, per D3's "clean T1 win with
//    0-cash-in still brushes past a locked tier."
//
// The function returns a segment INDEX or null. WheelCanvas decides how
// to choreograph the drift (overshoot, stop-one-past, etc).

import type { Tier, MainSpinResult, MainWheelTier } from '../../types/wheel.ts';
import {
  MAIN_WHEEL_SEGMENT_ORDER,
  mainSegmentIndex,
} from './wheel.engine.ts';

/**
 * Is this main-spin result a "losing spin" relative to the user's cash-in?
 *
 * Definition here matches D3's spirit: a spin that doesn't land on the
 * user's highest-unlocked reward tier. Counts:
 *   - T1 result while user had 2-match (T2 unlocked) → losing (drifted past T2)
 *   - T2 result while user had 3-match (T3 unlocked) → losing (drifted past T3)
 *   - T3 result with 3-match → winning on top → no drift required by D3
 *     but per D3 "clean T1 win with 0-cash-in brushes past locked tier"
 *     means we still want theater when ANY tier is locked. See `pickDriftTarget`.
 *   - BONUS / JACKPOT → not a "tier" outcome, no drift (they're auto-wins).
 */
export function isLosingSpin(
  result: MainSpinResult,
  highestUnlockedTier: Tier | null,
): boolean {
  // BONUS/JACKPOT are wins regardless of cash-in (spec §5.6).
  if (result.tier === 'BONUS' || result.tier === 'JACKPOT') return false;

  // If nothing is unlocked, only a T1 "win" is a real win; T2/T3 results are
  // blocked near-misses (spec-level near_miss; state-layer emits `near_miss`).
  if (highestUnlockedTier === null) {
    return result.tier !== 'T1';
  }

  // With unlock, a spin that hit a lower tier than what was unlocked is a loss
  // only in the dopamine sense — it's still a real payout. We treat it as
  // "losing relative to top" to trigger theater.
  return result.tier !== highestUnlockedTier;
}

/**
 * Compute which tiers are locked for this spin given the user's cash-in.
 *   highestUnlockedTier === null  → T2, T3 locked (T1 only per §5.5)
 *   highestUnlockedTier === 'T1'  → T2, T3 locked (treat T1 alone same as null
 *                                   — 0-cash-in == T1-only — kept explicit for clarity)
 *   highestUnlockedTier === 'T2'  → T3 locked
 *   highestUnlockedTier === 'T3'  → nothing locked
 */
export function lockedTiers(highestUnlockedTier: Tier | null): Tier[] {
  if (highestUnlockedTier === null) return ['T2', 'T3'];
  if (highestUnlockedTier === 'T1') return ['T2', 'T3'];
  if (highestUnlockedTier === 'T2') return ['T3'];
  return [];
}

/**
 * Choose which locked tier to drift PAST for this spin.
 *
 * Heuristic:
 * - Prefer the tier ADJACENT (on the wheel) to the resolved segment, so the
 *   animation reads as "almost got the bigger one." If multiple locked tiers
 *   are adjacent, prefer the HIGHER-reward one — more dopamine.
 * - If none are adjacent, pick the highest locked tier (most desirable).
 *
 * Returns null if no locked tiers exist (3-match cash-in).
 */
function pickLockedTierToDrift(
  resolvedTier: MainWheelTier,
  highestUnlockedTier: Tier | null,
): Tier | null {
  const locked = lockedTiers(highestUnlockedTier);
  if (locked.length === 0) return null;

  const resolvedIdx = mainSegmentIndex(resolvedTier);
  const N = MAIN_WHEEL_SEGMENT_ORDER.length;

  // Rank candidates by "tier-value desirability" first (T3 > T2 > T1).
  const byDesirability: Tier[] = [...locked].sort((a, b) => {
    const order: Record<Tier, number> = { T1: 1, T2: 2, T3: 3 };
    return order[b] - order[a];
  });

  // Among the most-desirable locked tiers, prefer the one adjacent to the
  // resolved index on the wheel circle — either direction counts.
  for (const t of byDesirability) {
    const idx = mainSegmentIndex(t);
    const circDist = Math.min(
      Math.abs(idx - resolvedIdx),
      N - Math.abs(idx - resolvedIdx),
    );
    if (circDist === 1) return t;
  }

  // Fallback: the most desirable locked tier, no adjacency.
  return byDesirability[0] ?? null;
}

/**
 * Decide whether to drift (D3) and which segment index to drift past.
 *
 * Returns:
 *   - `{ driftedPast: Tier, driftIndex: number }` → animate a pass through
 *     that segment before settling on the resolved one.
 *   - `null` → straight deceleration to resolved; no theater.
 *
 * Invariants guaranteed:
 *   - Never returns an index equal to the resolved index. The ONLY way to
 *     "drift past" is through a segment we aren't ending on.
 *   - Never drifts when nothing is locked OR when the spin resolves to a tier
 *     that the user couldn't otherwise have reached (BONUS/JACKPOT — already
 *     winning experiences; theater would muddy the big moment).
 */
export function chooseNearMissDrift(args: {
  resolved: MainSpinResult;
  highestUnlockedTier: Tier | null;
}): { driftedPast: Tier; driftIndex: number } | null {
  const { resolved, highestUnlockedTier } = args;

  // BONUS/JACKPOT: clean celebration moment, no drift.
  if (resolved.tier === 'BONUS' || resolved.tier === 'JACKPOT') return null;

  const drifted = pickLockedTierToDrift(resolved.tier, highestUnlockedTier);
  if (drifted === null) return null;

  const driftIndex = mainSegmentIndex(drifted);
  const resolvedIdx = mainSegmentIndex(resolved.tier);

  // Safety: if by construction we would drift past the same segment we resolve
  // on, skip (should never happen — locked tiers can't include the resolved
  // tier when highestUnlockedTier forbids it — but defensive).
  if (driftIndex === resolvedIdx) return null;

  return { driftedPast: drifted, driftIndex };
}
