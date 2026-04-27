# Desktop Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the full desktop adaptation in one PR — three-pane chassis at `≥1024px`, every per-screen pass (Home/Habits/Vault/Jar/Spin/BonusTimerDetail/History/Settings), `Drawer` primitive replacing `Dialog` for editors, hover states across primitives, and a cinematic Onboarding shell. Mobile UX (≤1023px) stays byte-for-byte identical.

**Architecture:** Purely CSS-driven layout swap via `@media (min-width: 1024px)` rules; a single `useIsDesktop()` hook covers the 2-3 places where JSX must branch (mounting `BonusTimerBanner` at mobile only, picking `Drawer` mode, layout swaps for Spin and Jar). New chassis components (`DesktopShell`, `LeftRail`, `RightRail`) mount unconditionally and rely on CSS `display: contents` / `display: none` to vanish at narrow widths. No new state, no router changes.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest + React Testing Library, Playwright (axe-core a11y), CSS variables (theme tokens). Dev server: `npm run dev` → `http://localhost:5173/kakeguruimasho/`.

**Source of truth:** [docs/superpowers/specs/2026-04-26-desktop-adaptation-design.md](../specs/2026-04-26-desktop-adaptation-design.md). Design wireframes at `/tmp/design-fresh/kakeguruimasho/project/desktop-wires.jsx` (DesktopRulesCard, DesktopSalon, DesktopSpin).

---

## File Structure

### New files

- `src/lib/useIsDesktop.ts` — `matchMedia('(min-width: 1024px)')` hook with SSR-safe initial state.
- `src/lib/__tests__/useIsDesktop.test.ts` — covers initial value + viewport-change listener.
- `src/lib/navItems.ts` — single source of truth for nav config (label, icon, route, indicator). Consumed by both `BottomNav` and `LeftRail`.
- `src/styles/desktop.css` — chassis grid, breakpoint media queries, content max-width, hover-rule scoping. Imported by `globals.css`.
- `src/ui/Drawer.tsx` — primitive: bottom-sheet at mobile, 480px right-slide drawer at desktop. Built on `Dialog` (same a11y guarantees).
- `src/ui/__tests__/drawer.test.tsx` — focus trap, ESC, backdrop click, mode swap on viewport change.
- `src/ui/parlour/DesktopShell.tsx` — three-pane CSS-grid wrapper. Always renders rails + main; CSS hides rails at `<1024px`.
- `src/ui/parlour/LeftRail.tsx` — house mark + nav (from `navItems.ts`) + streak meter at footer.
- `src/ui/parlour/RightRail.tsx` — stacked Pot, Bonus widget, Recent Pulls.
- `src/ui/parlour/RecentPulls.tsx` — last 5 spins as a vertical list (chip + tier + timestamp). Reads existing spin-history selectors.
- `src/ui/parlour/CinematicShell.tsx` — Onboarding desktop wrapper. No-op `<1024px`; full-bleed felt + four-corner ornate motifs + centered framed card at `≥1024px`.
- `src/ui/parlour/__tests__/CinematicShell.test.tsx` — children render unchanged at narrow viewport; backdrop chrome appears at wide viewport.
- `src/features/bonus/useBonusTimerSummary.ts` — extracted hook covering the oldest-active-timer state currently inlined in `BonusTimerBanner`. Used by the banner AND `RightRail`'s bonus widget.
- `e2e/desktop-chassis.spec.ts` — Playwright spec asserting chassis behaviour at `1440×900`.

### Modified files

- `src/App.tsx` — wrap `<main>` in `<DesktopShell>`; gate `<BonusTimerBanner>` mount on `!isDesktop`.
- `src/BottomNav.tsx` — consume `navItems.ts`; CSS hides nav at `≥1024px`.
- `src/shell.css` — scope the `max-width: 720px` cap to `<1024px`.
- `src/styles/globals.css` — `@import './desktop.css'` (or however imports are wired).
- `src/features/bonus/BonusTimerBanner.tsx` — refactor to consume `useBonusTimerSummary()`.
- `src/features/rewards/RewardEditor.tsx` — `Dialog` → `Drawer`.
- `src/routes/Home.tsx` — desktop CSS reflows (3-col rituals grid) via class hooks; no JSX swap.
- `src/routes/Habits.tsx` — same — multi-col grid via CSS.
- `src/routes/Rewards.tsx` — 3 tier columns via CSS grid at desktop.
- `src/routes/History.tsx` — wider horizontal padding at desktop.
- `src/routes/Jar.tsx` — JSX-conditional via `useIsDesktop()` for the side-by-side layout.
- `src/routes/BonusTimerDetail.tsx` — JSX-conditional split layout.
- `src/routes/Onboarding.tsx` — wrap render in `<CinematicShell>`.
- `src/routes/SpinFlow.tsx` (and the `/spin`, `/spin/pull`, `/spin/reveal` content components in `src/features/spin/`) — JSX-conditional layouts for tier-ladder placement, wheel/lever placement, stake summary in right rail.
- `src/features/spin/spin.css` — desktop rules for wheel size + lever-beside layout.
- `src/features/jar/jar.css` — desktop split-layout rules.
- `src/features/bonus/bonus.css` — desktop split-layout rules.
- `src/ui/parlour/{BrassButton,Chip,RitualCard,OrnateFrame}.tsx` (and matching CSS) — `:hover` rules under `@media (hover: hover) and (min-width: 1024px)`.
- `playwright.config.ts` — add `desktop-chromium` project at `1440×900`.
- `BACKLOG.md` — tick off the Desktop adaptation section.
- `CHANGELOG.md` — add entry summarizing the chassis + per-screen passes.

### Untouched (intentionally)

- `src/styles/themes.{css,ts}` — chassis reads existing tokens unchanged.
- `src/state/store.ts` — no new state.
- All wheel engine / spin orchestrator / RNG modules — no touch.
- Onboarding flow logic in `src/features/onboarding/` (only the route wrapper changes).

---

## Notes the executor must respect

- **CashInPicker is inline today** — it's not a Dialog/sheet on mobile. The design's "modals → drawers" rule applies to `RewardEditor` (and any other Dialog-based editor encountered). `CashInPicker` placement at desktop changes inline (alongside HandTrayCard) but it does NOT become a Drawer.
- **`BonusTimerBanner` lifecycle** — its render currently lives in `App.tsx`. After this PR, the banner only mounts at mobile; the right rail handles desktop. Both surfaces share the same selector/state via `useBonusTimerSummary()`. Don't duplicate the timer subscription.
- **Mobile shell unchanged** — every change must be invisible at `<1024px`. Verify mobile e2e suite passes after each phase.
- **SSR-safe `useIsDesktop`** — `matchMedia` doesn't exist in jsdom by default; the hook must guard with `typeof window === 'undefined'` and the test setup must provide a `matchMedia` stub (existing test setup may or may not have one — check `src/test/setup.ts`).
- **Velvet swag SVG deferred** — the spec mentions a velvet swag along the Onboarding viewport's top edge as part of CinematicShell. Plan ships only the four corner motifs for v1; track velvet swag as a v1.1 polish item in BACKLOG.md. Cleaner cut, smaller PR.

