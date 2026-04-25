# Backlog

Future work earmarked but not yet built. Add new items at the top of the
relevant section.

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
- [ ] **PachinkoReveal extras** — radiating gold rays (24 SVG lines from
      center), confetti (paper / plum / balls — 30 elements), and a
      radial burst-of-light gradient. The chrysanthemum + 大当たり banner
      already landed. Source: `pachinko-screens.jsx:744`.
- [ ] **Slot-reels alt** for `PachinkoSpinWheel mode="reels"` — completely
      unbuilt; the design offers it as a per-theme runtime alternative to
      the wheel.

### Bonus

- [ ] **Bonus screen full re-skin** — apply pachinko chassis to
      `BonusTimerDetail.tsx`, add hourglass glyph, gold-gradient time bar,
      and 2×2 discount-ritual picker grid. Source:
      `pachinko-screens.jsx:859`.

### Home / Habits / Jar widgets

The chassis is in place; these are bespoke widgets that go inside it.

- [ ] **PachinkoStreak** — lantern-flanked ribbon for current/best streak
      (replaces generic `StreakDisplay`). Source: `pachinko-screens.jsx:253`.
- [ ] **PachinkoTrayCard** — brass-corner tray frame for the hand summary
      with peg-ring divider and "+6 玉" catch counter. Source:
      `pachinko-screens.jsx:296`.
- [ ] **PachinkoSectionTitle** — kanji + label + gradient rule heading
      style across Home/Habits/Bonus. Source: `pachinko-screens.jsx:284`.
- [ ] **PachinkoRitualCard** — per-habit row with glyph + streak badge +
      gold "+" corner button, replaces generic habit list rows.
      Source: `pachinko-screens.jsx:348`.
- [ ] **PachinkoEveningRite** — 4-tab 夜 row (湯 歯 顔 床) with done /
      pending states for the hygiene bundle. Source:
      `pachinko-screens.jsx:384`.
- [ ] **PachinkoPotMini** — koi icon + tier label + progress bar with
      quarter-mark ticks for the jar snippet on Home and the full Jar
      route. Source: `pachinko-screens.jsx:432`.

## Themes

### Kowloon Walled City / Bladerunner (cyber-grunge)

A future seventh theme — opposite vibe from Vintage Pachinko. Toxic teal,
neon magenta, smoke-grey, rust; rain-streaked windows; flickering CRT.

- [ ] Add `'kowloon'` to the `ThemeKey` union and a `THEMES.kowloon` entry
      in [src/styles/themes.ts](src/styles/themes.ts) — name, tagline,
      copy strings (e.g. `spinCta: 'Pull the Cord'`), motif key, status.
- [ ] Add a `[data-theme='kowloon']` block to
      [src/styles/themes.css](src/styles/themes.css) with the cyber-grunge
      palette: toxic teal (`#1be0c8`), neon magenta (`#ff2a8d`),
      smoke-grey surface, rust accents. Override `--font-display` toward
      something more industrial (e.g. JetBrains Mono Display, or a
      condensed grotesk).
- [ ] Optional: Add a `'kowloon'` motif glyph to
      [src/ui/parlour/Motif.tsx](src/ui/parlour/Motif.tsx) — a stylized
      rain-streaked window, neon noodle-bowl, or stacked-tenement
      silhouette. Add it to the `MotifSymbol` union in `themes.ts`.

### Other earmarked themes (token-only stubs today)

`house`, `riding`, `imperial`, `ukiyoe`, `celestial`, `speakeasy` are
wired into the architecture with palette + copy + motif keys, but haven't
gotten the bespoke art pass that Vintage Pachinko did. Each one would
get its own pass when promoted to `status: 'ready'`.
