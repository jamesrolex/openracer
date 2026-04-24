/**
 * Shared SQLite database connection + versioned migrations.
 *
 * One database (`openracer.db`), one connection cached for the lifetime of
 * the app. Migrations run on first `getDb()` call and are tracked via
 * `PRAGMA user_version`. Each migration is idempotent and incremental.
 *
 * Repositories import `getDb()` from here rather than opening their own
 * connection.
 */

import * as SQLite from 'expo-sqlite';

import { migrations } from './migrations';

const DATABASE_NAME = 'openracer.db';

let cachedDb: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (let v = current; v < migrations.length; v += 1) {
    const step = migrations[v];
    if (!step) continue;
    await db.withTransactionAsync(async () => {
      await step(db);
      // PRAGMA user_version does not accept parameters; literal is safe
      // because v is a bounded integer we generated locally.
      await db.execAsync(`PRAGMA user_version = ${v + 1};`);
    });
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (cachedDb) return cachedDb;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    cachedDb = db;
    return db;
  })();

  return initPromise;
}

/**
 * Test-only reset hook. Drops the cached handle so the next `getDb()` call
 * re-opens and re-migrates. Used by repo tests that swap in a fresh in-memory
 * database fixture.
 */
export function __resetDbForTests(): void {
  cachedDb = null;
  initPromise = null;
}
