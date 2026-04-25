import type { CSSProperties, ReactElement } from 'react';

export interface ChrysanthemumProps {
  size?: number;
  color?: string;
  stroke?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/** 16-petal chrysanthemum (Imperial seal). Source: pachinko.jsx:74-93. */
export function Chrysanthemum({
  size = 60,
  color = 'var(--color-gold)',
  stroke = 'var(--color-gold-deep)',
  style,
  ariaLabel,
}: ChrysanthemumProps): ReactElement {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-30 -30 60 60"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      style={style}
    >
      {petals.map((a) => (
        <ellipse
          key={`o-${a}`}
          cx="0"
          cy="-18"
          rx="3.4"
          ry="9"
          fill={color}
          stroke={stroke}
          strokeWidth="0.4"
          transform={`rotate(${a})`}
          opacity="0.92"
        />
      ))}
      {petals.map((a) => (
        <ellipse
          key={`i-${a}`}
          cx="0"
          cy="-10"
          rx="2.6"
          ry="6"
          fill={color}
          stroke={stroke}
          strokeWidth="0.3"
          transform={`rotate(${a + 11.25})`}
          opacity="0.95"
        />
      ))}
      <circle cx="0" cy="0" r="4" fill={stroke} />
      <circle cx="0" cy="0" r="2" fill={color} />
    </svg>
  );
}
