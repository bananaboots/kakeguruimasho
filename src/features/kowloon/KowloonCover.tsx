/**
 * KowloonCover — theme-picker cover art.
 *
 * Used by the Settings theme picker to preview the Kowloon aesthetic.
 * Renders the cinematic header: vertical Cantonese sign + wordmark,
 * mosaic floor strip at bottom, tangled wires across the top,
 * inspection stamps in opposite corners.
 */

import type { ReactElement } from 'react';
import { NeonSign } from '../../ui/kowloon/NeonSign.tsx';
import { WireBundle } from '../../ui/kowloon/WireBundle.tsx';
import { MosaicFloor } from '../../ui/kowloon/MosaicFloor.tsx';
import { Stamp } from '../../ui/kowloon/Stamp.tsx';
import './kowloon-screens.css';

export function KowloonCover(): ReactElement {
  return (
    <div
      className="kowloon-cover"
      data-testid="kowloon-cover"
    >
      <div className="kowloon-cover__wires" aria-hidden>
        <WireBundle width={760} />
      </div>

      <div className="kowloon-cover__center">
        <NeonSign ch="九" en="KOWLOON ELECTRIC" sub="九龍電氣 · 1985" color="#f5d547" />
        <div className="kowloon-cover__tagline">Triad Neon · Drop the Coin</div>
      </div>

      <div className="kowloon-cover__floor" aria-hidden>
        <MosaicFloor width="100%" height={80} />
      </div>

      <div className="kowloon-cover__stamp kowloon-cover__stamp--tl">
        <Stamp ch="檢" en="INSPECTED" color="#ff2e88" rotate={-6} />
      </div>
      <div className="kowloon-cover__stamp kowloon-cover__stamp--tr">
        <Stamp ch="廠" en="LOT 7B" color="#22e3ff" rotate={5} />
      </div>
    </div>
  );
}
