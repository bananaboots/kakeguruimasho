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
tokens, primitives, every variant — in a **single PR**, sequenced
as logical commits. Architecture: extend the strictly-typed theme
catalog with a `visual` profile, and use thin dispatcher components
(consuming the existing `useTheme()` hook) to swap between Pachinko
and Kowloon presentations of ~7 slots that genuinely look different.
Everything else stays purely token-driven.

## Goals

- A seventh theme `kowloon` registered in `THEMES`, with full Triad
  Neon token map, Cantonese/Japanese serif fonts, `mahjong` motif
  glyph, and an explicit `visual` profile. Status flips to
  `'ready'` once the bespoke flow lands.
- A new strictly-typed `ThemeVisual` interface on `ThemeMeta`,
  carrying ~7 variant keys (`streak`, `potMini`, `chip`, `spin`,
  `cover`, `overlay`, `masthead`). Each key is a literal union;
  TS-strict + `noFallthroughCasesInSwitch` enforces exhaustive
  dispatch.
- Thin dispatcher components that read `themeMeta.visual.<slot>`
  and pick a variant. Default fallbacks select the Pachinko
  variant, so the six stub themes (which leave `visual`
  undefined) behave exactly as today.
- Bespoke Kowloon variant components: `KowloonMasthead`,
  `KowloonStreak`, `KowloonPotMini`, `KowloonCover`, plus a
  `MahjongReelsCanvas` for the spin slot, and Kowloon presentation
  branches inside the existing `RevealStage` and
  `BonusTimerCountdown`.
- A bespoke Kowloon primitives library (`NeonSign`, `CRTBezel`,
  `MahjongTile`, `ArcadeToken`, `Stamp`, `WireBundle`,
  `MosaicFloor`, `Scanlines`, `PixelSprite`).
- Page-level scanline overlay applied via the `[data-theme]`
  attribute — pure CSS, no JSX swap.
- Zero regression to Vintage Pachinko or any of the six stub themes.

## Non-goals

- **Route-level JSX swaps** (`if (theme === 'kowloon') return
  <KowloonHome/>`). Routes stay one shape; variation lives in
  dispatchers and tokens.
- New mechanics. Kowloon is a presentation re-skin; the underlying
  spin engine, jar state, bonus timers, habit data, and reward
  ledger are unchanged. Mahjong reels are a *visualization* of the
  same `wheel.engine.ts` outcomes.
- Animating CRT-bezel curvature/phosphor with WebGL. Static SVG +
  CSS scanlines suffice for v1.
- Theme-specific audio (arcade chimes, coin drops). Out of scope;
  the existing spin SFX module continues to drive sound.
- Lazy-loading the Kowloon bundle. Premature; revisit if bundle
  size becomes a problem.
- Promoting any of the six other stub themes to bespoke. Each gets
  its own design pass later. They benefit from the new dispatcher
  pattern automatically (they fall through to Pachinko variants
  today, and can opt into their own variants later by adding a
  `visual` block).
- Tablet-specific layout. Inherits the existing desktop chassis.

## Architecture

### Thin dispatchers over a strictly-typed `visual` profile

The current app has zero theme-conditional render branches —
Pachinko's aesthetic is baked into a handful of named imports
(`PachinkoStreak`, `PachinkoPotMini`) plus inline JSX in each
route's masthead. Kowloon needs structurally different
presentation in ~7 places (the rest is palette + copy, which CSS
variables already handle).

The pattern: extend `ThemeMeta` with an optional `visual` profile,
and route consumers through tiny **dispatcher** components that
read the active variant from the existing `useTheme()` hook.

