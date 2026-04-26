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

import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

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
import {
  BONUS_WHEEL_SLICE_SEQUENCE,
  MAIN_WHEEL_SLICE_SEQUENCE,
  bonusSegmentToVisualSlice,
  mainTierToVisualSlice,
  type BonusSlicePrize,
  type MainSliceTier,
} from './wheel-slices.ts';
import { Chrysanthemum } from './Chrysanthemum.tsx';
import { PlumBlossom } from './PlumBlossom.tsx';
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

type BonusPrizeMeta = {
  base: string;
  shade: string;
  big: string;
  /** Maps to engine BonusSegment for data-segment preservation. */
  engineSegment: BonusSegment;
  rare: boolean;
};

const BONUS_PRIZE_META: Record<BonusSlicePrize, BonusPrizeMeta> = {
  sm:   { base: '#704a76', shade: '#523557', big: '二五', engineSegment: 'PCT_25', rare: false },
  md:   { base: '#3a6680', shade: '#284b62', big: '五十', engineSegment: 'PCT_50', rare: false },
  lg:   { base: '#a8302a', shade: '#7a1f1c', big: '七五', engineSegment: 'PCT_75', rare: true  },
  x2:   { base: '#3a7458', shade: '#28553e', big: '倍',   engineSegment: 'EXTRA',  rare: true  },
  free: { base: 'var(--color-gold)', shade: 'var(--color-gold-deep)', big: '無料', engineSegment: 'FREE', rare: true },
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
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const targetTier = MAIN_WHEEL_SEGMENT_ORDER[targetSegmentIndex];
  const driftTier =
    nearMissDriftIndex !== undefined && nearMissDriftIndex !== targetSegmentIndex
      ? MAIN_WHEEL_SEGMENT_ORDER[nearMissDriftIndex]
      : undefined;
  const targetVisualIdx = targetTier ? mainTierToVisualSlice(targetTier) : 0;
  const driftVisualIdx = driftTier ? mainTierToVisualSlice(driftTier) : undefined;

  useEffect(() => {
    if (idle) return;

    const el = svgRef.current;
    if (!el) return;

    const N = MAIN_WHEEL_SLICE_SEQUENCE.length; // 50
    const finalRot = rotationForIndex(targetVisualIdx, N);

    // Framer Motion's imperative `animate(el, ...)` auto-supersedes any prior
    // animation on the same element/value, so React 18 StrictMode's
    // mount → unmount → mount cycle is safe: the second mount's animations
    // simply replace the first's, and only the second's await chain reaches
    // `onAnimationComplete`. Effect deps include `targetSegmentIndex`/etc,
    // which only change between distinct spins (the parent unmounts the wheel
    // between spins), so re-firing on the same spin is not a concern.
    // Framer Motion v12's `animate(el, ...).finished` Promise can hang
    // indefinitely when animations get preempted (e.g. React 18 StrictMode
    // dev double-mount). The animations themselves play correctly — we just
    // can't trust the Promise. Instead, fire-and-forget the animate calls
    // and use a timeout matched to the planned duration to drive the
    // post-spin handler. The DOM end-state (transform) is correct either way.
    const run = async (): Promise<void> => {
      const wait = (sec: number) => new Promise<void>((r) => window.setTimeout(r, sec * 1000));
      if (reduceMotion) {
        animate(el, { rotate: finalRot }, { duration: 0.3, ease: 'easeOut' });
        await wait(0.3);
        onAnimationComplete?.();
        return;
      }
      if (driftVisualIdx !== undefined) {
        const driftRot = rotationForIndex(driftVisualIdx, N);
        const overshootSweep = (360 / N) * NEAR_MISS_OVERSHOOT_FACTOR;
        const phase1End = driftRot - overshootSweep - 360 * MAIN_WHEEL_REVOLUTIONS;
        animate(el, { rotate: phase1End }, {
          duration: MAIN_WHEEL_SPIN_DURATION_SEC * 0.75,
          ease: [0.15, 0.5, 0.3, 1],
        });
        await wait(MAIN_WHEEL_SPIN_DURATION_SEC * 0.75);
        const remainder = ((phase1End - finalRot) % 360 + 360) % 360;
        const phase2End = phase1End - remainder;
        animate(el, { rotate: phase2End }, {
          duration: MAIN_WHEEL_SPIN_DURATION_SEC * 0.25,
          ease: 'easeOut',
        });
        await wait(MAIN_WHEEL_SPIN_DURATION_SEC * 0.25);
      } else {
        const endRot = finalRot - 360 * MAIN_WHEEL_REVOLUTIONS;
        animate(el, { rotate: endRot }, {
          duration: MAIN_WHEEL_SPIN_DURATION_SEC,
          ease: [0.2, 0.8, 0.2, 1],
        });
        await wait(MAIN_WHEEL_SPIN_DURATION_SEC);
      }
      animate(el, { scale: [1, 1.04, 1] }, {
        duration: WIN_PULSE_DURATION_SEC,
        ease: 'easeInOut',
      });
      await wait(WIN_PULSE_DURATION_SEC);
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

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
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
      </svg>

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
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const targetSegment = BONUS_WHEEL_SEGMENT_ORDER[targetSegmentIndex];
  const targetVisualIdx = targetSegment ? bonusSegmentToVisualSlice(targetSegment) : 0;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const N = BONUS_WHEEL_SLICE_SEQUENCE.length; // 24
    const finalRot = rotationForIndex(targetVisualIdx, N);

    // See WheelCanvas: fire-and-forget animate() + timeout-based wait.
    const run = async (): Promise<void> => {
      const wait = (sec: number) => new Promise<void>((r) => window.setTimeout(r, sec * 1000));
      if (reduceMotion) {
        animate(el, { rotate: finalRot }, { duration: 0.3, ease: 'easeOut' });
        await wait(0.3);
        onAnimationComplete?.();
        return;
      }
      const endRot = finalRot - 360 * BONUS_WHEEL_REVOLUTIONS;
      animate(el, { rotate: endRot }, {
        duration: BONUS_WHEEL_SPIN_DURATION_SEC,
        ease: [0.2, 0.8, 0.2, 1],
      });
      await wait(BONUS_WHEEL_SPIN_DURATION_SEC);
      animate(el, { scale: [1, 1.05, 1] }, {
        duration: WIN_PULSE_DURATION_SEC,
        ease: 'easeInOut',
      });
      await wait(WIN_PULSE_DURATION_SEC);
      onAnimationComplete?.();
    };
    void run();
  }, [targetSegmentIndex, targetVisualIdx, reduceMotion, onAnimationComplete]);

  const N = BONUS_WHEEL_SLICE_SEQUENCE.length;
  const slice = 360 / N;
  const cx = CENTER, cy = CENTER;
  const rOuter = 150;
  const rLabel = rOuter - 14;

  return (
    <div
      data-testid="bonus-wheel"
      style={{ position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '1 / 1', margin: '0 auto' }}
    >
      <div
        style={{
          position: 'absolute',
          top: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <BrassPointer size="bonus" />
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}
        role="img"
        aria-label="Bonus reward wheel"
      >
        <defs>
          <radialGradient id="bw-felt" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.04)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.45)" />
          </radialGradient>
          <linearGradient id="bw-rim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" />
            <stop offset="50%" stopColor="var(--color-gold-deep)" />
            <stop offset="100%" stopColor="var(--color-gold)" />
          </linearGradient>
        </defs>

        {/* nested brass rim */}
        <circle cx={cx} cy={cy} r={rOuter + 14} fill="var(--color-gold-deep)" />
        <circle cx={cx} cy={cy} r={rOuter + 12} fill="url(#bw-rim)" />
        <circle cx={cx} cy={cy} r={rOuter + 8} fill="var(--color-bg)" />
        <circle cx={cx} cy={cy} r={rOuter + 6} fill="none" stroke="var(--color-gold)" strokeWidth="0.5" opacity="0.7" />

        {BONUS_WHEEL_SLICE_SEQUENCE.map((pk, i) => {
          const meta = BONUS_PRIZE_META[pk];
          const a0 = ((i * slice - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * slice - 90) * Math.PI) / 180;
          const x0 = cx + Math.cos(a0) * rOuter;
          const y0 = cy + Math.sin(a0) * rOuter;
          const x1 = cx + Math.cos(a1) * rOuter;
          const y1 = cy + Math.sin(a1) * rOuter;
          const fill = i % 2 === 0 ? meta.base : meta.shade;
          const aMid = (((i + 0.5) * slice - 90) * Math.PI) / 180;
          const lx = cx + Math.cos(aMid) * rLabel;
          const ly = cy + Math.sin(aMid) * rLabel;
          const labelRot = (i + 0.5) * slice;
          return (
            <g key={i} data-slice-index={i} data-segment={meta.engineSegment}>
              <path
                d={`M${cx} ${cy} L${x0} ${y0} A${rOuter} ${rOuter} 0 0 1 ${x1} ${y1} Z`}
                fill={fill}
                stroke="var(--color-bg)"
                strokeWidth="0.5"
                strokeOpacity="0.6"
              />
              {pk === 'free' ? (
                <line
                  x1={cx + Math.cos(a0) * (rOuter - 6)}
                  y1={cy + Math.sin(a0) * (rOuter - 6)}
                  x2={cx + Math.cos(a0) * rOuter}
                  y2={cy + Math.sin(a0) * rOuter}
                  stroke="var(--color-gold)"
                  strokeWidth="1"
                />
              ) : null}
              {meta.rare ? (
                <text
                  x={lx}
                  y={ly}
                  fill={pk === 'free' ? 'var(--color-bg)' : 'var(--color-ink)'}
                  fontFamily='"Shippori Mincho", "DM Serif Display", serif'
                  fontSize={pk === 'free' ? 13 : 11}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelRot}, ${lx}, ${ly})`}
                  style={{ letterSpacing: '0.05em' }}
                >
                  {meta.big}
                </text>
              ) : null}
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r={rOuter} fill="url(#bw-felt)" opacity="0.5" pointerEvents="none" />

        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i / 36) * Math.PI * 2;
          const px = cx + Math.cos(a) * (rOuter + 3);
          const py = cy + Math.sin(a) * (rOuter + 3);
          return (
            <g key={`bp-${i}`} aria-hidden="true">
              <circle cx={px} cy={py} r="1.4" fill="var(--color-gold-deep)" />
              <circle cx={px - 0.3} cy={py - 0.3} r="0.5" fill="#ffffff" opacity="0.7" />
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r={32} fill="var(--color-bg)" stroke="var(--color-gold-deep)" strokeWidth="0.6" />
        <circle cx={cx} cy={cy} r={28} fill="var(--color-felt-deep)" stroke="var(--color-gold)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={22} fill="none" stroke="var(--color-gold-deep)" strokeWidth="0.4" />

        {/* Test anchors — preserve `data-segment-index` 0..4 + data-segment for any future tests */}
        <g aria-hidden="true">
          {BONUS_WHEEL_SEGMENT_ORDER.map((segment, i) => (
            <rect
              key={segment}
              data-segment-index={i}
              data-segment={segment}
              x={-1}
              y={-1}
              width={1}
              height={1}
              fill="transparent"
              opacity={0}
            />
          ))}
        </g>
      </svg>

      {/* Plum-blossom hub — outside motion.svg so it stays upright. */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <PlumBlossom size={36} />
      </div>
    </div>
  );
}
