// Settings types (Q2/Q3/Q5/Q10/Q13).
// ARCHITECTURE §3 — settings.ts.

import type { HabitId, ISOTimestamp } from './ids.ts';
import type { BagComposition } from './clip.ts';

export type Settings = {
  bagComposition: BagComposition; // D2
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  hygieneCutoffLocal: string; // Q5: default "01:00"
  handSoftCapNudge: { enabled: boolean; cap: number }; // Q2: off by default, 20
  workTimerOptIn: Record<HabitId, boolean>; // Q3: v1 all false
  pwaRefreshPromptDismissedUntil: ISOTimestamp | null; // Q10/Q13
  personalName: string | null; // optional, for onboarding greet
};
