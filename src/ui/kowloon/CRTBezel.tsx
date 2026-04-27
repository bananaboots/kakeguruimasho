/**
 * CRTBezel — phosphor-frame wrapper with scanlines + curvature vignette.
 *
 * Source design: `kowloon-neon.jsx:133` (CRTBezelA). Wraps any content
 * inside a CRT-style frame: outer plastic shell, inner cavity with
 * radial phosphor glow, scanline overlay, vignette, and a
 * channel-label tally in the top-right corner.
 */

import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../utils.ts';
import './kowloon.css';

export interface CRTBezelProps {
  children: ReactNode;
  /** Channel label (e.g. "CH 03 · LIVE"). */
  label?: string;
  /** Show the tally LED (signals an active broadcast). */
  tally?: boolean;
  /** Width override; defaults to 100% of parent. */
  width?: number | string;
  /** Height override. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function CRTBezel({
  children,
  label,
  tally = false,
  width,
  height,
  className,
  style,
}: CRTBezelProps) {
  return (
    <div
      className={cn('kowloon-crt-bezel', className)}
      style={{ width, height, ...style }}
      data-testid="crt-bezel"
    >
      <div className="kowloon-crt-bezel__cavity">
        <div className="kowloon-crt-bezel__screen">
          {children}
          <div className="kowloon-crt-bezel__scanlines" aria-hidden />
          <div className="kowloon-crt-bezel__vignette" aria-hidden />
        </div>
      </div>
      {label && (
        <div className="kowloon-crt-bezel__label-row">
          {tally && (
            <span
              className="kowloon-crt-bezel__tally"
              data-testid="crt-tally"
              aria-hidden
            />
          )}
          <span className="kowloon-crt-bezel__label">{label}</span>
        </div>
      )}
    </div>
  );
}
