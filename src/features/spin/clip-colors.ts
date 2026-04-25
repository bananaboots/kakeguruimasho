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
