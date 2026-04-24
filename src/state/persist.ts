// Zustand custom IDB persist adapter (§5 opener).
// Debounced 16ms writes for most mutations; synchronous write-through for
// history append (§5 — appendHistory bypasses debounce).

import { APP_STATE_KEY, APP_STATE_STORE, HISTORY_EVENTS_STORE } from '../db/schema.ts';
import { openKakeguruiDb } from '../db/open.ts';
import type { AppState } from '../types/app-state.ts';
import type { HistoryEvent } from '../types/history.ts';

export type PersistHandle = {
  /** Queue a persistence of the full state. Coalesces to one write per 16ms. */
  schedule: (state: AppState) => void;
  /** Write state immediately (bypass debounce). Used by appendHistory path. */
  flushNow: (state: AppState, newEvents: readonly HistoryEvent[]) => Promise<void>;
  /** Flush any pending debounced write. Tests use this. */
  flushPending: () => Promise<void>;
  /** Stop scheduling. Tests use this. */
  dispose: () => void;
};

/**
 * Create a persistence handle bound to the one database connection.
 * The Zustand store subscribes to its own changes and calls `schedule()`;
 * composite actions that emit history call `flushNow()` themselves.
 */
export function createPersistHandle(): PersistHandle {
  let pendingState: AppState | null = null;
  let scheduled: ReturnType<typeof setTimeout> | null = null;
  let inflight: Promise<void> | null = null;
  let disposed = false;

  const write = async (state: AppState): Promise<void> => {
    const db = await openKakeguruiDb();
    const tx = db.transaction([APP_STATE_STORE], 'readwrite');
    await tx.objectStore(APP_STATE_STORE).put(state, APP_STATE_KEY);
    await tx.done;
  };

  const flushSlot = async (): Promise<void> => {
    if (!pendingState) return;
    const state = pendingState;
    pendingState = null;
    scheduled = null;
    await write(state);
  };

  const schedule = (state: AppState): void => {
    if (disposed) return;
    pendingState = state;
    if (scheduled) return;
    scheduled = setTimeout(() => {
      inflight = flushSlot().catch((err) => {
        // Surface but don't crash — persistence errors are logged.
        // eslint-disable-next-line no-console
        console.error('[persist] debounced write failed', err);
      });
    }, 16);
  };

  const flushNow = async (
    state: AppState,
    newEvents: readonly HistoryEvent[],
  ): Promise<void> => {
    if (disposed) return;
    // Cancel any pending debounced write; this call subsumes it.
    if (scheduled) {
      clearTimeout(scheduled);
      scheduled = null;
    }
    pendingState = null;
    const db = await openKakeguruiDb();
    const tx = db.transaction([APP_STATE_STORE, HISTORY_EVENTS_STORE], 'readwrite');
    await tx.objectStore(APP_STATE_STORE).put(state, APP_STATE_KEY);
    const hs = tx.objectStore(HISTORY_EVENTS_STORE);
    for (const evt of newEvents) {
      await hs.put(evt);
    }
    await tx.done;
  };

  const flushPending = async (): Promise<void> => {
    if (scheduled) {
      clearTimeout(scheduled);
      scheduled = null;
      await flushSlot();
    }
    if (inflight) {
      await inflight;
      inflight = null;
    }
  };

  const dispose = (): void => {
    disposed = true;
    if (scheduled) {
      clearTimeout(scheduled);
      scheduled = null;
    }
    pendingState = null;
  };

  return { schedule, flushNow, flushPending, dispose };
}

/**
 * Load persisted state. Returns null if never persisted.
 */
export async function loadPersistedAppState(): Promise<AppState | null> {
  const db = await openKakeguruiDb();
  const state = (await db.get(APP_STATE_STORE, APP_STATE_KEY)) as AppState | undefined;
  return state ?? null;
}
