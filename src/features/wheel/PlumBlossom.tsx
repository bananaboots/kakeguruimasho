import type { CSSProperties, ReactElement } from 'react';

export interface PlumBlossomProps {
  size?: number;
  color?: string;
  center?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/** 5-petal plum blossom. Source: pachinko.jsx:157-168. */
export function PlumBlossom({
  size = 30,
  color = 'var(--color-gold)',
  center = '#a8302a',
  style,
  ariaLabel,
}: PlumBlossomProps): ReactElement {
  const petals = [0, 72, 144, 216, 288];
  return (
    <svg
      width={size}
      height={size}
      viewBox="-20 -20 40 40"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      style={style}
    >
      {petals.map((a) => (
        <circle
          key={a}
          cx="0"
          cy="-10"
          r="6"
          fill={color}
          opacity="0.85"
          transform={`rotate(${a})`}
        />
      ))}
      <circle cx="0" cy="0" r="2.5" fill={center} />
    </svg>
  );
}
