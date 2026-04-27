# Backlog

Future work earmarked but not yet built. Add new items at the top of the
relevant section.

## Desktop polish (2026-04-26 punch list)

- [x] ~~**Home activity feed scrollable.**~~ Shipped 2026-04-26 — cap
      at `max-height: 480px` with `overflow-y: auto` and a soft
      mask-image fade at the bottom edge.
- [x] ~~**CashInPicker — let the user pick chip colors.**~~ Shipped
      2026-04-26 — "色 · Choose a Colour" sub-row with one chip
      button per eligible color appears once a tier above T1 is picked.
      Auto-pick remains the default; any eligible color is a tap-to-
      override.
- [x] ~~**Bonus chain pill.**~~ Removed 2026-04-26 — was a counter with
      no payout, so the chip carried no signal. Re-add later if/when
      a streak payoff (e.g. free bonus spin every N chain) is designed.
- [x] ~~**Streaks need actual mechanics.**~~ Shipped 2026-04-26 as
      century / millennium milestone payouts. Daily streak now
      dispenses 10 random clips + 1 gold every 100 days, 25 clips +
      10 gold every 1000 days (1000 replaces 100, not on top of), with
      a celebration modal. Hygiene + bonus-chain remain removed from
      the UI; if a payoff is ever designed for either we can re-add.
      Source: [src/features/jar/streakMilestone.ts](src/features/jar/streakMilestone.ts).

## Design audit follow-ups (2026-04-25)

A second-pass audit against `/tmp/design1/kakeguruimasho/project/` flagged
the following gaps. Item numbers match the audit summary.

### Information architecture

- [x] ~~**1. Promote Rewards to bottom nav** — design has 5 tabs: Salon ·
      Rituals · Spin · Jar · Vault.~~ Shipped 2026-04-25. Settings
      demoted to a cog in the Home masthead; Rewards is now tab 5
      (`Vault`).
- [x] ~~**4. Vintage nav labels** — `Home → Salon`, `Habits → Rituals`,
      `Rewards → Vault`.~~ Shipped 2026-04-25 alongside item 1.

### Spin flow

- [x] ~~**3. Step labels** — render `Step I of III · Cash In`,
      `Step II of III · {spinCta}`, `Step III of III · {jackpot}` chrome
      on each spin screen.~~ Shipped 2026-04-25.
- [x] ~~**3.5. Spin sub-routes** — split `/spin` into three discrete
      screens, one per step.~~ Shipped 2026-04-25:
      - `/spin` — cash-in (hand, tier ladder, lock stake)
      - `/spin/pull` — full-bleed wheel/reels animating
      - `/spin/reveal` — rays + confetti + inline claim picker (replaces
        the imperative `openRewardPicker` modal)
      Linear state machine; route guards redirect cold-load on
      `/spin/pull` or `/spin/reveal` back to `/spin`. The reveal screen
      uses an internal `revealRequest` Promise pattern so the
      orchestrator can `await` the user's pick.

### Onboarding

- [x] ~~**5. Oath CTA copy** — `"I commit"` → `"I Swear to the House"`.~~
      Shipped 2026-04-25.

### Jar

- [x] ~~**6. Jar art details** — add `LE JAR` label sticker + cork stopper
      to [JarVisual.tsx](src/features/jar/JarVisual.tsx).~~ Shipped
      2026-04-25.

### Rewards

- [x] ~~**7. Visible all-tiers layout** — replace the `<Tabs>` in
      [routes/Rewards.tsx](src/routes/Rewards.tsx) with a vertical stack:
      tier icon + name + reward rows + "+ Add to Tier N" dashed row.~~
      Shipped 2026-04-25.

> Item 2 — "Select Your Parlour" theme picker — is **deferred**. Want to
> finish design passes for the stub themes (kowloon, house, riding,
> imperial, ukiyoe, celestial, speakeasy) before exposing the picker.

## Vintage Pachinko design pass

The bespoke pachinko design lives at
`/tmp/design1/kakeguruimasho/project/` (canvas: `Kakegurui Masho.html`).
Sections 01 + 02 of that canvas are the punch list. Chassis (masthead +
paper grain) was applied per-route in an earlier pass; what remains is
porting the in-screen bespoke widgets and chrome.

Reference: `pachinko-screens.jsx` line numbers cited inline.

### Spin flow

