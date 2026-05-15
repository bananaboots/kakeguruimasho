# ARCHITECTURE.md — kakeguruimasho Phase 2 Blueprint

**Status:** Authoritative. Phase 3 subagent briefs derive from §7.
**Inputs:** `SPEC.md`, `DECISIONS.md` (D1–D5), `PLANNING.md` (A1–A19 + Wave plan), `reference-methodology.txt`.
**Out of scope here:** any application code, `package.json`, folder skeleton on disk, README. This doc is a blueprint only.

Cross-reference convention: `spec §5.5` = `SPEC.md` section 5.5; `D3` = decision 3 in `DECISIONS.md`; `A17` = ambiguity 17 in `PLANNING.md`.

---

## 1. Final Tech Stack

All versions pinned to current-stable as of **April 2026**. Anything below marked "uncertain" should be re-verified by 3A when bootstrapping `package.json`, but do not drift majors without architect sign-off.

| Layer | Choice | Version pin | Rationale |
|---|---|---|---|
| Language | TypeScript (strict) | `~5.7.0` | Spec §7 mandates strict mode. 5.7 is current LTS-feeling stable; avoid 5.8-beta unless needed. |
| UI | React | `^19.0.0` | React 19 is stable; `use()` simplifies async boundaries for snapshot/import flows. No RSC — pure SPA. |
| Bundler | Vite | `^6.0.0` | Spec §7 mandates Vite. v6 is stable as of 2025-Q4; Rollup 4 under the hood, faster HMR. |
| Router | `react-router-dom` (HashRouter) | `^7.0.0` | Spec §7 + D-implied. HashRouter sidesteps GH Pages SPA 404s (PLANNING §4). |
| State | Zustand | `^5.0.0` | Spec §7.1. Small, slice-friendly, custom-persist-adapter for IndexedDB. |
| Persistence | `idb` (Jake Archibald) | `^8.0.0` | Promise wrapper over raw IDB. Chosen over `idb-keyval` because we need **multi-object-store + indexes + versioned migrations** (spec §8, A12). `idb-keyval` is too flat. Rejected Dexie (~30KB gz) for bundle budget. |
| Runtime validation | Zod | `^3.24.0` | Import validation (spec §8.5), schema version gating, history-event discriminator parsing. ~12KB gz — acceptable. |
| Styling | Tailwind CSS | `^4.0.0` | Spec §7.1. v4's zero-config engine cuts postcss plumbing. |
| Component primitives | shadcn/ui | copy-in (no version) | Spec §7.1. Ship only what we use (Dialog, Popover, Tabs, Toast, Button, Input, Slider, Switch). Each component ~1–3KB gz source. See §9 bundle budget. |
| Animation | Framer Motion | `^12.0.0` | Spec §7.1. Only the wheel + jar fill use it; `motion/react` tree-shakes to ~40KB gz. |
| Icons | `lucide-react` | `^0.460.0` | Spec §7.1. Tree-shakes per-icon. |
| PWA | `vite-plugin-pwa` | `^0.21.0` | SW + manifest + `registerSW({ onNeedRefresh })` (D-implied, Q10/Q13). Workbox under the hood. |
| Testing (unit) | Vitest | `^2.1.0` | Spec §7.1. Same Vite config = zero dual-config. |
| Testing (component) | React Testing Library | `^16.0.0` | Spec §7.1. |
| Testing (E2E) | Playwright | `^1.49.0` | Spec §9 Phase 4 — one smoke test. |
| Lint | ESLint | `^9.0.0` (flat config) | Spec §7.1. |
| Format | Prettier | `^3.4.0` | Spec §7.1. |
| Date math | native `Date` + `Intl` | — | Day-boundary logic (A5, A8) needs zero extra KB. Reject date-fns/Luxon unless a complex TZ case appears post-launch. |
| RNG | `crypto.getRandomValues` via wrapper | — | PLANNING §4 — avoid `Math.random`. Wrapper lives in `src/lib/rng.ts` for seeding in tests. |
| Cloud sync — CRDT | `yjs` + `y-indexeddb` | `^13.6.0` / `^9.0.0` | Optional. One `Y.Doc` per signed-in user; `y-indexeddb` mirrors it locally so offline-first still works. Scaffold today serializes full `AppState` as one JSON blob into a `Y.Map` entry — proper per-slice Yjs types is Phase 7. |
| Cloud sync — relay | `y-partykit` + `partykit` | `^0.0.33` / `^0.0.115` | Hosted PartyKit worker (`party/sync.ts`) handles the Yjs websocket protocol; `onBeforeConnect` verifies a Clerk JWT and rejects anyone whose `sub` claim doesn't match the room id. Free tier (Cloudflare Workers, 100k req/day). |
| Cloud sync — auth | `@clerk/clerk-react` + `@clerk/backend` | `^5.61.0` / `^3.3.0` | Client SDK + the backend verifier used inside the PartyKit worker. Free tier covers 10k MAU. Publishable key ships in the bundle; secret key lives only on the PartyKit relay. |

Sync is fully gated on `VITE_CLERK_PUBLISHABLE_KEY` + `VITE_PARTYKIT_HOST` being set at build time. When either is missing, `SyncGate` is a passthrough and the app runs exactly like the legacy single-device build — no Clerk mount, no websocket, no sign-in screen. See `src/sync/provider.ts` for the gate logic and `CLOUD_SYNC_SETUP.md` for the setup walkthrough.

