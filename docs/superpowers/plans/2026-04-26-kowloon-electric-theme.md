# Kowloon Electric Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the second bespoke theme — Kowloon Electric (Triad Neon) — in one PR, sequenced into 13 logical commits. Architecture: extend `ThemeMeta` with a strictly-typed `visual` profile, then introduce thin dispatcher components that consume the existing `useTheme()` hook to swap variants for ~7 slots that genuinely look different. Vintage Pachinko stays byte-for-byte identical at `theme=pachinko`.

**Architecture:** Pure additive theming. Tokens for palette, fonts, copy, motifs (already supported). New: `ThemeVisual` interface with literal-union variant keys; thin React dispatchers that fall back to Pachinko variants when `themeMeta.visual` is undefined or the slot is unset; CSS-only page-level overlay swap via `[data-theme]` attribute selectors. No router changes, no state changes, no new persistence.

**Tech Stack:** React 18 + TypeScript strict, Vite, Vitest + React Testing Library, Playwright (existing browser matrix). Dev server: `npm run dev` → `http://localhost:5173/kakeguruimasho/`. TS-strict + `noFallthroughCasesInSwitch` enforce dispatcher exhaustiveness at compile time.

**Source of truth:** [docs/superpowers/specs/2026-04-26-kowloon-electric-theme-design.md](../specs/2026-04-26-kowloon-electric-theme-design.md). Design bundle at `/tmp/kowloon-design/kakeguruimasho/project/` — `themes.jsx`, `kowloon-neon.jsx`, `kowloon-screens.jsx`. User direction lives in chat transcript `chat1.md` lines 736–1063 (Triad Neon palette chosen, full bespoke flow requested).

---

## File Structure

### New files

**Theme types & tokens**
- (none — modifications only to `themes.ts` and `themes.css`)

**Kowloon primitives** — `src/ui/kowloon/`
- `NeonSign.tsx` — Vertical Cantonese + horizontal English signage with neon glow.
- `CRTBezel.tsx` — Phosphor-frame wrapper with scanlines + curvature vignette.
- `Scanlines.tsx` — Page-level CRT overlay component (used directly by Kowloon screens; CSS-only at the body level).
- `MahjongTile.tsx` — Cream tile with HK serif glyph.
- `ArcadeToken.tsx` — Knurled SVG token with denomination label (Kowloon's `Chip` analog).
- `Stamp.tsx` — Rotated inspection-stamp badge (`檢 / INSPECTED` etc.).
- `WireBundle.tsx` — Inline cable-bundle SVG divider.
- `MosaicFloor.tsx` — Tiled-floor background strip.
- `PixelSprite.tsx` — 16×16 sprite renderer (rows × digits → SVG rects).
- `kowloon.css` — Primitive-scoped styles (glow shadows, scanline pattern).
- `index.ts` — Barrel exports.
- `__tests__/NeonSign.test.tsx`, `CRTBezel.test.tsx`, `Scanlines.test.tsx`, `MahjongTile.test.tsx`, `ArcadeToken.test.tsx`, `Stamp.test.tsx`, `WireBundle.test.tsx`, `MosaicFloor.test.tsx`, `PixelSprite.test.tsx` — render/structure tests.

**Kowloon variant components** — `src/features/kowloon/`
- `KowloonStreak.tsx` — LED-bar streak ribbon (Pachinko's `lantern` analog).
- `KowloonPotMini.tsx` — Right-rail token-tray widget.
- `KowloonMasthead.tsx` — Page header with neon vertical sign + wordmark.
- `KowloonCover.tsx` — Theme-picker cover art.
- `kowloon-screens.css` — Variant-scoped styles.
- `index.ts` — Barrel exports.
- `__tests__/KowloonStreak.test.tsx`, `KowloonPotMini.test.tsx`, `KowloonMasthead.test.tsx`, `KowloonCover.test.tsx` — render tests with mocked theme.

**Dispatcher components**
- `src/features/jar/Streak.tsx` — Dispatcher: renders `KowloonStreak` or `PachinkoStreak`.
- `src/features/jar/PotMini.tsx` — Dispatcher: renders `KowloonPotMini` or `PachinkoPotMini`.
- `src/ui/parlour/Masthead.tsx` — Dispatcher: renders `KowloonMasthead` or `PachinkoMasthead`. Accepts children (route-supplied content).
- `src/ui/parlour/PachinkoMasthead.tsx` — Wraps existing `<header className="parlour-masthead">…</header>` pattern, accepts children.
- `src/features/jar/__tests__/Streak.test.tsx`, `PotMini.test.tsx` — dispatcher tests.
- `src/ui/parlour/__tests__/Masthead.test.tsx` — dispatcher test + snapshot regression for Pachinko.

**Mahjong canvas**
- `src/features/wheel/MahjongReelsCanvas.tsx` — Three-reel mahjong cabinet driven by `wheel.engine.ts` outcomes.
- `src/features/wheel/__tests__/MahjongReelsCanvas.test.tsx` — render + animation-trigger tests.

**E2E**
- `e2e/kowloon.spec.ts` — Theme-flip end-to-end coverage.

### Modified files

- `src/styles/themes.ts` — Add `'kowloon'` to `ThemeKey`, `'mahjong'` to `MotifSymbol`, `ThemeVisual` interface, `THEMES.pachinko.visual` block, `THEMES.kowloon` entry.
- `src/styles/themes.css` — Add `[data-theme='kowloon']` block + body-level overlay rule.
- `src/styles/__tests__/themes.test.ts` — Add visual-completeness regression test (file may be created if it doesn't exist).
- `src/ui/parlour/Motif.tsx` — Add `case 'mahjong':` to switch.
- `src/ui/parlour/__tests__/Motif.test.tsx` — Extend to cover `mahjong` rendering (file created if doesn't exist).
- `src/ui/parlour/index.ts` — Export `Masthead`, `PachinkoMasthead`.
- `src/features/jar/index.ts` — Export `Streak`, `PotMini`.
- `src/features/spin/WheelCabinet.tsx` — Internal dispatch on `visual.spin`.
- `src/features/spin/RevealStage.tsx` — Internal Kowloon CRT-phosphor branch.
- `src/features/spin/HandTrayCard.tsx` — Dispatch chip render between Pachinko `<Chip>` and `<ArcadeToken>` based on `visual.chip`.
- `src/features/bonus/BonusTimerCountdown.tsx` — Internal Kowloon magenta-digital branch.
- `src/routes/Home.tsx` — Replace inline masthead with `<Masthead>`; replace `<PachinkoStreak/>` with `<Streak/>`.
- `src/routes/SpinFlow.tsx` — Replace inline masthead with `<Masthead>`.
- `src/routes/Jar.tsx` — Replace inline masthead with `<Masthead>`.
- `src/routes/Habits.tsx` — Replace inline masthead with `<Masthead>`.
- `src/routes/Rewards.tsx` — Replace inline masthead with `<Masthead>`.
- `src/routes/Settings.tsx` — Replace inline masthead with `<Masthead>`.
- `src/routes/BonusTimerDetail.tsx` — Replace inline masthead with `<Masthead>`.
- `src/App.tsx` — Replace `<PachinkoPotMini/>` import & usage with `<PotMini/>`.
- `index.html` — Append `Noto Serif HK` and `Shippori Mincho` to Google Fonts URL.
- `BACKLOG.md` — Tick all 3 Kowloon items, move to "Shipped" subsection.
- `CHANGELOG.md` — New entry under today's date.

---

## Task 1: Theme registration — types, catalog, tokens, motif, fonts

Lays the foundation. After this task lands, theme=kowloon is pickable in Settings; the app renders a pachinko-shaped JSX with Triad Neon CSS tokens. Acceptable interim state because no dispatchers exist yet; everything still routes to Pachinko variants by name.

**Files:**
- Modify: `src/styles/themes.ts`
- Modify: `src/styles/themes.css`
- Create: `src/styles/__tests__/themes.test.ts` (if missing)
- Modify: `src/ui/parlour/Motif.tsx`
- Modify (or create): `src/ui/parlour/__tests__/Motif.test.tsx`
- Modify: `index.html`

- [ ] **Step 1: Write the failing themes.test.ts**

Create `src/styles/__tests__/themes.test.ts` if it doesn't exist; otherwise add the new test:

```ts
import { describe, it, expect } from 'vitest';
import { THEMES, isThemeKey, type ThemeKey } from '../themes.ts';

describe('THEMES catalog', () => {
  it('includes kowloon as a known theme key', () => {
    expect(isThemeKey('kowloon')).toBe(true);
    expect(THEMES.kowloon).toBeDefined();
    expect(THEMES.kowloon.name).toBe('Kowloon Electric');
    expect(THEMES.kowloon.symbol).toBe('mahjong');
  });

  it('every theme either has a complete visual block or visual is undefined', () => {
    const requiredSlots = [
      'streak', 'potMini', 'chip', 'spin', 'cover', 'overlay', 'masthead',
    ] as const;
    for (const key of Object.keys(THEMES) as ThemeKey[]) {
      const v = THEMES[key].visual;
      if (v === undefined) continue;
      for (const slot of requiredSlots) {
        expect(v[slot], `${key}.visual.${slot} must be defined`).toBeDefined();
      }
    }
  });

  it('pachinko ships an explicit visual profile (documents defaults)', () => {
    expect(THEMES.pachinko.visual).toEqual({
      streak: 'lantern',
      potMini: 'koi-jar',
      chip: 'lacquer',
      spin: 'wheel',
      cover: 'parlour',
      overlay: 'paper-grain',
      masthead: 'engraved',
    });
  });

  it('kowloon ships its Triad Neon visual profile', () => {
    expect(THEMES.kowloon.visual).toEqual({
      streak: 'led-bar',
      potMini: 'token-tray',
      chip: 'arcade-token',
      spin: 'mahjong',
      cover: 'arcade-closet',
      overlay: 'scanlines',
      masthead: 'neon-vertical',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/styles/__tests__/themes.test.ts`
Expected: FAIL — `THEMES.kowloon` is undefined.

- [ ] **Step 3: Extend `themes.ts` with ThemeVisual + kowloon + pachinko visual**

Open `src/styles/themes.ts`. Make these edits:

(a) Add `'kowloon'` to the `ThemeKey` union (line ~19):

```ts
export type ThemeKey =
  | 'pachinko'
  | 'kowloon'
  | 'house'
  | 'riding'
  | 'imperial'
  | 'ukiyoe'
  | 'celestial'
  | 'speakeasy';
```

(b) Add `'mahjong'` to the `MotifSymbol` union (line ~28):

```ts
export type MotifSymbol =
  | 'paclilly'
  | 'fleur'
  | 'wolf'
  | 'dragon'
  | 'wave'
  | 'star'
  | 'keyhole'
  | 'mahjong';
```

(c) Above `ThemeMeta`, add the `ThemeVisual` interface:

```ts
export type StreakVariant = 'lantern' | 'led-bar';
export type PotMiniVariant = 'koi-jar' | 'token-tray';
export type ChipVariant = 'lacquer' | 'arcade-token';
export type SpinVariant = 'wheel' | 'reels' | 'mahjong';
export type CoverVariant = 'parlour' | 'arcade-closet';
export type OverlayVariant = 'paper-grain' | 'scanlines';
export type MastheadVariant = 'engraved' | 'neon-vertical';

export interface ThemeVisual {
  streak: StreakVariant;
  potMini: PotMiniVariant;
  chip: ChipVariant;
  spin: SpinVariant;
  cover: CoverVariant;
  overlay: OverlayVariant;
  masthead: MastheadVariant;
}
```

(d) Add `visual?: ThemeVisual;` to the `ThemeMeta` interface:

```ts
export interface ThemeMeta {
  name: string;
  tagline: string;
  copy: ThemeCopy;
  symbol: MotifSymbol;
  status: 'ready' | 'stub';
  /** Optional. When absent, dispatchers fall back to Pachinko variants. */
  visual?: ThemeVisual;
}
```

(e) Add an explicit `visual` block to `THEMES.pachinko` (right after the existing `copy` block, before the closing brace):

```ts
    visual: {
      streak: 'lantern',
      potMini: 'koi-jar',
      chip: 'lacquer',
      spin: 'wheel',
      cover: 'parlour',
      overlay: 'paper-grain',
      masthead: 'engraved',
    },
```

(f) Add the full `kowloon` entry to `THEMES`. Place it immediately after the `pachinko` block (so it sits as the second bespoke theme):

```ts
  kowloon: {
    name: 'Kowloon Electric',
    tagline: '九龍電氣 · Triad Neon, 1985',
    symbol: 'mahjong',
    status: 'stub',
    copy: {
      spinCta: 'Drop the Coin',
      earned: 'Banked',
      hand: 'Token Tray',
      bag: 'Cassette',
      jackpot: '大獎 · Daai-Jeung',
      nearMiss: 'One slot off',
    },
    visual: {
      streak: 'led-bar',
      potMini: 'token-tray',
      chip: 'arcade-token',
      spin: 'mahjong',
      cover: 'arcade-closet',
      overlay: 'scanlines',
      masthead: 'neon-vertical',
    },
  },
```

Note: `status` stays `'stub'` for now. It flips to `'ready'` in Task 12.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/styles/__tests__/themes.test.ts`
Expected: PASS — all four assertions green.

- [ ] **Step 5: Add kowloon CSS token block**

Open `src/styles/themes.css`. Append this block at the end of the file:

```css
[data-theme='kowloon'] {
  --color-bg: #0b0a14;
  --color-bg-grad:
    radial-gradient(120% 90% at 20% 0%, rgba(255, 46, 136, 0.18) 0%, transparent 55%),
    radial-gradient(110% 80% at 90% 100%, rgba(34, 227, 255, 0.16) 0%, transparent 55%),
    radial-gradient(140% 100% at 50% 50%, rgba(200, 85, 255, 0.10) 0%, transparent 65%),
    #0b0a14;
  --color-felt: #1f1c33;
  --color-felt-deep: #161423;
  --color-surface: #191628;
  --color-surface-2: #231e3a;
  --color-surface-3: #2c2547;
  --color-border: rgba(245, 213, 71, 0.20);
  --color-border-strong: rgba(245, 213, 71, 0.45);

  --color-ink: #f0e8d4;
  --color-ink-muted: #9c907a;
  --color-ink-faint: #5a5340;

  --color-gold: #f5d547;
  --color-gold-deep: #c9a82a;
  --color-gold-glow: rgba(245, 213, 71, 0.55);

  --color-accent: #ff2e88;
  --color-accent-hover: #ff4a9a;
  --color-accent-pressed: #d61f6f;
  --color-accent-contrast: #06050a;

  /* Triad Neon supporting accents (Kowloon-only). */
  --kowloon-cyan: #22e3ff;
  --kowloon-jade: #1bd182;
  --kowloon-lilac: #c855ff;

  --color-win: #22e3ff;
  --color-near-miss: #ff2e88;
  --color-success: #1bd182;
  --color-danger: #ff3a3a;
  --color-warning: #ff2e88;

  --clip-red: #ff3a3a;
  --clip-blue: #22e3ff;
  --clip-green: #1bd182;
  --clip-yellow: #f5d547;
  --clip-purple: #c855ff;
  --clip-pink: #ff2e88;

  --font-display: 'DM Serif Display', 'Cormorant Garamond', Georgia, serif;
  --font-body: 'Cormorant Garamond', 'DM Serif Text', Georgia, serif;
  --font-mono: 'VT323', 'Courier Prime', ui-monospace, monospace;
  --font-hk: 'Noto Serif HK', 'Shippori Mincho', serif;
  --font-pixel: 'VT323', monospace;
  --mono-scale: 1.35;
}

/* Page-level overlay rules — driven by [data-theme]; pure CSS, no JSX. */
[data-theme='pachinko'] body::after,
[data-theme='kowloon'] body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}
[data-theme='kowloon'] body::after {
  background-image: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.04) 0 1px,
    transparent 1px 3px
  );
  mix-blend-mode: screen;
  opacity: 0.6;
}
[data-theme='pachinko'] body::after {
  /* Pachinko keeps its existing paper-grain treatment elsewhere; this overlay is no-op. */
  display: none;
}
```

- [ ] **Step 6: Add `mahjong` motif glyph**

Open `src/ui/parlour/Motif.tsx`. Locate the `switch (sym)` block. Insert a new case **before** the `case 'fleur':` / `default:` case:

```tsx
    case 'mahjong':
      return (
        <svg {...props}>
          <circle cx="30" cy="30" r="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
          {/* Tile body */}
          <rect
            x="14" y="10" width="32" height="40" rx="2"
            fill={c} fillOpacity="0.12"
            stroke={c} strokeWidth="1"
          />
          {/* Hatch lines for tile face */}
          <line x1="20" y1="20" x2="40" y2="20" stroke={c} strokeWidth="0.6" opacity="0.5" />
          <line x1="20" y1="40" x2="40" y2="40" stroke={c} strokeWidth="0.6" opacity="0.5" />
          {/* 中 glyph stylized as crossbars + center square */}
          <rect x="26" y="22" width="8" height="16" fill="none" stroke={c} strokeWidth="1.5" />
          <line x1="22" y1="30" x2="38" y2="30" stroke={c} strokeWidth="1.5" />
          <line x1="30" y1="14" x2="30" y2="46" stroke={c} strokeWidth="1.5" />
        </svg>
      );
```

- [ ] **Step 7: Add Motif test for mahjong (if Motif.test.tsx doesn't exist, create it)**

Open `src/ui/parlour/__tests__/Motif.test.tsx`. If the file doesn't exist, create it. Add (or extend with) this test:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Motif } from '../Motif.tsx';

describe('Motif', () => {
  it('renders the mahjong glyph when symbol is mahjong', () => {
    const { container } = render(<Motif symbol="mahjong" size={60} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // Mahjong has a tile rect + center cross — assert structure.
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back to fleur for an unknown symbol', () => {
    // @ts-expect-error — testing runtime fallback for an invalid symbol
    const { container } = render(<Motif symbol="unknown-symbol" size={60} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 8: Run motif test**

Run: `npm test -- src/ui/parlour/__tests__/Motif.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 9: Append HK fonts to index.html**

Open `index.html`. Locate the `<link>` tag at line ~13 with `fonts.googleapis.com/css2?family=...`. Append `&family=Noto+Serif+HK:wght@400;600;700&family=Shippori+Mincho:wght@400;500;700` to the URL **before** `&display=swap`. The href becomes:

```
https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Serif+Text:ital@0;1&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=VT323&family=Inter:wght@400;500;600;700&family=Noto+Serif+HK:wght@400;600;700&family=Shippori+Mincho:wght@400;500;700&display=swap
```

- [ ] **Step 10: Run full typecheck + lint + tests**

Run: `npm run typecheck && npm run lint && npm test`
Expected: All green.

- [ ] **Step 11: Manual smoke — Pachinko byte-identical**

Run: `npm run dev`. Open `http://localhost:5173/kakeguruimasho/` in a browser. Confirm the app renders at default theme (Pachinko). No visual diff vs. before this task. Open Settings → confirm "Kowloon Electric" appears in the theme picker. Pick it; confirm the page now uses Triad Neon palette (dark purple bg, magenta accents). Flip back to Pachinko; confirm full restore.

Stop the dev server (Ctrl+C).

- [ ] **Step 12: Commit**

```bash
git add src/styles/themes.ts src/styles/themes.css src/styles/__tests__/themes.test.ts \
        src/ui/parlour/Motif.tsx src/ui/parlour/__tests__/Motif.test.tsx index.html
git commit -m "$(cat <<'EOF'
feat(themes): register kowloon + Triad Neon tokens + ThemeVisual interface

Adds the seventh theme (Kowloon Electric, status: stub) with full
Triad Neon token map, mahjong motif glyph, Cantonese/Japanese serif
fonts, and a strictly-typed ThemeVisual profile on ThemeMeta.
Pachinko gets an explicit visual block documenting the defaults;
the six other stubs leave visual undefined. Theme is pickable in
Settings; renders pachinko-shaped JSX with Triad Neon tokens until
dispatchers land in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Kowloon overlay primitives — NeonSign, CRTBezel, Scanlines

Three core overlay primitives. Not yet imported by any variant component; they're the building blocks for Tasks 4–11.

**Files:**
- Create: `src/ui/kowloon/NeonSign.tsx`
- Create: `src/ui/kowloon/CRTBezel.tsx`
- Create: `src/ui/kowloon/Scanlines.tsx`
- Create: `src/ui/kowloon/kowloon.css`
- Create: `src/ui/kowloon/index.ts`
- Create: `src/ui/kowloon/__tests__/NeonSign.test.tsx`
- Create: `src/ui/kowloon/__tests__/CRTBezel.test.tsx`
- Create: `src/ui/kowloon/__tests__/Scanlines.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/ui/kowloon/__tests__/NeonSign.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NeonSign } from '../NeonSign.tsx';

