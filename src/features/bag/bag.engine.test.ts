// Bag engine tests (Wave 2 3B).
// Acceptance mapping (spec §10):
//  - "Bag draws produce the expected color distribution over 1000 simulated
//    draws (within 2% tolerance)" — we push this to 10k draws @ ±2%.
//  - Gold rate test: 10k draws ≈ goldCount / totalClips, ±1%.
//
// All randomness comes from `seededRng(seed)` — deterministic per seed.

import { describe, it, expect } from 'vitest';

import { bagComposition, drawClip, refillBag, shuffleBag } from './bag.engine.ts';
import { seededRng } from '../../test/seeded-rng.ts';
import { defaultBagComposition } from '../../data/defaults.ts';
import {
  DEFAULT_JAR_ID,
  asClipId,
  type ClipId,
  type JarId,
} from '../../types/ids.ts';
import type { Clip, ClipColor } from '../../types/clip.ts';

// --- Helpers ---

/** Deterministic id factory for tests: "c0", "c1", ... */
function makeCounterIdFactory(): () => ClipId {
  let n = 0;
  return () => asClipId(`c${n++}`);
}

const JAR: JarId = DEFAULT_JAR_ID;

// --- refillBag ---

describe('refillBag', () => {
  it('produces exactly regularPerColor × colors + goldCount clips', () => {
    const comp = defaultBagComposition();
    const bag = refillBag(comp, JAR, makeCounterIdFactory());
    expect(bag).toHaveLength(comp.colors.length * comp.regularPerColor + comp.goldCount);
    // D2 defaults: 6×10 + 1 = 61.
    expect(bag).toHaveLength(61);
  });

  it('produces the right per-color + gold counts', () => {
    const comp = defaultBagComposition();
    const counts = bagComposition(refillBag(comp, JAR, makeCounterIdFactory()));
    for (const color of comp.colors) {
      expect(counts[color]).toBe(comp.regularPerColor);
    }
    expect(counts.gold).toBe(comp.goldCount);
  });

  it('respects a custom composition (3 colors × 5, 2 gold)', () => {
    const comp = {
      colors: ['red', 'blue', 'green'] as ClipColor[],
      regularPerColor: 5,
      goldCount: 2,
    };
    const bag = refillBag(comp, JAR, makeCounterIdFactory());
    expect(bag).toHaveLength(17);
    const counts = bagComposition(bag);
    expect(counts.red).toBe(5);
    expect(counts.blue).toBe(5);
    expect(counts.green).toBe(5);
    expect(counts.gold).toBe(2);
    // Colors not in the composition remain at 0.
    expect(counts.yellow).toBe(0);
    expect(counts.purple).toBe(0);
    expect(counts.pink).toBe(0);
  });

  it('tags every clip with the supplied jarId', () => {
    const comp = defaultBagComposition();
    const bag = refillBag(comp, JAR, makeCounterIdFactory());
    for (const clip of bag) {
      expect(clip.jarId).toBe(JAR);
    }
  });
});

// --- drawClip ---

describe('drawClip', () => {
  it('removes the drawn clip from the returned bag (without-replacement)', () => {
    const comp = defaultBagComposition();
    const rng = seededRng(1);
    const bag0 = refillBag(comp, JAR, makeCounterIdFactory());
    const { drawn, bag: bag1 } = drawClip(bag0, rng);
    expect(bag1).toHaveLength(bag0.length - 1);
    // Drawn clip's id is NOT in the returned bag.
    expect(bag1.every((c) => c.id !== drawn.id)).toBe(true);
    // R4: original bag array unchanged.
    expect(bag0).toHaveLength(comp.colors.length * comp.regularPerColor + comp.goldCount);
  });

  it('never mutates the input bag (R4)', () => {
    const comp = defaultBagComposition();
    const rng = seededRng(2);
    const bag0 = refillBag(comp, JAR, makeCounterIdFactory());
    const snapshotIds = bag0.map((c) => c.id);
    drawClip(bag0, rng);
    drawClip(bag0, rng);
    expect(bag0.map((c) => c.id)).toEqual(snapshotIds);
  });

  it('drains the bag to 0 then re-seeds to starting composition on refill', () => {
    const comp = defaultBagComposition();
    const ids = makeCounterIdFactory();
    const rng = seededRng(3);
    let bag: Clip[] = refillBag(comp, JAR, ids);
    const N = bag.length;
    for (let i = 0; i < N; i++) {
      const res = drawClip(bag, rng);
      bag = res.bag;
    }
    expect(bag).toHaveLength(0);
    // Refill resets shape.
    bag = refillBag(comp, JAR, ids);
    const counts = bagComposition(bag);
    for (const color of comp.colors) {
      expect(counts[color]).toBe(comp.regularPerColor);
    }
    expect(counts.gold).toBe(comp.goldCount);
  });

  it('throws on empty bag — caller is responsible for refill', () => {
    expect(() => drawClip([], seededRng(4))).toThrow(RangeError);
  });

  it('is deterministic for a fixed seed', () => {
    const comp = defaultBagComposition();
    const run = (seed: number): string[] => {
      const rng = seededRng(seed);
      let bag: Clip[] = refillBag(comp, JAR, makeCounterIdFactory());
      const seq: string[] = [];
      for (let i = 0; i < 20; i++) {
        if (bag.length === 0) bag = refillBag(comp, JAR, makeCounterIdFactory());
        const { drawn, bag: nextBag } = drawClip(bag, rng);
        bag = nextBag;
        seq.push(drawn.kind === 'gold' ? 'gold' : drawn.color);
      }
      return seq;
    };
    expect(run(7)).toEqual(run(7));
    // Different seeds produce different sequences (extremely unlikely to
    // collide, but assert to guard against an RNG-reset bug).
    expect(run(7)).not.toEqual(run(8));
  });
});

