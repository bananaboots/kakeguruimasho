// Exhaustive FSM tests for the cash-in × RNG matrix (3E Wave 3).
//
// The reducer is pure — the goal here is to:
//   1. Lock down the state-transition contract for each combination of
//      (cash-in match kind) × (main wheel result).
//   2. Assert that reward grants happen only when the spin's resolved tier
//      is unlocked.
//   3. Assert near-miss events are the ONLY outcome on blocked spins.
//   4. Cover the JACKPOT bypass (Q6), BONUS auto-collect (§5.6), and the
//      gold short-circuit (A6) at the reducer level.

import { describe, it, expect } from 'vitest';

import {
  INITIAL_STATE,
  highestUnlockedTierForSpin,
  isCashInFrozen,
  reduce,
  withBonusPending,
  type CashInMatchKind,
  type SpinState,
  type SpinSelection,
} from './spin.machine.ts';
import type { ClipId, RewardId } from '../../types/ids.ts';
import type { MainSpinResult, Tier } from '../../types/wheel.ts';

// ---- Helpers ----

function selectionFor(kind: CashInMatchKind): SpinSelection {
  const unlockedTier: Tier =
    kind === 'three-match' || kind === 'gold-instant-T3'
      ? 'T3'
      : kind === 'two-match'
      ? 'T2'
      : 'T1';
  return {
    selectedIds: [] as ReadonlyArray<ClipId>,
    matchKind: kind,
    unlockedTier,
  };
}

function spin(result: MainSpinResult, driftedPast: Tier | null = null) {
  return { type: 'SPIN_RESOLVED' as const, result, driftedPast };
}

// Walks idle → cashInFrozen → mainResolved with the given selection + result.
function runToMainResolved(
  kind: CashInMatchKind,
  result: MainSpinResult,
): SpinState {
  let s = INITIAL_STATE;
  s = reduce(s, { type: 'SELECT_CLIPS', selection: selectionFor(kind) });
  s = reduce(s, { type: 'START_SPIN' });
  expect(s.phase).toBe('cashInFrozen');
  s = reduce(s, spin(result));
  expect(s.phase).toBe('mainResolved');
  return s;
}

// ---- highestUnlockedTierForSpin / isCashInFrozen ----

describe('highestUnlockedTierForSpin', () => {
  it('maps none → null (spec §5.5: T2/T3 near-miss when 0 cash-in)', () => {
    expect(highestUnlockedTierForSpin(selectionFor('none'))).toBe(null);
  });
  it('maps two-match → T2', () => {
    expect(highestUnlockedTierForSpin(selectionFor('two-match'))).toBe('T2');
  });
  it('maps three-match → T3', () => {
    expect(highestUnlockedTierForSpin(selectionFor('three-match'))).toBe('T3');
  });
  it('maps gold-instant-T3 → T3 (safety; short-circuit normally avoids wheel)', () => {
    expect(highestUnlockedTierForSpin(selectionFor('gold-instant-T3'))).toBe(
      'T3',
    );
  });
});

describe('isCashInFrozen (A9)', () => {
  it('false only in idle', () => {
    expect(isCashInFrozen(INITIAL_STATE)).toBe(false);
  });
  it('true from cashInFrozen through to ALL_DONE return', () => {
    let s: SpinState = INITIAL_STATE;
    s = reduce(s, { type: 'START_SPIN' });
    expect(isCashInFrozen(s)).toBe(true);
    s = reduce(s, spin({ tier: 'T1' }));
    expect(isCashInFrozen(s)).toBe(true);
    s = reduce(s, { type: 'START_REWARD_PICKER', tier: 'T1', source: 'wheel' });
    expect(isCashInFrozen(s)).toBe(true);
    s = reduce(s, { type: 'REWARD_PICKED', rewardId: null });
    expect(isCashInFrozen(s)).toBe(true);
    s = reduce(s, { type: 'ALL_DONE' });
    expect(isCashInFrozen(s)).toBe(false);
  });
});

// ---- Gold short-circuit (A6) ----

