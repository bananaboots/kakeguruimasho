// IDB schema constants + Zod schemas for import validation.
// ARCHITECTURE §4, R7 (schema-version drift).

import { z } from 'zod';
import type { DBSchema } from 'idb';

import type { HistoryEvent } from '../types/history.ts';
import type { AppState } from '../types/app-state.ts';
import { SCHEMA_VERSION } from '../types/app-state.ts';

// ---- Constants ----

export const DB_NAME = 'kakeguruimasho';
export const DB_VERSION = 1;

export const APP_STATE_STORE = 'app_state';
export const HISTORY_EVENTS_STORE = 'history_events';
export const SNAPSHOTS_STORE = 'snapshots';
export const KV_STORE = 'kv';

export const APP_STATE_KEY = 'current';

// Index names on history_events.
export const HISTORY_IDX_BY_AT = 'by_at';
export const HISTORY_IDX_BY_JAR_AT = 'by_jar_at';
export const HISTORY_IDX_BY_KIND = 'by_kind';

// Index names on snapshots.
export const SNAPSHOTS_IDX_BY_DATE = 'by_date';

// KV keys we reference by name.
export const KV_LAST_SNAPSHOT_DATE = 'last_snapshot_date';
export const KV_HAS_PROMPTED_PERSIST = 'has_prompted_persist';

// ---- idb DBSchema ----

// Shape of a snapshot row.
export type SnapshotRow = {
  id?: number; // auto-increment, optional on write
  dateLocal: string; // LocalDate YYYY-MM-DD
  createdAt: string; // ISO timestamp
  compressed: boolean;
  // When compressed=true: gzipped JSON bytes. Else: JSON string.
  payload: Uint8Array | string;
  schemaVersion: number;
};

// Shape of a KV row.
export type KvRow<T = unknown> = {
  key: string;
  value: T;
};

export interface KakeguruiDbSchema extends DBSchema {
  [APP_STATE_STORE]: {
    key: string;
    value: AppState;
  };
  [HISTORY_EVENTS_STORE]: {
    key: string; // EventId
    value: HistoryEvent;
    indexes: {
      [HISTORY_IDX_BY_AT]: string;
      [HISTORY_IDX_BY_JAR_AT]: [string, string];
      [HISTORY_IDX_BY_KIND]: string;
    };
  };
  [SNAPSHOTS_STORE]: {
    key: number;
    value: SnapshotRow;
    indexes: {
      [SNAPSHOTS_IDX_BY_DATE]: string;
    };
  };
  [KV_STORE]: {
    key: string;
    value: KvRow;
  };
}

// ---- Zod schemas (for import validation, spec §8.5) ----

// Note: TS types and Zod schemas live in the same vicinity per R7 rule.
// We validate the top-level shape strictly; nested objects use `passthrough`
// in places where exhaustive Zod mirroring adds little safety (e.g. rewards
// labels are free-form strings). Discriminated unions ARE validated for
// history events so untrusted imports can't smuggle unknown kinds.

const brandedString = z.string();

const clipColorSchema = z.enum(['red', 'blue', 'green', 'yellow', 'purple', 'pink']);

const clipSchema = z.union([
  z.object({
    id: brandedString,
    jarId: brandedString,
    kind: z.literal('regular'),
    color: clipColorSchema,
  }),
  z.object({
    id: brandedString,
    jarId: brandedString,
    kind: z.literal('gold'),
  }),
]);

const bagCompositionSchema = z.object({
  colors: z.array(clipColorSchema),
  regularPerColor: z.number().int().nonnegative(),
  goldCount: z.number().int().nonnegative(),
});

const milestoneIdSchema = z.enum(['mini', 'mid', 'moonshot']);

const milestoneSchema = z.object({
  id: milestoneIdSchema,
  label: z.string(),
  target: z.number().nonnegative(),
});

const milestoneClaimSchema = z
  .object({ claimedAt: brandedString })
  .nullable();

const jarStateSchema = z.object({
  jarId: brandedString,
  total: z.number(),
  milestones: z.object({
    mini: milestoneSchema,
    mid: milestoneSchema,
    moonshot: milestoneSchema,
  }),
  claimed: z.object({
    mini: milestoneClaimSchema,
    mid: milestoneClaimSchema,
    moonshot: milestoneClaimSchema,
  }),
});

