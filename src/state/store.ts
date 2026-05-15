// Zustand root store — composes slices, exposes named action creators.
// Wave 1 3A contract. See ARCHITECTURE §7A for the exposed API.

import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppState, CashInResult } from '../types/app-state.ts';
import type { Clip } from '../types/clip.ts';
import type {
  BonusTimerId,
  ClipId,
  HabitId,
  ISOTimestamp,
  JarId,
  LocalDate,
  MilestoneId,
  RewardId,
} from '../types/ids.ts';
import type { HistoryEvent, HistoryEventInput } from '../types/history.ts';
import type { BonusSpinResult, MainSpinResult, Tier } from '../types/wheel.ts';
import type { StreakKind } from '../types/streak.ts';
import type { ClipSource } from '../types/clip.ts';

import * as jarsSlice from './slices/jars.ts';
import * as historySlice from './slices/history.ts';
import * as bonusSlice from './slices/bonus.ts';
import * as streaksSlice from './slices/streaks.ts';
import * as habitsSlice from './slices/habits.ts';
import * as hygieneSlice from './slices/hygiene.ts';
import * as settingsSlice from './slices/settings.ts';
import * as wheelConfigSlice from './slices/wheelConfig.ts';
import * as appMetaSlice from './slices/appMeta.ts';

import { seedInitialAppState } from '../data/defaults.ts';
import { nowISO, todayLocal } from '../lib/time.ts';
import {
  newBonusTimerId,
  newClipId,
  newEventId,
  newMilestoneId,
} from '../lib/id.ts';
import { MOONSHOT_MILESTONE_ID } from '../types/ids.ts';
import type { Habit } from '../types/habit.ts';
import type { Settings } from '../types/settings.ts';
import type { WheelConfig } from '../types/wheel.ts';
import { rng as getRng, type Rng } from '../lib/rng.ts';
import { createPersistHandle, type PersistHandle } from './persist.ts';
import { drawClip as drawClipFromBagPure, refillBag } from '../features/bag/bag.engine.ts';
import {
  pickRandomClipColors,
  streakMilestonePayout,
} from '../features/jar/streakMilestone.ts';

// ---- Re-exports (stable API for Wave 2 agents) ----

export type { AppState, CashInResult };
export type { HistoryEventInput };

// ---- Action surface ----

/**
 * The store's action surface — the public, stable API every feature module
 * calls to mutate state. No feature ever writes directly to `setState`; all
 * mutations go through an action creator here so persistence, history
 * logging, and the IDB 100 ms SLA stay honest in one place.
 *
 * See `ARCHITECTURE.md` §5 and §7A for ownership and slice boundaries.
 */
