/**
 * PixelSprite — 16×16 sprite renderer.
 *
 * Source design: `kowloon-rain.jsx:36` (PixelSprite). Takes an array
 * of 16 strings (one per row), each 16 chars wide. '.' = empty,
 * digits 0–F index into the `colors` array.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface PixelSpriteProps {
  /** 16 strings, each 16 chars long. */
  rows: readonly string[];
  /** Color palette indexed by hex digit (0–F). Index 0 is empty. */
  colors: readonly string[];
  /** Pixel scale multiplier. Defaults to 2 (32×32 visual). */
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export function PixelSprite({
  rows,
  colors,
  scale = 2,
  className,
  style,
}: PixelSpriteProps): ReactElement {
  const size = 16;
  const w = size * scale;
  return (
    <svg
      width={w}
      height={w}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`kowloon-pixel-sprite ${className ?? ''}`}
      style={style}
      aria-hidden
    >
      {rows.map((row, y) =>
        Array.from(row).map((c, x) => {
          if (c === '.' || c === ' ') return null;
          const fill = colors[parseInt(c, 16)] ?? colors[0];
          if (!fill) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={fill}
            />
          );
        }),
      )}
    </svg>
  );
}
