// Settings slice.

import type { AppState } from '../../types/app-state.ts';
import type { Settings } from '../../types/settings.ts';

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  return {
    ...state,
    settings: { ...state.settings, ...patch },
  };
}
