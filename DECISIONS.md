# DECISIONS.md

Human-resolved decisions from Phase 1. These are the authoritative answers to the DECIDE items in `PLANNING.md` §1. Phase 2 (Architecture) must respect these.

## D1. Jar milestone behavior — Q1 resolved → **A2 (reset only at Moonshot)**

The jar fills toward **Moonshot** as its canonical full-state. **Mini and Mid are tick marks** the user crosses along the way, each triggering an unlock + claim UI at the moment the running total passes that threshold. The jar total keeps climbing through those tick marks — the running `jarTotal` does NOT reset when Mini or Mid is claimed. Only when **Moonshot is claimed** does the jar reset to $0, and the user is prompted to either re-use the same milestones or edit them for the next cycle.

Implementation notes:
- `JarState` carries `{ total: number, milestones: [mini, mid, moonshot], claimed: Record<MilestoneId, { claimedAt: ISOString } | null> }`
- Milestone "unlock" fires when `total >= milestone.target` AND `claimed[milestone.id] == null`
- "Claim" is a user action; resets `claimed[milestone.id]` to an object with timestamp
- When `claimed.moonshot != null`, next clip-earn event triggers full-jar-reset flow: zero `total`, clear `claimed`, prompt milestone edit

## D2. Gold clip count — Q7 resolved → **1 gold in 63-clip bag**

