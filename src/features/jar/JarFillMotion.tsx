/**
 * JarFillMotion — the Framer Motion-driven fill layer for <JarVisual>.
 *
 * Isolated in its own module so the Framer Motion dependency is
 * lazy-loaded out of the shell chunk (ARCHITECTURE §9.4). Consumers
 * import this via React.lazy.
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

export interface JarFillMotionProps {
  /** 0..1 fill ratio (total / moonshot.target, clamped). */
  ratio: number;
  /** Viewport width of the jar SVG in user units. */
  width: number;
  /** Viewport height of the jar SVG in user units. */
  height: number;
  /** Inner rect x offset (glass inner wall). */
  innerX: number;
  /** Inner rect y offset (top of usable space). */
  innerY: number;
  /** Inner rect width (usable fill area). */
  innerW: number;
  /** Inner rect height (usable fill area). */
  innerH: number;
  /** Fill color (CSS color or `var(--...)`). */
  fill: string;
}

/**
 * Renders a rect that animates its `height` and `y` in inverse so the fill
 * rises from the bottom of the jar. `useReducedMotion` short-circuits to a
 * plain rect when the user prefers reduced motion.
 */
export default function JarFillMotion(props: JarFillMotionProps): ReactElement {
  const { ratio, innerX, innerY, innerW, innerH, fill } = props;
  const reduce = useReducedMotion();

  const clamped = Math.max(0, Math.min(1, ratio));
  const fillH = innerH * clamped;
  const fillY = innerY + (innerH - fillH);

  if (reduce) {
    return (
      <rect
        x={innerX}
        y={fillY}
        width={innerW}
        height={fillH}
        fill={fill}
        rx={6}
      />
    );
  }

  return (
    <motion.rect
      x={innerX}
      width={innerW}
      fill={fill}
      rx={6}
      initial={false}
      animate={{ y: fillY, height: fillH }}
      transition={{ type: 'spring', stiffness: 140, damping: 22, mass: 0.9 }}
    />
  );
}
