// expireCheck tests (3H). R1: iOS-backgrounding correctness via authoritative endTimestamp.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { expireCheck } from '../expireCheck.ts';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
  setStoreRng,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { seededRng } from '../../../test/seeded-rng.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';

describe('expireCheck', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    setStoreRng(seededRng(42));
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    setPersistenceEnabled(true);
    vi.useRealTimers();
  });

  it('is a no-op when there are no active timers', () => {
    const result = expireCheck();
    expect(result.expiredCount).toBe(0);
    expect(result.streakBroken).toBe(false);
  });

  it('expires a stale timer and breaks the bonus-chain streak', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));

    const store = getAppStore();
    const id = store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_75',
      percent: 75,
    });
    expect(
      store.getState().bonusTimerState[DEFAULT_JAR_ID]!.timers.find(
        (t) => t.id === id,
      )!.status,
    ).toBe('active');

    // Jump 15 minutes into the future (past the 10-minute window).
    vi.setSystemTime(new Date('2026-04-23T12:15:00Z'));

    const result = expireCheck();
    expect(result.expiredCount).toBe(1);
    expect(result.streakBroken).toBe(true);
    expect(
      store.getState().bonusTimerState[DEFAULT_JAR_ID]!.timers.find(
        (t) => t.id === id,
      )!.status,
    ).toBe('expired');
  });

  it('expires multiple stale timers in a single sweep (A3 concurrency)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
    const store = getAppStore();

    const id1 = store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_75',
      percent: 75,
    });
    const id2 = store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_50',
      percent: 50,
    });
    const id3 = store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_25',
      percent: 25,
    });

    vi.setSystemTime(new Date('2026-04-23T12:30:00Z'));

    const result = expireCheck();
    expect(result.expiredCount).toBe(3);
    const timers = store.getState().bonusTimerState[DEFAULT_JAR_ID]!.timers;
    for (const id of [id1, id2, id3]) {
      expect(timers.find((t) => t.id === id)!.status).toBe('expired');
    }
  });

  it('leaves non-stale active timers alone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
    const store = getAppStore();
    const id = store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_50',
      percent: 50,
    });

    // Only 2 minutes in — nowhere near the 10-min deadline.
    vi.setSystemTime(new Date('2026-04-23T12:02:00Z'));

    const result = expireCheck();
    expect(result.expiredCount).toBe(0);
    expect(
      store.getState().bonusTimerState[DEFAULT_JAR_ID]!.timers.find(
        (t) => t.id === id,
      )!.status,
    ).toBe('active');
  });

  it('does not re-expire a timer that was already expired', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
    const store = getAppStore();
    const id = store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_50',
      percent: 50,
    });

    vi.setSystemTime(new Date('2026-04-23T12:30:00Z'));
    const first = expireCheck();
    expect(first.expiredCount).toBe(1);

    const second = expireCheck();
    expect(second.expiredCount).toBe(0);
    expect(second.streakBroken).toBe(false);

    // Sanity — the original timer is still expired.
    expect(
      store.getState().bonusTimerState[DEFAULT_JAR_ID]!.timers.find(
        (t) => t.id === id,
      )!.status,
    ).toBe('expired');
  });

  it('simulates "close + advance clock 5min + reopen" with a 10-min timer left alone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
    const store = getAppStore();
    store.getState().actions.spawnBonusTimer(DEFAULT_JAR_ID, {
      segment: 'PCT_75',
      percent: 75,
    });

    // Simulate 5 minutes elapsed while "closed."
    vi.setSystemTime(new Date('2026-04-23T12:05:00Z'));

    const result = expireCheck();
    expect(result.expiredCount).toBe(0);
    // Still active — 5 more minutes left on the 10-min window.
    const active = store
      .getState()
      .bonusTimerState[DEFAULT_JAR_ID]!.timers.filter(
        (t) => t.status === 'active',
      );
    expect(active).toHaveLength(1);
    const remainingMs =
      Date.parse(active[0]!.endTimestamp) - Date.now();
    expect(remainingMs).toBeGreaterThan(4 * 60_000);
    expect(remainingMs).toBeLessThanOrEqual(5 * 60_000);
  });
});
