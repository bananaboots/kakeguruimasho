// Seedable RNG (PLANNING §4 — avoid Math.random).
// Production path: crypto.getRandomValues.
// Test path: Mulberry32 (see src/test/seeded-rng.ts) — exposes the same `Rng` interface.

export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [0, max). Requires `max > 0`. */
  nextInt(max: number): number;
}

const MAX_UINT32 = 0x1_0000_0000; // 2^32

/**
 * crypto.getRandomValues-backed RNG. Pulls a fresh uint32 per call; this is
 * adequate for our call rates (a few per tap).
 */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(1);
  const fill = (): number => {
    // Defensive: some test environments may not have crypto. Fall back to
    // Math.random — tests should pass their own seeded RNG in anyway.
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(buf);
      return buf[0] ?? 0;
    }
    return Math.floor(Math.random() * MAX_UINT32);
  };

  return {
    next(): number {
      return fill() / MAX_UINT32;
    },
    nextInt(max: number): number {
      if (max <= 0 || !Number.isFinite(max)) {
        throw new RangeError(`nextInt requires max > 0, got ${String(max)}`);
      }
      // Rejection not strictly needed at these bucket sizes but keeps distribution clean.
      return Math.floor((fill() / MAX_UINT32) * max);
    },
  };
}

/**
 * Mulberry32 — tiny deterministic 32-bit PRNG. Same seed → same sequence.
 * Used from test fixtures; exposed here (not test-only) so feature code can
 * construct seeded RNGs without a test import.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  const step = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / MAX_UINT32;
  };
  return {
    next(): number {
      return step();
    },
    nextInt(max: number): number {
      if (max <= 0 || !Number.isFinite(max)) {
        throw new RangeError(`nextInt requires max > 0, got ${String(max)}`);
      }
      return Math.floor(step() * max);
    },
  };
}

// Singleton production RNG.
let defaultRng: Rng | null = null;

export function rng(): Rng {
  if (!defaultRng) defaultRng = cryptoRng();
  return defaultRng;
}

/** Replace the process-wide RNG. Tests only. */
export function __setRngForTests(r: Rng | null): void {
  defaultRng = r;
}