- [x] ~~**Spin Wheel chrome** — parlour cabinet frame around the wheel
      (gold/lacquer nested insets, top crest with parlour name + stake
      clips), odds strip (一40 / 二30 / 三20 / 副8 / ★2), `PachinkoLever`
      (knob + track), parlour ledger row (Streak / Pot / Last Pull), and
      "House Honours All Pulls" footer rule with diamond ornaments.
      Source: `pachinko-screens.jsx:577–702`.~~ Shipped 2026-04-25.
- [x] ~~**PachinkoTierRow** — replace plain +2/+3 cash-in buttons with the
      design's tier-ladder rows (tier badge + description + ○/●/✕ unlock
      indicator). Source: `pachinko-screens.jsx:539`.~~ Shipped
      2026-04-25 — also restyled GoldInstantT3Button as a gold tier row.
- [x] ~~**PachinkoReveal extras** — radiating gold rays (24 SVG lines from
      center), confetti (paper / plum / balls — 30 elements), and a
      radial burst-of-light gradient. The chrysanthemum + 大当たり banner
      already landed. Source: `pachinko-screens.jsx:744`.~~ Shipped
      2026-04-25.
- [x] ~~**Slot-reels alt** for `PachinkoSpinWheel mode="reels"` — completely
      unbuilt; the design offers it as a per-theme runtime alternative to
      the wheel.~~ Shipped 2026-04-25 as `<SlotReelsCanvas>`. Three
      vertical reel strips with kanji-glyph symbols mapped per
      `MainWheelTier` (T1 → lantern, T2 → koi, T3 → chrysanthemum,
      BONUS → plum, JACKPOT → ★). Staggered stops at 0.55 / 0.78 / 1.0
      of `MAIN_WHEEL_SPIN_DURATION_SEC`. New
      `settings.spinStyle: 'wheel' | 'reels'` (default `'wheel'`) with
      a Settings toggle picks the visualisation; engine RNG is shared.

### Bonus

- [x] ~~**Bonus screen full re-skin** — apply pachinko chassis to
      `BonusTimerDetail.tsx`, add hourglass glyph, gold-gradient time bar,
      and 2×2 discount-ritual picker grid. Source:
      `pachinko-screens.jsx:859`.~~ Shipped 2026-04-25 — also added a
      reusable `RitualGlyph` parlour primitive (walk / dumb / hourglass /
      broom).

### Home / Habits / Jar widgets

The chassis is in place; these are bespoke widgets that go inside it.

- [x] ~~**PachinkoStreak** — lantern-flanked ribbon for current/best streak
      (replaces generic `StreakDisplay`). Source: `pachinko-screens.jsx:253`.~~
      Shipped 2026-04-25.
- [x] ~~**PachinkoTrayCard** — brass-corner tray frame for the hand summary
      with peg-ring divider and "+6 玉" catch counter. Source:
      `pachinko-screens.jsx:296`.~~ Shipped 2026-04-25 as `<HandTrayCard>`.
- [x] ~~**PachinkoSectionTitle** — kanji + label + gradient rule heading
      style across Home/Habits/Bonus. Source: `pachinko-screens.jsx:284`.~~
      Shipped 2026-04-25 as `<SectionTitle>` parlour primitive.
- [x] ~~**PachinkoRitualCard** — per-habit row with glyph + streak badge +
      gold "+" corner button, replaces generic habit list rows.
      Source: `pachinko-screens.jsx:348`.~~ Shipped 2026-04-25 as
      `<RitualCard>` (used on both Home and Habits, preserves
      `quicklog-${habit.id}` testid).
- [x] ~~**PachinkoEveningRite** — 4-tab 夜 row (湯 歯 顔 床) with done /
      pending states for the hygiene bundle. Source:
      `pachinko-screens.jsx:384`.~~ Shipped 2026-04-25 by rebuilding
      `<HygieneBundle>` itself with the 4-tab layout and renaming all
      user-visible "Hygiene bundle" copy to **"Self care bundle"** per
      user preference. Internal IDs (`habit_hygiene`,
      `pendingHygieneBundle`, `streaks.hygiene`) stay legacy to avoid
      a schema migration. One-shot boot-time rename in `main.tsx`
      brings existing persisted state forward.
- [x] ~~**PachinkoPotMini** — koi icon + tier label + progress bar with
      quarter-mark ticks for the jar snippet on Home and the full Jar
      route. Source: `pachinko-screens.jsx:432`.~~ Shipped 2026-04-25 on
      Home; Jar route still uses the full `<JarVisual>`.

## Themes

### Kowloon Electric (Triad Neon, 1985)

