/**
 * Ordered, additive SQL migrations. `PRAGMA user_version` tracks how many
 * have run; new migrations append to the end and are never edited in place
 * once shipped.
 */

import type * as SQLite from 'expo-sqlite';

type Migration = (db: SQLite.SQLiteDatabase) => Promise<void>;

/** v1 — kv_store for Zustand persist (pre-existing in Phase 0). */
const m0001_kv_store: Migration = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
};

/** v2 — marks table. See src/types/mark.ts for the shape. */
const m0002_marks: Migration = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS marks (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      tier TEXT NOT NULL,
      source TEXT NOT NULL,
      icon TEXT NOT NULL,
      shape TEXT NOT NULL,
      valid_from TEXT,
      valid_until TEXT,
      owner TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_marks_tier ON marks (tier);
    CREATE INDEX IF NOT EXISTS idx_marks_valid_until ON marks (valid_until);
  `);
};

/** v3 — courses + course_legs (join table, ordered via position). */
const m0003_courses: Migration = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      template_id TEXT NOT NULL,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS course_legs (
      id TEXT PRIMARY KEY NOT NULL,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      required_marks INTEGER NOT NULL,
      rounding TEXT,
      UNIQUE (course_id, position)
    );
    CREATE TABLE IF NOT EXISTS course_leg_marks (
      leg_id TEXT NOT NULL REFERENCES course_legs(id) ON DELETE CASCADE,
      mark_id TEXT NOT NULL REFERENCES marks(id) ON DELETE RESTRICT,
      position INTEGER NOT NULL,
      PRIMARY KEY (leg_id, position)
    );
    CREATE INDEX IF NOT EXISTS idx_course_legs_course ON course_legs (course_id);
  `);
};

/** v4 — race_sessions. Phase 1 stores the shell; Phase 2 writes tracks. */
const m0004_race_sessions: Migration = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS race_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      state TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_race_sessions_started ON race_sessions (started_at);
  `);
};

export const migrations: Migration[] = [
  m0001_kv_store,
  m0002_marks,
  m0003_courses,
  m0004_race_sessions,
];
