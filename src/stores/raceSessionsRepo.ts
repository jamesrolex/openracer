/**
 * Race session + track-point persistence.
 *
 * A race session is created when the timer arms and closed when the
 * timer is reset or abandoned. Track points are written at ~1 Hz by
 * `useRaceTrackLogger` while the race is `starting` / `running`.
 *
 * Point inserts are hot-path — they run on every GPS tick during a
 * race. SQL is kept minimal and pre-prepared via getDb() caching.
 */

import type { RaceSession, RaceState } from '../types/race';
import type { DegreesTrue, Metres, MetresPerSecond } from '../types/signalk';

import { getDb } from './db';

function newId(): string {
  return `rs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface SessionRow {
  id: string;
  course_id: string | null;
  started_at: string;
  finished_at: string | null;
  state: string;
}

function rowToSession(row: SessionRow): RaceSession {
  return {
    id: row.id,
    courseId: row.course_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    state: row.state as RaceState,
  };
}

export async function createRaceSession(
  courseId: string | null,
  startedAt: Date,
): Promise<RaceSession> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO race_sessions (id, course_id, started_at, finished_at, state)
     VALUES (?, ?, ?, NULL, ?);`,
    id,
    courseId,
    startedAt.toISOString(),
    'armed' satisfies RaceState,
  );
  const session = await getRaceSession(id);
  if (!session) throw new Error(`createRaceSession: row ${id} vanished after insert`);
  return session;
}

export async function getRaceSession(id: string): Promise<RaceSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM race_sessions WHERE id = ?;`,
    id,
  );
  return row ? rowToSession(row) : null;
}

export async function updateRaceSessionState(
  id: string,
  state: RaceState,
  finishedAt: Date | null = null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE race_sessions SET state = ?, finished_at = ? WHERE id = ?;`,
    state,
    finishedAt ? finishedAt.toISOString() : null,
    id,
  );
}

export async function listRaceSessions(): Promise<RaceSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM race_sessions ORDER BY started_at DESC;`,
  );
  return rows.map(rowToSession);
}

export async function deleteRaceSession(id: string): Promise<void> {
  const db = await getDb();
  // ON DELETE CASCADE drops track points.
  await db.runAsync(`DELETE FROM race_sessions WHERE id = ?;`, id);
}

export interface TrackPointInput {
  recordedAt: Date;
  latitude: number;
  longitude: number;
  sog: MetresPerSecond | null;
  cog: DegreesTrue | null;
  heading: DegreesTrue | null;
  accuracy: Metres | null;
}

export async function insertTrackPoint(
  sessionId: string,
  point: TrackPointInput,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO race_track_points
      (session_id, recorded_at, latitude, longitude, sog_mps, cog_deg, heading_deg, accuracy_m)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    sessionId,
    point.recordedAt.toISOString(),
    point.latitude,
    point.longitude,
    point.sog,
    point.cog,
    point.heading,
    point.accuracy,
  );
}

export interface TrackPoint {
  id: number;
  sessionId: string;
  recordedAt: string;
  latitude: number;
  longitude: number;
  sog: MetresPerSecond | null;
  cog: DegreesTrue | null;
  heading: DegreesTrue | null;
  accuracy: Metres | null;
}

interface PointRow {
  id: number;
  session_id: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  sog_mps: number | null;
  cog_deg: number | null;
  heading_deg: number | null;
  accuracy_m: number | null;
}

function rowToPoint(r: PointRow): TrackPoint {
  return {
    id: r.id,
    sessionId: r.session_id,
    recordedAt: r.recorded_at,
    latitude: r.latitude,
    longitude: r.longitude,
    sog: r.sog_mps,
    cog: r.cog_deg,
    heading: r.heading_deg,
    accuracy: r.accuracy_m,
  };
}

export async function listTrackPoints(sessionId: string): Promise<TrackPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PointRow>(
    `SELECT * FROM race_track_points
      WHERE session_id = ?
      ORDER BY recorded_at ASC;`,
    sessionId,
  );
  return rows.map(rowToPoint);
}

export async function countTrackPoints(sessionId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM race_track_points WHERE session_id = ?;`,
    sessionId,
  );
  return row?.n ?? 0;
}
