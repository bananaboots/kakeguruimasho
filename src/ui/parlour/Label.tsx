/**
 * Label — uppercase tracked monospace label.
 *
 * The mono in Vintage Pachinko is VT323, which renders ~25% smaller per em
 * than Inter/JetBrains Mono. The label multiplies the base size by the
 * theme's `--mono-scale` so tiny labels stay legible.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface LabelProps {
  children: ReactNode;
  /** Logical px size — multiplied by `--mono-scale` at render time. */
  size?: number;
  color?: string;
  letter?: number;
  className?: string;
  style?: CSSProperties;
}

export function Label({
  children,
  size = 11,
  color,
  letter = 0.18,
  className,
  style,
}: LabelProps) {
  return (
    <div
      className={className}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: `calc(${size}px * var(--mono-scale))`,
        letterSpacing: `${letter}em`,
        textTransform: 'uppercase',
        color: color ?? 'var(--color-ink-muted)',
        fontWeight: 500,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
