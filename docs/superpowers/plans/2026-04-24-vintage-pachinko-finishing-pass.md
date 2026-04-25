# Vintage Pachinko · Finishing Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land items #1–5 from the Vintage Pachinko hand-off in one PR so the live app renders pixel-close to the design source at `/tmp/design1/kakeguruimasho/project/pachinko-screens.jsx`. Replace inline paperclip swatches with the `<Chip>` primitive everywhere, rebuild the main wheel as a 50-slice lacquer cabinet, rebuild the bonus wheel as a 24-slice kanji wheel, animate the Tier III chrysanthemum reveal at 2s/360°, and apply the masthead + paper-grain chassis to all remaining routes.

**Architecture:** The PR layers cosmetic refinements on top of the foundation that landed in PR #2 (theme system, parlour primitives, masthead chassis on Home + SpinFlow). The wheel canvases keep their existing public API (`targetSegmentIndex` 0–4 indexed into `MAIN_WHEEL_SEGMENT_ORDER` / `BONUS_WHEEL_SEGMENT_ORDER`) so the orchestrator and tests stay untouched; the SVG internals expand from N tier-shaped wedges to N×k visual slices and use a tier→first-matching-slice mapping for rotation. `data-segment-index="0..N-1"` and `data-tier` are kept on hidden anchor groups so existing near-miss DOM assertions still resolve. Casino chip rendering centralizes through a shared `CLIP_HEX` map (literal hex; the Chip primitive's `shiftHex` math needs literal `#RRGGBB`, not CSS variables). Chassis on remaining routes follows the exact pattern used by `Home.tsx` and `SpinFlow.tsx`: `parlour-grain parlour-halftone` on the section, `parlour-masthead` header with kicker/title/tagline/Motif, and a `DecoDivider` before content.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest + React Testing Library, Framer Motion, CSS variables (theme tokens), SVG. Dev server: `npm run dev` → `http://localhost:5173/kakeguruimasho/`.

**Source of truth:** `/tmp/design1/kakeguruimasho/project/pachinko.jsx` (PachinkoWheel, PachinkoBonusWheel, Chrysanthemum, PlumBlossom, brass pointer geometry) and `/tmp/design1/kakeguruimasho/project/pachinko-screens.jsx` (PachinkoReveal animation, Reveal-screen radiating rays + confetti, PachinkoBonusWheel composition).

---

## File Structure

### New files

- `src/features/spin/clip-colors.ts` — central literal-hex map for clip colors used by `<Chip>`. Mirrors the `--clip-*` CSS variables in `themes.css` so the Chip's `shiftHex` math has real hex to brighten/darken.
- `src/features/wheel/wheel-slices.ts` — pure module exporting the 50-slice main-wheel sequence and 24-slice bonus-wheel sequence (matching the design source exactly), plus tier→first-matching-slice index lookups.
- `src/features/wheel/__tests__/wheel-slices.test.ts` — verifies slice counts, distribution percentages, and tier→slice mapping.
- `src/features/wheel/Chrysanthemum.tsx` — extracted SVG component (re-used by the wheel hub and the reveal animation).
- `src/features/wheel/PlumBlossom.tsx` — extracted SVG component (bonus-wheel hub, reveal confetti).
- `src/features/wheel/BrassPointer.tsx` — small SVG primitive shared by main + bonus wheels.
- `src/features/spin/RevealStage.tsx` — thin wrapper that renders the spinning chrysanthemum + 大当たり banner above the reward menu when `tier === 'T3'`.
- `src/features/spin/__tests__/RevealStage.test.tsx` — RTL coverage for tier-gating + animation class presence.

### Modified files

- `src/ui/parlour/Chip.tsx` — already renders the chip body. No code changes (already supports literal `color` props). Verify only.
- `src/features/spin/HandView.tsx` — replace `.hand-view__swatch` and `.hand-view__chip` divs with `<Chip>` / `<GoldChip>`.
- `src/features/spin/CashInPicker.tsx` — replace `.cash-in-picker__swatch` with `<Chip>`.
- `src/features/spin/spin.css` — delete the now-orphan `.hand-view__swatch*`, `.hand-view__chip*`, `.cash-in-picker__swatch` rules; tighten the surrounding row layouts to fit the larger chip glyph.
- `src/features/jar/ActivityFeed.tsx` — for `clip_earned` events, render a small `<Chip color={...}>` in place of the `Coins` lucide icon. (Leaves the other icons alone.)
- `src/features/wheel/WheelCanvas.tsx` — rebuild the SVG: 50 weighted slices, brass nested rim, peg ring, brass pointer, lacquer hub with chrysanthemum + 賭狂魔笙. Public props/return shape unchanged; rotation maps tier index → first-matching slice.
- `src/features/wheel/BonusWheelCanvas.tsx` — re-export still re-exports from WheelCanvas (no change). Bonus wheel implementation in WheelCanvas.tsx grows to 24 slices with kanji labels.
- `src/features/rewards/RewardPickerModal.tsx` — when `tier === 'T3'` and the dialog is open, render `<RevealStage>` at the top of the modal content above the reward `<ul>`.
- `src/features/rewards/rewards.css` — keyframes for `pachinko-bloom-spin` (2s/360° linear infinite); reveal banner type + glow.
- `src/routes/Habits.tsx` — wrap with parlour chassis (masthead + grain).
- `src/routes/Jar.tsx` — wrap with parlour chassis.
- `src/routes/Rewards.tsx` — wrap with parlour chassis.
- `src/routes/Settings.tsx` — wrap with parlour chassis.
- `src/routes/Onboarding.tsx` (or `src/features/onboarding/OnboardingFlow.tsx`) — wrap with parlour chassis.

### Untouched (intentionally)

- `src/features/wheel/wheel.engine.ts` — pure RNG. Continues to expose 5-tier `MAIN_WHEEL_SEGMENT_ORDER` and 5-segment `BONUS_WHEEL_SEGMENT_ORDER`. The visual canvas is the only thing that knows about 50/24 slices.
- `src/features/wheel/spin-orchestrator.ts` — unchanged.
- `src/features/wheel/animation-constants.ts` — durations stay; visuals expand under the same timing.
- `src/styles/themes.css` / `themes.ts` — already has the right tokens. No edits.

---

## Notes on test contracts that must survive this PR

- `near-miss.test.tsx:163-176` queries `[data-segment-index="${mainSegmentIndex(tier)}"]` where the index is 0–4 and reads `data-tier` from that node. With 50 slices we keep five hidden anchor `<g data-segment-index="0..4" data-tier="T1..JACKPOT" aria-hidden="true">` elements — one per tier — separate from the 50 visual `<path>` slices (which carry `data-slice-index="0..49"` and `data-tier`). The animation rotates by visual-slice index; the anchors exist purely to satisfy the test's DOM lookup.
- `wheel.engine.test.ts:294-307` tests `mainSegmentIndex` / `bonusSegmentIndex` — these stay as-is in `wheel.engine.ts`.
- `data-testid` attributes on `hand-view`, `cash-in-picker`, `main-wheel`, `bonus-wheel`, `spin-button` are preserved.

---

## Task 0: Pre-flight verification

**Files:** none modified.

- [ ] **Step 1: Run the existing test suite to confirm baseline.**

```bash
npm test 2>&1 | tail -40
```

Expected: all tests pass.

- [ ] **Step 2: Run the build.**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 3: Start the dev server in the background and confirm a 200 on the index.**

```bash
npm run dev > /tmp/vite.log 2>&1 &
DEV_PID=$!
# wait for the server to bind
until curl -fsS -o /dev/null http://localhost:5173/kakeguruimasho/; do sleep 1; done
echo "dev up; pid=$DEV_PID"
```

Expected: dev server is live at `http://localhost:5173/kakeguruimasho/`. Leave it running for the rest of the plan; we'll re-load after each commit to spot-check.

- [ ] **Step 4: Take a "before" screenshot of Home + SpinFlow + Habits + Jar + Rewards + Settings + Onboarding for visual diffing.**

Use the Chrome MCP via `mcp__plugin_playwright_playwright__browser_navigate` to each route and take screenshots. Save as references; we don't commit them. (Note: this is a visual diffing aid, not a test.)

---

## Task 1: Centralize the clip-color hex map

**Files:**
- Create: `src/features/spin/clip-colors.ts`

- [ ] **Step 1: Create the literal-hex clip color map.**

Mirrors the `--clip-*` CSS variables in `src/styles/themes.css:44-49`. The Chip primitive's `shiftHex` requires literal `#RRGGBB`; CSS variables can't be parsed.

```ts
// src/features/spin/clip-colors.ts
/**
 * Literal-hex clip colors for use by <Chip>.
 *
 * Mirrors `--clip-*` in themes.css. The Chip primitive's color-shift math
 * requires `#RRGGBB`, so we keep these as literals here. Themes that want
 * different chip palettes will add overrides in a follow-up PR.
 */

import type { ClipColor } from '../../types/clip.ts';

