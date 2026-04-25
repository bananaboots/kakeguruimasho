// SyncGateActive — heavy implementation half of <SyncGate>.
//
// This module is intentionally split out from `SyncGate.tsx` so that
// `@clerk/clerk-react`, `yjs`, `y-indexeddb`, and `y-partykit/provider`
// only enter a lazily-loaded chunk. Builds without cloud-sync env vars
// never fetch this chunk at runtime; sync-enabled builds fetch it
// after the entry chunk is already on screen, behind a <Suspense>.
//
// See `SyncGate.tsx` for the env-var-aware shell that gates this.

import { useEffect, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import { useSyncConnection } from './provider';
import { bridgeStoreAndDoc } from './bridge';
import { getAppStore } from '../state/store';

const CLERK_PK = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export function SyncGateActive({ children }: { children: ReactNode }) {
  // Sanity guard — the shell only mounts us when both env vars are set,
  // but we defend against direct misuse in tests / future callers.
  if (!CLERK_PK) {
    return <>{children}</>;
  }
  return (
    <ClerkProvider publishableKey={CLERK_PK}>
      <SignedIn>
        <SyncBridge>{children}</SyncBridge>
      </SignedIn>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
    </ClerkProvider>
  );
}

function SyncBridge({ children }: { children: ReactNode }) {
  const { doc } = useSyncConnection();

  useEffect(() => {
    if (!doc) return;
    const store = getAppStore();
    const teardown = bridgeStoreAndDoc(store, doc);
    return teardown;
  }, [doc]);

  return <>{children}</>;
}

function SignInScreen() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <SignIn routing="hash" />
    </div>
  );
}
