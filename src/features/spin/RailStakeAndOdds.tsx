/**
 * RailStakeAndOdds — desktop right-rail panel for the /spin route.
 *
 * Shows the user's current stake (live from <SpinRailContext>) above
 * the static <WheelOddsStrip>. Renders an "empty stake" hint until
 * the user picks a tier so the rail isn't dead space.
 */
import type { ReactElement } from 'react';
import { useAppStore } from '../../state/store.ts';
import { Chip, GoldChip, Label } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from './clip-colors.ts';
import { useSpinRail } from './SpinRailContext.shared.ts';
import { WheelOddsStrip } from './WheelOddsStrip.tsx';
import './spin.css';

export function RailStakeAndOdds(): ReactElement {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const { stake } = useSpinRail();
  const stakeChips =
    stake !== null
      ? Array.from({ length: Math.min(stake.count, 4) }, (_, i) => i)
      : [];

  return (
    <div className="rail-spin">
      <div className="rail-spin__title">段 · Stake</div>
      {stake === null ? (
        <Label size={9} style={{ marginBottom: 'var(--space-3)' }}>
          No stake yet — pick a tier
        </Label>
      ) : (
        <>
          <Label
            size={9}
            style={{ marginBottom: 'var(--space-1)' }}
          >
            {stake.count} × {stake.label} · {stake.unlockedTier}
          </Label>
          <div className="rail-spin__chips">
            {stakeChips.map((i) =>
              stake.color === 'gold' ? (
                <GoldChip key={i} size={20} />
              ) : (
                <Chip
                  key={i}
                  color={
                    stake.color === null ? '#e8c682' : CLIP_HEX[stake.color]
                  }
                  size={20}
                />
              ),
            )}
          </div>
        </>
      )}
      <div className="rail-spin__odds">
        <div className="rail-spin__title">配当 · Odds</div>
        <WheelOddsStrip jarId={activeJarId} />
      </div>
    </div>
  );
}
