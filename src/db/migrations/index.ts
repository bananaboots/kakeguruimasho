// Migration registry. v1 = baseline (no migrations). A12.
// Hard rule: once v1 ships, never mutate an existing Migration entry. Only append.

import type { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import type { KakeguruiDbSchema } from '../schema.ts';

type UpgradeTx = IDBPTransaction<
  KakeguruiDbSchema,
  StoreNames<KakeguruiDbSchema>[],
  'versionchange'
>;

export type Migration = {
  from: number;
  to: number;
  up: (db: IDBPDatabase<KakeguruiDbSchema>, tx: UpgradeTx) => Promise<void>;
};

export const migrations: readonly Migration[] = Object.freeze([
  // v1 is the baseline. No migrations yet.
]);

/**
 * Runs all registered migrations whose `from <= oldVersion` and `to <= newVersion`.
 * Called from the `upgrade` callback in `open.ts`. Migrations are executed
 * inside the versionchange transaction supplied by idb.
 */
export async function runMigrations(
  oldVersion: number,
  newVersion: number,
  db: IDBPDatabase<KakeguruiDbSchema>,
  tx: UpgradeTx,
): Promise<void> {
  for (const m of migrations) {
    if (m.from >= oldVersion && m.to <= newVersion) {
      await m.up(db, tx);
    }
  }
}
