// checkRetroactiveHygiene tests (3D).
// A5: if previous-day bundle has all 4 subitems completed BEFORE cutoff and
// is not yet awarded, award on next app open; otherwise reset to null.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRetroactiveHygiene } from '../checkRetroactiveHygiene.ts';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
  setStoreRng,
} from '../../../state/store.ts';
import { seedInitialAppState, DEFAULT_HABIT_IDS } from '../../../data/defaults.ts';
import { seededRng } from '../../../test/seeded-rng.ts';
import { setHygieneBundle } from '../../../state/slices/hygiene.ts';
import {
  DEFAULT_JAR_ID,
  asISO,
  asLocalDate,
  type ISOTimestamp,
} from '../../../types/ids.ts';
import type { HygieneBundleState } from '../../../types/habit.ts';

// Build a bundle whose `bundle.date` is yesterday, with all 4 subitems
// completed at the given `completionDayOffset` (0 = yesterday, 1 = today)
// at `completionHour` local time.
function bundleFor(opts: {
  completionDayOffset: 0 | 1; // 0 = yesterday, 1 = today
  completionHour: number; // 0-23 local
  awarded?: boolean;
}): HygieneBundleState {
  const hygiene = getAppStore().getState().habits.find((h) => h.id === DEFAULT_HABIT_IDS.hygiene)!;
  if (hygiene.unit.kind !== 'bundle') throw new Error('not a bundle');
  const subs = hygiene.unit.subItems;

  const d = new Date();
  if (opts.completionDayOffset === 0) d.setDate(d.getDate() - 1);
  d.setHours(opts.completionHour, 45, 0, 0);
  const ts = d.toISOString() as ISOTimestamp;

  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yyyy = y.getFullYear();
  const mm = String(y.getMonth() + 1).padStart(2, '0');
  const dd = String(y.getDate()).padStart(2, '0');

  const subItemsCompleted: Record<string, ISOTimestamp | null> = {};
  for (const k of subs) subItemsCompleted[k] = ts;

  return {
    jarId: DEFAULT_JAR_ID,
    date: asLocalDate(`${yyyy}-${mm}-${dd}`), // bundle tracks YESTERDAY
    subItemsCompleted,
    cutoffLocal: '01:00',
    awarded: opts.awarded ?? false,
    awardedAt: null,
  };
}

describe('checkRetroactiveHygiene', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    setPersistenceEnabled(true);
    vi.useRealTimers();
  });

  it('awards retroactively when yesterday`s bundle has all 4 done before cutoff', () => {
    const store = getAppStore();
    // Completion at 22:45 yesterday — well before today's 01:00 cutoff.
    const bundle = bundleFor({ completionDayOffset: 0, completionHour: 22 });
    const prev = store.getState();
    store.setState(
      { ...setHygieneBundle(prev, DEFAULT_JAR_ID, bundle), actions: prev.actions },
      false,
    );

    const result = checkRetroactiveHygiene();
    expect(result.awarded).toBe(true);

    const s = store.getState();
    // 1 clip earned.
    expect(s.hands[DEFAULT_JAR_ID]!.length).toBe(1);
    // Bundle reset to a fresh today-bundle so the UI starts clean.
    const fresh = s.pendingHygieneBundle[DEFAULT_JAR_ID];
    expect(fresh).not.toBeNull();
    expect(fresh!.awarded).toBe(false);
    expect(Object.values(fresh!.subItemsCompleted).every((v) => v === null)).toBe(true);
  });

  it('does NOT award when any subitem is past the deadline', () => {
    const store = getAppStore();
    // Bundle tracks yesterday; completion happened TODAY at 02:45 — past
    // today's 01:00 cutoff (the deadline for a yesterday bundle).
    const bundle = bundleFor({ completionDayOffset: 1, completionHour: 2 });
    const prev = store.getState();
    store.setState(
      { ...setHygieneBundle(prev, DEFAULT_JAR_ID, bundle), actions: prev.actions },
      false,
    );

    const result = checkRetroactiveHygiene();
    expect(result.awarded).toBe(false);

    const s = store.getState();
    expect(s.hands[DEFAULT_JAR_ID]!.length).toBe(0);
    // Bundle cleared (fresh today-bundle) regardless.
    const fresh = s.pendingHygieneBundle[DEFAULT_JAR_ID];
    expect(fresh).not.toBeNull();
    expect(fresh!.awarded).toBe(false);
    expect(Object.values(fresh!.subItemsCompleted).every((v) => v === null)).toBe(true);
  });

  it('does nothing when the pending bundle is for today', () => {
    const store = getAppStore();
    const hygiene = store.getState().habits.find((h) => h.id === DEFAULT_HABIT_IDS.hygiene)!;
    if (hygiene.unit.kind !== 'bundle') throw new Error('not a bundle');

    // Today's bundle with partial progress — must be preserved.
    const todayStr = new Date();
    const yyyy = todayStr.getFullYear();
    const mm = String(todayStr.getMonth() + 1).padStart(2, '0');
    const dd = String(todayStr.getDate()).padStart(2, '0');

    const subItemsCompleted: Record<string, ISOTimestamp | null> = {};
    for (const k of hygiene.unit.subItems) subItemsCompleted[k] = null;
    subItemsCompleted[hygiene.unit.subItems[0]!] = asISO(todayStr.toISOString());

    const bundle: HygieneBundleState = {
      jarId: DEFAULT_JAR_ID,
      date: asLocalDate(`${yyyy}-${mm}-${dd}`),
      subItemsCompleted,
      cutoffLocal: '01:00',
      awarded: false,
      awardedAt: null,
    };

    const prev = store.getState();
    store.setState(
      { ...setHygieneBundle(prev, DEFAULT_JAR_ID, bundle), actions: prev.actions },
      false,
    );

    const result = checkRetroactiveHygiene();
    expect(result.awarded).toBe(false);

    const s = store.getState();
    expect(s.pendingHygieneBundle[DEFAULT_JAR_ID]).not.toBeNull();
  });

  it('does nothing when there is no pending bundle', () => {
    const result = checkRetroactiveHygiene();
    expect(result.awarded).toBe(false);
    expect(result.jarId).toBeNull();
  });
});
