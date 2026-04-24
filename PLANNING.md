# PLANNING.md — Phase 1 Decision Document

**Project:** kakeguruimasho (Slot Machine Habit System PWA)
**Input:** `SPEC.md` v1, `reference-methodology.txt` (extracted from source PDF, SpoonFedStudy)
**Purpose:** Resolve ambiguities and structure Phase 3 before architecture work starts.
**Status:** Awaiting human review. Items marked **DECIDE** block Phase 2.

---

### Methodology PDF Addendum

After reviewing `reference-methodology.txt` (the SpoonFedStudy source methodology, 7 pages), several prior recommendations need adjustment. The PDF **resolves Q9 in favor of "visual drift on every losing spin"** (explicit authorial intent, not a tuning knob) and **reframes Q12**: the PDF's intended design is multi-jar/multi-bag, so v1's single-jar is a deliberate scope cut, not an alignment with source material — the data schema must therefore be multi-jar-ready from day one. The PDF also **tightens A1/A3** (each bonus spin starts its own 10-min timer per the "Spin the bonus wheel, and a timer starts" quote), introduces a **new clarification** that bonus-earned clips re-spin the main wheel identically to normal clips (walkthrough page 5), and establishes a **reward-rules canon** requiring verbatim quotation of "Highly Addicting / Time or Money Wasting / Naked Rule" in onboarding copy. Two new A-series entries (A17, A18) capture additional PDF-vs-spec tightening: "just a little bit more" as a named design principle the UI should preserve, and the 3-reward-rules as enforced validation on reward CRUD. All changes are marked inline with **UPDATED after PDF review** headers.

---

## 1. Open Questions — Resolution Matrix (Spec §13)

Legend: **DECIDE** = blocks Phase 2. **DEFER** = can be chosen at implementation time or tuned post-launch without architectural impact.

### Q1. Jar milestone behavior — reset vs. cumulative

| Option | Trade-offs |
|---|---|
| A. Reset on claim ("level up") | Each milestone feels like a fresh run. Jar visual keeps feeling alive after Moonshot. Slightly more state (`claimedAt`, `levelBaseline`). Matches slot-machine compulsion loop (reward → reset → chase again). |
| B. Cumulative forever, milestones as checkpoints | Simpler data (just a running total). Shows lifetime progress. Jar visual becomes "done" after Moonshot; dopamine tapers. Requires a "next goal" editor post-Moonshot or it dies. |
| C. Hybrid: cumulative total tracked, but visual ring resets per tier | Shows both progress and forward motion. Most complex; two views to maintain. |

**Recommend A (reset).** Aligns with the "maybe > big" loop in §16; cumulative will plateau and dis-engage within months. **DECIDE** — schema-impacting (`JarState` shape).

### Q2. Hand size cap

| Option | Trade-offs |
|---|---|
| A. Unlimited (spec default §5.4) | Matches spec literally. User can hoard 50+ clips. Risks killing the draw-reveal loop (hoarders never spin). |
| B. Soft cap ~20 with non-blocking "your hand is full" nudge | Pushes spin cadence. Needs copy + affordance. No data loss. |
| C. Hard cap: cannot earn new clips until hand < cap | Forces engagement but punishes the user on a good day; breaks habit-logging flow. |

**Recommend A for v1, build soft-nudge (B) as a settings toggle default-off.** Spec §5.4 explicitly says "No hand size limit" — overriding without user data is premature. **DEFER.**

### Q3. Work timer integration — enforced timer vs. button

| Option | Trade-offs |
|---|---|
| A. Button-only log | Simple. Honor system. iOS backgrounding irrelevant. |
| B. Optional enforced 30-min timer with cancel-forfeit | Adds skin-in-the-game. iOS backgrounding kills JS timers — must use `endTimestamp` + visible-tab resume, same pattern as bonus timer (§5.7). Screen lock does not kill the timer since we don't rely on setInterval. |
| C. Mandatory timer (no button-only path) | Too restrictive — senior user should self-assess "was that 30 interrupted minutes". |

**Recommend B, default off, opt-in per habit.** Reuses the §5.7 end-timestamp pattern so it costs almost nothing given we must build that for bonus. **DEFER** (can ship v1.0 with A and add in v1.1).

iOS gotcha note: `setInterval` pauses in backgrounded PWAs on iOS and resumes drifted; never rely on it for authoritative time. Always compute `remaining = endTs - Date.now()` on visibility change.

### Q4. Cleaning habit — single vs. sub-types

| Option | Trade-offs |
|---|---|
| A. Single "20 min cleaning" unit (spec §6.1) | One button. Matches spec. |
| B. Sub-types (dishes/bathroom/etc.), 1 clip per 20 min each | More granular feedback. Multiplies habit count; no engine changes. User can add these themselves via habit CRUD. |
| C. Single habit with sub-type tag for history only | Preserves count but lets user review where they cleaned. |

