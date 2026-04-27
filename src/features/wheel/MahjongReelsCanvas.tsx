/**
 * MahjongReelsCanvas — three-reel mahjong cabinet for the Kowloon theme.
 *
 * Renders three vertical reels of mahjong tiles inside a CRT bezel.
 * The center reel is pre-determined by the engine's tier outcome;
 * the side reels animate alignment when `spinning` is true.
 *
 * For v1, animation is the static "resolved-triplet" placeholder —
 * the same outcome shape the wheel/reels canvases consume. A future
 * follow-up animates the alignment.
 *
 * Note: keyed on `MainWheelTier` (T1/T2/T3/BONUS/JACKPOT) to match the
 * full set of outcomes produced by `wheel.engine.ts`, mirroring the
 * `SlotReelsCanvas` symbol map.
 */

import { useEffect, useRef, type ReactElement } from 'react';

import type { MainWheelTier } from '../../types/wheel.ts';
import { CRTBezel } from '../../ui/kowloon/CRTBezel.tsx';
import { MahjongTile } from '../../ui/kowloon/MahjongTile.tsx';
import { MAIN_WHEEL_SPIN_DURATION_SEC } from './animation-constants.ts';

export interface MahjongReelsCanvasProps {
  /** Pre-determined tier from wheel.engine.ts. */
  outcome: MainWheelTier;
  /** When true, render an animation placeholder. */
  spinning?: boolean;
  /** Canvas size in px. */
  size?: number;
  /**
   * Optional callback fired after the (placeholder) animation completes.
   * Mirrors the contract of WheelCanvas/SlotReelsCanvas so the spin flow
   * advances to its reveal step.
   */
  onAnimationComplete?: () => void;
}

const TILE_FACES: Record<MainWheelTier, [string, string, string]> = {
  T1: ['東', '南', '西'],
  T2: ['一', '二', '三'],
  T3: ['中', '發', '白'],
  BONUS: ['副', '副', '副'],
  JACKPOT: ['★', '大', '獎'],
};

const TILE_SUBS: Record<string, string> = {
  '東': 'East',
  '南': 'South',
  '西': 'West',
  '中': 'Chun',
  '發': 'Hatsu',
  '白': 'Haku',
  '一': 'One',
  '二': 'Two',
  '三': 'Three',
  '副': 'Bonus',
  '★': 'Star',
  '大': 'Dai',
  '獎': 'Jeung',
};

export function MahjongReelsCanvas({
  outcome,
  spinning = false,
  size = 300,
  onAnimationComplete,
}: MahjongReelsCanvasProps): ReactElement {
  const tiles = TILE_FACES[outcome];

  // Placeholder "animation": fire the callback after the canonical main-wheel
  // spin duration so the kowloon variant matches the pacing of WheelCanvas /
  // SlotReelsCanvas. A future task will replace this with a real reel-
  // alignment animation. The `firedRef` gate makes the callback idempotent
  // across re-renders if `onAnimationComplete`'s identity changes mid-spin.
  const firedRef = useRef(false);
  useEffect(() => {
    if (!spinning) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    const id = window.setTimeout(() => {
      firedRef.current = true;
      onAnimationComplete?.();
    }, MAIN_WHEEL_SPIN_DURATION_SEC * 1000);
    return () => {
      window.clearTimeout(id);
    };
  }, [spinning, onAnimationComplete]);

  return (
    <CRTBezel
      label="CH 03 · LIVE"
      tally
      width={size}
      height={size * 0.8}
    >
      <div
        className="kowloon-mahjong-reels"
        data-testid="main-wheel"
        data-spinning={spinning ? 'true' : 'false'}
      >
        {tiles.map((face, i) => (
          <div
            key={i}
            className="kowloon-mahjong-reel"
            data-testid="mahjong-reel"
          >
            <MahjongTile
              ch={face}
              sub={TILE_SUBS[face] ?? ''}
              size={48}
              glyphColor="#1bd182"
            />
          </div>
        ))}
        <div className="kowloon-mahjong-reels__payline" aria-hidden />
      </div>
    </CRTBezel>
  );
}
