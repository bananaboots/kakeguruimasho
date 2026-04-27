/**
 * ArcadeToken — knurled SVG token with denomination label.
 *
 * Source design: `kowloon-neon.jsx:247` (ArcadeTokenA). Kowloon's
 * equivalent of the Pachinko `<Chip>`. Renders a circular token with
 * radial highlight, knurled rim ticks, and a denomination glyph.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface ArcadeTokenProps {
  /** Token color (hex). */
  color: string;
  /** Denomination label (single character recommended: I / II / III / B / ★). */
  denom: string;
  /** Token diameter in px. Defaults to 56. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function ArcadeToken({
  color,
  denom,
  size = 56,
  className,
  style,
}: ArcadeTokenProps): ReactElement {
  const id = `tok-${color.replace('#', '')}-${size}`;
  const tickCount = 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`kowloon-arcade-token ${className ?? ''}`}
      style={{
        filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 6px ${color}66)`,
        ...style,
      }}
      data-testid="arcade-token"
      aria-hidden
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="40%" stopColor={color} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="#06050a" />
      <circle cx="50" cy="50" r="47" fill={color} opacity="0.92" />
      {Array.from({ length: tickCount }).map((_, i) => {
        const a = (i / tickCount) * Math.PI * 2;
        const r1 = 46;
        const r2 = 42;
        const x1 = 50 + Math.cos(a) * r1;
        const y1 = 50 + Math.sin(a) * r1;
        const x2 = 50 + Math.cos(a) * r2;
        const y2 = 50 + Math.sin(a) * r2;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#000"
            strokeWidth="1.5"
            opacity="0.5"
          />
        );
      })}
      <circle cx="50" cy="50" r="36" fill="none" stroke="#000" strokeWidth="1" opacity="0.6" />
      <circle cx="50" cy="50" r="34" fill={`url(#${id})`} opacity="0.5" />
      <text
        x="50"
        y="53"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-pixel, VT323, monospace)"
        fontSize="36"
        fill="#06050a"
        fontWeight="700"
        style={{ letterSpacing: '0.05em' }}
      >
        {denom}
      </text>
      <rect x="42" y="4" width="16" height="3" fill="#06050a" />
    </svg>
  );
}
