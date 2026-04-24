# Design Brief — kakeguruimasho visual redesign

A prompt you can hand to **Claude Design** (or any visual-design-oriented
agent / designer) to get a UX pass plus custom assets for the three
signature visuals: the **wheel spinner**, the **jar**, and the
**paperclip**. The owner will provide any final PNG art via Procreate
on iPad; this brief scopes what's needed and how it plugs into the code.

---

## Prompt (copy this into Claude Design)

> You're designing for **kakeguruimasho**, a slot-machine-themed habit
> tracker PWA. It's the SpoonFedStudy "Slot Machine Habit System"
> methodology made concrete: complete a habit → draw a paperclip from a
> bag → cash matching clips in for a tier unlock → spin a reward wheel
> → celebrate a dopamine hit. The jar visibly fills toward 2–N long-term
> milestones the user sets for themselves ("Hawaii upgrade", "woodworking
> class", etc.).
>
> **Audience.** A single senior-engineer owner using it 4–8× per day
> from an iPhone (mobile-first is mandatory; desktop is secondary). The
> whole point is that the app is fun enough to open on reflex. Treat
> dopamine as a first-class design requirement.
>
> **Tone.** Slot-machine / casino but **stylish**, not tacky. Think
> Cassette-era Vegas typography over a modern dark canvas. Warm red
> accent, gold only for gold-clip and Moonshot moments. Never flashy
> just to be flashy — every motion should land on a specific event
> (clip earned, tier unlocked, jackpot, milestone crossed).
>
> **What you're producing.**
>
> 1. **UX pass** of the five primary screens: Home, Habits, Spin, Jar,
>    Settings. Focus on mobile (375 × 812 pt reference). Deliver
>    low/medium-fi mockups or Figma-style frames.
> 2. **Three signature visuals** redesigned and handed off as PNG asset
>    specs (see "Asset handoff" below). The owner will draw the final
>    PNGs in Procreate — you give direction, reference boards, and
>    exact exportable sizes.
>    - **The wheel** (main + bonus). Currently SVG-on-canvas with
>      Framer Motion rotation. Five segments for the main wheel (T1 /
>      T2 / T3 / BONUS / JACKPOT). Five segments for the bonus wheel
>      (75% / 50% / 25% / FREE / EXTRA). Needs a pointer/indicator, a
>      center hub/pivot, segment labels legible at 280 px diameter,
>      and a distinct win-state treatment for gold/JACKPOT.
>    - **The jar.** Currently a glass-jar SVG that fills with a liquid
>      animation as the user earns clips. Tick marks mark each
>      milestone (Mini, Mid, Moonshot, plus any user-added
>      intermediate checkpoints — ordered by dollar target). Needs to
>      feel like a satisfying "fill" container with real depth; the
>      Moonshot tick should have a distinct gold treatment.
>    - **The paperclip.** Six colors (red, blue, green, yellow,
>      purple, pink) plus one gold variant. Needs to read as a paperclip
>      at 24–48 px (in a "hand" grid), scale up cleanly to a 120 px
>      celebration moment when earned, and stay visually distinct by
>      color at small sizes.
>
> **Constraints.**
>
> - **Mobile first.** All critical affordances must land within
>   thumb-reach on a 6.1" iPhone in portrait. Minimum tap target 44 × 44
>   pt per SPEC §4. Assume the user is one-handed.
> - **Dark theme only** for v1. Tokens live in
>   `src/styles/tokens.css` — reuse existing variables where you can
>   rather than introducing new palette primitives.
>   - `--color-bg: #0a0a0b` (canvas)
>   - `--color-surface / -2 / -3: #141417 / #1d1d22 / #26262c`
>   - `--color-accent: #e53935` (warm red; never use for gold)
>   - `--color-gold: #ffd700` (reserved for gold-clip + Moonshot)
>   - Clip colors: red, blue, green, yellow, purple, pink. Current CSS
>     values are in `jar.css` / `clip.*.css` — pull them if you tune,
>     don't invent new ones without a justification.
> - **Motion stays subtle on idle screens.** Framer Motion is in the
>   bundle and fine to use; CSS transitions are preferred for
>   micro-interactions. Never loop an animation that isn't tied to a
>   live state (no idle wheel rotation, no forever-pulsing buttons).
> - **PWA / offline.** The app has to work with zero network after
>   first load. No external font fetches, no CDN image calls.
>   Everything ships with the bundle.
> - **Accessibility.** WCAG 2.1 AA contrast. `prefers-reduced-motion`
>   must dampen spin/fill/celebration animations to a plain state
>   change. All icon-only controls need aria-labels.
> - **Bundle budget.** Each net-new asset counts against the 250 KB
>   gzip budget in SPEC §4. Prefer SVG unless the art genuinely needs
>   raster; if raster, ≤ 60 KB per image.
>
> **What you're NOT designing.**
>
> - The core mechanics (probabilities, cash-in gating, bonus timer
>   rules). Those are frozen — see `SPEC.md` §5 and `DECISIONS.md`.
> - The copy/voice for help screens or toasts (already locked in
>   `src/features/rewards/reward-rules-copy.ts` and the onboarding
>   flow).
> - A light theme. Dark only.
>
> **Reference material.**
>
> Before sketching, read:
> - `SPEC.md` — the product brief. §2 (owner), §5 (mechanics), §12
>   (design tokens).
> - `USER_GUIDE.md` — how the owner talks about the app in plain
>   language.
> - `reference-methodology.txt` — the PDF source material. Copies the
>   tone the whole thing is built on.
> - Existing visual code to understand what you're replacing:
>   - `src/features/wheel/WheelCanvas.tsx` — main wheel SVG + Framer
>     motion spin.
>   - `src/features/wheel/BonusWheelCanvas.tsx` — bonus wheel
>     (same skeleton, different segments).
>   - `src/features/jar/JarVisual.tsx` — jar SVG viewBox math.
>   - `src/features/jar/JarFillMotion.tsx` — the liquid-fill
>     animation (lazy-loaded chunk).
>   - `src/features/rewards/RewardPickerModal.tsx` — the post-spin
>     pick flow; your win states need to hand off here.
>
> **Deliverables, in order of priority.**
>
> 1. **Mood board / reference board.** 6–12 images that anchor the
>    visual direction. Show it to the owner before you commit to any
>    more detailed work.
> 2. **Three signature visuals (concept → handoff).**
>    - Sketch 2–3 variants each; pick one with the owner.
>    - For the picked variant, produce an asset spec: target size(s),
>      export format (SVG preferred, PNG if raster), color tokens
>      referenced, any motion notes.
>    - If PNG: the owner will do the actual art pass in Procreate. Give
>      them a canvas size, a palette, and a ref image. Expect to receive
>      1× and 2× exports.
> 3. **Screen mockups** for the five primary screens at 375 × 812 pt.
>    Show:
>    - Home (quick-log grid + jar snippet + recent activity)
>    - Habits (habit list + step-entry)
>    - Spin (hand view + cash-in matrix + wheel)
>    - Jar (JarVisual + milestone editor + streaks)
>    - Settings (rewards link card + wheel/bag editors + help +
>      export/import)
> 4. **Win-state moments.** Three "wow" moments you spec visually and
>    motion-wise:
>    - Gold-clip draw ("instant T3, gold only").
>    - Jackpot spin (2% probability — go bigger than T3).
>    - Moonshot milestone claim (the one that resets the jar).
> 5. **Reduced-motion counterparts.** For every animated moment,
>    a version that respects `prefers-reduced-motion: reduce` and still
>    feels complete.
>
> **Asset handoff.**
>
> Final visual assets land in `public/` (PNGs) or inlined as SVG in the
> relevant component. Expected file layout:
>
> ```
> public/
>   art/
>     wheel/
>       main.svg               or main@1x.png, main@2x.png
>       bonus.svg
>       pointer.svg
>       center.svg
>     jar/
>       glass.svg
>       fill-mask.svg
>       tick-standard.svg
>       tick-moonshot.svg
>     clips/
>       red.svg / blue.svg / green.svg / yellow.svg / purple.svg / pink.svg
>       gold.svg (with a distinct silhouette if possible, not just gold tint)
> ```
>
> Name the PNG variants `@1x.png` and `@2x.png`. Keep the raw Procreate
> working files out of the repo — export only the final PNGs.
>
> **Out of scope for this pass.**
>
> - App icon redesign (current icons live in `public/icons/`).
> - Splash screens.
> - Marketing page / README imagery.
>
> **Questions to come back with before sketching.**
>
> 1. Is there a specific casino era / visual reference the owner wants
>    (classic Vegas, 80s Atlantic City, modern Tokyo pachinko)?
> 2. Should the wheel be perfectly circular or can it take an
>    asymmetrical hub (e.g., a slot-machine arm on the side)?
> 3. For the jar — clear glass or colored glass? Single vessel or is
>    there room for a small jackpot-side visual next to it?
> 4. Should the paperclips read as literal office paperclips, or can
>    they be stylized tokens that happen to be paperclip-shaped?
>
> Once you've got answers, start with the mood board.

---

## Notes for the owner (you)

- The prompt above is self-contained. You can paste it into a fresh
  Claude Design conversation, or send it to a human designer.
- If Claude Design asks for existing screenshots, the placeholder paths
  are in `README.md` — they're `docs/screenshots/*.png` and haven't
  been captured yet. You can run `npm run dev`, open each of the five
  screens on an iPhone-sized viewport, and save PNGs into
  `docs/screenshots/` before handing the brief off, which will make the
  UX pass much more concrete.
- The three "questions to come back with" are deliberate — don't let
  the design agent sketch before you pick a casino era and answer the
  shape/vessel/token questions. Otherwise you'll get generic slot-
  machine stock art.
- When Procreate-exported PNGs are ready, drop them under `public/art/`
  per the file layout above; I'll wire them into the components. Or
  say the word and I'll stub out the component-level swaps first so
  you can drop PNGs into exact slot paths.
