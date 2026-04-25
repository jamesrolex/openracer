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

/** v5 — committee_trust. Trusted keys for committee-boat push. */
const m0005_committee_trust: Migration = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS committee_trust (
      committee_id TEXT PRIMARY KEY NOT NULL,
      committee_name TEXT NOT NULL,
      public_key TEXT NOT NULL,
      added_at TEXT NOT NULL
    );
  `);
};

/** v7 — courses.start_type. Distinguish standard line vs rabbit vs gate
 *  starts. Defaults to 'standard-line' for any rows that pre-date this
 *  migration so existing courses keep their current behaviour. */
const m0007_courses_start_type: Migration = async (db) => {
  await db.execAsync(`
    ALTER TABLE courses
      ADD COLUMN start_type TEXT NOT NULL DEFAULT 'standard-line';
  `);
};

/** v8 — marks.colour_hint. Short free-text colour cue ("yellow",
 *  "yellow w/ white top") so the picker can render a swatch + label.
 *  Nullable; existing marks just don't have one until edited. */
const m0008_marks_colour_hint: Migration = async (db) => {
  await db.execAsync(`
    ALTER TABLE marks ADD COLUMN colour_hint TEXT;
  `);
};

/** v6 — race_track_points. 1Hz GPS samples during active race sessions. */
const m0006_race_track_points: Migration = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS race_track_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES race_sessions(id) ON DELETE CASCADE,
      recorded_at TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      sog_mps REAL,
      cog_deg REAL,
      heading_deg REAL,
      accuracy_m REAL
    );
    CREATE INDEX IF NOT EXISTS idx_race_track_points_session
      ON race_track_points (session_id, recorded_at);
  `);
};

export const migrations: Migration[] = [
  m0001_kv_store,
  m0002_marks,
  m0003_courses,
  m0004_race_sessions,
  m0005_committee_trust,
  m0006_race_track_points,
  m0007_courses_start_type,
  m0008_marks_colour_hint,
];
