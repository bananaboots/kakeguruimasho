// appMeta slice: schemaVersion, activeJarId, install/firstRun flags.

import type { AppState } from '../../types/app-state.ts';

export function markFirstRunCompleted(state: AppState): AppState {
  if (state.firstRunCompleted) return state;
  return { ...state, firstRunCompleted: true };
}

export function markInstallPromptShown(state: AppState): AppState {
  if (state.installPromptShown) return state;
  return { ...state, installPromptShown: true };
}