---

## Phase 0 · Foundations

### Task 0.1: `useIsDesktop` hook

**Files:**
- Create: `src/lib/useIsDesktop.ts`
- Test: `src/lib/__tests__/useIsDesktop.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/useIsDesktop.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsDesktop } from '../useIsDesktop.ts';

function setMatchMedia(matches: boolean): { dispatchChange: (next: boolean) => void } {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches,
    media: '(min-width: 1024px)',
    addEventListener: (_t: 'change', cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_t: 'change', cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  vi.spyOn(window, 'matchMedia').mockReturnValue(mql);
  return {
    dispatchChange: (next: boolean) => {
      (mql as unknown as { matches: boolean }).matches = next;
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
    },
  };
}

describe('useIsDesktop', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns false at narrow viewports', () => {
    setMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it('returns true at ≥1024px', () => {
    setMatchMedia(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('updates when the viewport crosses the breakpoint', () => {
    const { dispatchChange } = setMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
    act(() => dispatchChange(true));
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- useIsDesktop`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the hook**

```ts
// src/lib/useIsDesktop.ts
/**
 * useIsDesktop — true at viewport widths ≥ 1024px.
 *
 * The desktop chassis lives in CSS; this hook only exists for the
 * 2-3 JSX branches that genuinely need different React trees at
 * desktop (mounting BonusTimerBanner only at mobile; picking Drawer
 * mode; layout swaps for Spin and Jar).
 */
import { useEffect, useState } from 'react';

const QUERY = '(min-width: 1024px)';

export function useIsDesktop(): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent): void => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return matches;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- useIsDesktop`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useIsDesktop.ts src/lib/__tests__/useIsDesktop.test.ts
git commit -m "feat(desktop): add useIsDesktop hook"
```

### Task 0.2: Shared nav config

**Files:**
- Create: `src/lib/navItems.ts`
- Modify: `src/BottomNav.tsx` (consume the shared config)

- [ ] **Step 1: Extract the config**

```ts
// src/lib/navItems.ts
/**
 * navItems — single source of truth for primary nav.
 *
 * Both BottomNav (mobile) and LeftRail (desktop) consume this so
 * adding/renaming/reordering an item ripples to every surface.
 */
import {
  Home as HomeIcon,
  ListChecks,
  Dice5,
  Sparkles,
  Vault as VaultIcon,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

export interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Salon', icon: HomeIcon as unknown as NavIcon },
  { to: '/habits', label: 'Rituals', icon: ListChecks as unknown as NavIcon },
  { to: '/spin', label: 'Spin', icon: Dice5 as unknown as NavIcon },
  { to: '/jar', label: 'Jar', icon: Sparkles as unknown as NavIcon },
  { to: '/rewards', label: 'Vault', icon: VaultIcon as unknown as NavIcon },
];
```

- [ ] **Step 2: Update BottomNav to consume the config**

Replace the inline `items` array in `src/BottomNav.tsx` with:

```ts
import { NAV_ITEMS } from './lib/navItems.ts';
// …
{NAV_ITEMS.map((item) => ( /* existing render */ ))}
```

Drop the local `NavItem` interface and icon imports — they all live in `navItems.ts` now.

- [ ] **Step 3: Run typecheck + existing BottomNav test (if any)**

Run: `npm run typecheck && npm run test -- BottomNav`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/navItems.ts src/BottomNav.tsx
git commit -m "refactor(nav): extract navItems config for cross-surface reuse"
```

### Task 0.3: `desktop.css` skeleton + import wiring

**Files:**
- Create: `src/styles/desktop.css`
- Modify: `src/styles/globals.css` (add the import)

- [ ] **Step 1: Create the skeleton**

```css
/*
 * desktop.css — Desktop chassis + breakpoint rules.
 *
 * Activates at ≥1024px. Below that, every rule here is dormant and the
 * mobile shell renders unchanged.
 *
 * Breakpoints:
 *   • ≤1023px    — mobile shell (rules in shell.css + per-feature CSS)
 *   • ≥1024px    — three-pane chassis (this file)
 *   • ≥1440px    — chassis with content max-width 1280, centered
 */

/* Three-pane chassis grid. Mobile fall-through: at <1024px, .desktop-shell
 * renders children directly via display: contents on the rails (which then
 * collapse out of layout). */
.desktop-shell {
  display: block;
}

@media (min-width: 1024px) {
  .desktop-shell {
    display: grid;
    grid-template-columns: 280px 1fr 320px;
    min-height: 100vh;
  }
  .desktop-shell__main {
    min-width: 0; /* allow children to shrink within the 1fr column */
  }
}

@media (min-width: 1440px) {
  .desktop-shell {
    max-width: 1280px;
    margin-inline: auto;
  }
}

/* Bottom nav vanishes at desktop — left rail takes over. */
@media (min-width: 1024px) {
  .bottom-nav { display: none; }
}

/* Hover scoping helper — components that want desktop-only :hover use this
 * predicate via @media. Provided as documentation; rules live per-component. */
```

- [ ] **Step 2: Wire the import**

Add to the top of `src/styles/globals.css` (after `tokens.css` and `themes.css`, before component-level rules):

```css
@import './desktop.css';
```

- [ ] **Step 3: Run dev server, verify mobile is unchanged**

Run: `npm run dev` (already running — vite preview at port 5173). Open `http://localhost:5173/kakeguruimasho/` at 390px viewport and at 1440px viewport. Mobile should look identical to before. Desktop will show the bottom-nav vanishing but no chassis yet (next phase).

- [ ] **Step 4: Commit**

```bash
git add src/styles/desktop.css src/styles/globals.css
git commit -m "feat(desktop): add desktop.css with breakpoint skeleton"
```

### Task 0.4: Scope `shell.css` 720px cap to mobile

**Files:**
- Modify: `src/shell.css`

- [ ] **Step 1: Wrap the route width caps**

In `src/shell.css`, find both `.bottom-nav__inner { max-width: 720px; }` and `.route { max-width: 720px; }` rules. Wrap both in `@media (max-width: 1023px)` so they only apply on mobile:

```css
@media (max-width: 1023px) {
  .bottom-nav__inner { max-width: 720px; }
  .route { max-width: 720px; margin: 0 auto; }
}
```

(Keep the rest of `.bottom-nav__inner` and `.route` rules as-is. Only the `max-width` and `margin-inline` directives move under the media query.)

- [ ] **Step 2: Verify at 1440px viewport**

Run: open the dev server at 1440px. Routes should now expand to fill the chassis center pane (which doesn't exist yet — they'll fill the full viewport width until Task 1.3 lands). This is expected.

- [ ] **Step 3: Commit**

