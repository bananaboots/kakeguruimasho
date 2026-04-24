import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeKakeguruiDb, openKakeguruiDb } from '../open.ts';
import {
  APP_STATE_KEY,
  APP_STATE_STORE,
  HISTORY_EVENTS_STORE,
} from '../schema.ts';
import { exportAll, exportAllAsText } from '../export.ts';
import { importAll } from '../import.ts';
import { seedInitialAppState } from '../../data/defaults.ts';
import { nowISO } from '../../lib/time.ts';
import { asEventId, asJarId } from '../../types/ids.ts';
import type { HistoryEvent } from '../../types/history.ts';

async function resetDb(): Promise<void> {
  // Clear all object stores — a fresh IDBDatabase from fake-indexeddb is
  // module-scoped, so tests within one vitest file share state.
  const db = await openKakeguruiDb();
  const tx = db.transaction(
    [APP_STATE_STORE, HISTORY_EVENTS_STORE],
    'readwrite',
  );
  await tx.objectStore(APP_STATE_STORE).clear();
  await tx.objectStore(HISTORY_EVENTS_STORE).clear();
  await tx.done;
}

describe('export/import round-trip', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(async () => {
    await closeKakeguruiDb();
  });

  it('exports empty state rejects cleanly (no state → error)', async () => {
    await expect(exportAll()).rejects.toThrow();
  });

  it('round-trips: seed → export → clear → import → same state', async () => {
    const db = await openKakeguruiDb();
    const original = seedInitialAppState();
    await db.put(APP_STATE_STORE, original, APP_STATE_KEY);
    // Also add a history event so the round-trip covers both stores.
    const evt: HistoryEvent = {
      id: asEventId('evt_1'),
      at: nowISO(),
      jarId: asJarId('default'),
      kind: 'export_performed',
    };
    await db.put(HISTORY_EVENTS_STORE, evt);

    const json = await exportAllAsText();
    expect(json.length).toBeGreaterThan(0);

    // Clear and reimport.
    const tx = db.transaction([APP_STATE_STORE, HISTORY_EVENTS_STORE], 'readwrite');
    await tx.objectStore(APP_STATE_STORE).clear();
    await tx.objectStore(HISTORY_EVENTS_STORE).clear();
    await tx.done;

    const result = await importAll(json);
    expect(result.ok).toBe(true);

    const rehydrated = await db.get(APP_STATE_STORE, APP_STATE_KEY);
    expect(rehydrated).toBeTruthy();
    // Deep-compare via JSON (branding is compile-only so this works).
    expect(JSON.stringify(rehydrated)).toBe(JSON.stringify(original));

    const events = await db.getAll(HISTORY_EVENTS_STORE);
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe('evt_1');
  });

  it('rejects malformed JSON', async () => {
    const result = await importAll('not json');
    expect(result.ok).toBe(false);
  });

  it('rejects schema-mismatched payload', async () => {
    const bad = JSON.stringify({ kind: 'wrong', envelopeVersion: 1 });
    const result = await importAll(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects payload with duplicate clip IDs across bags/hands', async () => {
    const db = await openKakeguruiDb();
    const state = seedInitialAppState();
    // Mutate: copy first bag clip ID into hand to force a duplicate.
    const firstBagClip = state.bags[state.activeJarId]![0]!;
    state.hands[state.activeJarId] = [firstBagClip];
    await db.put(APP_STATE_STORE, state, APP_STATE_KEY);
    const json = await exportAllAsText();
    // Clear then reimport.
    const tx = db.transaction([APP_STATE_STORE, HISTORY_EVENTS_STORE], 'readwrite');
    await tx.objectStore(APP_STATE_STORE).clear();
    await tx.objectStore(HISTORY_EVENTS_STORE).clear();
    await tx.done;
    const result = await importAll(json);
    expect(result.ok).toBe(false);
  });
});