**Explicitly rejected:** Redux Toolkit (heavier than Zustand for this scope), Dexie (bundle), date-fns (not needed for v1), Radix UI primitives directly (shadcn wraps them), react-spring (Framer Motion already chosen), Supabase/Firebase Realtime (neither supports proper CRDT merge semantics out of the box; picked Yjs for the Phase 7 path even though today's scaffold is LWW).

**Uncertain (verify at bootstrap):** Framer Motion v12 major pin — if a v13 exists by bootstrap time, stay on v12 unless required. Tailwind v4 is new — if 3A hits breaking-config issues, fall back to `^3.4.0` is acceptable (no architectural impact).

---

## 2. File / Folder Structure

Annotated with owning Phase 3 agent. Paths outside an agent's ownership are read-only for that agent.

```
kakeguruimasho/
├── .github/
│   └── workflows/
│       ├── ci.yml                       # [6] lint + test + build on PR
│       └── deploy.yml                   # [6] build + publish gh-pages on main (forwards VITE_CLERK_PUBLISHABLE_KEY + VITE_PARTYKIT_HOST)
├── party/
│   └── sync.ts                          # [Phase 7] PartyKit Yjs relay; Clerk JWT gate on onBeforeConnect
├── partykit.json                        # [Phase 7] PartyKit project config
├── public/
│   ├── icons/                           # [3J] apple-touch-icon sizes + favicon
│   ├── splash/                          # [3J] pwa-asset-generator output
│   └── manifest.webmanifest             # [3J] PWA manifest (generated via vite-plugin-pwa)
├── src/
│   ├── main.tsx                         # [3J] React root, HashRouter, StoreProvider, theme
│   ├── App.tsx                          # [3J] route tree, error boundary, bonus-banner slot
│   ├── routes/
│   │   ├── Home.tsx                     # [3J] shell composes [3D quick-log] + [3E hand/spin] + [3G jar-snippet]
│   │   ├── Habits.tsx                   # [3D]
│   │   ├── Rewards.tsx                  # [3F]
│   │   ├── Jar.tsx                      # [3G]
│   │   ├── History.tsx                  # [3G] last 7 days activity feed
│   │   ├── Settings.tsx                 # [3I]
│   │   └── Onboarding.tsx               # [3I]
│   ├── features/
│   │   ├── bag/
│   │   │   ├── bag.engine.ts            # [3B] pure functions
│   │   │   ├── bag.engine.test.ts       # [3B] 10k-draw distribution tests
│   │   │   └── BagCompositionView.tsx   # [3B] visual composition display
│   │   ├── wheel/
│   │   │   ├── wheel.engine.ts          # [3C] pure RNG resolve
│   │   │   ├── wheel.engine.test.ts     # [3C] 10k-spin distribution tests
│   │   │   ├── WheelCanvas.tsx          # [3C] Framer Motion circular wheel
│   │   │   ├── BonusWheelCanvas.tsx     # [3C]
│   │   │   ├── near-miss.ts             # [3C] D3 drift-past animation controller
│   │   │   └── sfx.ts                   # [3C] Web Audio hooks (spin/win/near-miss/gold)
│   │   ├── habits/
│   │   │   ├── HabitList.tsx            # [3D]
│   │   │   ├── HabitEditor.tsx          # [3D]
│   │   │   ├── QuickLogButton.tsx       # [3D]
│   │   │   ├── HygieneBundle.tsx        # [3D] 4 checkboxes + next-morning award (A5)
│   │   │   ├── StepEntry.tsx            # [3D] batched floor(steps/2500) (PLANNING §6.4)
│   │   │   └── InlineTimer.tsx          # [3D] 20/30-min timer (v1 button-only; timer is v1.1 stub)
│   │   ├── spin/
│   │   │   ├── HandView.tsx             # [3E]
│   │   │   ├── CashInPicker.tsx         # [3E] 0/2/3/gold matrix
│   │   │   ├── SpinButton.tsx           # [3E]
│   │   │   ├── GoldInstantT3Button.tsx  # [3E]
│   │   │   ├── PostSpinFlow.tsx         # [3E] orchestrator after wheel resolves
│   │   │   └── spin.machine.ts          # [3E] XState-like plain reducer for spin FSM
│   │   ├── rewards/
│   │   │   ├── RewardMenu.tsx           # [3F] tier T1/T2/T3 CRUD
│   │   │   ├── RewardPickerModal.tsx    # [3F] invoked on wheel win
│   │   │   └── reward-rules-sidebar.tsx # [3F] verbatim 3-rules copy (A19)
│   │   ├── jar/
│   │   │   ├── JarVisual.tsx            # [3G] SVG fill
│   │   │   ├── MilestoneEditor.tsx      # [3G]
│   │   │   ├── MilestoneClaimModal.tsx  # [3G] D1 reset-only-at-moonshot flow
│   │   │   ├── ActivityFeed.tsx         # [3G]
│   │   │   └── StreakDisplay.tsx        # [3G]
│   │   ├── bonus/
│   │   │   ├── BonusTimerBanner.tsx     # [3H] persistent cross-route banner
│   │   │   ├── BonusTimerCountdown.tsx  # [3H] endTimestamp-driven (A3)
│   │   │   ├── DiscountHabitPicker.tsx  # [3H]
│   │   │   ├── bonus.machine.ts         # [3H] EXTRA chain FSM (A2/A3)
│   │   │   └── just-a-little-bit-more.ts# [3H] A18 delta-copy helper
│   │   └── onboarding/
│   │       ├── OnboardingFlow.tsx       # [3I] 3–5 screens
│   │       └── RewardRulesScreen.tsx    # [3I] A19 verbatim PDF canon
│   ├── state/
│   │   ├── store.ts                     # [3A] Zustand root (combines slices)
│   │   ├── slices/
│   │   │   ├── appMeta.slice.ts         # [3A] schemaVersion, active jarId
│   │   │   ├── habits.slice.ts          # [3A]
│   │   │   ├── rewards.slice.ts         # [3A]
│   │   │   ├── jars.slice.ts            # [3A] jars + bags + hands (per D4)
│   │   │   ├── wheelConfig.slice.ts     # [3A]
│   │   │   ├── history.slice.ts         # [3A] append-only
│   │   │   ├── bonus.slice.ts           # [3A] array of concurrent timers (A3)
│   │   │   ├── hygiene.slice.ts         # [3A]
│   │   │   ├── streaks.slice.ts         # [3A]
│   │   │   └── settings.slice.ts        # [3A]
│   │   ├── selectors.ts                 # [3A] derived values (jar total → $, hand groupings)
│   │   └── persist.ts                   # [3A] Zustand IDB storage adapter
│   ├── sync/                            # [Phase 7] optional cloud sync layer
│   │   ├── SyncGate.tsx                 # wraps <App> in ClerkProvider + sign-in gate; passthrough when env unset
│   │   ├── provider.ts                  # useSyncConnection() hook; owns the Y.Doc
│   │   └── bridge.ts                    # round-trips AppState through Y.Map 'app'.state entry → actions.hydrate()
│   ├── db/
│   │   ├── schema.ts                    # [3A] store names, index names, version constant
│   │   ├── open.ts                      # [3A] idb.openDB + upgrade router
│   │   ├── migrations/
│   │   │   ├── index.ts                 # [3A] registry (v1 = no-op seed)
│   │   │   └── README-migration-rules   # [3A] comment-only convention file
│   │   ├── snapshots.ts                 # [3A] daily snapshot job (A5 day boundary aware)
│   │   ├── export.ts                    # [3A] JSON blob download
│   │   └── import.ts                    # [3A] Zod-validate + full replace
│   ├── types/                           # [3A] ALL shared types; others import read-only
│   │   ├── app-state.ts
│   │   ├── clip.ts
│   │   ├── jar.ts
│   │   ├── wheel.ts
│   │   ├── bonus.ts
│   │   ├── habit.ts
│   │   ├── reward.ts
│   │   ├── history.ts                   # discriminated union of all HistoryEvent variants
│   │   ├── streak.ts
│   │   ├── settings.ts
│   │   └── ids.ts                       # branded JarId, HabitId, RewardId, ClipId, etc.
│   ├── lib/
│   │   ├── rng.ts                       # [3A+3J shared] crypto-backed RNG + seed for tests
│   │   ├── time.ts                      # [3A] day-boundary, local-midnight, TZ-safe helpers (A5/A8)
│   │   ├── id.ts                        # [3A] UUIDv7-style monotonic ID factory
│   │   ├── haptics.ts                   # [3C] navigator.vibrate wrapper (no-op on iOS)
│   │   └── storage-persist.ts           # [3J] navigator.storage.persist() on first draw
│   ├── ui/                              # [3J] shadcn-vendored primitives (Button, Dialog, etc.)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── slider.tsx
│   │   ├── switch.tsx
│   │   ├── input.tsx
│   │   └── popover.tsx
│   ├── styles/
│   │   ├── tokens.css                   # [3J] color palette, spacing, radii — single source of truth
│   │   ├── globals.css                  # [3J] tailwind @layer base + reset
│   │   └── theme.ts                     # [3J] dark-mode tokens as TS const for inline styles
│   ├── data/
│   │   └── defaults.ts                  # [3A] seed: 5 habits, T1/T2/T3 menus, bag composition (D2)
│   └── test/
│       ├── setup.ts                     # [3A] Vitest + RTL global config
│       ├── fixtures.ts                  # [3A] deterministic seed bags/hands
│       └── seeded-rng.ts                # [3A] Mulberry32 for reproducible tests
├── e2e/
│   └── smoke.spec.ts                    # [4] one Playwright test per spec §9 Phase 4
├── vite.config.ts                       # [3J + 6] base path, PWA plugin config
├── tailwind.config.ts                   # [3J]
├── tsconfig.json                        # [3A]
├── eslint.config.js                     # [3A]
├── .prettierrc                          # [3A]
└── (docs added by Phase 5)
```

Ownership legend: `[3A]`–`[3J]` per spec §9 Phase 3; `[4]` = Integration Agent; `[6]` = Deployment Agent.

**Hard rule:** `src/types/**` and `src/state/**` are **3A-only**. Wave 2–4 agents import; they do not add files here. New `HistoryEvent` variants are added via typed PR against `src/types/history.ts` with 3A as reviewer (see §7).

---

## 3. Data Schema (TypeScript)

All branded IDs in `src/types/ids.ts`. Every jar-scoped entity carries `jarId: JarId` per **D4**.

```ts
// ===== src/types/ids.ts =====

export type JarId    = string & { readonly __brand: "JarId" };
export type HabitId  = string & { readonly __brand: "HabitId" };
export type RewardId = string & { readonly __brand: "RewardId" };
export type ClipId   = string & { readonly __brand: "ClipId" };
export type EventId  = string & { readonly __brand: "EventId" };
// Phase 7: relaxed from the 'mini' | 'mid' | 'moonshot' union to a branded
// string so users can add arbitrary intermediate milestones. The three
// canonical ids ('mini' / 'mid' / 'moonshot') still always exist on every
// jar; only the literal MOONSHOT_MILESTONE_ID triggers reset-on-claim.
export type MilestoneId = string & { readonly __brand: "MilestoneId" };
export const MINI_MILESTONE_ID     = "mini"     as MilestoneId;
export const MID_MILESTONE_ID      = "mid"      as MilestoneId;
export const MOONSHOT_MILESTONE_ID = "moonshot" as MilestoneId;

export type ISOTimestamp = string & { readonly __brand: "ISOTimestamp" };
export type LocalDate    = string & { readonly __brand: "LocalDate" }; // "YYYY-MM-DD" in device-local TZ (A8)

export const DEFAULT_JAR_ID = "default" as JarId; // D4: v1 seed
```

```ts
// ===== src/types/clip.ts =====

export type ClipColor = "red" | "blue" | "green" | "yellow" | "purple" | "pink";
// Color palette is user-configurable (spec §5.3); string-enum keeps it extensible.

export type Clip =
  | { id: ClipId; jarId: JarId; kind: "regular"; color: ClipColor }
  | { id: ClipId; jarId: JarId; kind: "gold" };
// Gold has no color — indistinguishable in the bag, revealed on draw (spec §5.3).
```

```ts
// ===== src/types/jar.ts =====

export type Milestone = {
  id: MilestoneId;
  label: string;   // user-entered ("Hawaii upgrade")
  target: number;  // dollar threshold; $1 per clip (spec §5.9, A10)
};

export type MilestoneClaim = {
  claimedAt: ISOTimestamp;
} | null;
// null = not yet claimed. Non-null means user has redeemed the milestone IRL.

export type JarState = {
  jarId: JarId;
  total: number;                                          // running $, never resets on mini/mid claim (D1)
  milestones: Record<MilestoneId, Milestone>;             // three canonical always present; users can add more (Phase 7)
  claimed: Record<MilestoneId, MilestoneClaim>;           // D1: set non-null on user claim action
  // Moonshot claim triggers full-jar-reset flow (see AppState.pendingJarResets).
  // resetJar() loops Object.keys(claimed) so user-added checkpoints clear too.
};
```

```ts
// ===== src/types/wheel.ts =====

export type MainWheelTier = "T1" | "T2" | "T3" | "BONUS" | "JACKPOT";

export type WheelConfig = {
  jarId: JarId;                                   // D4
  weights: Record<MainWheelTier, number>;         // must sum to 1.0; editor auto-normalizes (A16)
  bonusWeights: Record<BonusSegment, number>;     // sums to 1.0
  mercyChance: number;                            // D5: v1 schema carries this; default 0; v1.1 will consume
};

export type BonusSegment = "PCT_75" | "PCT_50" | "PCT_25" | "FREE" | "EXTRA";

export type MainSpinResult = {
  tier: MainWheelTier;
  // No jarId here — tier resolution is per-spin; WheelConfig's jarId tags which wheel ran.
};

export type BonusSpinResult =
  | { segment: "PCT_75" | "PCT_50" | "PCT_25"; percent: 75 | 50 | 25 }
  | { segment: "FREE" }
  | { segment: "EXTRA" };
```

```ts
// ===== src/types/bonus.ts =====

export type BonusTimerId = string & { readonly __brand: "BonusTimerId" };

// A3 + PLANNING: bonus timers are an ARRAY — multiple can run concurrently
// when EXTRA fires and user hasn't completed the earlier discount yet.
export type BonusTimer = {
  id: BonusTimerId;
  jarId: JarId;
  spawnedAt: ISOTimestamp;
  endTimestamp: ISOTimestamp;                     // authoritative; timer = endTs - Date.now()
  segment: "PCT_75" | "PCT_50" | "PCT_25";
  percent: 75 | 50 | 25;
  originHabitId: HabitId | null;                  // may be unset until user picks (A18 delta copy)
  status: "active" | "completed" | "expired" | "cancelled";
};

// BonusTimerState is NOT a singleton.
export type BonusTimerState = {
  timers: BonusTimer[];                           // spawn-ordered
  // Pending EXTRA-generated spins not yet resolved. Spin resolution adds to `timers` or awards FREE clip.
  pendingBonusSpins: number;                      // queue depth; decremented per bonus wheel resolve
};
```

```ts
// ===== src/types/habit.ts =====

export type HabitUnit =
  | { kind: "count"; target: number; unit: string }           // e.g. steps: 2500 / "steps"
  | { kind: "minutes"; target: number }                        // cleaning 20 min, work 30 min
  | { kind: "sets"; target: number }                           // workout 4 sets
  | { kind: "bundle"; subItems: string[]; cutoffLocal: string } // hygiene bundle; cutoff default "01:00"
  ;

export type Habit = {
  id: HabitId;
  name: string;
  unit: HabitUnit;
  createdAt: ISOTimestamp;
  archived: boolean;
  // No jarId — habits are global across jars (spec §3.1 single-jar v1; v2 multi-jar will tag here).
  // When v2 ships, architect adds `jarId: JarId` as NOT NULL with a migration.
};

export type HygieneBundleState = {
  jarId: JarId;                                                // D4
  // Per spec §5.8: awarded retroactively on next app open after midnight.
  // Per A5: if all 4 complete BEFORE cutoff, award immediately.
  date: LocalDate;                                             // which local day this bundle is being tracked for
  subItemsCompleted: Record<string, ISOTimestamp | null>;      // keys mirror Habit.unit.subItems
  cutoffLocal: string;                                         // redundant-with-Habit for snapshot-locked evaluation
  awarded: boolean;
  awardedAt: ISOTimestamp | null;
};
```

```ts
// ===== src/types/reward.ts =====

export type Tier = "T1" | "T2" | "T3";

export type Reward = {
  id: RewardId;
  tier: Tier;
  label: string;
  createdAt: ISOTimestamp;
  archived: boolean;
  // No validation field for the "3 reward rules" (A19) — enforcement is cultural copy, not code.
};
```

```ts
// ===== src/types/history.ts — THE DISCRIMINATED UNION =====
// Append-only log. Every agent's variant lives here. 3A is sole owner of this file.

export type HistoryEventBase = {
  id: EventId;
  at: ISOTimestamp;
  jarId: JarId;                                                // D4 — every event is jar-scoped
};

export type HistoryEvent =
  // ----- 3B bag & draw events
  | HistoryEventBase & { kind: "clip_earned"; source: "habit" | "bonus-discount" | "bonus-free" | "jackpot-bonus"; habitId: HabitId | null; clipId: ClipId; drawnColor: ClipColor | "gold" }
  | HistoryEventBase & { kind: "bag_refilled"; composition: BagComposition }
  // ----- 3E cash-in & spin events
  | HistoryEventBase & { kind: "cash_in"; clips: ClipId[]; matchKind: "none" | "two-match" | "three-match" | "gold-instant-T3" }
  // ----- 3C wheel events
  | HistoryEventBase & { kind: "main_spin"; result: MainSpinResult; unlockedTier: Tier | null; rewardSelected: RewardId | null }
  | HistoryEventBase & { kind: "near_miss"; actualTier: MainWheelTier; blockedBy: Tier } // wheel RNG'd T2/T3 without cash-in
  | HistoryEventBase & { kind: "near_miss_theater"; driftedPast: Tier } // D3 cosmetic drift log — non-user-facing, for tuning
  | HistoryEventBase & { kind: "bonus_spin"; result: BonusSpinResult; timerId: BonusTimerId | null }
  // ----- 3H bonus timer events
  | HistoryEventBase & { kind: "bonus_timer_started"; timerId: BonusTimerId; endTimestamp: ISOTimestamp; segment: "PCT_75" | "PCT_50" | "PCT_25" }
  | HistoryEventBase & { kind: "bonus_completed"; timerId: BonusTimerId; habitId: HabitId }
  | HistoryEventBase & { kind: "bonus_expired"; timerId: BonusTimerId }
  // ----- 3G jar & streak events
  | HistoryEventBase & { kind: "milestone_unlocked"; milestone: MilestoneId; total: number }
  | HistoryEventBase & { kind: "milestone_claimed"; milestone: MilestoneId; reset: boolean } // reset=true only for moonshot (D1)
  | HistoryEventBase & { kind: "jar_reset"; from: number; reason: "moonshot-claimed" }
  | HistoryEventBase & { kind: "streak_incremented"; streak: "daily" | "hygiene" | "bonus-chain"; value: number }
  | HistoryEventBase & { kind: "streak_broken"; streak: "daily" | "hygiene" | "bonus-chain"; lastValue: number }
  // ----- 3F reward events
  | HistoryEventBase & { kind: "reward_claimed"; rewardId: RewardId; tier: Tier; source: "wheel" | "gold" | "jackpot" }   // A6, A11
  // ----- 3D habit events
  | HistoryEventBase & { kind: "habit_completed"; habitId: HabitId; unitsCompleted: number; clipsEarned: number }
  | HistoryEventBase & { kind: "hygiene_subitem_checked"; subItem: string }
  // ----- 3I settings / lifecycle
  | HistoryEventBase & { kind: "settings_changed"; path: string; before: unknown; after: unknown }
  | HistoryEventBase & { kind: "import_performed"; backupId: string | null }
  | HistoryEventBase & { kind: "export_performed" }
  ;
```

```ts
// ===== src/types/streak.ts =====

export type StreakState = {
  jarId: JarId;                                                // D4
  daily: {
    current: number;
    longest: number;
    lastClipDate: LocalDate | null;                            // for rollover detection (A8)
  };
  hygiene: {
    current: number;
    longest: number;
    lastCompletedDate: LocalDate | null;
  };
  perHabit: Record<HabitId, {
    current: number;
    longest: number;
    lastCompletedDate: LocalDate | null;
  }>;
  bonusChain: {
    // Session-scoped per A2/A3 — not persisted forever. Resets on EXTRA chain end.
    current: number;
    longest: number;
  };
};
```

```ts
// ===== src/types/settings.ts =====

export type Settings = {
  bagComposition: BagComposition;                              // D2: { regularPerColor: 10, goldCount: 1, colors: [...] }
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  hygieneCutoffLocal: string;                                  // Q5-accepted: default "01:00"
  handSoftCapNudge: { enabled: boolean; cap: number };         // Q2-accepted: off by default, 20
  workTimerOptIn: Record<HabitId, boolean>;                    // Q3: v1 all false; v1.1 UI turns on
  pwaRefreshPromptDismissedUntil: ISOTimestamp | null;         // Q10/Q13
  personalName: string | null;                                 // optional, for onboarding greet
};

export type BagComposition = {
  colors: ClipColor[];                                         // default 6
  regularPerColor: number;                                     // D2: default 10
  goldCount: number;                                           // D2: default 1 (first-class)
};
```

```ts
// ===== src/types/app-state.ts =====
// Root shape persisted to IDB. Everything is jar-keyed (D4).

export type AppState = {
  schemaVersion: number;                                       // current = 1
  // D4: jars/bags/hands are record-keyed; v1 seeds exactly one entry under DEFAULT_JAR_ID.
  jars:  Record<JarId, JarState>;
  bags:  Record<JarId, Clip[]>;
  hands: Record<JarId, Clip[]>;
  wheelConfigs: Record<JarId, WheelConfig>;
  streaks:      Record<JarId, StreakState>;
  bonusTimerState: Record<JarId, BonusTimerState>;             // per-jar, array of concurrent timers (A3)
  pendingHygieneBundle: Record<JarId, HygieneBundleState | null>;
  // Global (non-jar-scoped) in v1 — will gain jarId in v2 if needed
  habits: Habit[];
  rewards: { T1: Reward[]; T2: Reward[]; T3: Reward[] };
  // Append-only; see §4 for retention/truncation
  history: HistoryEvent[];
  settings: Settings;
  // Metadata / ephemeral-ish
  activeJarId: JarId;                                          // v1 always DEFAULT_JAR_ID
  installPromptShown: boolean;
  firstRunCompleted: boolean;
};
```

Zod schemas mirror every type 1:1 in `src/db/schema.ts` (for import validation, spec §8.5). 3A is sole author; no other agent ships a Zod schema for persisted state.

---

## 4. IndexedDB Store Design

Library: **`idb` v8** (not `idb-keyval`). Reasoning: we need multiple object stores, indexes on history, and versioned upgrades — `idb-keyval`'s single-key-store model doesn't cover history queries or snapshot isolation without hand-rolling.

**Database name:** `kakeguruimasho`
**Current version:** `1`

### 4.1 Object stores

| Store | Key strategy | Indexes | Purpose |
|---|---|---|---|
| `app_state` | single document keyed by `"current"` (out-of-line key) | — | The one-and-only live `AppState` blob. Atomic replace on every mutation (spec §8.2). |
| `history_events` | `id` (in-line EventId) | `by_at` on `at`, `by_jar_at` compound `[jarId, at]`, `by_kind` on `kind` | Append-only mirror of `AppState.history`. Duplicated here for (a) efficient range queries without loading full state, (b) future truncation/rollup without touching live state. |
| `snapshots` | auto-increment `id` | `by_date` on `dateLocal` (LocalDate) | Daily JSON backups. Retention: last **30 days** (spec §8.3). Stored as compressed `Blob` (gzipped JSON). |
| `kv` | `key` (string) | — | Misc key/value: last-snapshot-date, migration-run markers, `hasPromptedPersist` flag. |

### 4.2 Why duplicate `history` in both `app_state.history` and `history_events`?

`AppState.history` is the canonical live source — Zustand reads from it. But we truncate `AppState.history` to the **last 500 events** on every mutation to keep the in-memory blob small (iOS 50MB-soft-cap concern, PLANNING Appendix). The `history_events` store keeps the **full lifetime log** independently for the activity feed (3G, last 7 days) and for export. Export includes the full `history_events` table; import writes to both.

### 4.3 Transaction model

Every mutation is **one IDB transaction** spanning the stores it touches. Canonical `MutationTx` shape:

```ts
type MutationTx = {
  appStatePatch: Partial<AppState>;                            // merged into current
  appendHistory: HistoryEvent[];                               // goes to both history_events and AppState.history
};
```

The adapter in `src/state/persist.ts` opens a `readwrite` transaction over `["app_state", "history_events"]`, reads current `app_state`, applies patch + appends, writes back. Single-document blob write is ~1–3ms on modern devices; well under spec §8.1's 100ms SLA.

### 4.4 Migration registry

```ts
// src/db/migrations/index.ts
type Migration = {
  from: number;
  to: number;
  up: (db: IDBDatabase, tx: IDBTransaction) => Promise<void>;
};

export const migrations: Migration[] = [
  // v1 is the baseline — no migrations yet. (A12)
];

// open.ts runs migrations where m.from <= oldVersion < m.to and m.to <= DB_VERSION.
```

**Hard rule:** once v1 ships, **never mutate an existing Migration entry**. Only append. Each migration is transactional — failure → rollback → abort open.

### 4.5 Import/export

- **Export:** reads `app_state` + all of `history_events` + active `snapshots` → JSON → `download` via `URL.createObjectURL` (3A).
- **Import:** accepts JSON; Zod-validates whole blob; confirm dialog; **full replace** (A11) — clears all three stores, writes fresh. Records `{ kind: "import_performed" }` history event referencing the previous-state snapshot ID it auto-creates pre-wipe.

### 4.6 Snapshot job

Runs on app open via `src/db/snapshots.ts`:
1. Read `kv["last_snapshot_date"]`.
2. If `< today` (device-local date, A8), serialize current `app_state` + gzipped via `CompressionStream`, insert into `snapshots`.
3. Delete snapshots where `dateLocal < today - 30 days`.
4. Update `kv["last_snapshot_date"]`.

Not on interval — on-open is sufficient per spec §8.3 and avoids iOS-backgrounded-timer problems.

### 4.7 Durability escalation

`src/lib/storage-persist.ts` calls `navigator.storage.persist()` after the user's **first successful draw** (PLANNING Appendix — delays the prompt until there's real state worth persisting). Result is logged but not surfaced as an error; fall back to daily snapshots.