export type Actions = {
  /**
   * Stamp `id` and `at` on the input event and commit it to both the in-memory
   * `history` slice and the durable `history_events` IDB store. This is the
   * only supported way to append history — no feature should push into
   * `state.history` directly.
   */
  appendHistory: (evt: HistoryEventInput) => void;

  // ---- Clip lifecycle ----
  /**
   * Draw one clip from the bag, auto-refilling if empty. Delegates to the
   * pure `bag.engine.drawClip(bag, rng)` function; RNG is the store-level
   * `currentRng` (seeded in tests via `setStoreRng`).
   *
   * Returns the drawn `Clip` — callers typically chain `earnClipToHand`.
   */
  drawClipFromBag: (jarId: JarId) => Clip;
  /**
   * Push a drawn clip onto the hand and log a `clip_earned` history event.
   * The `source` tag distinguishes habit-earned clips from bonus-discount
   * and jackpot-bonus clips so the activity feed can color-code them.
   */
  earnClipToHand: (jarId: JarId, clip: Clip, source: ClipSource, habitId: HabitId | null) => void;
  /**
   * Return one or more clips from the hand back to the bag. Used after a
   * cash-in (clips are returned, not discarded — SPEC §5.5) and when a gold
   * clip is spent on instant-T3.
   */
  returnClipsToBag: (jarId: JarId, clipIds: readonly ClipId[]) => void;
  /**
   * Commit a cash-in selection from the hand and classify the match result
   * (`none` / `two-match` / `three-match` / `gold-instant-T3`). Returned
   * `CashInResult` drives tier unlocking on the imminent spin.
   */
  cashInClips: (jarId: JarId, clipIds: readonly ClipId[]) => CashInResult;

  // ---- Jar ----
  /**
   * Mark a milestone as claimed (user redeemed the real-world thing).
   * Claiming mini/mid or any custom checkpoint is a tick-mark; only
   * claiming the `MOONSHOT_MILESTONE_ID` triggers the jar reset flow
   * (DECISIONS.md D1).
   */
  claimMilestone: (jarId: JarId, milestone: MilestoneId) => void;
  /**
   * Zero the jar total and clear `claimed` flags — invoked after a Moonshot
   * claim. Emits a `jar_reset` history event for audit.
   */
  resetJar: (jarId: JarId) => void;
  /**
   * Add an extra intermediate milestone to a jar. The generated
   * `MilestoneId` is returned so callers can reference the newly-added
   * checkpoint. Emits a `settings_changed` history event.
   */
  addMilestone: (jarId: JarId, input: { label: string; target: number }) => MilestoneId;
  /**
   * Remove a user-added intermediate milestone. The three default
   * milestones (mini/mid/moonshot) are protected and the call is a
   * no-op if you pass one of their ids.
   */
  removeMilestone: (jarId: JarId, milestoneId: MilestoneId) => void;
  /**
   * Replace labels and targets for a set of milestones in one shot.
   * Used by MilestoneEditor's Save button; keeps the audit event
   * count down to one for an editor session.
   */
  updateMilestones: (
    jarId: JarId,
    patch: Record<MilestoneId, { label: string; target: number }>,
  ) => void;

  // ---- Bonus timers ----
  /**
   * Create a new bonus timer for a 75/50/25 segment, stamping the
   * authoritative `endTimestamp` (10 min from now) into IDB so it survives
   * app close. Returns the new `BonusTimerId`.
   */
  spawnBonusTimer: (
    jarId: JarId,
    result: Extract<BonusSpinResult, { segment: 'PCT_75' | 'PCT_50' | 'PCT_25' }>,
  ) => BonusTimerId;
  /**
   * Mark a bonus timer as completed (user finished the discounted habit in
   * time) and award the clip + bonus-chain increment.
   */
  completeBonusTimer: (jarId: JarId, timerId: BonusTimerId, habitId: HabitId) => void;
  /**
   * Mark a bonus timer as expired (10-minute window elapsed without
   * completion). Breaks the bonus chain; no clip awarded.
   */
  expireBonusTimer: (jarId: JarId, timerId: BonusTimerId) => void;

  // ---- Streaks ----
  /** Advance the daily streak for this jar if `date` is the day after the last clip date. No-op if already ticked today. */
  tickDailyStreak: (jarId: JarId, date: LocalDate) => void;
  /** Per-habit streak tick — used for per-habit consistency stats (no history event; the daily streak covers the user-visible case). */
  tickHabitStreak: (jarId: JarId, habitId: HabitId, date: LocalDate) => void;
  /** Hygiene bundle streak tick — called when all four sub-items completed before cutoff. */
  tickHygieneStreak: (jarId: JarId, date: LocalDate) => void;
  /** Explicitly break a streak (daily / hygiene / bonus-chain) — used by the bonus expire path and the end-of-day hygiene sweep. */
  breakStreak: (jarId: JarId, kind: StreakKind) => void;
  /**
   * Acknowledge the pending streak milestone celebration — clears
   * `state.pendingStreakCelebration` after the user dismisses the modal.
   * The clips themselves were already minted into hand by the originating
   * `tickDailyStreak` call; this action is purely for the modal lifecycle.
   */
  acknowledgeStreakMilestone: () => void;

  // ---- Composite: spec-level flow ----
  /**
   * Complete a habit: draw `unitsCompleted` clips from the bag, push each
   * into the hand, tick the daily + per-habit streaks, and log a
   * `habit_completed` history event. The batched semantics are what lets
   * step entry (e.g. 10,000 steps = 4 clips) earn multiple clips in one tap.
   */
  completeHabit: (
    habitId: HabitId,
    unitsCompleted: number,
  ) => { clipsEarned: number; drawnClips: Clip[] };

  // ---- Spin outcome logging (Wave 2 wheels will call these) ----
  /**
   * Append a `main_spin` event after the wheel resolves. The wheel engine is
   * pure — logging is the store's job so persistence stays centralized.
   */
  logMainSpin: (
    jarId: JarId,
    result: MainSpinResult,
    unlockedTier: Tier | null,
    rewardSelected: RewardId | null,
  ) => void;

  // ---- Habit CRUD (Phase 4 — promoted from HabitEditor's setState path) ----
  /** Append a new habit to the global habits list. Emits a `settings_changed` audit event. */
  addHabit: (habit: Habit) => void;
  /** Patch a habit in place. Rejected if the habit doesn't exist. */
  updateHabit: (habitId: HabitId, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => void;
  /** Soft-delete a habit by flipping `archived: true`. Archived habits don't appear in quick-log or discount pickers. */
  archiveHabit: (habitId: HabitId) => void;

  // ---- Hygiene bundle (Phase 4 — promoted from HygieneBundle setState path) ----
  /** Check off one sub-item (shower / brush / face / bed). Timestamp is used later to evaluate the cutoff. */
  checkHygieneSubItem: (jarId: JarId, subItem: string, at: ISOTimestamp) => void;
  /** Uncheck a sub-item (user corrected a mistake). Silent — no history event. */
  uncheckHygieneSubItem: (jarId: JarId, subItem: string) => void;
  /** Start a fresh bundle for `date` — called at day rollover and after a retroactive-award sweep. */
  resetHygieneBundle: (jarId: JarId, date: LocalDate) => void;
  /** Mark the current bundle as awarded so retroactive sweeps don't double-award. */
  markHygieneAwarded: (jarId: JarId, at: ISOTimestamp) => void;

  // ---- Bonus timer origin (Phase 4 — promoted from DiscountHabitPicker) ----
  /** Record which habit the user picked for this bonus discount — decoupled from timer spawn so the user can pick late. */
  setBonusTimerOrigin: (jarId: JarId, timerId: BonusTimerId, habitId: HabitId) => void;

  // ---- Settings / wheel / lifecycle (Phase 4 — promoted from hydrate path) ----
  /** Merge a patch into `settings`. Persists immediately and emits a before/after `settings_changed` audit event. */
  updateSettings: (patch: Partial<Settings>) => void;
  /** Merge a patch into `wheelConfigs[jarId]`. The editor auto-normalizes weights to sum to 1.0 before calling this. */
  updateWheelConfig: (jarId: JarId, patch: Partial<WheelConfig>) => void;
  /** Flip `firstRunCompleted = true`. Called at the end of onboarding; gates the redirect to `/`. */
  setFirstRunCompleted: () => void;

  // ---- EXTRA chain (Phase 4 — consumed by PostSpinFlow) ----
  /** Enqueue one more bonus spin — consumed by the EXTRA-chain loop in `PostSpinFlow`. */
  queueExtraBonusSpin: (jarId: JarId) => void;

  // ---- Import / export lifecycle markers ----
  /** Audit event for import completion. `backupId` references the auto-snapshot created before the wipe. */
  logImportPerformed: (jarId: JarId, backupId: string | null) => void;
  /** Audit event for export download. Used by the activity feed. */
  logExportPerformed: (jarId: JarId) => void;

  // ---- Initialization ----
  /**
   * Replace the entire state blob. Called once at boot by the rehydrate
   * path (`src/main.tsx`) and by the import flow. Skips history-event
   * stamping because the incoming state already has one.
   */
  hydrate: (state: AppState) => void;
};

export type Store = AppState & { actions: Actions };

// ---- RNG + persist plumbing ----

// The store uses `getRng()` by default but tests can swap via `setStoreRng`.
let currentRng: Rng = getRng();
export function setStoreRng(r: Rng): void {
  currentRng = r;
}

// Persist handle — created lazily so importing this module doesn't hit IDB.
let persist: PersistHandle | null = null;
function getPersist(): PersistHandle {
  if (!persist) persist = createPersistHandle();
  return persist;
}

/** Tests: dispose persist handle + replace. */
export function __resetPersistForTests(): void {
  persist?.dispose();
  persist = null;
}

// Whether persistence is enabled for the current store (tests disable).
let persistenceEnabled = true;
export function setPersistenceEnabled(enabled: boolean): void {
  persistenceEnabled = enabled;
}

// ---- Store creation ----

/**
 * Create the bound Zustand store with its action surface.
 * Exported for tests that want an isolated store; production uses the
 * singleton `useAppStore`.
 */
export function createAppStore(initial?: AppState): UseBoundStore<StoreApi<Store>> {
  const init = initial ?? seedInitialAppState();

  return create<Store>((set, get) => {
    const commit = (updater: (s: AppState) => AppState): void => {
      const prev = stripActions(get());
      const next = updater(prev);
      // Mutate state + schedule debounced persistence.
      const nextStore = { ...next, actions: get().actions };
      set(nextStore, false);
      if (persistenceEnabled) getPersist().schedule(next);
    };

    const commitWithHistory = (
      updater: (s: AppState) => { state: AppState; events: HistoryEvent[] },
    ): void => {
      const prev = stripActions(get());
      const { state, events } = updater(prev);
      const withEvents = historySlice.appendHistory(state, events);
      set({ ...withEvents, actions: get().actions }, false);
      if (persistenceEnabled) void getPersist().flushNow(withEvents, events);
    };

    const actions: Actions = {
      appendHistory(evt) {
        commitWithHistory((s) => {
          const full: HistoryEvent = stampEvent(evt);
          return { state: s, events: [full] };
        });
      },

      drawClipFromBag(jarId) {
        // 3B: delegate pick-from-bag to the pure engine `drawClip(bag, rng)`.
        // Auto-refill + history event semantics preserved (spec §5.3).
        let s = stripActions(get());
        let bag = s.bags[jarId] ?? [];
        const events: HistoryEvent[] = [];
        if (bag.length === 0) {
          bag = refillBag(s.settings.bagComposition, jarId, newClipId);
          s = jarsSlice.setBag(s, jarId, bag);
          events.push(
            stampEvent({
              kind: 'bag_refilled',
              jarId,
              composition: s.settings.bagComposition,
            }),
          );
        }
        const { drawn: clip, bag: nextBag } = drawClipFromBagPure(bag, currentRng);
        const afterRemove = jarsSlice.setBag(s, jarId, nextBag);
        if (events.length > 0) {
          commitWithHistory(() => ({ state: afterRemove, events }));
        } else {
          commit(() => afterRemove);
        }
        return clip;
      },

      earnClipToHand(jarId, clip, source, habitId) {
        commitWithHistory((s) => {
          const next = jarsSlice.earnClipToHand(s, jarId, clip);
          const event: HistoryEvent = stampEvent({
            kind: 'clip_earned',
            jarId,
            source,
            habitId,
            clipId: clip.id,
            drawnColor: clip.kind === 'gold' ? 'gold' : clip.color,
          });
          return { state: next, events: [event] };
        });
      },

      returnClipsToBag(jarId, clipIds) {
        commit((s) => jarsSlice.returnClipsToBag(s, jarId, clipIds));
      },

      cashInClips(jarId, clipIds) {
        const s = stripActions(get());
        const { state: next, result } = jarsSlice.cashInClips(s, jarId, clipIds);
        const event: HistoryEvent = stampEvent({
          kind: 'cash_in',
          jarId,
          clips: [...clipIds],
          matchKind: result.matchKind,
        });
        commitWithHistory(() => ({ state: next, events: [event] }));
        return result;
      },

      claimMilestone(jarId, milestone) {
        const at = nowISO();
        commitWithHistory((s) => {
          const next = jarsSlice.claimMilestone(s, jarId, milestone, at);
          const events: HistoryEvent[] = [
            stampEvent({
              kind: 'milestone_claimed',
              jarId,
              milestone,
              reset: milestone === MOONSHOT_MILESTONE_ID,
            }),
          ];
          return { state: next, events };
        });
      },

      resetJar(jarId) {
        commitWithHistory((s) => {
          const from = s.jars[jarId]?.total ?? 0;
          const next = jarsSlice.resetJar(s, jarId);
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'jar_reset',
                jarId,
                from,
                reason: 'moonshot-claimed',
              }),
            ],
          };
        });
      },

      addMilestone(jarId, input) {
        const id = newMilestoneId();
        const milestone = { id, label: input.label, target: input.target };
        commitWithHistory((s) => {
          const next = jarsSlice.addMilestone(s, jarId, milestone);
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId,
                path: `jars.${jarId}.milestones.${id}`,
                before: null,
                after: milestone,
              }),
            ],
          };
        });
        return id;
      },

      removeMilestone(jarId, milestoneId) {
        commitWithHistory((s) => {
          const before = s.jars[jarId]?.milestones[milestoneId] ?? null;
          const next = jarsSlice.removeMilestone(s, jarId, milestoneId);
          if (next === s) {
            return { state: s, events: [] };
          }
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId,
                path: `jars.${jarId}.milestones.${milestoneId}`,
                before,
                after: null,
              }),
            ],
          };
        });
      },

      updateMilestones(jarId, patch) {
        commitWithHistory((s) => {
          const jar = s.jars[jarId];
          if (!jar) return { state: s, events: [] };
          const beforeByKey: Record<string, unknown> = {};
          const afterByKey: Record<string, unknown> = {};
          const nextPatch: Record<MilestoneId, { id: MilestoneId; label: string; target: number }> =
            {} as Record<MilestoneId, { id: MilestoneId; label: string; target: number }>;
          for (const key of Object.keys(patch) as MilestoneId[]) {
            const existing = jar.milestones[key];
            if (!existing) continue;
            beforeByKey[key] = existing;
            const merged = { id: key, label: patch[key]!.label, target: patch[key]!.target };
            afterByKey[key] = merged;
            nextPatch[key] = merged;
          }
          const next = jarsSlice.updateMilestones(s, jarId, nextPatch);
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId,
                path: `jars.${jarId}.milestones`,
                before: beforeByKey,
                after: afterByKey,
              }),
            ],
          };
        });
      },

      spawnBonusTimer(jarId, result) {
        const id = newBonusTimerId();
        const spawnedAt = nowISO();
        const endTimestamp = new Date(
          Date.parse(spawnedAt) + 10 * 60 * 1000,
        ).toISOString() as ISOTimestamp;
        commitWithHistory((s) => {
          const next = bonusSlice.spawnTimer(s, jarId, {
            id,
            jarId,
            spawnedAt,
            endTimestamp,
            segment: result.segment,
            percent: result.percent,
            originHabitId: null,
            status: 'active',
          });
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'bonus_timer_started',
                jarId,
                timerId: id,
                endTimestamp,
                segment: result.segment,
              }),
            ],
          };
        });
        return id;
      },

      completeBonusTimer(jarId, timerId, habitId) {
        commitWithHistory((s) => {
          const next = bonusSlice.completeTimer(s, jarId, timerId, habitId);
          return {
            state: next,
            events: [stampEvent({ kind: 'bonus_completed', jarId, timerId, habitId })],
          };
        });
        // A17: bonus completion earns a token (draw + earn).
        const clip = actions.drawClipFromBag(jarId);
        actions.earnClipToHand(jarId, clip, 'bonus-discount', habitId);
      },

      expireBonusTimer(jarId, timerId) {
        commitWithHistory((s) => {
          const next = bonusSlice.expireTimer(s, jarId, timerId);
          return {
            state: next,
            events: [stampEvent({ kind: 'bonus_expired', jarId, timerId })],
          };
        });
      },

      tickDailyStreak(jarId, date) {
        // Snapshot incremented/value out of the closure so the post-commit
        // milestone branch can read them. The streak slice is pure; we re-
        // run it here only to surface the values, not to mutate.
        let resultIncremented = false;
        let resultValue = 0;
        commitWithHistory((s) => {
          const { state, incremented, value } = streaksSlice.tickDailyStreak(s, jarId, date);
          resultIncremented = incremented;
          resultValue = value;
          const events: HistoryEvent[] = incremented
            ? [stampEvent({ kind: 'streak_incremented', jarId, streak: 'daily', value })]
            : [];
          return { state, events };
        });

        // Milestone payout — only fires when the streak ACTUALLY incremented
        // to a 100/1000-day boundary. Skipped on no-op ticks (already-ticked
        // today) and on streak-reset ticks (skip → 1).
        if (!resultIncremented) return;
        const payout = streakMilestonePayout(resultValue);
        if (!payout) return;

        const rng = getRng();
        const colors = pickRandomClipColors(payout.regularChips, rng);
        // Mint regular + gold clips into the user's hand. Each call appends
        // its own `clip_earned` event with source: 'streak-milestone'.
        for (const color of colors) {
          const clip: Clip = {
            id: newClipId(),
            jarId,
            kind: 'regular',
            color,
          };
          actions.earnClipToHand(jarId, clip, 'streak-milestone', null);
        }
        for (let i = 0; i < payout.goldChips; i++) {
          const clip: Clip = { id: newClipId(), jarId, kind: 'gold' };
          actions.earnClipToHand(jarId, clip, 'streak-milestone', null);
        }

        // Single milestone event for the ledger; pending-celebration state
        // for the modal. Both committed in the same tx so persistence is
        // atomic.
        commitWithHistory((s) => ({
          state: { ...s, pendingStreakCelebration: {
            jarId,
            streakValue: resultValue,
            tier: payout.tier,
            regularChips: payout.regularChips,
            goldChips: payout.goldChips,
          } },
          events: [stampEvent({
            kind: 'streak_milestone_awarded',
            jarId,
            streakValue: resultValue,
            tier: payout.tier,
            regularChips: payout.regularChips,
            goldChips: payout.goldChips,
          })],
        }));
      },

      acknowledgeStreakMilestone() {
        commit((s) => ({ ...s, pendingStreakCelebration: null }));
      },

      tickHabitStreak(jarId, habitId, date) {
        commitWithHistory((s) => {
          const { state, incremented, value } = streaksSlice.tickHabitStreak(s, jarId, habitId, date);
          // Per-habit streak doesn't have a `streak` kind variant; we log nothing
          // unless the daily/hygiene branches do. Keeping perHabit silent in
          // history is intentional — 3D can add a dedicated event later.
          void incremented;
          void value;
          return { state, events: [] };
        });
      },

      tickHygieneStreak(jarId, date) {
        commitWithHistory((s) => {
          const { state, incremented, value } = streaksSlice.tickHygieneStreak(s, jarId, date);
          const events: HistoryEvent[] = incremented
            ? [stampEvent({ kind: 'streak_incremented', jarId, streak: 'hygiene', value })]
            : [];
          return { state, events };
        });
      },

      breakStreak(jarId, kind) {
        commitWithHistory((s) => {
          const { state, lastValue } = streaksSlice.breakStreak(s, jarId, kind);
          return {
            state,
            events: [stampEvent({ kind: 'streak_broken', jarId, streak: kind, lastValue })],
          };
        });
      },

      completeHabit(habitId, unitsCompleted) {
        // Each habit unit -> 1 clip (§5.1).
        const clipsToEarn = Math.max(0, Math.floor(unitsCompleted));
        const drawnClips: Clip[] = [];
        const today = todayLocal();

        for (let i = 0; i < clipsToEarn; i++) {
          // drawClipFromBag does its own commit; after it runs, `get()` sees
          // the updated bag.
          const clip = actions.drawClipFromBag(
            stripActions(get()).activeJarId,
          );
          drawnClips.push(clip);
          actions.earnClipToHand(
            stripActions(get()).activeJarId,
            clip,
            'habit',
            habitId,
          );
        }

        // Per-day streaks.
        if (clipsToEarn > 0) {
          actions.tickDailyStreak(stripActions(get()).activeJarId, today);
          actions.tickHabitStreak(stripActions(get()).activeJarId, habitId, today);
        }

        actions.appendHistory({
          kind: 'habit_completed',
          jarId: stripActions(get()).activeJarId,
          habitId,
          unitsCompleted,
          clipsEarned: clipsToEarn,
        });

        return { clipsEarned: clipsToEarn, drawnClips };
      },

      logMainSpin(jarId, result, unlockedTier, rewardSelected) {
        actions.appendHistory({
          kind: 'main_spin',
          jarId,
          result,
          unlockedTier,
          rewardSelected,
        });
      },

      logImportPerformed(jarId, backupId) {
        actions.appendHistory({ kind: 'import_performed', jarId, backupId });
      },

      logExportPerformed(jarId) {
        actions.appendHistory({ kind: 'export_performed', jarId });
      },

      // ---- Habit CRUD ----

      addHabit(habit) {
        commitWithHistory((s) => {
          const next = habitsSlice.addHabit(s, habit);
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId: s.activeJarId,
                path: 'habits.added',
                before: null,
                after: habit,
              }),
            ],
          };
        });
      },

      updateHabit(habitId, patch) {
        commitWithHistory((s) => {
          const before = s.habits.find((h) => h.id === habitId) ?? null;
          const next = habitsSlice.updateHabit(s, habitId, patch);
          const after = next.habits.find((h) => h.id === habitId) ?? null;
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId: s.activeJarId,
                path: `habits.${habitId}`,
                before,
                after,
              }),
            ],
          };
        });
      },

      archiveHabit(habitId) {
        commitWithHistory((s) => {
          const next = habitsSlice.archiveHabit(s, habitId);
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId: s.activeJarId,
                path: `habits.${habitId}.archived`,
                before: false,
                after: true,
              }),
            ],
          };
        });
      },

      // ---- Hygiene bundle ----

      checkHygieneSubItem(jarId, subItem, at) {
        commitWithHistory((s) => {
          const next = hygieneSlice.checkHygieneSubItem(s, jarId, subItem, at);
          return {
            state: next,
            events: [stampEvent({ kind: 'hygiene_subitem_checked', jarId, subItem })],
          };
        });
      },

      uncheckHygieneSubItem(jarId, subItem) {
        commit((s) => hygieneSlice.uncheckHygieneSubItem(s, jarId, subItem));
      },

      resetHygieneBundle(jarId, date) {
        commitWithHistory((s) => {
          const before = s.pendingHygieneBundle[jarId] ?? null;
          const next = hygieneSlice.resetHygieneBundle(s, jarId, date);
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId,
                path: 'pendingHygieneBundle.reset',
                before,
                after: next.pendingHygieneBundle[jarId] ?? null,
              }),
            ],
          };
        });
      },

      markHygieneAwarded(jarId, at) {
        commit((s) => hygieneSlice.markHygieneAwarded(s, jarId, at));
      },

      // ---- Bonus timer origin ----

      setBonusTimerOrigin(jarId, timerId, habitId) {
        commit((s) => bonusSlice.setTimerOrigin(s, jarId, timerId, habitId));
      },

      // ---- Settings / wheel / first-run ----

      updateSettings(patch) {
        commitWithHistory((s) => {
          const before = s.settings;
          const next = settingsSlice.updateSettings(s, patch);
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId: s.activeJarId,
                path: 'settings',
                before,
                after: next.settings,
              }),
            ],
          };
        });
      },

      updateWheelConfig(jarId, patch) {
        commitWithHistory((s) => {
          const before = s.wheelConfigs[jarId] ?? null;
          const next = wheelConfigSlice.setWheelConfig(s, jarId, patch);
          return {
            state: next,
            events: [
              stampEvent({
                kind: 'settings_changed',
                jarId,
                path: `wheelConfigs.${jarId}`,
                before,
                after: next.wheelConfigs[jarId] ?? null,
              }),
            ],
          };
        });
      },

      setFirstRunCompleted() {
        commit((s) => appMetaSlice.markFirstRunCompleted(s));
      },

      // ---- EXTRA chain ----

      queueExtraBonusSpin(jarId) {
        commit((s) => bonusSlice.queueExtraSpins(s, jarId, 1));
      },

      hydrate(state) {
        set({ ...state, actions: get().actions }, false);
        if (persistenceEnabled) getPersist().schedule(state);
      },
    };

    return { ...init, actions };
  });
}

function stripActions(store: Store): AppState {
  const copy: Store = { ...store };
  // We don't persist actions.
  const { actions: _actions, ...rest } = copy;
  void _actions;
  return rest as AppState;
}

function stampEvent(input: HistoryEventInput): HistoryEvent {
  return { ...input, id: newEventId(), at: nowISO() } as HistoryEvent;
}

// ---- Singleton ----

let singleton: UseBoundStore<StoreApi<Store>> | null = null;
export function getAppStore(): UseBoundStore<StoreApi<Store>> {
  if (!singleton) singleton = createAppStore();
  return singleton;
}
export function useAppStore<T>(selector: (s: Store) => T): T {
  return getAppStore()(selector);
}

/** Tests: replace the singleton with a fresh one. */
export function __resetAppStoreForTests(initial?: AppState): UseBoundStore<StoreApi<Store>> {
  singleton = createAppStore(initial);
  return singleton;
}
