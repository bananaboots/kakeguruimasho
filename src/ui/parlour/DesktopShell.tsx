/**
 * DesktopShell — three-pane chassis.
 *
 * Renders LeftRail · main · RightRail at every breakpoint; CSS hides
 * the rails at <1024px so mobile renders unchanged. The right rail's
 * widget content is provided by App.tsx via the rail prop.
 */
import type { ReactNode } from 'react';
import { LeftRail } from './LeftRail.tsx';
import { RightRail, type RightRailProps } from './RightRail.tsx';

export interface DesktopShellProps {
  children: ReactNode;
  rail?: RightRailProps;
}

export function DesktopShell({ children, rail }: DesktopShellProps) {
  return (
    <div className="desktop-shell">
      <LeftRail />
      <div className="desktop-shell__main">{children}</div>
      <RightRail {...(rail ?? {})} />
    </div>
  );
}
