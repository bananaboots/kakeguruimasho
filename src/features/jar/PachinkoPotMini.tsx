/**
 * PachinkoPotMini — koi-flanked condensed jar for Home.
 *
 * Source: `pachinko-screens.jsx:432`. Replaces the condensed `<JarVisual>`
 * snippet on Home with a card that surfaces the next unclaimed milestone:
 *   - 壺 · The Pot kicker
 *   - milestone label as engraved heading
 *   - tier sub-line (Mini / Mid / Moonshot tier name)
 *   - koi glyph
 *   - $current / $next progress bar with quarter-mark ticks
 *
 * Tap the card to open the full /jar route.
 */

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { useAppStore } from '../../state/store.ts';
import { selectJarTotal } from '../../state/selectors.ts';
import {
  DEFAULT_JAR_ID,
  MINI_MILESTONE_ID,
  MID_MILESTONE_ID,
  MOONSHOT_MILESTONE_ID,
} from '../../types/ids.ts';
import type { JarId, MilestoneId } from '../../types/ids.ts';
import { Engraved, Koi, Label } from '../../ui/parlour/index.ts';

export interface PachinkoPotMiniProps {
  jarId?: JarId;
}

const TIER_NAME: Record<string, string> = {
  [MINI_MILESTONE_ID]: 'Mini Tier',
  [MID_MILESTONE_ID]: 'Mid Tier',
  [MOONSHOT_MILESTONE_ID]: 'Moonshot',
};

function tierLabel(id: MilestoneId): string {
  return TIER_NAME[id] ?? 'Custom Tier';
}

/** Pick the next-up milestone id deterministically: smallest target whose
 * target is still ahead of `total`; if all targets passed, the highest. */
function pickNextMilestoneId(
  jar: { milestones: Record<MilestoneId, { target: number } | undefined>; claimed: Record<MilestoneId, unknown> } | undefined,
  total: number,
): MilestoneId | null {
  if (!jar) return null;
  const ids = Object.keys(jar.milestones) as MilestoneId[];
  const unclaimed = ids
    .filter((id) => {
      const m = jar.milestones[id];
      return !!m && m.target > 0 && jar.claimed[id] == null;
    })
    .sort((a, b) => jar.milestones[a]!.target - jar.milestones[b]!.target);
  if (unclaimed.length === 0) return null;
  const ahead = unclaimed.find((id) => jar.milestones[id]!.target > total);
  return ahead ?? unclaimed[unclaimed.length - 1] ?? null;
}

export function PachinkoPotMini({
  jarId = DEFAULT_JAR_ID,
}: PachinkoPotMiniProps = {}): ReactElement {
  const total = useAppStore((s) => selectJarTotal(s, jarId));
  // Subscribe to primitives only — returning {id,label,target} from the
  // selector creates a new object every store update and re-renders forever.
  const nextId = useAppStore((s) => pickNextMilestoneId(s.jars[jarId], total));
  const nextLabel = useAppStore((s) =>
    nextId ? s.jars[jarId]?.milestones[nextId]?.label ?? null : null,
  );
  const nextTarget = useAppStore((s) =>
    nextId ? s.jars[jarId]?.milestones[nextId]?.target ?? null : null,
  );
  const next = nextId && nextLabel != null && nextTarget != null
    ? { id: nextId, label: nextLabel, target: nextTarget }
    : null;

  if (!next) {
    return (
      <Link to="/jar" className="pot-mini" data-testid="pot-mini">
        <div className="pot-mini__row">
          <div className="pot-mini__heading">
            <Label size={9}>壺 · The Pot</Label>
            <Engraved size={17} align="left" style={{ marginTop: 4 }}>
              Set a milestone
            </Engraved>
            <Label size={8} style={{ marginTop: 2 }}>
              Open the jar to add one
            </Label>
          </div>
          <Koi size={42} />
        </div>
      </Link>
    );
  }

  const pct = next.target > 0 ? Math.min(100, (total / next.target) * 100) : 0;

  return (
    <Link
      to="/jar"
      className="pot-mini"
      data-testid="pot-mini"
      aria-label={`Pot ${total} of ${next.target} dollars toward ${next.label}`}
    >
      <div className="pot-mini__row">
        <div className="pot-mini__heading">
          <Label size={9}>壺 · The Pot</Label>
          <Engraved size={17} align="left" style={{ marginTop: 4 }}>
            {next.label}
          </Engraved>
          <Label size={8} style={{ marginTop: 2 }}>
            {tierLabel(next.id)}
          </Label>
        </div>
        <Koi size={42} />
      </div>
      <div className="pot-mini__amounts">
        <span className="pot-mini__amount">${total.toLocaleString()}</span>
        <span className="pot-mini__target">/ ${next.target.toLocaleString()}</span>
      </div>
      <div className="pot-mini__bar" aria-hidden>
        <div className="pot-mini__bar-fill" style={{ width: `${pct.toFixed(2)}%` }} />
        {[25, 50, 75].map((p) => (
          <div key={p} className="pot-mini__tick" style={{ left: `${p}%` }} />
        ))}
      </div>
    </Link>
  );
}

export default PachinkoPotMini;
