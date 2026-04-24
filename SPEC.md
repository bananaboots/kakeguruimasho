# Slot Machine Habit System — Build Specification

> **Purpose:** Complete engineering spec for a React web app that implements the SpoonFedStudy "Slot Machine Habit System" for a single primary user (owner). Hand off to Claude Code for multi-agent orchestration. Target: deploy-ready, mobile-first PWA hosted on GitHub Pages.

> **Audience:** Claude Code + delegated subagents. The primary user/owner is a senior React engineer (8 yrs) — you can assume engineering sophistication and skip hand-holding on the basics.

---

## 1. Product Overview

A gamified habit tracker that applies variable-reward ("slot machine") psychology to overcome activation-energy friction on disliked-but-important habits. Users earn paperclips for completing habit units; paperclips are drawn from an opaque colored bag; matching colors unlock higher reward tiers; spinning a wheel delivers rewards; a secondary bonus wheel extends streaks.

Full methodology reference: SpoonFedStudy's "Slot Machine Habit System" PDF + companion YouTube video ("I built a habit system as addicting as a casino"). The system has been **pre-configured with user-specific habits and rewards** — see §6.

---

## 2. Primary User Context

- **Device:** iPhone (mobile-first is mandatory; desktop is secondary)
- **Technical level:** Senior React engineer; will fork, modify, and self-host the repo
- **Use pattern:** Opens app 4–8× per day to log habit completions and spin
- **Hosting preference:** GitHub Pages (free static hosting)
- **Cloud sync:** Real-time cross-device sync is a goal (see §7 and §8). Export/import for backup is still required as an offline fallback.
- **Location:** San Diego, CA (affects default reward suggestions)

---

## 3. Scope

### 3.1 In scope (v1)

- Habit logging UI (5 default habits, user-editable)
- Paperclip bag with random draw, colored clips + gold clips
- Cash-in mechanic (match colors to unlock higher tiers)
- Main reward wheel with configurable probability split
- Bonus wheel with 10-minute countdown timer
- Tier 1 / Tier 2 / Tier 3 reward menus (user picks from list on win)
- Hygiene bundle special handling (compound habit, retroactive clip)
- Streak tracker (daily + per-habit)
- Jar / long-term progress bar (user-defined milestones)
- Local persistence (survives browser close, phone restart, PWA reinstall edge cases)
- Export / import all data as JSON
- PWA manifest + service worker (installable to home screen, works offline)
- User accounts (email / magic link) so the same jar follows the user across devices
- Real-time cross-device sync via a CRDT relay

### 3.2 Out of scope (v1)

- Multi-tenant / shared jars between different users
- Push notifications (iOS PWA limitation anyway)
- Analytics / telemetry
- Social features / sharing
- Native mobile app (web PWA only)
- Light/dark theme toggle (pick one and commit — **dark** recommended)

---

## 4. Non-Functional Requirements

| Requirement | Target |
|---|---|
| First contentful paint (mobile 4G) | < 1.5s |
| Time to interactive | < 2.5s |
| Total bundle size (gzipped) | < 250 KB |
| Lighthouse PWA score | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| Touch targets | ≥ 44×44 pt |
| Works offline after first load | Yes |
| Data survives 6+ months of intermittent use | Yes |

---

## 5. Core Game Mechanics (Spec-Locked)

These are the rules. Implementation must match exactly.

### 5.1 Earning paperclips

User completes a **habit unit**; app adds **one paperclip** of random color to the user's **hand** (actually drawn from the **bag** — see §5.3).

### 5.2 Habit units — friction-weighted, not time-weighted

Each habit has a unit definition. Partial completions don't earn clips (except via bonus-wheel discounts — see §5.7).

### 5.3 The bag

- Contains colored paperclips: 6 colors × N clips each + G gold clips
- Default: 10 of each color (60 total) + 3 gold = **63 clips**
- **Draw = random selection without replacement** (bag shrinks)
- When bag empties → auto-refill to starting composition
- Colors: Red, Blue, Green, Yellow, Purple, Pink (default; user-configurable)
- Gold clips are visually distinct but indistinguishable by feel — reveal only on draw

