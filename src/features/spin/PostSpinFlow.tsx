/**
 * PostSpinFlow — orchestrator for everything that happens after the user
 * taps Spin (or the gold short-circuit button). Wave 3, 3E.
 *
 * It composes:
 *   - 3B's hand/bag (via 3A actions)
 *   - 3C's `spinMainWheel` / `spinBonusWheel` + <WheelCanvas>
 *   - 3F's `openRewardPicker(tier)` modal
 *
 * Responsibilities mapped to the 3E brief:
 *   1. Cash-in gates tier — compute `highestUnlockedTier` from the current
 *      SpinSelection before calling `spinMainWheel` (§5.5).
 *   2. A9 freeze — once START_SPIN fires, cash-in UI stays disabled until
 *      `idle`.
 *   3. JACKPOT = instant T3 + free bonus spin (Q6) — bypasses gating.
 *   4. BONUS auto-collect — picks a reward from the user's best-available
 *      tier (T1 for 0-match, T2 for 2-match, T3 for 3-match), then bonus wheel.
 *   5. Cashed-in clips return to bag (A7) — handled by `actions.cashInClips`
 *      in the jars slice. Gold short-circuit calls `returnClipsToBag`
 *      directly for its one gold clip.
 *   6. Near-miss (locked tier) — log `near_miss` history event, show a
 *      toast, do not grant a reward.
 *   7. Accessibility — aria-live="polite" announcements for spin / reward /
 *      near-miss transitions.
 *   8. Animation/RNG split — `spinMainWheel` resolves RNG immediately; we
 *      pass the resulting `targetSegmentIndex` + `nearMissDriftIndex` to
 *      <WheelCanvas> and proceed on its `onAnimationComplete`. We call
 *      `actions.logMainSpin` there (per 3C's notes).
 */