```ts
// src/styles/themes.ts (new types)
type StreakVariant   = 'lantern' | 'led-bar';
type PotMiniVariant  = 'koi-jar' | 'token-tray';
type ChipVariant     = 'lacquer' | 'arcade-token';
type SpinVariant     = 'wheel' | 'reels' | 'mahjong';
type CoverVariant    = 'parlour' | 'arcade-closet';
type OverlayVariant  = 'paper-grain' | 'scanlines';
type MastheadVariant = 'engraved' | 'neon-vertical';

export interface ThemeVisual {
  streak: StreakVariant;
  potMini: PotMiniVariant;
  chip: ChipVariant;
  spin: SpinVariant;
  cover: CoverVariant;
  overlay: OverlayVariant;
  masthead: MastheadVariant;
}

export interface ThemeMeta {
  name: string;
  tagline: string;
  copy: ThemeCopy;
  symbol: MotifSymbol;
  status: 'ready' | 'stub';
  /** Optional. When absent, dispatchers fall through to Pachinko variants. */
  visual?: ThemeVisual;
}
```

Pachinko gets an explicit `visual` block — cosmetic, but it
documents the defaults at the source of truth. Kowloon ships its
own. The six stub themes leave `visual` undefined and dispatchers
fall back to `'lantern' / 'koi-jar' / 'lacquer' / 'wheel' /
'parlour' / 'paper-grain' / 'engraved'` — byte-identical to
today's behavior.

A dispatcher is a tiny function:

```tsx
// src/features/jar/Streak.tsx
import { useTheme } from '../../styles/theme-context.ts';
import { PachinkoStreak } from './PachinkoStreak.tsx';
import { KowloonStreak } from '../kowloon/KowloonStreak.tsx';

export function Streak() {
  const { themeMeta } = useTheme();
  switch (themeMeta.visual?.streak ?? 'lantern') {
    case 'led-bar': return <KowloonStreak />;
    case 'lantern': return <PachinkoStreak />;
  }
}
```

`tsconfig.app.json`'s `"strict": true` + `"noFallthroughCasesInSwitch":
true` turns the union into an exhaustiveness check at the type
layer. Adding a `'crystal-trail'` variant requires a case
addition or the build fails.

Routes consume dispatchers under generic names. Today,
`Home.tsx:18` imports `PachinkoStreak`; the change is one line —
import `Streak` instead. Inside the route's render, the JSX
becomes `<Streak />` instead of `<PachinkoStreak />`. The
surrounding layout, classNames, data hooks, and ARIA are
untouched.

### Page-level overlay via CSS attribute selectors

Scanlines (Kowloon) and paper grain (Pachinko) apply at the
document level via existing `[data-theme]` attribute selectors in
`themes.css`. Already wired by [theme-provider.tsx:41](../../../src/styles/theme-provider.tsx:41).

```css
[data-theme='pachinko'] body { background-image: url(...paper-grain...); }
[data-theme='kowloon']  body {
  background-image: repeating-linear-gradient(0deg,
    rgba(255,255,255,0.04) 0 1px, transparent 1px 3px);
}
```

No JSX touched. The `OverlayVariant` key in `visual` is a
human-readable label for documentation; the actual application
is pure CSS.

### What changes in existing code

**Adds, no changes**:
- A `ThemeVisual` interface in `themes.ts`
- A `visual` field on `ThemeMeta`
- An explicit `visual` block on `THEMES.pachinko` (documents
  defaults)
- Kowloon variant components in `src/features/kowloon/`
- Kowloon primitives in `src/ui/kowloon/`
- A new `MahjongReelsCanvas` in `src/features/wheel/`
- New dispatcher components for slots that need them

**Existing components, internal additions**:
- `RevealStage.tsx` and `BonusTimerCountdown.tsx` already exist
  with theme-aware rendering. They gain a Kowloon branch —
  internal switch on `themeMeta.visual?.cover` (or a dedicated
  reveal-style key) that renders the CRT-phosphor presentation
  instead of the lacquer cabinet. The rest of the component
  stays as-is.
- `WheelCabinet.tsx` already picks between wheel and reels via
  setting/theme. Extends to a third option for `'mahjong'`.

**One-line import swaps**:
- `Home.tsx` line 18: `PachinkoStreak` → `Streak` dispatcher.
- `App.tsx` line 23: `PachinkoPotMini` → `PotMini` dispatcher.
- Per-route inline `<header className="parlour-masthead">…</header>`:
  extracted to `<Masthead />` dispatcher (a small but high-leverage
  refactor — see commit 4 below).

**No changes**:
- Routes' overall structure, data hooks, ARIA, classNames.
- Six stub themes (`house`, `riding`, etc.).
- The `ThemeProvider`, `theme-context.ts`, the persistence layer,
  the `useTheme()` hook signature.
- Tokens cascade order: `[data-theme='pachinko']` and
  `[data-theme='kowloon']` are independent CSS rule sets.
- Tests for unrelated features.

### Rejected alternatives

- **Route-level theme guard** (`if (theme === 'kowloon') return
  <KowloonHome/>` at the top of each route). Surgically minimal,
  but duplicates layout that's structurally identical between
  themes. Rejected after architectural review with the user.
- **Per-component branching scattered through every route**
  (`{theme === 'kowloon' ? <K/> : <P/>}` inline). Leaks
  theme-awareness into ~15 components. Dispatchers concentrate
  the awareness in one tiny component per slot.
- **Theme catalog ships actual React components** (`{ Streak:
  PachinkoStreak, ... }`). Would couple the theme catalog to
  React; complicates testing and SSR. The `visual` keys-as-data
  approach keeps the catalog pure.
- **Lazy-load theme bundles**. Premature; revisit if bundle size
  becomes a problem.

## File layout

```
src/styles/
├── themes.ts                      ← MODIFIED: add 'kowloon' to ThemeKey,
│                                    'mahjong' to MotifSymbol, ThemeVisual interface,
│                                    THEMES.pachinko.visual + THEMES.kowloon entries
└── themes.css                     ← MODIFIED: add [data-theme='kowloon'] block

