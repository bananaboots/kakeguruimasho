/**
 * reward-actions — feature-level bridge between the pure reward slice
 * reducers (3A, `src/state/slices/rewards.ts`) and the Zustand store.
 *
 * Why this exists: per WAVE1_3A_NOTES the store's typed `Actions` surface
 * does NOT include reward CRUD — rewards are mutated via the pure slice
 * reducers directly. Wave 2 3F is told to "use existing `rewardsSlice`
 * actions; do not add new ones." So this helper reads current state,
 * applies the pure reducer, and routes the result through the store's
 * `hydrate` action, which is the 3A-provided path that both updates the
 * in-memory store AND schedules an IDB persistence write.
 *
 * This keeps reward mutations atomic, persistent, and within the
 * guardrails set by 3A without adding new actions to the store surface.
 */

import type { AppState } from '../../types/app-state.ts';
import { getAppStore } from '../../state/store.ts';

/**
 * Apply a pure `AppState -> AppState` reducer to the store. Reads current
 * state, runs the reducer, and calls `hydrate` so persistence schedules
 * correctly (see 3A commit semantics).
 */
export function applyRewardMutation(reducer: (s: AppState) => AppState): void {
  const store = getAppStore();
  const state = store.getState();
  const { actions: _actions, ...rest } = state;
  void _actions;
  const next = reducer(rest as AppState);
  state.actions.hydrate(next);
}
