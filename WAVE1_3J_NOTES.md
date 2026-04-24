# WAVE1_3J_NOTES — Shell & Navigation Agent

Handoff notes for Wave 2+. 3J shipped the shell, primitives, tokens, routes,
and PWA update plumbing. 3A's data layer is NOT a dependency of this shell —
feature agents wire into the slots as they land.

## What shipped

### Entry + shell
- `src/main.tsx` — React root wrapped in `<StrictMode><ErrorBoundary><HashRouter><ToastProvider><App/>`. `storage-persist.ts` is side-effect imported but NOT fired — 3A calls `requestPersistentStorage()` from store middleware on the first `clip_earned` append.
- `src/App.tsx` — route tree, suspense fallback, persistent `<BonusTimerBannerStub/>` (nothing until 3H lands), `<PwaUpdatePrompt/>`.
- `src/ErrorBoundary.tsx` — top-level fallback, dev-only stack trace.
- `src/BottomNav.tsx` — 5-slot `NavLink` tab bar (Home, Habits, Spin, Jar, Settings) with lucide icons + labels. 44×44 tap targets.
- `src/BonusTimerBannerStub.tsx` — placeholder; 3H swaps this import for the real banner.
- `src/PwaUpdatePrompt.tsx` — consumes `virtual:pwa-register/react` and fires a sticky toast with [Reload] action per D/Q10.

### Design tokens
- `src/styles/tokens.css` — single source of truth. Dark-mode warm red `#E53935`, gold `#FFD700` (reserved for gold-clip moments), clip palette, 44pt tap target, safe-area inset for bottom nav.
- `src/styles/globals.css` — reset, focus-ring, prefers-reduced-motion, `.app-shell` layout primitives, `.sr-only`.
- `src/styles/theme.ts` — TS mirror of tokens for inline styles (Framer Motion consumers in Wave 2+).
- `src/index.css` — imports tokens → tailwind → globals → re-declares key tokens in `@theme {}` so Tailwind utilities (`bg-surface`, `text-accent`, etc.) resolve the same values.
- `src/shell.css` — bottom nav, `.route`, `.placeholder-card`, and `.slot` used by the Wave-1 placeholder screens.
- `src/ui/ui.css` — styles for the vendored shadcn primitives (single stylesheet; keeps cascade coherent).

### UI primitives (vendored shadcn-style, pure React — no Radix dep yet)
All in `src/ui/`:
- `button.tsx` — variants: `primary | secondary | ghost | danger | gold`; sizes: `sm | md | lg | icon`. Encodes `cva` logic inline to dodge the dep.
- `dialog.tsx` — portaled, focus-trapped, Escape/overlay dismiss, body-scroll lock. Exports `Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose`.
- `tabs.tsx` — controlled + uncontrolled. Keyboard: Left/Right/Home/End. Selection-follows-focus.
- `toast.tsx` — `ToastProvider` + `useToast()` + viewport. Supports ephemeral auto-dismiss AND sticky-with-action (used by PwaUpdatePrompt).
- `input.tsx` — thin wrapper; className `.input` token block.
- `switch.tsx` — `role="switch"`, controlled, data-state styled.
- `slider.tsx` — single-thumb, native `<input type=range>` under the visual layer → keyboard + a11y for free.
- `popover.tsx` — controlled/uncontrolled, outside-click + Escape dismiss.
- `utils.ts` — local `cn()` helper so we don't need `clsx` + `tailwind-merge` yet (listed in `WAVE1_3J_DEPS.txt`).

### Routes (placeholder shells — all wired, none implemented)
All in `src/routes/`:
- `Home.tsx`, `Habits.tsx`, `Rewards.tsx`, `Jar.tsx`, `History.tsx`, `Settings.tsx`, `Onboarding.tsx`, `SpinFlow.tsx`, `BonusTimerDetail.tsx`
- Each exports a default component rendered inside `<section class="route">` with headings and `.slot` blocks labeled `[3D] HabitList`, `[3G] JarVisual`, etc. Slots are outlined with a dashed red rule in dev so mount points are visible.

### Lib
- `src/lib/haptics.ts` — `navigator.vibrate` wrapper + semantic presets (`tap, clipEarn, spinTick, winSmall, winMid, winBig, gold, nearMiss`). `setHapticsEnabled(bool)` for settings integration.
- `src/lib/storage-persist.ts` — `requestPersistentStorage()` returns `{ ok: true, already } | { ok: false, reason }`. Idempotent. **Never call on first render** — wire into store middleware at first clip earn.

### Config
- `src/vite-env.d.ts` — adds `vite-plugin-pwa/react` + `vite-plugin-pwa/client` types for the virtual module.
- `index.html` — meta tags: `theme-color #E53935`, `apple-mobile-web-app-capable`, `viewport-fit=cover`, `color-scheme dark`.

---

## Route → feature-slot table

Each route is already wired into the HashRouter and renders an empty-state card with a labeled `.slot` block. Wave 2 agents drop their components into the slot. No code changes to the routes needed — just replace `<div class="placeholder-card">…</div>` with the real component.

