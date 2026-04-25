/**
 * GoldInstantT3Button — short-circuit that redeems 1 gold clip for an
 * instant T3 reward (spec §5.5, A6, A7).
 *
 * Contract with PostSpinFlow:
 *   - Visible only when hand has ≥ 1 gold clip.
 *   - Tapping this:
 *       1. Returns exactly one gold clip to the bag (A7).
 *       2. Opens the T3 reward picker (logged as `source: 'gold'`).
 *       3. Skips the wheel entirely.
 *   - This component doesn't perform those side effects itself — it calls
 *     `onRedeemGold(goldClipId)` and lets the parent run the flow. That way
 *     the parent's FSM stays authoritative (A9, etc.).
 */

import type { ReactElement } from 'react';

import type { Clip } from '../../types/clip.ts';
import type { ClipId } from '../../types/ids.ts';

import './spin.css';

export type GoldInstantT3ButtonProps = {
  /** The user's current hand. Filtered internally for gold. */
  hand: Clip[];
  /** Called with the id of the specific gold clip to redeem. */
  onRedeemGold: (goldClipId: ClipId) => void;
  /** A9 freeze: disables the button while spin flow is non-idle. */
  disabled?: boolean;
  className?: string;
};

export function GoldInstantT3Button({
  hand,
  onRedeemGold,
  disabled = false,
  className,
}: GoldInstantT3ButtonProps): ReactElement | null {
  const goldClips = hand.filter((c) => c.kind === 'gold');
  if (goldClips.length === 0) return null;

  const handleTap = (): void => {
    if (disabled) return;
    // Redeem the first gold clip; the rest stay in hand.
    const picked = goldClips[0]!;
    onRedeemGold(picked.id);
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={disabled}
      className={cn('tier-row', 'tier-row--gold', className)}
      data-testid="gold-instant-t3"
      aria-label="Redeem 1 gold clip for instant Tier 3 reward"
    >
      <span className="tier-row__badge tier-row__badge--gold" aria-hidden>
        ★
      </span>
      <span className="tier-row__body">
        <span className="tier-row__desc">Instant T3 — no spin</span>
        <span className="tier-row__cost">
          1 Gold Ball ready ({goldClips.length} in hand)
        </span>
      </span>
      <span
        className="tier-row__status"
        aria-hidden
        data-state="gold"
      >
        ★
      </span>
    </button>
  );
}

function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export default GoldInstantT3Button;
