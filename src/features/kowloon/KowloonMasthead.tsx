/**
 * KowloonMasthead — neon-vertical page header for the Kowloon theme.
 *
 * Wraps a `<header>` with `parlour-masthead parlour-masthead--neon` so the
 * existing route-supplied children (kicker / title / tagline) re-skin
 * via CSS variables. No additional JSX is added — keeping the dispatcher
 * a pure presentational swap and avoiding hardcoded copy that would
 * mismatch route context (e.g. "HALL · 9F" on the Jar route).
 *
 * Routes that want bespoke Kowloon signage (e.g. a NeonSign brand mark
 * on Home) can render it as part of the children passed to <Masthead>.
 */

import type { ReactElement, ReactNode } from 'react';

import './kowloon-screens.css';
import { cn } from '../../ui/utils.ts';

export interface KowloonMastheadProps {
  children: ReactNode;
  className?: string;
}

export function KowloonMasthead({
  children,
  className,
}: KowloonMastheadProps): ReactElement {
  return (
    <header
      className={cn('parlour-masthead', 'parlour-masthead--neon', className)}
      data-testid="kowloon-masthead"
    >
      {children}
    </header>
  );
}