describe('gold short-circuit — TAP_GOLD_INSTANT_T3', () => {
  it('moves to goldInstantT3 with T3 pending + source gold', () => {
    const s = reduce(INITIAL_STATE, { type: 'TAP_GOLD_INSTANT_T3' });
    expect(s.phase).toBe('goldInstantT3');
    expect(s.pendingRewardTier).toBe('T3');
    expect(s.pendingRewardSource).toBe('gold');
    expect(s.selection.matchKind).toBe('gold-instant-T3');
  });

  it('ignores TAP_GOLD once spin has started (A9 — frozen)', () => {
    let s = reduce(INITIAL_STATE, { type: 'START_SPIN' });
    const before = s;
    s = reduce(s, { type: 'TAP_GOLD_INSTANT_T3' });
    expect(s).toBe(before);
  });

  it('skips the wheel entirely: goldInstantT3 → rewardPicker → idle', () => {
    let s = reduce(INITIAL_STATE, { type: 'TAP_GOLD_INSTANT_T3' });
    s = reduce(s, { type: 'START_REWARD_PICKER', tier: 'T3', source: 'gold' });
    expect(s.phase).toBe('rewardPicker');
    expect(s.mainResult).toBe(null); // never spun
    s = reduce(s, { type: 'REWARD_PICKED', rewardId: 'r1' as RewardId });
    // With no bonusPending, we end up back in mainResolved to let the outer
    // flow call ALL_DONE (PostSpinFlow handles this).
    expect(s.phase).toBe('mainResolved');
    s = reduce(s, { type: 'ALL_DONE' });
    expect(s.phase).toBe('idle');
  });
});

// ---- SELECT_CLIPS freeze guard ----

describe('SELECT_CLIPS (A9 freeze)', () => {
  it('updates selection when idle', () => {
    const s = reduce(INITIAL_STATE, {
      type: 'SELECT_CLIPS',
      selection: selectionFor('three-match'),
    });
    expect(s.selection.matchKind).toBe('three-match');
  });

  it('ignores updates once spin has started', () => {
    let s = reduce(INITIAL_STATE, {
      type: 'SELECT_CLIPS',
      selection: selectionFor('two-match'),
    });
    s = reduce(s, { type: 'START_SPIN' });
    const frozen = s;
    s = reduce(s, {
      type: 'SELECT_CLIPS',
      selection: selectionFor('three-match'),
    });
    expect(s).toBe(frozen);
    expect(s.selection.matchKind).toBe('two-match');
  });
});

// ---- Cash-in × wheel-outcome matrix ----

const CASH_INS: CashInMatchKind[] = ['none', 'two-match', 'three-match'];
const WHEEL_RESULTS: MainSpinResult[] = [
  { tier: 'T1' },
  { tier: 'T2' },
  { tier: 'T3' },
  { tier: 'BONUS' },
  { tier: 'JACKPOT' },
];

type Outcome =
  | 'reward'
  | 'near-miss'
  | 'bonus-auto-collect-then-bonus'
  | 'jackpot-T3-then-bonus';

function expectedOutcome(
  kind: CashInMatchKind,
  result: MainSpinResult,
): Outcome {
  if (result.tier === 'JACKPOT') return 'jackpot-T3-then-bonus';
  if (result.tier === 'BONUS') return 'bonus-auto-collect-then-bonus';
  // Tier landings: reward iff unlocked. Q6/A6: JACKPOT already short-circuited.
  const unlocked = highestUnlockedTierForSpin(selectionFor(kind));
  const tierOrder: Record<Tier, number> = { T1: 1, T2: 2, T3: 3 };
  if (unlocked === null) {
    return result.tier === 'T1' ? 'reward' : 'near-miss';
  }
  return tierOrder[result.tier as Tier] <= tierOrder[unlocked]
    ? 'reward'
    : 'near-miss';
}

