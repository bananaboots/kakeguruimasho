// History slice. Truncates AppState.history to last 500 (§4.2).

import type { AppState } from '../../types/app-state.ts';
import { IN_MEMORY_HISTORY_LIMIT } from '../../types/app-state.ts';
import type { HistoryEvent } from '../../types/history.ts';

export function appendHistory(state: AppState, events: readonly HistoryEvent[]): AppState {
  if (events.length === 0) return state;
  const merged = state.history.concat(events);
  // Trim to the last N; this is the in-memory window — full log lives in
  // history_events store.
  const truncated =
    merged.length > IN_MEMORY_HISTORY_LIMIT
      ? merged.slice(merged.length - IN_MEMORY_HISTORY_LIMIT)
      : merged;
  return { ...state, history: truncated };
}