```bash
git add src/shell.css
git commit -m "refactor(desktop): scope mobile width caps to <1024px"
```

---

## Phase 1 · Chassis shell

### Task 1.1: `LeftRail` component

**Files:**
- Create: `src/ui/parlour/LeftRail.tsx`
- Modify: `src/styles/desktop.css` (add rail styles)

- [ ] **Step 1: Implement the rail**

```tsx
// src/ui/parlour/LeftRail.tsx
/**
 * LeftRail — desktop nav rail.
 *
 * House mark · nav (from NAV_ITEMS) · streak meter at footer.
 * Hidden at <1024px via desktop.css.
 */
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../lib/navItems.ts';
import { useTheme } from '../../styles/theme-context.ts';
import { cn } from '../utils.ts';

export function LeftRail() {
  const { themeMeta } = useTheme();
  return (
    <aside className="left-rail" aria-label="Primary navigation">
      <div className="left-rail__mark">
        <div className="left-rail__kanji">賭狂魔笙</div>
        <div className="left-rail__brand">
          {themeMeta.name}
          <span className="left-rail__brand-sub">Salon</span>
        </div>
      </div>
      <nav className="left-rail__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn('left-rail__item', isActive && 'left-rail__item--active')
            }
          >
            <item.icon size={18} aria-hidden="true" />
            <span className="left-rail__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="left-rail__footer">
        {/* Streak meter slot — the route below provides PachinkoStreak via
            portal/context if we want, or LeftRail consumes the store directly.
            For v1 we leave a placeholder; wire in Task 2.4. */}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Add CSS for the rail**

Append to `src/styles/desktop.css`:

```css
.left-rail {
  display: none;
}

