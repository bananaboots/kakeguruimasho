/**
 * useIsDesktop — true at viewport widths ≥ 1024px.
 *
 * The desktop chassis lives in CSS; this hook only exists for the
 * 2-3 JSX branches that genuinely need different React trees at
 * desktop (mounting BonusTimerBanner only at mobile; picking Drawer
 * mode; layout swaps for Spin and Jar).
 */
import { useEffect, useState } from 'react';

const QUERY = '(min-width: 1024px)';

export function useIsDesktop(): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent): void => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return matches;
}
