// Default seed data (spec §6, D2, D5).

import {
  DEFAULT_JAR_ID,
  type JarId,
  asHabitId,
  asRewardId,
  type HabitId,
  type MilestoneId,
} from '../types/ids.ts';
import {
  DEFAULT_CLIP_COLORS,
  type BagComposition,
  type Clip,
} from '../types/clip.ts';
import type { JarState, Milestone, MilestoneClaim } from '../types/jar.ts';
import type { WheelConfig } from '../types/wheel.ts';
import type { StreakState } from '../types/streak.ts';
import type { BonusTimerState } from '../types/bonus.ts';
import type { Habit } from '../types/habit.ts';
import type { Reward } from '../types/reward.ts';
import type { Settings } from '../types/settings.ts';
import type { AppState } from '../types/app-state.ts';
import { SCHEMA_VERSION } from '../types/app-state.ts';
import { nowISO } from './../lib/time.ts';
import { newClipId } from '../lib/id.ts';

// Stable habit IDs so tests and onboarding can reference them.
export const DEFAULT_HABIT_IDS = {
  walk: asHabitId('habit_walk'),
  workout: asHabitId('habit_workout'),
  cleaning: asHabitId('habit_cleaning'),
  focusedWork: asHabitId('habit_focused_work'),
  hygiene: asHabitId('habit_hygiene_bundle'),
} as const;

export function defaultBagComposition(): BagComposition {
  // D2: 6 colors × 10 regular + 1 gold = 61 clips.
  return {
    colors: [...DEFAULT_CLIP_COLORS],
    regularPerColor: 10,
    goldCount: 1,
  };
}

export function defaultWheelConfig(jarId: JarId = DEFAULT_JAR_ID): WheelConfig {
  // Spec §5.6 / §6.5.
  return {
    jarId,
    weights: {
      T1: 0.4,
      T2: 0.3,
      T3: 0.2,
      BONUS: 0.08,
      JACKPOT: 0.02,
    },
    // Spec §5.7.
    bonusWeights: {
      PCT_75: 0.35,
      PCT_50: 0.25,
      PCT_25: 0.15,
      FREE: 0.1,
      EXTRA: 0.15,
    },
    mercyChance: 0, // D5
  };
}

export function defaultHabits(): Habit[] {
  const createdAt = nowISO();
  return [
    {
      id: DEFAULT_HABIT_IDS.walk,
      name: 'Walk',
      unit: { kind: 'count', target: 2500, unit: 'steps' },
      createdAt,
      archived: false,
    },
    {
      id: DEFAULT_HABIT_IDS.workout,
      name: 'Workout',
      unit: { kind: 'sets', target: 4 },
      createdAt,
      archived: false,
    },
    {
      id: DEFAULT_HABIT_IDS.cleaning,
      name: 'Cleaning',
      unit: { kind: 'minutes', target: 20 },
      createdAt,
      archived: false,
    },
    {
      id: DEFAULT_HABIT_IDS.focusedWork,
      name: 'Focused work',
      unit: { kind: 'minutes', target: 30 },
      createdAt,
      archived: false,
    },
    {
      id: DEFAULT_HABIT_IDS.hygiene,
      name: 'Hygiene bundle',
      unit: {
        kind: 'bundle',
        subItems: ['shower', 'brush teeth', 'wash face', 'in bed by cutoff'],
        cutoffLocal: '01:00', // Q5 default
      },
      createdAt,
      archived: false,
    },
  ];
}

export function defaultRewards(): {
  T1: Reward[];
  T2: Reward[];
  T3: Reward[];
} {
  const createdAt = nowISO();
  const make = (labels: string[], tier: 'T1' | 'T2' | 'T3'): Reward[] =>
    labels.map((label, i) => ({
      id: asRewardId(`reward_${tier.toLowerCase()}_${i}`),
      tier,
      label,
      createdAt,
      archived: false,
    }));

  return {
    // Spec §6.2
    T1: make(
      [
        '15 min Instagram / TikTok / Reels',
        '15 min YouTube rabbit hole',
        'One YouTube video under 15 min',
        '15 min Reddit scroll',
        '10–15 min Pinterest spiral',
        '15 min X / Twitter',
        '15 min window-shopping online (no checkout)',
        'One long article or Substack post',
        'One round of a casual phone game',
        '15 min news scroll',
        'One pre-portioned off-macro snack (single piece)',
        '15 min comfort-show background',
        'One fun-book chapter',
        '15 min browsing Etsy / Ravelry / yarn shops (no purchase)',
      ],
      'T1',
    ),
    // Spec §6.3
    T2: make(
      [
        '1 game of Valorant',
        '30-min uninterrupted scroll session',
        'One sitcom episode',
        '45 min Reels / TikTok indulgence',
        'Specialty coffee or takeout snack',
        '1 hour gaming (other games)',
        'One movie-prep session (watch trailers, pick film, make snacks)',
      ],
      'T2',
    ),
    // Spec §6.4
    T3: make(
      [
        '2 games of Valorant',
        'Full movie (at home or theater)',
        'In-N-Out run',
        "Mr. Moto's Pizza",
        '90-min aimless scroll, guilt-free',
        'Full evening gaming session',
        'Takeout dinner from somewhere good',
        'Whole comfort-show binge night',
      ],
      'T3',
    ),
  };
}