const mainTierSchema = z.enum(['T1', 'T2', 'T3', 'BONUS', 'JACKPOT']);
const tierSchema = z.enum(['T1', 'T2', 'T3']);
const bonusSegmentSchema = z.enum(['PCT_75', 'PCT_50', 'PCT_25', 'FREE', 'EXTRA']);

const wheelConfigSchema = z.object({
  jarId: brandedString,
  weights: z.record(mainTierSchema, z.number()),
  bonusWeights: z.record(bonusSegmentSchema, z.number()),
  mercyChance: z.number(),
});

const bonusTimerSchema = z.object({
  id: brandedString,
  jarId: brandedString,
  spawnedAt: brandedString,
  endTimestamp: brandedString.refine((s) => !Number.isNaN(Date.parse(s)), {
    message: 'endTimestamp must be valid ISO',
  }), // R1(e)
  segment: z.enum(['PCT_75', 'PCT_50', 'PCT_25']),
  percent: z.union([z.literal(75), z.literal(50), z.literal(25)]),
  originHabitId: brandedString.nullable(),
  status: z.enum(['active', 'completed', 'expired', 'cancelled']),
});

const bonusTimerStateSchema = z.object({
  timers: z.array(bonusTimerSchema),
  pendingBonusSpins: z.number().int().nonnegative(),
});

const habitUnitSchema = z.union([
  z.object({ kind: z.literal('count'), target: z.number(), unit: z.string() }),
  z.object({ kind: z.literal('minutes'), target: z.number() }),
  z.object({ kind: z.literal('sets'), target: z.number() }),
  z.object({
    kind: z.literal('bundle'),
    subItems: z.array(z.string()),
    cutoffLocal: z.string(),
  }),
]);

const habitSchema = z.object({
  id: brandedString,
  name: z.string(),
  unit: habitUnitSchema,
  createdAt: brandedString,
  archived: z.boolean(),
});

const hygieneBundleStateSchema = z.object({
  jarId: brandedString,
  date: brandedString,
  subItemsCompleted: z.record(z.string(), brandedString.nullable()),
  cutoffLocal: z.string(),
  awarded: z.boolean(),
  awardedAt: brandedString.nullable(),
});

const rewardSchema = z.object({
  id: brandedString,
  tier: tierSchema,
  label: z.string(),
  createdAt: brandedString,
  archived: z.boolean(),
});

const streakStateSchema = z.object({
  jarId: brandedString,
  daily: z.object({
    current: z.number(),
    longest: z.number(),
    lastClipDate: brandedString.nullable(),
  }),
  hygiene: z.object({
    current: z.number(),
    longest: z.number(),
    lastCompletedDate: brandedString.nullable(),
  }),
  perHabit: z.record(
    z.string(),
    z.object({
      current: z.number(),
      longest: z.number(),
      lastCompletedDate: brandedString.nullable(),
    }),
  ),
  bonusChain: z.object({
    current: z.number(),
    longest: z.number(),
  }),
});

const settingsSchema = z.object({
  bagComposition: bagCompositionSchema,
  sfxEnabled: z.boolean(),
  hapticsEnabled: z.boolean(),
  hygieneCutoffLocal: z.string(),
  handSoftCapNudge: z.object({
    enabled: z.boolean(),
    cap: z.number(),
  }),
  workTimerOptIn: z.record(z.string(), z.boolean()),
  pwaRefreshPromptDismissedUntil: brandedString.nullable(),
  personalName: z.string().nullable(),
  spinStyle: z.enum(['wheel', 'reels']).default('wheel'),
});

// History event — discriminated union (R7). Keep in sync with src/types/history.ts.

const eventBase = {
  id: brandedString,
  at: brandedString,
  jarId: brandedString,
};

