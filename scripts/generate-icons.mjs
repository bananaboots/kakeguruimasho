#!/usr/bin/env node
/**
 * Generate PWA placeholder icons for Kakegurui Masho.
 *
 * Palette (SPEC §12):
 *   - Background: deep red  #E53935
 *   - Accent:     gold      #FFD700
 *   - Monogram:   white "K" centered
 *
 * Outputs (public/icons):
 *   icon-192.png, icon-512.png
 *   maskable-192.png, maskable-512.png (20% safe-zone inset)
 *   apple-touch-icon.png (180x180, lives at public/apple-touch-icon.png)
 *
 * These are placeholder icons; replace with a real vector asset later.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const iconsDir = resolve(projectRoot, 'public', 'icons');
const publicDir = resolve(projectRoot, 'public');

const RED = '#E53935';
const GOLD = '#FFD700';

/**
 * Build an SVG for a given canvas size.
 * @param {number} size canvas edge in px
 * @param {number} inset fraction of the canvas to leave as margin (0..0.5)
 */
function svgFor(size, inset = 0) {
  const margin = Math.round(size * inset);
  const innerSize = size - margin * 2;
  // Gold ring stroke width scales with inner size.
  const ringStroke = Math.max(2, Math.round(innerSize * 0.04));
  const ringRadius = Math.round(innerSize / 2 - ringStroke);
  const cx = size / 2;
  const cy = size / 2;
  // "K" monogram sized to fill most of the inner area.
  const fontSize = Math.round(innerSize * 0.62);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${RED}"/>
  <circle cx="${cx}" cy="${cy}" r="${ringRadius}" fill="none" stroke="${GOLD}" stroke-width="${ringStroke}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="${fontSize}" fill="#FFFFFF">K</text>
</svg>`;
}

async function renderPng(outPath, size, inset) {
  const svg = Buffer.from(svgFor(size, inset));
  await sharp(svg).png().toFile(outPath);
  console.log(`  wrote ${outPath}`);
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  console.log('Generating PWA icons...');

  await renderPng(resolve(iconsDir, 'icon-192.png'), 192, 0);
  await renderPng(resolve(iconsDir, 'icon-512.png'), 512, 0);
  // Maskable: add ~20% safe-zone padding
  await renderPng(resolve(iconsDir, 'maskable-192.png'), 192, 0.2);
  await renderPng(resolve(iconsDir, 'maskable-512.png'), 512, 0.2);
  // Apple touch icon (180x180), conventionally lives at /apple-touch-icon.png
  await renderPng(resolve(publicDir, 'apple-touch-icon.png'), 180, 0);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
