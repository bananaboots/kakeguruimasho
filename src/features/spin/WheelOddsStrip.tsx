import { useAppStore } from '../../state/store.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import type { JarId } from '../../types/ids.ts';
import type { MainWheelTier } from '../../types/wheel.ts';

type OddsRow = { jp: string; tier: MainWheelTier; varName: string };

const ODDS_ROWS: readonly OddsRow[] = [
  { jp: '一', tier: 'T1',      varName: '--clip-red' },
  { jp: '二', tier: 'T2',      varName: '--clip-blue' },
  { jp: '三', tier: 'T3',      varName: '--clip-purple' },
  { jp: '副', tier: 'BONUS',   varName: '--clip-green' },
  { jp: '★', tier: 'JACKPOT', varName: '--color-gold' },
] as const;

export type WheelOddsStripProps = {
  jarId?: JarId;
};

export function WheelOddsStrip({ jarId = DEFAULT_JAR_ID }: WheelOddsStripProps) {
  const cfg = useAppStore((s) => s.wheelConfigs[jarId]);
  const weights = cfg?.weights;
  return (
    <div className="wheel-odds" aria-label="Wheel odds">
      <div className="wheel-odds__label">Odds</div>
      {ODDS_ROWS.map((row) => {
        const pct = weights ? Math.round(weights[row.tier] * 100) : null;
        return (
          <div key={row.tier} className="wheel-odds__cell">
            <span
              className="wheel-odds__glyph"
              style={{ color: `var(${row.varName})` }}
              aria-hidden
            >
              {row.jp}
            </span>
            <span className="wheel-odds__pct">
              {pct !== null ? `${pct}%` : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
