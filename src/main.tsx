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
import { SyncGate } from './sync/SyncGate.tsx';
import { ThemeProvider } from './styles/theme-provider.tsx';
import './index.css';
import './ui/ui.css';
import './shell.css';
// desktop.css must come AFTER shell.css so its >=1024px rules
// (e.g. .bottom-nav { display: none }) outrank the mobile defaults.
import './styles/desktop.css';
import { getAppStore } from './state/store.ts';
import { loadPersistedAppState } from './state/persist.ts';
import { DEFAULT_HABIT_IDS } from './data/defaults.ts';

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
/**
 * One-shot legacy-name rename: the default self-care habit was named
 * "Hygiene bundle" in seed data prior to 2026-04-25. Existing persisted
 * state still carries that name. Rewrite it once at boot if the canonical
 * default habit hasn't been customized away from the legacy default.
 * No effect on internal IDs (`habit_hygiene`, `pendingHygieneBundle`,
 * `streaks.hygiene`) — those stay legacy to avoid a schema migration.
 */
function patchLegacyHygieneName(): void {
  const { habits, actions } = getAppStore().getState();
  const target = habits.find((h) => h.id === DEFAULT_HABIT_IDS.hygiene);
  if (target && target.name === 'Hygiene bundle') {
    actions.updateHabit(target.id, { name: 'Self care bundle' });
  }
}

/**
 * Fill in optional settings fields added after initial release. Persisted
 * state from older builds may be missing them; patching here lets us avoid
 * a schema-version bump for purely additive cosmetic settings.
 */
function patchOptionalSettings(): void {
  const { settings, actions } = getAppStore().getState();
  if (settings.spinStyle === undefined) {
    actions.updateSettings({ spinStyle: 'wheel' });
  }
}

/**
 * Migrate legacy `minutes` / `sets` habit unit kinds to `count` with a
 * matching unit label. Both behaved identically at the engine level
 * (single-tap = 1 clip), so the conversion is loss-free. Idempotent: only
 * touches habits whose `unit.kind` is still legacy.
 */
function patchLegacyUnitKinds(): void {
  const { habits, actions } = getAppStore().getState();
  for (const h of habits) {
    if (h.unit.kind === 'minutes') {
      actions.updateHabit(h.id, {
        unit: { kind: 'count', target: h.unit.target, unit: 'minutes' },
      });
    } else if (h.unit.kind === 'sets') {
      actions.updateHabit(h.id, {
        unit: { kind: 'count', target: h.unit.target, unit: 'sets' },
      });
    }
  }
}

async function bootRehydrate(): Promise<void> {
  try {
    const persisted = await loadPersistedAppState();
    if (persisted) {
      getAppStore().getState().actions.hydrate(persisted);
    }
  } catch (err) {
    console.error('[boot] rehydrate failed', err);
  }
  patchLegacyHygieneName();
  patchOptionalSettings();
  patchLegacyUnitKinds();
}

function mount(): void {
  // Dev-only: expose the Zustand store on window for browser-console
  // debugging. Stripped in production builds via Vite's tree-shake of
  // the import.meta.env.DEV branch.
  if (import.meta.env.DEV) {
    (window as unknown as { __appStore: unknown }).__appStore = getAppStore();
  }

  createRoot(rootEl!).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <HashRouter>
            <ToastProvider>
              <SyncGate>
                <App />
              </SyncGate>
            </ToastProvider>
          </HashRouter>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

// Wait for rehydrate before mounting so the FirstRunGate's initial read is
// correct. The IDB round-trip is <20ms on modern devices; slower paths show
// a brief empty screen, which is acceptable.
void bootRehydrate().finally(mount);
