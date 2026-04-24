// Bridge the Zustand store and the Yjs sync doc.
//
// Scaffold strategy (Phase 6 / first-cut sync):
//   The whole AppState is serialized into a single `state` entry of a
//   Y.Map on the doc. Local store changes write to that entry; remote
//   updates read from it and call `actions.hydrate()`.
//
// Known limitation (documented in CLOUD_SYNC_SETUP.md): concurrent
// offline edits on two devices resolve last-write-wins at the map entry
// level — we lose the granular CRDT merge that a per-slice Yjs mapping
// would give. For v1 of cross-device sync this is an acceptable trade
// (real-time sync works, 99% of the time only one device is in use at a
// time); follow-up work is to move `history_events` to a Y.Array and
// rebuild AppState as a derived view.
//
// See `src/state/store.ts` for the `hydrate` action contract.

import * as Y from 'yjs';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { Store } from '../state/store';
import type { AppState } from '../types/app-state';

const STATE_KEY = 'state';
const BRIDGE_ORIGIN = Symbol('sync-bridge');

type AnyStore = UseBoundStore<StoreApi<Store>>;

function stripActions(s: Store): AppState {
  const { actions: _actions, ...rest } = s;
  void _actions;
  return rest as AppState;
}

/**
 * Wire a Yjs doc and a Zustand store so changes flow both ways.
 * Returns an unsubscribe function that tears down all listeners.
 *
 * Call this once per signed-in session (after y-indexeddb has hydrated
 * the doc from local storage and y-partykit has connected). The caller
 * is responsible for recreating the bridge when the user or doc changes.
 */
export function bridgeStoreAndDoc(store: AnyStore, doc: Y.Doc): () => void {
  const map = doc.getMap<AppState>('app');

  // Flag that's true while we're applying a remote update to the store,
  // so the store subscription below doesn't echo it back into the doc.
  let applyingRemote = false;

  // --- doc → store ---
  const onDocChange = (_ev: Y.YMapEvent<AppState>, tx: Y.Transaction) => {
    if (tx.origin === BRIDGE_ORIGIN) return; // our own write
    const incoming = map.get(STATE_KEY);
    if (!incoming) return;
    applyingRemote = true;
    try {
      store.getState().actions.hydrate(incoming);
    } finally {
      applyingRemote = false;
    }
  };
  map.observe(onDocChange);

  // Seed the doc from the store if the doc is empty (first sign-in on a
  // new device that already has local data). If the doc has state, the
  // initial y-indexeddb hydrate already fired `onDocChange` above and
  // the store has been replaced — nothing to do here.
  if (!map.has(STATE_KEY)) {
    const seed = stripActions(store.getState());
    doc.transact(() => {
      map.set(STATE_KEY, structuredClone(seed));
    }, BRIDGE_ORIGIN);
  }

  // --- store → doc (debounced) ---
  let pending: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 150;

  const writeStateToDoc = () => {
    pending = null;
    const current = stripActions(store.getState());
    doc.transact(() => {
      map.set(STATE_KEY, structuredClone(current));
    }, BRIDGE_ORIGIN);
  };

  const unsubStore = store.subscribe((_state, _prev) => {
    if (applyingRemote) return;
    if (pending) return;
    pending = setTimeout(writeStateToDoc, DEBOUNCE_MS);
  });

  return () => {
    if (pending) {
      clearTimeout(pending);
      pending = null;
    }
    map.unobserve(onDocChange);
    unsubStore();
  };
}