src/ui/parlour/
└── Motif.tsx                      ← MODIFIED: add case 'mahjong'

src/ui/kowloon/                    ← NEW DIR (Kowloon primitives — leaf SVG/CSS)
├── NeonSign.tsx                   ← NEW (vertical Cantonese + horizontal English)
├── CRTBezel.tsx                   ← NEW (phosphor frame wrapper)
├── Scanlines.tsx                  ← NEW (page-level overlay component)
├── MahjongTile.tsx                ← NEW
├── ArcadeToken.tsx                ← NEW (Kowloon ChipVariant render)
├── Stamp.tsx                      ← NEW (rotated inspection stamps)
├── WireBundle.tsx                 ← NEW (cable divider SVG)
├── MosaicFloor.tsx                ← NEW (tiled cabinet base strip)
├── PixelSprite.tsx                ← NEW (16×16 sprite renderer)
├── kowloon.css                    ← NEW (primitive-scoped styles)
├── index.ts                       ← NEW (barrel export)
└── __tests__/                     ← NEW (RTL render/snapshot tests)

src/features/kowloon/              ← NEW DIR (Kowloon variant components)
├── KowloonStreak.tsx              ← NEW (LED-bar streak)
├── KowloonPotMini.tsx             ← NEW (right-rail token tray)
├── KowloonMasthead.tsx            ← NEW (neon vertical sign + wordmark)
├── KowloonCover.tsx               ← NEW (theme-picker cover art)
├── kowloon-screens.css            ← NEW
├── index.ts                       ← NEW
└── __tests__/                     ← NEW

src/features/jar/
├── PachinkoStreak.tsx             ← UNCHANGED (kept as the 'lantern' variant)
├── PachinkoPotMini.tsx            ← UNCHANGED (kept as the 'koi-jar' variant)
├── Streak.tsx                     ← NEW (dispatcher: lantern | led-bar)
└── PotMini.tsx                    ← NEW (dispatcher: koi-jar | token-tray)

src/features/wheel/
├── WheelCanvas.tsx                ← UNCHANGED ('wheel' variant)
├── SlotReelsCanvas.tsx            ← UNCHANGED ('reels' variant)
└── MahjongReelsCanvas.tsx         ← NEW ('mahjong' variant — three-reel CRT)

src/features/spin/
├── WheelCabinet.tsx               ← MODIFIED: extend internal dispatch on
│                                    visual.spin to include 'mahjong'
├── RevealStage.tsx                ← MODIFIED: add Kowloon CRT-phosphor branch
├── HandTrayCard.tsx               ← MODIFIED: dispatch chip render on visual.chip
└── ... (others token-driven, unchanged)

