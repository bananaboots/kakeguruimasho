/**
 * NeonSign — vertical Cantonese character + horizontal English label.
 *
 * Source design: `kowloon-neon.jsx:94` (NeonSignA). Used as section
 * headers and Kowloon mastheads. Glow is driven by the provided color
 * via layered text-shadow.
 */

import type { CSSProperties, ReactElement } from 'react';

export interface NeonSignProps {
  /** Cantonese / Japanese character displayed vertically. */
  ch: string;
  /** Horizontal English/romaji label (uppercase tracked). */
  en: string;
  /** Optional sub-label in mono. */
  sub?: string;
  /** Glow color (hex). Defaults to magenta. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function NeonSign({
  ch,
  en,
  sub,
  color = '#ff2e88',
  className,
  style,
}: NeonSignProps): ReactElement {
  return (
    <div
      className={`kowloon-neon-sign ${className ?? ''}`}
      style={style}
      data-testid="neon-sign"
    >
      <div className="kowloon-neon-sign__bracket" aria-hidden />
      <div
        className="kowloon-neon-sign__ch"
        data-testid="neon-sign-ch"
        style={{
          color,
          textShadow: `0 0 6px ${color}, 0 0 16px ${color}aa, 0 0 30px ${color}66`,
        }}
      >
        {ch}
      </div>
      <div className="kowloon-neon-sign__body">
        <div
          className="kowloon-neon-sign__en"
          style={{
            color,
            textShadow: `0 0 8px ${color}, 0 0 22px ${color}99`,
          }}
        >
          {en}
        </div>
        {sub && <div className="kowloon-neon-sign__sub">{sub}</div>}
      </div>
    </div>
  );
}