### 5.4 The hand

- User accumulates drawn clips in their "hand"
- Hand persists across sessions (cashing in is opt-in, on any spin)
- No hand size limit
- User can see hand contents anytime

### 5.5 Cash-in → tier unlock

Before each spin, user may cash in clips from hand:

| Cash-in | Effect on that spin |
|---|---|
| Nothing | Only T1 slots pay out; T2/T3 slots → **near-miss** (no reward, visual close-call animation) |
| 2 matching (same color) | T1 + T2 slots pay out; T3 → near-miss |
| 3 matching (same color) | All slots pay out normally |
| 1 gold clip | **Instant Tier 3 reward. No spin required.** |

Cashed-in clips are **returned to the bag** (not discarded). Gold clip on instant-T3 redemption is also returned.

### 5.6 The main wheel

Fixed default probability split (user-configurable in settings):

| Segment | Probability | Outcome |
|---|---|---|
| T1 | 40% | Pick from T1 reward menu |
| T2 | 30% | Pick from T2 reward menu (only if unlocked) |
| T3 | 20% | Pick from T3 reward menu (only if unlocked) |
| BONUS | 8% | Auto-collect current best available tier, then spin bonus wheel |
| JACKPOT | 2% | **Instant T3 + free bonus wheel spin**, regardless of cash-in status |

**Near-miss handling:** When the wheel lands on a locked tier (T2 or T3 without sufficient cash-in), animate the pointer stopping one slot past, trigger a distinct "near-miss" sound/haptic, and log the event. No reward issued.

### 5.7 The bonus wheel

Triggered by BONUS or JACKPOT on main wheel. Five segments, variable area:

| Segment | Probability (area) | Effect |
|---|---|---|
| 75% | 35% | Do 75% of a habit unit within 10 min → earn 1 clip |
| 50% | 25% | Do 50% of a habit unit within 10 min → earn 1 clip |
| 25% | 15% | Do 25% of a habit unit within 10 min → earn 1 clip |
| FREE | 10% | Free clip, no habit required |
| EXTRA | 15% | Re-spin bonus wheel 2 more times (chain) |

**10-minute timer** starts when bonus wheel stops. Timer is authoritative — persists across app close/reopen via stored end-timestamp. If user completes a discount habit in time → clip awarded. Miss → streak ends, no clip.

User picks which habit to do for the discount (app shows their list; they choose).

### 5.8 Streak tracking

- **Daily streak:** Consecutive days with ≥ 1 clip earned
- **Bonus chain:** Current unbroken run of bonus-wheel completions in a single session
- **Hygiene bundle streak:** Consecutive days completing all 4 hygiene sub-habits by 1am

### 5.9 Jar / long-game progress bar

- Every clip earned = +$1 into virtual jar (display + track only; no real money transaction)
- User defines 3 milestones: Mini, Mid, Moonshot
- Jar visual fills proportionally
- Milestone hit → celebration animation + persistent "unlocked" badge
- User manually marks milestone as "claimed" when they actually do/buy the thing
- Claimed milestones reset that milestone's progress (subsequent $ accumulates toward next unlock) — or cumulative forever; **this is an open question, see §13**

---

## 6. Default Data (Pre-populated)

### 6.1 Default habits

| Name | Unit definition | Notes |
|---|---|---|
| Walk | 2,500 steps | Manual entry or pulled from HealthKit (out of scope v1; manual only) |
| Workout | 4 working sets (to near-failure, progressive overload, compound or major isolation, 8+ reps) | Warm-ups don't count |
| Cleaning | 20 minutes | Built-in 20-min timer optional |
| Focused work | 30 minutes uninterrupted | Built-in 30-min timer optional; Slack/email/meetings don't count |
| Hygiene bundle | All 4: shower + brush teeth + wash face + in bed by 1am | Clip awarded retroactively on next app open after midnight |