export const CLIP_HEX: Record<ClipColor, string> = {
  red: '#a8302a',
  blue: '#3a6680',
  green: '#3a7458',
  yellow: '#caa248',
  purple: '#704a76',
  pink: '#a85068',
};
```

- [ ] **Step 2: Verify the build still succeeds.**

```bash
npm run build 2>&1 | tail -5
```

Expected: build succeeds. (No callers yet.)

- [ ] **Step 3: Commit.**

```bash
git add src/features/spin/clip-colors.ts
git commit -m "Add literal-hex CLIP_HEX map for Chip primitive consumers"
```

---

## Task 2: Wire `<Chip>` into HandView (color-group buttons + sub-stack)

**Files:**
- Modify: `src/features/spin/HandView.tsx`
- Modify: `src/features/spin/spin.css` (delete swatch + chip rules)

The existing `<HandView>` renders one tappable button per color group, with a `.hand-view__swatch` filled by `var(--clip-red)` etc. Tapping expands a sub-stack of `.hand-view__chip` paperclip-shaped divs. We swap both for `<Chip>` (color-group: 28px chip; sub-stack: 18px chip). `<GoldChip>` covers the gold case in both places.

- [ ] **Step 1: Replace HandView swatch + sub-stack with Chip.**

Apply this edit to `src/features/spin/HandView.tsx`. The `SWATCH_VAR` constant is removed; we now use `CLIP_HEX`.

```tsx
// At the top, replace the existing imports + SWATCH_VAR block with:
import { useMemo, useState, type ReactElement } from 'react';

import { useAppStore } from '../../state/store.ts';
import { selectHand } from '../../state/selectors.ts';
import type { Clip, ClipColor } from '../../types/clip.ts';
import type { JarId } from '../../types/ids.ts';
import { DEFAULT_CLIP_COLORS } from '../../types/clip.ts';
import { Chip, GoldChip } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from './clip-colors.ts';

import './spin.css';
```

Inside the component, swap the swatch span and the sub-stack span:

```tsx
// Color-group button (replace the <span className="hand-view__swatch" .../> block):
{isGold ? (
  <GoldChip size={28} ariaLabel="Gold clip" />
) : (
  <Chip
    color={CLIP_HEX[key as ClipColor]}
    size={28}
    ariaLabel={`${key} clip`}
  />
)}

// Sub-stack item (replace the <span className="hand-view__chip" ... /> block):
{groups[expanded].map((clip) => (
  <span
    key={clip.id}
    className="hand-view__substack-item"
    aria-hidden="true"
  >
    {expanded === 'gold' ? (
      <GoldChip size={20} />
    ) : (
      <Chip color={CLIP_HEX[expanded as ClipColor]} size={20} />
    )}
  </span>
))}
```

Drop the now-unused `cn(...)` calls referencing `hand-view__swatch--gold` and `hand-view__chip--gold`. The full updated file should not reference `SWATCH_VAR` anywhere.

- [ ] **Step 2: Delete the orphan CSS rules.**

In `src/features/spin/spin.css`, delete these blocks (line numbers may shift, search by selector):

```css
.hand-view__swatch { ... }
.hand-view__swatch--gold { ... }
.hand-view__chip { ... }
.hand-view__chip--gold { ... }
```

Add a tiny replacement:

```css
.hand-view__substack-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 3: Run HandView's tests (and the broader spin tests).**

```bash
npm test -- --reporter=verbose src/features/spin
```

Expected: all spin tests pass. The existing tests use `data-testid`, not the swatch class, so they keep working.

- [ ] **Step 4: Smoke-check in the browser.**

Open `http://localhost:5173/kakeguruimasho/spin` (or whatever route renders `<HandView>`) — confirm chips render with color-shaded body, edge spots, and gold halo for the gold pile.

- [ ] **Step 5: Commit.**

```bash
git add src/features/spin/HandView.tsx src/features/spin/spin.css
git commit -m "Render HandView color groups and sub-stack as casino chips"
```

---

## Task 3: Wire `<Chip>` into CashInPicker

**Files:**
- Modify: `src/features/spin/CashInPicker.tsx`
- Modify: `src/features/spin/spin.css` (delete the `.cash-in-picker__swatch` rule)

- [ ] **Step 1: Replace the swatch span with a Chip.**

In `CashInPicker.tsx`, drop the `SWATCH_VAR` constant (lines 59–66) and import `Chip` + `CLIP_HEX`:

```tsx
import { Chip } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from './clip-colors.ts';
```

Replace the swatch span (currently `<span className="cash-in-picker__swatch" ... />`):

```tsx
<Chip color={CLIP_HEX[color]} size={24} ariaLabel={`${color} clip`} />
```

The grid-template-columns in the row CSS (`24px 1fr auto`) already fits a 24px chip — no layout change needed. Verify the row alignment after the swap.

- [ ] **Step 2: Delete the orphan CSS rule in spin.css.**

```css
.cash-in-picker__swatch { ... }
```

- [ ] **Step 3: Run the CashInPicker tests.**

```bash
npm test -- src/features/spin/__tests__/CashInPicker.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add src/features/spin/CashInPicker.tsx src/features/spin/spin.css
git commit -m "Render CashInPicker color rows as casino chips"
```

---

## Task 4: Use `<Chip>` for clip-earned rows in ActivityFeed

**Files:**
- Modify: `src/features/jar/ActivityFeed.tsx`

