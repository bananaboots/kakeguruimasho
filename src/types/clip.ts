// Paperclip types (§5.3).
// ARCHITECTURE §3 — clip.ts.

import type { ClipId, JarId } from './ids.ts';

export type ClipColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink';
// Color palette is user-configurable (spec §5.3); string-enum keeps it extensible.

export type RegularClip = {
  id: ClipId;
  jarId: JarId;
  kind: 'regular';
  color: ClipColor;
};

export type GoldClip = {
  id: ClipId;
  jarId: JarId;
  kind: 'gold';
};

export type Clip = RegularClip | GoldClip;
// Gold has no color — indistinguishable in the bag, revealed on draw (spec §5.3).

// Default color palette (spec §5.3, §6.6).
export const DEFAULT_CLIP_COLORS: readonly ClipColor[] = Object.freeze([
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
]);

// Source of a newly-earned clip (for history logging).
export type ClipSource = 'habit' | 'bonus-discount' | 'bonus-free' | 'jackpot-bonus';

// Bag composition (D2). Stored in Settings; described here because it sits
// next to Clip/ClipColor naturally.
export type BagComposition = {
  colors: ClipColor[]; // default 6
  regularPerColor: number; // D2: default 10
  goldCount: number; // D2: default 1
};
