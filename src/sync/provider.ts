// Sync provider — owns one Yjs doc per signed-in user, backed by
// y-indexeddb locally and y-partykit remotely.
//
// Contract:
//   useSyncConnection() → { status, doc }
//     status = 'off'         — cloud sync is not configured in this build
//     status = 'local-only'  — signed-out; doc persists to IndexedDB but
//                              does not connect to a relay
//     status = 'syncing'     — signed-in; doc is wired to PartyKit in
//                              real-time (the ws itself may be briefly
//                              offline during reconnect — that's fine,
//                              writes buffer in the local doc)
//
// The returned `doc` is stable for the lifetime of the hook. Consumers
// bridge it to Zustand via `src/sync/bridge.ts`.

import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import YPartyKitProvider from 'y-partykit/provider';
import { useAuth } from '@clerk/clerk-react';

export type SyncStatus = 'off' | 'local-only' | 'syncing';

export type SyncConnection = {
  status: SyncStatus;
  /**
   * The live Yjs doc. Always defined when status !== 'off'. When status is
   * 'off' (no Clerk/PartyKit configured in this build) callers should skip
   * sync entirely and fall back to the legacy IDB persist path.
   */
  doc: Y.Doc | null;
};

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST as string | undefined;
const CLERK_PK = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/** True in builds that shipped with cloud sync env vars. */
export const SYNC_ENABLED = Boolean(PARTYKIT_HOST && CLERK_PK);

export function useSyncConnection(): SyncConnection {
  // Safe to call unconditionally: <ClerkProvider> is mounted in the gate.
  // If cloud sync is disabled, SyncGate never renders Clerk and this hook
  // is never called.
  const { userId, isSignedIn, getToken } = useAuth();
  const [doc] = useState(() => new Y.Doc());
  const [status, setStatus] = useState<SyncStatus>('local-only');

  // Local persistence — one IndexedDB namespace per user id, or 'anon' if
  // signed-out. Signing in/out tears down and re-creates so we never leak
  // one user's Yjs state into another's.
  const key = useMemo(() => `kake-ydoc:${userId ?? 'anon'}`, [userId]);

  useEffect(() => {
    const local = new IndexeddbPersistence(key, doc);

    let remote: YPartyKitProvider | null = null;
    if (isSignedIn && userId && PARTYKIT_HOST) {
      remote = new YPartyKitProvider(PARTYKIT_HOST, userId, doc, {
        params: async () => {
          const token = await getToken();
          return token ? { token } : {};
        },
      });
      const onStatus = (e: { status: string }) => {
        setStatus(e.status === 'connected' ? 'syncing' : 'local-only');
      };
      remote.on('status', onStatus);
      setStatus('local-only'); // until the ws says connected
    } else {
      setStatus('local-only');
    }

    return () => {
      if (remote) {
        remote.destroy();
      }
      void local.destroy();
    };
  }, [doc, key, isSignedIn, userId, getToken]);

  return { status, doc };
}
