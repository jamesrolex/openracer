/**
 * Leaderboard repo — Phase 1.15.
 *
 * Stores received finish records (one per (race, gun, sender) tuple).
 * The leaderboard view aggregates these by race + gun time, sorts by
 * elapsed seconds, and renders the result.
 */

import type { FinishRecordPayload } from '../types/coursePush';

import { getDb } from './db';

export interface LeaderboardEntry {
  id: string;
  raceName: string;
  gunAt: string;
  senderId: string;
  senderName: string;
  boatName: string;
  finishedAt: string;
  elapsedSeconds: number;
  courseId: string | null;
  receivedAt: string;
}

interface Row {
  id: string;
  race_name: string;
  gun_at: string;
  sender_id: string;
  sender_name: string;
  boat_name: string;
  finished_at: string;
  elapsed_seconds: number;
  course_id: string | null;
  received_at: string;
}

function rowToEntry(r: Row): LeaderboardEntry {
  return {
    id: r.id,
    raceName: r.race_name,
    gunAt: r.gun_at,
    senderId: r.sender_id,
    senderName: r.sender_name,
    boatName: r.boat_name,
    finishedAt: r.finished_at,
    elapsedSeconds: r.elapsed_seconds,
    courseId: r.course_id,
    receivedAt: r.received_at,
  };
}

function newId(): string {
  return `lb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Insert (or update) a finish record. The unique key (raceName + gunAt
 * + senderId) means re-scanning a sailor's QR after they corrected a
 * typo just refreshes their entry rather than duplicating.
 */
export async function recordFinish(
  payload: FinishRecordPayload,
  receivedAt: Date = new Date(),
): Promise<LeaderboardEntry> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO leaderboard_entries
       (id, race_name, gun_at, sender_id, sender_name, boat_name,
        finished_at, elapsed_seconds, course_id, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(race_name, gun_at, sender_id) DO UPDATE SET
       sender_name=excluded.sender_name,
       boat_name=excluded.boat_name,
       finished_at=excluded.finished_at,
       elapsed_seconds=excluded.elapsed_seconds,
       course_id=excluded.course_id,
       received_at=excluded.received_at;`,
    id,
    payload.raceName,
    payload.gunAt,
    payload.senderId,
    payload.senderName,
    payload.boatName,
    payload.finishedAt,
    payload.elapsedSeconds,
    payload.courseId ?? null,
    receivedAt.toISOString(),
  );
  const row = await db.getFirstAsync<Row>(
    `SELECT * FROM leaderboard_entries
      WHERE race_name = ? AND gun_at = ? AND sender_id = ?;`,
    payload.raceName,
    payload.gunAt,
    payload.senderId,
  );
  if (!row) throw new Error('recordFinish: insert returned no row');
  return rowToEntry(row);
}

/** All entries sorted by raceName + gunAt desc (most recent races first). */
export async function listLeaderboardRaces(): Promise<{
  raceName: string;
  gunAt: string;
  entryCount: number;
  fastestElapsedSeconds: number;
}[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    race_name: string;
    gun_at: string;
    entry_count: number;
    fastest_elapsed: number;
  }>(
    `SELECT race_name, gun_at,
            COUNT(*) AS entry_count,
            MIN(elapsed_seconds) AS fastest_elapsed
       FROM leaderboard_entries
      GROUP BY race_name, gun_at
      ORDER BY gun_at DESC;`,
  );
  return rows.map((r) => ({
    raceName: r.race_name,
    gunAt: r.gun_at,
    entryCount: r.entry_count,
    fastestElapsedSeconds: r.fastest_elapsed,
  }));
}

/** All finishers for a single race (raceName + gunAt), ordered by
 *  elapsed seconds ascending — fastest first. */
export async function listFinishersForRace(
  raceName: string,
  gunAt: string,
): Promise<LeaderboardEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM leaderboard_entries
      WHERE race_name = ? AND gun_at = ?
      ORDER BY elapsed_seconds ASC;`,
    raceName,
    gunAt,
  );
  return rows.map(rowToEntry);
}

export async function deleteFinishersForRace(
  raceName: string,
  gunAt: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM leaderboard_entries WHERE race_name = ? AND gun_at = ?;`,
    raceName,
    gunAt,
  );
}
