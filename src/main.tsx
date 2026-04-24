/**
 * main.tsx — React entry point (3J).
 *
 * Mount order per ARCHITECTURE §6:
 *   <StrictMode>
 *     <ErrorBoundary>
 *       <HashRouter>      (GH Pages — spec §7)
 *         <ThemeProvider> (no provider needed yet; dark tokens are global)
 *           <ToastProvider>
 *             <App />
 *
 * `storage-persist.ts` is imported for side-effect registration but NOT
 * called here — per ARCHITECTURE §4.7, we defer until the first clip-earn
 * event. Wave 2+ reaches for `requestPersistentStorage()` from the store
 * middleware after the first `clip_earned` history append.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { ToastProvider } from './ui/toast.tsx';
import './index.css';
import './ui/ui.css';
import './shell.css';
import { getAppStore } from './state/store.ts';
import { loadPersistedAppState } from './state/persist.ts';

// Side-effect import so 3A can `import { requestPersistentStorage } from '@/lib/storage-persist'`
// at wire-up time without a cold path load. The function itself is idempotent
// and does not fire until explicitly called.
import './lib/storage-persist.ts';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root missing from index.html');

/**
 * Boot-time rehydrate (Phase 4).
 *
 * The store seeds from `seedInitialAppState()` synchronously on first use.
 * If a previous session wrote state to IDB, we immediately overwrite the
 * seed with the persisted snapshot before the first render so the
 * FirstRunGate, bag, hand, etc. all reflect reality. Errors are logged
 * and swallowed — a stale/corrupt snapshot should not keep the app from
 * booting (worst case, the user sees onboarding again).
 */
async function bootRehydrate(): Promise<void> {
  try {
    const persisted = await loadPersistedAppState();
    if (persisted) {
      getAppStore().getState().actions.hydrate(persisted);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[boot] rehydrate failed', err);
  }
}

function mount(): void {
  createRoot(rootEl!).render(
    <StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </HashRouter>
      </ErrorBoundary>
    </StrictMode>,
  );
}

// Wait for rehydrate before mounting so the FirstRunGate's initial read is
// correct. The IDB round-trip is <20ms on modern devices; slower paths show
// a brief empty screen, which is acceptable.
void bootRehydrate().finally(mount);
