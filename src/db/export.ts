// Export all persistent state as a JSON Blob (§8.4, §4.5).

import {
  APP_STATE_KEY,
  APP_STATE_STORE,
  HISTORY_EVENTS_STORE,
  type ExportEnvelope,
} from './schema.ts';
import { openKakeguruiDb } from './open.ts';
import type { AppState } from '../types/app-state.ts';
import type { HistoryEvent } from '../types/history.ts';
import { nowISO } from '../lib/time.ts';

/**
 * Serialize the current `app_state` + full `history_events` store into an
 * envelope-wrapped JSON Blob suitable for user download.
 *
 * Why the envelope: versioning (`envelopeVersion`) and provenance (`kind`)
 * let `importAll` reject foreign JSON blobs early, before any validation
 * runs against the inner `AppState` shape.
 */
export async function exportAll(): Promise<Blob> {
  const db = await openKakeguruiDb();

  const [appState, historyEvents] = await Promise.all([
    db.get(APP_STATE_STORE, APP_STATE_KEY) as Promise<AppState | undefined>,
    db.getAll(HISTORY_EVENTS_STORE) as Promise<HistoryEvent[]>,
  ]);

  if (!appState) {
    throw new Error('Cannot export: no app_state present in IDB.');
  }

  // Cast: ExportEnvelope's Zod-inferred shape has slightly narrower types
  // (literal schemaVersion, unbranded IDs). The runtime JSON is identical.
  const envelope = {
    kind: 'kakeguruimasho-export' as const,
    envelopeVersion: 1 as const,
    exportedAt: nowISO(),
    appState,
    historyEvents,
  } satisfies Omit<ExportEnvelope, 'appState' | 'historyEvents'> & {
    appState: AppState;
    historyEvents: HistoryEvent[];
  };

  const json = JSON.stringify(envelope, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Test-only convenience wrapper: resolves the export Blob to a UTF-8 string
 * so unit tests can string-match / JSON.parse without `FileReader` plumbing.
 */
export async function exportAllAsText(): Promise<string> {
  const blob = await exportAll();
  return await blob.text();
}
