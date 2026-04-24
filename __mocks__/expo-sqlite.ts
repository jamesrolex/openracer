/**
 * Jest mock for `expo-sqlite`, delegating to `better-sqlite3` against an
 * in-memory database. Provides just enough of the expo-sqlite async API for
 * the repos and migration runner — not a complete re-implementation.
 *
 * Each call to `openDatabaseAsync(name)` returns a handle tied to a
 * per-process map so opening the same name twice in a test returns the same
 * database (matching expo-sqlite's behaviour).
 */

import Database from 'better-sqlite3';

type Params = readonly unknown[];

function normaliseParams(args: unknown[]): Params {
  if (args.length === 1 && Array.isArray(args[0])) return args[0] as Params;
  return args as Params;
}

// Strip user_version = N so we can run it via a normal exec (better-sqlite3
// doesn't accept parameters in PRAGMA either but accepts inline integer).
function rewritePragma(sql: string): string {
  return sql.trim();
}

export interface SQLiteDatabaseMock {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}

function wrap(raw: Database.Database): SQLiteDatabaseMock {
  return {
    async execAsync(sql: string): Promise<void> {
      raw.exec(sql);
    },
    async runAsync(sql, ...args) {
      const stmt = raw.prepare(rewritePragma(sql));
      const info = stmt.run(...(normaliseParams(args) as unknown[]));
      return {
        changes: info.changes,
        lastInsertRowId: Number(info.lastInsertRowid),
      };
    },
    async getFirstAsync<T>(sql: string, ...args: unknown[]): Promise<T | null> {
      const stmt = raw.prepare(rewritePragma(sql));
      const row = stmt.get(...(normaliseParams(args) as unknown[]));
      return (row ?? null) as T | null;
    },
    async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
      const stmt = raw.prepare(rewritePragma(sql));
      return stmt.all(...(normaliseParams(args) as unknown[])) as T[];
    },
    async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (err) {
        raw.exec('ROLLBACK');
        throw err;
      }
    },
    async closeAsync(): Promise<void> {
      raw.close();
    },
  };
}

const openHandles = new Map<string, SQLiteDatabaseMock>();

export async function openDatabaseAsync(name: string): Promise<SQLiteDatabaseMock> {
  const existing = openHandles.get(name);
  if (existing) return existing;
  const raw = new Database(':memory:');
  const handle = wrap(raw);
  openHandles.set(name, handle);
  return handle;
}

/** Test helper: wipe the cached databases between tests. */
export function __clearAllDatabases(): void {
  openHandles.clear();
}

export default { openDatabaseAsync, __clearAllDatabases };
