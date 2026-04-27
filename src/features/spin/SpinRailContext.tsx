/**
 * SpinRailContext — ephemeral cross-tree communication for the desktop
 * right-rail stake summary.
 *
 * Provider only — useSpinRail and SpinStakeSummary live in
 * SpinRailContext.shared.ts so this file satisfies the
 * react-refresh/only-export-components rule.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  SpinRailCtx,
  type SpinStakeSummary,
} from './SpinRailContext.shared.ts';

export function SpinRailProvider({ children }: { children: ReactNode }) {
  const [stake, setStake] = useState<SpinStakeSummary | null>(null);
  const value = useMemo(() => ({ stake, setStake }), [stake]);
  return <SpinRailCtx.Provider value={value}>{children}</SpinRailCtx.Provider>;
}
