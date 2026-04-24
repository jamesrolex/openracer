/**
 * Trust list for committee-boat push. Every incoming bundle's public key
 * must match an entry here (keyed by `committeeId`) — no trust-on-first-
 * use. Entries are added via QR scan at the club, so the private key
 * never touches the wire.
 */

import type { CommitteeTrust } from '../types/coursePush';

import { getDb } from './db';

interface TrustRow {
  committee_id: string;
  committee_name: string;
  public_key: string;
  added_at: string;
}

function rowToTrust(row: TrustRow): CommitteeTrust {
  return {
    committeeId: row.committee_id,
    committeeName: row.committee_name,
    publicKey: row.public_key,
    addedAt: row.added_at,
  };
}

export async function listTrustedCommittees(): Promise<CommitteeTrust[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TrustRow>(
    `SELECT * FROM committee_trust ORDER BY committee_name COLLATE NOCASE;`,
  );
  return rows.map(rowToTrust);
}

export async function getTrustedCommittee(
  committeeId: string,
): Promise<CommitteeTrust | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TrustRow>(
    `SELECT * FROM committee_trust WHERE committee_id = ?;`,
    committeeId,
  );
  return row ? rowToTrust(row) : null;
}

export async function addTrustedCommittee(
  entry: Omit<CommitteeTrust, 'addedAt'>,
  now: Date = new Date(),
): Promise<CommitteeTrust> {
  const db = await getDb();
  const addedAt = now.toISOString();
  await db.runAsync(
    `INSERT INTO committee_trust (committee_id, committee_name, public_key, added_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(committee_id) DO UPDATE SET
       committee_name = excluded.committee_name,
       public_key = excluded.public_key,
       added_at = excluded.added_at;`,
    entry.committeeId,
    entry.committeeName,
    entry.publicKey,
    addedAt,
  );
  return { ...entry, addedAt };
}

export async function revokeTrustedCommittee(committeeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM committee_trust WHERE committee_id = ?;`, committeeId);
}