Default bag composition: 6 colors × 10 regular + **1 gold = 61 clips total**. (Note: this drops the spec's "63 total" number slightly. The constant is `REGULAR_PER_COLOR = 10, GOLD_COUNT = 1` — total is derived.)

Math: 65 draws/week × 1/61 = ~1.07 gold events/week. Matches the "rare but real" target.

Gold count is a first-class setting in Settings; user can tune up or down post-launch.

## D3. Near-miss animation — Q9 resolved → **B (always drift past locked tiers on losing spins)**

PDF canon supersedes the spec-literal Option A. Every spin that does NOT land on the user's highest-unlocked tier must visually drift past at least one *locked* tier before settling on its actual segment.

- Winning spins (including clean T1 wins when 0-cash-in) still visually brush past the nearest locked tier before settling on the winning segment.
- RNG result is ground truth; animation is pure theater — the wheel's final stopping position ALWAYS matches the RNG result.
- Log each drift as `history[].kind = 'near_miss_theater'` for optional post-launch analysis — not user-facing telemetry.

## D4. Multi-jar schema — Q12 resolved → **jarId FK everywhere**

v1 ships with exactly one jar (reserved ID `"default"`). The schema is multi-jar-ready:
- `AppState.jars: Record<JarId, JarState>` (not `AppState.jar`)
- `AppState.bags: Record<JarId, Clip[]>` (not `AppState.bag`)
- `AppState.hands: Record<JarId, Clip[]>` (not `AppState.hand`)
- Every `Clip`, `HistoryEvent`, `StreakState` entry, and `WheelConfig` carries a `jarId`
- v1 UI hardcodes `jarId = "default"` and hides any jar-picker UI
- v2 = remove hardcodes + add jar CRUD. Zero data migration.

Architect: do NOT introduce any state, selector, or persistence store that assumes jar singleton-ness.

## D5. v1.1 "mercy rule" toggle — user proposal → **deferred, logged for v1.1**

User proposed: "1% chance that the wheel pays out a locked tier anyway" as a compassion mechanic.

Decision: **do NOT implement in v1**, but leave room for it as a v1.1 Settings toggle (`wheelConfig.mercyChance: number` default `0`). This breaks the cash-in strategic contract and needs live usage data to tune, so it's explicitly post-launch.

Architect should ensure `WheelConfig` schema has a `mercyChance: number` field from v1.0 so v1.1 is a 1-line flip, no migration.

---

## D6. Custom intermediate milestones — Phase 7 → **branded string, three canonical retained, Moonshot still the only reset**

User asked to be able to add extra milestones to a jar beyond Mini / Mid / Moonshot.

Decision: relax `MilestoneId` from the `'mini' | 'mid' | 'moonshot'` union to a branded string. The three canonical ids stay in every jar (exposed as `MINI_MILESTONE_ID` / `MID_MILESTONE_ID` / `MOONSHOT_MILESTONE_ID` constants). Users can add any number of extra checkpoints via `+ Add milestone` in `MilestoneEditor`; each gets a generated `MilestoneId` and shows up as a tick + unlock button at its target.

Only the literal `MOONSHOT_MILESTONE_ID` still triggers the reset-on-claim flow (D1 is unchanged). Custom milestones are history-only — claiming one stamps `milestone_claimed { reset: false }` and leaves the jar total untouched. This keeps the D1 contract intact and avoids a UX landmine where a user labels an $80 checkpoint "Big One" and then it silently zeroes the jar.

No migration needed: existing persisted state with `milestones.mini / .mid / .moonshot` keys is structurally compatible since the keys are already strings at runtime.

---

## D7. Cloud sync — Phase 7 → **opt-in, env-gated, Yjs + PartyKit + Clerk**

Spec originally mandated "no backend, no accounts, no API keys." User requested real-time cross-device sync.

Decision: introduce an optional sync layer gated entirely on build-time env vars. When `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_PARTYKIT_HOST` are both set, the app mounts `<ClerkProvider>`, gates on sign-in, and wires a `Y.Doc` to `y-indexeddb` locally + `y-partykit` remotely. One room per Clerk user id; the worker verifies the JWT's `sub` matches on connect. When either env var is unset, `SyncGate` is a passthrough and the app is byte-for-byte the legacy single-device experience.

Scaffold trades merge correctness for time-to-ship: `AppState` is serialized as one JSON blob into a `Y.Map` entry, so real-time sync works but concurrent offline edits are last-write-wins at the entry level. Proper per-slice CRDT mapping (starting with `history_events` → `Y.Array`) is tracked as Phase 7 follow-up. SPEC.md §7 updated accordingly; `SPEC.md` non-negotiable "no backend" clause removed.

Free-tier provider picks: Clerk (10k MAU free), PartyKit on Cloudflare Workers (100k req/day free). Together: $0/month for personal/family scale. See `CLOUD_SYNC_SETUP.md` for the full setup walkthrough.

---

## Status of non-blocking recommendations from PLANNING.md §1

The DEFER items retain their `PLANNING.md` recommendations as the architect's defaults unless overridden here:

| Q | Status | Authoritative answer |
|---|---|---|
| Q2 Hand cap | Accepted | Unlimited. |
| Q3 Work timer | Accepted | Button-only for v1.0, persist `endTimestamp`-driven opt-in timer as v1.1. |
| Q4 Cleaning sub-types | Accepted | Single "20 min cleaning" habit. User may create sub-habits via CRUD. |
| Q5 Hygiene grace | Accepted | Configurable cutoff, default 01:00 local. |
| Q6 Jackpot | Accepted | Instant T3 + free bonus wheel spin (spec §5.6 verbatim). |
| Q8 Cash-in fate | Accepted | Return to bag (spec §5.5 verbatim). |
| Q10 SW update | Accepted | Prompt-to-reload toast via Vite PWA `registerSW({ onNeedRefresh })`. |
| Q11 Reward consumption | Accepted | History log only; no cooldown. |
| Q13 | Accepted | Same as Q10. |

All A-series ambiguity resolutions in `PLANNING.md` §2 (A1–A19) are adopted as the architect's default. Any conflict the architect encounters during Phase 2 should be flagged back for human review, not silently resolved.

---

*End of DECISIONS.md. Phase 2 (Architecture) cleared to start.*

---

## Phase 2 Addendum — Architect's Open Review items (OR-1 through OR-4)

Architect flagged 4 small items during Phase 2. All ratified with architect's lean:

- **OR-1 — `jarId` on `Habit`/`Reward`?** Omit in v1. v2 migration adds the FK with a default of `DEFAULT_JAR_ID`. v1 schema stays minimal. D4's jarId-everywhere rule applies to state that differs between jars (bag, hand, streaks, history), not to global-template entities like habit/reward definitions.
- **OR-2 — History append atomicity under rapid quick-log.** Grouping multi-append mutations into a single `MutationTx` satisfies spec §8.2 "atomic." Per-event timestamps provide strict ordering via `nowISO()`.
- **OR-3 — `RewardPickerModal` when all rewards in the winning tier are archived.** Show empty state "no rewards in this tier; add one now"; if user dismisses, win is forfeit (logged as `reward_claimed` with `rewardId: null` — 3A to add that variant if needed, or treat forfeit as a distinct history event). 3F may choose the exact UX at implementation time.
- **OR-4 — Audio format.** WebM/Opus only; if a specific iOS version fails to decode, the Web Audio decode error path swallows silently. Acceptable because SFX is inessential.

**Phase 3 cleared to start.**
