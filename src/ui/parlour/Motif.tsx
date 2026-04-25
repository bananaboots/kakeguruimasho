/**
 * Motif — themed ornament glyph.
 *
 * Reads the active theme's `symbol` and renders the corresponding silhouette
 * (chrysanthemum cluster, fleur, wolf-and-moon, dragon, wave, star, keyhole).
 * Used for cover art, jackpot reveals, and section dividers.
 *
 * Each glyph is a stylized SVG built around a 60×60 viewBox; the wrapper
 * scales them via the `size` prop. To add a new motif, add the case here
 * and reference its key from a theme's `symbol` field in `themes.ts`.
 */

import type { CSSProperties } from 'react';
import type { MotifSymbol } from '../../styles/themes.ts';
import { useTheme } from '../../styles/theme-context.ts';

export interface MotifProps {
  /** Override the active theme's symbol (useful for showcasing). */
  symbol?: MotifSymbol;
  size?: number;
  /** Stroke + fill color. Falls back to `--color-gold`. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Motif({ symbol, size = 60, color, className, style }: MotifProps) {
  const { themeMeta } = useTheme();
  const sym = symbol ?? themeMeta.symbol;
  const c = color ?? 'var(--color-gold)';

  const props = {
    width: size,
    height: size,
    viewBox: '0 0 60 60',
    fill: 'none',
    className,
    style,
    'aria-hidden': true,
  } as const;

  switch (sym) {
    case 'paclilly':
      return (
        <svg {...props}>
          <circle cx="30" cy="30" r="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
          <circle cx="30" cy="30" r="20" stroke={c} strokeWidth="0.6" opacity="0.4" />
          <g stroke={c} strokeWidth="1" fill={c} fillOpacity="0.2">
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * Math.PI) / 4;
              const x = 30 + Math.cos(a) * 12;
              const y = 30 + Math.sin(a) * 12;
              return <circle key={i} cx={x} cy={y} r="4" />;
            })}
          </g>
          <circle cx="30" cy="30" r="5" fill={c} />
          <circle cx="30" cy="30" r="2" fill="var(--color-bg)" />
        </svg>
      );
    case 'wolf':
      return (
        <svg {...props}>
          <circle cx="30" cy="30" r="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
          <circle cx="44" cy="18" r="6" fill={c} fillOpacity="0.4" />
          <path
            d="M14 44 L20 30 L26 36 L30 26 L34 36 L40 30 L46 44 Z"
            stroke={c}
            strokeWidth="1"
            fill={c}
            fillOpacity="0.2"
          />
          <circle cx="26" cy="38" r="1.2" fill={c} />
          <circle cx="34" cy="38" r="1.2" fill={c} />
          <path d="M28 42 L30 44 L32 42" stroke={c} strokeWidth="1" />
        </svg>
      );
    case 'dragon':
      return (
        <svg {...props}>
          <circle cx="30" cy="30" r="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
          <circle cx="30" cy="30" r="20" stroke={c} strokeWidth="0.6" opacity="0.4" />
          <path
            d="M30 10 Q45 20 40 35 Q35 50 30 45 Q25 40 20 45 Q15 50 10 35 Q15 20 30 10 Z"
            stroke={c}
            strokeWidth="1.2"
            fill={c}
            fillOpacity="0.15"
          />
          <circle cx="25" cy="28" r="1.5" fill={c} />
          <circle cx="35" cy="28" r="1.5" fill={c} />
          <path d="M22 35 Q30 40 38 35" stroke={c} strokeWidth="1" />
        </svg>
      );
    case 'wave':
      return (
        <svg {...props}>
          <circle cx="30" cy="30" r="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
          <path
            d="M8 35 Q18 20 28 30 Q38 40 48 25 Q55 18 52 15"
            stroke={c}
            strokeWidth="1.5"
          />
          <path d="M12 40 Q22 28 30 38" stroke={c} strokeWidth="1" opacity="0.7" />
          <circle cx="45" cy="22" r="2" fill={c} />
        </svg>
      );
    case 'star':
      return (
        <svg {...props}>
          <circle cx="30" cy="30" r="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
          <path
            d="M30 10 L33 25 L48 28 L36 36 L40 50 L30 42 L20 50 L24 36 L12 28 L27 25 Z"
            stroke={c}
            strokeWidth="1"
            fill={c}
            fillOpacity="0.2"
          />
          <circle cx="30" cy="30" r="2" fill={c} />
        </svg>
      );
    case 'keyhole':
      return (
        <svg {...props}>
          <circle cx="30" cy="30" r="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
          <circle cx="30" cy="25" r="7" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.15" />
          <path
            d="M27 30 L24 45 L36 45 L33 30 Z"
            stroke={c}
            strokeWidth="1.5"
            fill={c}
            fillOpacity="0.15"
          />
        </svg>
      );
    case 'fleur':
    default:
      return (
        <svg {...props}>
          <circle cx="30" cy="30" r="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
          <circle cx="30" cy="30" r="20" stroke={c} strokeWidth="0.6" opacity="0.4" />
          <path d="M30 10 Q34 22 30 30 Q26 22 30 10 Z" fill={c} opacity="0.8" />
          <path d="M30 30 Q38 30 44 24 Q38 36 30 30" fill={c} opacity="0.8" />
          <path d="M30 30 Q22 30 16 24 Q22 36 30 30" fill={c} opacity="0.8" />
          <path d="M30 30 Q34 38 30 50 Q26 38 30 30 Z" fill={c} opacity="0.8" />
          <circle cx="30" cy="30" r="3" fill={c} />
          <circle cx="30" cy="30" r="1.5" fill="var(--color-bg)" />
        </svg>
      );
  }
}
