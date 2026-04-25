/**
 * Chip — Casino chip primitive.
 *
 * Replaces the bare paperclip swatch. Renders an SVG chip with a body
 * radial gradient (top-light, edge-dark for pseudo-depth), 8 alternating
 * cream / dark edge spots, a gold inner ring, an embossed chrysanthemum
 * pip (or denomination text), and a glassy highlight arc.
 *
 * Inputs are a plain `color` (the chip body) and an optional `denom` so
 * we can render a "$5" T1 chip alongside a star-pip jackpot chip from the
 * same component. `gold` swaps the inner disc to brass for the rare
 * gold-clip moment.
 */

import { useId, type CSSProperties } from 'react';

export interface ChipProps {
  /** Hex (#RRGGBB) chip body color. Falls back to a deep red. */
  color?: string;
  /** Diameter in px. */
  size?: number;
  /** Renders the gold (rare) treatment. */
  gold?: boolean;
  /** Optional denomination/text drawn at the chip center; if absent, draws a chrysanthemum pip. */
  denom?: string | number;
  /** Number of edge spots — 8 reads classic; 6 fits smaller chips better. */
  spots?: number;
  /** Extra wrapper styling — useful for layout (margins) or stack offset. */
  style?: CSSProperties;
  ariaLabel?: string;
}

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, n));
}

/** Small color shifter — brightens (amt > 0) or darkens (amt < 0) a hex color. */
function shiftHex(hex: string, amt: number): string {
  if (!hex || hex[0] !== '#' || hex.length !== 7) {
    return amt > 0 ? '#ffffff' : '#000000';
  }
  const n = parseInt(hex.slice(1), 16);
  const r = clampByte(((n >> 16) & 255) + amt);
  const g = clampByte(((n >> 8) & 255) + amt);
  const b = clampByte((n & 255) + amt);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function Chip({
  color = '#a8302a',
  size = 28,
  gold = false,
  denom,
  spots = 8,
  style,
  ariaLabel,
}: ChipProps) {
  const id = useId();
  const cx = 50;
  const cy = 50;
  const r = 50;
  const ringR = 36;
  const spotR = 4.6;
  const spotInset = r - 6;

  const bodyDark = shiftHex(color, -28);
  const bodyLight = shiftHex(color, 22);

  const spotsArr = Array.from({ length: spots }).map((_, i) => {
    const angle = (i / spots) * Math.PI * 2 - Math.PI / 2;
    const sx = cx + Math.cos(angle) * spotInset;
    const sy = cy + Math.sin(angle) * spotInset;
    return { sx, sy, fill: i % 2 === 0 ? 'var(--color-ink)' : bodyDark };
  });

  return (
    <svg
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        display: 'block',
        filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5))',
        ...style,
      }}
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor={bodyLight} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={bodyDark} />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-gold)" />
          <stop offset="50%" stopColor="var(--color-gold-deep)" />
          <stop offset="100%" stopColor="var(--color-gold)" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="35%" cy="20%" r="60%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.55)" />
          <stop offset="40%" stopColor="rgba(255, 255, 255, 0.08)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
      </defs>

      {/* outer rim shadow */}
      <circle cx={cx} cy={cy} r={r - 1} fill={bodyDark} />
      {/* body */}
      <circle cx={cx} cy={cy} r={r - 2} fill={`url(#${id}-body)`} />

      {/* edge spots */}
      {spotsArr.map((s, i) => (
        <g key={i}>
          <circle cx={s.sx} cy={s.sy} r={spotR + 0.5} fill={bodyDark} opacity="0.5" />
          <circle cx={s.sx} cy={s.sy} r={spotR} fill={s.fill} />
        </g>
      ))}

      {/* hairline between rim and inner */}
      <circle cx={cx} cy={cy} r={ringR + 4} fill="none" stroke={bodyDark} strokeWidth="0.6" />

      {/* gold inner ring */}
      <circle
        cx={cx}
        cy={cy}
        r={ringR + 2.5}
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.4"
      />
      <circle
        cx={cx}
        cy={cy}
        r={ringR}
        fill={gold ? 'var(--color-gold)' : color}
        opacity={gold ? 0.95 : 0.92}
      />
      <circle
        cx={cx}
        cy={cy}
        r={ringR}
        fill={gold ? `url(#${id}-body)` : 'none'}
        opacity="0.25"
      />
      <circle
        cx={cx}
        cy={cy}
        r={ringR - 2}
        fill="none"
        stroke={gold ? 'var(--color-gold-deep)' : shiftHex(color, -15)}
        strokeWidth="0.4"
        opacity="0.8"
      />

      {/* center motif: denom or chrysanthemum pip */}
      {denom !== undefined ? (
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily='"DM Serif Display", "Cormorant Garamond", serif'
          fontWeight="700"
          fontSize={
            String(denom).length >= 3 ? 22 : String(denom).length === 2 ? 28 : 34
          }
          fill={gold ? 'var(--color-bg)' : 'var(--color-ink)'}
          stroke={gold ? 'var(--color-gold-deep)' : 'rgba(0, 0, 0, 0.4)'}
          strokeWidth="0.4"
        >
          {denom}
        </text>
      ) : (
        <g transform={`translate(${cx}, ${cy})`}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const px = Math.cos(angle) * 8;
            const py = Math.sin(angle) * 8;
            return (
              <ellipse
                key={i}
                cx={px}
                cy={py}
                rx="2"
                ry="4"
                fill={gold ? 'var(--color-gold-deep)' : 'var(--color-ink)'}
                transform={`rotate(${(i / 8) * 360}, ${px}, ${py})`}
                opacity="0.85"
              />
            );
          })}
          <circle
            cx="0"
            cy="0"
            r="2.6"
            fill={gold ? 'var(--color-bg)' : 'var(--color-gold)'}
          />
        </g>
      )}

      {/* glassy top shine */}
      <circle cx={cx} cy={cy} r={r - 2} fill={`url(#${id}-shine)`} />
      {/* hairline highlight on rim */}
      <path
        d={`M ${cx - r + 4} ${cy - 8} A ${r - 4} ${r - 4} 0 0 1 ${cx + r - 14} ${cy - r + 14}`}
        fill="none"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** GoldChip — chrome wrapper with surrounding glow halo. */
export function GoldChip({
  size = 28,
  denom = '★',
  style,
  ariaLabel,
}: Omit<ChipProps, 'gold' | 'color'>) {
  const childProps: ChipProps = {
    color: '#e8c682',
    size,
    gold: true,
    denom,
  };
  if (ariaLabel !== undefined) childProps.ariaLabel = ariaLabel;
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: -10,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, var(--color-gold-glow) 0%, transparent 65%)',
          filter: 'blur(5px)',
          pointerEvents: 'none',
        }}
      />
      <Chip {...childProps} />
    </span>
  );
}
