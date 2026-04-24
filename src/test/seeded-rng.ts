// Deterministic RNG for tests. Re-exports mulberry32 under a test-friendly name.

import { mulberry32, type Rng } from '../lib/rng.ts';

export function seededRng(seed: number): Rng {
  return mulberry32(seed);
}
