/**
 * OrnateFrame — engraved card chassis.
 *
 * Renders a velvet panel with a hairline gold border and four art-deco
 * corner ornaments. Used to frame anything that wants the "main hall"
 * presentation: rituals, jar status, jackpot reveal.
 *
 * Theme-driven: pulls felt/border/gold from CSS variables.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface OrnateFrameProps {
  children: ReactNode;
  padding?: number;
  className?: string;
  style?: CSSProperties;
}

function Corner({ rotation }: { rotation: number }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      style={{ position: 'absolute', transform: `rotate(${rotation}deg)` }}
    >
      <path
        d="M0 0 L20 0 L20 2 L2 2 L2 20 L0 20 Z"
        fill="var(--color-gold)"
        opacity="0.92"
      />
      <path
        d="M5 5 L14 5 M5 5 L5 14"
        stroke="var(--color-gold-deep)"
        strokeWidth="0.9"
      />
      <circle cx="5" cy="5" r="1.5" fill="var(--color-gold-deep)" />
    </svg>
  );
}

export function OrnateFrame({
  children,
  padding = 18,
  className,
  style,
}: OrnateFrameProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        padding,
        background:
          'linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-surface) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        boxShadow:
          'inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 0 0 3px var(--color-bg), inset 0 0 0 4px var(--color-border), 0 2px 0 rgba(0, 0, 0, 0.4)',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', top: 6, left: 6 }}>
        <Corner rotation={0} />
      </div>
      <div style={{ position: 'absolute', top: 6, right: 6 }}>
        <Corner rotation={90} />
      </div>
      <div style={{ position: 'absolute', bottom: 6, right: 6 }}>
        <Corner rotation={180} />
      </div>
      <div style={{ position: 'absolute', bottom: 6, left: 6 }}>
        <Corner rotation={270} />
      </div>
      {children}
    </div>
  );
}