const historyEventSchema = z.discriminatedUnion('kind', [
  z.object({
    ...eventBase,
    kind: z.literal('clip_earned'),
    source: z.enum(['habit', 'bonus-discount', 'bonus-free', 'jackpot-bonus']),
    habitId: brandedString.nullable(),
    clipId: brandedString,
    drawnColor: z.union([clipColorSchema, z.literal('gold')]),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('bag_refilled'),
    composition: bagCompositionSchema,
  }),
  z.object({
    ...eventBase,
    kind: z.literal('cash_in'),
    clips: z.array(brandedString),
    matchKind: z.enum(['none', 'two-match', 'three-match', 'gold-instant-T3']),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('main_spin'),
    result: z.object({ tier: mainTierSchema }),
    unlockedTier: tierSchema.nullable(),
    rewardSelected: brandedString.nullable(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('near_miss'),
    actualTier: mainTierSchema,
    blockedBy: tierSchema,
  }),
  z.object({
    ...eventBase,
    kind: z.literal('near_miss_theater'),
    driftedPast: tierSchema,
  }),
  z.object({
    ...eventBase,
    kind: z.literal('bonus_spin'),
    result: z.union([
      z.object({
        segment: z.enum(['PCT_75', 'PCT_50', 'PCT_25']),
        percent: z.union([z.literal(75), z.literal(50), z.literal(25)]),
      }),
      z.object({ segment: z.literal('FREE') }),
      z.object({ segment: z.literal('EXTRA') }),
    ]),
    timerId: brandedString.nullable(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('bonus_timer_started'),
    timerId: brandedString,
    endTimestamp: brandedString,
    segment: z.enum(['PCT_75', 'PCT_50', 'PCT_25']),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('bonus_completed'),
    timerId: brandedString,
    habitId: brandedString,
  }),
  z.object({
    ...eventBase,
    kind: z.literal('bonus_expired'),
    timerId: brandedString,
  }),
  z.object({
    ...eventBase,
    kind: z.literal('milestone_unlocked'),
    milestone: milestoneIdSchema,
    total: z.number(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('milestone_claimed'),
    milestone: milestoneIdSchema,
    reset: z.boolean(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('jar_reset'),
    from: z.number(),
    reason: z.literal('moonshot-claimed'),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('streak_incremented'),
    streak: z.enum(['daily', 'hygiene', 'bonus-chain']),
    value: z.number(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('streak_broken'),
    streak: z.enum(['daily', 'hygiene', 'bonus-chain']),
    lastValue: z.number(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('streak_milestone_awarded'),
    streakValue: z.number(),
    tier: z.enum(['century', 'millennium']),
    regularChips: z.number(),
    goldChips: z.number(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('reward_claimed'),
    rewardId: brandedString.nullable(),
    tier: tierSchema,
    source: z.enum(['wheel', 'gold', 'jackpot']),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('habit_completed'),
    habitId: brandedString,
    unitsCompleted: z.number(),
    clipsEarned: z.number(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('hygiene_subitem_checked'),
    subItem: z.string(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('settings_changed'),
    path: z.string(),
    before: z.unknown(),
    after: z.unknown(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('import_performed'),
    backupId: z.string().nullable(),
  }),
  z.object({
    ...eventBase,
    kind: z.literal('export_performed'),
  }),
]);

export const appStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  jars: z.record(z.string(), jarStateSchema),
  bags: z.record(z.string(), z.array(clipSchema)),
  hands: z.record(z.string(), z.array(clipSchema)),
  wheelConfigs: z.record(z.string(), wheelConfigSchema),
  streaks: z.record(z.string(), streakStateSchema),
  bonusTimerState: z.record(z.string(), bonusTimerStateSchema),
  pendingHygieneBundle: z.record(z.string(), hygieneBundleStateSchema.nullable()),
  habits: z.array(habitSchema),
  rewards: z.object({
    T1: z.array(rewardSchema),
    T2: z.array(rewardSchema),
    T3: z.array(rewardSchema),
  }),
  history: z.array(historyEventSchema),
  settings: settingsSchema,
  activeJarId: brandedString,
  installPromptShown: z.boolean(),
  firstRunCompleted: z.boolean(),
  pendingStreakCelebration: z
    .object({
      jarId: brandedString,
      streakValue: z.number(),
      tier: z.enum(['century', 'millennium']),
      regularChips: z.number(),
      goldChips: z.number(),
    })
    .nullable(),
});

// Exported shape of what gets exported to a file. Versioned envelope.
export const exportEnvelopeSchema = z.object({
  kind: z.literal('kakeguruimasho-export'),
  envelopeVersion: z.literal(1),
  exportedAt: z.string(),
  appState: appStateSchema,
  historyEvents: z.array(historyEventSchema), // full-lifetime log (§4.5)
});

export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;

export { historyEventSchema };
