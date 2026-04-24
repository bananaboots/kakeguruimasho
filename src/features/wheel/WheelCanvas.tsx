// Main wheel — SVG + Framer Motion spin animation.
//
// Design notes:
// - RNG is ground truth (R3, D3). `targetSegmentIndex` is where the wheel
//   MUST stop. `nearMissDriftIndex` is pure theater — animation choreographs
//   a pass THROUGH that segment before settling on target.
// - Spec §12: 4–6 second spin; winning segment pulses on settle.
// - Framer Motion lazy-loaded: this file is only imported by the lazy `/spin`
//   route (see 3J App.tsx), so framer-motion lives in its own chunk
//   (vite `manualChunks['framer-motion']`).
// - `useReducedMotion` honored — compressed spin with no overshoot.
// - Mobile-first: viewBox is square; fills container width up to a max size.
//   Tap-safe spin button is rendered by 3E, not here.

import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';

import {
  BONUS_WHEEL_REVOLUTIONS,
  BONUS_WHEEL_SPIN_DURATION_SEC,
  MAIN_WHEEL_REVOLUTIONS,
  MAIN_WHEEL_SPIN_DURATION_SEC,
  NEAR_MISS_OVERSHOOT_FACTOR,
  WIN_PULSE_DURATION_SEC,
} from './animation-constants.ts';
import {
  BONUS_WHEEL_SEGMENT_ORDER,
  MAIN_WHEEL_SEGMENT_ORDER,
} from './wheel.engine.ts';
import type { BonusSegment, MainWheelTier } from '../../types/wheel.ts';

// ---- Segment visual metadata ----

type MainSegmentMeta = {
  tier: MainWheelTier;
  label: string;
  fill: string;
  /** Whether this segment is visually "big-reward" (gold glow on settle). */
  emphasized: boolean;
};

const MAIN_SEGMENT_META: Record<MainWheelTier, Omit<MainSegmentMeta, 'tier'>> =
  {
    T1: { label: 'T1', fill: 'var(--color-surface-2, #1f1f22)', emphasized: false },
    T2: { label: 'T2', fill: 'var(--color-surface-3, #2a2a2e)', emphasized: false },
    T3: { label: 'T3', fill: 'var(--color-accent, #E53935)', emphasized: true },
    BONUS: {
      label: 'BONUS',
      fill: 'var(--color-success, #3FB68B)',
      emphasized: true,
    },
    JACKPOT: {
      label: 'JACKPOT',
      fill: 'var(--color-gold, #FFD700)',
      emphasized: true,
    },
  };

type BonusSegmentMeta = {
  segment: BonusSegment;
  label: string;
  fill: string;
};

const BONUS_SEGMENT_META: Record<BonusSegment, Omit<BonusSegmentMeta, 'segment'>> =
  {
    PCT_75: { label: '75%', fill: 'var(--color-surface-2, #1f1f22)' },
    PCT_50: { label: '50%', fill: 'var(--color-surface-3, #2a2a2e)' },
    PCT_25: { label: '25%', fill: 'var(--color-accent, #E53935)' },
    FREE: { label: 'FREE', fill: 'var(--color-gold, #FFD700)' },
    EXTRA: { label: '+1 SPIN', fill: 'var(--color-success, #3FB68B)' },
  };

// ---- Props ----

export type WheelCanvasProps = {
  /** Index into MAIN_WHEEL_SEGMENT_ORDER — where the pointer MUST stop. */
  targetSegmentIndex: number;
  /**
   * Optional D3 drift: animation must physically pass through this segment
   * before settling on targetSegmentIndex. Must not equal targetSegmentIndex.
   */
  nearMissDriftIndex?: number;
  /** Fired when the wheel stops + the pulse completes. */
  onAnimationComplete?: () => void;
  /**
   * When true, the wheel is mounted but not spinning (the SpinButton will
   * trigger it). We still render the static wheel.
   */
  idle?: boolean;
};

// ---- Geometry helpers ----

const VIEWBOX = 400;
const CENTER = VIEWBOX / 2;
const OUTER_RADIUS = 185;
const LABEL_RADIUS = 120;