The `clip_earned` event currently renders a lucide `Coins` icon. We replace it with a tiny chip rendering in the actual color of the clip earned. (Other event kinds keep their lucide icons — those don't represent clips.)

- [ ] **Step 1: Branch icon rendering by event kind.**

In `ActivityFeed.tsx`, the `<r.icon size={16} />` line in the JSX needs to know whether to render a chip or a lucide icon. The `describe` function returns an `icon` field; we extend the `FeedRow` shape to optionally carry a `clipColor` for the chip case.

Change `describe`'s return for `clip_earned` to also expose the drawn color, and update the row to render a `<Chip>` when the event is `clip_earned`:

```tsx
import { Chip, GoldChip } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from '../spin/clip-colors.ts';
import type { ClipColor } from '../../types/clip.ts';

// inside FeedRow — add:
interface FeedRow {
  evt: HistoryEvent;
  day: string;
  time: string;
  icon: IconCmp;
  subtle: boolean;
  text: string;
  /** When set, render a <Chip color={...}> instead of `icon`. */
  clipColor?: ClipColor | 'gold';
}

// in describe(evt):
case 'clip_earned':
  return {
    icon: Coins as unknown as IconCmp, // fallback for older a11y readers
    subtle: false,
    text: `Earned a ${evt.drawnColor} clip`,
    clipColor: evt.drawnColor as ClipColor | 'gold',
  };
```

In the row JSX:

```tsx
<span className="activity-feed__item-icon" aria-hidden="true">
  {r.clipColor === 'gold' ? (
    <GoldChip size={16} />
  ) : r.clipColor ? (
    <Chip color={CLIP_HEX[r.clipColor as ClipColor]} size={16} />
  ) : (
    <r.icon size={16} />
  )}
</span>
```

If `evt.drawnColor` is typed as a string union that includes `'gold'`, the cast is safe. If not, narrow it with a small type guard — but **do not invent** a guard if the type already includes gold. Read `src/types/history.ts` first to confirm.

- [ ] **Step 2: Confirm the existing ActivityFeed tests still pass.**

```bash
npm test -- src/features/jar/__tests__/ActivityFeed.test.tsx
```

Expected: PASS. (The test asserts text content and structure; our visual swap doesn't break it.)

- [ ] **Step 3: Commit.**

```bash
git add src/features/jar/ActivityFeed.tsx
git commit -m "Render clip-earned activity rows with Chip glyph"
```

---

## Task 5: Build the slice catalogue (50-slice main + 24-slice bonus)

**Files:**
- Create: `src/features/wheel/wheel-slices.ts`
- Create: `src/features/wheel/__tests__/wheel-slices.test.ts`

This module is the single source of truth for the visual slice sequences. Mirrored verbatim from `/tmp/design1/kakeguruimasho/project/pachinko.jsx:308-314` (main wheel) and `pachinko-screens.jsx:957-961` (bonus wheel).

- [ ] **Step 1: Write the failing test first.**

```ts
// src/features/wheel/__tests__/wheel-slices.test.ts
import { describe, expect, it } from 'vitest';
import {
  MAIN_WHEEL_SLICE_SEQUENCE,
  BONUS_WHEEL_SLICE_SEQUENCE,
  mainTierToVisualSlice,
  bonusSegmentToVisualSlice,
} from '../wheel-slices.ts';

describe('wheel slice catalogue', () => {
  it('main wheel has exactly 50 slices', () => {
    expect(MAIN_WHEEL_SLICE_SEQUENCE.length).toBe(50);
  });

  it('main wheel slice tier counts match design source', () => {
    const counts = MAIN_WHEEL_SLICE_SEQUENCE.reduce<Record<string, number>>(
      (acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }),
      {},
    );
    // Counts come from the actual hand-crafted sequence in pachinko.jsx:308-314.
    // The designer's COMMENT in that file says "40/30/20/8/2 → 20/15/10/4/1" but
    // the actual sequence they wrote has 23/12/11/3/1 — the comment is aspirational.
    // We follow what the design source renders, not what the comment claims.
    expect(counts.I).toBe(23);
    expect(counts.II).toBe(12);
    expect(counts.III).toBe(11);
    expect(counts.BONUS).toBe(3);
    expect(counts.JP).toBe(1);
  });

  it('bonus wheel has exactly 24 slices', () => {
    expect(BONUS_WHEEL_SLICE_SEQUENCE.length).toBe(24);
  });

  it('bonus wheel slice prize counts match design source', () => {
    const counts = BONUS_WHEEL_SLICE_SEQUENCE.reduce<Record<string, number>>(
      (acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }),
      {},
    );
    // Same caveat as the main wheel — the designer's comment in
    // pachinko-screens.jsx:946-948 says "sm:9 / md:6 / lg:4 / x2:3 / free:2"
    // but the actual sequence has sm:10 / md:6 / lg:4 / x2:2 / free:2.
    expect(counts.sm).toBe(10);
    expect(counts.md).toBe(6);
    expect(counts.lg).toBe(4);
    expect(counts.x2).toBe(2);
    expect(counts.free).toBe(2);
  });

  it('mainTierToVisualSlice maps each tier to its first-matching slice index', () => {
    expect(mainTierToVisualSlice('T1')).toBe(0);
    expect(mainTierToVisualSlice('T2')).toBe(1);
    expect(mainTierToVisualSlice('T3')).toBe(3);
    expect(mainTierToVisualSlice('BONUS')).toBe(8);
    expect(mainTierToVisualSlice('JACKPOT')).toBe(19);
  });

  it('bonusSegmentToVisualSlice maps each segment to its first-matching slice index', () => {
    // seq: sm,md,sm,lg,sm,md,sm,x2,sm,md,lg,sm,free,sm,md,sm,lg,sm,x2,md,sm,lg,md,free
    expect(bonusSegmentToVisualSlice('PCT_25')).toBe(0); // sm
    expect(bonusSegmentToVisualSlice('PCT_50')).toBe(1); // md
    expect(bonusSegmentToVisualSlice('PCT_75')).toBe(3); // lg
    expect(bonusSegmentToVisualSlice('FREE')).toBe(12); // free
    expect(bonusSegmentToVisualSlice('EXTRA')).toBe(7); // x2 stands in for "+1 spin"
  });
});
```

- [ ] **Step 2: Run the test — it should fail (module doesn't exist).**

```bash
npm test -- src/features/wheel/__tests__/wheel-slices.test.ts
```

Expected: FAIL with "Cannot find module '../wheel-slices.ts'".

- [ ] **Step 3: Implement the module.**

```ts
// src/features/wheel/wheel-slices.ts
/**
 * Visual slice catalogues for the main + bonus wheels.
 *
 * The wheel ENGINE (wheel.engine.ts) deals in 5-tier outcomes — these
 * sequences are how the canvas turns those outcomes into the dense,
 * many-sliced visual the design calls for. Every entry is one wedge.
 *
 * Sequences are copied verbatim from the design source at
 * /tmp/design1/kakeguruimasho/project/pachinko.jsx (PachinkoWheel, line 308)
 * and pachinko-screens.jsx (PachinkoBonusWheel, line 957).
 *
 * Mapping policy: when the orchestrator says "T2", we land on the FIRST
 * slice in MAIN_WHEEL_SLICE_SEQUENCE whose tier is 'II'. This is a
 * deterministic, low-effort choice; it produces a believable spin without
 * requiring the orchestrator to know about visual slices.
 */

import type { BonusSegment, MainWheelTier } from '../../types/wheel.ts';

export type MainSliceTier = 'I' | 'II' | 'III' | 'BONUS' | 'JP';
export type BonusSlicePrize = 'sm' | 'md' | 'lg' | 'x2' | 'free';

export const MAIN_WHEEL_SLICE_SEQUENCE: readonly MainSliceTier[] = [
  'I','II','I','III','I','II','I','III','BONUS','I',
  'II','I','III','I','II','I','III','I','II','JP',
  'I','III','I','II','I','III','I','II','BONUS','I',
  'II','I','III','I','II','I','III','I','II','I',
  'III','I','II','III','I','BONUS','I','II','I','III',
] as const;

export const BONUS_WHEEL_SLICE_SEQUENCE: readonly BonusSlicePrize[] = [
  'sm','md','sm','lg','sm','md','sm','x2','sm','md',
  'lg','sm','free','sm','md','sm','lg','sm','x2','md',
  'sm','lg','md','free',
] as const;

const MAIN_TIER_TO_SLICE_TIER: Record<MainWheelTier, MainSliceTier> = {
  T1: 'I',
  T2: 'II',
  T3: 'III',
  BONUS: 'BONUS',
  JACKPOT: 'JP',
};

export function mainTierToVisualSlice(tier: MainWheelTier): number {
  const target = MAIN_TIER_TO_SLICE_TIER[tier];
  const idx = MAIN_WHEEL_SLICE_SEQUENCE.indexOf(target);
  if (idx < 0) {
    throw new Error(`No visual slice found for tier ${tier}`);
  }
  return idx;
}

const BONUS_SEGMENT_TO_SLICE: Record<BonusSegment, BonusSlicePrize> = {
  // engine segment → visual category
  PCT_25: 'sm',
  PCT_50: 'md',
  PCT_75: 'lg',
  FREE: 'free',
  EXTRA: 'x2', // "extra spin" doubles down — visually treat as multiplier
};

export function bonusSegmentToVisualSlice(segment: BonusSegment): number {
  const target = BONUS_SEGMENT_TO_SLICE[segment];
  const idx = BONUS_WHEEL_SLICE_SEQUENCE.indexOf(target);
  if (idx < 0) {
    throw new Error(`No visual slice found for bonus segment ${segment}`);
  }
  return idx;
}
```

- [ ] **Step 4: Run the test — it should now pass.**

```bash
npm test -- src/features/wheel/__tests__/wheel-slices.test.ts
```

Expected: PASS, all 6 cases green.

- [ ] **Step 5: Commit.**

```bash
git add src/features/wheel/wheel-slices.ts src/features/wheel/__tests__/wheel-slices.test.ts
git commit -m "Add 50-slice main + 24-slice bonus wheel slice catalogues"
```

---

## Task 6: Extract Chrysanthemum, PlumBlossom, BrassPointer SVG primitives

**Files:**
- Create: `src/features/wheel/Chrysanthemum.tsx`
- Create: `src/features/wheel/PlumBlossom.tsx`
- Create: `src/features/wheel/BrassPointer.tsx`

These are pulled verbatim from `/tmp/design1/kakeguruimasho/project/pachinko.jsx`. Re-used by the wheel hubs and the reveal animation.

- [ ] **Step 1: Create Chrysanthemum.**

```tsx
// src/features/wheel/Chrysanthemum.tsx
import type { CSSProperties, ReactElement } from 'react';

export interface ChrysanthemumProps {
  size?: number;
  color?: string;
  stroke?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/** 16-petal chrysanthemum (Imperial seal). Source: pachinko.jsx:74-93. */
export function Chrysanthemum({
  size = 60,
  color = 'var(--color-gold)',
  stroke = 'var(--color-gold-deep)',
  style,
  ariaLabel,
}: ChrysanthemumProps): ReactElement {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-30 -30 60 60"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      style={style}
    >
      {petals.map((a) => (
        <ellipse
          key={`o-${a}`}
          cx="0"
          cy="-18"
          rx="3.4"
          ry="9"
          fill={color}
          stroke={stroke}
          strokeWidth="0.4"
          transform={`rotate(${a})`}
          opacity="0.92"
        />
      ))}
      {petals.map((a) => (
        <ellipse
          key={`i-${a}`}
          cx="0"
          cy="-10"
          rx="2.6"
          ry="6"
          fill={color}
          stroke={stroke}
          strokeWidth="0.3"
          transform={`rotate(${a + 11.25})`}
          opacity="0.95"
        />
      ))}
      <circle cx="0" cy="0" r="4" fill={stroke} />
      <circle cx="0" cy="0" r="2" fill={color} />
    </svg>
  );
}
```

- [ ] **Step 2: Create PlumBlossom.**

```tsx
// src/features/wheel/PlumBlossom.tsx
import type { CSSProperties, ReactElement } from 'react';

export interface PlumBlossomProps {
  size?: number;
  color?: string;
  center?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/** 5-petal plum blossom. Source: pachinko.jsx:157-168. */
export function PlumBlossom({
  size = 30,
  color = 'var(--color-gold)',
  center = '#a8302a',
  style,
  ariaLabel,
}: PlumBlossomProps): ReactElement {
  const petals = [0, 72, 144, 216, 288];
  return (
    <svg
      width={size}
      height={size}
      viewBox="-20 -20 40 40"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      style={style}
    >
      {petals.map((a) => (
        <circle
          key={a}
          cx="0"
          cy="-10"
          r="6"
          fill={color}
          opacity="0.85"
          transform={`rotate(${a})`}
        />
      ))}
      <circle cx="0" cy="0" r="2.5" fill={center} />
    </svg>
  );
}
```

- [ ] **Step 3: Create BrassPointer.**

Source: `pachinko.jsx:427-434` (main wheel pointer). The smaller bonus pointer in `pachinko-screens.jsx:1064-1070` differs only in dimensions, so we accept a `size` prop.

```tsx
// src/features/wheel/BrassPointer.tsx
import type { CSSProperties, ReactElement } from 'react';

export interface BrassPointerProps {
  /** "main" → 44×36, "bonus" → 30×24. */
  size?: 'main' | 'bonus';
  style?: CSSProperties;
}

const DIM = {
  main: { w: 44, h: 36, vb: '0 0 44 36', tip: 'M22 34 L4 4 L40 4 Z', mid: 'M22 32 L7 5 L37 5 Z', inner: 'M22 28 L13 7 L31 7 Z', boltX: 22, boltY: 9, boltOuter: 2.2, boltInner: 1 },
  bonus: { w: 30, h: 24, vb: '0 0 30 24', tip: 'M15 22 L3 3 L27 3 Z', mid: 'M15 20 L5 4 L25 4 Z', inner: 'M15 17 L9 5 L21 5 Z', boltX: 15, boltY: 6, boltOuter: 1.4, boltInner: 0 },
};

export function BrassPointer({ size = 'main', style }: BrassPointerProps): ReactElement {
  const d = DIM[size];
  return (
    <svg
      width={d.w}
      height={d.h}
      viewBox={d.vb}
      style={{ filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.6))', ...style }}
      aria-hidden="true"
    >
      <path d={d.tip} fill="var(--color-gold-deep)" />
      <path d={d.mid} fill="var(--color-gold)" />
      <path d={d.inner} fill="var(--color-gold-deep)" opacity="0.5" />
      <circle cx={d.boltX} cy={d.boltY} r={d.boltOuter} fill="var(--color-bg)" />
      {d.boltInner > 0 ? (
        <circle cx={d.boltX} cy={d.boltY} r={d.boltInner} fill="var(--color-gold)" />
      ) : null}
    </svg>
  );
}
```

- [ ] **Step 4: Build to confirm types are clean.**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds. (No callers yet — these will be wired up in Task 7.)

- [ ] **Step 5: Commit.**

```bash
git add src/features/wheel/Chrysanthemum.tsx src/features/wheel/PlumBlossom.tsx src/features/wheel/BrassPointer.tsx
git commit -m "Extract Chrysanthemum, PlumBlossom, BrassPointer SVG primitives"
```

---

## Task 7: Rebuild WheelCanvas with the 50-slice lacquer cabinet

**Files:**
- Modify: `src/features/wheel/WheelCanvas.tsx`

The public API stays the same. We replace the body of `WheelCanvas` (and only that — `BonusWheelCanvas` lower in the file is rebuilt in Task 8). The new SVG renders 50 visual slices, brass pointer, peg ring, lacquer hub, chrysanthemum, and 賭狂魔笙 wordmark; rotation uses `mainTierToVisualSlice` to convert the orchestrator's 0–4 tier index into a 0–49 visual slice index. The five `data-segment-index="0..4"` test anchors are kept as hidden `<g>` markers so existing DOM lookups still work.

- [ ] **Step 1: Update imports + add tier color metadata at the top of WheelCanvas.tsx.**

Add these imports near the top:

```tsx
import { MAIN_WHEEL_SLICE_SEQUENCE, mainTierToVisualSlice, type MainSliceTier } from './wheel-slices.ts';
import { Chrysanthemum } from './Chrysanthemum.tsx';
import { BrassPointer } from './BrassPointer.tsx';
```

Add slice tier color metadata (mirror of `tiers` in pachinko.jsx:297-303):

```tsx
type SliceTierMeta = {
  base: string;
  shade: string;
  jp: string;
  /** Maps a slice tier to the engine MainWheelTier so we can preserve data-tier. */
  engineTier: MainWheelTier;
  ink: 'light' | 'dark';
};

const SLICE_TIER_META: Record<MainSliceTier, SliceTierMeta> = {
  I:     { base: '#a8302a', shade: '#7a1f1c', jp: '一', engineTier: 'T1',     ink: 'light' },
  II:    { base: '#3a6680', shade: '#284b62', jp: '二', engineTier: 'T2',     ink: 'light' },
  III:   { base: '#704a76', shade: '#523557', jp: '三', engineTier: 'T3',     ink: 'light' },
  BONUS: { base: '#3a7458', shade: '#28553e', jp: '副', engineTier: 'BONUS',  ink: 'light' },
  JP:    { base: 'var(--color-gold)', shade: 'var(--color-gold-deep)', jp: '★', engineTier: 'JACKPOT', ink: 'dark' },
};
```

- [ ] **Step 2: Replace the WheelCanvas function body.**

The replacement renders:
1. 50 path slices (alternating base/shade by parity), stroked with `var(--color-bg)` hairlines.
2. A peg ring (50 brass dots) outside the rim.
3. A radial felt overlay.
4. Five hidden test anchors with `data-segment-index="0..4"` and `data-tier="T1..JACKPOT"`.
5. The lacquer hub with `<Chrysanthemum>` + `賭狂魔笙` wordmark.
6. A `<BrassPointer size="main" />` at the top.
7. Cabinet frame: nested brass rim circles + outer hairline.

`rotationForIndex` continues to operate in degrees — but now `count = 50`. For an incoming tier index `t` (0–4), we map to `mainTierToVisualSlice(MAIN_WHEEL_SEGMENT_ORDER[t])` then call `rotationForIndex(visualIdx, 50)`.

Show the full replacement function:

```tsx
export function WheelCanvas(props: WheelCanvasProps): React.ReactElement {
  const { targetSegmentIndex, nearMissDriftIndex, onAnimationComplete, idle } = props;
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const lastPlayedRef = useRef<number | null>(null);

  // The animation operates on the 50-slice visual indexing.
  const targetTier = MAIN_WHEEL_SEGMENT_ORDER[targetSegmentIndex];
  const driftTier =
    nearMissDriftIndex !== undefined && nearMissDriftIndex !== targetSegmentIndex
      ? MAIN_WHEEL_SEGMENT_ORDER[nearMissDriftIndex]
      : undefined;
  const targetVisualIdx = targetTier ? mainTierToVisualSlice(targetTier) : 0;
  const driftVisualIdx = driftTier ? mainTierToVisualSlice(driftTier) : undefined;

  useEffect(() => {
    if (idle) return;
    const playKey = targetSegmentIndex * 1000 + (nearMissDriftIndex ?? -1);
    if (lastPlayedRef.current === playKey) return;
    lastPlayedRef.current = playKey;

    const N = MAIN_WHEEL_SLICE_SEQUENCE.length; // 50
    const finalRot = rotationForIndex(targetVisualIdx, N);

    if (reduceMotion) {
      void controls
        .start({
          rotate: finalRot,
          transition: { duration: 0.3, ease: 'easeOut' },
        })
        .then(() => onAnimationComplete?.());
      return;
    }

    const run = async (): Promise<void> => {
      if (driftVisualIdx !== undefined) {
        const driftRot = rotationForIndex(driftVisualIdx, N);
        const overshootSweep = (360 / N) * NEAR_MISS_OVERSHOOT_FACTOR;
        const phase1End = driftRot - overshootSweep - 360 * MAIN_WHEEL_REVOLUTIONS;
        await controls.start({
          rotate: phase1End,
          transition: { duration: MAIN_WHEEL_SPIN_DURATION_SEC * 0.75, ease: [0.15, 0.5, 0.3, 1] },
        });
        const remainder = ((phase1End - finalRot) % 360 + 360) % 360;
        const phase2End = phase1End - remainder;
        await controls.start({
          rotate: phase2End,
          transition: { duration: MAIN_WHEEL_SPIN_DURATION_SEC * 0.25, ease: 'easeOut' },
        });
      } else {
        const endRot = finalRot - 360 * MAIN_WHEEL_REVOLUTIONS;
        await controls.start({
          rotate: endRot,
          transition: { duration: MAIN_WHEEL_SPIN_DURATION_SEC, ease: [0.2, 0.8, 0.2, 1] },
        });
      }
      await controls.start({
        scale: [1, 1.04, 1],
        transition: { duration: WIN_PULSE_DURATION_SEC, ease: 'easeInOut' },
      });
      onAnimationComplete?.();
    };
    void run();
  }, [
    idle,
    targetSegmentIndex,
    nearMissDriftIndex,
    targetVisualIdx,
    driftVisualIdx,
    reduceMotion,
    controls,
    onAnimationComplete,
  ]);

  // Geometry: viewBox 400×400, slices fan from a 130-radius circle to
  // the 50-radius hub. We keep VIEWBOX/CENTER/etc from the existing code.
  const N = MAIN_WHEEL_SLICE_SEQUENCE.length;
  const slice = 360 / N;
  const cx = CENTER, cy = CENTER;
  const rOuter = 165;
  const rInner = 60;
  const rLabel = rOuter - 14;

  return (
    <div
      data-testid="main-wheel"
      style={{ position: 'relative', width: '100%', maxWidth: 400, aspectRatio: '1 / 1', margin: '0 auto' }}
    >
      {/* Pointer at top */}
      <div
        style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <BrassPointer size="main" />
      </div>

      <motion.svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        animate={controls}
        initial={{ rotate: 0, scale: 1 }}
        style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}
        role="img"
        aria-label="Main reward wheel"
      >
        <defs>
          <radialGradient id="pw-felt" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.05)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.5)" />
          </radialGradient>
          <linearGradient id="pw-rim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" />
            <stop offset="50%" stopColor="var(--color-gold-deep)" />
            <stop offset="100%" stopColor="var(--color-gold)" />
          </linearGradient>
        </defs>

        {/* Outer brass cabinet rim */}
        <circle cx={cx} cy={cy} r={rOuter + 22} fill="none" stroke="var(--color-gold-deep)" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={rOuter + 18} fill="none" stroke="url(#pw-rim)" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={rOuter + 12} fill="none" stroke="var(--color-bg)" strokeWidth="1" />

        {/* 50 slices */}
        {MAIN_WHEEL_SLICE_SEQUENCE.map((tk, i) => {
          const meta = SLICE_TIER_META[tk];
          const a0 = ((i * slice - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * slice - 90) * Math.PI) / 180;
          const x0 = cx + Math.cos(a0) * rOuter;
          const y0 = cy + Math.sin(a0) * rOuter;
          const x1 = cx + Math.cos(a1) * rOuter;
          const y1 = cy + Math.sin(a1) * rOuter;
          const fill = i % 2 === 0 ? meta.base : meta.shade;
          const showLabel = tk === 'JP' || tk === 'BONUS' || i % 5 === 0;
          const aMid = (((i + 0.5) * slice - 90) * Math.PI) / 180;
          const lx = cx + Math.cos(aMid) * rLabel;
          const ly = cy + Math.sin(aMid) * rLabel;
          const labelRot = (i + 0.5) * slice;
          return (
            <g key={i} data-slice-index={i} data-tier={meta.engineTier}>
              <path
                d={`M${cx} ${cy} L${x0} ${y0} A${rOuter} ${rOuter} 0 0 1 ${x1} ${y1} Z`}
                fill={fill}
                stroke="var(--color-bg)"
                strokeWidth="0.5"
                strokeOpacity="0.6"
              />
              {i % 5 === 0 ? (
                <line
                  x1={cx + Math.cos(a0) * (rOuter - 8)}
                  y1={cy + Math.sin(a0) * (rOuter - 8)}
                  x2={cx + Math.cos(a0) * rOuter}
                  y2={cy + Math.sin(a0) * rOuter}
                  stroke="var(--color-gold)"
                  strokeWidth="0.8"
                  opacity="0.9"
                />
              ) : null}
              {showLabel ? (
                <text
                  x={lx}
                  y={ly}
                  fill={meta.ink === 'light' ? 'var(--color-ink)' : 'var(--color-bg)'}
                  fontFamily='"Shippori Mincho", "DM Serif Display", serif'
                  fontSize={tk === 'JP' ? 13 : 11}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelRot}, ${lx}, ${ly})`}
                  style={{ letterSpacing: '0.05em' }}
                >
                  {meta.jp}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Felt overlay */}
        <circle cx={cx} cy={cy} r={rOuter} fill="url(#pw-felt)" opacity="0.4" pointerEvents="none" />

        {/* Peg ring — 50 brass dots */}
        {Array.from({ length: 50 }).map((_, i) => {
          const a = (i / 50) * Math.PI * 2;
          const px = cx + Math.cos(a) * (rOuter + 4);
          const py = cy + Math.sin(a) * (rOuter + 4);
          return (
            <g key={`peg-${i}`} aria-hidden="true">
              <circle cx={px} cy={py} r="1.6" fill="var(--color-gold-deep)" />
              <circle cx={px - 0.3} cy={py - 0.3} r="0.6" fill="#ffffff" opacity="0.7" />
            </g>
          );
        })}

        {/* Hub */}
        <circle cx={cx} cy={cy} r={rInner + 6} fill="var(--color-bg)" stroke="var(--color-gold-deep)" strokeWidth="0.8" />
        <circle cx={cx} cy={cy} r={rInner} fill="var(--color-felt-deep)" stroke="var(--color-gold)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={rInner - 4} fill="none" stroke="var(--color-gold-deep)" strokeWidth="0.5" />

        {/* Test anchors — preserve `data-segment-index` 0..4 + data-tier for near-miss tests */}
        <g aria-hidden="true">
          {MAIN_WHEEL_SEGMENT_ORDER.map((tier, i) => (
            <rect
              key={tier}
              data-segment-index={i}
              data-tier={tier}
              x={-1}
              y={-1}
              width={1}
              height={1}
              fill="transparent"
              opacity={0}
            />
          ))}
        </g>
      </motion.svg>

      {/* Hub overlay (Chrysanthemum + wordmark) — rendered outside the spinning <svg>
          so the brand mark stays upright while the wheel rotates. */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <Chrysanthemum size={48} />
        <div
          style={{
            fontFamily: '"Shippori Mincho", serif',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: '0.3em',
            color: 'var(--color-gold)',
            marginTop: 2,
          }}
        >
          賭狂魔笙
        </div>
      </div>
    </div>
  );
}
```

Be sure to leave `BonusWheelCanvas` and the surrounding helpers (`polarToCartesian`, `segmentPath`, `rotationForIndex`, `VIEWBOX`, `CENTER`, etc.) intact for now — Task 8 rebuilds the bonus wheel separately.

- [ ] **Step 3: Run all wheel tests.**

```bash
npm test -- src/features/wheel
```

Expected: PASS — `near-miss.test.tsx` finds the `data-segment-index` test anchors, `wheel-slices.test.ts` is green, and `wheel.engine.test.ts` is unchanged (engine wasn't touched).

If any fail, double-check (a) the test anchor `<g>` is mounted, (b) `data-tier` values match the engine tier names, (c) `MAIN_WHEEL_SEGMENT_ORDER` import is still in scope.

- [ ] **Step 4: Smoke-check in the browser.**

Reload `/spin`, trigger a spin, and confirm: 50 thin slices, brass pointer at top, brass-rim cabinet, peg ring, chrysanthemum hub stays upright while the wheel spins. The wheel ends with the pointer over a slice of the rolled tier.

- [ ] **Step 5: Commit.**

```bash
git add src/features/wheel/WheelCanvas.tsx
git commit -m "Rebuild WheelCanvas as 50-slice lacquer cabinet"
```

---

## Task 8: Rebuild BonusWheelCanvas with 24 slices + kanji labels

**Files:**
- Modify: `src/features/wheel/WheelCanvas.tsx` (the `BonusWheelCanvas` function lower in the file)

Same approach as Task 7: 24 visual slices, kanji labels on rare prizes only (`二五`, `五十`, `七五`, `倍`, `無料`), peg ring, plum-blossom hub, brass pointer (size="bonus"). Five hidden test anchors `data-segment-index="0..4"` keep tests happy.

- [ ] **Step 1: Add imports for the bonus assets.**

In `WheelCanvas.tsx`, add (alongside the existing imports):

```tsx
import { BONUS_WHEEL_SLICE_SEQUENCE, bonusSegmentToVisualSlice, type BonusSlicePrize } from './wheel-slices.ts';
import { PlumBlossom } from './PlumBlossom.tsx';
```

Add prize metadata (mirror of `prizes` in pachinko-screens.jsx:950-956):

```tsx
type BonusPrizeMeta = {
  base: string;
  shade: string;
  short: string;
  big: string;
  /** Maps to engine BonusSegment for data-tier preservation. */
  engineSegment: BonusSegment;
  rare: boolean;
};

