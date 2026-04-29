/**
 * JarVisual — the jar SVG that progressively fills toward Moonshot (D1).
 *
 * Mobile-first cylindrical jar. Mini / Mid / Moonshot tick marks live along
 * the fill (one cumulative jar — D1). Moonshot tick is gold-accented.
 *
 * Framer Motion is dynamically imported via React.lazy so the motion chunk
 * stays out of the shell bundle (ARCHITECTURE §9.4). A static fallback rect
 * is rendered during the brief Suspense window so the jar is never blank.
 *
 * Accessibility:
 *  - `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
 *  - `aria-valuetext` reads e.g. "$42 of $100 toward Mini".
 *  - Unclaimed unlocks render as real buttons below the jar for keyboard users.
 *
 * D1 behavior:
 *  - Tapping an unclaimed Mini/Mid unlock opens the claim modal.
 *  - Tapping the Moonshot unlock opens the claim modal, which itself requires
 *    a confirm step before firing `resetJar`.
 */

import { lazy, Suspense, useMemo, useState, type ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import { useAppStore } from '../../state/store.ts';
import { selectJarTotal } from '../../state/selectors.ts';
import type { JarId, MilestoneId } from '../../types/ids.ts';
import { MOONSHOT_MILESTONE_ID } from '../../types/ids.ts';
import type { Milestone } from '../../types/jar.ts';
import { formatDollars } from './format.ts';
import { MilestoneClaimModal } from './MilestoneClaimModal.tsx';

const JarFillMotion = lazy(() => import('./JarFillMotion.tsx'));

// ---- SVG viewport math ----

const VB_W = 160;
const VB_H = 220;
const LIP_Y = 24; // top of the jar opening
const RIM_Y = 32; // underside of the rim
const BASE_Y = 204; // floor of the jar
const WALL_X = 20; // outer wall thickness — inner inset
const INNER_X = WALL_X;
const INNER_Y = RIM_Y + 2;
const INNER_W = VB_W - WALL_X * 2;
const INNER_H = BASE_Y - INNER_Y - 2;

/** Sort milestones by ascending dollar target so ticks render bottom-to-top. */
function orderedMilestoneIds(
  milestones: Record<MilestoneId, Milestone> | undefined,
): MilestoneId[] {
  if (!milestones) return [];
  return (Object.keys(milestones) as MilestoneId[])
    .filter((id) => milestones[id])
    .sort((a, b) => milestones[a]!.target - milestones[b]!.target);
}

export interface JarVisualProps {
  jarId: JarId;
  /**
   * Condensed rendering: used on the Home page's JarSnippet slot. Hides the
   * tick-mark labels and collapses the layout to row-form.
   */
  condensed?: boolean;
  /** Test hook: force the claim modal to start open with a given milestone. */
  initialClaimOpen?: MilestoneId | null;
}

export function JarVisual({
  jarId,
  condensed = false,
  initialClaimOpen = null,
}: JarVisualProps): ReactElement {
  const total = useAppStore((s) => selectJarTotal(s, jarId));
  const milestones = useAppStore((s) => s.jars[jarId]?.milestones);
  // Subscribe to the stable slices that drive unclaimed-unlock derivation,
  // then compute locally via useMemo. Returning a fresh array from a
  // Zustand v5 selector trips useSyncExternalStore's snapshot guard and
  // under the right conditions produces an "infinite loop" warning +
  // setState-loop crash in production (caught by Phase 4 E2E).
  const claimed = useAppStore((s) => s.jars[jarId]?.claimed);
  const orderedIds = useMemo(() => orderedMilestoneIds(milestones), [milestones]);
  const unclaimed = useMemo(() => {
    if (!milestones || !claimed) return [] as MilestoneId[];
    return orderedIds.filter((id) => {
      const m = milestones[id];
      const c = claimed[id];
      return m !== undefined && m.target > 0 && total >= m.target && c == null;
    });
  }, [milestones, claimed, total, orderedIds]);

  const [claimOpen, setClaimOpen] = useState<MilestoneId | null>(
    initialClaimOpen,
  );

  // Max is Moonshot target if > 0, else the max of configured milestones,
  // else 1 (so the svg math doesn't divide by zero).
  const max = useMemo(() => {
    if (!milestones) return 1;
    const moonshot = milestones[MOONSHOT_MILESTONE_ID]?.target ?? 0;
    if (moonshot > 0) return moonshot;
    let best = 1;
    for (const id of orderedIds) {
      const t = milestones[id]?.target ?? 0;
      if (t > best) best = t;
    }
    return best;
  }, [milestones, orderedIds]);

  const ratio = Math.max(0, Math.min(1, total / Math.max(1, max)));

  // Figure out the label of the next unclaimed milestone to display.
  const next = useMemo<Milestone | null>(() => {
    if (!milestones) return null;
    for (const id of orderedIds) {
      const m = milestones[id];
      if (m && m.target > 0 && total < m.target) return m;
    }
    return null;
  }, [milestones, total, orderedIds]);

  const valueText = next
    ? `${formatDollars(total)} of ${formatDollars(next.target)} toward ${next.label || next.id}`
    : `${formatDollars(total)} jar total`;

  const handleOpenClaim = (id: MilestoneId): void => setClaimOpen(id);
  const handleCloseClaim = (): void => setClaimOpen(null);

  return (
    <div
      className={`jar-visual ${condensed ? 'jar-visual--condensed' : ''}`}
      data-testid="jar-visual"
    >
      <svg
        className="jar-visual__svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={total}
        aria-valuetext={valueText}
      >
        {/* Glass body */}
        <defs>
          <clipPath id={`jar-inner-${jarId}`}>
            <rect
              x={INNER_X}
              y={INNER_Y}
              width={INNER_W}
              height={INNER_H}
              rx={8}
            />
          </clipPath>
        </defs>

        {/* Shadow / background */}
        <rect
          x={INNER_X}
          y={INNER_Y}
          width={INNER_W}
          height={INNER_H}
          rx={8}
          fill="var(--color-surface-2)"
        />

        {/* Animated fill (lazy-loaded Framer Motion). */}
        <g clipPath={`url(#jar-inner-${jarId})`}>
          <Suspense
            fallback={
              <rect
                x={INNER_X}
                y={INNER_Y + INNER_H * (1 - ratio)}
                width={INNER_W}
                height={INNER_H * ratio}
                fill="var(--color-accent)"
                rx={6}
              />
            }
          >
            <JarFillMotion
              ratio={ratio}
              width={VB_W}
              height={VB_H}
              innerX={INNER_X}
              innerY={INNER_Y}
              innerW={INNER_W}
              innerH={INNER_H}
              fill="var(--color-accent)"
            />
          </Suspense>
        </g>


        {/* Jar outline (after fill so it's on top). */}
        <rect
          x={WALL_X - 2}
          y={LIP_Y}
          width={VB_W - (WALL_X - 2) * 2}
          height={BASE_Y - LIP_Y}
          rx={10}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth={2}
        />
        {/* Rim */}
        <rect
          x={WALL_X - 6}
          y={LIP_Y - 6}
          width={VB_W - (WALL_X - 6) * 2}
          height={10}
          rx={4}
          fill="var(--color-surface-3)"
          stroke="var(--color-border-strong)"
          strokeWidth={2}
        />

        {/* Cork stopper — wider lower piece + narrower top piece. */}
        <rect
          x={16}
          y={9}
          width={VB_W - 32}
          height={9}
          fill="var(--color-gold-deep)"
          stroke="var(--color-gold)"
          strokeWidth={1}
        />
        <rect
          x={24}
          y={2}
          width={VB_W - 48}
          height={8}
          fill="var(--color-gold)"
        />

        {/* "LE POT" label sticker, centered on the jar body. */}
        <g className="jar-visual__label" aria-hidden="true">
          <rect
            x={50}
            y={120}
            width={60}
            height={44}
            fill="var(--color-bg)"
            stroke="var(--color-gold)"
            strokeWidth={1}
            opacity={0.9}
          />
          <text
            x={80}
            y={134}
            textAnchor="middle"
            fill="var(--color-gold)"
            fontFamily="var(--font-mono)"
            fontSize={9}
            letterSpacing="0.12em"
          >
            LE
          </text>
          <text
            x={80}
            y={148}
            textAnchor="middle"
            fill="var(--color-gold)"
            fontFamily="var(--font-display)"
            fontWeight={700}
            fontSize={13}
            letterSpacing="0.04em"
          >
            POT
          </text>
          <text
            x={80}
            y={160}
            textAnchor="middle"
            fill="var(--color-gold)"
            fontFamily="var(--font-mono)"
            fontSize={8}
            letterSpacing="0.1em"
          >
            {formatDollars(total)}
          </text>
        </g>

        {/* Milestone ticks (D1: all live on one cumulative jar, ordered by target). */}
        {milestones
          ? orderedIds.map((id) => {
              const m = milestones[id];
              if (!m || m.target <= 0) return null;
              const variant = id === MOONSHOT_MILESTONE_ID ? 'moonshot' : 'custom';
              const r = Math.max(0, Math.min(1, m.target / Math.max(1, max)));
              const y = INNER_Y + INNER_H * (1 - r);
              return (
                <g
                  key={id}
                  className={`jar-visual__tick-group jar-visual__tick-group--${variant}`}
                >
                  <line
                    x1={INNER_X - 4}
                    x2={INNER_X + INNER_W + 4}
                    y1={y}
                    y2={y}
                    className={`jar-visual__tick jar-visual__tick--${variant}`}
                  />
                  {!condensed ? (
                    <text
                      x={INNER_X + INNER_W + 8}
                      y={y + 3}
                      className={`jar-visual__tick-label jar-visual__tick-label--${variant}`}
                    >
                      {labelFor(id, m.label)}
                    </text>
                  ) : null}
                </g>
              );
            })
          : null}
      </svg>

      <div className="jar-visual__summary">
        <span className="jar-visual__total" aria-hidden="true">
          {formatDollars(total)}
        </span>
        {next ? (
          <span className="jar-visual__next">
            {next.label ? `${formatDollars(next.target - total)} to ${next.label}` : `${formatDollars(next.target - total)} to ${next.id}`}
          </span>
        ) : (
          <span className="jar-visual__next">Moonshot in reach</span>
        )}

        {unclaimed.length > 0 ? (
          <div className="jar-visual__unlocks" role="group" aria-label="Unclaimed milestones">
            {unclaimed.map((id) => {
              const isMoonshot = id === MOONSHOT_MILESTONE_ID;
              return (
                <Button
                  key={id}
                  variant={isMoonshot ? 'gold' : 'primary'}
                  size="sm"
                  className={`jar-visual__unlock-btn ${isMoonshot ? 'jar-visual__unlock-btn--moonshot' : ''}`}
                  onClick={() => handleOpenClaim(id)}
                  data-testid={`jar-visual-claim-${id}`}
                >
                  {labelFor(id, milestones?.[id]?.label)} unlocked
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>

      {claimOpen ? (
        <MilestoneClaimModal
          jarId={jarId}
          milestone={claimOpen}
          open={true}
          onClose={handleCloseClaim}
          onMoonshotReset={() => {
            // After reset, the Jar route re-opens the editor. Close the modal here.
            handleCloseClaim();
            // Signal parent via a DOM event so the route can open the editor
            // without coupling this component to routing.
            const ev = new CustomEvent('jar:reset-complete', {
              bubbles: true,
              detail: { jarId },
            });
            document.dispatchEvent(ev);
          }}
        />
      ) : null}
    </div>
  );
}

function labelFor(id: MilestoneId, label: string | undefined): string {
  if (label && label.trim().length > 0) return label;
  // The three canonical ids ('mini' / 'mid' / 'moonshot') look fine
  // title-cased. Custom ids are UUID-ish strings, so fall back to a
  // generic "Milestone" label if the user hasn't named them yet.
  if (id === 'mini' || id === 'mid' || id === MOONSHOT_MILESTONE_ID) {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
  return 'Milestone';
}
