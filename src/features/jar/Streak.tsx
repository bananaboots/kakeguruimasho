/**
 * Streak — theme-driven streak dispatcher.
 *
 * Reads `themeMeta.visual?.streak` and renders the appropriate variant.
 * Falls back to the Pachinko variant when `themeMeta.visual` is undefined
 * (the six stub themes leave `visual` unset).
 */

import type { ReactElement } from 'react';

import { useTheme } from '../../styles/theme-context.ts';
import { PachinkoStreak } from './PachinkoStreak.tsx';
import { KowloonStreak } from '../kowloon/KowloonStreak.tsx';
import type { JarId } from '../../types/ids.ts';

export interface StreakProps {
  jarId?: JarId;
}

export function Streak({ jarId }: StreakProps = {}): ReactElement {
  const { themeMeta } = useTheme();
  const props = jarId !== undefined ? { jarId } : {};
  switch (themeMeta.visual?.streak ?? 'lantern') {
    case 'led-bar':
      return <KowloonStreak {...props} />;
    case 'lantern':
      return <PachinkoStreak {...props} />;
  }
}
