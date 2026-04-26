# Desktop adaptation · design

> Date: 2026-04-26
> Status: design — pending implementation plan
> Design source: `/tmp/design-fresh/kakeguruimasho/project/desktop-wires.jsx`,
> section `02a · Desktop Adaptation` in `Kakegurui Masho.html`.

## Context

The app is mobile-only today. [shell.css](../../../src/shell.css) caps every
route at `max-width: 720px`; there are no `@media (min-width)` rules in
`src/`. The 2026-04-25 design refresh introduced a desktop adaptation
section: a one-pager rules card plus two reference wireframes
(`DesktopSalon` at 1440×900, `DesktopSpin` at 1440×900). The rules are
explicit; the wireframes are recipes Claude Code follows for the rest of
the screens.

User direction: ship the **whole thing** in one cycle — chassis, every
per-screen pass, cash-in drawer, hover states, and a cinematic Onboarding
shell.

## Goals

- A three-pane salon chassis (left rail · center stage · right rail) at
  `≥1024px` viewports.
- Every existing route renders correctly at desktop sizes — content
  reflows for list-style screens, layouts swap for Spin and Jar.
- Cash-in picker (and analogous editors) become right-slide drawers at
  desktop while staying as bottom sheets on mobile.
- Hover/focus affordances on every interactive element at desktop.
- Onboarding gets a cinematic two-column treatment at desktop —
  centered card on a salon-entrance backdrop.
- Mobile UX (≤1023px) is unchanged. Zero behavior or visual diff.

## Non-goals

- Tablet two-pane layout (480–1024px range). Today's mobile shell stays
  in that range. Can be layered in later if user research shows it.
