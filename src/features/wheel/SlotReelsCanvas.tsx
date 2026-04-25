/**
 * SlotReelsCanvas — alternate visualisation for the main spin (3-reel slot).
 *
 * Source: `pachinko.jsx:229` (SlotReels) + `pachinko-screens.jsx:622` (the
 * mode="reels" branch in PachinkoSpinWheel). Renders three vertical reels
 * with kanji-glyph symbols mapped per `MainWheelTier`. Animation phase:
 *   1. All three reels accelerate together (off-screen scroll).
 *   2. Reels stop in sequence (left → middle → right) on the target symbol.
 *   3. A brief gold pulse on settle, then `onAnimationComplete?.()`.
 *
 * Drop-in replacement for <WheelCanvas /> at the same call sites — same
 * `targetSegmentIndex` / `onAnimationComplete` props, same RNG-as-ground-
 * truth contract. The `nearMissDriftIndex` prop is accepted but ignored
 * (slot reels don't have a clean drift gesture; near-miss theatre is
 * wheel-specific).
 */

import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, type ReactElement } from 'react';

import { Chrysanthemum } from './Chrysanthemum.tsx';
import { PlumBlossom } from './PlumBlossom.tsx';
import { Koi, Lantern } from '../../ui/parlour/index.ts';
import { MAIN_WHEEL_SEGMENT_ORDER } from './wheel.engine.ts';
import {
  MAIN_WHEEL_SPIN_DURATION_SEC,
  WIN_PULSE_DURATION_SEC,
} from './animation-constants.ts';
import type { MainWheelTier } from '../../types/wheel.ts';

const REEL_HEIGHT = 100;
const SCROLL_CYCLES = 6; // how many full passes a reel scrolls before settling

const SYMBOLS_PER_TIER: ReadonlyArray<MainWheelTier> = [
  'T1',
  'T2',
  'T3',
  'BONUS',
  'JACKPOT',
];

function symbolFor(tier: MainWheelTier): ReactElement {
  switch (tier) {
    case 'T1':
      return <Lantern size={56} />;
    case 'T2':
      return <Koi size={56} />;
    case 'T3':
      return <Chrysanthemum size={56} />;
    case 'BONUS':
      return <PlumBlossom size={52} />;
    case 'JACKPOT':
      return (
        <span
          aria-hidden
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 44,
            fontStyle: 'italic',
            fontWeight: 700,
            color: 'var(--color-gold)',
            textShadow: '0 0 12px var(--color-gold-glow)',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      );
  }
}

export type SlotReelsCanvasProps = {
  /** Index into MAIN_WHEEL_SEGMENT_ORDER — final tier all 3 reels land on. */
  targetSegmentIndex: number;
  /** Accepted for parity with WheelCanvas; reels don't render drift theatre. */
  nearMissDriftIndex?: number;
  onAnimationComplete?: () => void;
  /** When true, render statically without spinning. */
  idle?: boolean;
};

export function SlotReelsCanvas({
  targetSegmentIndex,
  onAnimationComplete,
  idle,
}: SlotReelsCanvasProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const reel0 = useRef<HTMLDivElement | null>(null);
  const reel1 = useRef<HTMLDivElement | null>(null);
  const reel2 = useRef<HTMLDivElement | null>(null);

  const tier = MAIN_WHEEL_SEGMENT_ORDER[targetSegmentIndex] ?? 'T1';
  const targetIdx = SYMBOLS_PER_TIER.indexOf(tier);

  // Each reel renders 5 symbols once + 6 full cycles + a final landing copy.
  // The landing position is at the (SCROLL_CYCLES * 5 + targetIdx)-th symbol.
  const stripLength = SCROLL_CYCLES * SYMBOLS_PER_TIER.length + targetIdx + 1;
  const stripSymbols = Array.from({ length: stripLength }, (_, i) => {
    const wrapped = i % SYMBOLS_PER_TIER.length;
    return SYMBOLS_PER_TIER[wrapped]!;
  });
  const landingY = -((stripLength - 1) * REEL_HEIGHT);

  useEffect(() => {
    if (idle) return;
    const reels = [reel0.current, reel1.current, reel2.current].filter(
      (el): el is HTMLDivElement => el !== null,
    );
    if (reels.length !== 3) return;

    // Reset every reel to top before spinning.
    for (const el of reels) {
      el.style.transform = `translate3d(0, 0px, 0)`;
    }

    const wait = (sec: number) =>
      new Promise<void>((r) => window.setTimeout(r, sec * 1000));

    const run = async (): Promise<void> => {
      if (reduceMotion) {
        for (const el of reels) {
          animate(
            el,
            { y: landingY },
            { duration: 0.3, ease: 'easeOut' },
          );
        }
        await wait(0.3);
        onAnimationComplete?.();
        return;
      }
      const total = MAIN_WHEEL_SPIN_DURATION_SEC;
      // Stagger the stops: 0.55, 0.78, 1.0 of total spin duration.
      const stops = [total * 0.55, total * 0.78, total];
      reels.forEach((el, i) => {
        animate(
          el,
          { y: landingY },
          {
            duration: stops[i] ?? total,
            ease: [0.18, 0.72, 0.32, 1.0],
          },
        );
      });
      await wait(total);
      // Win pulse on the whole rack — tap the parent wrapper via a CSS class.
      const lastReel = reels[2];
      if (lastReel?.parentElement?.parentElement) {
        animate(
          lastReel.parentElement.parentElement,
          { scale: [1, 1.04, 1] },
          { duration: WIN_PULSE_DURATION_SEC, ease: 'easeInOut' },
        );
      }
      await wait(WIN_PULSE_DURATION_SEC);
      onAnimationComplete?.();
    };
    void run();
  }, [idle, targetSegmentIndex, reduceMotion, landingY, onAnimationComplete]);

  const renderReel = (reelRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="slot-reels__window">
      <div
        className="slot-reels__strip"
        ref={reelRef}
        aria-hidden
        style={{ transform: 'translate3d(0, 0px, 0)' }}
      >
        {stripSymbols.map((sym, i) => (
          <div key={i} className="slot-reels__cell">
            {symbolFor(sym)}
          </div>
        ))}
      </div>
      <div className="slot-reels__shadow slot-reels__shadow--top" />
      <div className="slot-reels__shadow slot-reels__shadow--bottom" />
    </div>
  );

  return (
    <div className="slot-reels" data-testid="main-wheel" role="img" aria-label="Main reel set">
      <div className="slot-reels__cabinet">
        {renderReel(reel0)}
        {renderReel(reel1)}
        {renderReel(reel2)}
      </div>
    </div>
  );
}