describe('NeonSign', () => {
  it('renders the Cantonese character + English label', () => {
    render(<NeonSign ch="發" en="FORTUNE" sub="HALL · 9F" />);
    expect(screen.getByText('發')).toBeInTheDocument();
    expect(screen.getByText('FORTUNE')).toBeInTheDocument();
    expect(screen.getByText('HALL · 9F')).toBeInTheDocument();
  });

  it('applies the provided color to the glow text-shadow', () => {
    const { container } = render(
      <NeonSign ch="賭" en="STAKE" color="#ff2e88" />,
    );
    const ch = container.querySelector('[data-testid="neon-sign-ch"]');
    expect(ch).not.toBeNull();
    expect((ch as HTMLElement).style.color).toBe('rgb(255, 46, 136)');
  });
});
```

Create `src/ui/kowloon/__tests__/CRTBezel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CRTBezel } from '../CRTBezel.tsx';

describe('CRTBezel', () => {
  it('renders children inside the phosphor cavity', () => {
    render(
      <CRTBezel label="CH 03">
        <div>screen content</div>
      </CRTBezel>,
    );
    expect(screen.getByText('screen content')).toBeInTheDocument();
    expect(screen.getByText('CH 03')).toBeInTheDocument();
  });

  it('shows the tally light when tally is true', () => {
    const { container } = render(
      <CRTBezel label="CH 03" tally>
        <div>x</div>
      </CRTBezel>,
    );
    expect(container.querySelector('[data-testid="crt-tally"]')).not.toBeNull();
  });

  it('hides the tally light when tally is false', () => {
    const { container } = render(
      <CRTBezel label="CH 03">
        <div>x</div>
      </CRTBezel>,
    );
    expect(container.querySelector('[data-testid="crt-tally"]')).toBeNull();
  });
});
```

Create `src/ui/kowloon/__tests__/Scanlines.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Scanlines } from '../Scanlines.tsx';

