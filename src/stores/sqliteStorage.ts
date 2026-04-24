/**
 * Zustand `persist` storage adapter backed by expo-sqlite.
 *
 * Uses the shared `kv_store` table managed by the migration runner in
 * `./db`. All operations are async and fail safe — on error we resolve to
 * `null` / `undefined` so the persist middleware falls back to the in-memory
 * default, never crashes the app.
 */

import type { PersistStorage, StorageValue } from 'zustand/middleware';

import { getDb } from './db';

const TABLE_NAME = 'kv_store';

/**
 * Build a PersistStorage<T> for a Zustand store. Typed so the middleware
 * hands us the parsed state rather than a raw JSON string.
 */
export function sqliteStorage<T>(): PersistStorage<T> {
  return {
    async getItem(name: string): Promise<StorageValue<T> | null> {
      try {
        const db = await getDb();
        const row = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM ${TABLE_NAME} WHERE key = ?;`,
          name,
        );
        if (!row) return null;
        return JSON.parse(row.value) as StorageValue<T>;
      } catch {
        return null;
      }
    },

    async setItem(name: string, value: StorageValue<T>): Promise<void> {
      try {
        const db = await getDb();
        await db.runAsync(
          `INSERT INTO ${TABLE_NAME} (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
          name,
          JSON.stringify(value),
        );
      } catch {
        // Swallow — persistence is best-effort.
      }
    },

    async removeItem(name: string): Promise<void> {
      try {
        const db = await getDb();
        await db.runAsync(`DELETE FROM ${TABLE_NAME} WHERE key = ?;`, name);
      } catch {
        // Swallow.
      }
    },
  };
}
