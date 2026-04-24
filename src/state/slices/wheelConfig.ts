// WheelConfig slice.

import type { AppState } from '../../types/app-state.ts';
import type { JarId } from '../../types/ids.ts';
import type { WheelConfig } from '../../types/wheel.ts';

export function setWheelConfig(
  state: AppState,
  jarId: JarId,
  patch: Partial<WheelConfig>,
): AppState {
  const current = state.wheelConfigs[jarId];
  if (!current) throw new Error(`No wheel config for jarId=${jarId}`);
  return {
    ...state,
    wheelConfigs: {
      ...state.wheelConfigs,
      [jarId]: { ...current, ...patch, jarId: current.jarId },
    },
  };
}
