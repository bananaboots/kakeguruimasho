// Hygiene bundle slice (§5.8, A5).

import type { AppState } from '../../types/app-state.ts';
import type { HygieneBundleState } from '../../types/habit.ts';
import type { ISOTimestamp, JarId, LocalDate } from '../../types/ids.ts';
import { DEFAULT_HABIT_IDS } from '../../data/defaults.ts';

export function setHygieneBundle(
  state: AppState,
  jarId: JarId,
  bundle: HygieneBundleState | null,
): AppState {
  return {
    ...state,
    pendingHygieneBundle: { ...state.pendingHygieneBundle, [jarId]: bundle },
  };
}

export function checkHygieneSubItem(
  state: AppState,
  jarId: JarId,
  subItem: string,
  at: ISOTimestamp,
): AppState {
  const bundle = state.pendingHygieneBundle[jarId];
  if (!bundle) return state;
  return setHygieneBundle(state, jarId, {
    ...bundle,
    subItemsCompleted: { ...bundle.subItemsCompleted, [subItem]: at },
  });
}

export function uncheckHygieneSubItem(
  state: AppState,
  jarId: JarId,
  subItem: string,
): AppState {
  const bundle = state.pendingHygieneBundle[jarId];
  if (!bundle) return state;
  return setHygieneBundle(state, jarId, {
    ...bundle,
    subItemsCompleted: { ...bundle.subItemsCompleted, [subItem]: null },
  });
}

export function markHygieneAwarded(
  state: AppState,
  jarId: JarId,
  at: ISOTimestamp,
): AppState {
  const bundle = state.pendingHygieneBundle[jarId];
  if (!bundle) return state;
  return setHygieneBundle(state, jarId, { ...bundle, awarded: true, awardedAt: at });
}

/**
 * Build a fresh hygiene bundle for the given date, reusing the user's
 * hygiene habit sub-items + cutoff. Replaces the current bundle entirely.
 */
export function resetHygieneBundle(
  state: AppState,
  jarId: JarId,
  date: LocalDate,
): AppState {
  const hygiene = state.habits.find((h) => h.id === DEFAULT_HABIT_IDS.hygiene);
  const subItems =
    hygiene && hygiene.unit.kind === 'bundle' ? hygiene.unit.subItems : [];
  const cutoffLocal =
    (hygiene && hygiene.unit.kind === 'bundle'
      ? hygiene.unit.cutoffLocal
      : state.settings.hygieneCutoffLocal) ?? '01:00';

  const subItemsCompleted: Record<string, ISOTimestamp | null> = {};
  for (const k of subItems) subItemsCompleted[k] = null;

  const fresh: HygieneBundleState = {
    jarId,
    date,
    subItemsCompleted,
    cutoffLocal,
    awarded: false,
    awardedAt: null,
  };
  return setHygieneBundle(state, jarId, fresh);
}
