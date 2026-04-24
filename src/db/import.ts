// Import path: Zod-validate → full replace (A11, §8.5).

import type { ZodIssue } from 'zod';
import {
  APP_STATE_KEY,
  APP_STATE_STORE,
  HISTORY_EVENTS_STORE,
  KV_LAST_SNAPSHOT_DATE,
  KV_STORE,
  SNAPSHOTS_STORE,
  exportEnvelopeSchema,
} from './schema.ts';
import { openKakeguruiDb } from './open.ts';

export type ImportResult =
  | { ok: true }
  | { ok: false; errors: ZodIssue[] };

/**
 * Validate and full-replace-import a user-supplied JSON envelope.
 *
 * Flow:
 *  1. `JSON.parse` (explicit error path for invalid JSON).
 *  2. Zod validation of the envelope + inner `AppState`.
 *  3. Duplicate-clip-ID sanity check across all bags and hands.
 *  4. One IDB transaction clears `app_state` and `history_events`, then
 *     writes the validated fresh copies. Snapshots and kv survive so the
 *     pre-import state is still recoverable via the daily-snapshot trail.
 *
 * Never throws — all failures are reflected in the returned `ImportResult`.
 */
export async function importAll(json: string): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return {
      ok: false,
      errors: [
        {
          code: 'custom',
          message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
          path: [],
          input: json,
        } as ZodIssue,
      ],
    };
  }

  const result = exportEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, errors: result.error.issues };
  }

  // R5: post-import sanity — no duplicate clip IDs across bags/hands.
  const dupClipIds = findDuplicateClipIds(result.data.appState);
  if (dupClipIds.length > 0) {
    return {
      ok: false,
      errors: [
        {
          code: 'custom',
          message: `Duplicate clip IDs in import: ${dupClipIds.join(', ')}`,
          path: ['appState'],
          input: parsed,
        } as ZodIssue,
      ],
    };
  }

  const db = await openKakeguruiDb();
  const tx = db.transaction(
    [APP_STATE_STORE, HISTORY_EVENTS_STORE, KV_STORE, SNAPSHOTS_STORE],
    'readwrite',
  );
  // Clear live stores.
  await tx.objectStore(APP_STATE_STORE).clear();
  await tx.objectStore(HISTORY_EVENTS_STORE).clear();
  // Reset snapshot marker so a fresh snapshot is taken on next open.
  await tx.objectStore(KV_STORE).delete(KV_LAST_SNAPSHOT_DATE);

  // Write fresh state. Cast is sound: branded IDs are compile-only nominal tags.
  await tx
    .objectStore(APP_STATE_STORE)
    .put(result.data.appState as unknown as import('../types/app-state.ts').AppState, APP_STATE_KEY);
  const historyStore = tx.objectStore(HISTORY_EVENTS_STORE);
  for (const evt of result.data.historyEvents) {
    await historyStore.put(evt as unknown as import('../types/history.ts').HistoryEvent);
  }

  await tx.done;
  return { ok: true };
}

function findDuplicateClipIds(state: {
  bags: Record<string, Array<{ id: string }>>;
  hands: Record<string, Array<{ id: string }>>;
}): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  const visit = (list: Array<{ id: string }>): void => {
    for (const c of list) {
      if (seen.has(c.id)) dups.push(c.id);
      else seen.add(c.id);
    }
  };
  for (const bag of Object.values(state.bags)) visit(bag);
  for (const hand of Object.values(state.hands)) visit(hand);
  return dups;
}
