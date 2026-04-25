/**
 * DecoDivider — fan/chevron ornament with twin gold rules.
 *
 * Used to break vertical sections (between hand and jar, between cash-in
 * and pull, etc.). Shrinks gracefully via flexbox.
 */

import type { CSSProperties } from 'react';

export interface DecoDividerProps {
  width?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function DecoDivider({
  width = '100%',
  className,
  style,
}: DecoDividerProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width,
        opacity: 0.92,
        ...style,
      }}
      aria-hidden
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background:
            'linear-gradient(90deg, transparent, var(--color-gold-deep) 40%, var(--color-gold-deep))',
        }}
      />
      <svg width="44" height="14" viewBox="0 0 44 14" fill="none">
        <path
          d="M22 1 L32 7 L22 13 L12 7 Z"
          stroke="var(--color-gold)"
          strokeWidth="0.8"
        />
        <path d="M22 4 L28 7 L22 10 L16 7 Z" fill="var(--color-gold)" />
        <circle cx="22" cy="7" r="1" fill="var(--color-gold-deep)" />
        <path d="M0 7 L9 7 M35 7 L44 7" stroke="var(--color-gold)" strokeWidth="0.8" />
      </svg>
      <div
        style={{
          flex: 1,
          height: 1,
          background:
            'linear-gradient(90deg, var(--color-gold-deep), var(--color-gold-deep) 60%, transparent)',
        }}
      />
    </div>
  );
}
