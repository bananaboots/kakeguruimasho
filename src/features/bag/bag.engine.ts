// Pure bag & draw engine (Wave 2 3B).
// ARCHITECTURE §7B.
//
// No store imports, no I/O. RNG is injected so tests can seed deterministically.
// Every function is non-mutating (R4): inputs are treated as read-only, outputs
// are fresh arrays.

import type { BagComposition, Clip, ClipColor } from '../../types/clip.ts';
import type { ClipId, JarId } from '../../types/ids.ts';
import type { Rng } from '../../lib/rng.ts';

/**
 * Draw a single clip uniformly at random from `bag`, without replacement.
 *
 * Contract:
 * - Input `bag` is NOT mutated. The returned `bag` is a fresh array with the
 *   drawn clip removed.
 * - Selection is uniform across all clip slots: index `rng.nextInt(bag.length)`.
 *   Gold clips are just array entries with `kind: "gold"` — there is no separate
 *   gold-probability math (spec §5.3: gold is indistinguishable until drawn).
 * - Throws `RangeError` if `bag` is empty. Callers (i.e. the store) are
 *   responsible for auto-refill before calling this.
 */
export function drawClip(bag: readonly Clip[], rng: Rng): { drawn: Clip; bag: Clip[] } {
  if (bag.length === 0) {
    throw new RangeError('drawClip: cannot draw from an empty bag');
  }
  const idx = rng.nextInt(bag.length);
  const drawn = bag[idx]!;
  // Build a new array without the drawn entry. `slice` + `concat` is clearer
  // than a filter because it preserves the property "remove exactly one slot
  // at position idx" even if two array entries happen to be `===` equal.
  const next: Clip[] = bag.slice(0, idx).concat(bag.slice(idx + 1));
  return { drawn, bag: next };
}

/**
 * Build a fresh bag from `composition`. The order is:
 *   color[0] ×N, color[1] ×N, ..., color[last] ×N, gold ×G
 *
 * Order does not affect draw distribution (selection is by random index), but
 * keeping it deterministic makes tests and history diffs easier to read.
 *
 * `idFactory` is injected so the store can pass its UUIDv7 factory (`newClipId`);
 * tests can pass a counter to inspect IDs directly.
 */
export function refillBag(
  composition: BagComposition,
  jarId: JarId,
  idFactory: () => ClipId,
): Clip[] {
  const out: Clip[] = [];
  for (const color of composition.colors) {
    for (let i = 0; i < composition.regularPerColor; i++) {
      out.push({ id: idFactory(), jarId, kind: 'regular', color });
    }
  }
  for (let i = 0; i < composition.goldCount; i++) {
    out.push({ id: idFactory(), jarId, kind: 'gold' });
  }
  return out;
}

/**
 * Count per-color + gold in the current bag. Used by `BagCompositionView` and
 * test assertions.
 */
export function bagComposition(bag: readonly Clip[]): Record<ClipColor | 'gold', number> {
  const counts: Record<ClipColor | 'gold', number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
    purple: 0,
    pink: 0,
    gold: 0,
  };
  for (const clip of bag) {
    if (clip.kind === 'gold') counts.gold += 1;
    else counts[clip.color] += 1;
  }
  return counts;
}

/**
 * Fisher–Yates shuffle. Not used by `drawClip` (which picks by random index),
 * but exported for callers that want a pre-shuffled bag (e.g. UI that renders
 * the bag in a "scrambled" order for visual flavor). Pure; returns new array.
 */
export function shuffleBag(bag: readonly Clip[], rng: Rng): Clip[] {
  const out = bag.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}
