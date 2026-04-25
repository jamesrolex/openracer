/**
 * joinedBoatsRepo — persistence for the personal sailor log of boat-
 * profile bundles received. One row per boat-join event. Newest
 * first. Drives the "Recent boats" section of the sailor log.
 */

import { getDb } from './db';

export interface JoinedBoat {
  id: string;
  senderId: string;
  senderName: string;
  boatName: string;
  joinedAt: string;
  marksAdded: number;
  polarReceived: boolean;
}

interface JoinedBoatRow {
  id: string;
  sender_id: string;
  sender_name: string;
  boat_name: string;
  joined_at: string;
  marks_added: number;
  polar_received: number;
}

function rowToBoat(row: JoinedBoatRow): JoinedBoat {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    boatName: row.boat_name,
    joinedAt: row.joined_at,
    marksAdded: row.marks_added,
    polarReceived: row.polar_received !== 0,
  };
}

function newId(): string {
  return `boatjoin_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export interface RecordJoinInput {
  senderId: string;
  senderName: string;
  boatName: string;
  marksAdded: number;
  polarReceived: boolean;
}

export async function recordBoatJoin(
  input: RecordJoinInput,
  now: Date = new Date(),
): Promise<JoinedBoat> {
  const db = await getDb();
  const id = newId();
  const joinedAt = now.toISOString();
  await db.runAsync(
    `INSERT INTO joined_boats
       (id, sender_id, sender_name, boat_name, joined_at, marks_added, polar_received)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.senderId,
    input.senderName,
    input.boatName,
    joinedAt,
    input.marksAdded,
    input.polarReceived ? 1 : 0,
  );
  return {
    id,
    senderId: input.senderId,
    senderName: input.senderName,
    boatName: input.boatName,
    joinedAt,
    marksAdded: input.marksAdded,
    polarReceived: input.polarReceived,
  };
}

export async function listJoinedBoats(): Promise<JoinedBoat[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<JoinedBoatRow>(
    `SELECT * FROM joined_boats ORDER BY joined_at DESC;`,
  );
  return rows.map(rowToBoat);
}

export async function deleteJoinedBoat(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM joined_boats WHERE id = ?;`, id);
}
