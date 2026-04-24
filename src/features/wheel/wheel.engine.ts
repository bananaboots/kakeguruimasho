// Wheel Engine — pure RNG resolution for main + bonus wheels.
// ARCHITECTURE §7C. Spec §5.6 / §5.7. Decisions: D3 (near-miss theater
// is animation-only — engine is pure), D5 (mercyChance is a v1.1 stub
// that MUST throw in v1 — Risk R11).
//
// Ground truth invariant: `resolve*Spin` is the canonical outcome. Animation
// (WheelCanvas) consumes this result and tells a story; it never overrides it.

import type { Rng } from '../../lib/rng.ts';
import type {
  BonusSegment,
  BonusSpinResult,
  MainSpinResult,
  MainWheelTier,
  WheelConfig,
} from '../../types/wheel.ts';

// Main wheel segment order = display order around the wheel (12 o'clock CW).
// Spec §5.6 lays them out as T1/T2/T3/BONUS/JACKPOT; we mirror that as a
// canonical visual layout. Animation code consumes this ordering.
export const MAIN_WHEEL_SEGMENT_ORDER: readonly MainWheelTier[] = [
  'T1',
  'T2',
  'T3',
  'BONUS',
  'JACKPOT',
] as const;

// Bonus wheel segment order matches the PDF (page 4): FREE / 50 / 75 / 25 / EXTRA
// arranged so adjacent sizes vary. We keep a stable order so tests + visuals agree.
export const BONUS_WHEEL_SEGMENT_ORDER: readonly BonusSegment[] = [
  'PCT_75',
  'PCT_50',
  'PCT_25',
  'FREE',
  'EXTRA',
] as const;

// Sum-to-one tolerance. WheelConfig weights are edited live in Settings;
// we normalize if slightly off (rounding drift) and throw if off by more
// than this — the editor normalizes on save (A16), so crossing this threshold
// means the config is corrupt / hand-edited incorrectly.
const WEIGHT_SUM_EPSILON = 1e-6;
const WEIGHT_SUM_HARD_FAIL = 0.01; // 1%

/** Throw if any weight is negative / NaN / Infinity. */
function assertFiniteNonNegative(
  weights: Record<string, number>,
  label: string,
): void {
  for (const key of Object.keys(weights)) {
    const v = weights[key];
    if (v === undefined || !Number.isFinite(v) || v < 0) {
      throw new Error(
        `WheelConfig.${label}[${key}] must be a finite non-negative number, got ${String(v)}`,
      );
    }
  }
}

/**
 * Normalize weights to sum to 1.0.
 *
 * Policy (documented for Wave 2 testers):
 * - If sum is within ±WEIGHT_SUM_EPSILON of 1, return as-is.
 * - If sum is within ±WEIGHT_SUM_HARD_FAIL (1%), re-normalize silently.
 *   This covers rounding drift from the Settings editor (A16).
 * - Otherwise throw — config is corrupt.
 * - Sum of zero throws (undefined distribution).
 */
function normalizeWeights<K extends string>(
  weights: Record<K, number>,
  label: string,
): Record<K, number> {
  assertFiniteNonNegative(weights as Record<string, number>, label);
  const entries = Object.entries(weights) as [K, number][];
  const sum = entries.reduce((acc, [, v]) => acc + v, 0);
  if (sum <= 0) {
    throw new Error(
      `WheelConfig.${label} weights sum to ${sum}; at least one weight must be positive`,
    );
  }
  if (Math.abs(sum - 1) <= WEIGHT_SUM_EPSILON) {
    return weights;
  }
  if (Math.abs(sum - 1) > WEIGHT_SUM_HARD_FAIL) {
    throw new Error(
      `WheelConfig.${label} weights sum to ${sum}; must be ~1.0 (tolerance ${WEIGHT_SUM_HARD_FAIL}). Editor should normalize on save (A16).`,
    );
  }
  const out = {} as Record<K, number>;
  for (const [k, v] of entries) out[k] = v / sum;
  return out;
}

/**
 * Pick one key from a weight map using a seeded RNG.
 *
 * Iteration order matches MAIN_WHEEL_SEGMENT_ORDER / BONUS_WHEEL_SEGMENT_ORDER
 * when the caller passes ordered arrays; for raw Records we use Object.keys.
 * Because JS Object keys are insertion-ordered and the config is built from
 * defaults which preserve declared order, the distribution is deterministic
 * under a fixed seed.
 */
function pickWeighted<K extends string>(
  weights: Record<K, number>,
  order: readonly K[],
  rng: Rng,
): K {
  // Caller is responsible for normalization.
  const r = rng.next(); // [0, 1)
  let acc = 0;
  for (const key of order) {
    acc += weights[key];
    if (r < acc) return key;
  }
  // Floating-point belt-and-suspenders: if `r` lies in the tiny gap caused by
  // rounding the cumulative sum below 1, return the last segment.
  return order[order.length - 1] as K;
}

/**
 * D5 guard. v1.1 will consume `mercyChance` to convert a sub-threshold roll
 * into a "pity" tier payout. In v1 it MUST NOT be read — any non-zero value
 * means someone turned on a v1.1 setting that doesn't exist yet.
 *
 * Fails loud so tests (Risk R11) catch it immediately.
 */
function assertMercyDisabled(cfg: WheelConfig): void {
  if (cfg.mercyChance !== 0) {
    throw new Error('mercy unimplemented in v1');
  }
}

/**
 * Resolve a single main-wheel spin. Pure function. Ground truth for what
 * the wheel "lands on" per spec §5.6. Near-miss animation is layered on top
 * by `near-miss.ts` + `WheelCanvas.tsx`; this function knows nothing about it.
 */
export function resolveMainSpin(cfg: WheelConfig, rng: Rng): MainSpinResult {
  assertMercyDisabled(cfg);
  const weights = normalizeWeights(cfg.weights, 'weights');
  const tier = pickWeighted(weights, MAIN_WHEEL_SEGMENT_ORDER, rng);
  return { tier };
}

/**
 * Resolve a single bonus-wheel spin. Pure.
 *
 * Returned shape matches `BonusSpinResult` — PCT_* carry a `percent` field
 * so consumers don't re-derive. FREE + EXTRA are tagless.
 */
export function resolveBonusSpin(cfg: WheelConfig, rng: Rng): BonusSpinResult {
  assertMercyDisabled(cfg);
  const weights = normalizeWeights(cfg.bonusWeights, 'bonusWeights');
  const segment = pickWeighted(weights, BONUS_WHEEL_SEGMENT_ORDER, rng);
  switch (segment) {
    case 'PCT_75':
      return { segment: 'PCT_75', percent: 75 };
    case 'PCT_50':
      return { segment: 'PCT_50', percent: 50 };
    case 'PCT_25':
      return { segment: 'PCT_25', percent: 25 };
    case 'FREE':
      return { segment: 'FREE' };
    case 'EXTRA':
      return { segment: 'EXTRA' };
  }
}

// ---- Index lookups (used by WheelCanvas + near-miss theater) ----

/** Find the visual segment index for a given main wheel tier. */
export function mainSegmentIndex(tier: MainWheelTier): number {
  const i = MAIN_WHEEL_SEGMENT_ORDER.indexOf(tier);
  if (i < 0) throw new Error(`Unknown main wheel tier: ${tier}`);
  return i;
}

/** Find the visual segment index for a bonus wheel segment. */
export function bonusSegmentIndex(segment: BonusSegment): number {
  const i = BONUS_WHEEL_SEGMENT_ORDER.indexOf(segment);
  if (i < 0) throw new Error(`Unknown bonus wheel segment: ${segment}`);
  return i;
}
