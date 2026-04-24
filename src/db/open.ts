// Opens (and upgrades) the kakeguruimasho IDB database.

import { openDB, type IDBPDatabase } from 'idb';

import {
  APP_STATE_STORE,
  DB_NAME,
  DB_VERSION,
  HISTORY_EVENTS_STORE,
  HISTORY_IDX_BY_AT,
  HISTORY_IDX_BY_JAR_AT,
  HISTORY_IDX_BY_KIND,
  KV_STORE,
  SNAPSHOTS_IDX_BY_DATE,
  SNAPSHOTS_STORE,
  type KakeguruiDbSchema,
} from './schema.ts';
import { runMigrations } from './migrations/index.ts';

let dbPromise: Promise<IDBPDatabase<KakeguruiDbSchema>> | null = null;

export function openKakeguruiDb(): Promise<IDBPDatabase<KakeguruiDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<KakeguruiDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        // Create baseline stores on first run (oldVersion === 0).
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(APP_STATE_STORE)) {
            db.createObjectStore(APP_STATE_STORE);
          }
          if (!db.objectStoreNames.contains(HISTORY_EVENTS_STORE)) {
            const h = db.createObjectStore(HISTORY_EVENTS_STORE, {
              keyPath: 'id',
            });
            h.createIndex(HISTORY_IDX_BY_AT, 'at');
            h.createIndex(HISTORY_IDX_BY_JAR_AT, ['jarId', 'at']);
            h.createIndex(HISTORY_IDX_BY_KIND, 'kind');
          }
          if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
            const s = db.createObjectStore(SNAPSHOTS_STORE, {
              keyPath: 'id',
              autoIncrement: true,
            });
            s.createIndex(SNAPSHOTS_IDX_BY_DATE, 'dateLocal');
          }
          if (!db.objectStoreNames.contains(KV_STORE)) {
            db.createObjectStore(KV_STORE, { keyPath: 'key' });
          }
        }
        // Run registered migrations for any later upgrades.
        void runMigrations(oldVersion, newVersion ?? DB_VERSION, db, tx);
      },
      blocked() {
        // Another tab is holding an old version open. Silent for now —
        // the owner's single-device assumption means this is rare.
        // eslint-disable-next-line no-console
        console.warn('[kakeguruimasho] IDB open blocked by another tab.');
      },
      blocking() {
        // A newer version is trying to open. Close us so it can proceed.
        void (async () => {
          const db = await dbPromise;
          db?.close();
          dbPromise = null;
        })();
      },
      terminated() {
        // eslint-disable-next-line no-console
        console.warn('[kakeguruimasho] IDB connection terminated unexpectedly.');
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/** Close + forget the cached connection. Tests use this between cases. */
export async function closeKakeguruiDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
