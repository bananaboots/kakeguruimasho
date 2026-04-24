// Reward types (§6.2–6.4, OR-1).
// ARCHITECTURE §3 — reward.ts.

import type { ISOTimestamp, RewardId } from './ids.ts';
import type { Tier } from './wheel.ts';

export type Reward = {
  id: RewardId;
  tier: Tier;
  label: string;
  createdAt: ISOTimestamp;
  archived: boolean;
  // A19: no validation field — the "3 reward rules" are enforced via copy, not code.
};
