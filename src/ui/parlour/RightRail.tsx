/**
 * RightRail — desktop ledger rail.
 *
 * Stacks Bonus + Pot + Recent Pulls (in that visual order). Hidden at
 * <1024px. Each section is optional so empty rails (e.g. no active timer)
 * collapse cleanly.
 */
import type { ReactNode } from 'react';

export interface RightRailProps {
  bonus?: ReactNode;
  pot?: ReactNode;
  recent?: ReactNode;
}

export function RightRail({ bonus, pot, recent }: RightRailProps) {
  const hasContent = Boolean(bonus || pot || recent);
  return (
    <aside
      className="right-rail"
      aria-label="Activity ledger"
      data-empty={hasContent ? undefined : 'true'}
    >
      {bonus ? <section className="right-rail__section">{bonus}</section> : null}
      {pot ? <section className="right-rail__section">{pot}</section> : null}
      {recent ? <section className="right-rail__section">{recent}</section> : null}
    </aside>
  );
}