The eighth theme — full bespoke flow alongside Vintage Pachinko. The
Kowloon Walled City as a bootleg arcade closet on the 9th floor: tangled
wires, dripping AC condensate, hand-painted Cantonese signage, CRT
scanlines, mahjong-tile slot reels. Tone: conspiratorial, fast, pulsing
("one more credit"). Palette confirmed by user as **Triad Neon**
(magenta + cyan + acid-jade neons over ink-black) — Rain & Receipt is
archived as an alternative.

Design source: [kowloon-screens.jsx](/tmp/design-fresh/kakeguruimasho/project/kowloon-screens.jsx),
[kowloon-neon.jsx](/tmp/design-fresh/kakeguruimasho/project/kowloon-neon.jsx),
section `03 · Kowloon Electric · Full Flow` in the canvas.

#### Theme tokens

- [ ] Add `'kowloon'` to the `ThemeKey` union and a `THEMES.kowloon` entry
      in [src/styles/themes.ts](src/styles/themes.ts) with the user-facing
      copy: `spinCta: 'Drop the Coin'`, `earned: 'Banked'`,
      `hand: 'Token Tray'`, `bag: 'Cassette'`,
      `jackpot: '大獎 · Daai-Jeung'`, `nearMiss: 'One slot off'`. Tagline
      `'九龍電氣 · Triad Neon, 1985'`. `status: 'ready'` once screens land.
- [ ] Add `'mahjong'` to the `MotifSymbol` union and the corresponding
      glyph to [Motif.tsx](src/ui/parlour/Motif.tsx).
- [ ] Add `[data-theme='kowloon']` token block to
      [src/styles/themes.css](src/styles/themes.css). Palette:
      bg `#0b0a14`, felt `#1f1c33`, surface `#191628`, gold `#f5d547`
      (sodium yellow), accent magenta `#ff2e88`, cyan `#22e3ff`,
      jade `#1bd182`, purple `#c855ff`. May need a tokens schema bump
      to expose `--accent-2/3/4` since the palette is multi-neon.
- [ ] Layer in the `'electric'` tone: CRT scanline overlay app-wide on
      Kowloon, low-opacity phosphor bloom, occasional flicker on neon
      headers — turn the dopamine up without going gaudy.

#### Bespoke primitives (mirror `src/ui/parlour/`)

- [ ] CRT bezel wrapper — curved corners, phosphor bloom, scanlines, "ON
      AIR" tally light. Wraps the wheel/reels cabinet.
- [ ] Neon shop sign — vertical Cantonese + horizontal English subline,
      faux-glow tubing, mounting bracket. Used for section headers.
- [ ] Mahjong tile component — bamboo / circles / characters / dragons.
      Slot-reel symbols.
- [ ] Pixel sprite primitive (16×16) — fortune cat, cassette, koi,
      cleaver, neon arrow, padlock, joystick. 3-color max, flat.
- [ ] Wire-bundle divider — replaces brass filigree dividers.
- [ ] Mosaic floor surface — 12×12px ceramic tiles in two shades, used
      as cabinet base.
- [ ] Arcade token chip — round, embossed, slot for thumbnail. Replaces
      the casino chip on Kowloon.
- [ ] Dot-matrix receipt — ledger style for Vault on Kowloon.
- [ ] Inspection stamp / bootleg sticker — random-rotate per render for
      cheap texture.

#### Bespoke screens (mirror Pachinko coverage)

- [ ] `KowloonHome` (Hall) — neon "ON AIR" streak counter, gold-bezel
      token tray with mahjong-tile drill cards, Closing Sequence ritual
      with cyan glow, cassette-icon Tin.
- [ ] `KowloonSpinCashIn` (Drop I) — token tray + four-tier ladder
      using mahjong-tile tier badges (一/二/三/★).
- [ ] `KowloonSpinReels` (Drop II) — 3-reel mahjong slot in CRT bezel
      cabinet (East/South/West · One/Two/Three · Center/Fortune/White),
      magenta payline glow, channel-3 tally, coin-slot lever.
- [ ] `KowloonReveal` (Drop III) — spinning mahjong tile with "大",
      flickering neon 大獎 wordmark, multicolor rays, pixel confetti,
      receipt-styled reward menu.
- [ ] `KowloonBonus` — magenta digital countdown, mahjong-tile drill
      cards, bonus wheel restyled in triad colors.
- [ ] `KowloonCover` (optional) — landing/cover artwork: vertical
      Cantonese sign, English wordmark, tangled wires, mosaic floor,
      corner inspection stamps.

#### Wiring