src/features/bonus/
└── BonusTimerCountdown.tsx        ← MODIFIED: add Kowloon CRT-countdown branch

src/ui/parlour/
├── Masthead.tsx                   ← NEW (dispatcher: engraved | neon-vertical)
├── PachinkoMasthead.tsx           ← NEW (extracted from inline route JSX —
│                                    the existing 'parlour-masthead' header pattern)
└── ... (other primitives unchanged)

src/routes/
└── *.tsx                          ← MODIFIED minimally: replace inline
                                    `<header className="parlour-masthead">...`
                                    blocks with `<Masthead />`. Swap
                                    PachinkoStreak/PachinkoPotMini imports
                                    to dispatcher names. Zero conditional
                                    render logic.

src/App.tsx                        ← MODIFIED: rail.pot wires <PotMini/>
                                    instead of <PachinkoPotMini/>.

index.html                         ← MODIFIED: append Noto+Serif+HK and
                                    Shippori+Mincho to Google Fonts URL
e2e/kowloon.spec.ts                ← NEW (theme-flip end-to-end coverage)
BACKLOG.md                         ← MODIFIED: tick Kowloon items
CHANGELOG.md                       ← MODIFIED: entry per existing convention
```

The dispatcher count is small and concentrated:

| Dispatcher | Slot | Pachinko variant | Kowloon variant |
|---|---|---|---|
| `<Streak/>` | `streak` | `<PachinkoStreak/>` | `<KowloonStreak/>` |
| `<PotMini/>` | `potMini` | `<PachinkoPotMini/>` | `<KowloonPotMini/>` |
| `<Masthead/>` | `masthead` | `<PachinkoMasthead/>` | `<KowloonMasthead/>` |
| Internal in `WheelCabinet` | `spin` | `<WheelCanvas/>` or `<SlotReelsCanvas/>` | `<MahjongReelsCanvas/>` |
| Internal in `RevealStage` | `cover`/reveal | existing pachinko reveal block | new Kowloon CRT-phosphor block |
| Internal in `BonusTimerCountdown` | derived from theme | existing hourglass block | new magenta digital countdown |
| Internal in `HandTrayCard` | `chip` | existing chip pile | token tray (uses `<ArcadeToken/>`) |
| `<Cover/>` | `cover` | `<PachinkoCover/>` (existing or extracted) | `<KowloonCover/>` |

All dispatchers fall back to the Pachinko variant when
`themeMeta.visual` is absent or the slot is undefined.

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
| `--color-surface-3` | `#2c2547` | Highest tier (derived: +5% L from surface-2) |
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

`--font-hk` is the only new font variable. Added inside the
`[data-theme='kowloon']` block only; base tokens stay untouched.

`Noto Serif HK` and `Shippori Mincho` are appended to the
existing Google Fonts URL in [index.html:16](../../../index.html):
`&family=Noto+Serif+HK:wght@400;600;700&family=Shippori+Mincho:wght@400;500;700`.

### Motif

A new `MotifSymbol` literal — `'mahjong'` — is added to the union
in [src/styles/themes.ts:28](../../../src/styles/themes.ts:28).
The [Motif.tsx](../../../src/ui/parlour/Motif.tsx) switch gains a
new `case 'mahjong'` returning a stylized 60×60 SVG: a hatched
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
| `status` | `'ready'` (after the bespoke flow lands; `'stub'` between commits 1 and 7) |

## Per-variant design

Each variant component below is a **leaf** — it doesn't compose a
route. Routes stay one shape and import the dispatcher (or use
the existing component which now has an internal Kowloon branch).

### `KowloonMasthead` (slot: `masthead`)

- Replaces the inline `parlour-masthead` header pattern at the
  top of every route.
- Vertical Cantonese sign (`九龍電氣`) at left in `--font-hk`,
  glowing magenta.
- Horizontal English wordmark + tagline at right in
  `--font-display`, with cyan glow.
