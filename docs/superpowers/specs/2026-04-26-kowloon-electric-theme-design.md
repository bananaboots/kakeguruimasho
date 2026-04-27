# Kowloon Electric · theme design

> Date: 2026-04-26
> Status: design — pending implementation plan
> Design source: `/tmp/kowloon-design/kakeguruimasho/project/` —
> `themes.jsx` (token catalog), `kowloon-neon.jsx` (Triad Neon
> primitives), `kowloon-screens.jsx` (full bespoke flow),
> `Kakegurui Masho.html` section `03 · Kowloon Electric · Full Flow`.
> Chat transcript: `kakeguruimasho/chats/chat1.md` lines 736–1063.
> Backlog item: [BACKLOG.md:8](../../../BACKLOG.md) `## Themes ·
> Kowloon Walled City / Bladerunner`.

## Context

The app currently ships **one bespoke theme** — Vintage Pachinko, a
1962 Showa-era lacquer parlour aesthetic (lacquer red, gold leaf,
Cormorant + DM Serif, paper grain, halftone). Six other themes
(`house`, `riding`, `imperial`, `ukiyoe`, `celestial`, `speakeasy`)
are scaffolded as token-only stubs that re-skin the Pachinko chassis
via CSS variables.

The 2026-04-26 design refresh adds a **seventh theme — Kowloon
Electric — as the second bespoke flow**. Where Pachinko whispers,
Kowloon buzzes. The aesthetic: a 1985 Hong Kong arcade closet
hidden behind a noodle stall — ink-black night, hot-magenta and
ice-cyan neons, sodium-yellow signage, mahjong tiles in CRT bezels,
mosaic tile floors, tangled cable bundles, dot-matrix receipts.
Triad Neon palette (Palette A from the design canvas) was selected
in chat1.md:913 over the moodier "Rain & Receipt" alternative.

User direction (2026-04-26): ship the **entire bespoke flow** —
tokens, primitives, every screen — in a **single PR**, sequenced as
logical commits.

## Goals

- A seventh theme `kowloon` registered in `THEMES`, with full Triad
  Neon token map, Cantonese/Japanese serif fonts, and `mahjong`
  motif glyph. Status flips to `'ready'` when the bespoke flow lands.
- A bespoke Kowloon screen suite mirroring the Pachinko pass:
  `KowloonCover`, `KowloonHome`, `KowloonSpinCashIn`,
  `KowloonSpinWheel` (3-reel mahjong CRT cabinet), `KowloonReveal`
  (大獎 phosphor flash), `KowloonBonus` (10-min countdown CRT).
- A bespoke Kowloon primitives library (`NeonSign`, `CRTBezel`,
  `MahjongTile`, `ArcadeToken`, `Stamp`, `WireBundle`, `MosaicFloor`,
  `Scanlines`, `PixelSprite`).
- Theme-conditional JSX path that swaps Kowloon screens in for
  the Pachinko-flavored defaults when `theme === 'kowloon'` is
  active, leaving Pachinko code paths byte-identical to today.
