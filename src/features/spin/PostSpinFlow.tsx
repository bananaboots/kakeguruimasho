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
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
  SlotReelsCanvas,
  spinMainWheel,
  spinBonusWheel,
  mainSegmentIndex,
  bonusSegmentIndex,
  MAIN_WHEEL_SEGMENT_ORDER,
} from '../wheel/index.ts';
import { MahjongReelsCanvas } from '../wheel/MahjongReelsCanvas.tsx';
import { rng as getRng } from '../../lib/rng.ts';
import { useToast } from '../../ui/toast-context.ts';
import { useTheme } from '../../styles/theme-context.ts';

import { HandView } from './HandView.tsx';
import { SpinButton } from './SpinButton.tsx';
import { TierToggle } from './TierToggle.tsx';
import { GoldInstantT3Button } from './GoldInstantT3Button.tsx';
import { WheelCabinet, ParlourCrest } from './WheelCabinet.tsx';
import { WheelOddsStrip } from './WheelOddsStrip.tsx';
import { ParlourLedger } from './ParlourLedger.tsx';
import { HouseRule } from './HouseRule.tsx';
import { RevealScreen } from './RevealScreen.tsx';
import { Chip, GoldChip, Label } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from './clip-colors.ts';
import type { Clip, ClipColor } from '../../types/clip.ts';
import {
  INITIAL_STATE,
  highestUnlockedTierForSpin,
  isCashInFrozen,
  reduce,
  type SpinSelection,
} from './spin.machine.ts';
import {
  useSpinRail,
  type SpinStakeSummary,
} from './SpinRailContext.shared.ts';

import './spin.css';

function describeStake(
  selection: SpinSelection,
  hand: Clip[],
): { label: string; color: ClipColor | 'gold' | null; count: number } | null {
  const ids = selection.selectedIds;
  if (ids.length === 0) return null;
  const picked = hand.filter((c) => ids.includes(c.id));
  if (picked.length === 0) return null;
  const first = picked[0]!;
  if (first.kind === 'gold') {
    return { label: 'Gold', color: 'gold', count: picked.length };
  }
  const color = first.color;
  const sameColor = picked.every((c) => c.kind === 'regular' && c.color === color);
  if (!sameColor) return { label: 'Mixed', color: null, count: picked.length };
  return {
    label: color.charAt(0).toUpperCase() + color.slice(1),
    color,
    count: picked.length,
  };
}

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

type SubStep = 'cash' | 'pull' | 'reveal';

function subStepFromPath(pathname: string): SubStep {
  if (pathname.endsWith('/spin/pull')) return 'pull';
  if (pathname.endsWith('/spin/reveal')) return 'reveal';
  return 'cash';
}

