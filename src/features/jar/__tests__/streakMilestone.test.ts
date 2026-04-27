import { describe, it, expect } from 'vitest';
import {
  pickRandomClipColors,
  streakMilestonePayout,
} from '../streakMilestone.ts';
import { mulberry32 } from '../../../lib/rng.ts';

describe('streakMilestonePayout', () => {
  it('returns null for non-milestone values', () => {
    expect(streakMilestonePayout(0)).toBeNull();
    expect(streakMilestonePayout(1)).toBeNull();
    expect(streakMilestonePayout(99)).toBeNull();
    expect(streakMilestonePayout(101)).toBeNull();
    expect(streakMilestonePayout(999)).toBeNull();
    expect(streakMilestonePayout(1001)).toBeNull();
  });

  it('returns century payout for 100-day multiples that are not 1000-day multiples', () => {
    for (const v of [100, 200, 300, 500, 700, 900, 1100, 1900, 9900]) {
      expect(streakMilestonePayout(v)).toEqual({
        tier: 'century',
        regularChips: 10,
        goldChips: 1,
      });
    }
  });

  it('returns millennium payout for 1000-day multiples (instead of, not on top of, century)', () => {
    for (const v of [1000, 2000, 3000, 10000]) {
      expect(streakMilestonePayout(v)).toEqual({
        tier: 'millennium',
        regularChips: 25,
        goldChips: 10,
      });
    }
  });

  it('rejects negative and non-integer values', () => {
    expect(streakMilestonePayout(-100)).toBeNull();
    expect(streakMilestonePayout(100.5)).toBeNull();
    expect(streakMilestonePayout(NaN)).toBeNull();
  });
});

describe('pickRandomClipColors', () => {
  it('returns N colors drawn from the default palette', () => {
    const rng = mulberry32(42);
    const colors = pickRandomClipColors(10, rng);
    expect(colors).toHaveLength(10);
    for (const c of colors) {
      expect(['red', 'blue', 'green', 'yellow', 'purple', 'pink']).toContain(c);
    }
  });

  it('returns an empty array for n=0', () => {
    const rng = mulberry32(42);
    expect(pickRandomClipColors(0, rng)).toEqual([]);
  });

  it('is deterministic for a given seeded rng', () => {
    const a = pickRandomClipColors(20, mulberry32(7));
    const b = pickRandomClipColors(20, mulberry32(7));
    expect(a).toEqual(b);
  });
});
