/**
 * Stamp — rotated inspection-stamp badge.
 *
 * Source design: `kowloon-neon.jsx:181` (StampA). Bordered tag with
 * kanji + English label, rotated by a few degrees. Used as corner
 * decorations on covers and section frames.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface StampProps {
  /** Cantonese / Japanese character (e.g. "檢", "廠"). */
  ch: string;
  /** English label (uppercase tracked). */
  en: string;
  /** Stamp ink color. */
  color: string;
  /** Rotation in degrees. Defaults to -8. */
  rotate?: number;
  className?: string;
  style?: CSSProperties;
}

export function Stamp({
  ch,
  en,
  color,
  rotate = -8,
  className,
  style,
}: StampProps): ReactElement {
  return (
    <div
      className={`kowloon-stamp ${className ?? ''}`}
      style={{
        border: `1.5px solid ${color}`,
        transform: `rotate(${rotate}deg)`,
        color,
        textShadow: `0 0 8px ${color}66`,
        ...style,
      }}
      data-testid="stamp"
    >
      <span className="kowloon-stamp__ch">{ch}</span>
      <span className="kowloon-stamp__en">{en}</span>
    </div>
  );
}
