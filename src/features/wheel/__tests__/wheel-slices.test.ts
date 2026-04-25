import { describe, expect, it } from 'vitest';
import {
  MAIN_WHEEL_SLICE_SEQUENCE,
  BONUS_WHEEL_SLICE_SEQUENCE,
  mainTierToVisualSlice,
  bonusSegmentToVisualSlice,
} from '../wheel-slices.ts';

describe('wheel slice catalogue', () => {
  it('main wheel has exactly 50 slices', () => {
    expect(MAIN_WHEEL_SLICE_SEQUENCE.length).toBe(50);
  });

  it('main wheel slice tier counts match design weights', () => {
    const counts = MAIN_WHEEL_SLICE_SEQUENCE.reduce<Record<string, number>>(
      (acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }),
      {},
    );
    // From pachinko.jsx line 308-314
    expect(counts.I).toBe(23);
    expect(counts.II).toBe(12);
    expect(counts.III).toBe(11);
    expect(counts.BONUS).toBe(3);
    expect(counts.JP).toBe(1);
  });

  it('bonus wheel has exactly 24 slices', () => {
    expect(BONUS_WHEEL_SLICE_SEQUENCE.length).toBe(24);
  });

  it('bonus wheel slice prize counts match design weights', () => {
    const counts = BONUS_WHEEL_SLICE_SEQUENCE.reduce<Record<string, number>>(
      (acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }),
      {},
    );
    // From pachinko-screens.jsx line 957-961
    expect(counts.sm).toBe(10);
    expect(counts.md).toBe(6);
    expect(counts.lg).toBe(4);
    expect(counts.x2).toBe(2);
    expect(counts.free).toBe(2);
  });

  it('mainTierToVisualSlice maps each tier to its first-matching slice index', () => {
    expect(mainTierToVisualSlice('T1')).toBe(0);
    expect(mainTierToVisualSlice('T2')).toBe(1);
    expect(mainTierToVisualSlice('T3')).toBe(3);
    expect(mainTierToVisualSlice('BONUS')).toBe(8);
    expect(mainTierToVisualSlice('JACKPOT')).toBe(19);
  });

  it('bonusSegmentToVisualSlice maps each segment to its first-matching slice index', () => {
    // seq: sm,md,sm,lg,sm,md,sm,x2,sm,md,lg,sm,free,sm,md,sm,lg,sm,x2,md,sm,lg,md,free
    expect(bonusSegmentToVisualSlice('PCT_25')).toBe(0); // sm
    expect(bonusSegmentToVisualSlice('PCT_50')).toBe(1); // md
    expect(bonusSegmentToVisualSlice('PCT_75')).toBe(3); // lg
    expect(bonusSegmentToVisualSlice('FREE')).toBe(12); // free
    expect(bonusSegmentToVisualSlice('EXTRA')).toBe(7); // x2 stands in for "+1 spin"
  });
});