| Route | Owner | Slots (in render order) |
|---|---|---|
| `/` | 3D, 3E, 3G | `[3G] StreakHeader` → `[3D] QuickLogButton *5` → `[3E] HandSummary` → `[3G] JarSnippet` → `[3G] ActivityFeed limit=7` |
| `/habits` | 3D | `[3D] HabitList`, `[3D] HygieneBundle` |
| `/rewards` | 3F | `[3F] RewardMenu tier=t1`, `[3F] RewardMenu tier=t2`, `[3F] RewardMenu tier=t3` — already inside a `<Tabs>` with the three triggers, so 3F just passes the `tier` prop into each panel |
| `/spin` | 3C, 3E, 3F | `[3E] HandView` → `[3E] CashInPicker` → `[3E] SpinButton + [3C] WheelCanvas` → `[3E] PostSpinFlow → [3F] RewardPickerModal or [3C] BonusWheelCanvas` |
| `/jar` | 3G | `[3G] JarVisual`, `[3G] MilestoneEditor`, `[3G] MilestoneClaimModal` |
| `/history` | 3G | `[3G] ActivityFeed (full)` |
| `/settings` | 3I | `WheelConfigEditor`, `BagCompositionEditor`, `HygieneCutoffEditor`, `SfxHapticsToggles`, `ExportImportPanel`, `ResetAllDanger` |
| `/onboarding` | 3I | `[3I] OnboardingFlow` |
| `/bonus` | 3H | `[3H] BonusTimerCountdown`, `[3H] DiscountHabitPicker` |
| (anywhere) | 3H | `<BonusTimerBannerStub/>` mounted at top of `<App/>` — replace with real `<BonusTimerBanner/>` when 3H lands |

---

## Design tokens added

Colors: `bg, surface, surface-2, surface-3, border, border-strong, text, text-muted, text-faint, accent (+ hover, pressed, contrast), gold (+ gold-glow), success, danger, warning, near-miss, clip-{red,blue,green,yellow,purple,pink}`.

Radii: `xs (4), sm (8), card (12), lg (16), pill (9999)`.

Spacing: `s1 (4) – s8 (32)`, `tap-target-min (44)`, `bottom-nav-height (64)`, `safe-area-bottom`.

Type: `font-sans, font-mono`, `text-xs / sm / base / lg / xl / 2xl`.

Motion: `ease-out, ease-in-out, duration-fast / base / slow`.

Other: `shadow-card, shadow-modal, focus-ring`.

All also mirrored as TS constants in `src/styles/theme.ts` for inline styles.

---

## Gotchas for Wave 2

1. **Rewards page**: Tabs are already wired with values `t1 / t2 / t3`. 3F just needs to render their `<RewardMenu>` inside each `<TabsContent>` with the right tier prop. No need to rebuild the tab bar.
2. **PWA update toast**: uses `toast({ action: { label, onClick } })` — action is REQUIRED for non-auto-dismiss behavior. Avoid auto-dismissing critical user actions. See `src/ui/toast.tsx`.
3. **`navigator.storage.persist()` is NOT called yet.** 3A must call `requestPersistentStorage()` from `src/lib/storage-persist.ts` in the store middleware after the first `clip_earned` history append. It's idempotent and result-cached.
4. **shadcn primitives are pure React.** Full API parity with Radix-backed shadcn is NOT guaranteed — they cover the shell's needs, not every edge case. When Radix deps land (see `WAVE1_3J_DEPS.txt`), replace impl behind the same exports.
5. **`cn()` lives in `src/ui/utils.ts`** — do NOT import `clsx` / `tailwind-merge` in feature code until the deps land. Use our `cn()` for now.
6. **ErrorBoundary is top-level only.** Wave 2 features that want localized fallbacks should add route-level boundaries using the `fallback` prop.
7. **Bottom nav only shows 5 routes.** `/rewards`, `/history`, `/onboarding`, `/bonus` are reachable via deep link / programmatic navigation only. This is intentional — they're secondary screens. If 3G wants a "History" entry in top-right, add an icon button to `<Home>`'s `.route__header`, not the bottom nav.
8. **BonusTimerBanner** is a stub. 3H swaps the import in `src/App.tsx` from `./BonusTimerBannerStub.tsx` to the real banner. Keep the same export name or rename both.
9. **Routes are lazy.** Each route is `lazy(() => import(...))` inside `App.tsx`. Wave 2 can still eagerly import a component into a route file — only the route module itself splits.
10. **Reduced-motion** is honored by `globals.css`. Framer Motion consumers should respect `useReducedMotion()` from `motion/react`.
11. **Icons**: brief says to generate `icon-192/512/maskable-192/maskable-512.png`. ImageMagick not available on this machine → left as TODO in `WAVE1_3J_ICONS_TODO.md`. Manifest references the paths; the PNGs are missing. Phase 6 deploy must generate them.
12. **Deps NOT installed**: see `WAVE1_3J_DEPS.txt`. Shell builds & runs without them.

---

## Quality gate status

- **`npx vite build` passes.** Main bundle **75.41 KB gz** (threshold was 100KB) — well under budget. Framer Motion is split into its own 3.09 KB gz chunk and only loaded by Wave-2's wheel/jar features. Per-route chunks are 0.31–1.21 KB gz.
- **`npm run build` currently fails** due to TS errors in `src/db/export.ts`, `src/db/import.ts`, `src/db/migrations/index.ts` — those are **3A-owned files** and out of my scope. My files (`src/main.tsx`, `src/App.tsx`, `src/routes/**`, `src/ui/**`, `src/styles/**`, `src/lib/{haptics,storage-persist}.ts`, `src/ErrorBoundary.tsx`, `src/PwaUpdatePrompt.tsx`, `src/BottomNav.tsx`, `src/BonusTimerBannerStub.tsx`, `src/vite-env.d.ts`) all typecheck clean. Once 3A's brand-type and schema-const errors are fixed, the full build will pass.
- **`npm run dev`** starts cleanly in ~170ms at `http://localhost:5173/kakeguruimasho/`. No console errors observed in the first 3 seconds of output.
- **Bundle budget**: main chunk < 100KB gz flag: **PASS** (75.41 KB). Total initial bundle ≈ 75 KB gz + route chunk. Easily under the 250KB spec budget.