function polarToCartesian(cx: number, cy: number, r: number, deg: number): {
  x: number;
  y: number;
} {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(index: number, count: number): string {
  const sweep = 360 / count;
  const start = index * sweep;
  const end = start + sweep;
  const s = polarToCartesian(CENTER, CENTER, OUTER_RADIUS, start);
  const e = polarToCartesian(CENTER, CENTER, OUTER_RADIUS, end);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${s.x} ${s.y} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${e.x} ${e.y} Z`;
}

/**
 * Compute the rotation (in degrees) that lands segment `index` under the
 * pointer. Pointer is at 12 o'clock (top). Segments are drawn starting at
 * 12 o'clock growing clockwise; segment `i` centers at angle `(i + 0.5) * sweep`.
 * We want that center at 0° (top) after rotation, so:
 *   rotation = -(i + 0.5) * sweep  (mod 360)
 */
function rotationForIndex(index: number, count: number): number {
  const sweep = 360 / count;
  return -(index + 0.5) * sweep;
}

// ---- Main wheel ----

export function WheelCanvas(props: WheelCanvasProps): React.ReactElement {
  const { targetSegmentIndex, nearMissDriftIndex, onAnimationComplete, idle } = props;
  const segments = MAIN_WHEEL_SEGMENT_ORDER;
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const lastPlayedRef = useRef<number | null>(null);

  const segmentMeta: MainSegmentMeta[] = useMemo(
    () =>
      segments.map((tier) => ({ tier, ...MAIN_SEGMENT_META[tier] })),
    [segments],
  );

  useEffect(() => {
    if (idle) return;
    // Only play once per distinct target selection.
    const playKey = targetSegmentIndex * 1000 + (nearMissDriftIndex ?? -1);
    if (lastPlayedRef.current === playKey) return;
    lastPlayedRef.current = playKey;

    const N = segments.length;
    const finalRot = rotationForIndex(targetSegmentIndex, N);

    // Reduced motion: no drift, short rotation.
    if (reduceMotion) {
      void controls
        .start({
          rotate: finalRot,
          transition: { duration: 0.3, ease: 'easeOut' },
        })
        .then(() => onAnimationComplete?.());
      return;
    }

    const run = async (): Promise<void> => {
      if (nearMissDriftIndex !== undefined && nearMissDriftIndex !== targetSegmentIndex) {
        // Phase 1: spin past the drift segment with overshoot.
        const driftRot = rotationForIndex(nearMissDriftIndex, N);
        const overshootSweep = (360 / N) * NEAR_MISS_OVERSHOOT_FACTOR;
        const phase1End = driftRot - overshootSweep - 360 * MAIN_WHEEL_REVOLUTIONS;

        await controls.start({
          rotate: phase1End,
          transition: {
            duration: MAIN_WHEEL_SPIN_DURATION_SEC * 0.75,
            ease: [0.15, 0.5, 0.3, 1], // fast start, bleed off speed
          },
        });

        // Phase 2: ease back onto the target (always ending on target — R3).
        // Normalize so we ease "forward" the short way.
        const remainder = ((phase1End - finalRot) % 360 + 360) % 360;
        const phase2End = phase1End - remainder;
        await controls.start({
          rotate: phase2End,
          transition: {
            duration: MAIN_WHEEL_SPIN_DURATION_SEC * 0.25,
            ease: 'easeOut',
          },
        });
      } else {
        // Clean spin — multiple revolutions then settle.
        const endRot = finalRot - 360 * MAIN_WHEEL_REVOLUTIONS;
        await controls.start({
          rotate: endRot,
          transition: {
            duration: MAIN_WHEEL_SPIN_DURATION_SEC,
            ease: [0.2, 0.8, 0.2, 1],
          },
        });
      }

      // Winning-segment pulse — spec §12.
      await controls.start({
        scale: [1, 1.04, 1],
        transition: { duration: WIN_PULSE_DURATION_SEC, ease: 'easeInOut' },
      });
      onAnimationComplete?.();
    };

    void run();
  }, [
    idle,
    targetSegmentIndex,
    nearMissDriftIndex,
    reduceMotion,
    controls,
    onAnimationComplete,
    segments.length,
    segments,
  ]);

  return (
    <div
      data-testid="main-wheel"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 400,
        aspectRatio: '1 / 1',
        margin: '0 auto',
      }}
    >
      {/* Pointer at top (12 o'clock). */}
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <polygon
          points={`${CENTER - 14},12 ${CENTER + 14},12 ${CENTER},${12 + 22}`}
          fill="var(--color-accent, #E53935)"
          stroke="var(--color-bg, #0A0A0B)"
          strokeWidth={2}
        />
      </svg>

      <motion.svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        animate={controls}
        initial={{ rotate: 0, scale: 1 }}
        style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}
        role="img"
        aria-label="Main reward wheel"
      >
        {segmentMeta.map((meta, i) => {
          const sweep = 360 / segmentMeta.length;
          const labelAngle = (i + 0.5) * sweep;
          const lp = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, labelAngle);
          return (
            <g key={meta.tier} data-segment-index={i} data-tier={meta.tier}>
              <path
                d={segmentPath(i, segmentMeta.length)}
                fill={meta.fill}
                stroke="var(--color-border-strong, #3a3a3e)"
                strokeWidth={1}
              />
              <text
                x={lp.x}
                y={lp.y}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${labelAngle} ${lp.x} ${lp.y})`}
                fill="var(--color-text, #F5F5F7)"
                fontSize={meta.emphasized ? 22 : 18}
                fontWeight={700}
              >
                {meta.label}
              </text>
            </g>
          );
        })}
        {/* Hub */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={16}
          fill="var(--color-border-strong, #3a3a3e)"
          stroke="var(--color-text, #F5F5F7)"
          strokeWidth={1.5}
        />
      </motion.svg>
    </div>
  );
}