// --- Distribution tests (spec §10 acceptance criteria) ---

describe('drawClip distribution — 10k draws with auto-refill', () => {
  // Helper: perform `n` draws, refilling whenever the bag empties. Returns
  // per-color + gold counts.
  function simulate(n: number, seed: number): Record<ClipColor | 'gold', number> {
    const comp = defaultBagComposition();
    const rng = seededRng(seed);
    const ids = makeCounterIdFactory();
    let bag: Clip[] = refillBag(comp, JAR, ids);
    const counts: Record<ClipColor | 'gold', number> = {
      red: 0,
      blue: 0,
      green: 0,
      yellow: 0,
      purple: 0,
      pink: 0,
      gold: 0,
    };
    for (let i = 0; i < n; i++) {
      if (bag.length === 0) bag = refillBag(comp, JAR, ids);
      const { drawn, bag: nextBag } = drawClip(bag, rng);
      bag = nextBag;
      if (drawn.kind === 'gold') counts.gold += 1;
      else counts[drawn.color] += 1;
    }
    return counts;
  }

  it('per-color distribution is within ±2% of uniform over 10k draws', () => {
    const N = 10_000;
    const counts = simulate(N, 1234);
    const comp = defaultBagComposition();
    // Each non-gold color's expected share = regularPerColor / total clips.
    const total = comp.colors.length * comp.regularPerColor + comp.goldCount;
    const expected = comp.regularPerColor / total;
    const tolerance = 0.02;
    for (const color of comp.colors) {
      const observed = counts[color] / N;
      expect(Math.abs(observed - expected)).toBeLessThanOrEqual(tolerance);
    }
  });

  it('gold rate is within ±1% of goldCount / totalClips over 10k draws', () => {
    const N = 10_000;
    const counts = simulate(N, 2345);
    const comp = defaultBagComposition();
    const total = comp.colors.length * comp.regularPerColor + comp.goldCount;
    const expected = comp.goldCount / total; // D2: 1/61 ≈ 0.01639
    const observed = counts.gold / N;
    expect(Math.abs(observed - expected)).toBeLessThanOrEqual(0.01);
  });

  it('total draws account for every outcome (no lost clips)', () => {
    const N = 10_000;
    const counts = simulate(N, 3456);
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(N);
  });
});

// --- shuffleBag (utility) ---

describe('shuffleBag', () => {
  it('preserves length and multiset of clip ids (R4: pure, returns new array)', () => {
    const comp = defaultBagComposition();
    const bag0 = refillBag(comp, JAR, makeCounterIdFactory());
    const bag1 = shuffleBag(bag0, seededRng(9));
    expect(bag1).toHaveLength(bag0.length);
    // Original is untouched.
    expect(bag1).not.toBe(bag0);
    // Same multiset of ids.
    expect([...bag1].map((c) => c.id).sort()).toEqual(
      [...bag0].map((c) => c.id).sort(),
    );
  });

  it('typically changes order for a default-sized bag', () => {
    const comp = defaultBagComposition();
    const bag0 = refillBag(comp, JAR, makeCounterIdFactory());
    const bag1 = shuffleBag(bag0, seededRng(10));
    const identical = bag0.every((c, i) => c.id === bag1[i]!.id);
    // For a 61-clip bag the chance of a fixed seed producing the identity
    // permutation is astronomically low; assert it flips at least one slot.
    expect(identical).toBe(false);
  });
});