export function PostSpinFlow({
  jarId = DEFAULT_JAR_ID,
}: PostSpinFlowProps): ReactElement {
  const hand = useAppStore((s) => selectHand(s, jarId));
  const wheelConfig = useAppStore(
    (s: Store): WheelConfig => s.wheelConfigs[jarId]!,
  );
  const spinStyle = useAppStore((s) => s.settings.spinStyle);
  const actions = useAppStore((s: Store) => s.actions);
  const { toast } = useToast();
  const { themeMeta } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const subStep: SubStep = subStepFromPath(location.pathname);
  const { setStake } = useSpinRail();

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
  // Inline reveal request — replaces the imperative openRewardPicker modal.
  // Set when the orchestrator wants the user to pick a reward; the
  // `/spin/reveal` sub-screen consumes it and calls `resolve` on pick or
  // dismiss.
  const [revealRequest, setRevealRequest] = useState<{
    tier: Tier;
    resolve: (rewardId: RewardId | null) => void;
  } | null>(null);

  // aria-live announcement text — single source for the polite announcer.
  const [announcement, setAnnouncement] = useState<string>('');

  // A9 freeze across the whole non-idle lifetime.
  const frozen = isCashInFrozen(state);

  // Inline reveal helper — replaces the imperative `openRewardPicker(tier)`
  // pattern. Returns a Promise that resolves to the picked RewardId (or
  // null on dismiss/forfeit). Side-effect: navigates the spin sub-route to
  // `/spin/reveal` so the inline picker takes over the viewport.
  const awaitReveal = useCallback(
    (tier: Tier): Promise<RewardId | null> => {
      return new Promise<RewardId | null>((resolve) => {
        setRevealRequest({ tier, resolve });
        navigate('/spin/reveal');
      });
    },
    [navigate],
  );

  // Push the current stake selection into the rail context so the desktop
  // right-rail panel (RailStakeAndOdds) reflects what the user has picked.
  // Cleared on unmount so other routes don't see stale stake data.
  useEffect(() => {
    const desc = describeStake(state.selection, hand);
    const next: SpinStakeSummary | null =
      desc === null
        ? null
        : { ...desc, unlockedTier: state.selection.unlockedTier };
    setStake(next);
    return () => setStake(null);
  }, [state.selection, hand, setStake]);

  // Route guard — if the user lands on /spin/pull or /spin/reveal without
  // an active spin (e.g. cold-load, manual URL, browser back-forward), bounce
  // back to /spin so they can't see a half-rendered flow. Only fires on
  // initial mount: during the running flow PostSpinFlow drives its own
  // navigation, and a reactive guard would race with the post-claim
  // navigate('/') because Router's location update can lag a render behind
  // the flow's own state cleanup.
  useEffect(() => {
    if (subStep === 'pull' && pendingSpin === null && pendingBonus === null) {
      navigate('/spin', { replace: true });
      return;
    }
    if (subStep === 'reveal' && revealRequest === null) {
      navigate('/spin', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Selection (color + tier) ----
  //
  // The user picks a color in HandView and a tier in TierToggle. We
  // derive the canonical SpinSelection from those two locally-tracked
  // values and dispatch SELECT_CLIPS whenever they change. Tier auto-
  // downgrades if the chosen color doesn't have enough chips for the
  // current tier (e.g. switching from a 4-chip color at T3 to a 2-chip
  // color demotes to T2).
  const [selectedColor, setSelectedColor] = useState<ClipColor | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier>('T1');

  const colorAvailable = useMemo(() => {
    if (!selectedColor) return 0;
    return hand.filter(
      (c) => c.kind === 'regular' && c.color === selectedColor,
    ).length;
  }, [hand, selectedColor]);

  // Effective tier — auto-downgrade derived from `colorAvailable`. The
  // raw `selectedTier` may be temporarily out of range when the user
  // switches color; we compute the actual unlocked tier on each render
  // rather than syncing via setState-in-effect.
  const effectiveTier: Tier =
    selectedTier === 'T3' && colorAvailable < 3
      ? colorAvailable >= 2
        ? 'T2'
        : 'T1'
      : selectedTier === 'T2' && colorAvailable < 2
        ? 'T1'
        : selectedTier;

  // Sync (color, effectiveTier) → FSM SpinSelection.
  useEffect(() => {
    if (frozen) return;
    let next: SpinSelection;
    if (effectiveTier === 'T1' || !selectedColor) {
      next = { selectedIds: [], matchKind: 'none', unlockedTier: 'T1' };
    } else {
      const n = effectiveTier === 'T3' ? 3 : 2;
      const ids = hand
        .filter((c) => c.kind === 'regular' && c.color === selectedColor)
        .slice(0, n)
        .map((c) => c.id);
      if (ids.length < n) {
        next = { selectedIds: [], matchKind: 'none', unlockedTier: 'T1' };
      } else {
        next = {
          selectedIds: ids,
          matchKind: n === 3 ? 'three-match' : 'two-match',
          unlockedTier: effectiveTier,
        };
      }
    }
    dispatch({ type: 'SELECT_CLIPS', selection: next });
  }, [selectedColor, effectiveTier, hand, frozen]);

  // Reset color + tier when the FSM returns to idle after a spin (so the
  // next spin starts blank). Doesn't fire on initial mount because the
  // ref starts as 'idle' too.
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    if (prevPhaseRef.current !== 'idle' && state.phase === 'idle') {
      setSelectedColor(null);
      setSelectedTier('T1');
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase]);

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
      const rewardId = await awaitReveal('T3');

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
      navigate('/');
      setRevealRequest(null);
    },
    [frozen, actions, jarId, awaitReveal, navigate],
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
    // Reset the per-spin idempotency gates before kicking off a new spin
    // — both refs are stale from the previous spin's MainSpinResult and
    // would falsely block the new run.
    handledSpinRef.current = null;
    claimedSpinRef.current = null;
    dispatch({ type: 'START_SPIN' });
    setAnnouncement('Spinning the main wheel.');
    navigate('/spin/pull');
    void runSpinFlow();
  }, [frozen, runSpinFlow, navigate]);

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

  // Idempotency guards. Two layers of defense against the "modal reopens
  // with the same tier" bug:
  //
  //   1. `handledSpinRef` — the handler entry gate. WheelCanvas's effect
  //      can re-run on every parent render and start fresh animation loops
  //      whose tails call onAnimationComplete a second time. The first call
  //      claims the spin's MainSpinResult; subsequent calls bail out.
  //
  //   2. `claimedSpinRef` — a redundant check directly around the
  //      reward_claimed history append + dispatch chain. Even if a stale
  //      callback survives canvas-level guards (e.g. HMR, future refactors),
  //      we never emit two reward_claimed events for one spin.
  const handledSpinRef = useRef<MainSpinResult | null>(null);
  const claimedSpinRef = useRef<MainSpinResult | null>(null);

  const handleMainSpinAnimationComplete = useCallback(async () => {
    const ps = pendingSpin;
    if (!ps) return;
    const { result, unlockedTier } = ps;
    if (handledSpinRef.current === result) return;
    // Refs are mutable by design; this is the canonical idempotency
    // pattern. The compiler-aware lint flags any property write on a
    // ref captured by a useCallback, but useEffect-only mutation isn't
    // an option here — we must claim the spin synchronously inside an
    // event handler before any await yields.
    // eslint-disable-next-line react-hooks/immutability
    handledSpinRef.current = result;

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
      const rewardId = await awaitReveal('T3');
      if (claimedSpinRef.current === result) {
        return;
      }
      // eslint-disable-next-line react-hooks/immutability
      claimedSpinRef.current = result;
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
      navigate('/spin/pull');
      setRevealRequest(null);
      await runBonusWheel();
      dispatch({ type: 'ALL_DONE' });
      setPendingSpin(null);
      navigate('/');
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
      const rewardId = await awaitReveal(autoTier);
      if (claimedSpinRef.current === result) {
        return;
      }
      claimedSpinRef.current = result;
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
      navigate('/spin/pull');
      setRevealRequest(null);
      await runBonusWheel();
      dispatch({ type: 'ALL_DONE' });
      setPendingSpin(null);
      navigate('/');
      return;
    }

    // ---- T1/T2/T3 tier landing ----
    if (isUnlocked(tier, unlockedTier)) {
      const t = tier as Tier;
      setAnnouncement(`${t} won — pick a reward.`);
      dispatch({ type: 'START_REWARD_PICKER', tier: t, source: 'wheel' });
      const rewardId = await awaitReveal(t);
      // Last-line idempotency guard — see `claimedSpinRef` declaration.
      if (claimedSpinRef.current === result) {
        return;
      }
      claimedSpinRef.current = result;
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
      navigate('/');
      setRevealRequest(null);
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
    navigate('/spin');
  }, [actions, jarId, pendingSpin, toast, runBonusWheel, awaitReveal, navigate]);

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

  // Visual label for the spin button during the flow. Idle defers to the
  // theme's `copy.spinCta` so vintage-pachinko reads "Pull the Lever".
  const spinButtonLabel: string | undefined =
    state.phase === 'cashInFrozen'
      ? 'Spinning…'
      : state.phase === 'mainResolved' || state.phase === 'rewardPicker'
      ? 'Resolving…'
      : state.phase === 'bonusSpinning' || state.phase === 'bonusResolved'
      ? 'Bonus…'
      : undefined;

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

  const stake = describeStake(state.selection, hand);
  const stakeChips = stake !== null
    ? Array.from({ length: Math.min(stake.count, 4) }, (_, i) => i)
    : [];

  const crestMeta = stake !== null ? (
    <div>
      <Label size={7}>
        Stake · {stake.count} × {stake.label}
      </Label>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 3,
          marginTop: 3,
        }}
      >
        {stakeChips.map((i) =>
          stake.color === 'gold' ? (
            <GoldChip key={i} size={14} />
          ) : (
            <Chip
              key={i}
              color={stake.color === null ? '#e8c682' : CLIP_HEX[stake.color]}
              size={14}
            />
          ),
        )}
      </div>
    </div>
  ) : (
    <Label size={7}>No stake yet</Label>
  );

  // The reveal handlers only resolve the awaiting Promise. Clearing
  // `revealRequest` is deferred to the awaiting flow's terminal step so the
  // route guard never observes `subStep='reveal'` with no active request
  // mid-transition (which would bounce us back to /spin).
  const handleRevealPick = useCallback(
    (rewardId: RewardId): void => {
      revealRequest?.resolve(rewardId);
    },
    [revealRequest],
  );

  const handleRevealDismiss = useCallback((): void => {
    revealRequest?.resolve(null);
  }, [revealRequest]);

  // ---- Step labels (Step I/II/III · ...) ----

  const stepLabel: { step: string; title: string } | null =
    subStep === 'cash'
      ? { step: 'Step I of III', title: 'Cash In' }
      : subStep === 'pull'
      ? { step: 'Step II of III', title: themeMeta.copy.spinCta }
      : subStep === 'reveal'
      ? { step: 'Step III of III', title: themeMeta.copy.jackpot }
      : null;

  return (
    <div
      className="spin-flow"
      data-testid="spin-flow"
      data-phase={state.phase}
      data-substep={subStep}
    >
      {announcer}

      {stepLabel !== null ? (
        <div className="spin-step-label" aria-hidden>
          <span className="spin-step-label__step">{stepLabel.step}</span>
          <h2 className="spin-step-label__title">{stepLabel.title}</h2>
        </div>
      ) : null}

      {/* ---- Step I · Cash In ---- */}
      {subStep === 'cash' ? (
        <>
          <HandView
            jarId={jarId}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            disabled={frozen}
          />

          {hasGold ? (
            <GoldInstantT3Button
              hand={hand}
              onRedeemGold={handleRedeemGold}
              disabled={frozen}
            />
          ) : null}

          <WheelOddsStrip jarId={jarId} />

          <TierToggle
            value={effectiveTier}
            onChange={setSelectedTier}
            availableForSelectedColor={colorAvailable}
            disabled={frozen}
          />

          <div className="spin-flow__actions">
            {spinButtonLabel !== undefined ? (
              <SpinButton
                onSpin={handleStartSpin}
                disabled={spinButtonDisabled}
                label={spinButtonLabel}
              />
            ) : (
              <SpinButton
                onSpin={handleStartSpin}
                disabled={spinButtonDisabled}
              />
            )}
          </div>

          <ParlourLedger jarId={jarId} />
          <HouseRule />
        </>
      ) : null}

      {/* ---- Step II · Pull (wheel or reels animating) ---- */}
      {subStep === 'pull' ? (
        <>
          {wheelMounted && pendingSpin !== null ? (
            <WheelCabinet
              crest={
                <ParlourCrest title="賭狂魔笙" subtitle="Parlour No. 7" />
              }
              meta={crestMeta}
            >
              <div className="spin-flow__wheel" data-testid="spin-flow__wheel">
                {(() => {
                  const spinVariant = themeMeta.visual?.spin ?? 'wheel';
                  if (spinVariant === 'mahjong') {
                    const tier =
                      MAIN_WHEEL_SEGMENT_ORDER[pendingSpin.targetIndex] ??
                      'T1';
                    return (
                      <MahjongReelsCanvas
                        outcome={tier}
                        spinning
                        onAnimationComplete={() => {
                          void handleMainSpinAnimationComplete();
                        }}
                      />
                    );
                  }
                  if (spinStyle === 'reels') {
                    return (
                      <SlotReelsCanvas
                        targetSegmentIndex={pendingSpin.targetIndex}
                        onAnimationComplete={() => {
                          void handleMainSpinAnimationComplete();
                        }}
                      />
                    );
                  }
                  if (pendingSpin.driftIndex !== null) {
                    return (
                      <WheelCanvas
                        targetSegmentIndex={pendingSpin.targetIndex}
                        nearMissDriftIndex={pendingSpin.driftIndex}
                        onAnimationComplete={() => {
                          void handleMainSpinAnimationComplete();
                        }}
                      />
                    );
                  }
                  return (
                    <WheelCanvas
                      targetSegmentIndex={pendingSpin.targetIndex}
                      onAnimationComplete={() => {
                        void handleMainSpinAnimationComplete();
                      }}
                    />
                  );
                })()}
              </div>
            </WheelCabinet>
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

          <HouseRule />
        </>
      ) : null}

      {/* ---- Step III · Reveal (inline picker) ---- */}
      {subStep === 'reveal' && revealRequest !== null ? (
        <RevealScreen
          tier={revealRequest.tier}
          onPick={handleRevealPick}
          onDismiss={handleRevealDismiss}
        />
      ) : null}
    </div>
  );
}

export default PostSpinFlow;