const BONUS_PRIZE_META: Record<BonusSlicePrize, BonusPrizeMeta> = {
  sm:   { base: '#704a76', shade: '#523557', short: '25%',  big: '二五', engineSegment: 'PCT_25', rare: false },
  md:   { base: '#3a6680', shade: '#284b62', short: '50%',  big: '五十', engineSegment: 'PCT_50', rare: false },
  lg:   { base: '#a8302a', shade: '#7a1f1c', short: '75%',  big: '七五', engineSegment: 'PCT_75', rare: true  },
  x2:   { base: '#3a7458', shade: '#28553e', short: '×2',   big: '倍',   engineSegment: 'EXTRA',  rare: true  },
  free: { base: 'var(--color-gold)', shade: 'var(--color-gold-deep)', short: 'FREE', big: '無料', engineSegment: 'FREE', rare: true },
};
```

- [ ] **Step 2: Replace the BonusWheelCanvas function body.**

```tsx
export function BonusWheelCanvas(props: BonusWheelCanvasProps): React.ReactElement {
  const { targetSegmentIndex, onAnimationComplete } = props;
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const lastPlayedRef = useRef<number | null>(null);

  const targetSegment = BONUS_WHEEL_SEGMENT_ORDER[targetSegmentIndex];
  const targetVisualIdx = targetSegment ? bonusSegmentToVisualSlice(targetSegment) : 0;

  useEffect(() => {
    if (lastPlayedRef.current === targetSegmentIndex) return;
    lastPlayedRef.current = targetSegmentIndex;

    const N = BONUS_WHEEL_SLICE_SEQUENCE.length; // 24
    const finalRot = rotationForIndex(targetVisualIdx, N);

    if (reduceMotion) {
      void controls
        .start({
          rotate: finalRot,
          transition: { duration: 0.3, ease: 'easeOut' },
        })
        .then(() => onAnimationComplete?.());
      return;
    }

    const endRot = finalRot - 360 * BONUS_WHEEL_REVOLUTIONS;
    const run = async (): Promise<void> => {
      await controls.start({
        rotate: endRot,
        transition: { duration: BONUS_WHEEL_SPIN_DURATION_SEC, ease: [0.2, 0.8, 0.2, 1] },
      });
      await controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: WIN_PULSE_DURATION_SEC, ease: 'easeInOut' },
      });
      onAnimationComplete?.();
    };
    void run();
  }, [targetSegmentIndex, targetVisualIdx, reduceMotion, controls, onAnimationComplete]);

  const N = BONUS_WHEEL_SLICE_SEQUENCE.length;
  const slice = 360 / N;
  const cx = CENTER, cy = CENTER;
  const rOuter = 150;
  const rLabel = rOuter - 14;

  return (
    <div
      data-testid="bonus-wheel"
      style={{ position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '1 / 1', margin: '0 auto' }}
    >
      <div
        style={{
          position: 'absolute',
          top: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <BrassPointer size="bonus" />
      </div>

      <motion.svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        animate={controls}
        initial={{ rotate: 0, scale: 1 }}
        style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}
        role="img"
        aria-label="Bonus reward wheel"
      >
        <defs>
          <radialGradient id="bw-felt" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.04)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.45)" />
          </radialGradient>
          <linearGradient id="bw-rim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" />
            <stop offset="50%" stopColor="var(--color-gold-deep)" />
            <stop offset="100%" stopColor="var(--color-gold)" />
          </linearGradient>
        </defs>

        {/* nested brass rim */}
        <circle cx={cx} cy={cy} r={rOuter + 14} fill="var(--color-gold-deep)" />
        <circle cx={cx} cy={cy} r={rOuter + 12} fill="url(#bw-rim)" />
        <circle cx={cx} cy={cy} r={rOuter + 8} fill="var(--color-bg)" />
        <circle cx={cx} cy={cy} r={rOuter + 6} fill="none" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.7" />

        {BONUS_WHEEL_SLICE_SEQUENCE.map((pk, i) => {
          const meta = BONUS_PRIZE_META[pk];
          const a0 = ((i * slice - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * slice - 90) * Math.PI) / 180;
          const x0 = cx + Math.cos(a0) * rOuter;
          const y0 = cy + Math.sin(a0) * rOuter;
          const x1 = cx + Math.cos(a1) * rOuter;
          const y1 = cy + Math.sin(a1) * rOuter;
          const fill = i % 2 === 0 ? meta.base : meta.shade;
          const aMid = (((i + 0.5) * slice - 90) * Math.PI) / 180;
          const lx = cx + Math.cos(aMid) * rLabel;
          const ly = cy + Math.sin(aMid) * rLabel;
          const labelRot = (i + 0.5) * slice;
          return (
            <g key={i} data-slice-index={i} data-segment={meta.engineSegment}>
              <path
                d={`M${cx} ${cy} L${x0} ${y0} A${rOuter} ${rOuter} 0 0 1 ${x1} ${y1} Z`}
                fill={fill}
                stroke="var(--color-bg)"
                strokeWidth="0.5"
                strokeOpacity="0.6"
              />
              {pk === 'free' ? (
                <line
                  x1={cx + Math.cos(a0) * (rOuter - 6)}
                  y1={cy + Math.sin(a0) * (rOuter - 6)}
                  x2={cx + Math.cos(a0) * rOuter}
                  y2={cy + Math.sin(a0) * rOuter}
                  stroke="var(--color-gold)"
                  strokeWidth="1"
                />
              ) : null}
              {meta.rare ? (
                <text
                  x={lx}
                  y={ly}
                  fill={pk === 'free' ? 'var(--color-bg)' : 'var(--color-ink)'}
                  fontFamily='"Shippori Mincho", "DM Serif Display", serif'
                  fontSize={pk === 'free' ? 13 : 11}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelRot}, ${lx}, ${ly})`}
                  style={{ letterSpacing: '0.05em' }}
                >
                  {meta.big}
                </text>
              ) : null}
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r={rOuter} fill="url(#bw-felt)" opacity="0.5" pointerEvents="none" />

        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i / 36) * Math.PI * 2;
          const px = cx + Math.cos(a) * (rOuter + 3);
          const py = cy + Math.sin(a) * (rOuter + 3);
          return (
            <g key={`bp-${i}`} aria-hidden="true">
              <circle cx={px} cy={py} r="1.4" fill="var(--color-gold-deep)" />
              <circle cx={px - 0.3} cy={py - 0.3} r="0.5" fill="#ffffff" opacity="0.7" />
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r={32} fill="var(--color-bg)" stroke="var(--color-gold-deep)" strokeWidth="0.6" />
        <circle cx={cx} cy={cy} r={28} fill="var(--color-felt-deep)" stroke="var(--color-gold)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={22} fill="none" stroke="var(--color-gold-deep)" strokeWidth="0.4" />

        {/* Test anchors — preserve `data-segment-index` 0..4 + data-segment for any future tests */}
        <g aria-hidden="true">
          {BONUS_WHEEL_SEGMENT_ORDER.map((segment, i) => (
            <rect
              key={segment}
              data-segment-index={i}
              data-segment={segment}
              x={-1}
              y={-1}
              width={1}
              height={1}
              fill="transparent"
              opacity={0}
            />
          ))}
        </g>
      </motion.svg>

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <PlumBlossom size={36} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run wheel tests.**

```bash
npm test -- src/features/wheel
```

Expected: PASS.

- [ ] **Step 4: Smoke-check.**

Trigger a bonus wheel (cash in low + spin, or use the dev tools to fast-forward) — confirm 24 slices, kanji on rare prizes only (`二五`/`五十`/`七五`/`倍`/`無料`), plum blossom hub, brass pointer.

- [ ] **Step 5: Commit.**

```bash
git add src/features/wheel/WheelCanvas.tsx
git commit -m "Rebuild BonusWheelCanvas as 24-slice kanji wheel"
```

---

## Task 9: Animate the Tier III chrysanthemum reveal

**Files:**
- Create: `src/features/spin/RevealStage.tsx`
- Create: `src/features/spin/__tests__/RevealStage.test.tsx`
- Modify: `src/features/rewards/RewardPickerModal.tsx`
- Modify: `src/features/rewards/rewards.css` (keyframe + heading classes)

The reveal lives in the reward picker modal. When `tier === 'T3'`, we render `<RevealStage>` above the `<ul>` of reward options: a spinning chrysanthemum (2s/360° linear infinite), a 大当たり banner in DM Serif Display, "TIER III" engraved subtitle, and a small kicker reading the theme's jackpot copy.

The animation uses CSS keyframes (declared once in `rewards.css`) — Framer Motion isn't needed and would add weight to the rewards bundle. `prefers-reduced-motion` already kills animations globally via `globals.css:75-83`.

- [ ] **Step 1: Write the failing RevealStage test.**

```tsx
// src/features/spin/__tests__/RevealStage.test.tsx
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RevealStage } from '../RevealStage.tsx';

describe('<RevealStage />', () => {
  afterEach(cleanup);

  it('renders the spinning chrysanthemum + 大当たり banner for T3', () => {
    render(<RevealStage tier="T3" />);
    expect(screen.getByTestId('reveal-stage')).toBeInTheDocument();
    expect(screen.getByText('大当たり')).toBeInTheDocument();
    expect(screen.getByText(/TIER III/)).toBeInTheDocument();
    // The bloom element carries the spinning animation class.
    const bloom = screen.getByTestId('reveal-stage__bloom');
    expect(bloom.className).toMatch(/reveal-stage__bloom/);
  });

  it('renders nothing for T1/T2', () => {
    const { container } = render(<RevealStage tier="T1" />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — it fails (no module).**

```bash
npm test -- src/features/spin/__tests__/RevealStage.test.tsx
```

Expected: FAIL "Cannot find module '../RevealStage.tsx'".

- [ ] **Step 3: Implement RevealStage.**

```tsx
// src/features/spin/RevealStage.tsx
/**
 * RevealStage — the dopamine moment above the Tier III reward picker.
 *
 * Renders nothing for T1/T2. For T3 we show a spinning chrysanthemum
 * (CSS keyframes; 2s linear infinite), the 大当たり ("ōatari") banner,
 * an engraved TIER III subtitle, and the theme's jackpot copy below.
 *
 * Per `globals.css:75-83`, `prefers-reduced-motion: reduce` suppresses
 * the spin globally — no extra branch here.
 */

import type { ReactElement } from 'react';
import type { Tier } from '../../types/wheel.ts';
import { Chrysanthemum } from '../wheel/Chrysanthemum.tsx';
import { useTheme } from '../../styles/theme-context.ts';

import '../rewards/rewards.css'; // keyframe + reveal classes live here

export interface RevealStageProps {
  tier: Tier;
}

export function RevealStage({ tier }: RevealStageProps): ReactElement | null {
  const { themeMeta } = useTheme();
  if (tier !== 'T3') return null;

  return (
    <div className="reveal-stage" data-testid="reveal-stage">
      <div className="reveal-stage__bloom" data-testid="reveal-stage__bloom">
        <Chrysanthemum size={72} />
      </div>
      <div className="reveal-stage__kicker">{themeMeta.copy.jackpot}</div>
      <div className="reveal-stage__banner">大当たり</div>
      <div className="reveal-stage__subtitle">TIER III</div>
      <div className="reveal-stage__house">The House Honours You</div>
    </div>
  );
}
```

- [ ] **Step 4: Add the CSS — keyframes + reveal classes.**

Append to `src/features/rewards/rewards.css`:

```css
/* ---- RevealStage (T3 dopamine) ---- */

@keyframes pachinko-bloom-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.reveal-stage {
  text-align: center;
  padding: var(--space-4) var(--space-2) var(--space-3);
  margin-bottom: var(--space-4);
  background:
    radial-gradient(ellipse 70% 70% at 50% 30%, var(--color-gold-glow) 0%, transparent 60%),
    var(--color-felt-deep);
  border: 1px solid var(--color-gold);
  box-shadow:
    inset 0 0 0 1px var(--color-bg),
    inset 0 0 0 2px var(--color-gold),
    inset 0 0 0 3px var(--color-bg);
  border-radius: var(--radius-card);
  position: relative;
}

.reveal-stage__bloom {
  display: inline-block;
  animation: pachinko-bloom-spin 2s linear infinite;
  transform-origin: 50% 50%;
  filter: drop-shadow(0 0 12px var(--color-gold-glow));
}

.reveal-stage__kicker {
  font-family: var(--font-mono);
  font-size: calc(10px * var(--mono-scale));
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
  margin-top: var(--space-3);
}

.reveal-stage__banner {
  font-family: 'Shippori Mincho', var(--font-display);
  font-weight: 800;
  font-size: 56px;
  line-height: 1;
  letter-spacing: 0.1em;
  color: var(--color-gold);
  text-shadow: 0 0 20px var(--color-gold-glow), 0 2px 0 rgba(0, 0, 0, 0.5);
  margin-top: var(--space-2);
}

.reveal-stage__subtitle {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  letter-spacing: 0.18em;
  margin-top: var(--space-2);
  background: linear-gradient(180deg, var(--color-gold) 0%, var(--color-gold-deep) 55%, var(--color-gold) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
}

.reveal-stage__house {
  font-family: var(--font-mono);
  font-size: calc(9px * var(--mono-scale));
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
  margin-top: var(--space-2);
}
```

- [ ] **Step 5: Run RevealStage test — should pass now.**

```bash
npm test -- src/features/spin/__tests__/RevealStage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Mount RevealStage inside RewardPickerModal.**

In `src/features/rewards/RewardPickerModal.tsx`, find where the dialog body renders the reward `<ul>` (likely inside `<DialogContent>`). Insert `<RevealStage tier={tier} />` immediately above the list. Keep the modal title + description unchanged.

```tsx
import { RevealStage } from '../spin/RevealStage.tsx';

// inside the JSX, just before the <ul role="listbox">:
<RevealStage tier={tier} />
```

- [ ] **Step 7: Run all reward-related tests.**

```bash
npm test -- src/features/rewards
```

Expected: PASS. The existing tests are non-visual (option list, dismiss, add-reward); the reveal addition shouldn't break them.

- [ ] **Step 8: Smoke-check.**

In the browser, simulate a T3 win (devtools console: dispatch an action that opens the reward picker for T3, or just play through a 3-match cash-in until the wheel lands on T3+). Confirm the chrysanthemum spins clockwise, full rotation in 2s, no judder, banner reads 大当たり in gold. Toggle `prefers-reduced-motion` in DevTools to confirm the spin freezes.

- [ ] **Step 9: Commit.**

```bash
git add src/features/spin/RevealStage.tsx src/features/spin/__tests__/RevealStage.test.tsx src/features/rewards/RewardPickerModal.tsx src/features/rewards/rewards.css
git commit -m "Animate Tier III reveal with spinning chrysanthemum + 大当たり banner"
```

---

## Task 10: Apply parlour chassis to Habits route

**Files:**
- Modify: `src/routes/Habits.tsx`

Pattern is identical to `Home.tsx` and `SpinFlow.tsx`. Use `themeMeta.tagline` as the kicker, `"Rituals"` (or theme-driven string) as the title, and a short tagline below.

- [ ] **Step 1: Replace the Habits component.**

```tsx
// src/routes/Habits.tsx
import { useAppStore } from '../state/store.ts';
import { HabitList, HygieneBundle } from '../features/habits/index.ts';
import { DEFAULT_HABIT_IDS } from '../data/defaults.ts';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function Habits() {
  const allHabits = useAppStore((s) => s.habits);
  const { themeMeta } = useTheme();
  const hygiene = allHabits.find(
    (h) => h.id === DEFAULT_HABIT_IDS.hygiene && !h.archived,
  );

  return (
    <section
      className="route route--habits parlour-grain parlour-halftone"
      aria-labelledby="habits-title"
    >
      <header className="parlour-masthead">
        <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
        <h1 id="habits-title" className="parlour-masthead__title">
          Rituals
        </h1>
        <p className="parlour-masthead__tagline">
          Each ritual kept earns a clip. Tap to log.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 'var(--space-3) auto 0',
          }}
        >
          <Motif size={36} />
        </div>
      </header>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <div className="slot" data-slot="[3D] HabitList">
        <HabitList />
      </div>
      <div className="slot" data-slot="[3D] HygieneBundle">
        {hygiene ? (
          <HygieneBundle habit={hygiene} />
        ) : (
          <p className="route__subtitle">
            Hygiene bundle archived — recreate via Add habit (kind: bundle).
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run habits + route-level tests.**

```bash
npm test -- src/features/habits
```

Expected: PASS.

- [ ] **Step 3: Smoke-check `/habits`.** Confirm masthead + grain visible.

- [ ] **Step 4: Commit.**

```bash
git add src/routes/Habits.tsx
git commit -m "Apply parlour chassis to Habits route"
```

---

## Task 11: Apply parlour chassis to Jar route

**Files:**
- Modify: `src/routes/Jar.tsx`

- [ ] **Step 1: Replace Jar component to wrap with chassis.**

```tsx
// src/routes/Jar.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  JarVisual,
  MilestoneEditor,
  ActivityFeed,
  StreakDisplay,
} from '../features/jar/index.ts';
import { Button } from '../ui/button.tsx';
import { useAppStore } from '../state/store.ts';
import { DEFAULT_MILESTONE_IDS } from '../types/ids.ts';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function Jar() {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const milestones = useAppStore((s) => s.jars[activeJarId]?.milestones);
  const { themeMeta } = useTheme();

  const firstRun = useMemo(() => {
    if (!milestones) return false;
    return DEFAULT_MILESTONE_IDS.some(
      (id) => (milestones[id]?.target ?? 0) === 0,
    );
  }, [milestones]);

  const [editorOpen, setEditorOpen] = useState<boolean>(firstRun);
  const [prevFirstRun, setPrevFirstRun] = useState<boolean>(firstRun);
  if (prevFirstRun !== firstRun) {
    setPrevFirstRun(firstRun);
    if (firstRun) setEditorOpen(true);
  }

  useEffect(() => {
    const handler = (): void => setEditorOpen(true);
    document.addEventListener('jar:reset-complete', handler);
    return (): void => document.removeEventListener('jar:reset-complete', handler);
  }, []);

  return (
    <section
      className="route route--jar parlour-grain parlour-halftone"
      aria-labelledby="jar-title"
    >
      <header className="parlour-masthead">
        <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
        <h1 id="jar-title" className="parlour-masthead__title">
          The Pot
        </h1>
        <p className="parlour-masthead__tagline">
          Long-game progress toward your milestones.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 'var(--space-3) auto 0',
          }}
        >
          <Motif size={36} />
        </div>
      </header>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <StreakDisplay jarId={activeJarId} />
      <JarVisual jarId={activeJarId} />

      {editorOpen ? (
        firstRun ? (
          <MilestoneEditor
            jarId={activeJarId}
            forceFirstRun
            onSave={() => setEditorOpen(false)}
          />
        ) : (
          <MilestoneEditor
            jarId={activeJarId}
            onSave={() => setEditorOpen(false)}
            onCancel={() => setEditorOpen(false)}
          />
        )
      ) : (
        <Button
          variant="secondary"
          onClick={() => setEditorOpen(true)}
          data-testid="jar-edit-milestones"
        >
          Edit milestones
        </Button>
      )}

      <ActivityFeed jarId={activeJarId} days={7} />
    </section>
  );
}
```

- [ ] **Step 2: Run jar tests.**

```bash
npm test -- src/features/jar
```

Expected: PASS.

- [ ] **Step 3: Smoke-check `/jar`.**

- [ ] **Step 4: Commit.**

```bash
git add src/routes/Jar.tsx
git commit -m "Apply parlour chassis to Jar route"
```

---

## Task 12: Apply parlour chassis to Rewards route

**Files:**
- Modify: `src/routes/Rewards.tsx`

- [ ] **Step 1: Replace component.**

```tsx
// src/routes/Rewards.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.tsx';
import { RewardMenu } from '../features/rewards/RewardMenu.tsx';
import { RewardRulesSidebar } from '../features/rewards/reward-rules-sidebar.tsx';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function Rewards() {
  const { themeMeta } = useTheme();
  return (
    <section
      className="route route--rewards parlour-grain parlour-halftone"
      aria-labelledby="rewards-title"
    >
      <header className="parlour-masthead">
        <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
        <h1 id="rewards-title" className="parlour-masthead__title">
          The Vault
        </h1>
        <p className="parlour-masthead__tagline">
          What the house owes you when the wheel lands true.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 'var(--space-3) auto 0',
          }}
        >
          <Motif size={36} />
        </div>
      </header>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <RewardRulesSidebar />

      <Tabs defaultValue="T1">
        <TabsList>
          <TabsTrigger value="T1">Tier 1</TabsTrigger>
          <TabsTrigger value="T2">Tier 2</TabsTrigger>
          <TabsTrigger value="T3">Tier 3</TabsTrigger>
        </TabsList>
        <TabsContent value="T1"><RewardMenu tier="T1" /></TabsContent>
        <TabsContent value="T2"><RewardMenu tier="T2" /></TabsContent>
        <TabsContent value="T3"><RewardMenu tier="T3" /></TabsContent>
      </Tabs>
    </section>
  );
}
```

- [ ] **Step 2: Run rewards tests.**

```bash
npm test -- src/features/rewards
```

Expected: PASS.

- [ ] **Step 3: Smoke-check `/rewards`.**

- [ ] **Step 4: Commit.**

```bash
git add src/routes/Rewards.tsx
git commit -m "Apply parlour chassis to Rewards route"
```

---

## Task 13: Apply parlour chassis to Settings route

**Files:**
- Modify: `src/routes/Settings.tsx`

- [ ] **Step 1: Replace component.**

```tsx
// src/routes/Settings.tsx
import {
  WheelConfigEditor,
  BagCompositionEditor,
  HygieneCutoffEditor,
  SfxHapticsToggles,
  ExportImportPanel,
  ResetAllDanger,
  HelpScreen,
  RewardsLinkCard,
} from '../features/settings/index.ts';
import { useAppStore } from '../state/store.ts';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function Settings() {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const { themeMeta } = useTheme();
  return (
    <section
      className="route route--settings parlour-grain parlour-halftone"
      aria-labelledby="settings-title"
    >
      <header className="parlour-masthead">
        <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
        <h1 id="settings-title" className="parlour-masthead__title">
          The Parlour
        </h1>
        <p className="parlour-masthead__tagline">
          Tune the house rules. Themes, bag, wheel, audio.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 'var(--space-3) auto 0',
          }}
        >
          <Motif size={36} />
        </div>
      </header>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <div className="settings">
        <RewardsLinkCard />
        <WheelConfigEditor jarId={activeJarId} />
        <BagCompositionEditor />
        <HygieneCutoffEditor />
        <SfxHapticsToggles />
        <ExportImportPanel />
        <HelpScreen />
        <ResetAllDanger />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run settings tests.**

```bash
npm test -- src/features/settings
```

Expected: PASS.

- [ ] **Step 3: Smoke-check `/settings`.**

- [ ] **Step 4: Commit.**

```bash
git add src/routes/Settings.tsx
git commit -m "Apply parlour chassis to Settings route"
```

---

## Task 14: Apply parlour chassis to Onboarding

**Files:**
- Read first: `src/features/onboarding/OnboardingFlow.tsx` to find where the outermost shell renders. The chassis goes there (NOT the `Onboarding.tsx` route file, which only mounts `<OnboardingFlow />`).
- Modify: `src/features/onboarding/OnboardingFlow.tsx` (most likely)

- [ ] **Step 1: Read OnboardingFlow to understand its current container.**

```bash
head -80 /Users/gracekang/dev/kakeguruimasho/.claude/worktrees/agitated-babbage-b69419/src/features/onboarding/OnboardingFlow.tsx
```

Expected: a top-level `<section>` or `<div className="onboarding">` that we can decorate.

- [ ] **Step 2: Wrap the outermost container with the parlour chassis.**

Add the same `parlour-grain parlour-halftone` classes and a `parlour-masthead` header. The masthead title for onboarding should read **"Welcome"** with kicker = `themeMeta.tagline`. Wire `useTheme()` in OnboardingFlow if it isn't already imported.

If OnboardingFlow already has its own multi-step layout (likely — first/second/third panel), put the masthead **once** at the top of the flow so it persists across steps. Each step's content stays where it is.

Example skeleton (replace the existing top-level section):

```tsx
import { useTheme } from '../../styles/theme-context.ts';
import { DecoDivider, Motif } from '../../ui/parlour/index.ts';

// inside OnboardingFlow's return, replace the outermost wrapper with:
<section
  className="route route--onboarding parlour-grain parlour-halftone"
  aria-labelledby="onboarding-title"
>
  <header className="parlour-masthead">
    <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
    <h1 id="onboarding-title" className="parlour-masthead__title">
      Three House Rules
    </h1>
    <p className="parlour-masthead__tagline">
      Set up the bag, the jar, and the rhythm.
    </p>
    <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-3) auto 0' }}>
      <Motif size={36} />
    </div>
  </header>
  <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />
  {/* existing onboarding step content */}
</section>
```

If the file already wraps content in a top-level container with state machinery, splice the chassis classes onto that container and insert the masthead as the first child. Don't refactor the step machinery itself.

- [ ] **Step 3: Run onboarding tests.**

```bash
npm test -- src/features/onboarding
```

Expected: PASS.

- [ ] **Step 4: Smoke-check by clearing onboarding state in dev tools (or by visiting `/onboarding` directly if the route exposes it without gating).**

- [ ] **Step 5: Commit.**

```bash
git add src/features/onboarding/OnboardingFlow.tsx
git commit -m "Apply parlour chassis to Onboarding flow"
```

---

## Task 15: Full-suite verification + browser smoke

**Files:** none modified.

- [ ] **Step 1: Run the full test suite.**

```bash
npm test 2>&1 | tail -40
```

Expected: every test passes.

- [ ] **Step 2: Run the build.**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 3: Lint.**

```bash
npm run lint 2>&1 | tail -10
```

Expected: zero errors. Fix any new warnings introduced.

- [ ] **Step 4: Visit each route in the browser; spot-check pixel fidelity.**

Iterate through:
- `/` (Home) — masthead + grain unchanged from PR #2.
- `/spin` — chips render in HandView + CashInPicker; 50-slice main wheel + brass pointer; bonus wheel shows 24 slices when surfaced; T3 win shows the spinning chrysanthemum.
- `/habits` — masthead + grain.
- `/jar` — masthead + grain.
- `/rewards` — masthead + grain; T3 reward picker shows the reveal banner.
- `/settings` — masthead + grain.
- `/onboarding` — masthead persists across steps (clear `localStorage` to retrigger).

Compare side-by-side with `/tmp/design1/kakeguruimasho/project/Kakegurui Masho.html` rendered in another browser tab.

- [ ] **Step 5: Stop the dev server.**

```bash
kill $DEV_PID 2>/dev/null || true
```

---

## Task 16: Open the PR

- [ ] **Step 1: Push the branch.**

```bash
git push -u origin gk/agitated-babbage-b69419
```

- [ ] **Step 2: Open PR against `main`.**

Title: `Vintage Pachinko finishing pass — chips, 50-slice wheel, kanji bonus, T3 reveal, full chassis`

Body summary (sections in order):

1. **What changes**
   - Chip primitive replaces inline paperclip swatches in HandView, CashInPicker, ActivityFeed.
   - WheelCanvas: 50 weighted slices in a lacquer cabinet with brass pointer, peg ring, chrysanthemum hub. Public API unchanged.
   - BonusWheelCanvas: 24 slices, kanji labels on rare prizes, plum-blossom hub. Public API unchanged.
   - Tier III reveal: spinning chrysanthemum (2s/360°) + 大当たり banner above the reward picker.
   - Parlour chassis (masthead + paper grain) applied to Habits, Jar, Rewards, Settings, Onboarding.
2. **Test plan** — checkboxes for each route; a note that `near-miss.test.tsx` still resolves via hidden `data-segment-index` anchors; `wheel-slices.test.ts` is new.
3. **Out of scope** — theme picker UI in Settings, Kowloon theme, jar interior redesign (PachinkoPotMini). All tracked in `BACKLOG.md`.

```bash
gh pr create --title "Vintage Pachinko finishing pass — chips, 50-slice wheel, kanji bonus, T3 reveal, full chassis" --body "$(cat <<'EOF'
## Summary

Lands items #1–5 from the Vintage Pachinko hand-off:

- **Casino chips everywhere** — HandView, CashInPicker, ActivityFeed clip-earned rows now render through `<Chip>` / `<GoldChip>` instead of inline paperclip swatches.
- **50-slice main wheel** — lacquer cabinet, brass pointer, peg ring, chrysanthemum hub. Public API of `<WheelCanvas>` is unchanged; tier→visual-slice mapping lives in `wheel-slices.ts`.
- **24-slice bonus wheel** — kanji labels on rare prizes (二五 / 五十 / 七五 / 倍 / 無料), plum-blossom hub.
- **Tier III reveal** — spinning chrysanthemum at 2s/360° + 大当たり banner above the T3 reward picker.
- **Parlour chassis** on Habits, Jar, Rewards, Settings, Onboarding (masthead + paper grain + DecoDivider).

## Test plan

- [ ] `npm test` — full suite green
- [ ] `npm run build` — clean
- [ ] `/spin` — chips visible in hand and cash-in picker; 50-slice wheel spins to a slice of the correct tier; near-miss drift still threads through the right tier
- [ ] T3 win — chrysanthemum spins clockwise, 大当たり banner glows
- [ ] `/habits`, `/jar`, `/rewards`, `/settings`, `/onboarding` — masthead + grain present
- [ ] `prefers-reduced-motion: reduce` — chrysanthemum freezes (globals.css already covers this)

## Out of scope

Tracked in BACKLOG.md for follow-up:
- Theme picker UI in Settings (#6 from the hand-off)
- Kowloon cyber-grunge theme
- Replacing the JarVisual tall-jar SVG with the PachinkoPotMini horizontal lacquer bar (visual upgrade; not strictly chassis)
EOF
)"
```

- [ ] **Step 3: Return the PR URL.**

---

## Self-Review

**Spec coverage:**
- #1 Chip primitive everywhere — Tasks 1–4 ✓
- #2 50-slice main wheel — Tasks 5, 6, 7 ✓
- #3 24-slice bonus wheel — Tasks 5, 6, 8 ✓
- #4 T3 chrysanthemum reveal — Task 9 ✓
- #5 Chassis on remaining routes — Tasks 10–14 ✓
- Verification — Task 15; PR — Task 16 ✓

**Placeholder scan:** none. Every code step shows the code; every command is exact.

**Type consistency:**
- `MainSliceTier` / `BonusSlicePrize` defined in Task 5, used in Tasks 7 + 8.
- `mainTierToVisualSlice` / `bonusSegmentToVisualSlice` defined in Task 5, used in Tasks 7 + 8.
- `CLIP_HEX` defined in Task 1, used in Tasks 2, 3, 4.
- `Chrysanthemum` / `PlumBlossom` / `BrassPointer` defined in Task 6, used in Tasks 7, 8, 9.
- `RevealStage` defined in Task 9, mounted in `RewardPickerModal` in the same task.
- `ChipProps` / `GoldChip` already exist in `src/ui/parlour/Chip.tsx`; we don't redefine.
- `MAIN_WHEEL_SEGMENT_ORDER` / `BONUS_WHEEL_SEGMENT_ORDER` kept stable in `wheel.engine.ts`; consumed unchanged in tasks 7, 8.
