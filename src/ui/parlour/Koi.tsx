/**
 * Koi — stylised carp glyph.
 * Source: `pachinko.jsx:95`. Used as the jar-snippet icon.
 */

import type { CSSProperties } from 'react';

export interface KoiProps {
  size?: number;
  color?: string;
  accent?: string;
  style?: CSSProperties;
}

export function Koi({
  size = 42,
  color = 'var(--clip-red)',
  accent = 'var(--color-gold)',
  style,
}: KoiProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={style} aria-hidden>
      <path
        d="M10 30 Q15 18 30 18 Q45 18 50 30 Q45 42 30 42 Q15 42 10 30 Z"
        fill={color}
        stroke={accent}
        strokeWidth="0.6"
      />
      <path d="M10 30 L2 22 L4 30 L2 38 Z" fill={color} stroke={accent} strokeWidth="0.5" />
      <path d="M28 18 Q30 12 34 14 Q34 18 30 18 Z" fill={accent} opacity="0.7" />
      <path d="M28 42 Q30 48 34 46 Q34 42 30 42 Z" fill={accent} opacity="0.7" />
      <circle cx="44" cy="28" r="2" fill="#fff" />
      <circle cx="44" cy="28" r="1" fill="#000" />
      <path
        d="M22 25 Q26 22 30 25 M30 25 Q34 22 38 25 M22 30 Q26 27 30 30 M30 30 Q34 27 38 30 M22 35 Q26 32 30 35 M30 35 Q34 32 38 35"
        fill="none"
        stroke={accent}
        strokeWidth="0.4"
        opacity="0.6"
      />
    </svg>
  );
}
