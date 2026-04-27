/**
 * StreakDisplay — daily streak chip.
 *
 * Self-care streak removed 2026-04-26 as redundant with the daily streak.
 * Bonus-chain removed 2026-04-26: it counted consecutive bonus-timer
 * completions but had no payout attached, so the chip carried no signal.
 *
 * "Complete today" visual emphasis is driven by
 * `selectDailyStreakCompleteToday(jarId)`.
 */

import { type ReactElement } from 'react';
import { Flame } from 'lucide-react';
import { useAppStore } from '../../state/store.ts';
import {
  selectDailyStreakCompleteToday,
} from '../../state/selectors.ts';
import type { JarId } from '../../types/ids.ts';

type IconCmp = React.ComponentType<
  React.SVGProps<SVGSVGElement> & { size?: number | string }
>;

interface ChipSpec {
  id: 'daily';
  label: string;
  icon: IconCmp;
  current: number;
  longest: number;
  activeToday?: boolean;
}

export interface StreakDisplayProps {
  jarId: JarId;
}

export function StreakDisplay({ jarId }: StreakDisplayProps): ReactElement {
  const streakState = useAppStore((s) => s.streaks[jarId]);
  const dailyComplete = useAppStore((s) => selectDailyStreakCompleteToday(s, jarId));

  // React Compiler handles memoization automatically; a manual useMemo here
  // produced a preserve-manual-memoization warning because the compiler
  // inferred finer-grained deps (streakState.daily.current, etc.) than the
  // declared [streakState, dailyComplete].
  const chips: ChipSpec[] = !streakState
    ? []
    : [
        {
          id: 'daily',
          label: 'Daily streak',
          icon: Flame as unknown as IconCmp,
          current: streakState.daily.current,
          longest: streakState.daily.longest,
          activeToday: dailyComplete,
        },
      ];

  if (chips.length === 0) return <div className="streak-display" data-testid="streak-display" />;

  return (
    <div
      className="streak-display"
      role="list"
      aria-label="Streaks"
      data-testid="streak-display"
      // a11y: the row is overflow-x: auto on narrow viewports so keyboard
      // users need a focusable scroll handle. tabIndex=0 lets them focus +
      // arrow-scroll; Phase 4 a11y audit caught this.
      tabIndex={0}
    >
      {chips.map((chip) => (
        <div
          key={chip.id}
          role="listitem"
          className={`streak-chip ${chip.activeToday ? 'streak-chip--active-today' : ''}`}
          data-testid={`streak-chip-${chip.id}`}
        >
          <span className="streak-chip__icon" aria-hidden="true">
            <chip.icon size={18} />
          </span>
          <span className="streak-chip__body">
            <span className="streak-chip__label">{chip.label}</span>
            <span className="streak-chip__values">
              {chip.current}
              <span className="streak-chip__longest" aria-label={`longest ${chip.longest}`}>
                / {chip.longest}
              </span>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
