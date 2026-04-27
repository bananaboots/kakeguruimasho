/**
 * Context value + hook + types for SpinRailContext.
 *
 * Lives in its own non-component module so SpinRailContext.tsx (the
 * provider component) doesn't trip the
 * react-refresh/only-export-components rule.
 */
import { createContext, useContext } from 'react';
import type { ClipColor } from '../../types/clip.ts';
import type { Tier } from '../../types/wheel.ts';

export interface SpinStakeSummary {
  /** Display label, e.g. "Blue", "Mixed", "Gold". */
  label: string;
  /** Single color when all stake clips share one; null when mixed. */
  color: ClipColor | 'gold' | null;
  /** How many clips the user has staked. */
  count: number;
  /** Tier this stake unlocks (T1 / T2 / T3). */
  unlockedTier: Tier;
}

export interface SpinRailValue {
  stake: SpinStakeSummary | null;
  setStake: (next: SpinStakeSummary | null) => void;
}

export const SpinRailCtx = createContext<SpinRailValue>({
  stake: null,
  setStake: () => {
    /* no-op outside provider */
  },
});

export function useSpinRail(): SpinRailValue {
  return useContext(SpinRailCtx);
}