describe('Scanlines', () => {
  it('renders a non-interactive overlay div', () => {
    const { container } = render(<Scanlines />);
    const overlay = container.querySelector('[data-testid="scanlines-overlay"]');
    expect(overlay).not.toBeNull();
    const styles = (overlay as HTMLElement).style;
    expect(styles.pointerEvents).toBe('none');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/kowloon/`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement NeonSign.tsx**

Create `src/ui/kowloon/NeonSign.tsx`:

```tsx
/**
 * NeonSign — vertical Cantonese character + horizontal English label.
 *
 * Source design: `kowloon-neon.jsx:94` (NeonSignA). Used as section
 * headers and Kowloon mastheads. Glow is driven by the provided color
 * via layered text-shadow.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface NeonSignProps {
  /** Cantonese / Japanese character displayed vertically. */
  ch: string;
  /** Horizontal English/romaji label (uppercase tracked). */
  en: string;
  /** Optional sub-label in mono. */
  sub?: string;
  /** Glow color (hex). Defaults to magenta. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function NeonSign({
  ch,
  en,
  sub,
  color = '#ff2e88',
  className,
  style,
}: NeonSignProps): ReactElement {
  return (
    <div
      className={`kowloon-neon-sign ${className ?? ''}`}
      style={style}
      data-testid="neon-sign"
    >
      <div className="kowloon-neon-sign__bracket" aria-hidden />
      <div
        className="kowloon-neon-sign__ch"
        data-testid="neon-sign-ch"
        style={{
          color,
          textShadow: `0 0 6px ${color}, 0 0 16px ${color}aa, 0 0 30px ${color}66`,
        }}
      >
        {ch}
      </div>
      <div className="kowloon-neon-sign__body">
        <div
          className="kowloon-neon-sign__en"
          style={{
            color,
            textShadow: `0 0 8px ${color}, 0 0 22px ${color}99`,
          }}
        >
          {en}
        </div>
        {sub && <div className="kowloon-neon-sign__sub">{sub}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement CRTBezel.tsx**

Create `src/ui/kowloon/CRTBezel.tsx`:

```tsx
/**
 * CRTBezel — phosphor-frame wrapper with scanlines + curvature vignette.
 *
 * Source design: `kowloon-neon.jsx:133` (CRTBezelA). Wraps any content
 * inside a CRT-style frame: outer plastic shell, inner cavity with
 * radial phosphor glow, scanline overlay, vignette, and a
 * channel-label tally in the top-right corner.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface CRTBezelProps {
  children: ReactNode;
  /** Channel label (e.g. "CH 03 · LIVE"). */
  label?: string;
  /** Show the tally LED (signals an active broadcast). */
  tally?: boolean;
  /** Width override; defaults to 100% of parent. */
  width?: number | string;
  /** Height override. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function CRTBezel({
  children,
  label,
  tally = false,
  width,
  height,
  className,
  style,
}: CRTBezelProps) {
  return (
    <div
      className={`kowloon-crt-bezel ${className ?? ''}`}
      style={{ width, height, ...style }}
      data-testid="crt-bezel"
    >
      <div className="kowloon-crt-bezel__cavity">
        <div className="kowloon-crt-bezel__screen">
          {children}
          <div className="kowloon-crt-bezel__scanlines" aria-hidden />
          <div className="kowloon-crt-bezel__vignette" aria-hidden />
        </div>
      </div>
      {label && (
        <div className="kowloon-crt-bezel__label-row">
          {tally && (
            <span
              className="kowloon-crt-bezel__tally"
              data-testid="crt-tally"
              aria-hidden
            />
          )}
          <span className="kowloon-crt-bezel__label">{label}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement Scanlines.tsx**

Create `src/ui/kowloon/Scanlines.tsx`:

```tsx
/**
 * Scanlines — page or container-level CRT scanline overlay.
 *
 * For a global page-level overlay, prefer the CSS rule on `body::after`
 * applied via `[data-theme='kowloon']` (see themes.css). This component
 * is for embedded use: scanlines local to a card or section.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface ScanlinesProps {
  /** Stripe opacity. Defaults to 0.04. */
  opacity?: number;
  /** Vertical gap between stripes (px). Defaults to 3. */
  gap?: number;
  className?: string;
  style?: CSSProperties;
}

export function Scanlines({
  opacity = 0.04,
  gap = 3,
  className,
  style,
}: ScanlinesProps): ReactElement {
  return (
    <div
      className={`kowloon-scanlines ${className ?? ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
        backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,${opacity}) 0 1px, transparent 1px ${gap}px)`,
        ...style,
      }}
      data-testid="scanlines-overlay"
      aria-hidden
    />
  );
}
```

- [ ] **Step 6: Implement kowloon.css**

Create `src/ui/kowloon/kowloon.css`:

```css
/* ─── Kowloon primitive styles ───────────────────────────────── */

.kowloon-neon-sign {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid var(--color-border);
  background: #06050a;
  position: relative;
}

.kowloon-neon-sign__bracket {
  width: 8px;
  background: linear-gradient(180deg, #2a2520, #18140f);
  border-right: 1px solid #000;
}

.kowloon-neon-sign__ch {
  padding: 14px 10px;
  font-family: var(--font-hk, 'Noto Serif HK', serif);
  font-weight: 700;
  font-size: 32px;
  letter-spacing: 0;
  line-height: 1;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.kowloon-neon-sign__body {
  padding: 14px 16px;
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 96px;
}

.kowloon-neon-sign__en {
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.kowloon-neon-sign__sub {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-ink-muted);
  letter-spacing: 0.25em;
  text-transform: uppercase;
}

/* CRT bezel */

.kowloon-crt-bezel {
  background: linear-gradient(135deg, #2a2438, #15121f);
  padding: 14px;
  position: relative;
  box-shadow:
    inset 0 1px 0 #4a3f6a,
    inset 0 -2px 0 #06050a,
    0 6px 0 #06050a;
}

.kowloon-crt-bezel__cavity {
  width: 100%;
  height: 100%;
  background: #06050a;
  border-radius: 16px;
  box-shadow:
    inset 0 0 30px rgba(255, 46, 136, 0.13),
    inset 0 0 6px rgba(0, 0, 0, 0.9);
  position: relative;
  overflow: hidden;
}

.kowloon-crt-bezel__screen {
  position: absolute;
  inset: 6px;
  background: radial-gradient(ellipse at center, #110a1c 0%, #050308 100%);
  border-radius: 12px;
  overflow: hidden;
}

.kowloon-crt-bezel__scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.4) 0 1px,
    transparent 1px 3px
  );
}

.kowloon-crt-bezel__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, 0.5) 100%
  );
  border-radius: 12px;
}

.kowloon-crt-bezel__label-row {
  position: absolute;
  top: 22px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.kowloon-crt-bezel__tally {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent, #ff2e88);
  box-shadow: 0 0 8px var(--color-accent, #ff2e88);
}

.kowloon-crt-bezel__label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-ink-faint);
  letter-spacing: 0.2em;
}
```

- [ ] **Step 7: Create index.ts barrel + import CSS**

Create `src/ui/kowloon/index.ts`:

```ts
export { NeonSign } from './NeonSign.tsx';
export type { NeonSignProps } from './NeonSign.tsx';
export { CRTBezel } from './CRTBezel.tsx';
export type { CRTBezelProps } from './CRTBezel.tsx';
export { Scanlines } from './Scanlines.tsx';
export type { ScanlinesProps } from './Scanlines.tsx';
import './kowloon.css';
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- src/ui/kowloon/`
Expected: PASS — 7 tests green (3 NeonSign + 3 CRTBezel + 1 Scanlines).

- [ ] **Step 9: Run typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add src/ui/kowloon/
git commit -m "$(cat <<'EOF'
feat(kowloon): core overlay primitives (NeonSign, CRTBezel, Scanlines)

Three foundational Kowloon primitives — the building blocks for
variant components. Not yet imported anywhere; pure visual leaves.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Kowloon physical primitives — MahjongTile, ArcadeToken, Stamp, WireBundle, MosaicFloor, PixelSprite

The remaining six primitives. Together with Task 2 they form the complete Kowloon vocabulary.

**Files:**
- Create: `src/ui/kowloon/MahjongTile.tsx`
- Create: `src/ui/kowloon/ArcadeToken.tsx`
- Create: `src/ui/kowloon/Stamp.tsx`
- Create: `src/ui/kowloon/WireBundle.tsx`
- Create: `src/ui/kowloon/MosaicFloor.tsx`
- Create: `src/ui/kowloon/PixelSprite.tsx`
- Create: `src/ui/kowloon/__tests__/MahjongTile.test.tsx`
- Create: `src/ui/kowloon/__tests__/ArcadeToken.test.tsx`
- Create: `src/ui/kowloon/__tests__/Stamp.test.tsx`
- Create: `src/ui/kowloon/__tests__/WireBundle.test.tsx`
- Create: `src/ui/kowloon/__tests__/MosaicFloor.test.tsx`
- Create: `src/ui/kowloon/__tests__/PixelSprite.test.tsx`
- Modify: `src/ui/kowloon/index.ts`
- Modify: `src/ui/kowloon/kowloon.css`

- [ ] **Step 1: Write failing tests for all six primitives**

Create `src/ui/kowloon/__tests__/MahjongTile.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MahjongTile } from '../MahjongTile.tsx';

describe('MahjongTile', () => {
  it('renders the kanji character + sub label', () => {
    render(<MahjongTile ch="東" sub="East" />);
    expect(screen.getByText('東')).toBeInTheDocument();
    expect(screen.getByText('East')).toBeInTheDocument();
  });
});
```

Create `src/ui/kowloon/__tests__/ArcadeToken.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ArcadeToken } from '../ArcadeToken.tsx';

describe('ArcadeToken', () => {
  it('renders an SVG with the denomination text', () => {
    const { container } = render(<ArcadeToken denom="II" color="#22e3ff" />);
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('II');
  });
});
```

Create `src/ui/kowloon/__tests__/Stamp.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stamp } from '../Stamp.tsx';

describe('Stamp', () => {
  it('renders the kanji + English label', () => {
    render(<Stamp ch="檢" en="INSPECTED" color="#ff2e88" />);
    expect(screen.getByText('檢')).toBeInTheDocument();
    expect(screen.getByText('INSPECTED')).toBeInTheDocument();
  });
});
```

Create `src/ui/kowloon/__tests__/WireBundle.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WireBundle } from '../WireBundle.tsx';

describe('WireBundle', () => {
  it('renders an SVG with multiple stroke paths', () => {
    const { container } = render(<WireBundle width={280} />);
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThanOrEqual(4);
  });
});
```

Create `src/ui/kowloon/__tests__/MosaicFloor.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MosaicFloor } from '../MosaicFloor.tsx';

describe('MosaicFloor', () => {
  it('renders a div with mosaic background and provided dimensions', () => {
    const { container } = render(<MosaicFloor width={140} height={60} />);
    const div = container.querySelector('[data-testid="mosaic-floor"]');
    expect(div).not.toBeNull();
    expect((div as HTMLElement).style.width).toBe('140px');
  });
});
```

Create `src/ui/kowloon/__tests__/PixelSprite.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PixelSprite } from '../PixelSprite.tsx';