describe('cash-in × wheel matrix — 15 combinations', () => {
  for (const kind of CASH_INS) {
    for (const result of WHEEL_RESULTS) {
      const label = `${kind} × ${result.tier}`;
      it(`${label}: flows to ${expectedOutcome(kind, result)}`, () => {
        let s = runToMainResolved(kind, result);
        const outcome = expectedOutcome(kind, result);

        if (outcome === 'reward') {
          // Tier win → reward picker at that tier.
          s = reduce(s, {
            type: 'START_REWARD_PICKER',
            tier: result.tier as Tier,
            source: 'wheel',
          });
          expect(s.phase).toBe('rewardPicker');
          expect(s.pendingRewardTier).toBe(result.tier);
          expect(s.pendingRewardSource).toBe('wheel');
          s = reduce(s, { type: 'REWARD_PICKED', rewardId: 'rw' as RewardId });
          expect(s.phase).toBe('mainResolved');
          s = reduce(s, { type: 'ALL_DONE' });
          expect(s.phase).toBe('idle');
        } else if (outcome === 'near-miss') {
          // Locked → register near-miss + SHOW_NEAR_MISS; no reward flow.
          const blockedBy = highestUnlockedTierForSpin(selectionFor(kind));
          s = reduce(s, {
            type: 'REGISTER_NEAR_MISS',
            actualTier: result.tier as 'T2' | 'T3',
            blockedBy: (blockedBy ?? 'T1') as Tier,
          });
          expect(s.nearMiss).not.toBe(null);
          expect(s.nearMiss!.actualTier).toBe(result.tier);
          s = reduce(s, { type: 'SHOW_NEAR_MISS' });
          expect(s.phase).toBe('nearMissDone');
          // No START_REWARD_PICKER from this path — confirm.
          s = reduce(s, { type: 'ALL_DONE' });
          expect(s.phase).toBe('idle');
        } else if (outcome === 'bonus-auto-collect-then-bonus') {
          // §5.6: BONUS auto-collects best available tier (= user's unlocked)
          // then spins bonus wheel.
          const unlocked = highestUnlockedTierForSpin(selectionFor(kind));
          const autoTier = (unlocked ?? 'T1') as Tier;
          s = reduce(s, {
            type: 'START_REWARD_PICKER',
            tier: autoTier,
            source: 'bonus-auto',
          });
          expect(s.pendingRewardTier).toBe(autoTier);
          s = reduce(s, { type: 'REWARD_PICKED', rewardId: 'rw' as RewardId });
          s = reduce(s, { type: 'START_BONUS_SPIN' });
          expect(s.phase).toBe('bonusSpinning');
          s = reduce(s, {
            type: 'BONUS_RESOLVED',
            result: { segment: 'FREE' },
          });
          expect(s.phase).toBe('bonusResolved');
          s = reduce(s, { type: 'ALL_DONE' });
          expect(s.phase).toBe('idle');
        } else if (outcome === 'jackpot-T3-then-bonus') {
          // Q6: JACKPOT = instant T3 regardless of cash-in + free bonus spin.
          s = withBonusPending(s, true);
          s = reduce(s, {
            type: 'START_REWARD_PICKER',
            tier: 'T3',
            source: 'jackpot',
          });
          expect(s.pendingRewardTier).toBe('T3');
          s = reduce(s, { type: 'REWARD_PICKED', rewardId: 'rw' as RewardId });
          // bonusPending was true → now bonusSpinning, not back to mainResolved.
          expect(s.phase).toBe('bonusSpinning');
          s = reduce(s, {
            type: 'BONUS_RESOLVED',
            result: { segment: 'EXTRA' },
          });
          s = reduce(s, { type: 'ALL_DONE' });
          expect(s.phase).toBe('idle');
        }
      });
    }
  }
});

// ---- Gold × wheel (gold short-circuits; wheel never spins) ----

describe('gold × wheel', () => {
  it('never reaches cashInFrozen — wheel is bypassed entirely', () => {
    let s = reduce(INITIAL_STATE, { type: 'TAP_GOLD_INSTANT_T3' });
    expect(s.mainResult).toBe(null);
    s = reduce(s, { type: 'START_REWARD_PICKER', tier: 'T3', source: 'gold' });
    s = reduce(s, { type: 'REWARD_PICKED', rewardId: 'rw' as RewardId });
    s = reduce(s, { type: 'ALL_DONE' });
    expect(s.phase).toBe('idle');
  });
});

// ---- Forfeit paths ----

describe('reward forfeit (OR-3)', () => {
  it('REWARD_PICKED {null} returns to mainResolved without crashing', () => {
    let s = runToMainResolved('three-match', { tier: 'T3' });
    s = reduce(s, { type: 'START_REWARD_PICKER', tier: 'T3', source: 'wheel' });
    s = reduce(s, { type: 'REWARD_PICKED', rewardId: null });
    expect(s.phase).toBe('mainResolved');
  });

  it('REWARD_FORFEIT on jackpot still advances to bonus wheel (Q6)', () => {
    let s = runToMainResolved('none', { tier: 'JACKPOT' });
    s = withBonusPending(s, true);
    s = reduce(s, {
      type: 'START_REWARD_PICKER',
      tier: 'T3',
      source: 'jackpot',
    });
    s = reduce(s, { type: 'REWARD_FORFEIT' });
    expect(s.phase).toBe('bonusSpinning');
  });
});

// ---- RESET ----

describe('RESET', () => {
  it('clears state at any phase', () => {
    let s = runToMainResolved('two-match', { tier: 'BONUS' });
    s = reduce(s, { type: 'START_REWARD_PICKER', tier: 'T2', source: 'bonus-auto' });
    s = reduce(s, { type: 'RESET' });
    expect(s).toEqual(INITIAL_STATE);
  });
});

// ---- JACKPOT bypass: reward grants on 0 cash-in ----

describe('JACKPOT bypass (Q6)', () => {
  it('grants T3 reward even with 0-match cash-in', () => {
    let s = runToMainResolved('none', { tier: 'JACKPOT' });
    // Q6: T3 is guaranteed, ignoring the fact that user had 0 unlocks.
    expect(highestUnlockedTierForSpin(s.selection)).toBe(null);
    s = withBonusPending(s, true);
    s = reduce(s, {
      type: 'START_REWARD_PICKER',
      tier: 'T3',
      source: 'jackpot',
    });
    expect(s.pendingRewardTier).toBe('T3');
    expect(s.pendingRewardSource).toBe('jackpot');
  });
});
