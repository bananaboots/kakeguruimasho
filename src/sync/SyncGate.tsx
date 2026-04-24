// SyncGate — mounts Clerk + the sync bridge around the app.
//
// If the build wasn't configured with cloud sync env vars
// (VITE_CLERK_PUBLISHABLE_KEY + VITE_PARTYKIT_HOST), this gate is a
// no-op passthrough — the app behaves exactly like the legacy
// single-device build, backed by the existing IDB persist layer.
//
// When sync is enabled:
//   <ClerkProvider>
//     <SignedIn>
//       <SyncBridge>   ← wires Yjs doc ↔ Zustand store
//         {children}
//     <SignedOut>
//       <SignIn />

import { useEffect, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import { SYNC_ENABLED, useSyncConnection } from './provider';
import { bridgeStoreAndDoc } from './bridge';
import { getAppStore } from '../state/store';

const CLERK_PK = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export function SyncGate({ children }: { children: ReactNode }) {
  if (!SYNC_ENABLED || !CLERK_PK) {
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