export function defaultMilestones(): Record<MilestoneId, Milestone> {
  // §6.7: blank on first run, user fills during onboarding. Targets set to 0
  // so "unlock" never fires spuriously; onboarding must write real targets.
  return {
    mini: { id: 'mini', label: '', target: 0 },
    mid: { id: 'mid', label: '', target: 0 },
    moonshot: { id: 'moonshot', label: '', target: 0 },
  };
}

export function defaultJarState(jarId: JarId = DEFAULT_JAR_ID): JarState {
  const claimed: Record<MilestoneId, MilestoneClaim> = {
    mini: null,
    mid: null,
    moonshot: null,
  };
  return {
    jarId,
    total: 0,
    milestones: defaultMilestones(),
    claimed,
  };
}

export function defaultStreakState(jarId: JarId = DEFAULT_JAR_ID): StreakState {
  return {
    jarId,
    daily: { current: 0, longest: 0, lastClipDate: null },
    hygiene: { current: 0, longest: 0, lastCompletedDate: null },
    perHabit: {},
    bonusChain: { current: 0, longest: 0 },
  };
}

export function defaultBonusTimerState(): BonusTimerState {
  return { timers: [], pendingBonusSpins: 0 };
}

export function defaultSettings(): Settings {
  const workTimerOptIn: Record<HabitId, boolean> = {};
  return {
    bagComposition: defaultBagComposition(),
    sfxEnabled: true,
    hapticsEnabled: true,
    hygieneCutoffLocal: '01:00', // Q5
    handSoftCapNudge: { enabled: false, cap: 20 }, // Q2
    workTimerOptIn, // Q3
    pwaRefreshPromptDismissedUntil: null,
    personalName: null,
  };
}

/**
 * Build a brand-new `AppState` for a fresh install.
 * Bag is seeded empty; first draw will trigger a bag refill via the engine.
 * (We do not pre-fill the bag here so that the `bag_refilled` event can be
 * the canonical "first" history event when the user actually starts.)
 *
 * Actually — that's racy w.r.t. first-draw semantics. Simpler: seed the bag
 * filled. The caller can reset if desired.
 */
export function seedInitialAppState(): AppState {
  const jarId = DEFAULT_JAR_ID;
  const bag = seedBagClips(defaultBagComposition(), jarId);
  return {
    schemaVersion: SCHEMA_VERSION,
    jars: { [jarId]: defaultJarState(jarId) },
    bags: { [jarId]: bag },
    hands: { [jarId]: [] },
    wheelConfigs: { [jarId]: defaultWheelConfig(jarId) },
    streaks: { [jarId]: defaultStreakState(jarId) },
    bonusTimerState: { [jarId]: defaultBonusTimerState() },
    pendingHygieneBundle: { [jarId]: null },
    habits: defaultHabits(),
    rewards: defaultRewards(),
    history: [],
    settings: defaultSettings(),
    activeJarId: jarId,
    installPromptShown: false,
    firstRunCompleted: false,
  };
}

/**
 * Seed clips for a bag of the given composition. 3B's bag engine will
 * replace the stub randomness in its draw function — the shape here is
 * what `bags[jarId]` looks like immediately after a refill.
 */
export function seedBagClips(comp: BagComposition, jarId: JarId): Clip[] {
  const out: Clip[] = [];
  for (const color of comp.colors) {
    for (let i = 0; i < comp.regularPerColor; i++) {
      out.push({
        id: newClipId(),
        jarId,
        kind: 'regular',
        color,
      });
    }
  }
  for (let i = 0; i < comp.goldCount; i++) {
    out.push({ id: newClipId(), jarId, kind: 'gold' });
  }
  return out;
}
