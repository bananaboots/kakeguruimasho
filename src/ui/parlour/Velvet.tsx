/**
 * Velvet — felt-textured panel.
 *
 * A reusable surface that renders as deep felt cloth — diagonal gradient
 * from felt to felt-deep with two soft radial highlights for cloth-light.
 * Use under the wheel, behind cash-in chips, anywhere a "table" feels right.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface VelvetProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Velvet({ children, className, style }: VelvetProps) {
  return (
    <div
      className={className}
      style={{
        background: `
          radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.04) 0%, transparent 40%),
          radial-gradient(circle at 70% 80%, rgba(0, 0, 0, 0.22) 0%, transparent 50%),
          linear-gradient(135deg, var(--color-felt) 0%, var(--color-felt-deep) 100%)
        `,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
