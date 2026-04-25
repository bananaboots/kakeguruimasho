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
import { MAIN_WHEEL_SLICE_SEQUENCE, mainTierToVisualSlice, type MainSliceTier } from './wheel-slices.ts';
import { Chrysanthemum } from './Chrysanthemum.tsx';
import { BrassPointer } from './BrassPointer.tsx';
import type { BonusSegment, MainWheelTier } from '../../types/wheel.ts';

// ---- Slice tier visual metadata (50-slice main wheel) ----

type MainSliceTierMeta = {
  base: string;
  shade: string;
  jp: string;
  /** Maps a slice tier to the engine MainWheelTier so we can preserve data-tier. */
  engineTier: MainWheelTier;
  ink: 'light' | 'dark';
};

const SLICE_TIER_META: Record<MainSliceTier, MainSliceTierMeta> = {
  I:     { base: '#a8302a', shade: '#7a1f1c', jp: '一', engineTier: 'T1',     ink: 'light' },
  II:    { base: '#3a6680', shade: '#284b62', jp: '二', engineTier: 'T2',     ink: 'light' },
  III:   { base: '#704a76', shade: '#523557', jp: '三', engineTier: 'T3',     ink: 'light' },
  BONUS: { base: '#3a7458', shade: '#28553e', jp: '副', engineTier: 'BONUS',  ink: 'light' },
  JP:    { base: 'var(--color-gold)', shade: 'var(--color-gold-deep)', jp: '★', engineTier: 'JACKPOT', ink: 'dark' },
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
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const lastPlayedRef = useRef<number | null>(null);

  // The animation operates on the 50-slice visual indexing.
  const targetTier = MAIN_WHEEL_SEGMENT_ORDER[targetSegmentIndex];
  const driftTier =
    nearMissDriftIndex !== undefined && nearMissDriftIndex !== targetSegmentIndex
      ? MAIN_WHEEL_SEGMENT_ORDER[nearMissDriftIndex]
      : undefined;
  const targetVisualIdx = targetTier ? mainTierToVisualSlice(targetTier) : 0;
  const driftVisualIdx = driftTier ? mainTierToVisualSlice(driftTier) : undefined;

  useEffect(() => {
    if (idle) return;
    const playKey = targetSegmentIndex * 1000 + (nearMissDriftIndex ?? -1);
    if (lastPlayedRef.current === playKey) return;
    lastPlayedRef.current = playKey;

    const N = MAIN_WHEEL_SLICE_SEQUENCE.length; // 50
    const finalRot = rotationForIndex(targetVisualIdx, N);

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
      if (driftVisualIdx !== undefined) {
        const driftRot = rotationForIndex(driftVisualIdx, N);
        const overshootSweep = (360 / N) * NEAR_MISS_OVERSHOOT_FACTOR;
        const phase1End = driftRot - overshootSweep - 360 * MAIN_WHEEL_REVOLUTIONS;
        await controls.start({
          rotate: phase1End,
          transition: { duration: MAIN_WHEEL_SPIN_DURATION_SEC * 0.75, ease: [0.15, 0.5, 0.3, 1] },
        });
        const remainder = ((phase1End - finalRot) % 360 + 360) % 360;
        const phase2End = phase1End - remainder;
        await controls.start({
          rotate: phase2End,
          transition: { duration: MAIN_WHEEL_SPIN_DURATION_SEC * 0.25, ease: 'easeOut' },
        });
      } else {
        const endRot = finalRot - 360 * MAIN_WHEEL_REVOLUTIONS;
        await controls.start({
          rotate: endRot,
          transition: { duration: MAIN_WHEEL_SPIN_DURATION_SEC, ease: [0.2, 0.8, 0.2, 1] },
        });
      }
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
    targetVisualIdx,
    driftVisualIdx,
    reduceMotion,
    controls,
    onAnimationComplete,
  ]);

  // Geometry — 50 slices fan from a 165-radius circle to the 60-radius hub.
  // We keep VIEWBOX/CENTER from the existing module-level constants.
  const N = MAIN_WHEEL_SLICE_SEQUENCE.length;
  const slice = 360 / N;
  const cx = CENTER, cy = CENTER;
  const rOuter = 165;
  const rInner = 60;
  const rLabel = rOuter - 14;

  return (
    <div
      data-testid="main-wheel"
      style={{ position: 'relative', width: '100%', maxWidth: 400, aspectRatio: '1 / 1', margin: '0 auto' }}
    >
      {/* Pointer at top */}
      <div
        style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <BrassPointer size="main" />
      </div>

      <motion.svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        animate={controls}
        initial={{ rotate: 0, scale: 1 }}
        style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}
        role="img"
        aria-label="Main reward wheel"
      >
        <defs>
          <radialGradient id="pw-felt" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.05)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.5)" />
          </radialGradient>
          <linearGradient id="pw-rim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" />
            <stop offset="50%" stopColor="var(--color-gold-deep)" />
            <stop offset="100%" stopColor="var(--color-gold)" />
          </linearGradient>
        </defs>

        {/* Outer brass cabinet rim */}
        <circle cx={cx} cy={cy} r={rOuter + 22} fill="none" stroke="var(--color-gold-deep)" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={rOuter + 18} fill="none" stroke="url(#pw-rim)" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={rOuter + 12} fill="none" stroke="var(--color-bg)" strokeWidth="1" />

        {/* 50 slices */}
        {MAIN_WHEEL_SLICE_SEQUENCE.map((tk, i) => {
          const meta = SLICE_TIER_META[tk];
          const a0 = ((i * slice - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * slice - 90) * Math.PI) / 180;
          const x0 = cx + Math.cos(a0) * rOuter;
          const y0 = cy + Math.sin(a0) * rOuter;
          const x1 = cx + Math.cos(a1) * rOuter;
          const y1 = cy + Math.sin(a1) * rOuter;
          const fill = i % 2 === 0 ? meta.base : meta.shade;
          const showLabel = tk === 'JP' || tk === 'BONUS' || i % 5 === 0;
          const aMid = (((i + 0.5) * slice - 90) * Math.PI) / 180;
          const lx = cx + Math.cos(aMid) * rLabel;
          const ly = cy + Math.sin(aMid) * rLabel;
          const labelRot = (i + 0.5) * slice;
          return (
            <g key={i} data-slice-index={i} data-tier={meta.engineTier}>
              <path
                d={`M${cx} ${cy} L${x0} ${y0} A${rOuter} ${rOuter} 0 0 1 ${x1} ${y1} Z`}
                fill={fill}
                stroke="var(--color-bg)"
                strokeWidth="0.5"
                strokeOpacity="0.6"
              />
              {i % 5 === 0 ? (
                <line
                  x1={cx + Math.cos(a0) * (rOuter - 8)}
                  y1={cy + Math.sin(a0) * (rOuter - 8)}
                  x2={cx + Math.cos(a0) * rOuter}
                  y2={cy + Math.sin(a0) * rOuter}
                  stroke="var(--color-gold)"
                  strokeWidth="0.8"
                  opacity="0.9"
                />
              ) : null}
              {showLabel ? (
                <text
                  x={lx}
                  y={ly}
                  fill={meta.ink === 'light' ? 'var(--color-ink)' : 'var(--color-bg)'}
                  fontFamily='"Shippori Mincho", "DM Serif Display", serif'
                  fontSize={tk === 'JP' ? 13 : 11}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelRot}, ${lx}, ${ly})`}
                  style={{ letterSpacing: '0.05em' }}
                >
                  {meta.jp}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Felt overlay */}
        <circle cx={cx} cy={cy} r={rOuter} fill="url(#pw-felt)" opacity="0.4" pointerEvents="none" />

        {/* Peg ring — 50 brass dots */}
        {Array.from({ length: 50 }).map((_, i) => {
          const a = (i / 50) * Math.PI * 2;
          const px = cx + Math.cos(a) * (rOuter + 4);
          const py = cy + Math.sin(a) * (rOuter + 4);
          return (
            <g key={`peg-${i}`} aria-hidden="true">
              <circle cx={px} cy={py} r="1.6" fill="var(--color-gold-deep)" />
              <circle cx={px - 0.3} cy={py - 0.3} r="0.6" fill="#ffffff" opacity="0.7" />
            </g>
          );
        })}

        {/* Hub */}
        <circle cx={cx} cy={cy} r={rInner + 6} fill="var(--color-bg)" stroke="var(--color-gold-deep)" strokeWidth="0.8" />
        <circle cx={cx} cy={cy} r={rInner} fill="var(--color-felt-deep)" stroke="var(--color-gold)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={rInner - 4} fill="none" stroke="var(--color-gold-deep)" strokeWidth="0.5" />

        {/* Test anchors — preserve `data-segment-index` 0..4 + data-tier for near-miss tests */}
        <g aria-hidden="true">
          {MAIN_WHEEL_SEGMENT_ORDER.map((tier, i) => (
            <rect
              key={tier}
              data-segment-index={i}
              data-tier={tier}
              x={-1}
              y={-1}
              width={1}
              height={1}
              fill="transparent"
              opacity={0}
            />
          ))}
        </g>
      </motion.svg>

      {/* Hub overlay (Chrysanthemum + wordmark) — rendered outside the spinning <svg>
          so the brand mark stays upright while the wheel rotates. */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <Chrysanthemum size={48} />
        <div
          style={{
            fontFamily: '"Shippori Mincho", serif',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: '0.3em',
            color: 'var(--color-gold)',
            marginTop: 2,
          }}
        >
          賭狂魔笙
        </div>
      </div>
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
