/**
 * PachinkoStreak — lantern-flanked streak ribbon.
 *
 * Source: `pachinko-screens.jsx:253` (PachinkoStreak). Replaces the generic
 * `<StreakDisplay>` on the Home route. Renders the daily streak's current
 * count + best as engraved Roman numerals, flanked by paper-lantern glyphs.
 */

import type { ReactElement } from 'react';

import { useAppStore } from '../../state/store.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import type { JarId } from '../../types/ids.ts';
import { Engraved, Label, Lantern } from '../../ui/parlour/index.ts';

export interface PachinkoStreakProps {
  jarId?: JarId;
}

const ROMAN_PAIRS: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

function toRoman(n: number): string {
  if (n <= 0) return '—';
  let remainder = Math.floor(n);
  let out = '';
  for (const [value, glyph] of ROMAN_PAIRS) {
    while (remainder >= value) {
      out += glyph;
      remainder -= value;
    }
  }
  return out;
}

export function PachinkoStreak({
  jarId = DEFAULT_JAR_ID,
}: PachinkoStreakProps = {}): ReactElement {
  const current = useAppStore((s) => s.streaks[jarId]?.daily.current ?? 0);
  const best = useAppStore((s) => s.streaks[jarId]?.daily.longest ?? 0);
  const currentLabel =
    current === 0 ? '—' : current === 1 ? 'I NIGHT' : `${toRoman(current)} NIGHTS`;
  const bestLabel = best === 0 ? '—' : toRoman(best);

  return (
    <div
      className="pachinko-streak"
      data-testid="pachinko-streak"
      role="group"
      aria-label={`Daily streak ${current}, best ${best}`}
    >
      <div className="pachinko-streak__side">
        <Lantern size={32} />
        <div>
          <Label size={8}>連勝 · Current Streak</Label>
          <Engraved size={22} align="left" letter={0.06} style={{ marginTop: 2 }}>
            {currentLabel}
          </Engraved>
        </div>
      </div>
      <div className="pachinko-streak__divider" aria-hidden />
      <div className="pachinko-streak__side pachinko-streak__side--right">
        <div style={{ textAlign: 'right' }}>
          <Label size={8}>最高 · Best</Label>
          <Engraved size={22} align="right" letter={0.06} style={{ marginTop: 2 }}>
            {bestLabel}
          </Engraved>
        </div>
        <Lantern size={32} />
      </div>
    </div>
  );
}