- Visual regression tooling (pixel-diff). v1.1 concern.
- Settings layout pass. Stays single-column at desktop for v1.
- Keyboard-shortcut affordances surfaced visually (e.g. "press / to
  search"). Out of scope.

## Architecture

The chassis is **purely CSS-driven**. A small `useIsDesktop()` hook
covers the 2-3 places where JSX must branch (mounting
`BonusTimerBanner` at mobile only; picking drawer vs sheet for
`Drawer`; per-route layout swaps for Spin and Jar).

```
App.tsx (shell)
├── BonusTimerBanner       — mounted only at <1024px
├── DesktopShell (NEW)     — grid container, no-op below 1024px
│   ├── LeftRail (NEW)     — house mark + nav + streak meter, ≥1024 only
│   ├── <main>             — active route renders here, unchanged today
│   └── RightRail (NEW)    — Pot + Bonus + Recent Pulls, ≥1024 only
└── BottomNav              — visible <1024px, hidden ≥1024 (LeftRail takes over)
```

### Breakpoints

| Range | Layout |
|---|---|
| `≤1023px` (phone + tablet today) | Mobile shell unchanged |
| `1024–1439px` (desktop) | Three-pane chassis, full-bleed |
| `≥1440px` (salon) | Three-pane chassis, content max 1280, centered |

The salon range produces a chassis grid of `280 + 1fr + 320 = 1280`
fitting flush at exactly 1440 viewport, with the center pane capping
at 680px usable width. Rails sit at viewport edges.

## Components and files

### New files

| File | Purpose |
|---|---|
| `src/ui/parlour/DesktopShell.tsx` | Three-pane CSS-grid wrapper. Always renders children + rails; CSS hides rails at `<1024px`. |
| `src/ui/parlour/LeftRail.tsx` | House mark (賭狂魔笙 + Mashō Salon), nav (5 items from `navItems.ts`), streak meter at footer. |
| `src/ui/parlour/RightRail.tsx` | Stacked Pot (`PachinkoPotMini`), Bonus timer (lifted from `BonusTimerBanner`), Recent Pulls. |
| `src/ui/parlour/RecentPulls.tsx` | Last 5 spins as a vertical list (chip + tier + timestamp). Reads existing spin history selectors. |
| `src/ui/parlour/CinematicShell.tsx` | Onboarding desktop wrapper. No-op `<1024px`; full-bleed felt + four-corner ornate motifs + centered framed card at `≥1024px`. |
| `src/ui/Drawer.tsx` | Primitive: bottom-sheet at mobile, 480px right-slide drawer at desktop. Built on `Dialog` (same a11y guarantees). |
| `src/styles/desktop.css` | Chassis grid + breakpoints + content max-width. Imported once by `globals.css`. |
| `src/lib/useIsDesktop.ts` | `matchMedia('(min-width: 1024px)')` hook. |
| `src/lib/navItems.ts` | Single source of truth for nav config (label, icon, route). Consumed by `BottomNav` and `LeftRail`. |

### Modified files

- `src/App.tsx` — wrap `<main>` in `<DesktopShell>`; gate `<BonusTimerBanner>` mount on `!isDesktop`.
- `src/BottomNav.tsx` — hidden via CSS at `≥1024px`; consume `navItems.ts`.
- `src/shell.css` — drop or scope the `max-width: 720px` cap to `<1024px`.
- `src/routes/Home.tsx` — desktop CSS reflows rituals list to 3-col grid; hero masthead spans full center pane.
- `src/routes/Habits.tsx` — 3-col grid of `RitualCard`s at desktop, ~360px each.
- `src/routes/Rewards.tsx` — 3 tier columns side-by-side at desktop.
- `src/routes/History.tsx` — same single-column timeline, more horizontal padding at desktop.
- `src/routes/Settings.tsx` — single-column, unchanged for v1.
- `src/routes/Jar.tsx` — JarVisual on left, history/streak on right at desktop (JSX-conditional).
- `src/routes/BonusTimerDetail.tsx` — hourglass + countdown left, ritual picker grid right at desktop.
- `src/routes/Onboarding.tsx` — wrap render in `<CinematicShell>`.
- `src/routes/SpinFlow.tsx` (and `/spin`, `/spin/pull`, `/spin/reveal` content) — JSX-conditional layout for tier-ladder placement, wheel/lever placement, stake summary in right rail.
- `src/features/spin/CashInPicker.tsx` — `Dialog` → `Drawer`.
- `src/features/jar/MilestoneEditor.tsx` — `Dialog` → `Drawer`.
- `src/features/rewards/RewardEditor.tsx` — `Dialog` → `Drawer`.
- `src/ui/parlour/*.css` (BrassButton, RitualCard, Chip, OrnateFrame, etc.) — add `@media (hover: hover) and (min-width: 1024px)` `:hover` rules.

## Per-screen passes

### CSS-reflow only

- **Home / Salon** — rituals list 1-col → 3-col grid; "Tonight's Self Care" and PachinkoPotMini sit alongside on a row at desktop instead of stacked. Hero masthead spans full center pane.
- **Habits / Rituals** — 3-col grid of `RitualCard`s. Cards stay ~360px wide so each tile reads identically to mobile.
- **Vault / Rewards** — 3 tier columns side-by-side at desktop. Tier rows underneath each header.
- **History** — keep single-column timeline, just give it more horizontal padding (chronology read).
- **Settings** — unchanged single-column.

### JSX-conditional

- **Spin / Cash-in (`/spin`)** — tier ladder inline beside hand tray; cash-in picker becomes drawer on CTA, not modal. Stake summary moves to right rail.
- **Spin / Pull (`/spin/pull`)** — wheel scales to ~420px; lever beside the wheel (not below). Odds + stake line move to right rail.
- **Spin / Reveal (`/spin/reveal`)** — rays + confetti fill full center pane; reward picker stays inline below the chrysanthemum.
- **Jar** — JarVisual at ~480px on left, Pot history/streak meter on right.
- **BonusTimerDetail** — hourglass + countdown left, ritual picker grid right.

### Reused at any size

Every parlour primitive — `Chip`, `BrassButton`, `OrnateFrame`,
`RitualCard`, `JarVisual`, `PachinkoWheel`, `Chrysanthemum`,
`SectionTitle`, `Halftone`, `PaperGrain`. Per the rules card, all already
render at any size; pass a larger `size` prop where it makes sense.

## Cash-in drawer

`Drawer` primitive (`src/ui/Drawer.tsx`) built on the existing `Dialog`
primitive — same focus-trap, ESC, backdrop click, `aria-labelledby`.

| Mode | Anchor | Width | Use |
|---|---|---|---|
| `bottom-sheet` | `bottom: 0` | full width | mobile |
| `right-drawer` | `right: 0` | 480px | desktop |

Mode picked automatically via `useIsDesktop()`; no API change for callers.
CSS transforms + `prefers-reduced-motion` (existing pattern) for slide-in.

Call sites swapped: `CashInPicker`, `MilestoneEditor`, `RewardEditor`.
Centered acknowledgement modals (`PwaUpdatePrompt`, confirm dialogs) stay
as `Dialog`.

## Hover states

Single shared CSS predicate: `@media (hover: hover) and (min-width: 1024px)`.
Touch devices and mobile viewports never see the rules.

| Primitive | Hover treatment |
|---|---|
| `BrassButton` (primary) | Brighter gold gradient (`--gold` → `--win`), 2px outer glow, 1px lift |
| `BrassButton` (ghost) | Border opacity 0.32 → 0.6, gold ink |
| `RitualCard` | Border 0.28 → 0.55, faint gold inner shadow, "+" icon scale 1.0 → 1.06 |
| `Chip` | 1px lift, drop-shadow strengthens, cursor `pointer` |
| Nav items (LeftRail + BottomNav at desktop) | Background fades to `--surface-raised`, gold left-edge bar |
| Lever knob | Cursor `grab` (active `grabbing`) |
| Tier rows in Vault | Border lifts, "+ Add to Tier N" dashed row brightens |

Rules added in the relevant component CSS files; no new global stylesheet
for hover.

## Cinematic Onboarding shell

At `≥1024px`, `Onboarding` is wrapped in `<CinematicShell>`:

- Full-bleed dark felt + paper grain background covers the whole viewport.
- Four-corner `OrnateFrame` motifs at viewport corners (proscenium feel).
- Centered framed card at `max-width: 540px`, vertically centered.
- Existing onboarding step content renders unchanged inside the card.
- Final-step "I Swear to the House" CTA gets a slow brass shimmer
  animation (respects `prefers-reduced-motion`).
- Velvet swag SVG along top edge of viewport (~2KB asset).

At `<1024px`, `<CinematicShell>` is a no-op; existing full-screen
onboarding renders unchanged.

## Testing

### Unit / component (Vitest)

- `useIsDesktop()` — mocks `matchMedia`, asserts boolean flips on
  viewport change.
- `Drawer` — same suite as `Dialog` (focus trap, ESC, backdrop click)
  parameterized for both modes.
- `CinematicShell` — renders children unchanged at narrow viewport;
  renders backdrop chrome at wide viewport.

### Playwright e2e

- Add a `desktop-chromium` project to [playwright.config.ts](../../../playwright.config.ts)
  at `1440×900` viewport. Existing mobile project unchanged.
- The full mobile suite re-runs under desktop project — catches layout
  regressions.
- New `e2e/desktop-chassis.spec.ts` — asserts:
  - Left rail visible, bottom nav hidden at `≥1024px`.
  - Right rail visible at `≥1024px`.
  - Cash-in `Drawer` slides in from the right.
  - Wheel renders ~420px on `/spin/pull`.
  - Onboarding wrapped in cinematic shell.

### A11y

Existing axe-core sweep reruns under desktop viewport. Color-contrast
is already on AUDIT.md non-blocking list — net-new nodes get added
there if they appear.

### Manual QA

Before merge, click every route at three widths (390 / 1024 / 1440)
on the running vite server. Report a punch list of any visual
misalignments as a follow-up commit.

## Risks and trade-offs

- **`BonusTimerBanner` lifecycle** — currently mounted in `App.tsx` and
  rendered sticky. Lifting its content into `RightRail` means careful
  factoring so the timer logic (state subscription, expire check) lives
  in one place and both surfaces consume it. Plan: extract a
  `useBonusTimerBanner()` hook; both `BonusTimerBanner` and `RightRail`'s
  bonus widget consume it.
- **`BottomNav` vs `LeftRail` source-of-truth** — both must show
  identical items in identical order. Mitigated by `navItems.ts`. Bug
  risk if a future contributor edits one site without the other.
- **`shell.css` `max-width: 720px`** — dropping or rescoping this
  affects the first paint. Need to verify mobile pages don't get
  unexpectedly wider on tablet sizes (480–1023px) since today's tablet
  uses the same mobile shell. Plan: scope `max-width: 720px` to the
  `<1024px` range explicitly via a media query, not delete it.
- **Velvet swag SVG** — bespoke art for a screen most users see once.
  Defaulting to "include it"; cuttable in 5 lines if you want to skip.
- **Vite HMR on layout swap** — switching between mobile and desktop
  viewports during dev should hot-reload cleanly. `useIsDesktop()` uses
  `matchMedia` so the React state updates on viewport change without a
  page reload.

## Implementation sequencing

The plan should land roughly in this order to keep each step
independently mergeable and verifiable:

1. **Foundations** — `useIsDesktop()`, `navItems.ts`, `desktop.css`,
   breakpoint scoping in `shell.css`.
2. **Chassis shell** — `DesktopShell`, `LeftRail`, `RightRail` (with
   placeholder content), `BottomNav` hidden at desktop. Verify routes
   render in the center pane at 1440px.
3. **Right-rail widgets** — Pot, Bonus (lifted from
   `BonusTimerBanner`), `RecentPulls`. Verify timer behavior unchanged.
4. **`Drawer` primitive** — swap `CashInPicker`, `MilestoneEditor`,
   `RewardEditor`. Verify mobile behavior unchanged.
5. **Per-screen passes** — Home, Habits, Vault (CSS-reflow); then Jar,
   Spin sub-routes, BonusTimerDetail (JSX-conditional).
6. **Cinematic Onboarding** — `CinematicShell` + wrap.
7. **Hover states** — across primitives.
8. **Tests** — Playwright `desktop-chromium` project; new
   `desktop-chassis.spec.ts`; component test additions.
9. **Manual QA pass + punch list.**

## Definition of done

- Every route renders correctly at 390 / 1024 / 1440 viewports.
- Mobile e2e suite passes; new desktop e2e suite passes; a11y sweep
  green.
- Bundle size budget held — no net-new heavy deps; CSS is small (<3KB
  gz expected for `desktop.css` + per-component hover rules).
- BACKLOG.md "Desktop adaptation" section items checked off.
- CHANGELOG.md entry summarizing the chassis + per-screen passes.
