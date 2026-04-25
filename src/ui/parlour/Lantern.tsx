/**
 * Lantern — paper lantern (chōchin) glyph.
 * Source: `pachinko.jsx:116`. Used as a streak-ribbon ornament.
 */

import type { CSSProperties } from 'react';

export interface LanternProps {
  size?: number;
  color?: string;
  accent?: string;
  style?: CSSProperties;
}

export function Lantern({
  size = 32,
  color = 'var(--clip-red)',
  accent = 'var(--color-gold)',
  style,
}: LanternProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={style} aria-hidden>
      <path d="M30 2 V8" stroke={accent} strokeWidth="0.6" />
      <rect x="22" y="8" width="16" height="3" fill={accent} />
      <rect x="20" y="11" width="20" height="2" fill={accent} />
      <ellipse cx="30" cy="30" rx="18" ry="18" fill={color} stroke={accent} strokeWidth="0.8" />
      <ellipse cx="30" cy="30" rx="18" ry="6" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.6" />
      <ellipse cx="30" cy="30" rx="18" ry="13" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.4" />
      <g stroke={accent} strokeWidth="1.6" fill="none">
        <path d="M24 26 H36" />
        <path d="M30 22 V36" />
        <path d="M26 32 L30 28 L34 32" />
      </g>
      <rect x="20" y="48" width="20" height="2" fill={accent} />
      <rect x="22" y="50" width="16" height="3" fill={accent} />
      <path d="M30 53 V58" stroke={accent} strokeWidth="0.6" />
      <path d="M27 58 H33" stroke={accent} strokeWidth="0.6" />
    </svg>
  );
}