@media (min-width: 1024px) {
  .left-rail {
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--color-felt-deep), var(--color-bg));
    border-right: 1px solid var(--color-border);
    padding: 24px 22px;
    position: sticky;
    top: 0;
    height: 100vh;
  }
  .left-rail__mark { margin-bottom: 24px; }
  .left-rail__kanji {
    font-family: 'Shippori Mincho', serif;
    font-weight: 800;
    font-size: 14px;
    color: var(--color-gold);
    letter-spacing: 0.4em;
  }
  .left-rail__brand {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--color-ink);
    line-height: 1.05;
    margin-top: 4px;
  }
  .left-rail__brand-sub {
    display: block;
    font-style: italic;
    color: var(--color-gold);
    font-size: 16px;
  }
  .left-rail__nav { display: flex; flex-direction: column; gap: 2px; }
  .left-rail__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    color: var(--color-ink-muted);
    text-decoration: none;
    border-radius: 4px;
    border-left: 2px solid transparent;
  }
  .left-rail__item:hover { background: var(--color-surface-2); color: var(--color-ink); }
  .left-rail__item--active {
    color: var(--color-gold);
    border-left-color: var(--color-gold);
    background: var(--color-surface-2);
  }
  .left-rail__label {
    font-family: var(--font-mono);
    font-size: calc(11px * var(--mono-scale));
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .left-rail__footer { margin-top: auto; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/parlour/LeftRail.tsx src/styles/desktop.css
git commit -m "feat(desktop): add LeftRail component"
```

### Task 1.2: `RightRail` placeholder

**Files:**
- Create: `src/ui/parlour/RightRail.tsx`
- Modify: `src/styles/desktop.css`

- [ ] **Step 1: Implement with placeholder slots**

```tsx
// src/ui/parlour/RightRail.tsx
/**
 * RightRail — desktop ledger rail.
 *
 * Stacks Pot · Bonus · Recent Pulls. Hidden at <1024px.
 * Concrete widgets wired in Phase 2.
 */
import type { ReactNode } from 'react';

export function RightRail({
  pot,
  bonus,
  recent,
}: {
  pot?: ReactNode;
  bonus?: ReactNode;
  recent?: ReactNode;
}) {
  return (
    <aside className="right-rail" aria-label="Activity ledger">
      {bonus && <section className="right-rail__section">{bonus}</section>}
      {pot && <section className="right-rail__section">{pot}</section>}
      {recent && <section className="right-rail__section">{recent}</section>}
    </aside>
  );
}
```

- [ ] **Step 2: Add CSS**

Append to `src/styles/desktop.css`:

```css
.right-rail { display: none; }

@media (min-width: 1024px) {
  .right-rail {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px 22px;
    background: linear-gradient(180deg, var(--color-bg), var(--color-felt-deep));
    border-left: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .right-rail__section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    padding: 16px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/parlour/RightRail.tsx src/styles/desktop.css
git commit -m "feat(desktop): add RightRail with placeholder slots"
```

### Task 1.3: `DesktopShell` wrapper

**Files:**
- Create: `src/ui/parlour/DesktopShell.tsx`

- [ ] **Step 1: Implement the wrapper**

```tsx
// src/ui/parlour/DesktopShell.tsx
/**
 * DesktopShell — three-pane chassis.
 *
 * Renders LeftRail · main · RightRail at every breakpoint; CSS hides
 * the rails at <1024px so mobile renders unchanged. Per-route content
 * decides what (if anything) to put in the right rail via the prop.
 */
import type { ReactNode } from 'react';
import { LeftRail } from './LeftRail.tsx';
import { RightRail } from './RightRail.tsx';

export interface DesktopShellProps {
  children: ReactNode;
  rail?: {
    pot?: ReactNode;
    bonus?: ReactNode;
    recent?: ReactNode;
  };
}

export function DesktopShell({ children, rail }: DesktopShellProps) {
  return (
    <div className="desktop-shell">
      <LeftRail />
      <div className="desktop-shell__main">{children}</div>
      <RightRail {...(rail ?? {})} />
    </div>
  );
}
```

- [ ] **Step 2: Export from the parlour barrel**

Add to `src/ui/parlour/index.ts`:

```ts
export { DesktopShell } from './DesktopShell.tsx';
export { LeftRail } from './LeftRail.tsx';
export { RightRail } from './RightRail.tsx';
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/parlour/DesktopShell.tsx src/ui/parlour/index.ts
git commit -m "feat(desktop): add DesktopShell three-pane wrapper"
```

### Task 1.4: Wire `App.tsx` to use `DesktopShell`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wrap `<main>` in `<DesktopShell>` and gate the banner**

Edit `src/App.tsx`:

```tsx
import { DesktopShell } from './ui/parlour/index.ts';
import { useIsDesktop } from './lib/useIsDesktop.ts';

// inside App():
const isDesktop = useIsDesktop();

return (
  <div className="app-shell">
    {!isDesktop && <BonusTimerBanner />}
    <PwaUpdatePrompt />
    <DesktopShell>
      <main className="app-shell__main" id="main">
        <Suspense fallback={<RouteFallback />}>
          {/* existing <Routes>...  */}
        </Suspense>
      </main>
    </DesktopShell>
    <BottomNav />
  </div>
);
```

(Right-rail content is wired per-route in Phase 5; for now `DesktopShell` renders empty rails.)

- [ ] **Step 2: Verify mobile e2e still passes**

Run: `npm run test:e2e -- --project=chromium-mobile`
Expected: green (no behavior change at mobile widths).

- [ ] **Step 3: Manual check at 1440px**

Open dev server, resize to 1440px. Expected:
- Left rail visible with house mark + nav
- Right rail visible (empty placeholders)
- Bottom nav hidden
- Center pane shows the active route

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(desktop): wire DesktopShell + gate BonusTimerBanner on mobile"
```

---

## Phase 2 · Right-rail widgets

### Task 2.1: Extract `useBonusTimerSummary()`

**Files:**
- Create: `src/features/bonus/useBonusTimerSummary.ts`
- Modify: `src/features/bonus/BonusTimerBanner.tsx`

- [ ] **Step 1: Extract the selector logic**

Create `src/features/bonus/useBonusTimerSummary.ts`:

```ts
/**
 * useBonusTimerSummary — shared selector for the active bonus timer state.
 *
 * Used by BonusTimerBanner (mobile) AND RightRail's bonus widget (desktop).
 * Returns the oldest active timer + its origin habit + total active count.
 */
import { useMemo } from 'react';
import { useAppStore } from '../../state/store.ts';
import type { BonusTimer } from '../../types/bonus.ts';
import type { Habit } from '../../types/habit.ts';

export interface BonusTimerSummary {
  oldest: BonusTimer | null;
  originHabit: Habit | null;
  activeCount: number;
}

export function useBonusTimerSummary(): BonusTimerSummary {
  const rawTimers = useAppStore((s) => s.bonusTimerState[s.activeJarId]?.timers);
  const habits = useAppStore((s) => s.habits);

  const active = useMemo<BonusTimer[]>(
    () => (rawTimers ?? []).filter((t) => t.status === 'active'),
    [rawTimers],
  );

  const oldest = useMemo<BonusTimer | null>(() => {
    if (active.length === 0) return null;
    return active.reduce((o, t) =>
      Date.parse(t.spawnedAt) < Date.parse(o.spawnedAt) ? t : o,
    );
  }, [active]);

  const originHabit = useMemo<Habit | null>(() => {
    if (!oldest || !oldest.originHabitId) return null;
    return habits.find((h) => h.id === oldest.originHabitId) ?? null;
  }, [oldest, habits]);

  return { oldest, originHabit, activeCount: active.length };
}
```

- [ ] **Step 2: Refactor `BonusTimerBanner` to consume the hook**

In `src/features/bonus/BonusTimerBanner.tsx`, replace the inline `rawTimers`/`active`/`oldest`/`originHabit` blocks with:

```tsx
import { useBonusTimerSummary } from './useBonusTimerSummary.ts';
// inside the component:
const { oldest, originHabit, activeCount } = useBonusTimerSummary();
const moreCount = activeCount - 1;
```

(Keep the rest of the component unchanged — `onExpire`, `onTap`, render JSX.)

- [ ] **Step 3: Run banner tests**

Run: `npm run test -- BonusTimerBanner`
Expected: green (the refactor is behavior-preserving).

- [ ] **Step 4: Commit**

```bash
git add src/features/bonus/useBonusTimerSummary.ts src/features/bonus/BonusTimerBanner.tsx
git commit -m "refactor(bonus): extract useBonusTimerSummary hook"
```

### Task 2.2: `RecentPulls` component

**Files:**
- Create: `src/ui/parlour/RecentPulls.tsx`

- [ ] **Step 1: Find the spin-history selector**

Run `grep -rn "spinHistory\|recentSpins\|lastSpin" src/state/ src/types/` to locate the existing history shape. The activity feed (`src/features/jar/ActivityFeed.tsx`) already reads from a similar store; mirror its pattern.

- [ ] **Step 2: Implement**

```tsx
// src/ui/parlour/RecentPulls.tsx
/**
 * RecentPulls — last 5 spins as a compact ledger row.
 *
 * Lives in the right rail at desktop. Reads from the spin-history slice
 * via the same selector ActivityFeed uses (deduped at higher level).
 */
import { useMemo } from 'react';
import { useAppStore } from '../../state/store.ts';
import { Chip } from './Chip.tsx';

export function RecentPulls() {
  const events = useAppStore((s) => s.events ?? []);
  const recent = useMemo(
    () => events.filter((e) => e.kind === 'spin').slice(-5).reverse(),
    [events],
  );

  if (recent.length === 0) {
    return <p className="recent-pulls__empty">No pulls yet.</p>;
  }

  return (
    <ul className="recent-pulls" aria-label="Recent pulls">
      {recent.map((ev) => (
        <li key={ev.id} className="recent-pulls__row">
          <Chip color="var(--color-gold)" size={20} />
          <span className="recent-pulls__tier">{ev.tier ?? '—'}</span>
          <span className="recent-pulls__time">{relativeTime(ev.at)}</span>
        </li>
      ))}
    </ul>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
```

> **Note for the executor:** the `events` selector path may differ — verify against the actual store shape before committing. If the spin-history slice has a different field, adapt accordingly.

- [ ] **Step 3: Add CSS**

Append to `src/styles/desktop.css`:

```css
@media (min-width: 1024px) {
  .recent-pulls { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .recent-pulls__row { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: calc(11px * var(--mono-scale)); color: var(--color-ink-muted); }
  .recent-pulls__tier { color: var(--color-gold); letter-spacing: 0.16em; text-transform: uppercase; }
  .recent-pulls__time { margin-left: auto; }
  .recent-pulls__empty { color: var(--color-ink-faint); font-style: italic; }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/parlour/RecentPulls.tsx src/styles/desktop.css
git commit -m "feat(desktop): add RecentPulls right-rail widget"
```

### Task 2.3: Bonus widget for the right rail

**Files:**
- Create: `src/features/bonus/RailBonusWidget.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/features/bonus/RailBonusWidget.tsx
/**
 * RailBonusWidget — desktop right-rail surface for the active bonus timer.
 *
 * Shares state with BonusTimerBanner via useBonusTimerSummary so both
 * surfaces show the same timer.
 */
import { useNavigate } from 'react-router-dom';
import { useBonusTimerSummary } from './useBonusTimerSummary.ts';
import { BonusTimerCountdown } from './BonusTimerCountdown.tsx';
import { getAppStore, useAppStore } from '../../state/store.ts';

export function RailBonusWidget() {
  const navigate = useNavigate();
  const { oldest, originHabit, activeCount } = useBonusTimerSummary();
  const activeJarId = useAppStore((s) => s.activeJarId);

  if (!oldest) return null;

  const onExpire = () => {
    getAppStore().getState().actions.expireBonusTimer(activeJarId, oldest.id);
  };

  return (
    <button
      type="button"
      className="rail-bonus"
      onClick={() => navigate('/bonus')}
      aria-label={`Bonus timer active: ${oldest.percent}% on ${originHabit?.name ?? 'pick a habit'}.`}
    >
      <span className="rail-bonus__title">時 · Bonus Timer</span>
      <span className="rail-bonus__badge">{oldest.percent}%</span>
      <BonusTimerCountdown
        endTimestamp={oldest.endTimestamp}
        onExpire={onExpire}
        compact
        className="rail-bonus__countdown"
      />
      <span className="rail-bonus__habit">{originHabit?.name ?? 'pick a habit'}</span>
      {activeCount > 1 && <span className="rail-bonus__more">+{activeCount - 1} more</span>}
    </button>
  );
}
```

- [ ] **Step 2: CSS**

Append to `src/features/bonus/bonus.css`:

```css
@media (min-width: 1024px) {
  .rail-bonus {
    width: 100%;
    background: transparent;
    border: none;
    padding: 0;
    color: inherit;
    cursor: pointer;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px;
    text-align: left;
  }
  .rail-bonus__title {
    grid-column: 1 / -1;
    font-family: var(--font-mono);
    font-size: calc(10px * var(--mono-scale));
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--color-ink-muted);
  }
  .rail-bonus__badge {
    grid-column: 2;
    font-family: var(--font-display);
    color: var(--color-gold);
  }
  .rail-bonus__countdown { grid-column: 1; color: var(--color-ink); }
  .rail-bonus__habit { grid-column: 1 / -1; font-style: italic; color: var(--color-ink-muted); font-size: 13px; }
  .rail-bonus__more {
    grid-column: 1 / -1;
    font-family: var(--font-mono);
    font-size: calc(9px * var(--mono-scale));
    color: var(--color-near-miss);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/bonus/RailBonusWidget.tsx src/features/bonus/bonus.css
git commit -m "feat(desktop): add RailBonusWidget for right rail"
```

### Task 2.4: Wire all three widgets into `RightRail`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/ui/parlour/RightRail.tsx`

- [ ] **Step 1: Provide widgets via prop**

In `src/App.tsx`:

```tsx
import { PachinkoPotMini } from './features/jar/index.ts';
import { RailBonusWidget } from './features/bonus/RailBonusWidget.tsx';
import { RecentPulls } from './ui/parlour/RecentPulls.tsx';
// …
<DesktopShell rail={{
  pot: <PachinkoPotMini />,
  bonus: <RailBonusWidget />,
  recent: <RecentPulls />,
}}>
  {/* main */}
</DesktopShell>
```

- [ ] **Step 2: Verify rails populate at desktop**

Manual check at 1440px: right rail shows Pot, Bonus (if active timer), Recent Pulls. Mobile unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(desktop): wire Pot/Bonus/RecentPulls into right rail"
```

---

## Phase 3 · `Drawer` primitive

### Task 3.1: `Drawer` component + tests

**Files:**
- Create: `src/ui/Drawer.tsx`
- Create: `src/ui/__tests__/drawer.test.tsx`
- Modify: `src/ui/ui.css` (drawer slide animations)

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/__tests__/drawer.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer, DrawerContent, DrawerTitle } from '../Drawer.tsx';

afterEach(() => vi.restoreAllMocks());

describe('Drawer', () => {
  it('renders bottom-sheet at narrow viewports', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>Stake</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const content = screen.getByRole('dialog');
    expect(content.className).toMatch(/drawer__content--bottom/);
  });

  it('renders right-drawer at wide viewports', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>Stake</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const content = screen.getByRole('dialog');
    expect(content.className).toMatch(/drawer__content--right/);
  });

  it('closes on backdrop click', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle>x</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    fireEvent.click(document.querySelector('.drawer__overlay') as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on Escape', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle>x</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- drawer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the primitive**

```tsx
// src/ui/Drawer.tsx
/**
 * Drawer — bottom sheet at <1024px, 480px right-slide drawer at ≥1024px.
 *
 * Built on Dialog so focus-trap, ESC, backdrop close, aria wiring all
 * come for free. The mode swap is purely visual — the React tree, focus
 * management, and a11y semantics are identical at both widths.
 */
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  type DialogProps,
} from './dialog.tsx';
import { cn } from './utils.ts';
import { useIsDesktop } from '../lib/useIsDesktop.ts';
import type { HTMLAttributes, ReactNode } from 'react';

export function Drawer(props: DialogProps) {
  return <Dialog {...props} />;
}

interface DrawerContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function DrawerContent({ className, children, ...rest }: DrawerContentProps) {
  const isDesktop = useIsDesktop();
  const modeClass = isDesktop ? 'drawer__content--right' : 'drawer__content--bottom';
  return (
    <DialogContent className={cn('drawer__content', modeClass, className)} {...rest}>
      {children}
    </DialogContent>
  );
}

export { DialogTitle as DrawerTitle, DialogDescription as DrawerDescription, DialogClose as DrawerClose };
```

- [ ] **Step 4: CSS — append to `src/ui/ui.css`**

```css
.drawer__content {
  position: fixed;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-velvet);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}
.drawer__content--bottom {
  inset-inline: 0;
  bottom: 0;
  border-radius: var(--radius-card) var(--radius-card) 0 0;
  max-height: 90vh;
  animation: drawer-slide-up 240ms var(--ease-out);
}
.drawer__content--right {
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  border-radius: 0;
  animation: drawer-slide-left 240ms var(--ease-out);
}
@keyframes drawer-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes drawer-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }

@media (prefers-reduced-motion: reduce) {
  .drawer__content--bottom,
  .drawer__content--right { animation: none; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- drawer`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/Drawer.tsx src/ui/__tests__/drawer.test.tsx src/ui/ui.css
git commit -m "feat(ui): add Drawer primitive (bottom-sheet/right-drawer)"
```

### Task 3.2: Convert `RewardEditor` to use Drawer

**Files:**
- Modify: `src/features/rewards/RewardEditor.tsx`

- [ ] **Step 1: Swap the imports**

In `src/features/rewards/RewardEditor.tsx`:

```tsx
// before:
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog.tsx';
// after:
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '../../ui/Drawer.tsx';
```

Update JSX:

```tsx
<Drawer open={open} onOpenChange={handleOpenChange}>
  <DrawerContent className="reward-editor" aria-label={title}>
    <DrawerTitle>{title}</DrawerTitle>
    <DrawerDescription>…</DrawerDescription>
    {/* unchanged body */}
  </DrawerContent>
</Drawer>
```

- [ ] **Step 2: Run rewards tests + a11y**

Run: `npm run test -- RewardEditor`
Expected: green (the focus-trap and ESC behavior come from the underlying Dialog).

- [ ] **Step 3: Commit**

```bash
git add src/features/rewards/RewardEditor.tsx
git commit -m "feat(desktop): swap RewardEditor Dialog → Drawer"
```

### Task 3.3: Audit other Dialog call sites

**Files:**
- Survey only — modifications happen per call site

- [ ] **Step 1: List Dialog consumers**

Run: `grep -rn "from.*ui/dialog\|from '../../ui/dialog'" src/ --include='*.tsx' --include='*.ts'`

- [ ] **Step 2: Decide per call site**

For each consumer, decide:
- **Editor-style (form, multi-input)** → swap to `Drawer`. Examples: anything that lets the user edit a list item.
- **Acknowledgement (confirm yes/no, single message)** → leave as `Dialog`. Examples: `PwaUpdatePrompt`, confirm dialogs, `MilestoneClaimModal`.

- [ ] **Step 3: Apply swaps**

For each editor-style consumer found, repeat the Task 3.2 swap pattern. Commit each individually:

```bash
git add <file>
git commit -m "feat(desktop): swap <Component> Dialog → Drawer"
```

> **Note:** if no other editor-style Dialogs are found, this task is a no-op — `RewardEditor` may be the only one. Skip the commit and move on.

---

## Phase 4 · CSS-reflow per-screen passes

### Task 4.1: Home — 3-col rituals grid

**Files:**
- Modify: `src/features/habits/habits.css` (or wherever ritual list rules live)
- Modify: `src/routes/Home.tsx` (add a class hook if needed)

- [ ] **Step 1: Find the rituals list container**

Read `src/routes/Home.tsx` and identify the wrapper around the rituals list. It likely already has a class like `.rituals-list` or `.home__rituals`. If not, add `<div className="rituals-grid">` around the list.

- [ ] **Step 2: Add desktop grid rules**

In the relevant CSS file:

```css
@media (min-width: 1024px) {
  .rituals-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 360px));
    gap: var(--space-3);
    justify-content: center;
  }
}
```

- [ ] **Step 3: Verify**

Manual check at 1440px: rituals appear in 3 columns; at 390px, they remain in a single stack.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Home.tsx src/features/habits/habits.css
git commit -m "feat(desktop): Home rituals 3-col grid at ≥1024px"
```

### Task 4.2: Habits — 3-col grid

**Files:**
- Modify: `src/features/habits/habits.css`

- [ ] **Step 1: Add the same grid rules to the Habits route container**

Same pattern as Task 4.1. The Habits route renders `RitualCard`s in a list; reuse `.rituals-grid` class or add a parallel class.

- [ ] **Step 2: Commit**

```bash
git add src/routes/Habits.tsx src/features/habits/habits.css
git commit -m "feat(desktop): Habits route 3-col grid at ≥1024px"
```

### Task 4.3: Vault/Rewards — 3 tier columns

**Files:**
- Modify: `src/features/rewards/rewards.css`

- [ ] **Step 1: Read the current Rewards layout**

Look at `src/routes/Rewards.tsx` — after the 2026-04-25 audit it's a vertical stack of tier sections. Add a class like `.tier-stack` if not present.

- [ ] **Step 2: Desktop grid**

```css
@media (min-width: 1024px) {
  .tier-stack {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4);
    align-items: start;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/Rewards.tsx src/features/rewards/rewards.css
git commit -m "feat(desktop): Vault tier 3-col layout at ≥1024px"
```

### Task 4.4: History — wider padding

**Files:**
- Modify: `src/routes/History.tsx` and/or `src/features/jar/jar.css`

- [ ] **Step 1: Add desktop padding**

```css
@media (min-width: 1024px) {
  .route--history { padding-inline: var(--space-8); max-width: 720px; margin-inline: auto; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/History.tsx src/features/jar/jar.css
git commit -m "feat(desktop): History route padding at ≥1024px"
```

---

## Phase 5 · JSX-conditional per-screen passes

### Task 5.1: Spin / Cash-in (`/spin`) — tier ladder beside hand tray

**Files:**
- Modify: `src/routes/SpinFlow.tsx` (or whichever component renders the cash-in step)
- Modify: `src/features/spin/spin.css`

- [ ] **Step 1: Add a layout hook**

Wrap the cash-in step's primary content area in `<div className="spin-cashin">` if not present. Inside, add `<HandTrayCard>` and `<CashInPicker>` as siblings.

- [ ] **Step 2: Desktop grid CSS**

```css
@media (min-width: 1024px) {
  .spin-cashin {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: var(--space-4);
    align-items: start;
  }
}
```

(`HandTrayCard` fills the 1fr; `CashInPicker` sits in the 360px column.)

- [ ] **Step 3: Stake summary stays inline at desktop**

The spec mentions moving stake summary into the right rail. For v1, **keep the stake summary inline next to `CashInPicker`** — wiring route-aware rail content adds a context layer or store coupling that's not worth the lift this PR. Track "stake summary in right rail" as a v1.1 polish item in BACKLOG.md.

- [ ] **Step 4: Commit**

```bash
git add src/routes/SpinFlow.tsx src/features/spin/spin.css
git commit -m "feat(desktop): Spin cash-in side-by-side layout"
```

### Task 5.2: Spin / Pull (`/spin/pull`) — 420px wheel + lever beside

**Files:**
- Modify: spin route component for the pull screen
- Modify: `src/features/spin/spin.css`

- [ ] **Step 1: JSX-conditional layout**

In the pull-screen component, branch on `useIsDesktop()`:

```tsx
const isDesktop = useIsDesktop();
return isDesktop ? (
  <div className="spin-pull spin-pull--desktop">
    <WheelCabinet wheelSize={420} />
    <PachinkoLever orientation="vertical" />
  </div>
) : (
  <div className="spin-pull">
    <WheelCabinet />
    <PachinkoLever orientation="horizontal" />
  </div>
);
```

(The `wheelSize` prop and `orientation` prop on the lever may need to be added — check the existing components first; if not present, plumb them through.)

- [ ] **Step 2: Desktop CSS**

```css
@media (min-width: 1024px) {
  .spin-pull--desktop {
    display: grid;
    grid-template-columns: 460px auto;
    gap: var(--space-5);
    align-items: center;
    justify-content: center;
  }
}
```

- [ ] **Step 3: Run spin e2e tests**

Run: `npm run test:e2e -- --project=chromium-mobile` (mobile project should still pass)
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/routes/SpinFlow.tsx src/features/spin/spin.css src/features/spin/WheelCabinet.tsx src/features/spin/SpinButton.tsx
git commit -m "feat(desktop): Spin pull — 420px wheel with lever beside"
```

### Task 5.3: Spin / Reveal — full center pane

**Files:**
- Modify: `src/features/spin/RevealScreen.tsx` and `src/features/spin/RevealStage.tsx`
- Modify: `src/features/spin/spin.css`

- [ ] **Step 1: Verify reveal already fills the pane**

Reveal is mostly a centered chrysanthemum + rays + reward picker. At desktop, it already centers via flex; just verify max-width isn't capped.

- [ ] **Step 2: Bump reward picker width at desktop**

```css
@media (min-width: 1024px) {
  .reveal-screen { max-width: 680px; margin-inline: auto; }
  .reward-menu { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/spin/RevealScreen.tsx src/features/spin/RevealStage.tsx src/features/spin/spin.css
git commit -m "feat(desktop): Spin reveal — wider reward picker"
```

### Task 5.4: Jar — JarVisual + history side-by-side

**Files:**
- Modify: `src/routes/Jar.tsx`
- Modify: `src/features/jar/jar.css`

- [ ] **Step 1: JSX-conditional**

```tsx
import { useIsDesktop } from '../lib/useIsDesktop.ts';
// inside Jar render:
const isDesktop = useIsDesktop();
return (
  <section className={cn('route route--jar', isDesktop && 'route--jar--desktop')}>
    <div className="jar-layout">
      <div className="jar-layout__visual">
        <JarVisual />
      </div>
      <div className="jar-layout__history">
        <ActivityFeed />
        <PachinkoStreak />
      </div>
    </div>
  </section>
);
```

- [ ] **Step 2: Desktop CSS**

```css
@media (min-width: 1024px) {
  .jar-layout { display: grid; grid-template-columns: minmax(0, 480px) minmax(0, 1fr); gap: var(--space-5); align-items: start; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/Jar.tsx src/features/jar/jar.css
git commit -m "feat(desktop): Jar route side-by-side layout"
```

### Task 5.5: BonusTimerDetail — split layout

**Files:**
- Modify: `src/routes/BonusTimerDetail.tsx`
- Modify: `src/features/bonus/bonus.css`

- [ ] **Step 1: Split JSX at desktop**

Wrap the hourglass + countdown in `.bonus-detail__left`; wrap the discount-habit picker grid in `.bonus-detail__right`. Apply a parent `.bonus-detail__layout`.

- [ ] **Step 2: Desktop CSS**

```css
@media (min-width: 1024px) {
  .bonus-detail__layout {
    display: grid;
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
  }
  .bonus-detail__right .discount-habit-picker { grid-template-columns: repeat(3, 1fr); }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/BonusTimerDetail.tsx src/features/bonus/bonus.css
git commit -m "feat(desktop): BonusTimerDetail split layout"
```

---

## Phase 6 · Cinematic Onboarding shell

### Task 6.1: `CinematicShell` component

**Files:**
- Create: `src/ui/parlour/CinematicShell.tsx`
- Create: `src/ui/parlour/__tests__/CinematicShell.test.tsx`
- Modify: `src/ui/parlour/index.ts`

- [ ] **Step 1: Tests**

```tsx
// src/ui/parlour/__tests__/CinematicShell.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CinematicShell } from '../CinematicShell.tsx';

afterEach(() => vi.restoreAllMocks());

describe('CinematicShell', () => {
  it('renders children unchanged at narrow viewport', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);
    render(<CinematicShell><p>onboarding step</p></CinematicShell>);
    expect(screen.getByText('onboarding step')).toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-backdrop')).not.toBeInTheDocument();
  });

  it('wraps children in backdrop chrome at wide viewport', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);
    render(<CinematicShell><p>onboarding step</p></CinematicShell>);
    expect(screen.getByText('onboarding step')).toBeInTheDocument();
    expect(screen.getByTestId('cinematic-backdrop')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implementation**

```tsx
// src/ui/parlour/CinematicShell.tsx
/**
 * CinematicShell — Onboarding desktop wrapper.
 *
 * No-op at <1024px (children render as-is). At ≥1024px, fills the viewport
 * with a felt+grain backdrop, places four corner ornate motifs, and centers
 * the children in a framed card (max-width 540px).
 */
import type { ReactNode } from 'react';
import { useIsDesktop } from '../../lib/useIsDesktop.ts';
import { OrnateFrame } from './OrnateFrame.tsx';

export function CinematicShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <>{children}</>;
  return (
    <div className="cinematic-shell" data-testid="cinematic-backdrop">
      <CornerMotif position="tl" />
      <CornerMotif position="tr" />
      <CornerMotif position="bl" />
      <CornerMotif position="br" />
      <div className="cinematic-shell__card">
        <OrnateFrame>{children}</OrnateFrame>
      </div>
    </div>
  );
}

function CornerMotif({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return <div className={`cinematic-shell__corner cinematic-shell__corner--${position}`} aria-hidden="true" />;
}
```

- [ ] **Step 3: CSS**

Append to `src/styles/desktop.css`:

```css
.cinematic-shell { display: contents; }

@media (min-width: 1024px) {
  .cinematic-shell {
    position: fixed;
    inset: 0;
    background: var(--color-bg-grad);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  .cinematic-shell::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 3px 3px;
    mix-blend-mode: overlay;
    pointer-events: none;
  }
  .cinematic-shell__card {
    position: relative;
    width: 100%;
    max-width: 540px;
    z-index: 1;
  }
  .cinematic-shell__corner {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 1px solid var(--color-gold);
    opacity: 0.4;
  }
  .cinematic-shell__corner--tl { top: 24px; left: 24px; border-right: none; border-bottom: none; }
  .cinematic-shell__corner--tr { top: 24px; right: 24px; border-left: none; border-bottom: none; }
  .cinematic-shell__corner--bl { bottom: 24px; left: 24px; border-right: none; border-top: none; }
  .cinematic-shell__corner--br { bottom: 24px; right: 24px; border-left: none; border-top: none; }
}
```

- [ ] **Step 4: Export from barrel**

Add to `src/ui/parlour/index.ts`:

```ts
export { CinematicShell } from './CinematicShell.tsx';
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- CinematicShell`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/parlour/CinematicShell.tsx src/ui/parlour/__tests__/CinematicShell.test.tsx src/ui/parlour/index.ts src/styles/desktop.css
git commit -m "feat(desktop): add CinematicShell for Onboarding"
```

### Task 6.2: Wrap Onboarding route

**Files:**
- Modify: `src/routes/Onboarding.tsx`

- [ ] **Step 1: Wrap render**

```tsx
import { CinematicShell } from '../ui/parlour/index.ts';
// inside default export:
return (
  <CinematicShell>
    {/* existing onboarding render */}
  </CinematicShell>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/Onboarding.tsx
git commit -m "feat(desktop): wrap Onboarding in CinematicShell"
```

---

## Phase 7 · Hover states

### Task 7.1: BrassButton hover

**Files:**
- Modify: `src/ui/parlour/BrassButton.tsx` and its CSS (likely inline / tokens-driven)

- [ ] **Step 1: Add hover rules under desktop predicate**

Find the BrassButton stylesheet (or `tokens.css` if button styles are tokens-only) and add:

```css
@media (hover: hover) and (min-width: 1024px) {
  .brass-button--primary:hover {
    background: linear-gradient(180deg, var(--color-win), var(--color-gold));
    box-shadow: 0 0 12px var(--color-gold-glow);
    transform: translateY(-1px);
  }
  .brass-button--ghost:hover {
    border-color: var(--color-border-strong);
    color: var(--color-gold);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/parlour/BrassButton.tsx
git commit -m "feat(desktop): BrassButton hover states"
```

### Task 7.2: RitualCard hover

**Files:**
- Modify: `src/features/habits/habits.css` (where RitualCard CSS lives)

```css
@media (hover: hover) and (min-width: 1024px) {
  .ritual-card { transition: border-color 150ms ease, box-shadow 150ms ease; }
  .ritual-card:hover {
    border-color: var(--color-border-strong);
    box-shadow: inset 0 0 0 1px var(--color-gold-glow);
  }
  .ritual-card:hover .ritual-card__plus { transform: scale(1.06); }
}
```

Commit:

```bash
git add src/features/habits/habits.css
git commit -m "feat(desktop): RitualCard hover state"
```

### Task 7.3: Chip + nav + tier rows + lever hover

**Files:**
- Modify: `src/ui/parlour/Chip.tsx` (or its CSS)
- Modify: `src/styles/desktop.css` (left-rail / bottom-nav-at-desktop hover already in 1.1; tier rows here)
- Modify: `src/features/spin/spin.css` (lever cursor)

- [ ] **Step 1: Chip hover**

```css
@media (hover: hover) and (min-width: 1024px) {
  .chip { transition: transform 150ms ease, filter 150ms ease; cursor: pointer; }
  .chip:hover { transform: translateY(-1px); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6)); }
}
```

- [ ] **Step 2: Tier-row hover**

```css
@media (hover: hover) and (min-width: 1024px) {
  .tier-row:hover { border-color: var(--color-border-strong); }
  .tier-row--add-dashed:hover { color: var(--color-gold); }
}
```

- [ ] **Step 3: Lever cursor**

```css
@media (hover: hover) and (min-width: 1024px) {
  .pachinko-lever__knob { cursor: grab; }
  .pachinko-lever__knob:active { cursor: grabbing; }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/parlour/Chip.tsx src/features/rewards/rewards.css src/features/spin/spin.css src/styles/desktop.css
git commit -m "feat(desktop): Chip/tier/lever hover states"
```

---

## Phase 8 · Tests

### Task 8.1: Add `desktop-chromium` Playwright project

**Files:**
- Modify: `playwright.config.ts`

- [ ] **Step 1: Add project**

```ts
projects: [
  { name: 'chromium-mobile' },
  {
    name: 'desktop-chromium',
    use: {
      browserName: 'chromium',
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
      deviceScaleFactor: 1,
    },
  },
],
```

- [ ] **Step 2: Run both projects**

Run: `npm run test:e2e`
Expected: both projects pass; existing mobile suite re-runs at desktop and any layout regressions surface.

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "test(e2e): add desktop-chromium project at 1440x900"
```

### Task 8.2: New `desktop-chassis.spec.ts`

**Files:**
- Create: `e2e/desktop-chassis.spec.ts`

- [ ] **Step 1: Implement**

```ts
// e2e/desktop-chassis.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Desktop chassis', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding (the e2e suite has a helper for this; mirror its pattern).
    await page.goto('/');
  });

  test('left rail and right rail visible at 1440px', async ({ page }) => {
    await expect(page.locator('.left-rail')).toBeVisible();
    await expect(page.locator('.right-rail')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();
  });

  test('Vault renders 3 tier columns', async ({ page }) => {
    await page.goto('/rewards');
    const stack = page.locator('.tier-stack');
    await expect(stack).toHaveCSS('grid-template-columns', /repeat\(3/);
  });

  test('RewardEditor opens as right drawer', async ({ page }) => {
    await page.goto('/rewards');
    await page.getByRole('button', { name: /add to tier/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveClass(/drawer__content--right/);
  });

  test('Onboarding renders cinematic backdrop', async ({ page, context }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/onboarding');
    await expect(page.getByTestId('cinematic-backdrop')).toBeVisible();
  });
});
```

> **Project gating:** these tests should only run under `desktop-chromium`. Add `test.skip(({ project }) => project.name !== 'desktop-chromium', 'desktop only')` at the top of the describe block, or move the spec under a project filter in `playwright.config.ts`.

- [ ] **Step 2: Run**

Run: `npm run test:e2e -- --project=desktop-chromium`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add e2e/desktop-chassis.spec.ts
git commit -m "test(e2e): desktop chassis assertions"
```

### Task 8.3: A11y under desktop viewport

**Files:**
- Modify: `e2e/a11y.spec.ts` (existing axe-core sweep)

- [ ] **Step 1: Re-run under desktop project**

The existing spec auto-runs under both projects after Task 8.1. If new violations appear:
- Color-contrast violations → add to AUDIT.md non-blocking list (existing pattern).
- Anything else → block and fix before merging.

- [ ] **Step 2: Commit any AUDIT.md updates**

```bash
git add AUDIT.md
git commit -m "docs(audit): note desktop a11y findings"
```

---

## Phase 9 · Polish

### Task 9.1: Manual QA + punch list

- [ ] **Step 1: Click every route at three viewports**

390 / 1024 / 1440. Note any visual misalignments. Capture screenshots for stubborn ones.

- [ ] **Step 2: Address punch list**

Each item gets its own commit. Common fixes likely needed:
- Padding adjustments where rails crowd content
- Wheel size tweaks if 420px feels off
- Reward picker columns at 1024–1280 may need to be 2-col not 2 (verify)

- [ ] **Step 3: Commit punch-list fixes individually**

### Task 9.2: BACKLOG.md tick + CHANGELOG.md entry

**Files:**
- Modify: `BACKLOG.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Tick BACKLOG items**

Strike through items in the "Desktop adaptation (added 2026-04-26)" section as they ship. Mark each `- [x] ~~...~~ Shipped 2026-04-26.` per the file's existing convention.

- [ ] **Step 2: CHANGELOG entry**

Add at the top of `CHANGELOG.md`:

```markdown
## 2026-04-26 · Desktop adaptation

- Three-pane salon chassis at ≥1024px (left rail · center stage · right rail).
- Per-screen passes: Home/Habits/Vault grids, Spin wheel/lever-beside, Jar/BonusTimerDetail split layouts.
- `Drawer` primitive (bottom-sheet at mobile, 480px right-slide at desktop).
- Cinematic Onboarding shell at desktop.
- Hover affordances across primitives.
- Mobile UX unchanged. Desktop e2e project added at 1440×900.
```

- [ ] **Step 3: Commit**

```bash
git add BACKLOG.md CHANGELOG.md
git commit -m "docs: tick desktop backlog + changelog entry"
```

---

## Verification at end of plan

Before opening the PR:

- [ ] `npm run typecheck` — green
- [ ] `npm run lint` — green
- [ ] `npm run test` — green
- [ ] `npm run test:e2e` — both projects green
- [ ] `npm run build` — succeeds, bundle size unchanged ±5%
- [ ] Manual click-through at 390 / 1024 / 1440 — punch list addressed
- [ ] BACKLOG.md ticks reflect what's shipped
- [ ] CHANGELOG.md entry in place
