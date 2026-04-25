/**
 * RitualGlyph — line-art icon for habit categories.
 *
 * Source: `screens-home.jsx:336` (RitualGlyph). Stroked-only line art keeps
 * the visual vocabulary consistent with parlour decorative line work.
 *
 * Color defaults to the active theme's `--color-gold`; pass a CSS variable
 * or hex to override (e.g. ink-muted for unselected ritual rows).
 */

import type { CSSProperties, ReactElement } from 'react';

export type RitualGlyphKind = 'walk' | 'dumb' | 'hourglass' | 'broom';

export interface RitualGlyphProps {
  kind: RitualGlyphKind;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function RitualGlyph({
  kind,
  size = 22,
  color = 'var(--color-gold)',
  className,
  style,
}: RitualGlyphProps): ReactElement {
  const sharedProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'walk':
      return (
        <svg {...sharedProps}>
          <circle cx="13" cy="4" r="2" />
          <path d="M9 22 L11 14 L7 10 L11 6 L15 10 L18 14 M11 14 L15 18 L12 22" />
        </svg>
      );
    case 'dumb':
      return (
        <svg {...sharedProps}>
          <rect x="2" y="9" width="3" height="6" rx="1" />
          <rect x="19" y="9" width="3" height="6" rx="1" />
          <rect x="5" y="10" width="2" height="4" />
          <rect x="17" y="10" width="2" height="4" />
          <path d="M7 12 H17" />
        </svg>
      );
    case 'hourglass':
      return (
        <svg {...sharedProps}>
          <path d="M7 3 H17 M7 21 H17 M7 3 Q7 11 12 12 Q17 11 17 3 M7 21 Q7 13 12 12 Q17 13 17 21" />
        </svg>
      );
    case 'broom':
      return (
        <svg {...sharedProps}>
          <path d="M14 3 L21 10" />
          <path d="M10 7 L17 14 L11 20 Q5 22 3 18 L10 7 Z" />
          <path d="M7 13 L10 16 M9 11 L12 14" />
        </svg>
      );
  }
}
