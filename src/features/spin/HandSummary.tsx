/**
 * HandSummary — Home-screen card summarizing the current hand (3E, Phase 4).
 *
 * Links to /spin, shows clip count and (if any) a subtle gold-clip hint.
 * 3G originally inlined a placeholder on Home; Phase 4 promotes it into
 * the spin feature barrel so Home imports the real component.
 */

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../state/store.ts';
import { selectHand } from '../../state/selectors.ts';
import type { JarId } from '../../types/ids.ts';

export interface HandSummaryProps {
  jarId?: JarId;
}

export function HandSummary({ jarId }: HandSummaryProps = {}): ReactElement {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const resolvedJarId = jarId ?? activeJarId;
  const hand = useAppStore((s) => selectHand(s, resolvedJarId));
  const size = hand.length;
  const goldCount = hand.filter((c) => c.kind === 'gold').length;

  const label =
    size === 0
      ? 'No clips in hand yet — log a habit to start.'
      : `${size} ${size === 1 ? 'clip' : 'clips'} in hand${
          goldCount > 0 ? ` · ${goldCount} gold` : ''
        } — tap to spin`;

  return (
    <Link
      to="/spin"
      className="placeholder-card hand-summary-card"
      data-testid="hand-summary"
      aria-label={label}
    >
      <strong>
        Hand: {size} {size === 1 ? 'clip' : 'clips'}
        {goldCount > 0 ? ` · ${goldCount} gold` : ''}
      </strong>
      <span>{size === 0 ? 'Log a habit to earn one.' : 'Tap to spin.'}</span>
    </Link>
  );
}

export default HandSummary;
