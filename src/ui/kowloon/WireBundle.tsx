/**
 * WireBundle — inline cable-bundle SVG divider.
 *
 * Source design: `kowloon-neon.jsx:200` (WireBundleA). Four sine-wave
 * paths in saturated triad colors with three zip-tie clamps along the
 * length. Used as section dividers and across the top of cabinets.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface WireBundleProps {
  /** Total width in px. Defaults to 280. */
  width?: number;
  /** Total height in px. Defaults to 22. */
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const COLORS = ['#ff2e88', '#22e3ff', '#1bd182', '#f5d547'] as const;
const SAMPLE_COUNT = 30;

export function WireBundle({
  width = 280,
  height = 22,
  className,
  style,
}: WireBundleProps): ReactElement {
  const cy = height / 2;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`kowloon-wire-bundle ${className ?? ''}`}
      style={{ display: 'block', ...style }}
      aria-hidden
    >
      {COLORS.map((color, i) => {
        const phase = i * 0.7;
        const amp = 3 + i * 0.5;
        const segments = Array.from({ length: SAMPLE_COUNT }, (_, n) => {
          const x = (n / (SAMPLE_COUNT - 1)) * width;
          const y = cy + Math.sin(n * 0.4 + phase) * amp;
          return `${n === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(' ');
        return (
          <path
            key={color}
            d={segments}
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            opacity="0.85"
            strokeLinecap="round"
          />
        );
      })}
      {[0.18, 0.52, 0.84].map((p) => (
        <g key={p}>
          <rect
            x={width * p - 4}
            y={cy - 5}
            width="8"
            height="10"
            fill="#1a1a1a"
            stroke="rgba(245,213,71,0.45)"
            strokeWidth="0.5"
          />
          <rect
            x={width * p - 5}
            y={cy - 3}
            width="10"
            height="2"
            fill="#5a5340"
            opacity="0.4"
          />
        </g>
      ))}
    </svg>
  );
}
