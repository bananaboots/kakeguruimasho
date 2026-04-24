// bonus.machine tests (3H). R6: exhaustive permutations up to chain depth 4.

import { describe, expect, it } from 'vitest';
import {
  classifyBonusState,
  oldestActiveTimer,
} from '../bonus.machine.ts';
import type { BonusTimer } from '../../../types/bonus.ts';
import {
  asBonusTimerId,
  asISO,
  DEFAULT_JAR_ID,
} from '../../../types/ids.ts';

function mkTimer(
  idx: number,
  status: BonusTimer['status'],
  segment: BonusTimer['segment'] = 'PCT_75',
  spawnedOffsetMs = 0,
): BonusTimer {
  const base = Date.parse('2026-04-23T12:00:00Z') + spawnedOffsetMs;
  return {
    id: asBonusTimerId(`t_${idx}`),
    jarId: DEFAULT_JAR_ID,
    spawnedAt: asISO(new Date(base).toISOString()),
    endTimestamp: asISO(new Date(base + 10 * 60_000).toISOString()),
    segment,
    percent: segment === 'PCT_75' ? 75 : segment === 'PCT_50' ? 50 : 25,
    originHabitId: null,
    status,
  };
}

describe('classifyBonusState', () => {
  it('idle when no timers and no pending spins', () => {
    expect(classifyBonusState({ timers: [], pendingBonusSpins: 0 })).toBe('idle');
  });

  it('pendingSpin when no active timers but queued spins', () => {
    expect(classifyBonusState({ timers: [], pendingBonusSpins: 2 })).toBe(
      'pendingSpin',
    );
  });

  it('activeSingle with exactly one active timer', () => {
    expect(
      classifyBonusState({
        timers: [mkTimer(1, 'active')],
        pendingBonusSpins: 0,
      }),
    ).toBe('activeSingle');
  });

  it('activeMultiple with 2+ active timers (A3 concurrency)', () => {
    expect(
      classifyBonusState({
        timers: [mkTimer(1, 'active'), mkTimer(2, 'active', 'PCT_50', 1000)],
        pendingBonusSpins: 0,
      }),
    ).toBe('activeMultiple');
  });

  it('completedRecently when only a completed timer remains', () => {
    expect(
      classifyBonusState({
        timers: [mkTimer(1, 'completed')],
        pendingBonusSpins: 0,
      }),
    ).toBe('completedRecently');
  });

  it('allExpired when only expired timers remain', () => {
    expect(
      classifyBonusState({
        timers: [mkTimer(1, 'expired')],
        pendingBonusSpins: 0,
      }),
    ).toBe('allExpired');
  });

  it('prefers the latest resolved timer for completed-vs-expired tiebreak', () => {
    // Expired earliest, then completed.
    expect(
      classifyBonusState({
        timers: [
          mkTimer(1, 'expired', 'PCT_75', 0),
          mkTimer(2, 'completed', 'PCT_50', 10_000),
        ],
        pendingBonusSpins: 0,
      }),
    ).toBe('completedRecently');

    // Completed first, then expired — expired wins.
    expect(
      classifyBonusState({
        timers: [
          mkTimer(1, 'completed', 'PCT_75', 0),
          mkTimer(2, 'expired', 'PCT_50', 10_000),
        ],
        pendingBonusSpins: 0,
      }),
    ).toBe('allExpired');
  });

  // R6: permutations up to depth 4 — any combination of {active, completed,
  // expired} across 4 slots should classify without throwing and always yield
  // one of the known states. This is a light exhaustion test — Cartesian
  // product 3^4 = 81 combos.
  it('never throws and always yields a known state across depth-4 permutations', () => {
    const statuses: BonusTimer['status'][] = ['active', 'completed', 'expired'];
    const known = new Set([
      'idle',
      'pendingSpin',
      'activeSingle',
      'activeMultiple',
      'allExpired',
      'completedRecently',
    ]);
    for (const a of statuses) {
      for (const b of statuses) {
        for (const c of statuses) {
          for (const d of statuses) {
            const timers = [
              mkTimer(1, a, 'PCT_75', 0),
              mkTimer(2, b, 'PCT_50', 1),
              mkTimer(3, c, 'PCT_25', 2),
              mkTimer(4, d, 'PCT_75', 3),
            ];
            for (const pending of [0, 1, 2]) {
              const result = classifyBonusState({
                timers,
                pendingBonusSpins: pending,
              });
              expect(known.has(result)).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe('oldestActiveTimer', () => {
  it('returns null when no active timers', () => {
    expect(oldestActiveTimer([])).toBeNull();
    expect(oldestActiveTimer([mkTimer(1, 'expired')])).toBeNull();
  });

  it('returns the earliest-spawnedAt active timer', () => {
    const t1 = mkTimer(1, 'active', 'PCT_75', 0);
    const t2 = mkTimer(2, 'active', 'PCT_50', 5_000);
    const t3 = mkTimer(3, 'active', 'PCT_25', 10_000);
    expect(oldestActiveTimer([t3, t1, t2])?.id).toBe(t1.id);
  });

  it('ignores non-active statuses', () => {
    const tExpired = mkTimer(1, 'expired', 'PCT_75', 0);
    const tActive = mkTimer(2, 'active', 'PCT_50', 5_000);
    expect(oldestActiveTimer([tExpired, tActive])?.id).toBe(tActive.id);
  });
});
