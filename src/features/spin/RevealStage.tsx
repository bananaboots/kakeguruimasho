/**
 * RevealStage — the dopamine moment above the Tier III reward picker.
 *
 * Renders nothing for T1/T2. For T3 we show:
 *   - a radiating gold ray pattern (24 SVG lines from center)
 *   - a confetti scatter (30 elements: ball / plum-blossom / paper square)
 *   - a spinning chrysanthemum (CSS keyframes; 2s linear infinite)
 *   - the 大当たり ("ōatari") banner
 *   - an engraved TIER III subtitle + theme jackpot copy
 *
 * Per `globals.css:75-83`, `prefers-reduced-motion: reduce` suppresses
 * the spin globally — the static rays + confetti are unaffected.
 *
 * Source design: `pachinko-screens.jsx:744`.
 */

import type { ReactElement } from 'react';
import type { Tier } from '../../types/wheel.ts';
import { Chrysanthemum } from '../wheel/Chrysanthemum.tsx';
import { PlumBlossom } from '../wheel/PlumBlossom.tsx';
import { useTheme } from '../../styles/theme-context.ts';

import '../rewards/rewards.css'; // keyframe + reveal classes live here

const RAY_COUNT = 24;
const CONFETTI_COUNT = 30;

type ConfettiKind = 'ball' | 'plum' | 'square';
const CONFETTI_KINDS: readonly ConfettiKind[] = ['ball', 'plum', 'square'];

/** Tiny pachinko-ball SVG — adapted from `pachinko.jsx:56`. */
function PachinkoBall({ size = 8 }: { size?: number }): ReactElement {
  const id = `pball-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="40%" stopColor="#d8d4cc" />
          <stop offset="100%" stopColor="#5a544a" />
        </radialGradient>
      </defs>
      <circle cx="7" cy="7" r="6" fill={`url(#${id})`} />
      <circle cx="5" cy="5" r="1.5" fill="#fff" opacity="0.85" />
    </svg>
  );
}

export interface RevealStageProps {
  tier: Tier;
}

export function RevealStage({ tier }: RevealStageProps): ReactElement | null {
  const { themeMeta } = useTheme();
  if (tier !== 'T3') return null;

  return (
    <div className="reveal-stage" data-testid="reveal-stage">
      <svg
        className="reveal-stage__rays"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {Array.from({ length: RAY_COUNT }).map((_, i) => {
          const angle = (i / RAY_COUNT) * Math.PI * 2;
          const x2 = 50 + Math.cos(angle) * 80;
          const y2 = 50 + Math.sin(angle) * 80;
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={x2}
              y2={y2}
              stroke="var(--color-gold)"
              strokeWidth={i % 2 ? 0.4 : 0.2}
              opacity="0.6"
            />
          );
        })}
      </svg>

      <div className="reveal-stage__confetti" aria-hidden>
        {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
          const x = (i * 47) % 100;
          const y = (i * 23) % 70;
          const kind = CONFETTI_KINDS[i % 3]!;
          const rotation = (i * 37) % 360;
          return (
            <div
              key={i}
              className="reveal-stage__confetti-item"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {kind === 'ball' && <PachinkoBall size={8} />}
              {kind === 'plum' && <PlumBlossom size={14} />}
              {kind === 'square' && (
                <span
                  className="reveal-stage__confetti-square"
                  data-tone={i % 2 ? 'gold' : 'red'}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="reveal-stage__content">
        <div className="reveal-stage__bloom" data-testid="reveal-stage__bloom">
          <Chrysanthemum size={72} />
        </div>
        <div className="reveal-stage__kicker">{themeMeta.copy.jackpot}</div>
        <div className="reveal-stage__banner">大当たり</div>
        <div className="reveal-stage__subtitle">TIER III</div>
        <div className="reveal-stage__house">The House Honours You</div>
      </div>
    </div>
  );
}