- Tagline reads `themeMeta.tagline`; identical hook to
  `PachinkoMasthead`.

### `KowloonStreak` (slot: `streak`)

- Replaces `PachinkoStreak` in the streak slot.
- Renders as a thin cyan-glow LED bar with the streak count in
  `--font-pixel`.
- Same data hook (`useAppStore` selectors) as `PachinkoStreak`.

### `KowloonPotMini` (slot: `potMini`)

- Replaces `PachinkoPotMini` in the right-rail Pot widget.
- Token-tray rendering: row of small `<ArcadeToken/>` glyphs
  matching today's bank breakdown, with the count rendered in
  `--font-pixel`.
- Same data hook as `PachinkoPotMini`.

### `MahjongReelsCanvas` (slot: `spin`, internal in `WheelCabinet`)

- Three vertical reels of mahjong tiles. The center reel
  pre-determines the tier from `wheel.engine.ts`'s outcome; side
  reels animate alignment.
- Single horizontal magenta payline glows when the result
  resolves.
- Mounted inside a `<CRTBezel>` for the phosphor effect.
- Tile faces use `<MahjongTile>`. Dial mapping (East/South/West
  for column labels, 中/發/白 for tile faces) confirmed in plan.
- Animation deferred to commit 5; commit 4 ships a static
  resolved-triplet placeholder.

### Kowloon reveal (internal in `RevealStage`)

- On a winning outcome, a CRT-bezel phosphor frame replaces the
  lacquer cabinet. Vertically stacked sodium-yellow kanji
  `大 / 獎` flash with gold-glow `text-shadow`.
- Tier label below in `--font-pixel` (e.g.
  `JACKPOT · TIER ★`).
- Confetti is replaced by a magenta + cyan + jade pixel-burst
  rendered via `<PixelSprite>`.
- Existing `RevealStage` retains its current structure;
  Kowloon-specific JSX is gated behind a small switch on
  `themeMeta.visual?.cover`.

### Kowloon bonus countdown (internal in `BonusTimerCountdown`)

- Magenta digital countdown (`--font-pixel`) inside a
  `<CRTBezel>`. `06:42` style format.
- Timer logic is unchanged; only the presentation block
  branches on theme.

### `KowloonCover` (slot: `cover`)

- Used by the Settings theme picker as Kowloon's cover art.
- Vertical Cantonese sign, English wordmark, mosaic floor strip
  at bottom, tangled wires across the top, four corner
  inspection stamps.

## Pachinko safety

The audit performed before this spec confirmed:

- **No exhaustive `switch (theme)` exists.** The only
  theme-related switch is in
  [Motif.tsx:42](../../../src/ui/parlour/Motif.tsx:42) over
  `MotifSymbol`, has a `default` case, and adding a new symbol
  is purely additive.
- **Pachinko has its own explicit `[data-theme='pachinko']`
  block** ([themes.css:75](../../../src/styles/themes.css:75))
  duplicating the `:root` defaults. The new
  `[data-theme='kowloon']` block cannot affect Pachinko's
  cascade.
- **Theme persistence is hardened**
  ([theme-provider.tsx:30](../../../src/styles/theme-provider.tsx:30)):
  `isThemeKey()` rejects unknown values and falls back to
  Pachinko.
- **No tests assert on `data-theme`, font lists, or THEMES
  shape.** The three e2e specs (`a11y`, `smoke`,
  `desktop-chassis`) check unrelated invariants.
- **No Pachinko-locked shell.**
  [App.tsx:116](../../../src/App.tsx) wraps routes in a generic
  `DesktopShell`.
- **`status` field is dead metadata** — no consumers, so
  flipping kowloon between `'stub'` and `'ready'` is cosmetic.

### Safety mechanism under the dispatcher pattern

Each dispatcher has a defensive default:

```tsx
switch (themeMeta.visual?.streak ?? 'lantern') {
  case 'led-bar': return <KowloonStreak/>;
  case 'lantern': return <PachinkoStreak/>;
}
```

Three properties matter for Pachinko safety:

