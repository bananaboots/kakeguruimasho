/**
 * Visual slice catalogues for the main + bonus wheels.
 *
 * The wheel ENGINE (wheel.engine.ts) deals in 5-tier outcomes — these
 * sequences are how the canvas turns those outcomes into the dense,
 * many-sliced visual the design calls for. Every entry is one wedge.
 *
 * Sequences are copied verbatim from the design source at
 * /tmp/design1/kakeguruimasho/project/pachinko.jsx (PachinkoWheel, line 308)
 * and pachinko-screens.jsx (PachinkoBonusWheel, line 957).
 *
 * Mapping policy: when the orchestrator says "T2", we land on the FIRST
 * slice in MAIN_WHEEL_SLICE_SEQUENCE whose tier is 'II'. This is a
 * deterministic, low-effort choice; it produces a believable spin without
 * requiring the orchestrator to know about visual slices.
 */

import type { BonusSegment, MainWheelTier } from '../../types/wheel.ts';

export type MainSliceTier = 'I' | 'II' | 'III' | 'BONUS' | 'JP';
export type BonusSlicePrize = 'sm' | 'md' | 'lg' | 'x2' | 'free';

export const MAIN_WHEEL_SLICE_SEQUENCE: readonly MainSliceTier[] = [
  'I','II','I','III','I','II','I','III','BONUS','I',
  'II','I','III','I','II','I','III','I','II','JP',
  'I','III','I','II','I','III','I','II','BONUS','I',
  'II','I','III','I','II','I','III','I','II','I',
  'III','I','II','III','I','BONUS','I','II','I','III',
] as const;

export const BONUS_WHEEL_SLICE_SEQUENCE: readonly BonusSlicePrize[] = [
  'sm','md','sm','lg','sm','md','sm','x2','sm','md',
  'lg','sm','free','sm','md','sm','lg','sm','x2','md',
  'sm','lg','md','free',
] as const;

const MAIN_TIER_TO_SLICE_TIER: Record<MainWheelTier, MainSliceTier> = {
  T1: 'I',
  T2: 'II',
  T3: 'III',
  BONUS: 'BONUS',
  JACKPOT: 'JP',
};

export function mainTierToVisualSlice(tier: MainWheelTier): number {
  const target = MAIN_TIER_TO_SLICE_TIER[tier];
  const idx = MAIN_WHEEL_SLICE_SEQUENCE.indexOf(target);
  if (idx < 0) {
    throw new Error(`No visual slice found for tier ${tier}`);
  }
  return idx;
}

const BONUS_SEGMENT_TO_SLICE: Record<BonusSegment, BonusSlicePrize> = {
  // engine segment → visual category
  PCT_25: 'sm',
  PCT_50: 'md',
  PCT_75: 'lg',
  FREE: 'free',
  EXTRA: 'x2', // "extra spin" doubles down — visually treat as multiplier
};

export function bonusSegmentToVisualSlice(segment: BonusSegment): number {
  const target = BONUS_SEGMENT_TO_SLICE[segment];
  const idx = BONUS_WHEEL_SLICE_SEQUENCE.indexOf(target);
  if (idx < 0) {
    throw new Error(`No visual slice found for bonus segment ${segment}`);
  }
  return idx;
}
