/**
 * PachinkoMasthead — engraved page header (existing parlour-masthead pattern).
 *
 * Wraps the inline `<header className="parlour-masthead">…</header>` block
 * that every route currently inlines. Children are route-supplied
 * (kicker, title, tagline, optional motif/cog). At theme=pachinko this
 * must render byte-identical DOM to the pre-extraction inline pattern —
 * a snapshot test in Masthead.test.tsx guards this.
 */

import type { ReactElement, ReactNode } from 'react';
import { cn } from '../utils.ts';

export interface PachinkoMastheadProps {
  /** Route-supplied content: kicker, title, tagline, motif, cog. */
  children: ReactNode;
  /** Extra className for route-specific tuning. */
  className?: string;
}

export function PachinkoMasthead({
  children,
  className,
}: PachinkoMastheadProps): ReactElement {
  return (
    <header
      className={cn('parlour-masthead', className)}
      data-testid="pachinko-masthead"
    >
      {children}
    </header>
  );
}
