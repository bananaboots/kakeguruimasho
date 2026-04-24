// Wheel types (§5.6, §5.7, D5).
// ARCHITECTURE §3 — wheel.ts.

import type { JarId } from './ids.ts';

export type MainWheelTier = 'T1' | 'T2' | 'T3' | 'BONUS' | 'JACKPOT';
export type Tier = 'T1' | 'T2' | 'T3';

export type BonusSegment = 'PCT_75' | 'PCT_50' | 'PCT_25' | 'FREE' | 'EXTRA';

export type WheelConfig = {
  jarId: JarId; // D4
  weights: Record<MainWheelTier, number>; // sums to ~1.0
  bonusWeights: Record<BonusSegment, number>; // sums to ~1.0
  mercyChance: number; // D5: v1 schema carries this; default 0; v1.1 will consume
};

export type MainSpinResult = {
  tier: MainWheelTier;
};

export type BonusSpinResult =
  | { segment: 'PCT_75'; percent: 75 }
  | { segment: 'PCT_50'; percent: 50 }
  | { segment: 'PCT_25'; percent: 25 }
  | { segment: 'FREE' }
  | { segment: 'EXTRA' };

// D3 drift-past target (optional theatrical cue).
export type NearMissTheaterPayload = {
  driftedPast: Tier;
};
