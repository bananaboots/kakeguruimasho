/**
 * spin.machine — plain reducer FSM for the cash-in & spin flow (Wave 3, 3E).
 *
 * Pure reducer (no React, no side effects). PostSpinFlow owns the async
 * choreography; this module only defines the state shape + transitions so
 * unit tests can exhaustively walk the cash-in × wheel-outcome matrix.
 *
 * States (ARCHITECTURE §7E):
 *   idle
 *     → SELECT_CLIPS / SKIP_CASH_IN                → idle (selection tracked in `selection`)
 *     → TAP_GOLD_INSTANT_T3                        → goldInstantT3
 *     → START_SPIN                                 → cashInFrozen (A9 — UI locked)
 *   cashInFrozen
 *     → SPIN_RESOLVED { result, drift* }           → mainResolved
 *   mainResolved
 *     → START_REWARD_PICKER { tier, source }       → rewardPicker
 *     → SHOW_NEAR_MISS                             → nearMissDone
 *     → START_BONUS_SPIN { auto? }                 → bonusSpinning
 *     → ALL_DONE                                   → idle
 *   goldInstantT3
 *     → START_REWARD_PICKER { tier:'T3', source:'gold' } → rewardPicker
 *   rewardPicker
 *     → REWARD_PICKED { rewardId? }                → mainResolved | bonusSpinning | idle
 *     → REWARD_FORFEIT                             → mainResolved | bonusSpinning | idle
 *   bonusSpinning
 *     → BONUS_RESOLVED { segment }                 → bonusResolved
 *   bonusResolved
 *     → ALL_DONE                                   → idle
 *   nearMissDone
 *     → ALL_DONE                                   → idle
 *
 * The reducer is minimal on purpose: it tracks enough state for PostSpinFlow
 * to render the correct UI at each step and to enforce A9 (cash-in UI
 * disabled once spin starts until `idle`). It deliberately does NOT own
 * reward-menu state or bonus-timer state — those belong to 3F and 3H.
 */

import type { BonusSpinResult, MainSpinResult, Tier } from '../../types/wheel.ts';
import type { ClipId, RewardId } from '../../types/ids.ts';

export type CashInMatchKind =
  | 'none'
  | 'two-match'
  | 'three-match'
  | 'gold-instant-T3';

/**
 * A snapshot of what the user selected for cash-in. `selectedIds` is the set
 * of clip IDs the user tapped in the picker; `matchKind` is the classification
 * computed from them (or 'none' if nothing is selected).
 */
export type SpinSelection = {
  selectedIds: ReadonlyArray<ClipId>;
  matchKind: CashInMatchKind;
  /** Highest tier unlocked by this cash-in. T1 for 'none'. */
  unlockedTier: Tier;
};

export type SpinPhase =
  | 'idle'
  | 'cashInFrozen' // A9: UI locked, wheel may or may not be mid-animation
  | 'mainResolved' // wheel stopped; figuring out what to do next
  | 'goldInstantT3' // gold short-circuit — no wheel involved
  | 'rewardPicker' // modal open
  | 'bonusSpinning'
  | 'bonusResolved'
  | 'nearMissDone'; // transient — "almost!" toast has been shown

export type RewardSource = 'wheel' | 'gold' | 'jackpot' | 'bonus-auto';

/**
 * Full FSM state. Immutable — reducer always returns a new object.
 */
export type SpinState = {
  phase: SpinPhase;
  selection: SpinSelection;
  /** Most recent main-wheel RNG result (null until we have one this cycle). */
  mainResult: MainSpinResult | null;
  /** Tier the drift passed through, or null if no drift theater. */
  driftedPast: Tier | null;
  /** The tier we're about to ask the user to pick a reward for. */
  pendingRewardTier: Tier | null;
  /** Why we're picking a reward — drives the history-event `source` field. */
  pendingRewardSource: RewardSource | null;
  /** Most recent bonus-wheel RNG result, if any. */
  bonusResult: BonusSpinResult | null;
  /** Whether the next bonus spin should be auto-triggered (JACKPOT). */
  bonusPending: boolean;
  /** Near-miss metadata for the toast / aria-live announcer. */
  nearMiss: { actualTier: 'T2' | 'T3'; blockedBy: Tier } | null;
};

export const INITIAL_SELECTION: SpinSelection = {
  selectedIds: [],
  matchKind: 'none',
  unlockedTier: 'T1',
};

export const INITIAL_STATE: SpinState = {
  phase: 'idle',
  selection: INITIAL_SELECTION,
  mainResult: null,
  driftedPast: null,
  pendingRewardTier: null,
  pendingRewardSource: null,
  bonusResult: null,
  bonusPending: false,
  nearMiss: null,
};

// ---- Events (messages) ----

export type SpinEvent =
  | { type: 'SELECT_CLIPS'; selection: SpinSelection }
  | { type: 'TAP_GOLD_INSTANT_T3' }
  | { type: 'START_SPIN' }
  | {
      type: 'SPIN_RESOLVED';
      result: MainSpinResult;
      driftedPast: Tier | null;
    }
  | {
      type: 'START_REWARD_PICKER';
      tier: Tier;
      source: RewardSource;
    }
  | { type: 'REWARD_PICKED'; rewardId: RewardId | null }
  | { type: 'REWARD_FORFEIT' } // alias for REWARD_PICKED with null
  | {
      type: 'REGISTER_NEAR_MISS';
      actualTier: 'T2' | 'T3';
      blockedBy: Tier;
    }
  | { type: 'SHOW_NEAR_MISS' }
  | { type: 'START_BONUS_SPIN' }
  | { type: 'BONUS_RESOLVED'; result: BonusSpinResult }
  | { type: 'SET_BONUS_PENDING'; pending: boolean }
  | { type: 'ALL_DONE' }
  | { type: 'RESET' };