**Recommend A.** User can create sub-habits manually if they want B. Don't hardcode. **DEFER.**

### Q5. Hygiene bundle grace period

| Option | Trade-offs |
|---|---|
| A. Strict "bed by 1:00am" (all 4 before 1:00am local) | Simple; clear; matches spec §6.1. |
| B. Half-credit window to 1:30am (0.5 clip? or clip but no streak?) | Kinder. Partial-clip breaks the "one unit = one clip" invariant (§5.1). |
| C. Configurable cutoff time in settings | Forgiving; minor UI cost. |

**Recommend C (configurable), default 1:00am.** Single line of config, respects spec, adapts to chronotype shifts. **DEFER.**

### Q6. Jackpot definition

| Option | Trade-offs |
|---|---|
| A. Instant T3 + free bonus spin (spec §5.6, §13 default read) | Matches spec table exactly. |
| B. Instant T3 + $3 jar bonus | Breaks "clip = $1" invariant. |
| C. Instant T3 + bypasses cash-in req + free bonus spin | This *is* A — spec already says "regardless of cash-in status". |

**Recommend A, verbatim from spec §5.6.** No ambiguity once re-read. **DEFER** (no real choice).

### Q7. Gold clip count

Math grounding (spec §15):
- 65 draws/week, 3 gold / 63 total ≈ 4.8% per draw → ~3.1 gold events/week
- Spec §15 flags this as likely too frequent
- Target: ~1 gold event / 1–2 weeks feels "rare but real"

| Option | gold/63 | per-draw % | events/week @ 65 draws | events/month |
|---|---|---|---|---|
| A. 3 gold (current default) | 3 | 4.8% | 3.1 | ~13 |
| B. 2 gold | 2 | 3.2% | 2.1 | ~9 |
| C. 1 gold | 1 | 1.6% | 1.0 | ~4.3 |
| D. 1 gold in 80-clip bag (6×13 + 1 wait, approx 6×13+2=80 adj) | 1 / 78 | 1.28% | 0.83 | ~3.6 |

**Recommend C (1 gold in 63-clip bag).** §15 labels the gold moment "the whole addictive hook" (§11); 1/week sustains novelty without normalizing it. User can tune up via settings. **DECIDE** — affects default-data constant and simulation test tolerances.

### Q8. Cashed-in clips fate

| Option | Trade-offs |
|---|---|
| A. Return to bag (spec §5.5 default) | Keeps bag composition stable long-term. No inventory drift. |
| B. Discard permanently | Bag depletes over time → auto-refill (§5.3) becomes the stabilizer, but creates weird mid-week stretches where only 10 clips remain. |
| C. Separate "used" pile, visible in jar UI | Extra data, no gameplay benefit for single user. |

**Recommend A, verbatim from spec.** **DEFER** (spec is explicit).

### Q9. Near-miss frequency — always or only when probabilistic

| Option | Trade-offs |
|---|---|
| A. Near-miss animation only when RNG actually lands on a locked tier (spec §5.6 literal) | Honest. Lower dopamine hit rate. Simpler physics (one stop target). |
| B. Always drift past a locked tier every spin | Max addictiveness. Breaks trust if user notices. Two stop targets per spin (real + cosmetic overshoot). |
| C. "Theatrical" pass-through only when wheel genuinely stops *adjacent* to a locked tier | Compromise. Requires segment adjacency check post-resolve. |

**Recommend A for v1, C as a tuning knob in v1.1.** The spec's §11 "celebrate wins, don't punish losses" and §16 "near-miss is a feature" are in tension; A is the conservative, testable version. **DECIDE** — affects wheel animation contract and test expectations.

