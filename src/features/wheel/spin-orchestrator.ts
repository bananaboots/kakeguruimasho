// Imperative spin helpers for 3E's spin FSM to consume.
//
// These thread the pure engine into the store's action surface:
//  - resolve RNG (ground truth — R3, D3)
//  - log `near_miss_theater` eagerly via `appendHistory` for every drifted spin
//  - spawn bonus timer if the bonus spin landed on PCT_*
//  - caller-facing Promise resolves as soon as the result is committed (3E
//    still renders <WheelCanvas /> with the result and calls `logMainSpin`
//    once `onAnimationComplete` fires — ground-truth vs animation split).
//
// Why not log `main_spin` here?
//   Per R3/D3, the history's "main_spin" event should be keyed to the user
//   actually seeing the result (animation settled). 3E owns that moment and
//   calls `actions.logMainSpin` from its canvas onAnimationComplete. We only
//   log theater-level events that have already happened here.

import type {
  BonusSpinResult,
  MainSpinResult,
  Tier,
  WheelConfig,
} from '../../types/wheel.ts';
import type { JarId } from '../../types/ids.ts';
import type { Rng } from '../../lib/rng.ts';

import { resolveBonusSpin, resolveMainSpin } from './wheel.engine.ts';
import { chooseNearMissDrift } from './near-miss.ts';

/**
 * Minimal action surface this module needs. Mirrors the subset of
 * 3A's `Actions` type we consume — pass `store.getState().actions`
 * at call site to avoid a cross-module dependency cycle.
 */
export type SpinActions = {
  appendHistory: (evt: {
    jarId: JarId;
    kind: 'near_miss_theater';
    driftedPast: Tier;
  }) => void;
  spawnBonusTimer: (
    jarId: JarId,
    result: Extract<BonusSpinResult, { segment: 'PCT_75' | 'PCT_50' | 'PCT_25' }>,
  ) => unknown;
};

export type SpinMainWheelOpts = {
  cfg: WheelConfig;
  highestUnlockedTier: Tier | null;
  rng: Rng;
  actions: SpinActions;
  jarId: JarId;
};

export type SpinMainWheelOutcome = {
  /** The canonical RNG result. Ground truth for animation target. */
  result: MainSpinResult;
  /**
   * Optional D3 drift index (into MAIN_WHEEL_SEGMENT_ORDER). Passed to
   * WheelCanvas as `nearMissDriftIndex`. `null` when no theater is warranted.
   */
  driftIndex: number | null;
  /** The tier the drift passed through, or null if no drift. */
  driftedPast: Tier | null;
};

/**
 * Imperative main-wheel spin: resolves RNG, decides D3 drift theater,
 * emits the `near_miss_theater` history event if applicable.
 *
 * Returns a Promise (matches architect's contract) but resolves synchronously
 * after state commit — animation is rendered separately by 3E.
 */
export async function spinMainWheel(
  opts: SpinMainWheelOpts,
): Promise<SpinMainWheelOutcome> {
  const { cfg, highestUnlockedTier, rng, actions, jarId } = opts;

  const result = resolveMainSpin(cfg, rng);
  const drift = chooseNearMissDrift({ resolved: result, highestUnlockedTier });

  if (drift !== null) {
    actions.appendHistory({
      jarId,
      kind: 'near_miss_theater',
      driftedPast: drift.driftedPast,
    });
  }

  return {
    result,
    driftIndex: drift?.driftIndex ?? null,
    driftedPast: drift?.driftedPast ?? null,
  };
}

export type SpinBonusWheelOpts = {
  cfg: WheelConfig;
  rng: Rng;
  actions: SpinActions;
  jarId: JarId;
};

export type SpinBonusWheelOutcome = {
  result: BonusSpinResult;
};

/**
 * Imperative bonus-wheel spin: resolves RNG + spawns timer if PCT_*.
 *
 * FREE and EXTRA don't spawn timers:
 *   - FREE: 3E awards a clip directly (spec §5.7).
 *   - EXTRA: 3E re-triggers spinBonusWheel twice (chain) per spec §5.7.
 *     The chain depth is managed by 3E's state machine; engine just returns
 *     the segment.
 */
export async function spinBonusWheel(
  opts: SpinBonusWheelOpts,
): Promise<SpinBonusWheelOutcome> {
  const { cfg, rng, actions, jarId } = opts;
  const result = resolveBonusSpin(cfg, rng);

  if (
    result.segment === 'PCT_75' ||
    result.segment === 'PCT_50' ||
    result.segment === 'PCT_25'
  ) {
    actions.spawnBonusTimer(jarId, result);
  }

  return { result };
}