// ---- Pure reducer ----

/**
 * Compute `highestUnlockedTier` to pass to `spinMainWheel`. This is the only
 * external read the PostSpinFlow needs to do before spinning — defined here so
 * the machine owns the mapping.
 *
 * - 'none'            → null  (truly no cash-in; spinMainWheel sees null)
 * - 'two-match'       → 'T2'
 * - 'three-match'     → 'T3'
 * - 'gold-instant-T3' → 'T3'  (shouldn't reach the wheel; included for totality)
 */
export function highestUnlockedTierForSpin(sel: SpinSelection): Tier | null {
  switch (sel.matchKind) {
    case 'none':
      return null;
    case 'two-match':
      return 'T2';
    case 'three-match':
    case 'gold-instant-T3':
      return 'T3';
  }
}

/**
 * True once the user has committed to a spin (A9 — freeze cash-in UI from
 * START_SPIN all the way back to `idle`).
 */
export function isCashInFrozen(state: SpinState): boolean {
  return state.phase !== 'idle';
}

export function reduce(state: SpinState, event: SpinEvent): SpinState {
  switch (event.type) {
    case 'RESET':
      return INITIAL_STATE;

    case 'SELECT_CLIPS':
      // Selection is only mutable while idle. A9: freeze once we've moved on.
      if (state.phase !== 'idle') return state;
      return { ...state, selection: event.selection };

    case 'TAP_GOLD_INSTANT_T3':
      if (state.phase !== 'idle') return state;
      return {
        ...state,
        phase: 'goldInstantT3',
        // gold is its own selection — mark match kind so downstream history
        // logging is accurate (source='gold').
        selection: {
          selectedIds: state.selection.selectedIds,
          matchKind: 'gold-instant-T3',
          unlockedTier: 'T3',
        },
        pendingRewardTier: 'T3',
        pendingRewardSource: 'gold',
      };

    case 'START_SPIN':
      // Must be in idle and not have pressed the gold button.
      if (state.phase !== 'idle') return state;
      return { ...state, phase: 'cashInFrozen' };

    case 'SPIN_RESOLVED':
      if (state.phase !== 'cashInFrozen') return state;
      return {
        ...state,
        phase: 'mainResolved',
        mainResult: event.result,
        driftedPast: event.driftedPast,
      };

    case 'REGISTER_NEAR_MISS':
      return {
        ...state,
        nearMiss: {
          actualTier: event.actualTier,
          blockedBy: event.blockedBy,
        },
      };

    case 'SHOW_NEAR_MISS':
      // Move to a "done" state so the outer flow can return to idle on ALL_DONE.
      if (state.phase !== 'mainResolved') return state;
      return { ...state, phase: 'nearMissDone' };

    case 'START_REWARD_PICKER':
      // Allowed from mainResolved (wheel win), goldInstantT3 (gold short-circuit),
      // or bonusResolved (only FREE path may award a reward via auto-pick — in
      // this v1 we let the caller decide, keeping the reducer permissive).
      if (
        state.phase !== 'mainResolved' &&
        state.phase !== 'goldInstantT3' &&
        state.phase !== 'bonusResolved'
      ) {
        return state;
      }
      return {
        ...state,
        phase: 'rewardPicker',
        pendingRewardTier: event.tier,
        pendingRewardSource: event.source,
      };

    case 'REWARD_PICKED':
    case 'REWARD_FORFEIT': {
      if (state.phase !== 'rewardPicker') return state;
      // If a bonus spin is still pending (JACKPOT: T3 reward → free bonus
      // spin), next step is bonusSpinning. Otherwise, check if we should go
      // back to mainResolved (BONUS — auto-collect then bonus wheel) or idle.
      if (state.bonusPending) {
        return {
          ...state,
          phase: 'bonusSpinning',
          pendingRewardTier: null,
          pendingRewardSource: null,
          bonusPending: false,
        };
      }
      return {
        ...state,
        phase: 'mainResolved',
        pendingRewardTier: null,
        pendingRewardSource: null,
      };
    }

    case 'START_BONUS_SPIN':
      if (
        state.phase !== 'mainResolved' &&
        state.phase !== 'bonusResolved' // EXTRA chain — caller can re-trigger
      ) {
        return state;
      }
      return { ...state, phase: 'bonusSpinning', bonusPending: false };

    case 'BONUS_RESOLVED':
      if (state.phase !== 'bonusSpinning') return state;
      return {
        ...state,
        phase: 'bonusResolved',
        bonusResult: event.result,
      };

    case 'SET_BONUS_PENDING':
      return { ...state, bonusPending: event.pending };

    case 'ALL_DONE':
      // Terminal — fully reset to idle. Selection is cleared so the next
      // spin starts from zero (clips have already been returned to bag by
      // `actions.cashInClips`).
      return INITIAL_STATE;
  }
}

/**
 * Helper used by PostSpinFlow to mark "this spin has a free bonus spin
 * queued" on JACKPOT landings. Not a reduce() event because it's an
 * auxiliary bit that runs alongside START_REWARD_PICKER.
 */
export function withBonusPending(state: SpinState, pending: boolean): SpinState {
  return { ...state, bonusPending: pending };
}
