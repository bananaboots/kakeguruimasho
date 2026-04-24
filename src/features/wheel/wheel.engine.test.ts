// Wheel engine distribution tests.
// ARCHITECTURE §8: 10k main spins within ±1%, 10k bonus spins within ±1%.
// Covers D5 mercyChance guard + edge cases for non-normalized weights.

import { describe, expect, it } from 'vitest';

import { seededRng } from '../../test/seeded-rng.ts';
import {
  BONUS_WHEEL_SEGMENT_ORDER,
  MAIN_WHEEL_SEGMENT_ORDER,
  bonusSegmentIndex,
  mainSegmentIndex,
  resolveBonusSpin,
  resolveMainSpin,
} from './wheel.engine.ts';
import { defaultWheelConfig } from '../../data/defaults.ts';
import type {
  BonusSegment,
  MainWheelTier,
  WheelConfig,
} from '../../types/wheel.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';

const SPINS = 10_000;
const TIER_TOLERANCE = 0.01; // ±1% absolute on proportion (ARCH §8)

function runMain(
  cfg: WheelConfig,
  n: number,
  seed = 1234,
): Record<MainWheelTier, number> {
  const rng = seededRng(seed);
  const counts: Record<MainWheelTier, number> = {
    T1: 0,
    T2: 0,
    T3: 0,
    BONUS: 0,
    JACKPOT: 0,
  };
  for (let i = 0; i < n; i++) {
    const r = resolveMainSpin(cfg, rng);
    counts[r.tier] += 1;
  }
  return counts;
}

function runBonus(
  cfg: WheelConfig,
  n: number,
  seed = 9876,
): Record<BonusSegment, number> {
  const rng = seededRng(seed);
  const counts: Record<BonusSegment, number> = {
    PCT_75: 0,
    PCT_50: 0,
    PCT_25: 0,
    FREE: 0,
    EXTRA: 0,
  };
  for (let i = 0; i < n; i++) {
    const r = resolveBonusSpin(cfg, rng);
    counts[r.segment] += 1;
  }
  return counts;
}

describe('resolveMainSpin', () => {
  it('distribution over 10,000 spins is within ±1% of default weights', () => {
    const cfg = defaultWheelConfig();
    const counts = runMain(cfg, SPINS);

    for (const tier of MAIN_WHEEL_SEGMENT_ORDER) {
      const proportion = counts[tier] / SPINS;
      const expected = cfg.weights[tier];
      expect(
        Math.abs(proportion - expected),
        `tier ${tier}: got ${proportion.toFixed(4)} expected ${expected} (diff ${Math.abs(proportion - expected).toFixed(4)})`,
      ).toBeLessThanOrEqual(TIER_TOLERANCE);
    }
  });

  it('total count equals input spin count', () => {
    const cfg = defaultWheelConfig();
    const counts = runMain(cfg, SPINS);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(SPINS);
  });

  it('is deterministic under a fixed seed', () => {
    const cfg = defaultWheelConfig();
    const a = runMain(cfg, 500, 42);
    const b = runMain(cfg, 500, 42);
    expect(a).toEqual(b);
  });

  it('never returns a tier outside MAIN_WHEEL_SEGMENT_ORDER', () => {
    const cfg = defaultWheelConfig();
    const rng = seededRng(7);
    for (let i = 0; i < 500; i++) {
      const r = resolveMainSpin(cfg, rng);
      expect(MAIN_WHEEL_SEGMENT_ORDER).toContain(r.tier);
    }
  });

  it('honors alternate weights (skewed T1)', () => {
    const cfg: WheelConfig = {
      ...defaultWheelConfig(),
      weights: { T1: 0.9, T2: 0.05, T3: 0.03, BONUS: 0.01, JACKPOT: 0.01 },
    };
    const counts = runMain(cfg, SPINS);
    expect(counts.T1 / SPINS).toBeGreaterThan(0.88);
    expect(counts.T1 / SPINS).toBeLessThan(0.92);
  });
});

describe('resolveBonusSpin', () => {
  it('distribution over 10,000 spins is within ±1% of default bonus weights', () => {
    const cfg = defaultWheelConfig();
    const counts = runBonus(cfg, SPINS);

    for (const seg of BONUS_WHEEL_SEGMENT_ORDER) {
      const proportion = counts[seg] / SPINS;
      const expected = cfg.bonusWeights[seg];
      expect(
        Math.abs(proportion - expected),
        `segment ${seg}: got ${proportion.toFixed(4)} expected ${expected} (diff ${Math.abs(proportion - expected).toFixed(4)})`,
      ).toBeLessThanOrEqual(TIER_TOLERANCE);
    }
  });

  it('PCT_* results carry numeric percent fields', () => {
    const cfg = defaultWheelConfig();
    const rng = seededRng(5);
    let sawPct75 = false,
      sawPct50 = false,
      sawPct25 = false,
      sawFree = false,
      sawExtra = false;
    for (let i = 0; i < 2000; i++) {
      const r = resolveBonusSpin(cfg, rng);
      if (r.segment === 'PCT_75') {
        expect(r.percent).toBe(75);
        sawPct75 = true;
      } else if (r.segment === 'PCT_50') {
        expect(r.percent).toBe(50);
        sawPct50 = true;
      } else if (r.segment === 'PCT_25') {
        expect(r.percent).toBe(25);
        sawPct25 = true;
      } else if (r.segment === 'FREE') {
        sawFree = true;
      } else if (r.segment === 'EXTRA') {
        sawExtra = true;
      }
    }
    expect(sawPct75 && sawPct50 && sawPct25 && sawFree && sawExtra).toBe(true);
  });
});

