/**
 * Scanlines — page or container-level CRT scanline overlay.
 *
 * For a global page-level overlay, prefer the CSS rule on `body::after`
 * applied via `[data-theme='kowloon']` (see themes.css). This component
 * is for embedded use: scanlines local to a card or section.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface ScanlinesProps {
  /** Stripe opacity. Defaults to 0.04. */
  opacity?: number;
  /** Vertical gap between stripes (px). Defaults to 3. */
  gap?: number;
  className?: string;
  style?: CSSProperties;
}

export function Scanlines({
  opacity = 0.04,
  gap = 3,
  className,
  style,
}: ScanlinesProps): ReactElement {
  return (
    <div
      className={`kowloon-scanlines ${className ?? ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
        backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,${opacity}) 0 1px, transparent 1px ${gap}px)`,
        ...style,
      }}
      data-testid="scanlines-overlay"
      aria-hidden
    />
  );
}