- An overlay scanline treatment baked into every Kowloon surface
  (per chat1.md:913 — *"add a little bit of CRT lines for fun
  throughout the screens"*).
- Zero regression to Vintage Pachinko or any of the six stub themes.

## Non-goals

- New mechanics. Kowloon is a presentation re-skin; the underlying
  spin engine, jar state, bonus timers, habit data, and reward
  ledger are unchanged. Mahjong reels are a *visualization* of the
  same `wheel.engine.ts` outcomes.
- Animating the existing CRT-bezel curvature/phosphor effect with
  WebGL. Static SVG + CSS scanlines suffice for v1.
- Audio (arcade chimes, coin drops). Out of scope; the existing
  spin SFX module continues to drive sound. A future ticket can
  layer theme-specific SFX.
- Lazy-loading the Kowloon bundle. Premature; revisit if bundle
  size becomes a problem.
- Promoting any of the six other stub themes (`house`, `riding`,
  etc.) to bespoke. Each gets its own design pass later.
- Migrating the Pachinko-bespoke screens to the new
  theme-conditional pattern. They stay as the implicit default.
- Tablet-specific layout for Kowloon. Inherits the existing
  desktop chassis from the 2026-04-25 desktop adaptation pass.

## Architecture

### Theme-conditional JSX (the one new pattern)

The current app has zero theme-conditional render branches — the
Pachinko aesthetic is baked into the JSX (component names, class
names, ornament imports), and re-skinning happens entirely through
CSS variables. Kowloon needs a different *structural* presentation
(mahjong reels instead of pachinko balls, CRT bezel instead of
brass cabinet, neon signs instead of engraved lacquer plaques),
which CSS variables alone cannot deliver.

The introduced pattern is a **route-level theme guard**:

```tsx
// src/routes/Home.tsx
import { useTheme } from '../styles/theme-context.ts';
import { KowloonHome } from '../features/kowloon/index.ts';

export default function Home() {
  const { theme } = useTheme();
  if (theme === 'kowloon') return <KowloonHome />;
  // ...existing Pachinko-flavored JSX, byte-identical to today.
}
```

This is preferred over per-component branching (`{theme ===
'kowloon' ? <K/> : <P/>}` sprinkled throughout each route, which
would leak theme-awareness into ~15 components) and over a heavy
refactor that extracts the Pachinko code into a `<PachinkoHome>`
sibling. Both alternatives create churn in working code with no
upside; the route-level guard is purely additive.

The guard is the *only* code change to existing routes. Nothing
inside the existing branch is modified.

### One supplementary guard: the right rail's pot widget

[src/App.tsx:121](../../../src/App.tsx) wires `<PachinkoPotMini/>`
into `DesktopShell`'s right rail unconditionally. To prevent
Pachinko ornaments leaking into the Kowloon experience at desktop
sizes, a one-line conditional swaps it:

```tsx
// src/App.tsx (only line that touches existing code)
rail={{
  pot: theme === 'kowloon' ? <KowloonTokenTrayMini /> : <PachinkoPotMini />,
  // ...other rail slots unchanged
}}
```

### What stays purely token-driven

- All six other stub themes (`house`, `riding`, `imperial`,
  `ukiyoe`, `celestial`, `speakeasy`) keep re-skinning through CSS
  variables alone — they get no JSX branch and no bespoke files.
  This spec does not touch them.
- The desktop chassis (`DesktopShell`, `LeftRail`, `RightRail`)
  stays theme-agnostic; only the rail widget *content* changes via
  the App.tsx guard above.
- The state store, spin engine, bonus machine, jar visual logic,
  habit data — all theme-agnostic. Kowloon screens consume the
  same selectors and dispatch the same actions.

### File layout

```
src/
├── styles/
│   ├── themes.ts                  ← MODIFIED: add 'kowloon' to ThemeKey,
│   │                                'mahjong' to MotifSymbol, THEMES.kowloon entry
│   └── themes.css                 ← MODIFIED: add [data-theme='kowloon'] block
├── ui/
│   ├── parlour/
│   │   └── Motif.tsx              ← MODIFIED: add case 'mahjong'
│   └── kowloon/                   ← NEW DIR
│       ├── NeonSign.tsx           ← NEW
│       ├── CRTBezel.tsx           ← NEW
│       ├── Scanlines.tsx          ← NEW (page-level overlay)
│       ├── MahjongTile.tsx        ← NEW
│       ├── ArcadeToken.tsx        ← NEW (Kowloon equivalent of <Chip>)
│       ├── Stamp.tsx              ← NEW (rotated inspection stamps)
│       ├── WireBundle.tsx         ← NEW (cable divider SVG)
│       ├── MosaicFloor.tsx        ← NEW (tiled cabinet base)
│       ├── PixelSprite.tsx        ← NEW (16×16 sprite renderer)
│       ├── kowloon.css            ← NEW (primitive-scoped styles)
│       ├── index.ts               ← NEW (barrel export)
│       └── __tests__/             ← NEW (RTL snapshot/render tests)
├── features/
│   └── kowloon/                   ← NEW DIR
│       ├── KowloonShell.tsx       ← NEW (frame + scanlines + wires + mosaic)
│       ├── KowloonHome.tsx        ← NEW
│       ├── KowloonSpinCashIn.tsx  ← NEW
│       ├── KowloonSpinWheel.tsx   ← NEW (3-reel mahjong cabinet)
│       ├── KowloonReveal.tsx      ← NEW (大獎 phosphor flash)
│       ├── KowloonBonus.tsx       ← NEW (10-min countdown CRT)
│       ├── KowloonCover.tsx       ← NEW (used by Settings theme picker)
│       ├── KowloonTokenTrayMini.tsx ← NEW (right-rail Pot replacement)
│       ├── KowloonStreak.tsx      ← NEW (neon streak ribbon)
│       ├── kowloon-screens.css    ← NEW (screen-scoped styles)
│       ├── index.ts               ← NEW (barrel export)
│       └── __tests__/             ← NEW (smoke tests per screen)
├── routes/
│   ├── Home.tsx                   ← MODIFIED: 3-line guard at top
│   ├── SpinFlow.tsx               ← MODIFIED: 3-line guard
│   ├── Jar.tsx                    ← MODIFIED: 3-line guard
│   ├── Habits.tsx                 ← MODIFIED: 3-line guard
│   ├── Rewards.tsx                ← MODIFIED: 3-line guard
│   ├── Settings.tsx               ← MODIFIED: 3-line guard
│   └── BonusTimerDetail.tsx       ← MODIFIED: 3-line guard
├── App.tsx                        ← MODIFIED: 1-line conditional on rail.pot
└── main.tsx                       ← UNCHANGED
e2e/
└── kowloon.spec.ts                ← NEW (theme-flip end-to-end coverage)
index.html                         ← MODIFIED: append HK + Mincho fonts
BACKLOG.md                         ← MODIFIED: tick Kowloon items
CHANGELOG.md                       ← MODIFIED: entry per existing convention
```

## Visual language

### Triad Neon palette (verbatim from `themes.jsx`)

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#0b0a14` | Midnight ink (page background) |
| `--color-bg-grad` | three-stop radial: magenta@18%/0%, cyan@90%/100%, lilac@50%/50% on `#0b0a14` | Dopamine-glow gradient |
| `--color-felt` | `#1f1c33` | Velvet purple (cabinet base) |
| `--color-felt-deep` | `#161423` | Closet shadow |
| `--color-surface` | `#191628` | Card base |
| `--color-surface-2` | `#231e3a` | Raised surface |
| `--color-surface-3` | `#2c2547` | Highest tier (derived: +5% L from surface-2, matching Pachinko's surface-2→3 step) |
| `--color-border` | `rgba(245, 213, 71, 0.20)` | Hairline (gold) |
| `--color-border-strong` | `rgba(245, 213, 71, 0.45)` | Frame (gold) |
| `--color-ink` | `#f0e8d4` | Tea cream (body) |
| `--color-ink-muted` | `#9c907a` | Smoke |
| `--color-ink-faint` | `#5a5340` | Soot |
| `--color-gold` | `#f5d547` | Sodium-yellow signage |
| `--color-gold-deep` | `#c9a82a` | Tarnish |
| `--color-gold-glow` | `rgba(245, 213, 71, 0.55)` | Gold halo |
| `--color-accent` | `#ff2e88` | Hot magenta neon (primary CTA) |
| `--color-accent-hover` | `#ff4a9a` | Lightened (+5% L) for hover |
| `--color-accent-pressed` | `#d61f6f` | Darkened (-8% L) for pressed |
| `--color-accent-contrast` | `#06050a` | Ink-black on accent |
| `--kowloon-cyan` | `#22e3ff` | Ice neon (secondary) |
| `--kowloon-jade` | `#1bd182` | Acid jade (tertiary) |
| `--kowloon-lilac` | `#c855ff` | Electric purple (quaternary) |
| `--color-win` | `#22e3ff` | Cyan win (was gold in Pachinko) |
| `--color-near-miss` | `#ff2e88` | Magenta near-miss |
| `--clip-red` | `#ff3a3a` | T1 token color |
| `--clip-blue` | `#22e3ff` | T2 token color |
| `--clip-green` | `#1bd182` | T3 token color |
| `--clip-yellow` | `#f5d547` | Bonus token |
| `--clip-purple` | `#c855ff` | Jackpot token |
| `--clip-pink` | `#ff2e88` | Special token |

All values are concrete hex (no runtime color math). The derived
shades (`surface-3`, `accent-hover`, `accent-pressed`) were
computed by mirroring Pachinko's L-step ratios.

### Typography

| CSS variable | Stack | Usage |
|---|---|---|
| `--font-display` | `'DM Serif Display', 'Cormorant Garamond', Georgia, serif` | Inherited from base, unchanged |
| `--font-body` | `'Cormorant Garamond', 'DM Serif Text', Georgia, serif` | Body italic for editorial flourishes |
| `--font-mono` | `'VT323', 'Courier Prime', ui-monospace, monospace` | Pixel-style labels, receipts |
| `--font-hk` *(new)* | `'Noto Serif HK', 'Shippori Mincho', serif` | Cantonese/Japanese vertical signage |
| `--font-pixel` *(new alias of mono)* | `'VT323', monospace` | CRT-screen typography |

`--font-hk` is the only new font variable. It's added to the
`[data-theme='kowloon']` block only — base tokens stay untouched.

`Noto Serif HK` and `Shippori Mincho` are added to the existing
Google Fonts URL in [index.html:16](../../../index.html). The full
amended URL appends:
`&family=Noto+Serif+HK:wght@400;600;700&family=Shippori+Mincho:wght@400;500;700`.

### Motif

A new `MotifSymbol` literal — `'mahjong'` — is added to the union
in [src/styles/themes.ts:28](../../../src/styles/themes.ts:28). The
[Motif.tsx](../../../src/ui/parlour/Motif.tsx) switch gains a new
`case 'mahjong'` returning a stylized 60×60 SVG: a hatched
Cantonese tile (中 — center / red dragon) with sodium-yellow glow.
The existing `default → 'fleur'` case is unchanged; Pachinko's
`'paclilly'` case is unchanged.

### Copy strings (verbatim from `THEMES.kowloon`)

| Field | Value |
|---|---|
| `name` | `Kowloon Electric` |
| `tagline` | `九龍電氣 · Triad Neon, 1985` |
| `copy.spinCta` | `Drop the Coin` |
| `copy.earned` | `Banked` |
| `copy.hand` | `Token Tray` |
| `copy.bag` | `Cassette` |
| `copy.jackpot` | `大獎 · Daai-Jeung` |
| `copy.nearMiss` | `One slot off` |
| `symbol` | `'mahjong'` |
| `status` | `'ready'` (after the full flow lands; `'stub'` between commits 1 and 7) |

## Per-screen design

Each Kowloon screen consumes the same data hooks as the Pachinko
equivalent. Differences below describe presentation only.

### KowloonHome

- **Header**: vertical Cantonese `九龍電氣` neon sign at top-left,
  `KOWLOON ELECTRIC` horizontal English wordmark with magenta glow.
- **Streak ribbon**: replaces `<PachinkoStreak>`. Renders as a thin
  cyan-glow LED bar with the streak count in `--font-pixel`.
- **Ritual cards**: each habit logs as an `ArcadeToken` (instead of
  a chip). Today's earned tokens cluster as a `KTokenPile` (existing
  hand-tray data, new visual).
- **Pot snippet**: condensed `KowloonTokenTrayMini` showing today's
  bank in the same `--font-pixel` style as the right-rail pot.
- **Activity feed**: dot-matrix receipt strip rendering recent
  events. Same `<ActivityFeed>` selector — the row component is
  swapped to `KowloonReceiptRow`. Implementation note: feed is
  consumed unchanged; `KowloonHome` wraps it in a styled container.
- **Background**: page-level `<Scanlines>` overlay at 5% opacity,
  three-stop radial-glow gradient on the body.

### KowloonSpinCashIn ("Drop the Coin")

- **Cabinet header**: `<NeonSign>` reading `賭 · STAKE · CABINET 7`
  in magenta.
- **Stake selector**: rotates the existing T1/T2/T3 picker into a
  horizontal token-denomination selector — five `<ArcadeToken>`s
  with denominations I / II / III / B / ★ in five neon colors.
- **CTA**: `--color-accent` magenta button with the tagline copy
  `Drop the Coin`. Pixel font for the label.
- **Odds rail**: re-uses the existing `RailStakeAndOdds` data; the
  inline row renders five glyphs (一 / 二 / 三 / 副 / ★) in the
  matching neon colors with `--font-hk`.

### KowloonSpinWheel (the cabinet)

- **CRT bezel** wraps the wheel area. `<CRTBezel>` renders a
  phosphor-glow inner cavity with curvature vignette and scanlines.
- **Three-reel mahjong cabinet**: instead of a circular wheel, the
  reveal animation rolls **three vertical reels of mahjong tiles**
  driven by the same `wheel.engine.ts` outcome. The center reel
  pre-determines the tier (per existing engine logic); the side
  reels animate alignment. A single horizontal magenta payline
  glows when the result resolves.
- **Lever**: a coin-slot lever SVG replaces `<SpinButton>`'s brass
  paddle. The button text reads `Drop the Coin · 投幣`.
- **CH 03 · LIVE tally**: small magenta phosphor dot + monospace
  channel label in the bezel's top-right.
- **Reels animation**: deferred to commit 5; commit 4 ships a
  static placeholder showing the resolved tile triplet.

### KowloonReveal (`大獎`)

- The reveal stage stays a CRT bezel. On a winning outcome,
  vertically stacked sodium-yellow kanji `大 / 獎` flash in the
  phosphor screen with gold-glow text-shadow.
- Tier label below in pixel font (e.g. `JACKPOT · TIER ★`).
- Confetti is replaced by a magenta + cyan + jade pixel-burst —
  16×16 sprite particles on a black background.

### KowloonBonus (10-min countdown)

- The bonus timer becomes a magenta digital countdown
  (`--font-pixel`) inside a CRT bezel. `06:42` style format.
- Discount-habit picker: a 2-up grid of mahjong tile buttons.
- The bonus wheel itself is restyled in triad colors (no
  geometry change — the existing `BonusWheelCanvas` consumes
  CSS variables already; only token swaps).

### KowloonCover

- Used by the Settings theme picker as the kowloon "cover art."
  Renders the cinematic header: vertical Cantonese sign, English
  wordmark, mosaic floor strip at bottom, tangled wires across
  the top, four corner inspection stamps.
- Also referenced by `KowloonShell` as the boot/empty state.

### KowloonShell

- Page-level wrapper used by every Kowloon screen. Provides:
  - Page background (radial gradient + `--color-bg`)
  - Page-level `<Scanlines>` overlay at 5%
  - Hairline frame inset 16px (`--color-border`)
  - Bottom 22% mosaic floor strip
  - Top tangled-wires divider via `<WireBundle>`
- Children render at z-index 2 above the overlays.

## Pachinko safety

The audit performed before this spec
([2026-04-26-kowloon-electric-theme-design.md] context)
confirmed:

- **No exhaustive `switch (theme)` exists.** The only theme-related
  switch is in [Motif.tsx:42](../../../src/ui/parlour/Motif.tsx:42)
  over `MotifSymbol`, has a `default` case, and adding a new symbol
  is purely additive.
- **Pachinko has its own explicit `[data-theme='pachinko']` block**
  ([themes.css:75](../../../src/styles/themes.css:75)) duplicating
  the `:root` defaults. The new `[data-theme='kowloon']` block
  cannot affect Pachinko's cascade.
- **Theme persistence is hardened**
  ([theme-provider.tsx:30](../../../src/styles/theme-provider.tsx:30)):
  `isThemeKey()` rejects unknown values and falls back to Pachinko.
- **No tests assert on `data-theme`, font lists, or THEMES shape.**
  The three e2e specs (`a11y`, `smoke`, `desktop-chassis`) check
  unrelated invariants.
- **No Pachinko-locked shell.** [App.tsx:116](../../../src/App.tsx)
  wraps routes in a generic `DesktopShell`.
- **Routes have no conditional render logic to preserve.** Every
  affected route is a clean function whose top can be prefixed with
  the 3-line guard.
- **`status` field is dead metadata** — no consumers, so flipping
  kowloon between `'stub'` and `'ready'` is cosmetic.

The two unconditional Pachinko-bespoke imports
(`PachinkoStreak` in Home, `PachinkoPotMini` in App's right rail)
are addressed by the route guard and the App.tsx 1-line
conditional respectively.

### Verification gates (required, per-commit)

Before each commit lands:

1. `npm run typecheck` — no errors.
2. `npm run lint` — no errors.
3. `npm test` — all unit tests pass.
4. `npm run test:e2e` — all e2e tests pass with `theme=pachinko` (CI default).
5. Manual: load the app, confirm Pachinko renders byte-identically
   to the pre-commit screenshot baseline.

Before the final commit (status flip to `'ready'`):

6. Manual full-flow walkthrough at `theme=kowloon`: Home → log a
   habit → cash in → spin → reveal → bonus → vault → onboarding
   replay → settings.
7. Manual flip-back: `theme=kowloon` → `theme=pachinko`. Confirm
   masthead, streak, pot, all ornaments return to lacquer-red
   pachinko aesthetic.
8. Cross-browser smoke: Chromium + WebKit (existing Playwright
   project matrix already covers both).

## Testing

### Unit tests

- One render test per primitive in `src/ui/kowloon/__tests__/`
  asserting the component renders without throwing and applies
  expected ARIA where relevant (e.g. `<Stamp>` is `aria-hidden`,
  `<NeonSign>` exposes the English text as accessible name).
- Snapshot tests for the static primitives (`MahjongTile`,
  `ArcadeToken`, `Scanlines`) so visual regressions surface in
  PR diffs.

### Smoke tests per screen

- `src/features/kowloon/__tests__/KowloonHome.test.tsx` — renders
  with mocked store, asserts no console errors.
- One per Kowloon screen, same shape.

### End-to-end

- `e2e/kowloon.spec.ts`:
  1. Boot at default theme. Assert masthead reads `Mashō Salon`.
  2. Open Settings → flip to Kowloon. Assert `[data-theme]` is
     `kowloon` and the kowloon NeonSign is visible on Home.
  3. Walk the spin flow (cash-in → drop coin → reveal). Assert
     the CRT bezel is mounted at each step.
  4. Open Bonus. Assert magenta countdown is rendered.
  5. Flip back to Pachinko. Assert masthead returns; assert the
     Kowloon NeonSign element is no longer mounted.

### Accessibility

The existing `e2e/a11y.spec.ts` is parametrized by route. Extend
it (or add a sibling spec) to repeat the same WCAG 2.1 AA checks
with `theme=kowloon`. The ink/cream contrast ratio on Triad Neon
backgrounds is the highest-risk pair to check (cream on midnight
tests at ~13:1, well above AA).

## Commit sequence (single PR)

Every commit ships with its tests, builds cleanly, and leaves the
app in a usable state. CI is green throughout because the theme
guards are unreachable from CI's default theme.

1. **`feat(themes): register kowloon + Triad Neon tokens`**
   - `src/styles/themes.ts`: add `'kowloon'` to `ThemeKey`,
     `'mahjong'` to `MotifSymbol`, full `THEMES.kowloon` entry,
     `status: 'stub'`.
   - `src/styles/themes.css`: append `[data-theme='kowloon']`
     block with full token map.
   - `src/ui/parlour/Motif.tsx`: add `case 'mahjong'`.
   - `index.html`: append `Noto+Serif+HK` + `Shippori+Mincho` to
     Google Fonts URL.
   - Tests: extend Motif.test to render the mahjong symbol.
   - Result: theme is pickable in Settings; renders pachinko-shaped
     JSX with Triad Neon tokens. Acceptable interim state.

2. **`feat(kowloon): core overlay primitives (NeonSign, CRTBezel, Scanlines)`**
   - Files: `src/ui/kowloon/NeonSign.tsx`, `CRTBezel.tsx`,
     `Scanlines.tsx`, `kowloon.css`, `index.ts`,
     `__tests__/*.test.tsx`.
   - Not yet imported anywhere. Pure visual primitives.

3. **`feat(kowloon): physical primitives (MahjongTile, ArcadeToken, Stamp, WireBundle, MosaicFloor, PixelSprite)`**
   - Files: the remaining 6 primitive files + tests.
   - `index.ts` barrel updated.

4. **`feat(kowloon): KowloonShell + KowloonHome behind theme guard`**
   - `src/features/kowloon/KowloonShell.tsx`,
     `KowloonHome.tsx`, `KowloonStreak.tsx`,
     `KowloonTokenTrayMini.tsx`, `kowloon-screens.css`,
     `index.ts`, `__tests__/`.
   - `src/routes/Home.tsx`: add 3-line guard.
   - `src/App.tsx`: add 1-line `rail.pot` conditional.
   - First user-visible Kowloon screen.

5. **`feat(kowloon): SpinCashIn + SpinWheel (mahjong CRT cabinet)`**
   - `src/features/kowloon/KowloonSpinCashIn.tsx`,
     `KowloonSpinWheel.tsx` (with mahjong-reel animation
     consuming `wheel.engine.ts` outcomes).
   - `src/routes/SpinFlow.tsx`: add 3-line guard.
   - The dopamine spine ships.

6. **`feat(kowloon): Reveal + Bonus`**
   - `src/features/kowloon/KowloonReveal.tsx`,
     `KowloonBonus.tsx`.
   - `src/routes/BonusTimerDetail.tsx`: add 3-line guard.
   - Reveal is rendered by `RevealStage`/`PostSpinFlow` inside
     the SpinFlow guard from commit 5; this commit polishes the
     stage and adds the bonus screen.

7. **`feat(kowloon): Cover + supporting screens (Jar/Habits/Rewards/Settings)`**
   - `src/features/kowloon/KowloonCover.tsx`.
   - Light Kowloon-tinted treatment for Jar, Habits, Rewards,
     Settings (mostly token-driven; some swap to neon-styled
     section headers).
   - Guards added to remaining routes.
   - `THEMES.kowloon.status` flipped to `'ready'`.
   - `e2e/kowloon.spec.ts` added.

8. **`docs: tick Kowloon BACKLOG items + CHANGELOG entry`**
   - `BACKLOG.md`: tick all 3 boxes under
     `### Kowloon Walled City / Bladerunner`, move section to a
     "Shipped" subsection.
   - `CHANGELOG.md`: entry per the existing convention (cf. the
     Pachinko entry from 2026-04-25).

## Open questions

None blocking implementation. Two minor items the implementer
will confirm in the plan:

- **Mahjong reel symbols**: the design canvas shows East/South/
  West (一/二/三) for the dial labels and 中/發/白 (center/
  fortune/white) for the tile faces. Implementer chooses the
  exact mapping to wheel-engine outcomes based on visual rhythm.
- **Right-rail Pot at desktop**: `KowloonTokenTrayMini` is a new
  component with no Pachinko equivalent in shape. The plan should
  reference [PachinkoPotMini.tsx](../../../src/features/jar/PachinkoPotMini.tsx)
  for size/data hooks but the visuals are bespoke (token tray
  instead of koi-flanked jar).

## Out of scope, but earmarked

- Theme-specific SFX (arcade chimes, coin drops, CRT power-on).
- Animated CRT power-on transition when flipping themes.
- A "Kowloon → Pachinko" theme cross-fade animation.
- Jam-packed easter eggs (e.g. tapping the CRT bezel five times
  shows a hidden 中 tile).

These can each ship as standalone follow-ups.
