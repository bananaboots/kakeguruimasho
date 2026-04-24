import { describe, expect, it } from 'vitest';
import { migrations } from '../migrations/index.ts';
import { openKakeguruiDb, closeKakeguruiDb } from '../open.ts';
import {
  APP_STATE_STORE,
  HISTORY_EVENTS_STORE,
  SNAPSHOTS_STORE,
  KV_STORE,
} from '../schema.ts';

describe('migrations registry', () => {
  it('is empty for v1 (baseline)', () => {
    expect(migrations.length).toBe(0);
  });

  it('open creates all 4 object stores on first run (empty registry still passes through)', async () => {
    await closeKakeguruiDb();
    const db = await openKakeguruiDb();
    const names = Array.from(db.objectStoreNames);
    expect(names).toContain(APP_STATE_STORE);
    expect(names).toContain(HISTORY_EVENTS_STORE);
    expect(names).toContain(SNAPSHOTS_STORE);
    expect(names).toContain(KV_STORE);
    await closeKakeguruiDb();
  });
});
