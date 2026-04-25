/**
 * RevealStage — the dopamine moment above the Tier III reward picker.
 *
 * Renders nothing for T1/T2. For T3 we show a spinning chrysanthemum
 * (CSS keyframes; 2s linear infinite), the 大当たり ("ōatari") banner,
 * an engraved TIER III subtitle, and the theme's jackpot copy below.
 *
 * Per `globals.css:75-83`, `prefers-reduced-motion: reduce` suppresses
 * the spin globally — no extra branch here.
 */

import type { ReactElement } from 'react';
import type { Tier } from '../../types/wheel.ts';
import { Chrysanthemum } from '../wheel/Chrysanthemum.tsx';
import { useTheme } from '../../styles/theme-context.ts';

import '../rewards/rewards.css'; // keyframe + reveal classes live here

export interface RevealStageProps {
  tier: Tier;
}

export function RevealStage({ tier }: RevealStageProps): ReactElement | null {
  const { themeMeta } = useTheme();
  if (tier !== 'T3') return null;

  return (
    <div className="reveal-stage" data-testid="reveal-stage">
      <div className="reveal-stage__bloom" data-testid="reveal-stage__bloom">
        <Chrysanthemum size={72} />
      </div>
      <div className="reveal-stage__kicker">{themeMeta.copy.jackpot}</div>
      <div className="reveal-stage__banner">大当たり</div>
      <div className="reveal-stage__subtitle">TIER III</div>
      <div className="reveal-stage__house">The House Honours You</div>
    </div>
  );
}
