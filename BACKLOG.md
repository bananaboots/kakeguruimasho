# Backlog

Future work earmarked but not yet built. Add new items at the top of the
relevant section.

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