import {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { useAppStore } from '../../state/store.ts';
import type { Store } from '../../state/store.ts';
import { selectHand } from '../../state/selectors.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import type { ClipId, JarId, RewardId } from '../../types/ids.ts';
import type { MainWheelTier, Tier } from '../../types/wheel.ts';
import type { MainSpinResult, WheelConfig } from '../../types/wheel.ts';

import {
  WheelCanvas,
  BonusWheelCanvas,
  spinMainWheel,
  spinBonusWheel,
  mainSegmentIndex,
  bonusSegmentIndex,
} from '../wheel/index.ts';
import { openRewardPicker } from '../rewards/openRewardPicker.tsx';
import { rng as getRng } from '../../lib/rng.ts';
import { useToast } from '../../ui/toast-context.ts';

import { CashInPicker } from './CashInPicker.tsx';
import { HandView } from './HandView.tsx';
import { SpinButton } from './SpinButton.tsx';
import { GoldInstantT3Button } from './GoldInstantT3Button.tsx';
import {
  INITIAL_STATE,
  highestUnlockedTierForSpin,
  isCashInFrozen,
  reduce,
  type SpinSelection,
} from './spin.machine.ts';

import './spin.css';

export type PostSpinFlowProps = {
  jarId?: JarId;
};

/** Map a MainWheelTier to its index in the canvas's segment order. */
function indexForTier(tier: MainWheelTier): number {
  return mainSegmentIndex(tier);
}

/** Map Tier → numeric ordering. */
const TIER_ORDER: Record<Tier, number> = { T1: 1, T2: 2, T3: 3 };

/** Is `resolvedTier` accessible given `unlocked`? */
function isUnlocked(
  resolvedTier: MainWheelTier,
  unlocked: Tier | null,
): boolean {
  if (resolvedTier === 'BONUS' || resolvedTier === 'JACKPOT') return true;
  if (unlocked === null) return resolvedTier === 'T1';
  return TIER_ORDER[resolvedTier as Tier] <= TIER_ORDER[unlocked];
}

/** "Best available tier" for BONUS auto-collect (§5.6). */
function bestAvailableTier(unlocked: Tier | null): Tier {
  return unlocked ?? 'T1';
}

export function PostSpinFlow({
  jarId = DEFAULT_JAR_ID,
}: PostSpinFlowProps): ReactElement {
  const hand = useAppStore((s) => selectHand(s, jarId));
  const wheelConfig = useAppStore(
    (s: Store): WheelConfig => s.wheelConfigs[jarId]!,
  );
  const actions = useAppStore((s: Store) => s.actions);
  const { toast } = useToast();

  const [state, dispatch] = useReducer(reduce, INITIAL_STATE);
  // Ground-truth drift/target indices to hand to <WheelCanvas>. Set when
  // spinMainWheel resolves; cleared when the flow returns to idle.
  const [pendingSpin, setPendingSpin] = useState<{
    targetIndex: number;
    driftIndex: number | null;
    result: MainSpinResult;
    unlockedTier: Tier | null;
  } | null>(null);
  const [pendingBonus, setPendingBonus] = useState<{
    segmentIndex: number;
    result: import('../../types/wheel.ts').BonusSpinResult;
  } | null>(null);
  // Resolver fired by the bonus canvas's onAnimationComplete. Lets callers
  // `await` the canvas settle. Kept in a ref because we re-create it each
  // bonus spin.
  const bonusCompleteResolver = useRef<(() => void) | null>(null);

  // aria-live announcement text — single source for the polite announcer.
  const [announcement, setAnnouncement] = useState<string>('');

  // A9 freeze across the whole non-idle lifetime.
  const frozen = isCashInFrozen(state);

  // ---- Selection ----

  const handleSelectionChange = useCallback(
    (next: SpinSelection) => {
      if (frozen) return;
      dispatch({ type: 'SELECT_CLIPS', selection: next });
    },
    [frozen],
  );

  // ---- GOLD short-circuit (A6, A7) ----

  const handleRedeemGold = useCallback(
    async (goldClipId: ClipId) => {
      if (frozen) return;
      // FSM: enter goldInstantT3 with source='gold'
      dispatch({ type: 'TAP_GOLD_INSTANT_T3' });
      setAnnouncement('Gold redeemed — pick a Tier 3 reward.');

      // A7: return the one gold clip to the bag.
      actions.returnClipsToBag(jarId, [goldClipId]);

      // Open the picker BEFORE advancing the reducer to rewardPicker so the
      // promise is already registered. Then transition into rewardPicker so
      // the wheel UI stays hidden.
      dispatch({ type: 'START_REWARD_PICKER', tier: 'T3', source: 'gold' });
      const rewardId = await openRewardPicker('T3');

      actions.appendHistory({
        kind: 'reward_claimed',
        jarId,
        rewardId,
        tier: 'T3',
        source: 'gold',
      });

      dispatch({
        type: 'REWARD_PICKED',
        rewardId: rewardId as RewardId | null,
      });
      dispatch({ type: 'ALL_DONE' });
      setAnnouncement(
        rewardId !== null
          ? 'Tier 3 reward claimed.'
          : 'Tier 3 reward forfeited.',
      );
    },
    [frozen, actions, jarId],
  );

  // ---- SPIN (main wheel) ----

  const runSpinFlow = useCallback(async () => {
    // 1. Commit cash-in to the store (returns clips to bag, emits cash_in).
    const selectedIds: ClipId[] = [...state.selection.selectedIds];
    const cashInResult = actions.cashInClips(jarId, selectedIds);

    // 2. Determine highestUnlockedTier from the SELECTION (not the post-return
    //    hand). Matches spec §5.5 and 3C contract.
    const unlockedTier: Tier | null = highestUnlockedTierForSpin(state.selection);

    // 3. Resolve RNG immediately via the orchestrator. History event for
    //    drift theater is written by the orchestrator itself (D3).
    const outcome = await spinMainWheel({
      cfg: wheelConfig,
      highestUnlockedTier: unlockedTier,
      rng: getRng(),
      actions: {
        appendHistory: actions.appendHistory,
        spawnBonusTimer: actions.spawnBonusTimer,
      },
      jarId,
    });

    // 4. Stash the spin result for the canvas. Actual `SPIN_RESOLVED` dispatch
    //    is deferred to the canvas's onAnimationComplete — we want the FSM
    //    to stay in `cashInFrozen` while the wheel is physically spinning so
    //    A9 reads correctly in the DOM.
    setPendingSpin({
      targetIndex: indexForTier(outcome.result.tier),
      driftIndex:
        outcome.driftIndex !== null ? outcome.driftIndex : null,
      result: outcome.result,
      unlockedTier,
    });

    // The unusedness of cashInResult is intentional here: its matchKind is
    // the authoritative classification of what the user committed, but
    // state.selection.matchKind already mirrors that. Logged to the cash_in
    // history event by the store.
    void cashInResult;
  }, [actions, jarId, state.selection, wheelConfig]);

  const handleStartSpin = useCallback(() => {
    if (frozen) return;
    dispatch({ type: 'START_SPIN' });
    setAnnouncement('Spinning the main wheel.');
    void runSpinFlow();
  }, [frozen, runSpinFlow]);

  // ---- Bonus wheel runner (shared by JACKPOT + BONUS paths) ----
  //
  // Wire the EXTRA chain per spec §5.7 (flagged in 3E notes as "reducer-ready
  // but not yet wired"): if `segment: 'EXTRA'` resolves, queue a pending
  // bonus spin and re-run up to a sanity cap. The spec allows 2 chained
  // re-spins; we cap at 20 as a belt-and-braces guard against any reducer
  // bug producing an unbounded chain.
  //
  // Declared above `handleMainSpinAnimationComplete` so that callback can
  // reference `runBonusWheel` without tripping react-hooks/immutability
  // ("accessed before declared").
  const EXTRA_CHAIN_CAP = 20;

  const spinBonusOnce = useCallback(async () => {
    const outcome = await spinBonusWheel({
      cfg: wheelConfig,
      rng: getRng(),
      actions: {
        appendHistory: actions.appendHistory,
        spawnBonusTimer: actions.spawnBonusTimer,
      },
      jarId,
    });
    // Wait for the canvas to finish animating before committing the reducer
    // event. This keeps the FSM phase aligned with what the user sees.
    await new Promise<void>((resolve) => {
      bonusCompleteResolver.current = resolve;
      setPendingBonus({
        segmentIndex: bonusSegmentIndex(outcome.result.segment),
        result: outcome.result,
      });
    });
    // Animation done; clear canvas + commit FSM transition.
    setPendingBonus(null);
    dispatch({ type: 'BONUS_RESOLVED', result: outcome.result });
    return outcome;
  }, [actions, jarId, wheelConfig]);

  const runBonusWheel = useCallback(async () => {
    let outcome = await spinBonusOnce();
    let chainDepth = 0;
    while (outcome.result.segment === 'EXTRA' && chainDepth < EXTRA_CHAIN_CAP) {
      chainDepth += 1;
      // Queue the extra spin in the store for audit; re-enter the bonus spin
      // FSM phase so A9 reads consistently. The spec says EXTRA chains 2 more
      // spins; the reducer permits re-entry so we just loop until we land on
      // a non-EXTRA segment.
      actions.queueExtraBonusSpin(jarId);
      dispatch({ type: 'START_BONUS_SPIN' });
      outcome = await spinBonusOnce();
    }
    return outcome;
  }, [actions, jarId, spinBonusOnce]);

  // ---- onAnimationComplete — post-main-wheel orchestration ----

  const handleMainSpinAnimationComplete = useCallback(async () => {
    const ps = pendingSpin;
    if (!ps) return;

    const { result, unlockedTier } = ps;
    const tier = result.tier;

    // Move FSM forward: mainResolved. We'll branch on tier below.
    dispatch({
      type: 'SPIN_RESOLVED',
      result,
      driftedPast: null, // drift log is handled by spinMainWheel
    });

    // ---- JACKPOT (Q6) ----
    if (tier === 'JACKPOT') {
      setAnnouncement('Jackpot! Tier 3 reward + free bonus spin.');
      // Mark bonus pending so REWARD_PICKED routes to bonusSpinning.
      dispatch({ type: 'SET_BONUS_PENDING', pending: true });
      dispatch({ type: 'START_REWARD_PICKER', tier: 'T3', source: 'jackpot' });
      const rewardId = await openRewardPicker('T3');
      actions.logMainSpin(
        jarId,
        result,
        unlockedTier,
        rewardId as RewardId | null,
      );
      actions.appendHistory({
        kind: 'reward_claimed',
        jarId,
        rewardId,
        tier: 'T3',
        source: 'jackpot',
      });
      // Free bonus spin (regardless of unlocked tier — Q6).
      dispatch({
        type: 'REWARD_PICKED',
        rewardId: rewardId as RewardId | null,
      });
      // Force bonus flow since withBonusPending wasn't a real dispatch.
      await runBonusWheel();
      dispatch({ type: 'ALL_DONE' });
      setPendingSpin(null);
      return;
    }

    // ---- BONUS (§5.6 auto-collect best-available tier, then bonus wheel) ----
    if (tier === 'BONUS') {
      const autoTier = bestAvailableTier(unlockedTier);
      setAnnouncement(
        `Bonus! Auto-collecting a ${autoTier} reward, then spinning the bonus wheel.`,
      );
      dispatch({
        type: 'START_REWARD_PICKER',
        tier: autoTier,
        source: 'bonus-auto',
      });
      const rewardId = await openRewardPicker(autoTier);
      actions.logMainSpin(
        jarId,
        result,
        unlockedTier,
        rewardId as RewardId | null,
      );
      actions.appendHistory({
        kind: 'reward_claimed',
        jarId,
        rewardId,
        tier: autoTier,
        // `source: 'wheel'` is the closest canonical value (§7F reward_claimed
        // source is wheel|gold|jackpot). bonus-auto-collects originate from
        // the wheel landing on BONUS.
        source: 'wheel',
      });
      dispatch({
        type: 'REWARD_PICKED',
        rewardId: rewardId as RewardId | null,
      });
      dispatch({ type: 'START_BONUS_SPIN' });
      await runBonusWheel();
      dispatch({ type: 'ALL_DONE' });
      setPendingSpin(null);
      return;
    }

    // ---- T1/T2/T3 tier landing ----
    if (isUnlocked(tier, unlockedTier)) {
      const t = tier as Tier;
      setAnnouncement(`${t} won — pick a reward.`);
      dispatch({ type: 'START_REWARD_PICKER', tier: t, source: 'wheel' });
      const rewardId = await openRewardPicker(t);
      actions.logMainSpin(jarId, result, unlockedTier, rewardId as RewardId | null);
      actions.appendHistory({
        kind: 'reward_claimed',
        jarId,
        rewardId,
        tier: t,
        source: 'wheel',
      });
      dispatch({
        type: 'REWARD_PICKED',
        rewardId: rewardId as RewardId | null,
      });
      dispatch({ type: 'ALL_DONE' });
      setPendingSpin(null);
      return;
    }

    // ---- NEAR-MISS (locked tier) — A15 log + toast, no reward ----
    const blockedBy: Tier = unlockedTier ?? 'T1';
    setAnnouncement('Near miss — no reward this time.');
    actions.appendHistory({
      kind: 'near_miss',
      jarId,
      actualTier: tier,
      blockedBy,
    });
    // logMainSpin with rewardSelected=null — keeps the main_spin history entry
    // complete even for losing spins.
    actions.logMainSpin(jarId, result, unlockedTier, null);
    dispatch({
      type: 'REGISTER_NEAR_MISS',
      actualTier: tier as 'T2' | 'T3',
      blockedBy,
    });
    dispatch({ type: 'SHOW_NEAR_MISS' });
    toast({
      title: 'Almost!',
      description: `The wheel landed on ${tier}, but you'd need a ${tier === 'T2' ? '2-match' : '3-match'} to claim it.`,
      politeness: 'polite',
    });
    dispatch({ type: 'ALL_DONE' });
    setPendingSpin(null);
  }, [actions, jarId, pendingSpin, toast, runBonusWheel]);

  const handleBonusAnimationComplete = useCallback(() => {
    const resolve = bonusCompleteResolver.current;
    bonusCompleteResolver.current = null;
    resolve?.();
  }, []);

  // ---- Render ----

  const goldClips = useMemo(() => hand.filter((c) => c.kind === 'gold'), [hand]);
  const hasGold = goldClips.length > 0;

  // The Spin button is only actionable when we're in idle. We consider the
  // user "ready to spin" as soon as they've landed in idle with a selection
  // (skipped or matched). Parent sets a hint when the user has at least
  // taken SOME action — we interpret "visited idle after interacting" as
  // ready. Simpler: enable as long as idle + not gold-flow.
  const spinButtonDisabled = state.phase !== 'idle';

  const wheelMounted = pendingSpin !== null && state.phase !== 'bonusSpinning';
  const bonusWheelMounted = pendingBonus !== null;

  // Visual label for the spin button during the flow.
  const spinButtonLabel =
    state.phase === 'cashInFrozen'
      ? 'Spinning…'
      : state.phase === 'mainResolved' || state.phase === 'rewardPicker'
      ? 'Resolving…'
      : state.phase === 'bonusSpinning' || state.phase === 'bonusResolved'
      ? 'Bonus…'
      : 'Spin';

  // aria-live region — single polite announcer. Keep announcements short.
  const announcer = (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="spin-aria-live"
    >
      {announcement}
    </div>
  );

  return (
    <div className="spin-flow" data-testid="spin-flow" data-phase={state.phase}>
      {announcer}

      <HandView jarId={jarId} />

      <CashInPicker
        hand={hand}
        selection={state.selection}
        onChange={handleSelectionChange}
        disabled={frozen}
      />

      {hasGold ? (
        <GoldInstantT3Button
          hand={hand}
          onRedeemGold={handleRedeemGold}
          disabled={frozen}
        />
      ) : null}

      {wheelMounted && pendingSpin !== null ? (
        <div className="spin-flow__wheel" data-testid="spin-flow__wheel">
          {pendingSpin.driftIndex !== null ? (
            <WheelCanvas
              targetSegmentIndex={pendingSpin.targetIndex}
              nearMissDriftIndex={pendingSpin.driftIndex}
              onAnimationComplete={() => {
                void handleMainSpinAnimationComplete();
              }}
            />
          ) : (
            <WheelCanvas
              targetSegmentIndex={pendingSpin.targetIndex}
              onAnimationComplete={() => {
                void handleMainSpinAnimationComplete();
              }}
            />
          )}
        </div>
      ) : null}

      {bonusWheelMounted && pendingBonus !== null ? (
        <div
          className="spin-flow__bonus-wheel"
          data-testid="spin-flow__bonus-wheel"
        >
          <BonusWheelCanvas
            targetSegmentIndex={pendingBonus.segmentIndex}
            onAnimationComplete={handleBonusAnimationComplete}
          />
        </div>
      ) : null}

      <div className="spin-flow__actions">
        <SpinButton
          onSpin={handleStartSpin}
          disabled={spinButtonDisabled}
          label={spinButtonLabel}
        />
      </div>
    </div>
  );
}

export default PostSpinFlow;
