/**
 * PotMini — theme-driven jar/pot mini widget dispatcher.
 *
 * Reads `themeMeta.visual?.potMini` and renders the appropriate variant.
 * Falls back to PachinkoPotMini (koi-jar) when `themeMeta.visual` is
 * undefined (the six stub themes leave visual unset).
 */

import type { ReactElement } from 'react';

import { useTheme } from '../../styles/theme-context.ts';
import { PachinkoPotMini } from './PachinkoPotMini.tsx';
import { KowloonPotMini } from '../kowloon/KowloonPotMini.tsx';
import type { JarId } from '../../types/ids.ts';

export interface PotMiniProps {
  jarId?: JarId;
}

export function PotMini({ jarId }: PotMiniProps = {}): ReactElement {
  const { themeMeta } = useTheme();
  const childProps = jarId !== undefined ? { jarId } : {};
  switch (themeMeta.visual?.potMini ?? 'koi-jar') {
    case 'token-tray':
      return <KowloonPotMini {...childProps} />;
    case 'koi-jar':
      return <PachinkoPotMini {...childProps} />;
  }
}
