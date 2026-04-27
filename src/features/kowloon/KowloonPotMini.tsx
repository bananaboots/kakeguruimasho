/**
 * KowloonPotMini — right-rail token-tray widget for the Kowloon theme.
 *
 * Reads the same data as PachinkoPotMini (jar total + next unclaimed
 * milestone label/target). Renders as an arcade token tray with a pixel
 * font label, the current bank ($total), and the next-milestone target.
 */

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { useAppStore } from '../../state/store.ts';
import { selectJarTotal } from '../../state/selectors.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import type { JarId } from '../../types/ids.ts';
import { ArcadeToken } from '../../ui/kowloon/ArcadeToken.tsx';
import { pickNextMilestoneId } from '../jar/pickNextMilestone.ts';

export interface KowloonPotMiniProps {
  jarId?: JarId;
}

const TOKEN_COLORS = ['#ff2e88', '#22e3ff', '#1bd182', '#c855ff', '#f5d547'] as const;

export function KowloonPotMini({
  jarId = DEFAULT_JAR_ID,
}: KowloonPotMiniProps = {}): ReactElement {
  const total = useAppStore((s) => selectJarTotal(s, jarId));
  // Subscribe to primitives only — see note in PachinkoPotMini.
  const nextId = useAppStore((s) => pickNextMilestoneId(s.jars[jarId], total));
  const nextLabel = useAppStore((s) =>
    nextId ? s.jars[jarId]?.milestones[nextId]?.label ?? null : null,
  );
  const nextTarget = useAppStore((s) =>
    nextId ? s.jars[jarId]?.milestones[nextId]?.target ?? null : null,
  );

  const ariaLabel =
    nextLabel != null && nextTarget != null
      ? `Pot ${total} of ${nextTarget} dollars toward ${nextLabel}`
      : `Pot ${total} dollars`;

  return (
    <Link
      to="/jar"
      className="kowloon-pot-mini"
      data-testid="kowloon-pot-mini"
      aria-label={ariaLabel}
    >
      <div className="kowloon-pot-mini__label">TOKEN TRAY</div>
      <div className="kowloon-pot-mini__row" aria-hidden>
        {TOKEN_COLORS.map((color, i) => (
          <ArcadeToken key={color} color={color} denom={String(i + 1)} size={28} />
        ))}
      </div>
      <div className="kowloon-pot-mini__count">${total.toLocaleString()}</div>
      {nextLabel != null && nextTarget != null ? (
        <div className="kowloon-pot-mini__sub">
          / ${nextTarget.toLocaleString()} · {nextLabel}
        </div>
      ) : (
        <div className="kowloon-pot-mini__sub">SET A MILESTONE</div>
      )}
    </Link>
  );
}
