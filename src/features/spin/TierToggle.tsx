/**
 * TierToggle — a 3-segment tier picker (T1 / T2 / T3) shown above the
 * "Pull the Lever" button. T1 is always available; T2 and T3 light up
 * once the user has staked enough chips of the selected color in HandView
 * (≥2 for T2, ≥3 for T3). Picking T1 means a free spin (no chips staked).
 */

import type { ReactElement } from 'react';
import type { Tier } from '../../types/wheel.ts';
import { cn } from '../../ui/utils.ts';
import './spin.css';

export interface TierToggleProps {
  value: Tier;
  onChange: (next: Tier) => void;
  /** Counts available of the currently-selected color (0 if no color). */
  availableForSelectedColor: number;
  disabled?: boolean;
}

const TIER_LABELS: Record<Tier, { label: string; sub: string }> = {
  T1: { label: 'Tier 1', sub: 'No stake' },
  T2: { label: 'Tier 2', sub: '2 chips' },
  T3: { label: 'Tier 3', sub: '3 chips' },
};

export function TierToggle({
  value,
  onChange,
  availableForSelectedColor,
  disabled = false,
}: TierToggleProps): ReactElement {
  const t2Enabled = availableForSelectedColor >= 2;
  const t3Enabled = availableForSelectedColor >= 3;
  const isEnabled = (t: Tier): boolean => {
    if (disabled) return false;
    if (t === 'T1') return true;
    if (t === 'T2') return t2Enabled;
    return t3Enabled;
  };
  return (
    <div
      className="tier-toggle"
      role="radiogroup"
      aria-label="Pick a tier to roll for"
    >
      {(['T1', 'T2', 'T3'] as Tier[]).map((t) => {
        const enabled = isEnabled(t);
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={value === t}
            disabled={!enabled}
            onClick={() => enabled && onChange(t)}
            className={cn(
              'tier-toggle__option',
              value === t && 'tier-toggle__option--selected',
            )}
            data-testid={`tier-toggle-${t}`}
          >
            <span className="tier-toggle__label">{TIER_LABELS[t].label}</span>
            <span className="tier-toggle__sub">{TIER_LABELS[t].sub}</span>
          </button>
        );
      })}
    </div>
  );
}
