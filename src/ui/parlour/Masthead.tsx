/**
 * Masthead — theme-driven page-header dispatcher.
 *
 * Reads `themeMeta.visual?.masthead` and renders the appropriate variant.
 * Falls back to PachinkoMasthead (engraved) when `themeMeta.visual` is
 * undefined.
 */

import type { ReactElement, ReactNode } from 'react';
import { useTheme } from '../../styles/theme-context.ts';
import { PachinkoMasthead } from './PachinkoMasthead.tsx';
import { KowloonMasthead } from '../../features/kowloon/KowloonMasthead.tsx';

export interface MastheadProps {
  children: ReactNode;
  className?: string;
}

export function Masthead({
  children,
  className,
}: MastheadProps): ReactElement {
  const { themeMeta } = useTheme();
  const childProps = className !== undefined ? { className } : {};
  switch (themeMeta.visual?.masthead ?? 'engraved') {
    case 'neon-vertical':
      return <KowloonMasthead {...childProps}>{children}</KowloonMasthead>;
    case 'engraved':
      return <PachinkoMasthead {...childProps}>{children}</PachinkoMasthead>;
  }
}