describe('PixelSprite', () => {
  it('renders a 16x16 sprite as SVG rects from rows array', () => {
    const rows = [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......1.........',
    ];
    const { container } = render(
      <PixelSprite rows={rows} colors={['', '#ff0000']} scale={2} />,
    );
    const rects = container.querySelectorAll('svg rect');
    expect(rects.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/kowloon/`
Expected: 6 new failures (modules not found).

- [ ] **Step 3: Implement MahjongTile.tsx**

Create `src/ui/kowloon/MahjongTile.tsx`:

```tsx
/**
 * MahjongTile — cream tile face with HK serif glyph + sub-label.
 *
 * Source design: `kowloon-neon.jsx:223` (MahjongTileA). The face is a
 * static cream gradient; the glyph color defaults to acid jade for
 * dragon tiles. Used in the spin cabinet's reels and in the tile-row
 * inside ritual cards.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface MahjongTileProps {
  /** Cantonese / Japanese character (e.g. "東", "中"). */
  ch: string;
  /** Sub-label below the glyph (e.g. "East", "Chun"). */
  sub?: string;
  /** Tile width in px. Defaults to 44. */
  size?: number;
  /** Glyph color override. */
  glyphColor?: string;
  className?: string;
  style?: CSSProperties;
}

export function MahjongTile({
  ch,
  sub,
  size = 44,
  glyphColor = '#1ba368',
  className,
  style,
}: MahjongTileProps): ReactElement {
  return (
    <div
      className={`kowloon-mahjong-tile ${className ?? ''}`}
      style={{
        width: size,
        height: size * 1.35,
        ...style,
      }}
      data-testid="mahjong-tile"
    >
      <div
        className="kowloon-mahjong-tile__glyph"
        style={{
          color: glyphColor,
          fontSize: size * 0.55,
        }}
      >
        {ch}
      </div>
      {sub && <div className="kowloon-mahjong-tile__sub">{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Implement ArcadeToken.tsx**

Create `src/ui/kowloon/ArcadeToken.tsx`:

```tsx
/**
 * ArcadeToken — knurled SVG token with denomination label.
 *
 * Source design: `kowloon-neon.jsx:247` (ArcadeTokenA). Kowloon's
 * equivalent of the Pachinko `<Chip>`. Renders a circular token with
 * radial highlight, knurled rim ticks, and a denomination glyph.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface ArcadeTokenProps {
  /** Token color (hex). */
  color: string;
  /** Denomination label (single character recommended: I / II / III / B / ★). */
  denom: string;
  /** Token diameter in px. Defaults to 56. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function ArcadeToken({
  color,
  denom,
  size = 56,
  className,
  style,
}: ArcadeTokenProps): ReactElement {
  const id = `tok-${color.replace('#', '')}-${size}`;
  const tickCount = 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`kowloon-arcade-token ${className ?? ''}`}
      style={{
        filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 6px ${color}66)`,
        ...style,
      }}
      data-testid="arcade-token"
      aria-hidden
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="40%" stopColor={color} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="#06050a" />
      <circle cx="50" cy="50" r="47" fill={color} opacity="0.92" />
      {Array.from({ length: tickCount }).map((_, i) => {
        const a = (i / tickCount) * Math.PI * 2;
        const r1 = 46;
        const r2 = 42;
        const x1 = 50 + Math.cos(a) * r1;
        const y1 = 50 + Math.sin(a) * r1;
        const x2 = 50 + Math.cos(a) * r2;
        const y2 = 50 + Math.sin(a) * r2;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#000"
            strokeWidth="1.5"
            opacity="0.5"
          />
        );
      })}
      <circle cx="50" cy="50" r="36" fill="none" stroke="#000" strokeWidth="1" opacity="0.6" />
      <circle cx="50" cy="50" r="34" fill={`url(#${id})`} opacity="0.5" />
      <text
        x="50"
        y="53"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-pixel, VT323, monospace)"
        fontSize="36"
        fill="#06050a"
        fontWeight="700"
        style={{ letterSpacing: '0.05em' }}
      >
        {denom}
      </text>
      <rect x="42" y="4" width="16" height="3" fill="#06050a" />
    </svg>
  );
}
```

- [ ] **Step 5: Implement Stamp.tsx**

Create `src/ui/kowloon/Stamp.tsx`:

```tsx
/**
 * Stamp — rotated inspection-stamp badge.
 *
 * Source design: `kowloon-neon.jsx:181` (StampA). Bordered tag with
 * kanji + English label, rotated by a few degrees. Used as corner
 * decorations on covers and section frames.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface StampProps {
  /** Cantonese / Japanese character (e.g. "檢", "廠"). */
  ch: string;
  /** English label (uppercase tracked). */
  en: string;
  /** Stamp ink color. */
  color: string;
  /** Rotation in degrees. Defaults to -8. */
  rotate?: number;
  className?: string;
  style?: CSSProperties;
}

export function Stamp({
  ch,
  en,
  color,
  rotate = -8,
  className,
  style,
}: StampProps): ReactElement {
  return (
    <div
      className={`kowloon-stamp ${className ?? ''}`}
      style={{
        border: `1.5px solid ${color}`,
        transform: `rotate(${rotate}deg)`,
        color,
        textShadow: `0 0 8px ${color}66`,
        ...style,
      }}
      data-testid="stamp"
    >
      <span className="kowloon-stamp__ch">{ch}</span>
      <span className="kowloon-stamp__en">{en}</span>
    </div>
  );
}
```

- [ ] **Step 6: Implement WireBundle.tsx**

Create `src/ui/kowloon/WireBundle.tsx`:

```tsx
/**
 * WireBundle — inline cable-bundle SVG divider.
 *
 * Source design: `kowloon-neon.jsx:200` (WireBundleA). Four sine-wave
 * paths in saturated triad colors with three zip-tie clamps along the
 * length. Used as section dividers and across the top of cabinets.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface WireBundleProps {
  /** Total width in px. Defaults to 280. */
  width?: number;
  /** Total height in px. Defaults to 22. */
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const COLORS = ['#ff2e88', '#22e3ff', '#1bd182', '#f5d547'] as const;
const SAMPLE_COUNT = 30;

export function WireBundle({
  width = 280,
  height = 22,
  className,
  style,
}: WireBundleProps): ReactElement {
  const cy = height / 2;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`kowloon-wire-bundle ${className ?? ''}`}
      style={{ display: 'block', ...style }}
      aria-hidden
    >
      {COLORS.map((color, i) => {
        const phase = i * 0.7;
        const amp = 3 + i * 0.5;
        const segments = Array.from({ length: SAMPLE_COUNT }, (_, n) => {
          const x = (n / (SAMPLE_COUNT - 1)) * width;
          const y = cy + Math.sin(n * 0.4 + phase) * amp;
          return `${n === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(' ');
        return (
          <path
            key={color}
            d={segments}
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            opacity="0.85"
            strokeLinecap="round"
          />
        );
      })}
      {[0.18, 0.52, 0.84].map((p) => (
        <g key={p}>
          <rect
            x={width * p - 4}
            y={cy - 5}
            width="8"
            height="10"
            fill="#1a1a1a"
            stroke="rgba(245,213,71,0.45)"
            strokeWidth="0.5"
          />
          <rect
            x={width * p - 5}
            y={cy - 3}
            width="10"
            height="2"
            fill="#5a5340"
            opacity="0.4"
          />
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 7: Implement MosaicFloor.tsx**

Create `src/ui/kowloon/MosaicFloor.tsx`:

```tsx
/**
 * MosaicFloor — tiled-floor background strip.
 *
 * Source design: `kowloon-neon.jsx:328` (MosaicFloorA). 12px-square
 * checkerboard via repeating-conic-gradient, with a downward fade.
 * Used as the bottom strip of the Kowloon shell + cabinet bases.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface MosaicFloorProps {
  width?: number | string;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

export function MosaicFloor({
  width = 140,
  height = 60,
  className,
  style,
}: MosaicFloorProps): ReactElement {
  return (
    <div
      className={`kowloon-mosaic-floor ${className ?? ''}`}
      style={{
        width,
        height,
        backgroundImage:
          'repeating-conic-gradient(var(--color-felt) 0deg 90deg, var(--color-felt-deep) 90deg 180deg)',
        backgroundSize: '12px 12px',
        border: '1px solid var(--color-border)',
        position: 'relative',
        ...style,
      }}
      data-testid="mosaic-floor"
      aria-hidden
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4))',
        }}
      />
    </div>
  );
}
```

- [ ] **Step 8: Implement PixelSprite.tsx**

Create `src/ui/kowloon/PixelSprite.tsx`:

```tsx
/**
 * PixelSprite — 16×16 sprite renderer.
 *
 * Source design: `kowloon-rain.jsx:36` (PixelSprite). Takes an array
 * of 16 strings (one per row), each 16 chars wide. '.' = empty,
 * digits 0–F index into the `colors` array.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface PixelSpriteProps {
  /** 16 strings, each 16 chars long. */
  rows: readonly string[];
  /** Color palette indexed by hex digit (0–F). Index 0 is empty. */
  colors: readonly string[];
  /** Pixel scale multiplier. Defaults to 2 (32×32 visual). */
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export function PixelSprite({
  rows,
  colors,
  scale = 2,
  className,
  style,
}: PixelSpriteProps): ReactElement {
  const size = 16;
  const w = size * scale;
  return (
    <svg
      width={w}
      height={w}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`kowloon-pixel-sprite ${className ?? ''}`}
      style={style}
      aria-hidden
    >
      {rows.map((row, y) =>
        Array.from(row).map((c, x) => {
          if (c === '.' || c === ' ') return null;
          const fill = colors[parseInt(c, 16)] ?? colors[0];
          if (!fill) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={fill}
            />
          );
        }),
      )}
    </svg>
  );
}
```

- [ ] **Step 9: Append CSS for new primitives to kowloon.css**

Open `src/ui/kowloon/kowloon.css` and append:

```css
/* Mahjong tile */
.kowloon-mahjong-tile {
  background: linear-gradient(180deg, #f4ecd6, #e0d5b8);
  border: 1px solid #b8a978;
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -2px 0 #c2b48a,
    0 2px 0 #4a4030;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px 0;
  position: relative;
}

.kowloon-mahjong-tile__glyph {
  font-family: var(--font-hk, 'Noto Serif HK', serif);
  font-weight: 700;
  line-height: 1;
  margin-top: 2px;
}

.kowloon-mahjong-tile__sub {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.15em;
  color: #7a6a3a;
  margin-top: 2px;
  text-transform: uppercase;
}

/* Stamp */
.kowloon-stamp {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.25em;
  opacity: 0.9;
  text-transform: uppercase;
}

.kowloon-stamp__ch {
  font-family: var(--font-hk, 'Noto Serif HK', serif);
  font-size: 14px;
}
```

- [ ] **Step 10: Update index.ts to export new primitives**

Open `src/ui/kowloon/index.ts` and replace contents with:

```ts
export { NeonSign } from './NeonSign.tsx';
export type { NeonSignProps } from './NeonSign.tsx';
export { CRTBezel } from './CRTBezel.tsx';
export type { CRTBezelProps } from './CRTBezel.tsx';
export { Scanlines } from './Scanlines.tsx';
export type { ScanlinesProps } from './Scanlines.tsx';
export { MahjongTile } from './MahjongTile.tsx';
export type { MahjongTileProps } from './MahjongTile.tsx';
export { ArcadeToken } from './ArcadeToken.tsx';
export type { ArcadeTokenProps } from './ArcadeToken.tsx';
export { Stamp } from './Stamp.tsx';
export type { StampProps } from './Stamp.tsx';
export { WireBundle } from './WireBundle.tsx';
export type { WireBundleProps } from './WireBundle.tsx';
export { MosaicFloor } from './MosaicFloor.tsx';
export type { MosaicFloorProps } from './MosaicFloor.tsx';
export { PixelSprite } from './PixelSprite.tsx';
export type { PixelSpriteProps } from './PixelSprite.tsx';
import './kowloon.css';
```

- [ ] **Step 11: Run tests + typecheck + lint**

Run: `npm test -- src/ui/kowloon/ && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 12: Commit**

```bash
git add src/ui/kowloon/
git commit -m "$(cat <<'EOF'
feat(kowloon): physical primitives (MahjongTile, ArcadeToken, Stamp, WireBundle, MosaicFloor, PixelSprite)

Six bespoke Kowloon primitives — the rest of the visual vocabulary.
Together with Task 2's overlays they cover every pixel of the
design canvas.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Streak dispatcher + KowloonStreak variant

First user-visible variant. After this lands, `theme=kowloon` shows a neon LED-bar streak ribbon on Home; `theme=pachinko` continues to show the existing lantern ribbon.

**Files:**
- Create: `src/features/kowloon/KowloonStreak.tsx`
- Create: `src/features/kowloon/kowloon-screens.css`
- Create: `src/features/kowloon/index.ts`
- Create: `src/features/kowloon/__tests__/KowloonStreak.test.tsx`
- Create: `src/features/jar/Streak.tsx`
- Create: `src/features/jar/__tests__/Streak.test.tsx`
- Modify: `src/features/jar/index.ts`
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/kowloon/__tests__/KowloonStreak.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KowloonStreak } from '../KowloonStreak.tsx';

describe('KowloonStreak', () => {
  it('renders an LED-bar styled streak indicator', () => {
    const { container } = render(<KowloonStreak />);
    expect(container.querySelector('[data-testid="kowloon-streak"]')).not.toBeNull();
  });
});
```

Create `src/features/jar/__tests__/Streak.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeContext } from '../../styles/theme-context.ts';
import { THEMES } from '../../styles/themes.ts';
import { Streak } from '../Streak.tsx';

describe('Streak dispatcher', () => {
  it('renders PachinkoStreak when theme is pachinko', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <Streak />
      </ThemeContext.Provider>,
    );
    // PachinkoStreak emits its lantern-flanked ribbon — assert no kowloon test-id.
    expect(container.querySelector('[data-testid="kowloon-streak"]')).toBeNull();
  });

  it('renders KowloonStreak when theme is kowloon', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <Streak />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-streak"]')).not.toBeNull();
  });

  it('falls back to PachinkoStreak when visual is undefined', () => {
    const customMeta = { ...THEMES.house, visual: undefined };
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'house',
          themeMeta: customMeta,
          setTheme: () => {},
        }}
      >
        <Streak />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-streak"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/kowloon/ src/features/jar/__tests__/Streak.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement KowloonStreak.tsx**

Create `src/features/kowloon/KowloonStreak.tsx`:

```tsx
/**
 * KowloonStreak — LED-bar streak ribbon for the Kowloon theme.
 *
 * Source design: `kowloon-screens.jsx` Hall · Home section.
 * Reads the same selectors as PachinkoStreak (daily streak +
 * best). Renders as a thin cyan-glow LED bar with the streak
 * count in pixel font.
 */

import type { ReactElement } from 'react';
import { useAppStore } from '../../state/store.ts';
import { selectDailyStreak } from '../../state/selectors.ts';

export interface KowloonStreakProps {
  jarId?: string;
}

export function KowloonStreak({ jarId }: KowloonStreakProps = {}): ReactElement {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const resolvedJarId = jarId ?? activeJarId;
  const streak = useAppStore((s) => selectDailyStreak(s, resolvedJarId));

  const current = streak?.current ?? 0;
  const best = streak?.best ?? 0;

  return (
    <div
      className="kowloon-streak"
      data-testid="kowloon-streak"
      aria-label={`Streak ${current} days, best ${best}`}
    >
      <div className="kowloon-streak__bar">
        <div className="kowloon-streak__label">STREAK</div>
        <div className="kowloon-streak__count">{current}</div>
        <div className="kowloon-streak__sep">·</div>
        <div className="kowloon-streak__best">BEST {best}</div>
      </div>
    </div>
  );
}
```

Note: this assumes `selectDailyStreak(state, jarId)` exists in `src/state/selectors.ts` (verify before implementing — if the selector name differs, mirror what `PachinkoStreak.tsx` uses).

- [ ] **Step 4: Implement KowloonStreak CSS**

Create `src/features/kowloon/kowloon-screens.css`:

```css
.kowloon-streak {
  width: 100%;
  padding: 8px 0;
}

.kowloon-streak__bar {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  font-family: var(--font-pixel, var(--font-mono));
  color: var(--kowloon-cyan, #22e3ff);
  text-shadow: 0 0 6px var(--kowloon-cyan, #22e3ff);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-size: 14px;
}

.kowloon-streak__label {
  font-size: 10px;
  letter-spacing: 0.4em;
  color: var(--color-ink-faint);
  text-shadow: none;
}

.kowloon-streak__count {
  font-size: 22px;
  color: var(--color-gold);
  text-shadow: 0 0 8px var(--color-gold);
}

.kowloon-streak__sep {
  color: var(--color-ink-faint);
  text-shadow: none;
}

.kowloon-streak__best {
  font-size: 11px;
  color: var(--color-ink-muted);
  text-shadow: none;
}
```

- [ ] **Step 5: Create features/kowloon/index.ts**

Create `src/features/kowloon/index.ts`:

```ts
export { KowloonStreak } from './KowloonStreak.tsx';
export type { KowloonStreakProps } from './KowloonStreak.tsx';
import './kowloon-screens.css';
```

- [ ] **Step 6: Implement Streak dispatcher**

Create `src/features/jar/Streak.tsx`:

```tsx
/**
 * Streak — theme-driven streak dispatcher.
 *
 * Reads `themeMeta.visual.streak` and renders the appropriate variant.
 * Falls back to `PachinkoStreak` when `visual` is undefined.
 */

import type { ReactElement } from 'react';
import { useTheme } from '../../styles/theme-context.ts';
import { PachinkoStreak } from './PachinkoStreak.tsx';
import { KowloonStreak } from '../kowloon/KowloonStreak.tsx';
import type { JarId } from '../../types/ids.ts';

export interface StreakProps {
  jarId?: JarId;
}

export function Streak({ jarId }: StreakProps = {}): ReactElement {
  const { themeMeta } = useTheme();
  switch (themeMeta.visual?.streak ?? 'lantern') {
    case 'led-bar':
      return <KowloonStreak jarId={jarId} />;
    case 'lantern':
      return <PachinkoStreak jarId={jarId} />;
  }
}
```

- [ ] **Step 7: Update src/features/jar/index.ts to export Streak**

Open `src/features/jar/index.ts`. Add:

```ts
export { Streak } from './Streak.tsx';
export type { StreakProps } from './Streak.tsx';
```

(Keep the existing `PachinkoStreak` export — `Streak` calls it directly.)

- [ ] **Step 8: Update src/routes/Home.tsx import**

Open `src/routes/Home.tsx`. Change the import:

```ts
// before
import {
  ActivityFeed,
  PachinkoStreak,
  PachinkoPotMini,
} from '../features/jar/index.ts';

// after
import {
  ActivityFeed,
  Streak,
  PachinkoPotMini,
} from '../features/jar/index.ts';
```

In the JSX, replace `<PachinkoStreak />` with `<Streak />`. There should be one occurrence.

- [ ] **Step 9: Run tests + typecheck + lint**

Run: `npm test -- src/features/kowloon/ src/features/jar/ && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 10: Manual smoke**

Run: `npm run dev`. Open `http://localhost:5173/kakeguruimasho/`. Confirm Pachinko home renders the existing lantern streak. Open Settings → flip to Kowloon. Confirm the LED-bar appears on Home. Flip back; confirm restoration.

- [ ] **Step 11: Commit**

```bash
git add src/features/kowloon/ src/features/jar/Streak.tsx \
        src/features/jar/__tests__/Streak.test.tsx \
        src/features/jar/index.ts src/routes/Home.tsx
git commit -m "$(cat <<'EOF'
feat(kowloon): Streak dispatcher + KowloonStreak LED-bar variant

First Kowloon variant component lands. Streak dispatcher reads
themeMeta.visual.streak and picks PachinkoStreak (default fallback)
or KowloonStreak. Home.tsx import swapped to the dispatcher.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: PotMini dispatcher + KowloonPotMini variant

The right-rail Pot widget. After this lands, the desktop right rail shows a token tray when `theme=kowloon`.

**Files:**
- Create: `src/features/kowloon/KowloonPotMini.tsx`
- Create: `src/features/kowloon/__tests__/KowloonPotMini.test.tsx`
- Create: `src/features/jar/PotMini.tsx`
- Create: `src/features/jar/__tests__/PotMini.test.tsx`
- Modify: `src/features/kowloon/index.ts`
- Modify: `src/features/jar/index.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/kowloon/__tests__/KowloonPotMini.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KowloonPotMini } from '../KowloonPotMini.tsx';

describe('KowloonPotMini', () => {
  it('renders a token tray container', () => {
    const { container } = render(<KowloonPotMini />);
    expect(container.querySelector('[data-testid="kowloon-pot-mini"]')).not.toBeNull();
  });
});
```

Create `src/features/jar/__tests__/PotMini.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeContext } from '../../styles/theme-context.ts';
import { THEMES } from '../../styles/themes.ts';
import { PotMini } from '../PotMini.tsx';

describe('PotMini dispatcher', () => {
  it('renders KowloonPotMini when theme is kowloon', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <PotMini />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-pot-mini"]')).not.toBeNull();
  });

  it('falls back to PachinkoPotMini when visual is undefined', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'house',
          themeMeta: { ...THEMES.house, visual: undefined },
          setTheme: () => {},
        }}
      >
        <PotMini />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-pot-mini"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/kowloon/__tests__/KowloonPotMini.test.tsx src/features/jar/__tests__/PotMini.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement KowloonPotMini.tsx**

First, read `src/features/jar/PachinkoPotMini.tsx` to find the data hooks/selectors it uses (likely `selectJar` or similar). Use the same selector for the Kowloon variant.

Create `src/features/kowloon/KowloonPotMini.tsx`:

```tsx
/**
 * KowloonPotMini — right-rail token-tray widget for the Kowloon theme.
 *
 * Reads the same data as PachinkoPotMini. Renders as a row of arcade
 * tokens with a pixel-font label and the bank count.
 */

import type { ReactElement } from 'react';
import { useAppStore } from '../../state/store.ts';
import { ArcadeToken } from '../../ui/kowloon/ArcadeToken.tsx';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import type { JarId } from '../../types/ids.ts';

export interface KowloonPotMiniProps {
  jarId?: JarId;
}

const TOKEN_COLORS = ['#ff2e88', '#22e3ff', '#1bd182', '#c855ff', '#f5d547'] as const;

export function KowloonPotMini({ jarId }: KowloonPotMiniProps = {}): ReactElement {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const resolvedJarId = jarId ?? activeJarId ?? DEFAULT_JAR_ID;
  const jar = useAppStore((s) => s.jars[resolvedJarId]);
  const total = jar?.totalCaught ?? 0;

  return (
    <aside
      className="kowloon-pot-mini"
      data-testid="kowloon-pot-mini"
      aria-label={`Token tray, ${total} caught`}
    >
      <div className="kowloon-pot-mini__label">TOKEN TRAY</div>
      <div className="kowloon-pot-mini__row" aria-hidden>
        {TOKEN_COLORS.map((color, i) => (
          <ArcadeToken key={color} color={color} denom={String(i + 1)} size={28} />
        ))}
      </div>
      <div className="kowloon-pot-mini__count">{total}</div>
      <div className="kowloon-pot-mini__sub">CAUGHT</div>
    </aside>
  );
}
```

Note: if the jar state shape uses a different field than `totalCaught`, mirror what `PachinkoPotMini.tsx` reads. Verify against `src/features/jar/PachinkoPotMini.tsx` before committing.

- [ ] **Step 4: Append KowloonPotMini styles to kowloon-screens.css**

Open `src/features/kowloon/kowloon-screens.css` and append:

```css
.kowloon-pot-mini {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--font-pixel, var(--font-mono));
  color: var(--color-ink);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.kowloon-pot-mini__label {
  font-size: 10px;
  letter-spacing: 0.4em;
  color: var(--color-ink-faint);
}

.kowloon-pot-mini__row {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.kowloon-pot-mini__count {
  font-size: 24px;
  color: var(--color-gold);
  text-shadow: 0 0 8px var(--color-gold-glow);
  margin-top: 6px;
}

.kowloon-pot-mini__sub {
  font-size: 10px;
  color: var(--color-ink-muted);
  letter-spacing: 0.4em;
}
```

- [ ] **Step 5: Update features/kowloon/index.ts**

Open `src/features/kowloon/index.ts`. Add:

```ts
export { KowloonPotMini } from './KowloonPotMini.tsx';
export type { KowloonPotMiniProps } from './KowloonPotMini.tsx';
```

- [ ] **Step 6: Implement PotMini dispatcher**

Create `src/features/jar/PotMini.tsx`:

```tsx
import type { ReactElement } from 'react';
import { useTheme } from '../../styles/theme-context.ts';
import { PachinkoPotMini } from './PachinkoPotMini.tsx';
import { KowloonPotMini } from '../kowloon/KowloonPotMini.tsx';
import type { JarId } from '../../types/ids.ts';

export interface PotMiniProps {
  jarId?: JarId;
}

export function PotMini({ jarId }: PotMiniProps = {}): ReactElement {
  const { themeMeta } = useTheme();
  switch (themeMeta.visual?.potMini ?? 'koi-jar') {
    case 'token-tray':
      return <KowloonPotMini jarId={jarId} />;
    case 'koi-jar':
      return <PachinkoPotMini jarId={jarId} />;
  }
}
```

- [ ] **Step 7: Update src/features/jar/index.ts**

Add:

```ts
export { PotMini } from './PotMini.tsx';
export type { PotMiniProps } from './PotMini.tsx';
```

- [ ] **Step 8: Update src/App.tsx import + usage**

Open `src/App.tsx`. Find the import line for `PachinkoPotMini` (line ~23) and the usage (line ~121 where `rail.pot` is set).

Replace the import:

```ts
// before
import { PachinkoPotMini } from './features/jar/PachinkoPotMini.tsx';

// after
import { PotMini } from './features/jar/PotMini.tsx';
```

(If the existing import is from a barrel, adjust accordingly — the goal is that the JSX reference becomes `<PotMini />`.)

Replace the JSX reference:

```tsx
// before
rail={{ pot: <PachinkoPotMini />, ... }}

// after
rail={{ pot: <PotMini />, ... }}
```

- [ ] **Step 9: Run tests + typecheck + lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 10: Manual smoke at desktop width**

Run: `npm run dev`. Resize browser to ≥1024px (or expand window). Confirm the right-rail Pot widget shows the existing Pachinko koi-jar at default theme. Flip to Kowloon in Settings. Confirm the right-rail switches to the token tray. Flip back.

- [ ] **Step 11: Commit**

```bash
git add src/features/kowloon/KowloonPotMini.tsx \
        src/features/kowloon/kowloon-screens.css \
        src/features/kowloon/__tests__/KowloonPotMini.test.tsx \
        src/features/kowloon/index.ts \
        src/features/jar/PotMini.tsx \
        src/features/jar/__tests__/PotMini.test.tsx \
        src/features/jar/index.ts \
        src/App.tsx
git commit -m "$(cat <<'EOF'
feat(kowloon): PotMini dispatcher + KowloonPotMini token-tray variant

Right-rail Pot widget gets the dispatcher treatment. App.tsx swaps
the direct PachinkoPotMini import for the dispatcher; visuals
flip cleanly between koi-jar (Pachinko) and token-tray (Kowloon).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Masthead extraction + dispatcher + KowloonMasthead variant

The highest-blast-radius commit: extract every route's inline `<header className="parlour-masthead">` JSX into a reusable `PachinkoMasthead`, route through a `Masthead` dispatcher, and add the Kowloon variant. Snapshot test confirms byte-identical Pachinko output.

**Files:**
- Create: `src/ui/parlour/PachinkoMasthead.tsx`
- Create: `src/ui/parlour/Masthead.tsx`
- Create: `src/ui/parlour/__tests__/Masthead.test.tsx`
- Create: `src/features/kowloon/KowloonMasthead.tsx`
- Create: `src/features/kowloon/__tests__/KowloonMasthead.test.tsx`
- Modify: `src/ui/parlour/index.ts`
- Modify: `src/features/kowloon/index.ts`
- Modify: `src/routes/Home.tsx`
- Modify: `src/routes/SpinFlow.tsx`
- Modify: `src/routes/Jar.tsx`
- Modify: `src/routes/Habits.tsx`
- Modify: `src/routes/Rewards.tsx`
- Modify: `src/routes/Settings.tsx`
- Modify: `src/routes/BonusTimerDetail.tsx`

- [ ] **Step 1: Implement PachinkoMasthead.tsx**

Create `src/ui/parlour/PachinkoMasthead.tsx`:

```tsx
/**
 * PachinkoMasthead — engraved page header (existing parlour-masthead pattern).
 *
 * Wraps the inline `<header className="parlour-masthead">…</header>` block
 * that every route currently inlines. Children are route-supplied
 * (kicker, title, tagline, optional motif/cog).
 */

import type { ReactElement, ReactNode } from 'react';

export interface PachinkoMastheadProps {
  /** Route-supplied content: kicker, title, tagline, motif, cog. */
  children: ReactNode;
  /** Extra className for route-specific tuning. */
  className?: string;
}

export function PachinkoMasthead({
  children,
  className,
}: PachinkoMastheadProps): ReactElement {
  return (
    <header className={`parlour-masthead ${className ?? ''}`}>
      {children}
    </header>
  );
}
```

- [ ] **Step 2: Implement KowloonMasthead.tsx**

Create `src/features/kowloon/KowloonMasthead.tsx`:

```tsx
/**
 * KowloonMasthead — neon-vertical page header for the Kowloon theme.
 *
 * Wraps a `<header>` with the parlour-masthead--neon class so existing
 * masthead children (kicker, title, tagline) re-skin via tokens. Adds
 * a vertical-Cantonese sign at the top.
 */

import type { ReactElement, ReactNode } from 'react';
import { NeonSign } from '../../ui/kowloon/NeonSign.tsx';

export interface KowloonMastheadProps {
  children: ReactNode;
  className?: string;
}

export function KowloonMasthead({
  children,
  className,
}: KowloonMastheadProps): ReactElement {
  return (
    <header
      className={`parlour-masthead parlour-masthead--neon ${className ?? ''}`}
      data-testid="kowloon-masthead"
    >
      <div className="parlour-masthead__neon-sign">
        <NeonSign ch="九" en="KOWLOON" sub="HALL · 9F" color="#f5d547" />
      </div>
      {children}
    </header>
  );
}
```

- [ ] **Step 3: Append masthead--neon styles to kowloon-screens.css**

Open `src/features/kowloon/kowloon-screens.css` and append:

```css
.parlour-masthead--neon {
  background: var(--color-bg-grad);
  position: relative;
  padding: 1.5rem;
}

.parlour-masthead__neon-sign {
  position: absolute;
  top: 12px;
  left: 12px;
}

.parlour-masthead--neon .parlour-masthead__title {
  color: var(--color-gold);
  text-shadow: 0 0 14px var(--color-gold-glow);
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}

.parlour-masthead--neon .parlour-masthead__kicker {
  font-family: var(--font-hk, 'Noto Serif HK', serif);
  color: var(--color-accent);
  text-shadow: 0 0 8px var(--color-accent);
  letter-spacing: 0.2em;
}

.parlour-masthead--neon .parlour-masthead__tagline {
  font-family: var(--font-body);
  color: var(--color-ink-muted);
}
```

- [ ] **Step 4: Implement Masthead dispatcher**

Create `src/ui/parlour/Masthead.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react';
import { useTheme } from '../../styles/theme-context.ts';
import { PachinkoMasthead } from './PachinkoMasthead.tsx';
import { KowloonMasthead } from '../../features/kowloon/KowloonMasthead.tsx';

export interface MastheadProps {
  children: ReactNode;
  className?: string;
}

export function Masthead({ children, className }: MastheadProps): ReactElement {
  const { themeMeta } = useTheme();
  switch (themeMeta.visual?.masthead ?? 'engraved') {
    case 'neon-vertical':
      return <KowloonMasthead className={className}>{children}</KowloonMasthead>;
    case 'engraved':
      return <PachinkoMasthead className={className}>{children}</PachinkoMasthead>;
  }
}
```

- [ ] **Step 5: Write tests**

Create `src/features/kowloon/__tests__/KowloonMasthead.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KowloonMasthead } from '../KowloonMasthead.tsx';

describe('KowloonMasthead', () => {
  it('renders children inside a parlour-masthead--neon header', () => {
    render(
      <KowloonMasthead>
        <h1>Test Title</h1>
      </KowloonMasthead>,
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByTestId('kowloon-masthead')).toHaveClass('parlour-masthead--neon');
  });
});
```

Create `src/ui/parlour/__tests__/Masthead.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';
import { Masthead } from '../Masthead.tsx';

describe('Masthead dispatcher', () => {
  it('renders PachinkoMasthead at theme=pachinko', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <Masthead>
          <h1>Title</h1>
        </Masthead>
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-masthead"]')).toBeNull();
    expect(container.querySelector('header.parlour-masthead')).not.toBeNull();
  });

  it('renders KowloonMasthead at theme=kowloon', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <Masthead>
          <h1>Title</h1>
        </Masthead>
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-masthead"]')).not.toBeNull();
  });

  it('falls back to PachinkoMasthead when visual is undefined', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'house',
          themeMeta: { ...THEMES.house, visual: undefined },
          setTheme: () => {},
        }}
      >
        <Masthead>
          <h1>Title</h1>
        </Masthead>
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-masthead"]')).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail / partially pass**

Run: `npm test -- src/ui/parlour/__tests__/Masthead.test.tsx src/features/kowloon/__tests__/KowloonMasthead.test.tsx`
Expected: tests pass for the dispatcher logic; the path mismatch may need adjustment.

If tests fail because of import paths, fix the relative paths and re-run.

- [ ] **Step 7: Update barrel exports**

Open `src/ui/parlour/index.ts`. Add:

```ts
export { PachinkoMasthead } from './PachinkoMasthead.tsx';
export type { PachinkoMastheadProps } from './PachinkoMasthead.tsx';
export { Masthead } from './Masthead.tsx';
export type { MastheadProps } from './Masthead.tsx';
```

Open `src/features/kowloon/index.ts`. Add:

```ts
export { KowloonMasthead } from './KowloonMasthead.tsx';
export type { KowloonMastheadProps } from './KowloonMasthead.tsx';
```

- [ ] **Step 8: Refactor each route to use `<Masthead>`**

For each of the 7 affected routes, replace the inline `<header className="parlour-masthead">…</header>` with `<Masthead>…</Masthead>`. The contents (kicker, title, tagline, optional motif/cog) stay verbatim.

Example for `src/routes/SpinFlow.tsx`:

```tsx
// before
<header className="parlour-masthead">
  <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
  <h1 id="spin-title" className="parlour-masthead__title">
    The Pull
  </h1>
  <p className="parlour-masthead__tagline">
    {themeMeta.copy.spinCta} · 3 steps to the reveal.
  </p>
  <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-3) auto 0' }}>
    <Motif size={36} />
  </div>
</header>

// after
<Masthead>
  <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
  <h1 id="spin-title" className="parlour-masthead__title">
    The Pull
  </h1>
  <p className="parlour-masthead__tagline">
    {themeMeta.copy.spinCta} · 3 steps to the reveal.
  </p>
  <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-3) auto 0' }}>
    <Motif size={36} />
  </div>
</Masthead>
```

Add the import at top:

```ts
import { Masthead } from '../ui/parlour/index.ts';
```

(If `Motif` was already imported from the same barrel, just append `Masthead` to the existing import list.)

Apply the same pattern to:
- `src/routes/Home.tsx`
- `src/routes/Habits.tsx`
- `src/routes/Jar.tsx`
- `src/routes/Rewards.tsx`
- `src/routes/Settings.tsx`
- `src/routes/BonusTimerDetail.tsx`

For routes that don't have a masthead (e.g. `Onboarding.tsx`, `History.tsx`), skip them — they don't need the change.

- [ ] **Step 9: Add a snapshot regression test for PachinkoMasthead**

Append to `src/ui/parlour/__tests__/Masthead.test.tsx`:

```tsx
import { ThemeProvider } from '../../../styles/theme-provider.tsx';

describe('Masthead Pachinko snapshot regression', () => {
  it('renders the same DOM structure as the inline parlour-masthead pattern', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <Masthead>
          <div className="parlour-masthead__kicker">Test Tagline</div>
          <h1 className="parlour-masthead__title">The Pull</h1>
          <p className="parlour-masthead__tagline">Pull the Lever · 3 steps to the reveal.</p>
        </Masthead>
      </ThemeContext.Provider>,
    );
    expect(container.firstChild).toMatchInlineSnapshot(`
<header
  class="parlour-masthead "
>
  <div
    class="parlour-masthead__kicker"
  >
    Test Tagline
  </div>
  <h1
    class="parlour-masthead__title"
  >
    The Pull
  </h1>
  <p
    class="parlour-masthead__tagline"
  >
    Pull the Lever · 3 steps to the reveal.
  </p>
</header>
`);
  });
});
```

(Note: the inline snapshot will be auto-populated on first run; if it differs from the inlined one, accept the diff with `vitest -u` after manually verifying it matches the byte-for-byte expectation.)

- [ ] **Step 10: Run tests + typecheck + lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all green. Snapshot test confirms PachinkoMasthead emits identical DOM to the previous inline pattern (single trailing space in `parlour-masthead ` is from the className concatenation; this is the byte-identical state).

- [ ] **Step 11: Manual smoke**

Run: `npm run dev`. At default theme=pachinko, walk every route (Home, Habits, Jar, Rewards, Settings, SpinFlow, BonusTimerDetail). Confirm masthead renders identically to before. Flip to Kowloon. Confirm every route's masthead now shows the neon vertical sign + magenta/cyan glow. Flip back; confirm restoration.

- [ ] **Step 12: Commit**

```bash
git add src/ui/parlour/PachinkoMasthead.tsx src/ui/parlour/Masthead.tsx \
        src/ui/parlour/__tests__/Masthead.test.tsx src/ui/parlour/index.ts \
        src/features/kowloon/KowloonMasthead.tsx \
        src/features/kowloon/__tests__/KowloonMasthead.test.tsx \
        src/features/kowloon/index.ts \
        src/features/kowloon/kowloon-screens.css \
        src/routes/
git commit -m "$(cat <<'EOF'
feat(kowloon): Masthead extraction + dispatcher + KowloonMasthead variant

Highest-leverage commit. Extracts the inline parlour-masthead JSX
from every route into a PachinkoMasthead wrapper, routes through a
Masthead dispatcher, and adds the KowloonMasthead variant with
neon vertical signage. Snapshot regression test guards
byte-identical Pachinko rendering.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: MahjongReelsCanvas + WheelCabinet dispatch

Adds the third spin-canvas variant. The mahjong canvas drives off the same `wheel.engine.ts` outcomes as the existing wheel/reels.

**Files:**
- Create: `src/features/wheel/MahjongReelsCanvas.tsx`
- Create: `src/features/wheel/__tests__/MahjongReelsCanvas.test.tsx`
- Modify: `src/features/spin/WheelCabinet.tsx` (extend internal dispatch)

- [ ] **Step 1: Read existing spin-canvas dispatch**

Open `src/features/spin/WheelCabinet.tsx` and `src/features/wheel/WheelCanvas.tsx`. Confirm how the cabinet currently chooses between wheel and reels. Likely a setting + theme-driven decision.

If the existing logic is a Zustand selector or a setting, extend it to include `'mahjong'` as a third option. The dispatch lives wherever today's wheel-vs-reels decision happens — read the surrounding code to find it.

- [ ] **Step 2: Write failing test**

Create `src/features/wheel/__tests__/MahjongReelsCanvas.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MahjongReelsCanvas } from '../MahjongReelsCanvas.tsx';

describe('MahjongReelsCanvas', () => {
  it('renders three vertical reels with mahjong tile faces', () => {
    const { container } = render(
      <MahjongReelsCanvas
        outcome="T1"
        spinning={false}
        size={300}
      />,
    );
    const reels = container.querySelectorAll('[data-testid="mahjong-reel"]');
    expect(reels.length).toBe(3);
  });

  it('renders inside a CRT bezel', () => {
    const { container } = render(
      <MahjongReelsCanvas outcome="T1" spinning={false} size={300} />,
    );
    expect(container.querySelector('[data-testid="crt-bezel"]')).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/features/wheel/__tests__/MahjongReelsCanvas.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement MahjongReelsCanvas.tsx**

Create `src/features/wheel/MahjongReelsCanvas.tsx`:

```tsx
/**
 * MahjongReelsCanvas — three-reel mahjong cabinet for the Kowloon theme.
 *
 * Renders three vertical reels of mahjong tiles inside a CRT bezel.
 * The center reel is pre-determined by the engine's tier outcome;
 * the side reels animate alignment when `spinning` is true.
 *
 * For v1, animation is the static "resolved-triplet" placeholder —
 * the same outcome shape the wheel/reels canvases consume. A future
 * follow-up animates the alignment.
 */

import type { ReactElement } from 'react';
import type { Tier } from '../../types/wheel.ts';
import { CRTBezel } from '../../ui/kowloon/CRTBezel.tsx';
import { MahjongTile } from '../../ui/kowloon/MahjongTile.tsx';

export interface MahjongReelsCanvasProps {
  /** Pre-determined tier from wheel.engine.ts. */
  outcome: Tier;
  /** When true, render an animation placeholder. */
  spinning?: boolean;
  /** Canvas size in px. */
  size?: number;
}

const TILE_FACES: Record<Tier, [string, string, string]> = {
  T1: ['東', '南', '西'],
  T2: ['一', '二', '三'],
  T3: ['中', '發', '白'],
  BONUS: ['副', '副', '副'],
  JACKPOT: ['★', '大', '獎'],
};

const TILE_SUBS: Record<string, string> = {
  '東': 'East',
  '南': 'South',
  '西': 'West',
  '中': 'Chun',
  '發': 'Hatsu',
  '白': 'Haku',
  '一': 'One',
  '二': 'Two',
  '三': 'Three',
  '副': 'Bonus',
  '★': 'Star',
  '大': 'Dai',
  '獎': 'Jeung',
};

export function MahjongReelsCanvas({
  outcome,
  spinning = false,
  size = 300,
}: MahjongReelsCanvasProps): ReactElement {
  const tiles = TILE_FACES[outcome];

  return (
    <CRTBezel
      label="CH 03 · LIVE"
      tally
      width={size}
      height={size * 0.8}
    >
      <div
        className="kowloon-mahjong-reels"
        data-testid="mahjong-reels"
        data-spinning={spinning ? 'true' : 'false'}
      >
        {tiles.map((face, i) => (
          <div
            key={i}
            className="kowloon-mahjong-reel"
            data-testid="mahjong-reel"
          >
            <MahjongTile
              ch={face}
              sub={TILE_SUBS[face] ?? ''}
              size={48}
              glyphColor="#1bd182"
            />
          </div>
        ))}
        <div className="kowloon-mahjong-reels__payline" aria-hidden />
      </div>
    </CRTBezel>
  );
}
```

- [ ] **Step 5: Append CSS for the reels canvas**

Append to `src/ui/kowloon/kowloon.css`:

```css
.kowloon-mahjong-reels {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  padding: 16px;
}

.kowloon-mahjong-reel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.kowloon-mahjong-reels__payline {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 50%;
  height: 2px;
  background: var(--color-accent, #ff2e88);
  box-shadow: 0 0 8px var(--color-accent, #ff2e88);
  transform: translateY(-1px);
  pointer-events: none;
}
```

- [ ] **Step 6: Wire MahjongReelsCanvas into the spin dispatch**

Open `src/features/spin/WheelCabinet.tsx`. The current cabinet renders children (the canvas is passed in). Find the call site that decides `<WheelCanvas/>` vs `<SlotReelsCanvas/>` (likely in `PostSpinFlow.tsx` or `RailStakeAndOdds.tsx` — search for `WheelCanvas` and `SlotReelsCanvas` imports across `src/features/spin/`).

In that call site, extend the conditional with a new `'mahjong'` branch driven by `themeMeta.visual?.spin`:

```tsx
import { useTheme } from '../../styles/theme-context.ts';
import { MahjongReelsCanvas } from '../wheel/MahjongReelsCanvas.tsx';
// ... existing imports

const { themeMeta } = useTheme();
const spinVariant = themeMeta.visual?.spin ?? 'wheel';

let canvas: ReactNode;
switch (spinVariant) {
  case 'mahjong':
    canvas = <MahjongReelsCanvas outcome={resolvedTier} spinning={isSpinning} />;
    break;
  case 'reels':
    canvas = <SlotReelsCanvas {/* existing props */} />;
    break;
  case 'wheel':
    canvas = <WheelCanvas {/* existing props */} />;
    break;
}
```

(Replace `{/* existing props */}` with whatever the existing code passes — read the surrounding code to determine the contract.)

- [ ] **Step 7: Run tests + typecheck + lint**

Run: `npm test -- src/features/wheel/ && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 8: Manual smoke**

Run: `npm run dev`. At theme=pachinko, walk to the spin flow, confirm wheel/reels render unchanged. Flip to Kowloon. Walk to spin flow. Confirm three mahjong tiles appear inside a CRT bezel.

- [ ] **Step 9: Commit**

```bash
git add src/features/wheel/MahjongReelsCanvas.tsx \
        src/features/wheel/__tests__/MahjongReelsCanvas.test.tsx \
        src/ui/kowloon/kowloon.css \
        src/features/spin/
git commit -m "$(cat <<'EOF'
feat(kowloon): MahjongReelsCanvas + WheelCabinet dispatch on visual.spin

Adds the third spin-canvas variant — three mahjong tiles inside a
CRT bezel — wired into the existing wheel-vs-reels dispatch via
themeMeta.visual.spin === 'mahjong'. Pachinko unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: HandTrayCard chip dispatch

Internal dispatch in `HandTrayCard` to render `<ArcadeToken>` when `themeMeta.visual.chip === 'arcade-token'`, falling back to the existing `<Chip>` otherwise.

**Files:**
- Modify: `src/features/spin/HandTrayCard.tsx`
- Modify (or add to): `src/features/spin/__tests__/HandTrayCard.test.tsx`

- [ ] **Step 1: Read existing HandTrayCard chip render**

Open `src/features/spin/HandTrayCard.tsx`. Find where the clip pile is rendered (likely a `.map(...)` over hand entries that emits `<Chip color={...}/>`). Note the props passed to `<Chip>`.

- [ ] **Step 2: Add a kowloon branch test**

Open or create `src/features/spin/__tests__/HandTrayCard.test.tsx` and add (or extend with):

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';
import { HandTrayCard } from '../HandTrayCard.tsx';
// (existing imports for store mocks, selectors, etc.)

describe('HandTrayCard chip dispatch', () => {
  it('renders ArcadeToken when theme=kowloon', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <HandTrayCard />
      </ThemeContext.Provider>,
    );
    // Empty hand renders no tokens; that's fine — assert no Pachinko chip.
    expect(container.querySelector('[data-testid="arcade-token"], [data-testid="chip"]')).toBeNull();
  });
});
```

(If `HandTrayCard` requires a populated hand to render chips, mock the store first — see existing pattern in any `*.test.tsx` that uses Zustand.)

- [ ] **Step 3: Implement chip dispatch in HandTrayCard.tsx**

In `HandTrayCard.tsx`, locate the chip rendering. Wrap or replace with a switch on `themeMeta.visual?.chip`:

```tsx
import { ArcadeToken } from '../../ui/kowloon/ArcadeToken.tsx';

// inside the component, where you currently render <Chip>:
const chipVariant = themeMeta.visual?.chip ?? 'lacquer';

const renderClip = (clip: Clip, i: number) => {
  switch (chipVariant) {
    case 'arcade-token':
      return (
        <ArcadeToken
          key={i}
          color={CLIP_HEX[clip.color]}
          denom={clip.color === 'gold' ? '★' : 'I'}
          size={28}
        />
      );
    case 'lacquer':
      return (
        <Chip
          key={i}
          /* existing props */
        />
      );
  }
};
```

(Replace `{/* existing props */}` with whatever today's code passes.)

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `npm test -- src/features/spin/ && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 5: Manual smoke**

Run: `npm run dev`. Log a few habits at theme=pachinko to populate the hand; confirm chip pile renders unchanged. Flip to Kowloon; confirm tokens appear in place of chips.

- [ ] **Step 6: Commit**

```bash
git add src/features/spin/HandTrayCard.tsx src/features/spin/__tests__/
git commit -m "$(cat <<'EOF'
feat(kowloon): HandTrayCard chip dispatch on visual.chip

Internal dispatch swaps clip-pile chips for arcade tokens at
theme=kowloon. Pachinko Chip rendering byte-identical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: RevealStage Kowloon CRT-phosphor branch

Internal Kowloon branch in `RevealStage`. The reveal becomes a CRT-bezel phosphor flash with vertical kanji + pixel-burst confetti.

**Files:**
- Modify: `src/features/spin/RevealStage.tsx`
- Modify (or add): `src/features/spin/__tests__/RevealStage.test.tsx`

- [ ] **Step 1: Add a kowloon branch test**

Open or create `src/features/spin/__tests__/RevealStage.test.tsx` and add:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';
import { RevealStage } from '../RevealStage.tsx';

describe('RevealStage Kowloon branch', () => {
  it('renders the CRT phosphor reveal at theme=kowloon for T3', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <RevealStage tier="T3" />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-reveal"]')).not.toBeNull();
  });

  it('renders the existing Pachinko reveal at theme=pachinko for T3', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <RevealStage tier="T3" />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="reveal-stage"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kowloon-reveal"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify the kowloon branch test fails**

Run: `npm test -- src/features/spin/__tests__/RevealStage.test.tsx`
Expected: kowloon branch test FAILS; pachinko test PASSES.

- [ ] **Step 3: Implement Kowloon branch in RevealStage.tsx**

Open `src/features/spin/RevealStage.tsx`. After the existing `if (tier !== 'T3') return null;` line, add a Kowloon dispatch:

```tsx
import { CRTBezel } from '../../ui/kowloon/CRTBezel.tsx';
import { PixelSprite } from '../../ui/kowloon/PixelSprite.tsx';

// after the early return, before the existing Pachinko JSX:
const isKowloon = themeMeta.visual?.cover === 'arcade-closet';

if (isKowloon) {
  return (
    <div
      className="reveal-stage reveal-stage--kowloon"
      data-testid="kowloon-reveal"
    >
      <CRTBezel label="JACKPOT · TIER ★" tally width={320} height={280}>
        <div className="reveal-stage--kowloon__inner">
          <div className="reveal-stage--kowloon__kicker">{themeMeta.copy.jackpot}</div>
          <div className="reveal-stage--kowloon__kanji">大</div>
          <div className="reveal-stage--kowloon__kanji">獎</div>
          <div className="reveal-stage--kowloon__sub">PRESS START</div>
        </div>
      </CRTBezel>
    </div>
  );
}

// existing Pachinko JSX continues unchanged below.
```

- [ ] **Step 4: Append Kowloon reveal styles**

Append to `src/features/kowloon/kowloon-screens.css`:

```css
.reveal-stage--kowloon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.reveal-stage--kowloon__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 100%;
}

.reveal-stage--kowloon__kicker {
  font-family: var(--font-pixel, var(--font-mono));
  font-size: 14px;
  letter-spacing: 0.3em;
  color: var(--kowloon-cyan, #22e3ff);
  text-shadow: 0 0 6px var(--kowloon-cyan, #22e3ff);
}

.reveal-stage--kowloon__kanji {
  font-family: var(--font-hk, 'Noto Serif HK', serif);
  font-size: 56px;
  color: var(--color-gold);
  text-shadow:
    0 0 12px var(--color-gold),
    0 0 32px var(--color-gold-glow);
  line-height: 1;
}

.reveal-stage--kowloon__sub {
  font-family: var(--font-pixel, var(--font-mono));
  font-size: 14px;
  letter-spacing: 0.2em;
  color: var(--color-accent);
  text-shadow: 0 0 8px var(--color-accent);
  margin-top: 8px;
}
```

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `npm test -- src/features/spin/ && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 6: Manual smoke**

Run: `npm run dev`. Force a T3 spin at theme=pachinko (use dev tools or repeated spins); confirm existing chrysanthemum reveal. Flip to Kowloon; force another T3; confirm CRT-phosphor reveal with vertical kanji.

- [ ] **Step 7: Commit**

```bash
git add src/features/spin/RevealStage.tsx \
        src/features/spin/__tests__/RevealStage.test.tsx \
        src/features/kowloon/kowloon-screens.css
git commit -m "$(cat <<'EOF'
feat(kowloon): RevealStage CRT-phosphor branch

Internal Kowloon branch swaps the lacquer chrysanthemum reveal for
a CRT-bezel phosphor flash with vertical 大獎 kanji.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: BonusTimerCountdown Kowloon branch

Adds a magenta digital countdown variant inside a CRT bezel for theme=kowloon.

**Files:**
- Modify: `src/features/bonus/BonusTimerCountdown.tsx`
- Modify (or add): `src/features/bonus/__tests__/BonusTimerCountdown.test.tsx`

- [ ] **Step 1: Read existing BonusTimerCountdown structure**

Open `src/features/bonus/BonusTimerCountdown.tsx`. Identify the render block (the JSX returning the formatted time). The existing component is theme-agnostic — we'll add a small theme-aware wrapper.

- [ ] **Step 2: Add a Kowloon branch test**

Open or create `src/features/bonus/__tests__/BonusTimerCountdown.test.tsx` and add:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';
import { BonusTimerCountdown } from '../BonusTimerCountdown.tsx';

describe('BonusTimerCountdown Kowloon branch', () => {
  const futureTimestamp = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  it('renders inside a CRT bezel at theme=kowloon', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <BonusTimerCountdown endTimestamp={futureTimestamp} />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="crt-bezel"]')).not.toBeNull();
  });

  it('renders without CRT bezel at theme=pachinko', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <BonusTimerCountdown endTimestamp={futureTimestamp} />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="crt-bezel"]')).toBeNull();
  });
});
```

- [ ] **Step 3: Implement Kowloon branch**

In `BonusTimerCountdown.tsx`, near the top of the component body where the import + state/effects live, also pull theme:

```tsx
import { useTheme } from '../../styles/theme-context.ts';
import { CRTBezel } from '../../ui/kowloon/CRTBezel.tsx';

// inside the component:
const { themeMeta } = useTheme();
const isKowloon = themeMeta.visual?.overlay === 'scanlines';
```

Then wrap the existing render in a conditional:

```tsx
const formatted = formatRemaining(remainingMs);

const inner = (
  <div className="bonus-countdown" data-testid="bonus-countdown">
    {/* existing JSX — pixel font + label */}
  </div>
);

if (isKowloon) {
  return (
    <CRTBezel label="BONUS · ACTIVE" tally width="100%" height={140}>
      <div className="bonus-countdown--kowloon">
        <span className="bonus-countdown--kowloon__digits">{formatted}</span>
        {children}
      </div>
    </CRTBezel>
  );
}

return inner;
```

(Adjust to match the actual render shape — the existing component may have a wrapper className you want to preserve.)

- [ ] **Step 4: Append Kowloon countdown styles**

Append to `src/features/kowloon/kowloon-screens.css`:

```css
.bonus-countdown--kowloon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding: 8px;
}

.bonus-countdown--kowloon__digits {
  font-family: var(--font-pixel, var(--font-mono));
  font-size: 48px;
  color: var(--color-accent);
  text-shadow:
    0 0 8px var(--color-accent),
    0 0 24px var(--color-accent);
  letter-spacing: 0.1em;
  line-height: 1;
}
```

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `npm test -- src/features/bonus/ && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 6: Manual smoke**

Run: `npm run dev`. Trigger a bonus timer (via the dev fixture or by completing a habit when bonus is active). Confirm Pachinko hourglass renders. Flip to Kowloon; confirm magenta CRT countdown.

- [ ] **Step 7: Commit**

```bash
git add src/features/bonus/BonusTimerCountdown.tsx \
        src/features/bonus/__tests__/BonusTimerCountdown.test.tsx \
        src/features/kowloon/kowloon-screens.css
git commit -m "$(cat <<'EOF'
feat(kowloon): BonusTimerCountdown CRT magenta-digital branch

Internal Kowloon branch wraps the bonus countdown in a CRT bezel
with magenta digital digits when theme=kowloon. Pachinko hourglass
unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: KowloonCover for theme picker

Adds the cover art shown in Settings → Theme picker when previewing the Kowloon theme.

**Files:**
- Create: `src/features/kowloon/KowloonCover.tsx`
- Create: `src/features/kowloon/__tests__/KowloonCover.test.tsx`
- Modify: `src/features/kowloon/index.ts`
- Modify: `src/routes/Settings.tsx` (or wherever the existing theme cover renders)

- [ ] **Step 1: Read existing Pachinko cover**

Search the codebase for `PachinkoCover` or `<Cover` in Settings.tsx. The existing pattern likely renders an inline cover panel for each theme. Find it.

If there's no existing Cover dispatch, the Settings theme picker may render a static palette swatch per theme. In that case, this task adds the Kowloon cover art **as a swappable component** but the integration may be deferred — note that and skip the integration step.

- [ ] **Step 2: Write failing test**

Create `src/features/kowloon/__tests__/KowloonCover.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KowloonCover } from '../KowloonCover.tsx';

describe('KowloonCover', () => {
  it('renders the kowloon cover panel', () => {
    const { container } = render(<KowloonCover />);
    expect(container.querySelector('[data-testid="kowloon-cover"]')).not.toBeNull();
  });

  it('shows the neon vertical sign + wordmark', () => {
    const { container } = render(<KowloonCover />);
    expect(container.querySelector('[data-testid="neon-sign"]')).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/features/kowloon/__tests__/KowloonCover.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement KowloonCover.tsx**

Create `src/features/kowloon/KowloonCover.tsx`:

```tsx
/**
 * KowloonCover — theme-picker cover art.
 *
 * Used by the Settings theme picker to preview the Kowloon aesthetic.
 * Renders the cinematic header: vertical Cantonese sign + wordmark,
 * mosaic floor strip, tangled wires across the top, four corner
 * inspection stamps.
 */

import type { ReactElement } from 'react';
import { NeonSign } from '../../ui/kowloon/NeonSign.tsx';
import { WireBundle } from '../../ui/kowloon/WireBundle.tsx';
import { MosaicFloor } from '../../ui/kowloon/MosaicFloor.tsx';
import { Stamp } from '../../ui/kowloon/Stamp.tsx';

export function KowloonCover(): ReactElement {
  return (
    <div
      className="kowloon-cover"
      data-testid="kowloon-cover"
    >
      <div className="kowloon-cover__wires">
        <WireBundle width={760} />
      </div>

      <div className="kowloon-cover__center">
        <NeonSign ch="九" en="KOWLOON ELECTRIC" sub="九龍電氣 · 1985" color="#f5d547" />
        <div className="kowloon-cover__tagline">Triad Neon · Drop the Coin</div>
      </div>

      <div className="kowloon-cover__floor">
        <MosaicFloor width="100%" height={80} />
      </div>

      <div className="kowloon-cover__stamp kowloon-cover__stamp--tl">
        <Stamp ch="檢" en="INSPECTED" color="#ff2e88" rotate={-6} />
      </div>
      <div className="kowloon-cover__stamp kowloon-cover__stamp--tr">
        <Stamp ch="廠" en="LOT 7B" color="#22e3ff" rotate={5} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Append KowloonCover styles**

Append to `src/features/kowloon/kowloon-screens.css`:

```css
.kowloon-cover {
  position: relative;
  width: 100%;
  min-height: 320px;
  background: var(--color-bg-grad);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.kowloon-cover__wires {
  position: absolute;
  top: 24px;
  left: 24px;
  right: 24px;
  opacity: 0.7;
}

.kowloon-cover__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.kowloon-cover__tagline {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--color-ink-muted);
}

.kowloon-cover__floor {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  opacity: 0.7;
}

.kowloon-cover__stamp {
  position: absolute;
}

.kowloon-cover__stamp--tl { top: 16px; left: 16px; }
.kowloon-cover__stamp--tr { top: 16px; right: 16px; }
```

- [ ] **Step 6: Update index.ts**

Open `src/features/kowloon/index.ts`. Add:

```ts
export { KowloonCover } from './KowloonCover.tsx';
```

- [ ] **Step 7: Wire into Settings (if applicable)**

Open `src/routes/Settings.tsx`. Look for the theme picker render — likely a `.map(THEME_KEYS, ...)` loop emitting cards. If a per-theme cover renders for the active theme, dispatch on `themeMeta.visual?.cover`:

```tsx
import { KowloonCover } from '../features/kowloon/index.ts';

// existing inline Pachinko cover; add:
const coverVariant = THEMES[themeKey].visual?.cover ?? 'parlour';
const coverNode =
  coverVariant === 'arcade-closet' ? <KowloonCover /> : <PachinkoCover />;
```

If no per-theme cover renders today, skip this step and just register the component for future use.

- [ ] **Step 8: Run tests + typecheck + lint**

Run: `npm test -- src/features/kowloon/__tests__/KowloonCover.test.tsx && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add src/features/kowloon/KowloonCover.tsx \
        src/features/kowloon/__tests__/KowloonCover.test.tsx \
        src/features/kowloon/index.ts \
        src/features/kowloon/kowloon-screens.css \
        src/routes/Settings.tsx
git commit -m "$(cat <<'EOF'
feat(kowloon): KowloonCover for theme picker

Cinematic theme-picker cover art (neon sign, wires, mosaic floor,
inspection stamps). Wired into Settings theme picker if/where a
per-theme cover dispatches.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Status flip to 'ready' + e2e spec

Promotes Kowloon from `'stub'` to `'ready'` in the theme catalog and adds the e2e regression test.

**Files:**
- Modify: `src/styles/themes.ts`
- Modify: `src/styles/__tests__/themes.test.ts`
- Create: `e2e/kowloon.spec.ts`

- [ ] **Step 1: Flip status**

Open `src/styles/themes.ts`. Find the `kowloon` entry. Change:

```ts
status: 'stub',
```

to:

```ts
status: 'ready',
```

- [ ] **Step 2: Update themes.test.ts to assert ready**

Open `src/styles/__tests__/themes.test.ts`. Add:

```ts
it('kowloon is now status: ready', () => {
  expect(THEMES.kowloon.status).toBe('ready');
});
```

- [ ] **Step 3: Write e2e/kowloon.spec.ts**

Create `e2e/kowloon.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Kowloon Electric theme', () => {
  test('flip to kowloon, walk Home, flip back', async ({ page }) => {
    await page.goto('/kakeguruimasho/');

    // Default theme should be pachinko.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'pachinko');

    // Open settings and pick Kowloon.
    await page.getByRole('link', { name: /settings/i }).click();
    await page.getByRole('button', { name: /kowloon/i }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'kowloon');

    // Navigate to Home — confirm Kowloon masthead present.
    await page.getByRole('link', { name: /home|salon/i }).first().click();
    await expect(page.locator('[data-testid="kowloon-masthead"]')).toBeVisible();

    // Confirm streak flipped to LED bar.
    await expect(page.locator('[data-testid="kowloon-streak"]')).toBeVisible();

    // Flip back to Pachinko.
    await page.getByRole('link', { name: /settings/i }).click();
    await page.getByRole('button', { name: /pachinko|vintage/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'pachinko');

    // Kowloon-specific elements should no longer be on Home.
    await page.getByRole('link', { name: /home|salon/i }).first().click();
    await expect(page.locator('[data-testid="kowloon-masthead"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="kowloon-streak"]')).toHaveCount(0);
  });

  test('spin flow at theme=kowloon shows CRT bezel', async ({ page }) => {
    await page.goto('/kakeguruimasho/');
    // Set theme via localStorage to bypass the picker.
    await page.evaluate(() => {
      window.localStorage.setItem('kakegurui:theme', 'kowloon');
    });
    await page.reload();

    await page.getByRole('link', { name: /spin|pull/i }).first().click();
    await expect(page.locator('[data-testid="crt-bezel"]').first()).toBeVisible();
  });
});
```

(Adjust selectors to match the actual labels in the app — read `src/routes/Settings.tsx` and the nav config to find the correct ARIA names.)

- [ ] **Step 4: Run e2e**

Run: `npm run test:e2e -- kowloon.spec.ts`
Expected: PASS.

- [ ] **Step 5: Run full suite**

Run: `npm test && npm run test:e2e && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/styles/themes.ts src/styles/__tests__/themes.test.ts e2e/kowloon.spec.ts
git commit -m "$(cat <<'EOF'
feat(kowloon): flip status to 'ready' + e2e regression spec

All bespoke variants ship; theme picker shows kowloon as ready.
e2e/kowloon.spec.ts covers theme-flip walk + CRT bezel at spin
flow + flip-back regression.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Docs cleanup — BACKLOG + CHANGELOG

The final commit moves the Kowloon items to the "Shipped" section and adds a CHANGELOG entry.

**Files:**
- Modify: `BACKLOG.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Tick BACKLOG items**

Open `BACKLOG.md`. Find the `### Kowloon Walled City / Bladerunner (cyber-grunge)` section. Change all `- [ ]` to `- [x]` for the three checkboxes. Move the section to a "Shipped" subsection at the bottom of the Themes section, or add a header note like:

```markdown
### Kowloon Walled City / Bladerunner — SHIPPED 2026-04-27
```

- [ ] **Step 2: Add CHANGELOG entry**

Open `CHANGELOG.md`. Add at the top under today's date:

```markdown
## 2026-04-27

### Added
- **Kowloon Electric** — second bespoke theme. Triad Neon palette
  (hot magenta + ice cyan + acid jade + sodium yellow) over
  ink-black backgrounds; Cantonese vertical signage; CRT-bezel
  spin cabinet with three-reel mahjong tiles; magenta digital
  bonus countdown; LED-bar streak; arcade-token chips. Pickable
  in Settings.
- `ThemeVisual` interface on `ThemeMeta` — strictly-typed
  variant keys (`streak`, `potMini`, `chip`, `spin`, `cover`,
  `overlay`, `masthead`) consumed by thin dispatcher components.
  Stub themes (`house`, `riding`, etc.) leave `visual` undefined
  and fall through to Pachinko variants — behavior unchanged.
- New primitives: `NeonSign`, `CRTBezel`, `Scanlines`,
  `MahjongTile`, `ArcadeToken`, `Stamp`, `WireBundle`,
  `MosaicFloor`, `PixelSprite` (in `src/ui/kowloon/`).
- New variants: `KowloonStreak`, `KowloonPotMini`,
  `KowloonMasthead`, `KowloonCover`, `MahjongReelsCanvas`.
- `Noto Serif HK` and `Shippori Mincho` fonts for HK signage.

### Refactored
- Inline `<header className="parlour-masthead">…</header>` in
  every route extracted into `<Masthead>` dispatcher +
  `<PachinkoMasthead>` wrapper. Snapshot regression confirms
  byte-identical Pachinko render.
```

- [ ] **Step 3: Commit**

```bash
git add BACKLOG.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: tick Kowloon BACKLOG items + CHANGELOG entry

Kowloon Electric ships. Theme catalog grows a strictly-typed
visual profile; ~7 thin dispatchers cover the slots that
genuinely look different. Pachinko byte-identical at default.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Final verification**

Run: `npm test && npm run test:e2e && npm run typecheck && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 5: Manual final walkthrough**

Run: `npm run dev`. Walk both themes through every route + spin flow + bonus + reveal. Confirm:
- Pachinko byte-identical to pre-PR.
- Kowloon shows neon mastheads, LED streak, token tray, mahjong reels, CRT-phosphor reveal, magenta countdown.
- Theme flip is instant and complete (no hybrid rendering).

If any anomalies, file an inline followup task; do not amend earlier commits.

---

## Done

After Task 13, the PR is ready for review. The 13-commit sequence preserves bisectability: any subsequent regression can be located by `git bisect` between commits.
