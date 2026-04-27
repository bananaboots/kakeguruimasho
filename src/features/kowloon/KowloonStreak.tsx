/**
 * KowloonStreak — LED-bar streak ribbon for the Kowloon theme.
 *
 * Reads the same store selectors as PachinkoStreak (daily current +
 * longest from `state.streaks[jarId].daily`). Renders as a thin
 * cyan-glow LED bar with the streak count in pixel font.
 */

import type { ReactElement } from 'react';

import { useAppStore } from '../../state/store.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import type { JarId } from '../../types/ids.ts';

export interface KowloonStreakProps {
  jarId?: JarId;
}

export function KowloonStreak({
  jarId = DEFAULT_JAR_ID,
}: KowloonStreakProps = {}): ReactElement {
  const current = useAppStore((s) => s.streaks[jarId]?.daily.current ?? 0);
  const best = useAppStore((s) => s.streaks[jarId]?.daily.longest ?? 0);

  return (
    <div
      className="kowloon-streak"
      data-testid="kowloon-streak"
      aria-label={`Streak ${current} days, best ${best}`}
    >
      <div className="kowloon-streak__bar">
        <div className="kowloon-streak__label">STREAK</div>
        <div className="kowloon-streak__count">{current}</div>
        <div className="kowloon-streak__sep">·</div>
        <div className="kowloon-streak__best">BEST {best}</div>
      </div>
    </div>
  );
}