### 6.2 Default Tier 1 rewards (small, common, dopamine-leak targets)

- 15 min Instagram / TikTok / Reels
- 15 min YouTube rabbit hole
- One YouTube video under 15 min
- 15 min Reddit scroll
- 10–15 min Pinterest spiral
- 15 min X / Twitter
- 15 min window-shopping online (no checkout)
- One long article or Substack post
- One round of a casual phone game
- 15 min news scroll
- One pre-portioned off-macro snack (single piece)
- 15 min comfort-show background
- One fun-book chapter
- 15 min browsing Etsy / Ravelry / yarn shops (no purchase)

### 6.3 Default Tier 2 rewards (medium)

- 1 game of Valorant
- 30-min uninterrupted scroll session
- One sitcom episode
- 45 min Reels / TikTok indulgence
- Specialty coffee or takeout snack
- 1 hour gaming (other games)
- One movie-prep session (watch trailers, pick film, make snacks)

### 6.4 Default Tier 3 rewards (big, rare)

- 2 games of Valorant
- Full movie (at home or theater)
- In-N-Out run
- Mr. Moto's Pizza
- 90-min aimless scroll, guilt-free
- Full evening gaming session
- Takeout dinner from somewhere good
- Whole comfort-show binge night

### 6.5 Default wheel split

T1 40% / T2 30% / T3 20% / BONUS 8% / JACKPOT 2%

### 6.6 Default bag composition

6 colors × 10 clips = 60 regular + 3 gold = 63 total

### 6.7 Default jar milestones

Leave blank on first run; prompt user to define during onboarding. Placeholder copy: "What's something experiential you want? (woodworking class, spa day, concert, solo weekend, Hawaii excursion upgrade…)"

---

## 7. Technical Constraints & Non-Negotiables

- **Framework:** React 18+ with TypeScript (strict mode)
- **Bundler:** Vite
- **Deployment:** GitHub Pages (static). Build output → `/docs` or `gh-pages` branch
- **Persistence:** IndexedDB is the local source of truth (via `idb-keyval` or `Dexie`); **`localStorage` is insufficient** for the bag/history data we're tracking and has eviction risk on iOS. A CRDT doc (Yjs) is layered on top so the same state can sync across devices.
- **PWA:** Installable on iOS home screen. Service worker caches shell + assets for offline use.
- **Cloud services:** User accounts and a real-time sync relay are permitted and expected. Prefer free, hosted providers (e.g. Clerk or Supabase Auth for accounts; PartyKit / Liveblocks / y-sweet for the Yjs relay). No long-lived secrets in the client bundle — only publishable keys.
- **Offline-first is still mandatory.** The app must boot, read, and write with zero network; sync reconciles on reconnect.
- **Base path:** Must deploy under `/<repo-name>/` correctly (configure Vite `base` and React Router accordingly, or use `HashRouter` to side-step GH Pages SPA routing pain)

### 7.1 Recommended (but architecture agent may override with justification)

- **Styling:** Tailwind CSS v4 + shadcn/ui primitives
- **State:** Zustand (simpler than Redux; persist middleware aligns with IndexedDB via custom storage adapter)
- **Animations:** Framer Motion for wheel spin physics; CSS for micro-interactions
- **Icons:** lucide-react
- **Sound:** Optional; use Web Audio API with user-toggled mute. Provide subtle click/spin/win/near-miss SFX
- **Haptics:** `navigator.vibrate` on mobile for wins and near-misses (with user toggle)
- **Testing:** Vitest + React Testing Library for unit/component; Playwright for one smoke E2E
- **Lint/format:** ESLint + Prettier (opinionated, minimal config)

---

## 8. Persistence Strategy (Critical Section)

Data loss is the worst failure mode for this app — the whole system relies on compounding state. Requirements:

1. **Every mutation** (clip earned, clip drawn, clip cashed in, wheel spin, reward claimed, timer started, etc.) must be durably written to IndexedDB within 100ms
2. **Atomic transactions** for multi-step operations (e.g., "draw + update bag + update hand" is one transaction)
3. **Daily automatic backup snapshot** to a separate IndexedDB store (last 30 days retained)
4. **Manual export button** → downloads full state as timestamped JSON file
5. **Manual import button** → accepts JSON, validates schema, confirms overwrite
6. **Schema versioning** in stored data; provide migration function for schema changes
7. **CRDT sync layer.** State lives in a per-user Yjs doc persisted to IndexedDB (via `y-indexeddb`). A hosted relay (PartyKit or equivalent) fans updates out to the user's other signed-in devices. Offline edits merge deterministically on reconnect; local IndexedDB remains authoritative when the network is down.

Architecture agent must define the data schema and document it in an `ARCHITECTURE.md` file.

Suggested top-level entities (the architecture agent should refine):

```typescript
type AppState = {
  schemaVersion: number;
  habits: Habit[];
  rewards: { tier1: Reward[]; tier2: Reward[]; tier3: Reward[] };
  bag: Clip[];              // remaining clips in bag
  hand: Clip[];             // drawn, not-yet-cashed-in clips
  wheelConfig: WheelConfig;
  jar: JarState;
  streaks: StreakState;
  history: HistoryEvent[];  // append-only log of everything
  settings: Settings;
  pendingBonusTimer?: BonusTimer;
  pendingHygieneBundle?: HygieneBundleState;
};
```

---

## 9. Multi-Agent Orchestration Plan

Claude Code should execute this build in the following phases. Each agent gets a scoped brief; prior-agent output feeds into the next.

### PHASE 1 — Planning & Clarification Agent

**Role:** Read this entire spec. Produce a `PLANNING.md` document that:

1. Lists every **open question or ambiguity** flagged in §13 (and any found during read-through)
2. For each open question, proposes **2–3 concrete options** with trade-offs
3. Identifies anything **under-specified** in the wheel/bag/cash-in mechanics that could cause divergent implementations
4. Proposes **v1 feature cut lines** if scope pressure emerges
5. Estimates **complexity/risk** per major feature area (low/med/high + rationale)
6. Proposes **agent decomposition** for Phase 3 (which components can run in parallel, which have dependencies)

**Do NOT start coding.** **Do NOT finalize architecture.** Output is a decision doc for human review.

Exit criteria: `PLANNING.md` exists, human has reviewed and resolved all open questions, resolutions written back into spec or into a `DECISIONS.md` file.

### PHASE 2 — Architecture Agent

**Role:** Given the resolved spec + `DECISIONS.md`, produce `ARCHITECTURE.md` covering:

1. **Final tech stack** with version pins + rationale
2. **File/folder structure** (show the tree)
3. **Data schema** (TypeScript types for every persistent entity)
4. **IndexedDB store design** (object stores, keys, indexes, migrations)
5. **State management topology** (Zustand slices or equivalent; what's derived vs stored)
6. **Component hierarchy** (top-level routes/screens and their composition)
7. **Module boundaries** for Phase 3 parallelization (each module = one subagent's scope)
8. **Testing strategy** (what must be unit-tested vs component-tested vs E2E)
9. **Build + deploy config** (Vite config, GH Pages setup, PWA manifest)
10. **Risk register** with mitigations

**Do NOT start coding.** Output is a blueprint.

Exit criteria: `ARCHITECTURE.md` exists, human has reviewed and approved.

### PHASE 3 — Component Implementation Agents (Parallel)

Spawn the following subagents in parallel where possible. Each gets a scoped brief derived from `ARCHITECTURE.md` §7.

#### 3A. Data Layer Agent

- IndexedDB adapter and store setup
- All TypeScript types + Zod schemas for runtime validation
- State store (Zustand slices)
- Persistence middleware (every write → IndexedDB)
- Migration framework
- Export/import functions
- Daily snapshot job

**Dependency:** None. Must complete before 3B–3H start (but can start work in parallel; others stub the API).

#### 3B. Bag & Draw Engine Agent

- Pure functions for bag operations (draw, refill, composition, gold probability)
- Unit tests for probability distributions over 10k+ simulated draws
- UI for viewing current bag state (composition display, not the full clip list)

#### 3C. Wheel Engine Agent

- Pure probability engine for main wheel + bonus wheel
- Unit tests validating 10k+ spin distribution matches config within 1% tolerance
- Framer Motion spin animation with realistic deceleration
- Near-miss animation variant
- Sound + haptic hooks

#### 3D. Habit Management UI Agent

- Habit list screen (5 defaults on first run)
- Add/edit/delete habit modal
- Quick-log buttons (one tap → earn clip)
- Built-in timers for cleaning (20 min) and work (30 min) habits
- Hygiene bundle special UI (4 checkboxes, bedtime tracker, next-morning clip award logic)
- Step entry UI (numeric input, converts to clip count via floor(steps/2500))

#### 3E. Cash-in & Spin Flow Agent

- Hand display (visual pile of clips, colors visible)
- Cash-in picker (select 2 or 3 of same color; grays out invalid picks)
- "Spin" button — disabled until user confirms cash-in (or explicitly declines)
- Gold clip "Instant T3" shortcut button (bypasses wheel entirely)
- Integration: after spin resolves, show reward selection modal for the winning tier

#### 3F. Reward Menu Agent

- Tier 1 / Tier 2 / Tier 3 menu screens
- CRUD for each tier (pre-populated with defaults from §6.2–6.4)
- "Pick a reward" modal invoked after a wheel win (user selects from that tier's list)
- "Mark reward consumed" flow — optional; could log history only

#### 3G. Jar & Streak Display Agent

- Jar visualization (SVG or CSS, progressively fills)
- Milestone lines (Mini, Mid, Moonshot) — user editable with name + $ target
- Milestone claim UI (resets or accumulates per §13 resolution)
- Streak displays (daily, per-habit, hygiene bundle)
- Subtle history/activity feed (last 7 days)

#### 3H. Bonus Timer Agent

- 10-minute countdown with end-timestamp stored in IndexedDB (authoritative even if app closes)
- Persistent banner when timer is active (visible from any screen)
- "Complete discount habit" flow (pick habit, confirm, award clip)
- Timer expiration handling (streak-break animation, clean reset)

#### 3I. Onboarding & Settings Agent

- First-run onboarding: explains mechanics in 3–5 screens, seeds default data
- Settings: wheel probability editor, bag composition editor, color palette, SFX/haptics toggles, export/import, reset-all (with triple confirmation)
- "How it works" help screen (condensed version of the PDF methodology)

#### 3J. Shell & Navigation Agent

- App shell (header, nav, route structure)
- PWA manifest + icons (use a distinctive slot-machine / paperclip motif)
- Service worker for offline caching
- Error boundary + fallback UI
- Theme / design tokens (dark mode; warm accent color, yellow/gold for gold clip moments)

### PHASE 4 — Integration & Testing Agent

**Role:** After all Phase 3 agents complete:

1. Wire everything together; resolve any inter-component API mismatches
2. Run full Vitest suite; fix failures
3. Write + run one Playwright smoke test: fresh install → complete a habit → draw clip → cash in → spin → claim reward → verify persistence by reloading
4. Lighthouse audit; fix any PWA/a11y score gaps
5. Bundle size audit; flag anything over budget
6. Manual QA checklist execution (agent writes and executes checklist)

### PHASE 5 — Documentation Agent

**Role:** Author the following documents:

- **`README.md`** — project overview, screenshots, quick-start, deploy instructions, license
- **`USER_GUIDE.md`** — plain-language walkthrough of the game mechanics for end users (no code, no jargon; friendly tone, mobile-screenshot-driven)
- **`DEVELOPER_GUIDE.md`** — how to run locally, how to modify default data, how to change wheel probabilities, how to add new habits, data schema reference, how to reset, how to export/import
- **`DEPLOYMENT.md`** — step-by-step GitHub Pages deployment guide, including custom domain setup (optional)
- **`CHANGELOG.md`** — v1.0.0 initial entry
- **Inline JSDoc/TSDoc** on all exported functions, components, and types

### PHASE 6 — Deployment Agent

**Role:**

1. Set up GitHub Actions workflow for CI (lint + test + build on push)
2. Set up GitHub Actions workflow for deploy (build + publish to `gh-pages` branch on `main` merge)
3. Configure Vite `base` correctly for repo-pages URL structure
4. Verify PWA installability on iOS Safari
5. Write deployment smoke-test checklist for the owner

---

## 10. Acceptance Criteria (Definition of Done)

The build is complete when:

- [ ] Fresh `git clone` → `npm install` → `npm run dev` works on first try with zero manual steps
- [ ] `npm run build` produces a deployable static bundle under size budget
- [ ] Deploys successfully to GitHub Pages via the CI workflow
- [ ] Installable as a PWA on iOS Safari (Add to Home Screen → launches fullscreen)
- [ ] Works offline after first load
- [ ] All 5 default habits earn clips correctly
- [ ] Bag draws produce the expected color distribution over 1000 simulated draws (within 2% tolerance)
- [ ] Main wheel over 10,000 spins produces expected tier distribution (within 1% tolerance)
- [ ] Bonus wheel over 10,000 spins produces expected segment distribution (within 1% tolerance)
- [ ] Cash-in logic gates tiers correctly (test matrix: 0/1/2/3 matching, gold)
- [ ] Hygiene bundle awards clip the morning after all 4 are completed by 1am
- [ ] Bonus timer persists across app close (closing mid-timer and reopening shows correct remaining time)
- [ ] Export produces valid JSON; import restores state exactly
- [ ] All persistent state survives: browser close, device restart, PWA uninstall+reinstall (if user exported first)
- [ ] Lighthouse: PWA ≥ 90, Accessibility ≥ 95, Performance ≥ 90 (mobile)
- [ ] No console errors or warnings in production build
- [ ] All five documentation files exist and are accurate

---

## 11. Interaction / UX Principles

- **Tap-first:** Every primary action reachable in ≤ 2 taps from any screen
- **One-handed:** Critical controls in bottom third of screen
- **Instant feedback:** Every tap produces visual + (optional) haptic response within 50ms
- **No dead ends:** Every modal has a clear close / back action
- **Celebrate wins, don't punish losses:** Near-miss animation is intriguing, not demoralizing. Timer expiry is neutral.
- **Respect the Naked Rule:** Onboarding should surface the three reward rules (§04 in PDF) and prompt the user to commit
- **Make gold feel special:** Distinct animation, color, sound when a gold clip is drawn — it's the whole addictive hook

---

## 12. Visual & Audio Direction

- **Theme:** Dark mode primary. Warm accent palette (deep red like the PDF: `#E53935` or similar). Gold clip glow: `#FFD700` with soft radial bloom.
- **Typography:** System font stack or a single variable font (Inter / Geist). No more than 2 weights.
- **Wheel:** Circular, large, tappable. Pointer at right or top. Smooth deceleration (4–6 second spin). Winning segment pulses briefly after stop.
- **Paperclip illustrations:** Simple geometric representation; color = bag color; gold has subtle shimmer
- **Sound:** Spin tick, win chime (tier-specific pitch), near-miss "almost" tone, gold clip fanfare, timer tick at 10s/5s remaining. All respect mute setting.

---

## 13. Open Questions (For Planning Agent)

Planning agent must propose options and surface these for human decision before architecture begins:

1. **Jar milestone behavior:** When a milestone is hit and "claimed," does the jar reset to that level (subsequent $ counts toward next tier), or is the jar cumulative forever with milestones as "passed" checkpoints?
2. **Hand size cap:** Unlimited or soft cap (e.g., 20 clips) to force cash-in / spin activity?
3. **Work timer integration:** Just a button, or an enforced timer (starts a 30-min countdown; clip only awarded if not canceled)? What about backgrounding/screen lock on iOS?
4. **Cleaning habit variants:** Single "20 min cleaning" button, or sub-types (dishes, bathroom, kitchen, laundry, vacuum) each worth 1 clip per 20 min?
5. **Hygiene bundle grace period:** Strict "bed by 1am" or a soft "bed by 1:30am = half credit"? Strict is simpler and matches spec.
6. **Jackpot definition:** Is JACKPOT = Instant T3 + free bonus spin (my default read), or something else (e.g., instant 3 clips added to jar + T3)?
7. **Gold clip count:** Default 3 — is this still right, or adjust based on user's actual daily clip earn rate (~6/day ≈ 42/week; 3 gold out of 63 = ~4.5% chance per draw = ~2 gold/week)? See spec §5.3 for tradeoff discussion.
8. **Cashed-in clips fate:** Return to bag (my default), discard permanently, or tracked separately ("used" pile)?
9. **Near-miss frequency:** Should the wheel *visually* drift past a locked tier on every spin (even when it genuinely lands on T1), to amplify near-miss dopamine? Or only when the probability landed there?
10. **Offline behavior:** If user opens app with no network after first load, everything must work. Clarify: does SW also need to handle update flow (skip-waiting prompt on new deploy)?
11. **Reward "consumption" tracking:** When user wins a T3 reward and picks "movie," do we mark it "consumed" today and prevent re-picking for a cool-down period? Or is the menu purely an inspiration list?
12. **Multiple bags / habit stacks:** PDF suggests one jar per habit stack (fitness / brain / side-hustle). V1: single bag + single jar. Confirm or expand?
13. **PWA update strategy:** On new deploy, show a "new version" toast with reload button?

---

## 14. Out-of-Scope but Worth Recording for v2

- HealthKit / Google Fit integration for automatic step count
- Optional accountability partner view (read-only share link)
- iOS native wrapper via Capacitor for real push notifications
- Apple Watch companion for quick logging
- Multiple parallel habit stacks with independent bags/jars
- Analytics on which rewards actually get claimed vs which sit in the menu

---

## 15. Appendix A — Probability Math Reference

### Main wheel expected tier hits per 100 spins (with 3-match cash-in)

- T1: ~40
- T2: ~30
- T3: ~20
- BONUS: ~8
- JACKPOT: ~2

### Clip earn at target cadence

- Walking alone at 10–12.5k steps/day: 4–5 clips/day
- Plus workout (3 clips for full session): +3 on workout days (~3×/week)
- Plus cleaning (1 clip per 20 min; assume 20 min/day average): +1/day
- Plus hygiene bundle: +1/day (when achieved)
- Plus focused work (4 clips for a typical 2hr morning block): +4 on work days (~5×/week)

Rough total: **8–12 clips on active weekdays, 5–6 on rest days**. Weekly total ~60–70 clips.

### Gold clip expected encounters

At 3 gold in 63-clip bag (~4.8% per draw), 65 draws/week → **~3 gold events/week**.
Probably too frequent. Recommend planning agent propose 1–2 gold as alternative defaults.

---

## 16. Appendix B — Reference: The SpoonFedStudy System

Implementation must align with the source methodology. Key rules from the original PDF:

- **Maybe > Big:** Uncertainty drives dopamine more than reward size
- **Three reward rules:** Addicting + time/money-wasting + Naked Rule (only done through the system)
- **The "just a little bit more" principle:** Effort feels cheaper relative to what you JUST did; bonus wheel exploits this
- **Near-miss is a feature, not a bug:** Dopamine spikes on close calls
- **Visibility is half the magic:** Physical/digital spinner should live somewhere the user sees daily

---

*End of specification.*