- [ ] Theme-gated branch in routes — same pattern as `'pachinko'`. Any
      route that has both a generic and a Pachinko bespoke version
      should also route to Kowloon when `theme === 'kowloon'`.
- [ ] Update Settings copy "Vintage Pachinko" → multi-theme picker once
      Kowloon is `status: 'ready'` (the deferred item 2 from the
      2026-04-25 audit).

## Desktop adaptation (added 2026-04-26)

Shipped 2026-04-26 in PR for the desktop chassis. Source design:
[desktop-wires.jsx](/tmp/design-fresh/kakeguruimasho/project/desktop-wires.jsx).
Spec: [docs/superpowers/specs/2026-04-26-desktop-adaptation-design.md](docs/superpowers/specs/2026-04-26-desktop-adaptation-design.md).
Plan: [docs/superpowers/plans/2026-04-26-desktop-adaptation.md](docs/superpowers/plans/2026-04-26-desktop-adaptation.md).

#### Chassis

- [x] ~~**Three-pane shell** at `≥1024px`.~~ Shipped 2026-04-26 as
      `<DesktopShell>` (`src/ui/parlour/DesktopShell.tsx`). Grid columns
      `280px 1fr 320px`; capped to 1280 max-width at `≥1440px`.
- [x] ~~**Rail nav.**~~ Shipped 2026-04-26 as `<LeftRail>`. Both
      `BottomNav` and `LeftRail` consume `src/lib/navItems.ts`.
- [x] ~~**Right-rail widgets.**~~ Shipped 2026-04-26: Bonus widget
      (`<RailBonusWidget>`), Pot (`<PachinkoPotMini>`), Recent Pulls
      (`<RecentPulls>`). Shared selector `useBonusTimerSummary`.
      `BonusTimerBanner` only mounts at `<1024px`.
- [x] ~~**Salon framing** — content max-width 1280 at `≥1440px`.~~
      Shipped 2026-04-26.
- [x] ~~**Tablet (480–1024px) two-pane.**~~ Shipped 2026-04-26 in the
      polish batch — at 768–1023px the chassis becomes a 240/1fr grid
      with the left rail visible and the right rail hidden. Below
      768px the pure mobile shell continues unchanged.

#### Per-screen passes

- [x] ~~**Spin** — cash-in side-by-side, wheel scaled up at desktop,
      reveal 2-col picker.~~ Shipped 2026-04-26. Stake summary moved
      to the desktop right rail in the polish batch (`RailStakeAndOdds`
      reads from `SpinRailContext`).
- [x] ~~**Habits / Vault** — multi-column grids.~~ Shipped 2026-04-26
      (Home rituals 3-col; Habits 3-col; Vault 3 tier columns).
- [x] ~~**Jar / BonusTimerDetail** — split layouts.~~ Shipped
      2026-04-26.
- [x] ~~**Cash-in picker → drawer.**~~ N/A — `CashInPicker` is inline
      today, not a sheet/dialog. Drawer pattern applied to the actual
      editor-style modals: `RewardEditor`, `HabitEditor`, `StepEntry`.
- [x] ~~**Hover & focus states.**~~ Shipped 2026-04-26 under
      `@media (hover: hover) and (min-width: 1024px)`.
- [x] ~~**Cinematic Onboarding shell** — corner motifs + framed card +
      velvet swag.~~ Shipped 2026-04-26. Swag added in the polish
      batch as a pure-SVG opera-house valance with gold piping +
      tassels.

#### Constraints from the design rules card

- Tokens are universal — desktop reads from the same `THEMES.pachinko`
  object; no fork.
- Component primitives reused — `Chip`, `BrassButton`, `OrnateFrame`,
  `Halftone`, `PaperGrain`, `PachinkoWheel`, etc. all render at any
  size; pass a larger `size` prop where it makes sense.
- Vertical density unchanged — body text stays 14–16px; desktop is
  wider, not denser.
- Parlour metaphor unchanged — cabinets, ledgers, kanji crests, peg
  rings, lacquer panels stay. Desktop is "the salon floor"; mobile is
  "a private booth".
- Breakpoints: phone ≤480 · tablet 480–1024 · desktop 1024–1440 ·
  salon ≥1440 (content max 1280).

### Other earmarked themes (token-only stubs today)

`house`, `riding`, `imperial`, `ukiyoe`, `celestial`, `speakeasy` are
wired into the architecture with palette + copy + motif keys, but haven't
gotten the bespoke art pass that Vintage Pachinko did. Each one would
get its own pass when promoted to `status: 'ready'`.
