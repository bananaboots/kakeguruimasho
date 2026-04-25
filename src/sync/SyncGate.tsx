// SyncGate — env-aware shell around the cloud-sync infrastructure.
//
// This file is intentionally tiny and dependency-free so it can stay in
// the entry chunk. The heavy bits — Clerk auth UI, Yjs, y-indexeddb,
// y-partykit — live in `SyncGateActive.tsx` and only enter a lazy
// chunk that's fetched on demand.
//
// Behavior:
//   * Builds without VITE_PARTYKIT_HOST + VITE_CLERK_PUBLISHABLE_KEY:
//     synchronous passthrough. The lazy chunk is never fetched, and
//     Rollup keeps the heavy deps out of the entry chunk.
//   * Builds with both env vars: render <Suspense> around the lazily-
//     imported active gate. There's a brief load-time gap on first
//     visit while the chunk arrives; subsequent loads are cached.
//
// `SYNC_ENABLED` is a build-time constant because Vite inlines
// `import.meta.env.VITE_*` at build time.

import { lazy, Suspense, type ReactNode } from 'react';

const SYNC_ENABLED =
  Boolean(import.meta.env.VITE_PARTYKIT_HOST) &&
  Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const SyncGateActive = lazy(() =>
  import('./SyncGateActive.tsx').then((m) => ({ default: m.SyncGateActive })),
);

export function SyncGate({ children }: { children: ReactNode }) {
  if (!SYNC_ENABLED) {
    return <>{children}</>;
  }
  return (
    <Suspense fallback={null}>
      <SyncGateActive>{children}</SyncGateActive>
    </Suspense>
  );
}
