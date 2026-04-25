/**
 * Waypoints repo — Phase 1.16.
 *
 * Waypoints are nav-mode destinations: a sailor drops one to mark "the
 * cove I want to anchor in", "the harbour entrance", "the buoy I'm
 * sailing past on a passage". Distinct from racing marks (`marks`
 * table) which carry tier / source / icon / shape / validity metadata
 * relevant only to course building.
 *
 * Schema is intentionally simple: name + lat/lon + optional notes +
 * created_at. If we ever need richer metadata (radius alerts, icons),
 * add columns rather than reuse the marks table.
 */

import { getDb } from './db';

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  createdAt: string;
}

export interface WaypointInput {
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

interface Row {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  created_at: string;
}

function rowToWaypoint(r: Row): Waypoint {
  return {
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

function newId(): string {
  return `wpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createWaypoint(input: WaypointInput): Promise<Waypoint> {
  const db = await getDb();
  const id = newId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO waypoints (id, name, latitude, longitude, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    id,
    input.name,
    input.latitude,
    input.longitude,
    input.notes ?? null,
    createdAt,
  );
  return {
    id,
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    notes: input.notes ?? null,
    createdAt,
  };
}

export async function listWaypoints(): Promise<Waypoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM waypoints ORDER BY created_at DESC;`,
  );
  return rows.map(rowToWaypoint);
}

export async function deleteWaypoint(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM waypoints WHERE id = ?;`, id);
}

export async function updateWaypoint(
  id: string,
  patch: Partial<WaypointInput>,
): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Row>(
    `SELECT * FROM waypoints WHERE id = ?;`,
    id,
  );
  if (!existing) throw new Error(`updateWaypoint: ${id} not found`);
  await db.runAsync(
    `UPDATE waypoints
        SET name = ?, latitude = ?, longitude = ?, notes = ?
      WHERE id = ?;`,
    patch.name ?? existing.name,
    patch.latitude ?? existing.latitude,
    patch.longitude ?? existing.longitude,
    patch.notes !== undefined ? patch.notes : existing.notes,
    id,
  );
}
