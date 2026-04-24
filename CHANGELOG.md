# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Real-time cross-device sync (opt-in).** Sign in once, same jar on every device. Yjs doc persisted to IndexedDB via `y-indexeddb`, relayed through a PartyKit worker (`party/sync.ts`), JWT-gated by Clerk. One room per user id. Fully gated on build-time `VITE_CLERK_PUBLISHABLE_KEY` + `VITE_PARTYKIT_HOST` — with either unset the app behaves exactly like the legacy single-device build (no sign-in gate). Full setup in `CLOUD_SYNC_SETUP.md`.
- **Custom intermediate jar milestones.** `MilestoneId` relaxed from the `'mini' \| 'mid' \| 'moonshot'` union to a branded string. The three canonical milestones still always exist; users can now add any number of extra checkpoints via `+ Add milestone` in `MilestoneEditor`. Store gains `addMilestone` / `removeMilestone` / `updateMilestones` actions. Only the literal `MOONSHOT_MILESTONE_ID` triggers the jar-reset-on-claim flow — extras are history-only.
- **Rewards entry point in Settings.** New `RewardsLinkCard` panel shows active-reward counts per T1 / T2 / T3 and deep-links to the existing `/rewards` route (which had full tier CRUD but was unreachable from the UI).
- **CI wiring for cloud sync.** `.github/workflows/deploy.yml` now forwards `VITE_CLERK_PUBLISHABLE_KEY` + `VITE_PARTYKIT_HOST` from GitHub Actions secrets into the Pages build.

### Changed

- **SPEC.md §7 / §8** dropped the "No backend. No API keys. No user accounts." non-negotiable. User accounts + sync relay are now permitted and expected (kept to free-tier providers). Offline-first is still mandatory and export/import still required as a belt-and-suspenders backup.

### Deferred to Phase 7

- Move `history_events` into a `Y.Array` and rebuild `AppState` as a derived view so concurrent offline edits merge granularly. Today the Yjs doc holds `AppState` as one JSON blob in a `Y.Map` entry, which is last-write-wins at the entry level — fine for one-user-at-a-time use, not for two-device simultaneous offline edits.
- Sync status indicator in the top bar (connected / offline / syncing…).

## [1.0.0] — 2026-04-23

Initial release. The full SpoonFedStudy "Slot Machine Habit System" methodology as an installable, offline-first PWA.

### Added

- **Core game loop.** Habit → draw clip → cash in → spin → claim reward.
- **Paperclip bag** with configurable composition (default: 6 colors × 10 regular + 1 gold = 61 clips). Draw without replacement; auto-refill on empty. Pure engine in `src/features/bag/bag.engine.ts` with 10k-draw distribution tests (±2% per SPEC §10).
- **Main reward wheel** with configurable probabilities (default 40/30/20/8/2). Gold-clip shortcut to instant Tier 3. Cash-in matrix (0 / 2-match / 3-match / gold) gates tier unlocks per SPEC §5.5.
- **Near-miss theater** — losing spins visually drift past a locked tier before settling (per DECISIONS.md D3 / PDF canon).
- **Bonus wheel** with 75% / 50% / 25% / FREE / EXTRA segments and authoritative 10-minute timer (persisted via `endTimestamp - Date.now()` so it survives app close, PWA backgrounding, and device sleep).
- **EXTRA chain** — re-spins loop up to 20 iterations until a non-EXTRA segment, spawning concurrent bonus timers as needed.
- **Five default habits**: Walk (per 2,500 steps), Workout (4 sets), Cleaning (20 min), Focused Work (30 min), Hygiene bundle (shower + brush teeth + wash face + in bed by configurable cutoff, default 01:00).
- **Hygiene bundle retroactive award** — clip issued on next app open after midnight if all four sub-items were completed before the cutoff.
- **Step entry** — batched clip-earning UI (e.g., 10,000 steps awards 4 clips in one tap).
- **Reward menus** — three tiers, CRUD + seeded defaults drawn from SPEC §6.2–§6.4. Reward-rules sidebar quotes the PDF's three rules (Highly Addicting / Time or Money Wasting / Naked Rule) verbatim.
- **Jar** with Mini / Mid / Moonshot milestones. Mini and Mid are tick-marks (no reset); claiming Moonshot resets the jar to $0 and prompts milestone re-edit (DECISIONS.md D1).
- **Streaks** — daily, per-habit, hygiene bundle, bonus chain. Day-boundary + cutoff logic is TZ-local and test-covered.
- **Activity feed** — last N history events, filterable.
- **Onboarding** — 5-screen first-run flow (welcome → mechanics → reward rules → milestones → install). Replayable for existing users by toggling `firstRunCompleted` in devtools.
- **Settings** — wheel probability editor (auto-normalizing), bag composition editor, hygiene cutoff, SFX/haptics toggles, export/import panel, reset-all (triple-confirm).
- **Durable persistence** — IndexedDB via `idb` v8, one `app_state` blob + append-only `history_events` store + 30-day `snapshots` store (gzipped via `CompressionStream`). Mutations commit within the 100 ms SLA per SPEC §8.1.
- **Boot rehydrate** — persisted state loaded before mount (`src/main.tsx`).
- **Export / import** — Zod-validated JSON envelope with duplicate-clip-ID sanity check; full-replace semantics on import, snapshots preserved as a rollback line.
- **PWA** — installable on iOS Safari via Add to Home Screen; service worker precaches 34 entries (~613 KiB); `registerType: 'prompt'` with user-controlled reload toast.
- **Accessibility** — 44 pt minimum tap targets, `aria-live` announcers on all clip-earn / spin / reward-claim events, `role="progressbar"` on the jar fill, focus-trapped dialogs, axe-core sweep clean on WCAG 2.1 AA (except dark-theme `color-contrast` — flagged as non-blocking v1.1 palette tuning in `AUDIT.md`).
- **Bundle** — initial load ~92 KB gz, worst-case full app ~170 KB gz, under the 250 KB gz budget per SPEC §4.
- **Testing** — 284 Vitest tests green (unit + component, seeded RNG + fake clock + fake-IndexedDB); Playwright smoke (onboarding → log → spin → reload persistence) + axe-core a11y sweep green.

### Known limitations / deferred to v1.1+

- **Color contrast** — dark-theme muted tokens fall below 4.5:1 AA on five routes. Non-blocking for v1; palette tuning deferred.
- **Multi-jar UI** — schema is multi-jar ready (every entity carries `jarId`), but v1 UI is single-jar only. v2 will add the jar-picker and per-stack prize ladders.
- **Work timer enforcement** — v1 ships the button-only completion path. v1.1 will add an opt-in enforced 30-min countdown (`workTimerOptIn` settings field already in the schema).
- **Mercy rule** — `wheelConfig.mercyChance` reserved in the schema (DECISIONS.md D5); v1 throws if non-zero. v1.1 will consume it.
- **WebKit E2E coverage** — Playwright runs chromium-mobile only. iOS Safari verification is deferred to the Phase 6 deployment smoke on a physical device.

### Methodology credit

Based on SpoonFedStudy's "Slot Machine Habit System" PDF and companion video. See `reference-methodology.txt` for the full source material.

[1.0.0]: https://github.com/gracekang/kakeguruimasho/releases/tag/v1.0.0
