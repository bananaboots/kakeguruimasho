import type { CSSProperties, ReactElement } from 'react';

export interface BrassPointerProps {
  /** "main" → 44×36, "bonus" → 30×24. */
  size?: 'main' | 'bonus';
  style?: CSSProperties;
}

const DIM = {
  main: {
    w: 44,
    h: 36,
    vb: '0 0 44 36',
    tip: 'M22 34 L4 4 L40 4 Z',
    mid: 'M22 32 L7 5 L37 5 Z',
    inner: 'M22 28 L13 7 L31 7 Z',
    boltX: 22,
    boltY: 9,
    boltOuter: 2.2,
    boltInner: 1,
  },
  bonus: {
    w: 30,
    h: 24,
    vb: '0 0 30 24',
    tip: 'M15 22 L3 3 L27 3 Z',
    mid: 'M15 20 L5 4 L25 4 Z',
    inner: 'M15 17 L9 5 L21 5 Z',
    boltX: 15,
    boltY: 6,
    boltOuter: 1.4,
    boltInner: 0,
  },
};

export function BrassPointer({
  size = 'main',
  style,
}: BrassPointerProps): ReactElement {
  const d = DIM[size];
  return (
    <svg
      width={d.w}
      height={d.h}
      viewBox={d.vb}
      style={{ filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.6))', ...style }}
      aria-hidden="true"
    >
      <path d={d.tip} fill="var(--color-gold-deep)" />
      <path d={d.mid} fill="var(--color-gold)" />
      <path d={d.inner} fill="var(--color-gold-deep)" opacity="0.5" />
      <circle cx={d.boltX} cy={d.boltY} r={d.boltOuter} fill="var(--color-bg)" />
      {d.boltInner > 0 ? (
        <circle cx={d.boltX} cy={d.boltY} r={d.boltInner} fill="var(--color-gold)" />
      ) : null}
    </svg>
  );
}
