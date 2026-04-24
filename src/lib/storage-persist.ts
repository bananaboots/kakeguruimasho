/**
 * storage-persist.ts — `navigator.storage.persist()` wrapper (3J).
 *
 * ARCHITECTURE §4.7: We delay the persist-storage request until the user has
 * done something meaningful (first clip draw) rather than firing it on app
 * open. Browsers give a stronger grant when the site has observable user
 * engagement, and on iOS in particular the prompt UX differs.
 *
 * This wrapper is idempotent — subsequent calls after a successful grant are
 * no-ops. The result is logged but never surfaced as a user-visible error;
 * we fall back to the daily snapshot job (3A) for data durability.
 */

type PersistResult =
  | { ok: true; already: boolean }
  | { ok: false; reason: 'unsupported' | 'denied' | 'error'; message?: string };

let attempted = false;
let cachedResult: PersistResult | null = null;

/**
 * Request persistent storage. Safe to call multiple times — only the first
 * call hits the API. Returns a stable result object.
 *
 * Wire-up for Wave 2+: call this from the "clip_earned" reaction in the
 * store middleware, NOT from the shell initial render.
 */
export async function requestPersistentStorage(): Promise<PersistResult> {
  if (cachedResult) return cachedResult;
  if (attempted) {
    return (
      cachedResult ?? {
        ok: false,
        reason: 'error',
        message: 'persist already attempted but result cached is null',
      }
    );
  }
  attempted = true;

  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    cachedResult = { ok: false, reason: 'unsupported' };
    logResult(cachedResult);
    return cachedResult;
  }

  try {
    const already = (await navigator.storage.persisted?.()) ?? false;
    if (already) {
      cachedResult = { ok: true, already: true };
      logResult(cachedResult);
      return cachedResult;
    }

    const granted = await navigator.storage.persist();
    cachedResult = granted
      ? { ok: true, already: false }
      : { ok: false, reason: 'denied' };
    logResult(cachedResult);
    return cachedResult;
  } catch (err) {
    cachedResult = {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    logResult(cachedResult);
    return cachedResult;
  }
}

/**
 * Peek at the last result without triggering a request. Returns `null` until
 * `requestPersistentStorage()` has been called at least once.
 */
export function getPersistStatus(): PersistResult | null {
  return cachedResult;
}

function logResult(result: PersistResult): void {
  // Keep noise low — info for success, warn for failure. Never error.
  if (result.ok) {
    // eslint-disable-next-line no-console
    console.info('[storage-persist] granted', { already: result.already });
  } else {
    // eslint-disable-next-line no-console
    console.warn('[storage-persist] not granted', result);
  }
}