---

## 5. State Management Topology (Zustand)

Single root store, slice-composed. Store uses a **custom IDB persist adapter** (`src/state/persist.ts`) — on each committed slice mutation, a debounced (16ms) write to IDB. The `appendHistory` call bypasses debounce — history writes are synchronous to IDB within the same tick to meet spec §8.1's 100ms SLA.

### 5.1 Slice map (who owns which subtree of `AppState`)

| Slice | Fields it owns in `AppState` | Primary writer agent | Primary readers |
|---|---|---|---|
| `appMetaSlice` | `schemaVersion`, `activeJarId`, `installPromptShown`, `firstRunCompleted` | 3A + 3I | all |
| `habitsSlice` | `habits`, `pendingHygieneBundle` | 3D | 3E, 3H, 3G |
| `rewardsSlice` | `rewards` | 3F | 3E (reward picker) |
| `jarsSlice` | `jars`, `bags`, `hands` | 3A primitives; **3B** writes bag/hand via engine; **3E** writes hand post-cash-in; **3G** writes jar claims | 3G, 3E, 3H |
| `wheelConfigSlice` | `wheelConfigs` | 3I (editor) | 3C, 3E |
| `historySlice` | `history` | all agents (via shared `appendHistory` action owned by 3A) | 3G activity feed |
| `bonusSlice` | `bonusTimerState` | 3C (spawn on BONUS/JACKPOT), 3H (tick/complete/expire) | 3D (discount CTA), 3G |
| `streaksSlice` | `streaks` | 3B (daily on clip earn), 3D (per-habit, hygiene), 3C (bonus-chain) | 3G |
| `settingsSlice` | `settings` | 3I | all |