1. **The fallback is the Pachinko variant.** A theme with
   undefined `visual` (the six stubs) renders the byte-identical
   Pachinko component. Today's behavior is preserved exactly.
2. **The Pachinko variant components are not modified.** They
   keep their current names and contents. The only existing-file
   churn is import lines and the inline-masthead extraction.
3. **TS exhaustiveness is enforced.** A future variant added to
   the union but missing from a dispatcher fails the build.
   No silent fallthrough.

The two unconditional Pachinko-bespoke imports
(`PachinkoStreak` in `Home.tsx`, `PachinkoPotMini` in
`App.tsx`) are addressed by swapping their import to the
dispatcher counterpart in commit 4 — one-line changes.

### Verification gates (required, per-commit)

Before each commit lands:

1. `npm run typecheck` — no errors.
2. `npm run lint` — no errors.
3. `npm test` — all unit tests pass.
4. `npm run test:e2e` — all e2e tests pass with `theme=pachinko`
   (CI default).
5. Manual: load the app at `theme=pachinko`, confirm the route
   renders byte-identically to the pre-commit baseline.

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
  expected ARIA where relevant.
- One render test per variant component in
  `src/features/kowloon/__tests__/` rendering with a mocked
  `useTheme()` returning a kowloon-shaped `themeMeta`.
- Dispatcher tests: each dispatcher renders the Pachinko variant
  at default (`themeMeta.visual` undefined) and the Kowloon
  variant when `visual.<slot>` is set. Two render assertions per
  dispatcher.
- A regression test in `src/styles/__tests__/themes.test.ts`:
  every entry in `THEMES` either has a complete `visual` block
  or `visual` is undefined (no partial visuals).

### End-to-end

- `e2e/kowloon.spec.ts`:
  1. Boot at default theme. Assert `data-theme="pachinko"` on
     `<html>` and that the Pachinko masthead is visible.
  2. Open Settings → flip to Kowloon. Assert
     `data-theme="kowloon"` and that the Kowloon NeonSign on the
     masthead is mounted.
  3. Walk the spin flow (cash-in → drop coin → reveal). Assert
     the CRT bezel is mounted at each step.
  4. Open Bonus. Assert the magenta countdown is rendered.
  5. Flip back to Pachinko. Assert the masthead returns to
     engraved style; assert no Kowloon NeonSign element is
     mounted.

### Accessibility

The existing `e2e/a11y.spec.ts` is parametrized by route. Extend
it (or add a sibling spec) to repeat the WCAG 2.1 AA checks with
`theme=kowloon`. The ink/cream contrast on Triad Neon backgrounds
is the highest-risk pair to validate (cream on midnight is
~13:1, well above AA).

## Commit sequence (single PR)

Every commit ships with its tests, builds cleanly, and leaves the
app in a usable state. CI is green throughout because dispatchers
fall back to Pachinko by default, and CI runs at the default
theme.

1. **`feat(themes): register kowloon + Triad Neon tokens + ThemeVisual interface`**
   - `src/styles/themes.ts`: add `'kowloon'` to `ThemeKey`,
     `'mahjong'` to `MotifSymbol`, `ThemeVisual` interface, full
     `THEMES.kowloon` entry (with `visual`), explicit `visual`
     block on `THEMES.pachinko`. Status `'stub'`.
   - `src/styles/themes.css`: append `[data-theme='kowloon']`
     block with full token map, including overlay scanlines.
   - `src/ui/parlour/Motif.tsx`: add `case 'mahjong'`.
   - `index.html`: append HK + Mincho fonts.
   - Tests: extend `Motif.test` to render the mahjong symbol;
     extend `themes.test.ts` with the visual-completeness
     regression check.
   - Result: theme is pickable in Settings; renders pachinko-shaped
     JSX with Triad Neon tokens. Acceptable interim state — every
     dispatcher's fallback is still the Pachinko variant because
     the dispatchers don't exist yet.

2. **`feat(kowloon): core overlay primitives (NeonSign, CRTBezel, Scanlines)`**
   - `src/ui/kowloon/NeonSign.tsx`, `CRTBezel.tsx`,
     `Scanlines.tsx`, `kowloon.css`, `index.ts`,
     `__tests__/*.test.tsx`.
   - Not yet imported by variants. Pure visual primitives.

