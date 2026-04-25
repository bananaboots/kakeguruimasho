# Backlog

Future work earmarked but not yet built. Add new items at the top of the
relevant section.

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
