// Daily snapshot job (§8.3, §4.6). Runs on app open.

import {
  APP_STATE_KEY,
  APP_STATE_STORE,
  KV_LAST_SNAPSHOT_DATE,
  KV_STORE,
  SNAPSHOTS_IDX_BY_DATE,
  SNAPSHOTS_STORE,
  type KvRow,
  type SnapshotRow,
} from './schema.ts';
import { openKakeguruiDb } from './open.ts';
import type { AppState } from '../types/app-state.ts';
import { addDaysLocal, nowISO, todayLocal } from '../lib/time.ts';
import type { LocalDate } from '../types/ids.ts';
import { SCHEMA_VERSION } from '../types/app-state.ts';

export const SNAPSHOT_RETENTION_DAYS = 30;

/**
 * If today's snapshot hasn't been taken, serialize current `app_state`
 * (gzipped when `CompressionStream` is available) into `snapshots`.
 * Prunes snapshots older than {@link SNAPSHOT_RETENTION_DAYS} days.
 */
export async function maybeRunDailySnapshot(): Promise<{ taken: boolean; pruned: number }> {
  const db = await openKakeguruiDb();
  const today = todayLocal();

  // Fast path: already snapshotted today?
  const kvRow = (await db.get(KV_STORE, KV_LAST_SNAPSHOT_DATE)) as
    | KvRow<LocalDate>
    | undefined;
  if (kvRow && kvRow.value === today) {
    return { taken: false, pruned: 0 };
  }

  // Load live state.
  const appState = (await db.get(APP_STATE_STORE, APP_STATE_KEY)) as
    | AppState
    | undefined;
  if (!appState) {
    // No state to snapshot yet; still record the marker so we don't
    // re-enter this branch all day.
    await db.put(KV_STORE, { key: KV_LAST_SNAPSHOT_DATE, value: today });
    return { taken: false, pruned: 0 };
  }

  // Serialize (+ optionally compress).
  const json = JSON.stringify(appState);
  let payload: Uint8Array | string = json;
  let compressed = false;
  try {
    const CS = (globalThis as { CompressionStream?: typeof CompressionStream })
      .CompressionStream;
    if (typeof CS === 'function') {
      payload = await gzip(json);
      compressed = true;
    }
  } catch {
    payload = json;
    compressed = false;
  }

  const row: SnapshotRow = {
    dateLocal: today,
    createdAt: nowISO(),
    compressed,
    payload,
    schemaVersion: SCHEMA_VERSION,
  };

  // Prune old, add new, update kv — all in one transaction.
  const tx = db.transaction([SNAPSHOTS_STORE, KV_STORE], 'readwrite');
  const snapStore = tx.objectStore(SNAPSHOTS_STORE);
  const kvStore = tx.objectStore(KV_STORE);

  // Prune: delete where dateLocal < today - retention.
  const cutoff = addDaysLocal(today, -SNAPSHOT_RETENTION_DAYS);
  let pruned = 0;
  const idx = snapStore.index(SNAPSHOTS_IDX_BY_DATE);
  // Use a cursor to iterate rows with dateLocal < cutoff.
  let cursor = await idx.openCursor(IDBKeyRange.upperBound(cutoff, true));
  while (cursor) {
    await cursor.delete();
    pruned += 1;
    cursor = await cursor.continue();
  }

  // Insert new snapshot.
  await snapStore.add(row);
  // Update marker.
  await kvStore.put({ key: KV_LAST_SNAPSHOT_DATE, value: today });
  await tx.done;

  return { taken: true, pruned };
}

async function gzip(input: string): Promise<Uint8Array> {
  const stream = new Blob([input])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** Test helper: clear snapshot state so the next run triggers a snapshot. */
export async function __resetSnapshotMarkerForTests(): Promise<void> {
  const db = await openKakeguruiDb();
  await db.delete(KV_STORE, KV_LAST_SNAPSHOT_DATE);
}
