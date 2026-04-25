/**
 * Persistence layer for marks. All SQL lives here — everything else uses
 * this module's functions and the `Mark` type.
 *
 * `confidence` is derived on read (see `markLifecycle.deriveConfidence`) so
 * every read reflects "now". It is not stored.
 */

import type { SQLiteBindValue } from 'expo-sqlite';

import type { Mark, MarkInput, MarkTier } from '../types/mark';
import { deriveConfidence } from '../domain/markLifecycle';

import { getDb } from './db';

function newId(): string {
  return `mark_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface MarkRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  tier: string;
  source: string;
  icon: string;
  shape: string;
  valid_from: string | null;
  valid_until: string | null;
  owner: string;
  notes: string | null;
  colour_hint: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMark(row: MarkRow, now: Date): Mark {
  const mark: Mark = {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    tier: row.tier as Mark['tier'],
    source: row.source as Mark['source'],
    icon: row.icon as Mark['icon'],
    shape: row.shape as Mark['shape'],
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    owner: row.owner,
    confidence: 0, // placeholder, overwritten below
    notes: row.notes ?? undefined,
    colourHint: row.colour_hint ?? undefined,
  };
  mark.confidence = deriveConfidence(mark, now);
  return mark;
}

export interface MarkListFilter {
  tier?: MarkTier;
  /** Case-insensitive name / notes match. */
  search?: string;
  /** Only return marks inside this bounding box. */
  bbox?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  /** When true, filter out marks whose `validUntil` is already past `now`. */
  activeOnly?: boolean;
}

export async function createMark(input: MarkInput, now: Date = new Date()): Promise<Mark> {
  const db = await getDb();
  const id = newId();
  const nowIso = now.toISOString();

  await db.runAsync(
    `INSERT INTO marks (
       id, name, latitude, longitude, tier, source, icon, shape,
       valid_from, valid_until, owner, notes, colour_hint,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.name,
    input.latitude,
    input.longitude,
    input.tier,
    input.source,
    input.icon,
    input.shape,
    input.validFrom,
    input.validUntil,
    input.owner,
    input.notes ?? null,
    input.colourHint ?? null,
    nowIso,
    nowIso,
  );

  const created = await getMark(id, now);
  if (!created) throw new Error(`createMark: row ${id} vanished after insert`);
  return created;
}

export async function getMark(id: string, now: Date = new Date()): Promise<Mark | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<MarkRow>(`SELECT * FROM marks WHERE id = ?;`, id);
  return row ? rowToMark(row, now) : null;
}

export async function updateMark(
  id: string,
  patch: Partial<MarkInput>,
  now: Date = new Date(),
): Promise<Mark> {
  const db = await getDb();
  const existing = await getMark(id, now);
  if (!existing) throw new Error(`updateMark: no mark with id ${id}`);

  const next = { ...existing, ...patch };
  await db.runAsync(
    `UPDATE marks SET
       name = ?, latitude = ?, longitude = ?, tier = ?, source = ?,
       icon = ?, shape = ?, valid_from = ?, valid_until = ?,
       owner = ?, notes = ?, colour_hint = ?, updated_at = ?
     WHERE id = ?;`,
    next.name,
    next.latitude,
    next.longitude,
    next.tier,
    next.source,
    next.icon,
    next.shape,
    next.validFrom,
    next.validUntil,
    next.owner,
    next.notes ?? null,
    next.colourHint ?? null,
    now.toISOString(),
    id,
  );

  const updated = await getMark(id, now);
  if (!updated) throw new Error(`updateMark: row ${id} vanished after update`);
  return updated;
}

export async function deleteMark(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM marks WHERE id = ?;`, id);
}

export async function listMarks(
  filter: MarkListFilter = {},
  now: Date = new Date(),
): Promise<Mark[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (filter.tier) {
    where.push('tier = ?');
    params.push(filter.tier);
  }

  if (filter.search && filter.search.trim().length > 0) {
    const pattern = `%${filter.search.trim().toLowerCase()}%`;
    where.push("(lower(name) LIKE ? OR lower(coalesce(notes, '')) LIKE ?)");
    params.push(pattern, pattern);
  }

  if (filter.bbox) {
    where.push('latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?');
    params.push(filter.bbox.minLat, filter.bbox.maxLat, filter.bbox.minLon, filter.bbox.maxLon);
  }

  if (filter.activeOnly) {
    where.push('(valid_until IS NULL OR valid_until >= ?)');
    params.push(now.toISOString());
  }

  const sql =
    `SELECT * FROM marks` +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ` ORDER BY name COLLATE NOCASE;`;

  const rows = await db.getAllAsync<MarkRow>(sql, ...params);
  return rows.map((r) => rowToMark(r, now));
}

/**
 * Remove marks whose `validUntil` is in the past. Returns the number of
 * rows removed. `chart-permanent` and `club-seasonal` never expire through
 * this path (seasonal marks come back next year); only dated tiers do.
 */
export async function purgeExpiredMarks(now: Date = new Date()): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `DELETE FROM marks
       WHERE tier IN ('race-day-recent', 'single-race-temporary')
         AND valid_until IS NOT NULL
         AND valid_until < ?;`,
    now.toISOString(),
  );
  return result.changes;
}