// ---- Bonus wheel ----
// (Implementation kept in this file to share geometry helpers. Re-exported
//  from BonusWheelCanvas.tsx as a stable module boundary.)

export type BonusWheelCanvasProps = {
  targetSegmentIndex: number; // index into BONUS_WHEEL_SEGMENT_ORDER
  onAnimationComplete?: () => void;
};

export function BonusWheelCanvas(props: BonusWheelCanvasProps): React.ReactElement {
  const { targetSegmentIndex, onAnimationComplete } = props;
  const segments = BONUS_WHEEL_SEGMENT_ORDER;
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const lastPlayedRef = useRef<number | null>(null);

  const segmentMeta: BonusSegmentMeta[] = useMemo(
    () =>
      segments.map((segment) => ({ segment, ...BONUS_SEGMENT_META[segment] })),
    [segments],
  );

  useEffect(() => {
    if (lastPlayedRef.current === targetSegmentIndex) return;
    lastPlayedRef.current = targetSegmentIndex;

    const N = segments.length;
    const finalRot = rotationForIndex(targetSegmentIndex, N);

    if (reduceMotion) {
      void controls
        .start({
          rotate: finalRot,
          transition: { duration: 0.3, ease: 'easeOut' },
        })
        .then(() => onAnimationComplete?.());
      return;
    }

    const endRot = finalRot - 360 * BONUS_WHEEL_REVOLUTIONS;
    const run = async (): Promise<void> => {
      await controls.start({
        rotate: endRot,
        transition: {
          duration: BONUS_WHEEL_SPIN_DURATION_SEC,
          ease: [0.2, 0.8, 0.2, 1],
        },
      });
      await controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: WIN_PULSE_DURATION_SEC, ease: 'easeInOut' },
      });
      onAnimationComplete?.();
    };
    void run();
  }, [targetSegmentIndex, reduceMotion, controls, onAnimationComplete, segments.length, segments]);

  return (
    <div
      data-testid="bonus-wheel"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 320,
        aspectRatio: '1 / 1',
        margin: '0 auto',
      }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <polygon
          points={`${CENTER - 12},14 ${CENTER + 12},14 ${CENTER},${14 + 20}`}
          fill="var(--color-accent, #E53935)"
          stroke="var(--color-bg, #0A0A0B)"
          strokeWidth={2}
        />
      </svg>
      <motion.svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        animate={controls}
        initial={{ rotate: 0, scale: 1 }}
        style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}
        role="img"
        aria-label="Bonus reward wheel"
      >
        {segmentMeta.map((meta, i) => {
          const sweep = 360 / segmentMeta.length;
          const labelAngle = (i + 0.5) * sweep;
          const lp = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, labelAngle);
          return (
            <g key={meta.segment} data-segment-index={i} data-segment={meta.segment}>
              <path
                d={segmentPath(i, segmentMeta.length)}
                fill={meta.fill}
                stroke="var(--color-border-strong, #3a3a3e)"
                strokeWidth={1}
              />
              <text
                x={lp.x}
                y={lp.y}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${labelAngle} ${lp.x} ${lp.y})`}
                fill="var(--color-text, #F5F5F7)"
                fontSize={18}
                fontWeight={700}
              >
                {meta.label}
              </text>
            </g>
          );
        })}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={14}
          fill="var(--color-border-strong, #3a3a3e)"
          stroke="var(--color-text, #F5F5F7)"
          strokeWidth={1.5}
        />
      </motion.svg>
    </div>
  );
}