3. **`feat(kowloon): physical primitives (MahjongTile, ArcadeToken, Stamp, WireBundle, MosaicFloor, PixelSprite)`**
   - The remaining six primitives + tests.
   - `src/ui/kowloon/index.ts` barrel updated.

4. **`feat(kowloon): Streak + PotMini + Masthead dispatchers and variants`**
   - `src/features/kowloon/KowloonStreak.tsx`,
     `KowloonPotMini.tsx`, `KowloonMasthead.tsx`.
   - `src/ui/parlour/Masthead.tsx` (dispatcher) +
     `PachinkoMasthead.tsx` (extraction of the inline
     `parlour-masthead` JSX from each route). Snapshot test
     required: at `theme=pachinko` the rendered DOM of every
     affected route must be byte-identical pre/post extraction.
   - `src/features/jar/Streak.tsx`, `PotMini.tsx` (dispatchers).
   - Update import lines in `Home.tsx`, `App.tsx`, and every
     route file to use `<Masthead/>`, `<Streak/>`, `<PotMini/>`.
   - Dispatcher tests for all three.
   - First user-visible Kowloon polish: at `theme=kowloon`, the
     header, streak indicator, and right-rail pot all flip to
     Triad Neon variants.

5. **`feat(kowloon): SpinCabinet mahjong reels + chip variant`**
   - `src/features/wheel/MahjongReelsCanvas.tsx` (with reel
     animation consuming `wheel.engine.ts` outcomes).
   - `src/features/spin/WheelCabinet.tsx`: extend internal
     dispatch to include `'mahjong'`.
   - `src/features/spin/HandTrayCard.tsx`: dispatch chip render
     between existing chip and `<ArcadeToken/>` based on
     `visual.chip`.
   - The dopamine spine ships.

6. **`feat(kowloon): Reveal + Bonus presentations`**
   - `src/features/spin/RevealStage.tsx`: add Kowloon
     CRT-phosphor branch with kanji flash + pixel-burst
     particles.
   - `src/features/bonus/BonusTimerCountdown.tsx`: add Kowloon
     magenta digital countdown branch.

7. **`feat(kowloon): Cover + final polish + status flip`**
   - `src/features/kowloon/KowloonCover.tsx`.
   - Theme picker in Settings: ensures Kowloon cover renders
     when previewed.
   - `THEMES.kowloon.status` flipped to `'ready'`.
   - `e2e/kowloon.spec.ts` added.

8. **`docs: tick Kowloon BACKLOG items + CHANGELOG entry`**
   - `BACKLOG.md`: tick all 3 boxes, move section to "Shipped".
   - `CHANGELOG.md`: entry per the existing convention (cf. the
     Pachinko entry from 2026-04-25).

## Open questions

None blocking implementation. Two minor items the implementer
will confirm in the plan:

- **Mahjong reel symbols**: the design canvas shows
  East/South/West (一/二/三) for dial labels and 中/發/白
  (center/fortune/white) for tile faces. Implementer chooses the
  exact mapping to wheel-engine outcomes based on visual rhythm.
- **Reveal slot key naming**: the `cover` variant key currently
  pulls double duty for both theme-picker cover art and reveal
  presentation. The plan should decide whether to add a separate
  `reveal: 'cabinet' | 'crt-phosphor'` key for clarity, or keep
  the indirection through `cover`. Either is fine; clarity wins.

## Out of scope, but earmarked

- Theme-specific SFX (arcade chimes, coin drops, CRT power-on).
- Animated CRT power-on transition when flipping themes.
- A "Kowloon → Pachinko" theme cross-fade animation.
- Easter eggs (e.g. tapping the CRT bezel five times shows a
  hidden 中 tile).
- Promoting any of the six other stubs to bespoke. Each can opt
  in to dispatcher variants by adding a `visual` block to its
  `THEMES.<key>` entry.

These can each ship as standalone follow-ups.
