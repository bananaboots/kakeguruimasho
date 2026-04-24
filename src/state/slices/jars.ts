// Jars slice — owns jars/bags/hands per D4.
// Pure reducers; no engine calls. The composite store wires them to the RNG
// stub for `drawClipFromBag` and returns results.

import type { AppState, CashInResult } from '../../types/app-state.ts';
import type { Clip, ClipColor } from '../../types/clip.ts';
import type { ClipId, ISOTimestamp, JarId, MilestoneId } from '../../types/ids.ts';

// --- Internal helpers ---

function expectBag(state: AppState, jarId: JarId): Clip[] {
  const bag = state.bags[jarId];
  if (!bag) throw new Error(`No bag for jarId=${jarId}`);
  return bag;
}

function expectHand(state: AppState, jarId: JarId): Clip[] {
  const hand = state.hands[jarId];
  if (!hand) throw new Error(`No hand for jarId=${jarId}`);
  return hand;
}

function expectJar(state: AppState, jarId: JarId): AppState['jars'][JarId] {
  const jar = state.jars[jarId];
  if (!jar) throw new Error(`No jar for jarId=${jarId}`);
  return jar;
}

// --- Bag / hand ---

/**
 * Remove a specific clip from the bag by reference-index. Pure state update.
 * The caller has already picked *which* clip to draw using an RNG.
 */
export function removeClipFromBag(
  state: AppState,
  jarId: JarId,
  clipId: ClipId,
): { state: AppState; removed: Clip | null } {
  const bag = expectBag(state, jarId);
  const idx = bag.findIndex((c) => c.id === clipId);
  if (idx < 0) return { state, removed: null };
  const removed = bag[idx]!;
  const next = bag.slice(0, idx).concat(bag.slice(idx + 1));
  return {
    state: { ...state, bags: { ...state.bags, [jarId]: next } },
    removed,
  };
}

/** Replace the bag wholesale (used by refill). */
export function setBag(state: AppState, jarId: JarId, next: Clip[]): AppState {
  return { ...state, bags: { ...state.bags, [jarId]: next } };
}

/** Append a clip to the hand. Also auto-increments jar $ (§5.9). */
export function earnClipToHand(state: AppState, jarId: JarId, clip: Clip): AppState {
  const hand = expectHand(state, jarId);
  const jar = expectJar(state, jarId);
  return {
    ...state,
    hands: { ...state.hands, [jarId]: [...hand, clip] },
    jars: {
      ...state.jars,
      [jarId]: { ...jar, total: jar.total + 1 },
    },
  };
}

/** Return clips from the hand to the bag (cash-in, §5.5). */
export function returnClipsToBag(
  state: AppState,
  jarId: JarId,
  clipIds: readonly ClipId[],
): AppState {
  const hand = expectHand(state, jarId);
  const bag = expectBag(state, jarId);
  const idSet = new Set<ClipId>(clipIds);
  const moving: Clip[] = [];
  const remainingHand: Clip[] = [];
  for (const c of hand) {
    if (idSet.has(c.id)) moving.push(c);
    else remainingHand.push(c);
  }
  if (moving.length === 0) return state;
  return {
    ...state,
    hands: { ...state.hands, [jarId]: remainingHand },
    bags: { ...state.bags, [jarId]: [...bag, ...moving] },
  };
}

/**
 * Cash-in resolves match kind and tier unlock. Returns both the new state
 * (with clips returned to bag per spec §5.5) and the CashInResult for the UI.
 */
export function cashInClips(
  state: AppState,
  jarId: JarId,
  clipIds: readonly ClipId[],
): { state: AppState; result: CashInResult } {
  const hand = expectHand(state, jarId);
  const picked = hand.filter((c) => clipIds.includes(c.id));
  const matchKind = classifyCashIn(picked);

  // Always return cashed clips to the bag (spec §5.5, Q8).
  const nextState = returnClipsToBag(state, jarId, clipIds);

  const result: CashInResult =
    matchKind === 'gold-instant-T3'
      ? { matchKind, unlockedTier: 'T3', instantT3: true }
      : matchKind === 'three-match'
      ? { matchKind, unlockedTier: 'T3', instantT3: false }
      : matchKind === 'two-match'
      ? { matchKind, unlockedTier: 'T2', instantT3: false }
      : { matchKind: 'none', unlockedTier: 'T1', instantT3: false };

  return { state: nextState, result };
}

/** Classify a set of cashed clips into a match kind. Spec §5.5. */
export function classifyCashIn(clips: Clip[]): CashInResult['matchKind'] {
  if (clips.length === 0) return 'none';
  if (clips.length === 1 && clips[0]!.kind === 'gold') return 'gold-instant-T3';
  // Only regular, same-color groupings count toward two/three-match.
  const regular = clips.filter((c): c is Extract<Clip, { kind: 'regular' }> => c.kind === 'regular');
  if (regular.length !== clips.length) return 'none'; // mix of gold + regular is invalid
  // Count by color.
  const counts = new Map<ClipColor, number>();
  for (const c of regular) counts.set(c.color, (counts.get(c.color) ?? 0) + 1);
  let best = 0;
  for (const n of counts.values()) if (n > best) best = n;
  if (best >= 3 && regular.length >= 3) return 'three-match';
  if (best >= 2 && regular.length >= 2) return 'two-match';
  return 'none';
}

// --- Milestones (D1) ---

/**
 * D1: claiming mini/mid stamps `claimed[id]` and leaves `total` untouched.
 * Claiming moonshot also stamps (but does NOT zero total — `resetJar` does that).
 */
export function claimMilestone(
  state: AppState,
  jarId: JarId,
  milestone: MilestoneId,
  claimedAt: ISOTimestamp,
): AppState {
  const jar = expectJar(state, jarId);
  return {
    ...state,
    jars: {
      ...state.jars,
      [jarId]: {
        ...jar,
        claimed: {
          ...jar.claimed,
          [milestone]: { claimedAt },
        },
      },
    },
  };
}

/**
 * D1: reset jar to $0, clear all claimed flags. Called only after moonshot.
 */
export function resetJar(state: AppState, jarId: JarId): AppState {
  const jar = expectJar(state, jarId);
  return {
    ...state,
    jars: {
      ...state.jars,
      [jarId]: {
        ...jar,
        total: 0,
        claimed: { mini: null, mid: null, moonshot: null },
      },
    },
  };
}
