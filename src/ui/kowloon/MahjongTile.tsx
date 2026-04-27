/**
 * MahjongTile — cream tile face with HK serif glyph + sub-label.
 *
 * Source design: `kowloon-neon.jsx:223` (MahjongTileA). The face is a
 * static cream gradient; the glyph color defaults to acid jade for
 * dragon tiles. Used in the spin cabinet's reels and in the tile-row
 * inside ritual cards.
 */

import type { CSSProperties, ReactElement } from 'react';

import { cn } from '../utils.ts';
import './kowloon.css';

export interface MahjongTileProps {
  /** Cantonese / Japanese character (e.g. "東", "中"). */
  ch: string;
  /** Sub-label below the glyph (e.g. "East", "Chun"). */
  sub?: string;
  /** Tile width in px. Defaults to 44. */
  size?: number;
  /** Glyph color override. */
  glyphColor?: string;
  className?: string;
  style?: CSSProperties;
}

export function MahjongTile({
  ch,
  sub,
  size = 44,
  glyphColor = '#1ba368',
  className,
  style,
}: MahjongTileProps): ReactElement {
  return (
    <div
      className={cn('kowloon-mahjong-tile', className)}
      style={{
        width: size,
        height: size * 1.35,
        ...style,
      }}
      data-testid="mahjong-tile"
    >
      <div
        className="kowloon-mahjong-tile__glyph"
        style={{
          color: glyphColor,
          fontSize: size * 0.55,
        }}
      >
        {ch}
      </div>
      {sub && <div className="kowloon-mahjong-tile__sub">{sub}</div>}
    </div>
  );
}