describe('D5 mercyChance guard (Risk R11)', () => {
  it('throws a loud error when mercyChance > 0 on main spin', () => {
    const cfg: WheelConfig = { ...defaultWheelConfig(), mercyChance: 0.01 };
    const rng = seededRng(1);
    expect(() => resolveMainSpin(cfg, rng)).toThrow(
      'mercy unimplemented in v1',
    );
  });

  it('throws for any nonzero mercyChance on main spin', () => {
    const rng = seededRng(1);
    for (const value of [0.001, 0.5, 1]) {
      const cfg: WheelConfig = { ...defaultWheelConfig(), mercyChance: value };
      expect(() => resolveMainSpin(cfg, rng)).toThrow();
    }
  });

  it('throws for mercyChance > 0 on bonus spin too', () => {
    const cfg: WheelConfig = { ...defaultWheelConfig(), mercyChance: 0.2 };
    const rng = seededRng(1);
    expect(() => resolveBonusSpin(cfg, rng)).toThrow(
      'mercy unimplemented in v1',
    );
  });

  it('allows mercyChance === 0 (the v1 default)', () => {
    const cfg: WheelConfig = { ...defaultWheelConfig(), mercyChance: 0 };
    const rng = seededRng(1);
    expect(() => resolveMainSpin(cfg, rng)).not.toThrow();
    expect(() => resolveBonusSpin(cfg, rng)).not.toThrow();
  });
});

describe('weight normalization edge cases', () => {
  it('normalizes weights that are off by a rounding drift (<1%)', () => {
    // Sum = 1.002 — within tolerance, should silently normalize.
    const cfg: WheelConfig = {
      jarId: DEFAULT_JAR_ID,
      weights: { T1: 0.402, T2: 0.3, T3: 0.2, BONUS: 0.08, JACKPOT: 0.02 },
      bonusWeights: {
        PCT_75: 0.35,
        PCT_50: 0.25,
        PCT_25: 0.15,
        FREE: 0.1,
        EXTRA: 0.15,
      },
      mercyChance: 0,
    };
    const rng = seededRng(1);
    expect(() => resolveMainSpin(cfg, rng)).not.toThrow();

    const counts = runMain(cfg, 5_000, 111);
    // T1 should still be ~40% (0.402/1.002 ≈ 0.401).
    expect(counts.T1 / 5_000).toBeGreaterThan(0.38);
    expect(counts.T1 / 5_000).toBeLessThan(0.42);
  });

  it('throws if weights sum is off by more than 1%', () => {
    const cfg: WheelConfig = {
      jarId: DEFAULT_JAR_ID,
      // Sum = 0.7 — way off.
      weights: { T1: 0.2, T2: 0.2, T3: 0.2, BONUS: 0.05, JACKPOT: 0.05 },
      bonusWeights: {
        PCT_75: 0.35,
        PCT_50: 0.25,
        PCT_25: 0.15,
        FREE: 0.1,
        EXTRA: 0.15,
      },
      mercyChance: 0,
    };
    const rng = seededRng(1);
    expect(() => resolveMainSpin(cfg, rng)).toThrow(/weights sum/);
  });

  it('throws on negative weight', () => {
    const cfg: WheelConfig = {
      jarId: DEFAULT_JAR_ID,
      weights: { T1: 0.5, T2: 0.3, T3: 0.2, BONUS: 0.08, JACKPOT: -0.08 },
      bonusWeights: {
        PCT_75: 0.35,
        PCT_50: 0.25,
        PCT_25: 0.15,
        FREE: 0.1,
        EXTRA: 0.15,
      },
      mercyChance: 0,
    };
    const rng = seededRng(1);
    expect(() => resolveMainSpin(cfg, rng)).toThrow(/non-negative/);
  });

  it('throws on NaN / Infinity weight', () => {
    const cfg: WheelConfig = {
      jarId: DEFAULT_JAR_ID,
      weights: {
        T1: Number.NaN,
        T2: 0.3,
        T3: 0.2,
        BONUS: 0.08,
        JACKPOT: 0.02,
      },
      bonusWeights: {
        PCT_75: 0.35,
        PCT_50: 0.25,
        PCT_25: 0.15,
        FREE: 0.1,
        EXTRA: 0.15,
      },
      mercyChance: 0,
    };
    const rng = seededRng(1);
    expect(() => resolveMainSpin(cfg, rng)).toThrow(/finite/);
  });

  it('throws when all weights are zero', () => {
    const cfg: WheelConfig = {
      jarId: DEFAULT_JAR_ID,
      weights: { T1: 0, T2: 0, T3: 0, BONUS: 0, JACKPOT: 0 },
      bonusWeights: {
        PCT_75: 0.35,
        PCT_50: 0.25,
        PCT_25: 0.15,
        FREE: 0.1,
        EXTRA: 0.15,
      },
      mercyChance: 0,
    };
    const rng = seededRng(1);
    expect(() => resolveMainSpin(cfg, rng)).toThrow(/at least one weight/);
  });
});

describe('segment index lookups', () => {
  it('mainSegmentIndex returns stable indexes', () => {
    expect(mainSegmentIndex('T1')).toBe(0);
    expect(mainSegmentIndex('T2')).toBe(1);
    expect(mainSegmentIndex('T3')).toBe(2);
    expect(mainSegmentIndex('BONUS')).toBe(3);
    expect(mainSegmentIndex('JACKPOT')).toBe(4);
  });

  it('bonusSegmentIndex returns stable indexes', () => {
    expect(bonusSegmentIndex('PCT_75')).toBe(0);
    expect(bonusSegmentIndex('PCT_50')).toBe(1);
    expect(bonusSegmentIndex('PCT_25')).toBe(2);
    expect(bonusSegmentIndex('FREE')).toBe(3);
    expect(bonusSegmentIndex('EXTRA')).toBe(4);
  });
});
