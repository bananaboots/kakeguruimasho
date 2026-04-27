/**
 * MosaicFloor — tiled-floor background strip.
 *
 * Source design: `kowloon-neon.jsx:328` (MosaicFloorA). 12px-square
 * checkerboard via repeating-conic-gradient, with a downward fade.
 * Used as the bottom strip of the Kowloon shell + cabinet bases.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface MosaicFloorProps {
  width?: number | string;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

export function MosaicFloor({
  width = 140,
  height = 60,
  className,
  style,
}: MosaicFloorProps): ReactElement {
  return (
    <div
      className={`kowloon-mosaic-floor ${className ?? ''}`}
      style={{
        width,
        height,
        backgroundImage:
          'repeating-conic-gradient(var(--color-felt) 0deg 90deg, var(--color-felt-deep) 90deg 180deg)',
        backgroundSize: '12px 12px',
        border: '1px solid var(--color-border)',
        position: 'relative',
        ...style,
      }}
      data-testid="mosaic-floor"
      aria-hidden
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4))',
        }}
      />
    </div>
  );
}
