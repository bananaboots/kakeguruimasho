import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeKakeguruiDb, openKakeguruiDb } from '../open.ts';
import { APP_STATE_STORE, HISTORY_EVENTS_STORE } from '../schema.ts';
import { createPersistHandle, loadPersistedAppState } from '../../state/persist.ts';
import { seedInitialAppState } from '../../data/defaults.ts';
import type { HistoryEvent } from '../../types/history.ts';
import { asEventId, asJarId } from '../../types/ids.ts';
import { nowISO } from '../../lib/time.ts';

async function wipe(): Promise<void> {
  const db = await openKakeguruiDb();
  const tx = db.transaction([APP_STATE_STORE, HISTORY_EVENTS_STORE], 'readwrite');
  await tx.objectStore(APP_STATE_STORE).clear();
  await tx.objectStore(HISTORY_EVENTS_STORE).clear();
  await tx.done;
}

describe('persist adapter', () => {
  beforeEach(async () => {
    await wipe();
  });
  afterEach(async () => {
    await closeKakeguruiDb();
  });

  it('schedule → flushPending writes the state blob', async () => {
    const handle = createPersistHandle();
    const state = seedInitialAppState();
    handle.schedule(state);
    await handle.flushPending();
    const loaded = await loadPersistedAppState();
    expect(loaded).toBeTruthy();
    expect(loaded?.activeJarId).toBe(state.activeJarId);
    handle.dispose();
  });

  it('flushNow bypasses debounce and writes history_events synchronously (same tick)', async () => {
    const handle = createPersistHandle();
    const state = seedInitialAppState();
    const evt: HistoryEvent = {
      id: asEventId('evt_persist_test'),
      at: nowISO(),
      jarId: asJarId('default'),
      kind: 'export_performed',
    };
    await handle.flushNow(state, [evt]);
    const db = await openKakeguruiDb();
    const stored = await db.get(HISTORY_EVENTS_STORE, 'evt_persist_test');
    expect(stored).toBeTruthy();
    const appLoaded = await loadPersistedAppState();
    expect(appLoaded).toBeTruthy();
    handle.dispose();
  });

  it('schedule coalesces multiple writes in the same debounce window', async () => {
    const handle = createPersistHandle();
    const s1 = seedInitialAppState();
    const s2 = { ...s1, firstRunCompleted: true };
    handle.schedule(s1);
    handle.schedule(s2);
    await handle.flushPending();
    const loaded = await loadPersistedAppState();
    // Last-write-wins — s2 should win.
    expect(loaded?.firstRunCompleted).toBe(true);
    handle.dispose();
  });
});
