# WAVE1_3J_ICONS_TODO

ImageMagick is not available on this machine (`convert` / `magick` both
missing), so the PWA icons were not generated in Wave 1.

## What's needed (Phase 6 deployment)

Four PNGs in `public/icons/`:

| File | Size | Purpose |
|---|---|---|
| `icon-192.png` | 192×192 | Standard manifest icon |
| `icon-512.png` | 512×512 | Standard manifest icon (Lighthouse needs ≥512) |
| `maskable-192.png` | 192×192 | Maskable (with safe-zone padding) |
| `maskable-512.png` | 512×512 | Maskable (with safe-zone padding) |

`public/favicon.svg` already exists — leave it alone.

## Design brief

Per SPEC §12:
- Background: solid `#E53935`
- Foreground: white paperclip glyph (or white "K" monogram as fallback)
- Maskable variants: add ≥ 20% safe-zone padding around the glyph

The `vite.config.ts` manifest already references these paths — once the PNGs
exist in `public/icons/`, the PWA build picks them up automatically.

## How to generate (one-liner once ImageMagick is available)

```bash
mkdir -p public/icons
# simple red square + paperclip emoji — iteration 1, replace with real art later
for size in 192 512; do
  convert -size ${size}x${size} xc:'#E53935' \
    -font '/System/Library/Fonts/Apple Color Emoji.ttc' \
    -pointsize $((size / 2)) -gravity center \
    -annotate +0+0 '📎' public/icons/icon-${size}.png
  # maskable: pad by 20%
  inner=$((size * 6 / 10))
  convert -size ${size}x${size} xc:'#E53935' \
    -font '/System/Library/Fonts/Apple Color Emoji.ttc' \
    -pointsize ${inner} -gravity center \
    -annotate +0+0 '📎' public/icons/maskable-${size}.png
done
```

(Emoji-font rendering via ImageMagick varies by platform — real production
art should come from a vector source through `pwa-asset-generator` per
ARCHITECTURE §9.2.)
