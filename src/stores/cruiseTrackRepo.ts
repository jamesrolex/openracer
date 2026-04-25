/**
 * Cruise-track repo — Phase 1.16.
 *
 * A cruise track is a GPS log started by tapping "Start track" in nav
 * mode. Distinct from race tracks (`race_track_points`) which are tied
 * to a `race_sessions` row. Cruise tracks have no race-state context;
 * they're just "I sailed from A to B and want to remember where".
 *
 * Mirrors the race-track schema for ergonomic reuse of the trackStats
 * + GPX exporter modules — both consume the same `TrackPoint` shape.
 */

import type { DegreesTrue, Metres, MetresPerSecond } from '../types/signalk';

import { getDb } from './db';

export interface CruiseTrack {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  distanceMetres: number;
  maxSogMps: number | null;
  pointCount: number;
}

export interface CruiseTrackPoint {
  id: number;
  trackId: string;
  recordedAt: string;
  latitude: number;
  longitude: number;
  sog: MetresPerSecond | null;
  cog: DegreesTrue | null;
  heading: DegreesTrue | null;
  accuracy: Metres | null;
}

interface TrackRow {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  distance_metres: number;
  max_sog_mps: number | null;
  point_count: number;
}

interface PointRow {
  id: number;
  track_id: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  sog_mps: number | null;
  cog_deg: number | null;
  heading_deg: number | null;
  accuracy_m: number | null;
}

function rowToTrack(r: TrackRow): CruiseTrack {
  return {
    id: r.id,
    name: r.name,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    distanceMetres: r.distance_metres,
    maxSogMps: r.max_sog_mps,
    pointCount: r.point_count,
  };
}

function rowToPoint(r: PointRow): CruiseTrackPoint {
  return {
    id: r.id,
    trackId: r.track_id,
    recordedAt: r.recorded_at,
    latitude: r.latitude,
    longitude: r.longitude,
    sog: r.sog_mps,
    cog: r.cog_deg,
    heading: r.heading_deg,
    accuracy: r.accuracy_m,
  };
}

function newId(): string {
  return `tk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createCruiseTrack(name?: string): Promise<CruiseTrack> {
  const db = await getDb();
  const id = newId();
  const startedAt = new Date().toISOString();
  const finalName = name ?? defaultName(new Date(startedAt));
  await db.runAsync(
    `INSERT INTO cruise_tracks (id, name, started_at, ended_at, distance_metres, max_sog_mps, point_count)
     VALUES (?, ?, ?, NULL, 0, NULL, 0);`,
    id,
    finalName,
    startedAt,
  );
  return {
    id,
    name: finalName,
    startedAt,
    endedAt: null,
    distanceMetres: 0,
    maxSogMps: null,
    pointCount: 0,
  };
}

function defaultName(d: Date): string {
  return `Track ${d.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export interface CruiseTrackPointInput {
  recordedAt: Date;
  latitude: number;
  longitude: number;
  sog: MetresPerSecond | null;
  cog: DegreesTrue | null;
  heading: DegreesTrue | null;
  accuracy: Metres | null;
}

export async function appendCruiseTrackPoint(
  trackId: string,
  point: CruiseTrackPointInput,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO cruise_track_points
       (track_id, recorded_at, latitude, longitude, sog_mps, cog_deg, heading_deg, accuracy_m)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    trackId,
    point.recordedAt.toISOString(),
    point.latitude,
    point.longitude,
    point.sog,
    point.cog,
    point.heading,
    point.accuracy,
  );
}

export async function updateCruiseTrackProgress(
  trackId: string,
  patch: { distanceMetres: number; maxSogMps: number | null; pointCount: number },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE cruise_tracks
        SET distance_metres = ?, max_sog_mps = ?, point_count = ?
      WHERE id = ?;`,
    patch.distanceMetres,
    patch.maxSogMps,
    patch.pointCount,
    trackId,
  );
}

export async function endCruiseTrack(trackId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE cruise_tracks SET ended_at = ? WHERE id = ?;`,
    new Date().toISOString(),
    trackId,
  );
}

export async function renameCruiseTrack(
  trackId: string,
  name: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE cruise_tracks SET name = ? WHERE id = ?;`,
    name,
    trackId,
  );
}

export async function deleteCruiseTrack(trackId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM cruise_tracks WHERE id = ?;`, trackId);
}

export async function listCruiseTracks(): Promise<CruiseTrack[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT * FROM cruise_tracks ORDER BY started_at DESC;`,
  );
  return rows.map(rowToTrack);
}

export async function getCruiseTrack(id: string): Promise<CruiseTrack | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TrackRow>(
    `SELECT * FROM cruise_tracks WHERE id = ?;`,
    id,
  );
  return row ? rowToTrack(row) : null;
}

export async function listCruiseTrackPoints(
  trackId: string,
): Promise<CruiseTrackPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PointRow>(
    `SELECT * FROM cruise_track_points
      WHERE track_id = ? ORDER BY recorded_at ASC;`,
    trackId,
  );
  return rows.map(rowToPoint);
}

/** Returns the most recent track that hasn't been ended yet, if any.
 *  Used to recover an in-flight track if the app was killed. */
export async function getActiveCruiseTrack(): Promise<CruiseTrack | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TrackRow>(
    `SELECT * FROM cruise_tracks
      WHERE ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1;`,
  );
  return row ? rowToTrack(row) : null;
}
