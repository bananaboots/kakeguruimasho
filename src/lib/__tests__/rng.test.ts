import { describe, expect, it } from 'vitest';
import { cryptoRng, mulberry32 } from '../rng.ts';

describe('rng', () => {
  describe('mulberry32', () => {
    it('is deterministic: same seed → same sequence', () => {
      const a = mulberry32(42);
      const b = mulberry32(42);
      for (let i = 0; i < 20; i++) {
        expect(a.next()).toBeCloseTo(b.next(), 12);
      }
    });

    it('different seeds → different sequences', () => {
      const a = mulberry32(1);
      const b = mulberry32(2);
      let differed = false;
      for (let i = 0; i < 10; i++) {
        if (a.next() !== b.next()) {
          differed = true;
          break;
        }
      }
      expect(differed).toBe(true);
    });

    it('next() returns floats in [0, 1)', () => {
      const r = mulberry32(123);
      for (let i = 0; i < 10_000; i++) {
        const v = r.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('nextInt(max) uniformly hits every bucket within tolerance', () => {
      const r = mulberry32(99);
      const buckets = 6;
      const N = 60_000;
      const counts = new Array<number>(buckets).fill(0);
      for (let i = 0; i < N; i++) {
        const v = r.nextInt(buckets);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(buckets);
        counts[v]! += 1;
      }
      const expected = N / buckets;
      for (const c of counts) {
        // ±2% band.
        expect(c).toBeGreaterThan(expected * 0.97);
        expect(c).toBeLessThan(expected * 1.03);
      }
    });

    it('nextInt rejects non-positive / non-finite max', () => {
      const r = mulberry32(1);
      expect(() => r.nextInt(0)).toThrow();
      expect(() => r.nextInt(-1)).toThrow();
      expect(() => r.nextInt(Number.POSITIVE_INFINITY)).toThrow();
    });
  });

  describe('cryptoRng', () => {
    it('produces floats in [0, 1)', () => {
      const r = cryptoRng();
      for (let i = 0; i < 100; i++) {
        const v = r.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });
});