### 5.2 What's stored vs derived

**Stored (in IDB + Zustand):**
- Every field in `AppState` above.
- `bonusTimerState.timers[*].endTimestamp` — authoritative, never recomputed.

**Derived (Zustand selectors in `src/state/selectors.ts`):**
- Jar $ total → rendered progress ring percentage (from `jarState.total / moonshot.target`)
- Active highest-unlocked tier on pending spin (from `hand` contents — computed fresh per render, no stored "unlocked tier")
- Hand color groupings for cash-in picker (from `hands[jarId]`)
- Bag composition summary (counts per color from `bags[jarId]`)
- Daily-streak "is today complete?" boolean (from `streaks.daily.lastClipDate === today`)
- Active bonus timer remaining seconds (from `endTimestamp - Date.now()` on every `visibilitychange` tick, PLANNING Appendix iOS gotcha)
- Activity feed (latest N `history` events, filtered/grouped)

**Selector hard rule:** no selector mutates. No derived field ever written to IDB. (This is what keeps jar cumulativity honest per D1 — claims don't rewrite `total`.)

### 5.3 The shared `appendHistory` action

3A exposes the store method:

```ts
appendHistory(event: Omit<HistoryEvent, "id" | "at">): void
```

It stamps `id` + `at`, inserts into slice, writes to `history_events` store. **Every Phase 3 agent calls this for their own variants** — no agent writes directly to `state.history`.

### 5.4 Slice boundary hardening

To prevent overlap:
- **`jars/bags/hands` writes** go through named action creators on `jarsSlice`: `drawClipFromBag`, `returnClipsToBag`, `earnClipToHand`, `cashInClips`, `claimMilestone`, `resetJar`. 3B consumes `drawClipFromBag`. 3E consumes `cashInClips`. 3G consumes `claimMilestone`/`resetJar`. No agent does raw array splicing on state.
- **`bonusTimerState` mutations** go through `spawnTimer`, `completeTimer`, `expireTimer`, `queueExtraSpins`, `dequeueExtraSpin`. 3C calls `spawnTimer` via `resolveBonusSpin`'s effect callback. 3H owns complete/expire. `completeBonusTimer` also chains `drawClipFromBag` + `earnClipToHand(source: 'bonus-discount')` so that the user receives a token on successful bonus completion (A17).
- **`streaks` mutations** go through `tickDailyStreak(date: LocalDate)`, `tickHabitStreak(habitId, date)`, `tickHygieneStreak(date)`, `breakStreak(kind)`. Callers never read-modify-write.

---

## 6. Component Hierarchy

Routing: `HashRouter` (spec §7, PLANNING Appendix). All paths mount under `/kakeguruimasho/#/...`.

```
<App>                                               // [3J] error boundary, ToastProvider, ThemeProvider
├── <BonusTimerBanner />                            // [3H] persistent — visible from any route when timers > 0
├── <PwaUpdatePrompt />                             // [3J] Vite PWA onNeedRefresh toast (Q10/Q13)
└── <Routes>
    ├── /onboarding   → <OnboardingFlow>            // [3I] first-run gate; redirects to / when firstRunCompleted
    │                    ├── <WelcomeScreen />
    │                    ├── <MechanicsScreen />
    │                    ├── <RewardRulesScreen />   // [3I] A19 verbatim 3 rules + Naked Rule
    │                    ├── <MilestonesScreen />
    │                    └── <InstallPromptScreen />
    ├── /             → <Home>                      // [3J] composes
    │                    ├── <QuickLogButton *5 />   // [3D]
    │                    ├── <HandSummary />         // [3E] tappable → /spin
    │                    ├── <JarSnippet />          // [3G] progress ring + Mini/Mid/Moonshot badges
    │                    ├── <StreakHeader />        // [3G]
    │                    └── <ActivityFeed limit=7/> // [3G]
    ├── /spin         → <SpinFlow>                  // [3E] full-screen
    │                    ├── <HandView />
    │                    ├── <CashInPicker />
    │                    ├── <GoldInstantT3Button /> // skips wheel (spec §5.5)
    │                    ├── <SpinButton />
    │                    ├── <WheelCanvas />         // [3C] appears after spin
    │                    └── <PostSpinFlow />        //    → <RewardPickerModal /> or <BonusWheelCanvas />
    ├── /habits       → <Habits>                    // [3D]
    │                    ├── <HabitList />
    │                    ├── <HabitEditor  modal/>
    │                    └── <HygieneBundle />
    ├── /rewards      → <Rewards>                   // [3F]
    │                    ├── <Tabs T1/T2/T3 />
    │                    └── <RewardMenu tier=?/>
    ├── /jar          → <JarScreen>                 // [3G]
    │                    ├── <JarVisual />
    │                    ├── <MilestoneEditor />
    │                    └── <MilestoneClaimModal /> // D1 reset-only-at-moonshot
    ├── /history      → <History>                   // [3G] full feed, filterable
    ├── /bonus        → <BonusTimerDetail>          // [3H] deep view when tapping banner
    │                    ├── <BonusTimerCountdown />
    │                    └── <DiscountHabitPicker />
    └── /settings     → <Settings>                  // [3I]
                         ├── <RewardsLinkCard />    // deep-links to /rewards T1/T2/T3 editor
                         ├── <WheelConfigEditor />
                         ├── <BagCompositionEditor />
                         ├── <HygieneCutoffEditor />
                         ├── <SfxHapticsToggles />
                         ├── <ExportImportPanel />
                         ├── <HelpScreen />
                         └── <ResetAllDanger />     // triple-confirm
```

**Modal convention:** all modals are portaled via shadcn `<Dialog>`. Bonus banner is non-modal, position:sticky top.

---

## 7. Module Boundaries — Phase 3 Subagent Briefs

Each agent's brief below lists: **(a) owned paths**, **(b) imported contracts (read-only)**, **(c) exposed contracts**. All agents share the `appendHistory` action from 3A — that's implicit and not repeated per agent.

### 7A — Data Layer Agent (Wave 1, solo)

**Owns:**
- `src/types/**` (all of it)
- `src/state/**`
- `src/db/**`
- `src/lib/rng.ts`, `src/lib/time.ts`, `src/lib/id.ts`
- `src/data/defaults.ts`
- `src/test/{setup,fixtures,seeded-rng}.ts`
- `tsconfig.json`, `eslint.config.js`

**Consumes:** nothing (bootstrap agent).

**Exposes (stable API for all other agents):**

```ts
// Store
function useAppStore<T>(selector: (s: AppState) => T): T;
function getStore(): { getState: () => AppState; setState: (...) => void };

// Slice action creators (subset — full list in src/state/store.ts)
const actions = {
  appendHistory(evt: Omit<HistoryEvent, "id" | "at">): void,
  drawClipFromBag(jarId: JarId): Clip,                    // pulls via 3B's bag.engine
  earnClipToHand(jarId: JarId, clip: Clip, source: ClipSource): void,
  returnClipsToBag(jarId: JarId, clipIds: ClipId[]): void,
  cashInClips(jarId: JarId, clipIds: ClipId[]): CashInResult,
  spawnBonusTimer(jarId: JarId, result: Extract<BonusSpinResult, { segment: "PCT_75" | "PCT_50" | "PCT_25" }>): BonusTimerId,
  completeBonusTimer(timerId: BonusTimerId, habitId: HabitId): void,
  expireBonusTimer(timerId: BonusTimerId): void,
  claimMilestone(jarId: JarId, milestone: MilestoneId): void,
  resetJar(jarId: JarId): void,                           // moonshot-triggered, D1
  addMilestone(jarId: JarId, input: { label: string; target: number }): MilestoneId,  // Phase 7
  removeMilestone(jarId: JarId, milestoneId: MilestoneId): void,                     // Phase 7; no-op on default ids
  updateMilestones(jarId: JarId, patch: Record<MilestoneId, { label: string; target: number }>): void, // Phase 7; one audit event
  tickDailyStreak(jarId: JarId, date: LocalDate): void,
  // ...etc
};

// Persistence
function exportAll(): Promise<Blob>;
function importAll(json: string): Promise<{ ok: true } | { ok: false; errors: ZodIssue[] }>;

// RNG
function rng(): Rng;                                      // seedable in tests
interface Rng { next(): number; nextInt(max: number): number; }

// Time helpers
function localDateOf(ts: ISOTimestamp): LocalDate;
function isPastCutoff(ts: ISOTimestamp, localTime: string): boolean;
function nowISO(): ISOTimestamp;
```

**Gate for Wave 2:** this API file (`src/state/store.ts` exports) must be frozen before other agents start.

---

### 7B — Bag & Draw Engine Agent (Wave 2, parallel)

**Owns:**
- `src/features/bag/**`

**Consumes from 3A:**
- `Clip`, `BagComposition`, `ClipColor`, `JarId` types
- `rng()` for production, `seededRng()` for tests
- `actions.drawClipFromBag`, `actions.earnClipToHand`, `actions.appendHistory`
- `useAppStore` selector for current bag state

**Exposes:**

```ts
// Pure engine (no state, deterministic given rng)
function drawClip(bag: Clip[], rng: Rng): { drawn: Clip; bag: Clip[] };
function refillBag(composition: BagComposition, jarId: JarId, idFactory: () => ClipId): Clip[];
function bagComposition(bag: Clip[]): Record<ClipColor | "gold", number>;

// UI
<BagCompositionView jarId={JarId} />                      // read-only visualization
```

**Tests (Vitest, §8 mapping):** 10k draws with fixed seed across default bag → per-color distribution within **±2%** (spec §10 criterion "1000 simulated draws"). Separate test for gold rate ≈ 1/61 per draw (D2).

---

### 7C — Wheel Engine Agent (Wave 2, parallel)

**Owns:**
- `src/features/wheel/**`
- `src/lib/haptics.ts`

**Consumes from 3A:**
- `WheelConfig`, `MainSpinResult`, `BonusSpinResult`, `MainWheelTier`, `BonusSegment`
- `rng()`, `seededRng()`
- `actions.appendHistory`, `actions.spawnBonusTimer`

**Exposes:**

```ts
// Pure
function resolveMainSpin(cfg: WheelConfig, rng: Rng): MainSpinResult;
function resolveBonusSpin(cfg: WheelConfig, rng: Rng): BonusSpinResult;
// mercyChance is READ from cfg but MUST be ignored in v1 (D5). Hard-coded branch:
//   if (cfg.mercyChance > 0) throw new Error("mercy unimplemented in v1");

// Imperative (UI)
function spinMainWheel(opts: {
  cfg: WheelConfig;
  highestUnlockedTier: Tier | null;          // from 3E cash-in state
  rng: Rng;
}): Promise<MainSpinResult>;                 // animates + resolves

function spinBonusWheel(opts: { cfg: WheelConfig; rng: Rng }): Promise<BonusSpinResult>;

// Near-miss theater (D3)
// Internal to WheelCanvas; exposed as hook for external control only in tests.
```

**Tests:** 10k main spins within **±1%** of configured weights per tier (spec §10). 10k bonus spins likewise. Snapshot test for D3: render a losing spin (RNG'd T1 while user has 0-cash-in), assert animation keyframes pass through a locked-tier segment.

---

### 7D — Habit Management UI Agent (Wave 2, parallel)

**Owns:**
- `src/features/habits/**`
- `/habits` route component
- Home's `<QuickLogButton>` usage

**Consumes from 3A:**
- `Habit`, `HabitUnit`, `HygieneBundleState`, `JarId` types
- `actions.earnClipToHand`, `actions.appendHistory`, `actions.tickHabitStreak`, `actions.tickHygieneStreak`, `actions.tickDailyStreak`
- `actions.drawClipFromBag` (indirectly — quick-log calls a composite "completeHabit" flow)

**From 3A (composite action 3A must provide):**

```ts
function completeHabit(habitId: HabitId, unitsCompleted: number): {
  clipsEarned: number;
  drawnClips: Clip[];  // batched (PLANNING §6.4 — step entry gives N clips at once)
};
```

**Exposes:** all habit UI. No typed API consumed by other agents (3D is UI-only from 3A's perspective).

**Special:**
- Hygiene bundle retroactive award (A5): on app open, if previous-day `pendingHygieneBundle.awarded === false` and `allSubItemsCompleted && beforeCutoff(bundle.subItemsCompleted[*], bundle.cutoffLocal)`, call `completeHabit(hygieneBundleHabitId, 1)` and mark `awarded: true`.
- Step entry batched multi-draw UI (PLANNING §6.4).

---

### 7E — Cash-in & Spin Flow Agent (Wave 3)

**Owns:**
- `src/features/spin/**`
- `/spin` route

**Consumes from 3A:**
- Types: `Clip`, `ClipColor`, `Tier`, `MainWheelTier`, `JarId`
- `actions.cashInClips`, `actions.returnClipsToBag`
- Store selectors for hand, wheelConfig

**Consumes from 3B:**
- (nothing directly — 3A wraps bag engine)

**Consumes from 3C:**
- `spinMainWheel({ cfg, highestUnlockedTier, rng })`

**Consumes from 3F:**
- `openRewardPicker(tier: Tier): Promise<RewardId>`

**Consumes from 3H:**
- (nothing — 3C triggers bonus wheel; 3H reads state afterward)

**Exposes:** UI only.

**State machine in `spin.machine.ts` (A9):**
```
idle → cashInChosen(frozen) → spinning → resolved
                                      → (if BONUS/JACKPOT) bonusSpinning → bonusResolved
                                      → (on reward tier) rewardPicker → done → idle
```
Cash-in UI is DISABLED between `cashInChosen` and `idle` (A9).

Gold clip button: short-circuits straight to `openRewardPicker("T3")`, logs `reward_claimed { source: "gold" }` (A6), returns gold clip to bag (spec §5.5).

---

### 7F — Reward Menu Agent (Wave 2, parallel)

**Owns:**
- `src/features/rewards/**`
- `/rewards` route

**Consumes from 3A:**
- `Reward`, `Tier` types
- `actions.appendHistory`
- Selectors for `rewards`

**Exposes:**

```ts
function openRewardPicker(tier: Tier): Promise<RewardId>;   // portals a <Dialog>, resolves on user pick
```

Plus the CRUD UI. The 3-rewards-rules sidebar (A19) is a static copy component; no validation (A19 spec).

---

### 7G — Jar & Streak Display Agent (Wave 3)

**Owns:**
- `src/features/jar/**`
- `/jar`, `/history` routes

**Consumes from 3A:**
- `JarState`, `StreakState`, `Milestone`, `MilestoneId`, `HistoryEvent` types
- `actions.claimMilestone`, `actions.resetJar`
- Selectors: jar total, streak state, recent history events

**Exposes:** UI only.

**D1 logic:**
- Mini/mid unlock at `total >= target` → celebration animation → user taps "Claim" → `claimMilestone(jarId, milestoneId)` sets `claimed[id] = { claimedAt }`. **Jar `total` unchanged.**
- Moonshot claim → celebration → confirm dialog "Reset jar and set new milestones?" → on yes: `resetJar(jarId)` zeros total, clears all claims, navigates to `<MilestoneEditor>`.

---

### 7H — Bonus Timer Agent (Wave 3)

**Owns:**
- `src/features/bonus/**`
- `/bonus` route + `<BonusTimerBanner>` mounted by App shell

**Consumes from 3A:**
- `BonusTimer`, `BonusTimerState`, `BonusSpinResult`, `BonusTimerId`, `HabitId` types
- `actions.spawnBonusTimer`, `actions.completeBonusTimer`, `actions.expireBonusTimer`, `actions.appendHistory`

**Consumes from 3C:**
- Read: `BonusSpinResult` (triggered after main wheel BONUS/JACKPOT). 3C calls `actions.spawnBonusTimer` directly — 3H is purely a UI/scheduler agent for active timers.

**Consumes from 3D:**
- Habit list (to populate `DiscountHabitPicker`).

**Exposes:**

```ts
// UI components — no programmatic API consumed by others.
// But exposes a visibilitychange-driven recompute hook internally:
function useBonusTimerRemaining(timerId: BonusTimerId): { seconds: number; expired: boolean };
```

**A3 concurrency:** multiple timers can be active at once. Banner shows "oldest spawned" with a "+N more" chip. `/bonus` route shows all active timers.

**Expiration check:** runs on every `visibilitychange` (PLANNING Appendix). iOS-background-resilient.

---

### 7I — Onboarding & Settings Agent (Wave 4, last)

**Owns:**
- `src/features/onboarding/**`
- `/onboarding`, `/settings` routes
- `src/data/defaults.ts` (seeds) — **joint ownership with 3A**; 3A defines the shape, 3I fills the strings for T1/T2/T3 defaults per spec §6

**Consumes from 3A:** everything read-only + all action creators (it's a control panel over the full store).

**A19 verbatim copy:** `<RewardRulesScreen>` quotes PDF page 3 rules verbatim with the Naked Rule language intact. This is a do-not-cut item (PLANNING §3).

**Exposes:** UI only.

---

### 7J — Shell & Navigation Agent (Wave 1, parallel with 3A)

**Owns:**
- `src/main.tsx`, `src/App.tsx`
- `src/routes/*.tsx` (route skeleton, not feature content)
- `src/ui/**` (shadcn primitives)
- `src/styles/**`
- `src/lib/storage-persist.ts`
- `public/**`
- `vite.config.ts` (joint with Phase 6 Deployment)
- `tailwind.config.ts`

**Consumes from 3A:**
- Types only; can stub at start and swap when 3A lands.

**Exposes:**
- `<Route slots>` that feature agents drop their components into
- Theme tokens via CSS variables in `tokens.css`
- `<Dialog>`, `<Toast>`, etc. — shadcn wrappers

---

## 8. Testing Strategy

Mapped to spec §10 acceptance criteria.

| Spec §10 criterion | Test type | Location | Owner |
|---|---|---|---|
| "Bag produces expected color distribution within 2% over 1000 draws" | Vitest unit, **10k** draws with fixed seed | `src/features/bag/bag.engine.test.ts` | 3B |
| "Main wheel 10k spins within 1% of config" | Vitest unit, seeded RNG | `src/features/wheel/wheel.engine.test.ts` | 3C |
| "Bonus wheel 10k spins within 1%" | Vitest unit | `src/features/wheel/wheel.engine.test.ts` | 3C |
| "Cash-in gates tiers correctly (test matrix 0/1/2/3 matching, gold)" | Vitest unit (pure) + RTL component | `src/features/spin/spin.machine.test.ts` + `CashInPicker.test.tsx` | 3E |
| "Hygiene bundle awards clip morning after all 4 done by 1am" | Vitest unit on A5 logic + RTL with fake clock | `src/features/habits/HygieneBundle.test.tsx` | 3D |
| "Bonus timer persists across app close" | Vitest unit on `endTimestamp` math + Playwright E2E reload scenario | `bonus.machine.test.ts`, `e2e/smoke.spec.ts` | 3H + Phase 4 |
| "Export produces valid JSON; import restores state exactly" | Vitest unit (round-trip) + Zod schema check | `src/db/export-import.test.ts` | 3A |
| "D3: wheel always drifts past locked tier on losing spin" | RTL snapshot of animation keyframes | `src/features/wheel/near-miss.test.tsx` | 3C |
| "D1: mini/mid claim does NOT reset jar total" | Vitest unit on `claimMilestone` action | `src/state/slices/jars.slice.test.ts` | 3A |
| "D2: default bag = 61 clips, 1 gold" | Vitest unit on `refillBag(DEFAULT_COMPOSITION)` | `src/features/bag/bag.engine.test.ts` | 3B |
| "Fresh install → habit → clip → cash-in → spin → claim → reload persists" | Playwright smoke | `e2e/smoke.spec.ts` | Phase 4 |
| "No console errors in production build" | Playwright listen, fail on `console.error` | `e2e/smoke.spec.ts` | Phase 4 |
| Lighthouse PWA ≥ 90, A11y ≥ 95, Perf ≥ 90 | Lighthouse CI step in `deploy.yml` | — | Phase 6 |
| Bundle size ≤ 250KB gz | Rollup visualizer + CI threshold check | — | Phase 6 |

**Coverage convention:** pure engine code (bag, wheel, state reducers, time helpers) targets **95%+** line coverage. UI components test happy path + one error path. No snapshot tests on presentational markup — too brittle.

**Deterministic tests:** every test that touches RNG uses `seededRng(seed)` from `src/test/seeded-rng.ts` (Mulberry32). Same seed → same sequence.

**Fake clock:** tests involving bonus timers, hygiene bundle, or day boundaries use Vitest's `vi.useFakeTimers({ now: <ISO> })` and advance via `vi.setSystemTime`.

---

## 9. Build + Deploy Config

### 9.1 Vite (sketch — no code, just decisions)

- **`base: '/kakeguruimasho/'`** — matches repo name; GH Pages serves under `/<repo>/`.
- **`build.target: 'es2022'`** — iOS Safari 16+ support (spec targets modern iPhone).
- **`build.sourcemap: 'hidden'`** — debuggable with source-map upload to GH but not shipped inline.
- **`build.rollupOptions.output.manualChunks`:** split Framer Motion + Zod into separate chunks so they lazy-load with the wheel/import routes respectively.
- **`server.host: true`** for LAN testing on iPhone.
- **PWA plugin config:**
  - `registerType: 'prompt'` — Q10/Q13 resolved: use `onNeedRefresh`.
  - `workbox.globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']`.
  - `workbox.runtimeCaching`: none needed; we have no external fetches.

### 9.2 PWA Manifest contents

```
name: "Kakegurui Masho"
short_name: "Kakegurui"
description: "Slot-machine habit system"
start_url: "/kakeguruimasho/"
scope: "/kakeguruimasho/"
display: "standalone"
background_color: "#0A0A0B"
theme_color: "#E53935"
orientation: "portrait"
icons: [192x192, 512x512, maskable-192, maskable-512]
apple-touch-icon: 180x180
apple-mobile-web-app-status-bar-style: "black-translucent"
apple-mobile-web-app-capable: "yes"
```

Splash images via `pwa-asset-generator` at build time (PLANNING Appendix).

### 9.3 GH Pages workflow

`.github/workflows/deploy.yml`:
- Trigger: push to `main`.
- Steps: checkout → setup-node 20 → `npm ci` → `npm run build` → upload `dist/` as `pages-artifact` → `actions/deploy-pages`.
- Environment: `github-pages` with concurrency group `pages` (cancel in progress).

`.github/workflows/ci.yml`:
- Trigger: PR to `main`.
- Steps: lint → typecheck → Vitest → build → Lighthouse CI on the built `dist/` → bundle-size gate (fail if `dist/assets/*.js` total gz > 250KB).

### 9.4 Bundle-size budget plan (≤ 250 KB gz)

Forecast (gz):
| Chunk | Est. gz | Loaded when |
|---|---|---|
| React 19 + ReactDOM | ~45 KB | initial |
| Zustand | ~3 KB | initial |
| `idb` + Zod (validation path) | ~15 KB | initial |
| Tailwind runtime | ~10 KB | initial (after purge) |
| shadcn components used | ~12 KB | initial (vendored source, tree-shaken) |
| `lucide-react` (per-icon, ~15 icons) | ~5 KB | initial |
| App logic (all feature code) | ~50 KB | initial |
| **Framer Motion** | **~40 KB** | **lazy** — only on `/spin` + `/jar` routes |
| **Import/Export Zod** | shared with above | lazy via dynamic `import()` in Settings panel |
| Workbox SW runtime | offloaded to SW | not in main bundle |

**Initial bundle estimate: ~140 KB gz. Well under budget.** `/spin` entry: +40 KB gz (Framer Motion). Total loaded for spin route: ~180 KB gz.

**Tactics to hold the line:**
1. `import(...)` Framer Motion from `WheelCanvas.tsx` and `JarVisual.tsx` only — never from the shell.
2. No date library. No lodash. No runtime CSS-in-JS (Tailwind only).
3. shadcn components copied in as source, trimmed per-component (remove variants we don't use).
4. `lucide-react` imported per-icon (`import { Dice3 } from "lucide-react"`), not via barrel.
5. CI gate on `dist/assets/*.js` gzipped size fails the build at **240 KB** (10 KB headroom).
6. Audio assets (SFX) served from `/public` as tiny `.webm` files, loaded on first spin gesture (PLANNING Appendix — audio-unlock on gesture) — never bundled.
7. shadcn Dialog/Toast/Popover share Radix core; including all three costs ~7 KB gz, not 3×.

---

## 10. Risk Register

PLANNING.md §4 flagged the top 3. Restated with **concrete** mitigations + new risks surfaced during architecture work.

| # | Risk | Likelihood | Impact | Concrete mitigation |
|---|---|---|---|---|
| R1 | **Bonus timer incorrect across iOS backgrounding** (PLANNING §4 top-3) | Med | High (silent data loss of streaks) | (a) `endTimestamp` is the only authoritative field; UI never uses `setInterval`-accumulated state. (b) `src/features/bonus/BonusTimerCountdown.tsx` recomputes `remaining = endTs - Date.now()` on every `visibilitychange` AND on every `requestAnimationFrame` frame while visible. (c) Expiration check runs on app open against all `bonusTimerState.timers[*]` — any with `endTs < now && status === "active"` get expired + streak-broken in a single IDB tx. (d) Playwright smoke test closes page mid-timer, advances clock, reopens, asserts banner shows correct remaining. (e) Zod schema on import rejects any timer with `endTimestamp` invalid ISO. |
| R2 | **IndexedDB eviction on iOS pre-install** (PLANNING §4 top-3) | Med | Critical (total data loss) | (a) Call `navigator.storage.persist()` after first successful clip draw (real signal of user intent), log result. (b) Daily snapshot job writes compressed backup to a separate store. (c) Manual export button is top-level in Settings, not buried. (d) Onboarding's last screen is "Install to home screen" with iOS-specific instructions + screenshot. (e) After 7 days of use without install, show a dismissable toast reminding about install. (f) Import flow validates with Zod before touching existing data — invalid file never clobbers state. |
| R3 | **Wheel animation desyncs from RNG result / near-miss theater breaks trust** (PLANNING §4 top-3, D3) | Low | Med | (a) RNG resolve is a pure function called **before** animation starts; its output is the animation target. (b) `WheelCanvas` receives `{ targetSegmentIndex, theatricalDriftSegmentIndex? }` props; animation always ends on target regardless of drift choreography. (c) Snapshot test asserts `onAnimationComplete` payload matches `resolveMainSpin()` return. (d) A history event `near_miss_theater` logs every drift for post-launch tuning — human-spot-check if user reports "wheel cheated me." (e) D3 is explicit: RNG is ground truth; review checklist item for 3C PRs. |
| R4 | **(NEW) Slice write overlap between 3B, 3E, 3H causing lost updates** | Med | Med | (a) All mutations go through named action creators on `jarsSlice`; no raw state edits allowed. (b) Zustand's `setState` is synchronous; atomic within a single call. For multi-step ops (draw+earn+history), expose composite actions from 3A (`completeHabit`, `executeSpin`). (c) ESLint rule in 3A's config: `no-restricted-syntax` forbidding direct `.hands[...] =` style in any file outside `src/state/slices/**`. |
| R5 | **(NEW) Clip identity collision on restore from export** | Low | Med | (a) `ClipId` is UUIDv7 (monotonic). (b) Import is full-replace (A11); no merge → no collision. (c) Post-import validation pass: Zod checks no duplicate IDs across `bags`, `hands`, `history` references. |
| R6 | **(NEW) Concurrent bonus timers + EXTRA chain state explosion** (A2/A3) | Med | Med | (a) `BonusTimerState.timers` is an array, explicit spawn-order. (b) `bonus.machine.ts` FSM unit-tested with every permutation of {75/50/25, FREE, EXTRA} chain outcomes up to depth 4. (c) UI never blocks on a specific timer — user can pick any active timer's origin habit. (d) FSM diagram in `src/features/bonus/README.md` (comment file, non-markdown) owned by 3H. |
| R7 | **(NEW) Schema-version drift between Zod validator and TS types** | Low | High (import fails silently) | (a) Types and Zod schemas live in the same file per entity, next to each other; code-review rule "change one, change both." (b) Import unit test: take a committed fixture `v1_export.json`, round-trip parse → TS object → re-stringify → compare structurally. |
| R8 | **(NEW) Day-boundary / TZ edge cases across hygiene bundle + daily streak** (A5, A8) | Med | Med | (a) `localDateOf(ts)` helper in `src/lib/time.ts` is the only day-boundary primitive; no direct `new Date().getDate()` allowed (ESLint rule). (b) Hygiene cutoff configurable (Q5 accepted), default `01:00`. (c) Test suite runs with multiple injected `vi.setSystemTime` values: 23:59, 00:01, 00:59, 01:00, 01:01 local. (d) DST spring-forward/fall-back tests: fake clock jumps covering both directions. |
| R9 | **(NEW) Framer Motion bundle creep via unintentional wildcard imports** | Med | Med | (a) ESLint rule: `no-restricted-imports` on `framer-motion` barrel; require `motion/react` subpath + named imports. (b) `manualChunks` splits `framer-motion` into its own chunk. (c) Rollup visualizer artifact uploaded on every CI run. |
| R10 | **(NEW) shadcn component bloat if agents copy defaults wholesale** | Med | Low | (a) 3J vendors **only** the primitives listed in §2 (`src/ui/**`). (b) Pre-commit hook: `src/ui/**` max line count enforced (lint error if >300 lines in any file). (c) No agent may add new files to `src/ui/**` — only 3J. |
| R11 | **(NEW) D5 `mercyChance` accidentally consumed by 3C in v1** | Low | Med | (a) `resolveMainSpin` includes `if (cfg.mercyChance > 0) throw new Error(...)` — fails loud in tests. (b) Settings UI does not expose a `mercyChance` editor in v1. (c) Import validation accepts the field (schema-complete) but clamps to 0 on seed. |

---

## 11. Open for Human Review

Items I cannot silently resolve — flagged for decision before Phase 3 Wave 2 begins:

### OR-1 — Habit `jarId` field in v2 migration: omit now or include-with-default?

**Context:** `Habit` and `Reward` currently have NO `jarId` field (noted in §3). v1 is single-jar; habits are used by the one jar. v2 will want per-jar habits. Two paths:

- (a) Omit now; in v2, add `jarId` as a non-optional field with a migration that defaults all existing habits to `DEFAULT_JAR_ID`. Clean v1 schema; one migration in v2.
- (b) Include `jarId` now with v1 hardcoding to `DEFAULT_JAR_ID`. Zero migration in v2; slight overhead in v1 writes.

My lean is **(a)** — matches the principle that v1 shouldn't ship fields the engine doesn't use, and the D4 "all jar-scoped state has jarId" rule was specifically about state that COULD differ between jars (bag, hand, streaks, history). Habits and rewards are arguably cross-jar templates anyway. But D4 is strict enough that I want human sign-off rather than assume. **Status: needs decision.**

### OR-2 — History append throughput under rapid quick-log

**Context:** Spec §8.1 says "every mutation durably written within 100ms." A user who batch-logs 4 walks (step-entry batching, PLANNING §6.4) generates ~4 `clip_earned` + 4 history_events + 1 daily-streak-tick = ~9 appends. All land in one IDB transaction under my current design — fine. But if a user opens the app offline, taps 20 times in fast succession, the debounced Zustand writes could coalesce in a way that loses individual-event ordering if not careful.

**Decision needed:** confirm that "atomic" per spec §8.2 is satisfied by grouping multi-append mutations into a single `MutationTx`, OR require per-event transactions (slower but strictly ordered). My design assumes grouping is fine because history events carry their own `at` timestamp (monotonic via `nowISO()`), but I'd like explicit confirmation because "atomic" is load-bearing in the spec. **Status: needs decision, low-stakes.**

### OR-3 — Reward-menu `archived` semantics on wheel win

**Context:** `Reward.archived: boolean` lets the user soft-delete a reward without breaking history FKs. But if the user wins T2 and the only T2 rewards are all archived, what does `<RewardPickerModal>` show? Options:

- (a) Include archived items grayed out; picking one un-archives.
- (b) Show empty state "no rewards in this tier; add one now"; forfeit the win if user backs out.
- (c) Force-unarchive nothing; user must add a reward before the modal closes.

My lean is **(b)** — matches "user picks from list" spec §5.5. But this never comes up on fresh install (defaults are populated), only after heavy editing. **Status: needs decision, very low-stakes. Can defer to 3F at implementation time if human punts.**

### OR-4 — Audio asset format & delivery

**Context:** Spec §7.1 / §12 want subtle SFX. Formats: WebM/Opus (smallest, broad support, iOS 17.4+), AAC (universal, larger), MP3 (universal, largest). iOS Safari in 2026 likely supports WebM/Opus but I don't have certainty.

**Decision needed:** confirm WebM/Opus is acceptable, or mandate AAC fallback. My lean: **ship WebM/Opus only; if a specific iOS version fails to play, the SFX falls through silently via the Web Audio decode error path — no user-visible breakage.** Acceptable because audio is inessential. **Status: verify at Phase 3J implementation time, not blocking.**

---

*End of ARCHITECTURE.md. Phase 3 cleared to start Wave 1 (3A + 3J in parallel) pending OR-1 resolution.*