**UPDATED after PDF review:** The PDF (page 3, "Cashing In" section) explicitly states: *"Even 'losing' spins drift past Tier 3 — your dopamine spikes anyway. That's the whole point."* This is **authorial intent, not a tuning knob** — the methodology treats near-miss drift as core to the dopamine mechanic, not an optional flourish. **Recommendation changes to Option B: always drift past a locked tier every losing spin** (where "locked" = any tier the user hasn't cashed in for). Confidence: **high** (direct quote). The earlier "trust dies if user notices" concern in §4 risk table is reframed: the user *will* notice and the drift is **intended** to be noticed — the machine telegraphing "you almost had it" is the point. Animation contract: every non-winning spin must visually overshoot or brush at least one locked tier before settling. Winning spins land cleanly on their segment. This supersedes the earlier Option A recommendation. Test expectations: a losing-spin snapshot test asserts the wheel's animation passes through (not stops at) a locked-tier segment.

### Q10. Offline / SW update flow

| Option | Trade-offs |
|---|---|
| A. Cache-first, no update UI. User gets new version on next cold start after SW takes over. | Simplest. Confusing delays after deploy. |
| B. `skipWaiting` + `clientsClaim` on activation | Immediate update, but can swap JS under a live session → render bugs mid-interaction. |
| C. Prompt-to-reload toast when new SW waiting | Standard pattern (Vite PWA plugin). Small UX cost, safe. |

**Recommend C.** Vite PWA plugin (`virtual:pwa-register` with `onNeedRefresh`) gives this for free. **DEFER** (Phase 3J concern, architectural shape is fixed).

### Q11. Reward consumption tracking

| Option | Trade-offs |
|---|---|
| A. No tracking; menu is inspiration list | Spec §6.2 default read. Zero friction. |
| B. Log consumption to history (no cooldown) | Gives v2 analytics (§14); no gameplay impact. Trivial. |
| C. Cooldown lockout (e.g., "movie once/week") | Enforcement complexity; contradicts "user picks freely" §5.5. |

**Recommend B.** History event is basically free given we have an append-only log. **DEFER.**

### Q12. Multiple bags / habit stacks

**Recommend confirm v1 = single bag + single jar (spec §3.1, §14).** Architecture should namespace `Bag`, `Jar`, `HabitStack` so v2 can add more without refactor, but only one instance in v1. **DECIDE** — minor schema decision (keep `bagId` on clips + history events, or defer entirely).

**UPDATED after PDF review:** The PDF's **intended design is multi-jar**, not single. Page 6 edge-case #4: *"Use multiple jars to keep track of multiple habits. Each one acts as a progress bar for that particular habit. Fill them up with their own paperclips for massive rewards!"* Page 2 pro-tip: *"Use 3 jars for 3 habits (fitness / brain / side-hustle) — each with its own prize ladder."* This reframes the decision: v1's single-jar is **a deliberate scope cut, not a faithful rendering of the methodology**. Implication for schema: the data model MUST be multi-jar-ready from day one — every clip, jar balance, milestone, streak, and history event carries a `jarId` (or `bagId`/`stackId`) foreign key, even though v1 seeds exactly one jar with a reserved ID. v2 adding a second jar becomes a pure UI/CRUD change, **zero data migration**. Do NOT ship a schema that hardcodes a singleton jar — that would be an architectural mistake we'd pay for in v2. Recommendation upgraded from "minor schema decision" to **required**: `jarId` is a non-optional FK on all jar-scoped state. Confidence: **high** — this is the difference between "scope-cut now, v2 later" (correct) and "misaligned with methodology, v2 requires migration" (wrong).

### Q13. PWA update strategy

Same as Q10. **DEFER.**

### Resolution summary

| Question | Status | Recommendation |
|---|---|---|
| Q1 Jar behavior | **DECIDE** | Reset on claim |
| Q2 Hand cap | DEFER | Unlimited |
| Q3 Work timer | DEFER | Button-only v1.0, opt-in timer v1.1 |
| Q4 Cleaning sub-types | DEFER | Single habit, user-extensible |
| Q5 Hygiene grace | DEFER | Configurable, default 1:00am |
| Q6 Jackpot | DEFER | Spec default |
| Q7 Gold count | **DECIDE** | 1 gold / 63 |
| Q8 Cash-in fate | DEFER | Return to bag |
| Q9 Near-miss frequency | **DECIDE** | ~~Only on real locked-tier landings~~ → **Always drift past locked tiers on losing spins** (PDF explicit) |
| Q10 Offline flow | DEFER | Prompt-to-reload toast |
| Q11 Reward consumption | DEFER | History-log only |
| Q12 Multi-bag | **DECIDE** | Single jar v1 as scope cut; schema **mandates** `jarId` FK everywhere (multi-jar is PDF canon) |
| Q13 PWA update | DEFER | See Q10 |

**Four DECIDE items block Phase 2.** The rest can land post-architecture.

---

## 2. Additional Ambiguities / Spec Inconsistencies

Findings from cross-reading §5, §6, §10, §15, plus read-through of the whole doc.

| # | Finding | Severity | Proposed resolution |
|---|---|---|---|
| A1 | **BONUS outcome ambiguity (§5.6).** "Auto-collect current best available tier, then spin bonus wheel." If user hasn't cashed in at all, "best available" = T1. If they cashed in 3-match, best available = T3. Is the tier chosen at *spin start* or at *BONUS-segment resolution*? They're identical if cash-in happens once before spin, which §5.5 implies. Flag explicit. | Low | Lock: best-available tier = tier permitted by this spin's cash-in, resolved at BONUS segment. **UPDATED after PDF review:** PDF page 4 states *"Spin the bonus wheel, and a timer starts"* — the timer is tied to the act of spinning, not to a stack/chain concept. Each individual bonus-wheel spin (including subsequent spins generated by EXTRA) begins its own fresh 10-minute window at the moment that spin resolves onto a discount segment (75%/50%/25%). Tier auto-collect happens at BONUS-segment resolution on the main wheel, before the first bonus spin fires. Confidence: high. |
| A2 | **Bonus-chain EXTRA semantics (§5.7).** "Re-spin bonus wheel 2 more times (chain)." Does that mean two guaranteed spins appended, or one + if EXTRA hits again, two more? Cascade math differs. | Med | Interpret as: current spin is "used," stack += 2, resolve sequentially. EXTRA on a subsequent chain spin adds 2 more. 15% EXTRA base → expected chain length = 1/(1−0.3) ≈ 1.43 spins. Document. |
| A3 | **Bonus timer + EXTRA chain.** If EXTRA fires, does the 10-min timer reset per discount spin, or is there one timer covering the whole chain? §5.7 reads as one-timer-per-segment-outcome but is silent on EXTRA. | Med | Each non-EXTRA bonus outcome starts its own 10-minute window on that segment's resolution. EXTRA does not start a timer. Requires a "pending bonus stack" state machine. **UPDATED after PDF review:** PDF page 5 walkthrough confirms: in step 04, the EXTRA spin lands and *"Another discount. Another timer."* — explicit per-spin timer semantics. Each discount segment (75%/50%/25%) resolved anywhere in the chain starts its own independent 10-minute window at that resolution moment. Timers can run concurrently if user resolves multiple EXTRA spins before completing the earlier discount habit (edge case — state machine must handle an active-timer list, not a singleton). FREE segment awards a clip immediately with no timer. EXTRA segment awards no clip, queues 2 additional bonus spins, no timer. Confidence: high. |
| A4 | **Bonus 75/50/25% completion measurement.** For "do 75% of a habit unit" — 75% of 20 min cleaning = 15 min, ok. 75% of hygiene bundle (4 items) = ? 75% of walking (2500 steps) = 1875. Need a per-habit rule. | High | Tiered completions apply only to *measurable numeric* habits (steps, minutes, sets). Hygiene bundle is excluded from bonus-discount eligibility (compound habit). FREE segment remains available. Document in PDF. |
| A5 | **Hygiene bundle "retroactive clip" timing (§5.8, §6.1).** "Clip awarded retroactively on next app open after midnight." But streak requires "by 1am." So if user opens app at 12:30am having done all 4, do they get clip immediately? Or wait until after 1am? | Med | On any state change that completes all 4 sub-items before cutoff, award clip immediately AND mark day as hygiene-complete. "Retroactive" phrasing covers the "next-morning app-open" case where completion happened but app wasn't re-opened. |
| A6 | **Gold instant-T3 (§5.5) and wheel probability.** Gold clip bypasses wheel entirely. Does "tier 3 reward menu" get picked from the same way as a T3 wheel win? | Low | Yes — same modal, same cooldown semantics, history event distinguishes `source: 'gold'` vs `'wheel'`. |
| A7 | **Bag empties mid-spin-setup (§5.3).** If bag reaches 0 after a draw, refill to composition. But if the user *cashes in* clips from hand back into an already-full-ish bag, bag can exceed starting composition temporarily. Does that matter? | Low | Cashed-in returns are fine — bag is just "multiset of clips available." Auto-refill only triggers when size reaches 0 on attempted draw. |
| A8 | **Daily streak reset (§5.8).** "Consecutive days with ≥1 clip." Time zone? Rollover moment? San Diego (user is in §2) = PT, but user could travel. | Med | Use device local date at time of clip-earn event. Rollover = local midnight. Document. No TZ migration logic needed for single-user v1. |
| A9 | **Reward menu "only if unlocked" (§5.6).** When wheel lands T2 after only 2-match, user picks from T2 menu — ok. But wheel physically has T2 *and* T3 segments. If RNG says T3 and user has 2-match, it's a near-miss (§5.6) — good. But §10 "test matrix: 0/1/2/3 matching, gold" is incomplete — missing: what about cash-in happens mid-spin-animation (user shouldn't be able to)? | Low | Freeze cash-in state on spin start; disable cash-in UI until spin resolves. |
| A10 | **Jar = clips earned only?** §5.9 "Every clip earned = +$1." Does a *bonus-wheel FREE clip* count? Does a clip earned via bonus timer count? | Low | Yes to all — any clip entering the hand (from any source) = +$1. Redemptions (gold instant-T3) do not spawn a clip, so they do not count. |
| A11 | **Export/import (§8.5) overwrite semantics.** "Confirms overwrite" — full replace, or merge? | Low | Full replace. Merge is semantically broken (can't reconcile two histories). Confirm dialog should say so. |
| A12 | **Schema migration (§8.6) framework — required vs. stub?** Zero migrations exist at v1.0.0. Decision: ship migration runner with an empty registry, or defer entirely? | Low | Ship the runner (5 lines of code) to avoid a risky schema-change retrofit. |
| A13 | **§15 Appendix inconsistency.** Says "3 gold events/week" and "too frequent, recommend 1–2." §6.6 still lists 3 gold as default. §13 Q7 acknowledges. Inconsistency between §6 and §15 must resolve via Q7 decision. | — | Resolved by Q7. |
| A14 | **Hygiene bundle streak vs. daily streak interaction.** Can daily streak = 10 while hygiene streak = 0? Yes, because daily only needs ≥1 clip. Just confirming. | Low | Yes, independent counters. |
| A15 | **"Near-miss" logging (§5.6).** "Log the event" — is this for the user to see (history feed) or for telemetry? Spec §3.2 excludes analytics. | Low | Local history event only, surfaces in §3G activity feed. |
| A16 | **Wheel config editor (§3I).** User can edit probabilities. Must sum to 100. What if they enter 95? | Low | Auto-normalize on save, show computed percentages. Or block save with validation error — recommend block + clear error. |
| A17 | **Bonus-earned clip re-spins the main wheel (NEW from PDF).** Spec §5.7 is silent on what happens after the user completes a discounted habit and earns a bonus paperclip. PDF page 5, walkthrough step 03: *"You earn +1 paperclip AND re-spin the main wheel."* A clip earned via bonus discount behaves **identically** to a clip earned via normal habit completion — the user draws from the bag and spins the main wheel with it. This means the full loop (bonus → main wheel → possibly another BONUS → another bonus wheel → ...) is recursive and unbounded in principle. PDF page 5 explicitly tags this as *"MAX STREAK → ∞"*. | Med | Encode the recursion: `earnClip(source: 'bonus-discount' \| 'bonus-free' \| 'habit' \| 'gold-conversion')` enters a single canonical code path that (a) draws from bag, (b) offers cash-in, (c) spins main wheel. No special-case "bonus-earned clips skip the main wheel." Confidence: high. Architect must not build a short-circuit for bonus-origin clips. |
| A18 | **"Just a little bit more" as named design principle (NEW from PDF).** PDF page 5 and page 6 explicitly name this: *"Your brain evaluates effort relative to what you JUST did. Right after 15 burpees, 6 more feels like a steal."* This is not just flavor — it's the psychological load-bearing wall behind discount segments. UI implication: when a bonus discount window is active, the discounted habit's CTA should prominently display **the delta** ("6 more burpees — you just did 15") rather than just the raw target ("do 6 burpees"). The framing is the feature. | Low | Bonus-active habit CTA component must render `"${discountedTarget} more ${unit} — you just did ${originalTarget}"` when the most-recent completion of that habit is within the active bonus window. Designer/copywriter must protect this framing in onboarding + in-app copy. |
| A19 | **3-reward-rules enforcement (NEW from PDF).** PDF page 3 defines three rules verbatim for reward selection: Highly Addicting / Time or Money Wasting / Naked Rule. Spec §6.2 lists reward examples but does not encode the rules as validation or as onboarding canon. | Low | (a) Onboarding step that introduces reward creation quotes all three rules **verbatim** from PDF, including the "Naked Rule" branding (see §3 scope-cut note). (b) Reward CRUD form shows the three rules as persistent sidebar copy, not a one-time modal. (c) No machine validation — the rules are judgment calls; enforcement is cultural/copy, not code. |

---

## 3. v1 Scope-Cut Lines (Safety Valve)

**This is not the recommended build.** Ordered cuts if time pressure emerges during Phase 3:

1. **Cut #1 (save 1–2 days):** Built-in timers for cleaning/work habits → Q3 Option A button-only. Punts one timer codepath; bonus timer still required so pattern exists.
2. **Cut #2 (save 1 day):** Sound effects (§7.1, §12). Haptics stay — `navigator.vibrate` is a one-liner. Audio is ~200 LOC of Web Audio boilerplate + asset pipeline.
3. **Cut #3 (save ~1 day):** Daily automatic backup snapshot (§8.3). Manual export still required by spec §3.1. Losing snapshots hurts but user exports cover disaster recovery.
4. **Cut #4 (save ~1 day):** Jar milestone celebration animation → static badge flip. Milestones still function.
5. **Cut #5 (save ~0.5 day):** Subtle activity feed (§3G). Replace with "last N history events as text list."
6. **Cut #6 (save 1–2 days):** Onboarding flow (§3I) → single "got it" modal + link to help screen. User is the owner, doesn't need handholding.
7. **Cut #7 (emergency):** Hygiene bundle retroactive logic (§A5) → strict "must be done before 1am local OR manually mark next morning." Removes background-evaluation edge cases.

**UPDATED after PDF review — Reward-rules canon (do not cut, do not paraphrase):** Even in the most aggressive scope-cut scenario where onboarding collapses to a single "got it" modal (Cut #6), that modal MUST quote the PDF's three reward rules **verbatim**, including the specific branded names "Highly Addicting," "Time or Money Wasting," and **"The Naked Rule"** (with the accompanying *"Never do this reward 'naked' again — only through the system. Otherwise the casino is irrelevant."*). Do not paraphrase the Naked Rule into something neutered like "only use rewards through the app" — the branding and the imperative phrasing are load-bearing for the psychology. This is a copy constraint, not a scope-cut candidate. See A19.

**Do NOT cut:** persistence/IndexedDB, export/import, bag engine, wheel engine, bonus timer, cash-in gating, PWA manifest, service worker, dark theme, multi-jar-ready schema shape (per Q12 update), verbatim reward-rules copy (per above). These are the product.

---

## 4. Complexity / Risk Table

| Feature area | Complexity | Risk | Rationale |
|---|---|---|---|
| Bag engine (draw/refill/composition) | **Low** | Low | Pure functions over array; trivial tests. Gotcha: PRNG quality — use `crypto.getRandomValues` not `Math.random`. |
| Wheel engine (probability resolve) | **Low** | Low | Pure function. Near-miss animation coupling elevates UI risk. |
| Wheel animation (Framer Motion deceleration) | Med | Med | Motion on rotational transforms is straightforward; landing-exactly-on-segment precision is fiddly; iOS 60fps under 120Hz scroll contention can jank. |
| Bonus timer + persistence | **Med** | **High** | Must be authoritative across app close/reopen/PWA-killed-by-iOS. EXTRA chain state machine (A2, A3) is subtle. Visibility events, `Date.now()` drift. High risk if rushed. |
| Hygiene bundle | Med | Med | Cross-day state, retroactive awarding, day-boundary logic (A5, A8). Easy to write, easy to get wrong. |
| Cash-in flow | **Low** | Low | State machine is 5 states. Gold instant-T3 is a separate branch. |
| Reward menu CRUD | Low | Low | Pure CRUD over local state. |
| Jar + streaks display | Low | Low | Derived from history; display-only. SVG fill is the only visual twist. |
| Persistence (IndexedDB / idb-keyval) | Med | **High** | Single most important subsystem per §8. iOS Safari eviction risk if user hasn't "installed" PWA (storage is marked best-effort until A2HS). Atomic transactions across multiple stores need care. Schema versioning must be correct day-1 or migrations become load-bearing. |
| Daily snapshot job | Low | Low | Runs on app open, not on interval. |
| Export / import | Low | Low | JSON stringify/parse + schema validate. |
| PWA manifest + SW | Med | Med | Vite PWA plugin handles 80%. iOS quirks: splash screen, status-bar style, display=standalone, apple-touch-icon sizes, no push. Base path must be right. |
| GH Pages deploy + base path | Low | Med | Classic HashRouter-vs-BrowserRouter gotcha. Asset paths must honor `import.meta.env.BASE_URL`. First deploy often breaks. |
| Onboarding | Low | Low | Static 3–5 screens. |
| Settings / probability editor | Low | Low | Form over config. Validation (A16). |
| First-load perf / bundle budget (< 250KB gz) | Med | Med | Framer Motion alone is ~40KB gz. Tailwind CSS (JIT) is fine. Icons via `lucide-react` tree-shake well. Audio assets must be lazy/CDN-ish. shadcn/ui components ship as source — easy to bloat. |
| Accessibility ≥ 95 | Med | Med | Dark-mode contrast, tap targets, focus rings on custom controls, wheel-result announce to SR. |
| Service worker update flow | Low | Med | Vite PWA `registerSW` pattern handles it. Must not aggressively `skipWaiting`. |

**Top 3 risks:**
1. **Bonus timer correctness under iOS PWA backgrounding** — only reliable if driven by persisted `endTimestamp`, never `setInterval`. EXTRA chain (A2/A3) multiplies state.
2. **IndexedDB durability on iOS** — storage is evictable pre-install; user loses data. Mitigation: prompt install on first run, implement daily JSON snapshot, make manual export discoverable, and consider `navigator.storage.persist()` request.
3. **Wheel animation landing precision + near-miss semantics** — if wheel visually disagrees with RNG result, trust dies. **UPDATED after PDF review:** Q9 now resolves to "always drift past locked tiers on losing spins" (PDF authorial intent), so the animation engine has two canonical paths: (a) winning spin → clean land on resolved segment, (b) losing spin → overshoot or brush-past at least one locked tier, then settle. This is not a tuning knob — the drift IS the mechanic. Code-path count unchanged from prior estimate; the decision is just locked.

---

## 5. Phase 3 Agent Decomposition

### Shared-code touch analysis

| Agent | Owns | Reads | Writes to shared store |
|---|---|---|---|
| 3A Data Layer | schemas, IDB adapter, store, migrations, export/import | — | **yes, the foundation** |
| 3B Bag & Draw | bag engine (pure), bag state-display UI | `bag`, `hand`, `history` | yes |
| 3C Wheel Engine | wheel engine (pure), animation, SFX hooks | `wheelConfig`, `hand` (cash-in), `history` | yes |
| 3D Habit UI | habit CRUD UI, quick-log, habit-specific timers, hygiene bundle UI | `habits`, `streaks`, `pendingHygieneBundle` | yes |
| 3E Cash-in & Spin | hand display, cash-in picker, spin button, post-win modal | `hand`, `bag`, `wheelConfig`, `rewards` | yes (heavy) |
| 3F Reward Menu | T1/T2/T3 CRUD, pick-reward modal | `rewards`, `history` | yes |
| 3G Jar & Streaks | jar SVG, milestone UI, streak displays, activity feed | `jar`, `streaks`, `history` | yes (jar claim only) |
| 3H Bonus Timer | countdown, persistent banner, discount-habit flow, expiration | `pendingBonusTimer`, `habits`, `bag`, `hand` | yes |
| 3I Onboarding & Settings | first-run flow, all settings screens, reset-all | everything | yes (config only) |
| 3J Shell & Nav | layout, router, manifest, SW, error boundary, theme tokens | — | no |

### Dependencies

- **3A is a hard blocker** on 3B–3I. No one can write without schemas and store API.
- **3J can run in true parallel with 3A** (shell doesn't need types; theme tokens, manifest, router skeleton are content-agnostic).
- **3B, 3C, 3F, 3G, 3I** can run in true parallel once 3A exposes its contract — they touch disjoint slices.
- **3E (cash-in & spin flow) integrates 3B + 3C + 3F.** Must start *after* interfaces from 3B and 3C exist (not full implementations — just typed facades).
- **3H (bonus timer) depends on 3C (wheel resolve)** and 3D (habit list for discount selection). Not on 3E.
- **3D has no cross-agent dependency** beyond 3A.

### Interface contracts that must exist before dependents start

The architecture agent must author these in `ARCHITECTURE.md` §7 before Phase 3:

```typescript
// 3A exposes:
interface Store { /* Zustand slices + selectors */ }
interface Persistence {
  write(tx: MutationTx): Promise<void>;
  exportAll(): Promise<Blob>;
  importAll(json: string): Promise<void>;
}
interface HistoryAppend { (event: HistoryEvent): void }

// 3B exposes (pure):
drawClip(bag: Clip[], rng: Rng): { drawn: Clip; bag: Clip[] }
refillBag(composition: BagComposition): Clip[]

// 3C exposes (pure):
resolveMainSpin(cfg: WheelConfig, rng: Rng): MainSpinResult
resolveBonusSpin(cfg: BonusWheelConfig, rng: Rng): BonusSpinResult
// and imperative:
spinAnimation(segment: number, opts: { nearMiss: boolean }): Promise<void>

// 3F exposes:
openRewardPicker(tier: Tier): Promise<RewardId>

// 3H exposes:
startBonusTimer(segmentOutcome: BonusSpinResult): void
bonusTimerState(): BonusTimerState | null
```

### Proposed wave plan

**Wave 1 (serial bottleneck):**
- **3A — Data Layer Agent** (alone)
- **3J — Shell & Nav** (can run in parallel; needs nothing from 3A except optional final wiring)

Exit: types exist, store API stable, migrations runner in place, shell routes stubbed.

**Wave 2 (broad parallel, 4 agents):**
- **3B — Bag & Draw**
- **3C — Wheel Engine**
- **3D — Habit Management UI**
- **3F — Reward Menu**

These touch disjoint store slices. All four can run truly parallel with zero code collision.

**Wave 3 (integration agents, 3 parallel):**
- **3E — Cash-in & Spin Flow** (integrates 3B, 3C, 3F)
- **3G — Jar & Streaks** (reads history written by 3D, 3E)
- **3H — Bonus Timer** (integrates 3C, 3D)

**Wave 4 (last, serial):**
- **3I — Onboarding & Settings** — must run last because it needs every other feature to exist to expose toggles for it, and the first-run flow needs seed data for rewards/habits from defaults.

Then Phase 4 integration.

### Conflict-prone shared files (flag for architecture agent)

The architecture agent should define and freeze these before Phase 3 spawns, so no two agents diverge:

- `src/types/*.ts` — owned by 3A only; others import read-only
- Zustand store slice organization — 3A must document which slice each field lives in so Wave 2 agents don't re-define
- Theme tokens (`src/styles/tokens.css` or equivalent) — 3J owns; others reference
- `src/lib/rng.ts` — shared crypto RNG; 3A or 3J owns
- History event discriminated union — 3A owns; every other agent adds its variant by PR-extension, not redefinition

---

## 6. Default-Data Adjustments (per §15)

### Gold clip count

See Q7. **Recommend 1 gold in 63 total.**

Math:
- User's clip earn estimate (§15): ~65 draws/week
- Target: ~1 gold/week feels "notable rare"
- 1/63 = 1.59% per draw × 65 = 1.03 gold/week ✔

Additional: make gold count **a first-class setting**, not hidden. User will want to tune this after a month of play data.

### Other defaults that seem miscalibrated

1. **Wheel BONUS 8% + JACKPOT 2% = 10% of spins are bonus-wheel-triggering.** At 65 clips/week and assuming ~every spin after cash-in: ~6.5 bonus-wheel triggers/week. That's a lot of 10-minute timers to babysit. Flag: user may find this oppressive. Recommend **keep spec values for v1**, but monitor post-launch.

2. **Bonus wheel EXTRA 15%.** Combined with 0.3 "chain continues" (FREE + EXTRA both end cleanly? EXTRA chains, FREE doesn't) — the chain-length expectation ≈ 1/(1−0.15) = 1.18. Fine. Noted only because A2 disambiguation matters.

3. **Hygiene bundle = 1 clip for 4 sub-habits.** §15 clip-earn table says "+1/day" — confirms spec intent. But relative friction is ~equal to doing a 2,500-step walk (also 1 clip). Given bundle has 4 sub-items including "in bed by 1am," it's under-rewarded relative to friction. Flag as tuning knob; do **not** change default — it's matching spec §6.1. User can bump in settings.

4. **Walk unit = 2,500 steps.** §15 says user walks 10–12.5k/day. That's 4–5 clips/walk day. Fine by spec but check whether the clip-logger UI makes entering "I walked 11,300 steps today" pleasant (floor(11300/2500) = 4 clips at once). Ensure the step-entry UI awards clips in a **batched single draw+spin opportunity** or the user will feel punished by clicking draw 4 times. Flag for 3D — recommend batching multiple clips into one multi-draw action with an animation.

5. **Default jar milestones** — spec correctly leaves blank (§6.7). No change.

6. **Default wheel config** — 40/30/20/8/2 — keep.

7. **Default colors** — 6 named colors. Flag accessibility: Red/Green shouldn't be the only distinguishers for a colorblind user. Recommend adding a pattern/icon per "color" at the clip-visual level. Same for the wheel segments. Spec §4 targets a11y ≥ 95.

---

## Appendix — iOS Safari PWA gotchas relevant to architecture

These should inform Phase 2 (not re-derived there):

| Gotcha | Mitigation |
|---|---|
| IndexedDB data is evictable until user "installs" PWA to home screen | Call `navigator.storage.persist()` after first successful draw; show install prompt; daily JSON snapshot auto-export |
| `setInterval`/`setTimeout` paused when PWA backgrounded | Bonus timer, work timer must use persisted `endTimestamp` + `visibilitychange` recompute |
| No Web Push on iOS PWA (as of spec date) | Spec §3.2 already out-of-scope. Confirm. |
| PWA reinstall wipes storage | Export/import mandatory (spec has it). Surface in onboarding. |
| 50MB storage soft cap on iOS | History is append-only — implement truncation policy (keep last N or rollup). |
| Service Worker update lag | Use Vite PWA `registerSW({ onNeedRefresh })` prompt-to-reload |
| `display: standalone` status-bar style needs `apple-mobile-web-app-status-bar-style` meta | Include in manifest + HTML head |
| Splash screen requires per-device-sized `apple-touch-startup-image` links | Generate with pwa-asset-generator |
| No `Notification` API for scheduled reminders | Out of scope; if user wants a daily nudge, add it via iOS Calendar/Shortcuts manually |
| Audio autoplay blocked until user gesture | First tap on app unlocks; Web Audio context must resume on gesture |
| `navigator.vibrate` is a no-op on iOS Safari | Haptics only work on Android. Document and ship anyway for cross-platform. |
| Base path in `/<repo-name>/` breaks asset URLs if not Vite `base` configured | Configure `vite.config.ts` `base: '/kakeguruimasho/'` and use `HashRouter` to sidestep 404 on refresh |

---

*End of PLANNING.md. Awaiting human review of the four DECIDE items above.*
